import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { requireAuth, type AuthenticatedRequest, requireRole } from "../middleware/auth";
import type {
  CreateCropCycleRequest,
  CreateFarmRequest,
  CreateInputLogRequest,
  FoodDashboardResponse,
  MarkCropCycleReadyRequest,
  OfflineSyncRequest,
  OfflineSyncResponse,
  PesticideCrossCheckResult,
} from "@foodtrace/shared";

const router = Router();

const createFarmSchema = z.object({
  name: z.string().trim().min(2),
  district: z.string().trim().min(2),
  region: z.string().trim().min(2),
  cropTypes: z.array(z.string().trim().min(1)).min(1),
  sizeAcres: z.number().positive().optional().nullable(),
  epaRegistrationNumber: z.string().trim().min(3).optional().nullable(),
});

const createCropCycleSchema = z.object({
  farmId: z.string().uuid(),
  cropType: z.string().trim().min(2),
  plantingDate: z.string().min(8),
  notes: z.string().trim().optional().nullable(),
});

const createInputLogSchema = z.object({
  cropCycleId: z.string().uuid(),
  inputType: z.enum(["pesticide", "fertilizer", "seed", "irrigation", "other"]),
  productName: z.string().trim().min(2),
  applicationDate: z.string().min(8),
  concentration: z.number().positive().optional().nullable(),
  unit: z.string().trim().optional().nullable(),
  withdrawalPeriodDays: z.number().int().min(0).optional().nullable(),
});

const markMarketReadySchema = z.object({
  cropCycleId: z.string().uuid(),
  marketReady: z.boolean(),
  harvestDate: z.string().trim().optional().nullable(),
});

const offlineSyncSchema = z.object({
  actions: z.array(
    z.object({
      actionId: z.string().min(1),
      type: z.enum(["createFarm", "createCropCycle", "createInputLog", "markMarketReady"]),
      payload: z.unknown(),
    })
  ),
});

function computeSafeHarvestDate(applicationDate: string, withdrawalPeriodDays: number) {
  const date = new Date(applicationDate);
  date.setDate(date.getDate() + withdrawalPeriodDays);
  return date.toISOString().slice(0, 10);
}

function normalizeDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

async function crossCheckPesticide(productName: string, cropType: string): Promise<PesticideCrossCheckResult> {
  const result = await pool.query(
    `
    SELECT name, active_ingredient, epa_status, approved_crops, withdrawal_days, health_risk_level, ban_reason
    FROM pesticides
    WHERE LOWER(name) = LOWER($1) OR LOWER(active_ingredient) = LOWER($1)
    LIMIT 1
    `,
    [productName]
  );

  if (!result.rowCount) {
    return {
      found: false,
      productName,
      epaStatus: "unverified",
      approvedCrops: [],
      withdrawalDays: 0,
      message: `No EPA record found for ${productName}. Verify manually before use on ${cropType}.`,
    };
  }

  const row = result.rows[0];
  const approvedCrops = Array.isArray(row.approved_crops) ? row.approved_crops : [];
  const cropAllowed = approvedCrops.length === 0 || approvedCrops.some((item: string) => item.toLowerCase() === cropType.toLowerCase());
  const epaStatus = row.epa_status as PesticideCrossCheckResult["epaStatus"];
  const withdrawalDays = Number(row.withdrawal_days ?? 0);

  if (epaStatus === "banned") {
    return {
      found: true,
      productName: row.name,
      epaStatus,
      approvedCrops,
      withdrawalDays,
      message: `${row.name} is banned by EPA and should not be used.`,
    };
  }

  if (epaStatus === "restricted" && !cropAllowed) {
    return {
      found: true,
      productName: row.name,
      epaStatus,
      approvedCrops,
      withdrawalDays,
      message: `${row.name} is restricted and is not approved for ${cropType}.`,
    };
  }

  return {
    found: true,
    productName: row.name,
    epaStatus,
    approvedCrops,
    withdrawalDays,
    message: cropAllowed
      ? `${row.name} is EPA ${epaStatus} for this crop.`
      : `${row.name} is EPA ${epaStatus} but has no approval listed for ${cropType}.`,
  };
}

async function getFoodDashboard(ownerId: string): Promise<FoodDashboardResponse> {
  const farms = await pool.query(
    `
    SELECT id, name, district, region, crop_types, verification_status, badge_status
    FROM farms
    WHERE owner_id = $1
    ORDER BY created_at DESC
    `,
    [ownerId]
  );

  const cropCycles = await pool.query(
    `
    SELECT
      cc.id,
      cc.farm_id,
      cc.crop_type,
      cc.planting_date,
      cc.harvest_date,
      cc.market_ready,
      (
        SELECT MAX(il.safe_harvest_date)
        FROM input_logs il
        WHERE il.crop_cycle_id = cc.id
      ) AS safe_harvest_date,
      (
        SELECT COALESCE(MAX(il.safe_harvest_date), cc.planting_date::date)::date - CURRENT_DATE
        FROM input_logs il
        WHERE il.crop_cycle_id = cc.id
      ) AS days_to_safe_harvest
    FROM crop_cycles cc
    INNER JOIN farms f ON f.id = cc.farm_id
    WHERE f.owner_id = $1
    ORDER BY cc.created_at DESC
    `,
    [ownerId]
  );

  const inputLogs = await pool.query(
    `
    SELECT
      il.id,
      il.crop_cycle_id,
      il.input_type,
      il.product_name,
      il.application_date,
      il.withdrawal_period_days,
      il.safe_harvest_date,
      il.epa_approval_status
    FROM input_logs il
    INNER JOIN crop_cycles cc ON cc.id = il.crop_cycle_id
    INNER JOIN farms f ON f.id = cc.farm_id
    WHERE f.owner_id = $1
    ORDER BY il.created_at DESC
    LIMIT 20
    `,
    [ownerId]
  );

  const readyCycles = cropCycles.rows.filter((row) => row.market_ready).length;
  const pendingWithdrawalCycles = cropCycles.rows.filter(
    (row) => !row.market_ready && row.safe_harvest_date && new Date(row.safe_harvest_date) >= new Date()
  ).length;
  const overdueWithdrawalCycles = cropCycles.rows.filter(
    (row) => !row.market_ready && row.safe_harvest_date && new Date(row.safe_harvest_date) < new Date()
  ).length;

  return {
    farms: farms.rows.map((row) => ({
      id: row.id,
      name: row.name,
      district: row.district,
      region: row.region,
      cropTypes: row.crop_types ?? [],
      verificationStatus: row.verification_status,
      badgeStatus: row.badge_status,
    })),
    cropCycles: cropCycles.rows.map((row) => ({
      id: row.id,
      farmId: row.farm_id,
      cropType: row.crop_type,
      plantingDate: row.planting_date,
      harvestDate: row.harvest_date,
      marketReady: row.market_ready,
      safeHarvestDate: row.safe_harvest_date,
      daysToSafeHarvest: row.days_to_safe_harvest ? Number(row.days_to_safe_harvest) : null,
    })),
    inputLogs: inputLogs.rows.map((row) => ({
      id: row.id,
      cropCycleId: row.crop_cycle_id,
      inputType: row.input_type,
      productName: row.product_name,
      applicationDate: row.application_date,
      withdrawalPeriodDays: Number(row.withdrawal_period_days ?? 0),
      safeHarvestDate: row.safe_harvest_date,
      epaApprovalStatus: row.epa_approval_status,
    })),
    metrics: {
      farms: farms.rowCount ?? 0,
      cropCycles: cropCycles.rowCount ?? 0,
      readyCycles,
      pendingWithdrawalCycles,
      overdueWithdrawalCycles,
    },
  };
}

router.use(requireAuth);
router.use(requireRole("farmer"));

router.get("/dashboard", async (req: AuthenticatedRequest, res) => {
  const dashboard = await getFoodDashboard(req.auth!.userId);
  return res.json({ dashboard });
});

router.post("/farms", async (req: AuthenticatedRequest, res) => {
  const parsed = createFarmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies CreateFarmRequest;
  const result = await pool.query(
    `
    INSERT INTO farms (owner_id, name, district, region, size_acres, crop_types, epa_registration_number, verification_status, badge_status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'none')
    RETURNING id, name, district, region, crop_types, verification_status, badge_status
    `,
    [req.auth!.userId, body.name, body.district, body.region, body.sizeAcres ?? null, body.cropTypes, body.epaRegistrationNumber ?? null]
  );

  return res.status(201).json({ farm: result.rows[0] });
});

router.post("/crop-cycles", async (req: AuthenticatedRequest, res) => {
  const parsed = createCropCycleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies CreateCropCycleRequest;
  const farmCheck = await pool.query(`SELECT id FROM farms WHERE id = $1 AND owner_id = $2 LIMIT 1`, [
    body.farmId,
    req.auth!.userId,
  ]);
  if (!farmCheck.rowCount) {
    return res.status(404).json({ error: "Farm not found" });
  }

  const result = await pool.query(
    `
    INSERT INTO crop_cycles (farm_id, crop_type, planting_date, notes, status)
    VALUES ($1, $2, $3, $4, 'growing')
    RETURNING id, farm_id, crop_type, planting_date, harvest_date, market_ready, status
    `,
    [body.farmId, body.cropType, body.plantingDate, body.notes ?? null]
  );

  return res.status(201).json({ cropCycle: result.rows[0] });
});

router.post("/input-logs", async (req: AuthenticatedRequest, res) => {
  const parsed = createInputLogSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies CreateInputLogRequest;
  const cycleCheck = await pool.query(
    `
    SELECT cc.id, cc.crop_type, f.owner_id
    FROM crop_cycles cc
    INNER JOIN farms f ON f.id = cc.farm_id
    WHERE cc.id = $1 AND f.owner_id = $2
    LIMIT 1
    `,
    [body.cropCycleId, req.auth!.userId]
  );
  if (!cycleCheck.rowCount) {
    return res.status(404).json({ error: "Crop cycle not found" });
  }

  const cropType = String(cycleCheck.rows[0].crop_type);
  const withdrawalDaysInput = Number(body.withdrawalPeriodDays ?? 0);
  const pesticideCheck = body.inputType === "pesticide" ? await crossCheckPesticide(body.productName, cropType) : null;
  const withdrawalDays = Math.max(withdrawalDaysInput, pesticideCheck?.withdrawalDays ?? 0);
  const safeHarvestDate = computeSafeHarvestDate(body.applicationDate, withdrawalDays);

  const result = await pool.query(
    `
    INSERT INTO input_logs (
      crop_cycle_id,
      input_type,
      product_name,
      epa_approval_status,
      application_date,
      concentration,
      unit,
      withdrawal_period_days,
      safe_harvest_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, crop_cycle_id, input_type, product_name, application_date, concentration, unit, withdrawal_period_days, safe_harvest_date, epa_approval_status
    `,
    [
      body.cropCycleId,
      body.inputType,
      body.productName,
      pesticideCheck?.epaStatus ?? "unverified",
      body.applicationDate,
      body.concentration ?? null,
      body.unit ?? null,
      withdrawalDays,
      safeHarvestDate,
    ]
  );

  return res.status(201).json({
    inputLog: result.rows[0],
    safeHarvestDate,
    pesticideCheck,
  });
});

router.patch("/crop-cycles/market-ready", async (req: AuthenticatedRequest, res) => {
  const parsed = markMarketReadySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies MarkCropCycleReadyRequest;
  const cycleCheck = await pool.query(
    `SELECT id FROM crop_cycles cc INNER JOIN farms f ON f.id = cc.farm_id WHERE cc.id = $1 AND f.owner_id = $2 LIMIT 1`,
    [body.cropCycleId, req.auth!.userId]
  );
  if (!cycleCheck.rowCount) {
    return res.status(404).json({ error: "Crop cycle not found" });
  }

  const result = await pool.query(
    `
    UPDATE crop_cycles
    SET market_ready = $2,
        market_ready_at = CASE WHEN $2 THEN now() ELSE NULL END,
        harvest_date = COALESCE($3::date, harvest_date),
        status = CASE WHEN $2 THEN 'ready' ELSE 'growing' END
    WHERE id = $1
    RETURNING id, farm_id, crop_type, planting_date, harvest_date, market_ready, market_ready_at, status
    `,
    [body.cropCycleId, body.marketReady, normalizeDate(body.harvestDate)]
  );

  return res.json({ cropCycle: result.rows[0] });
});

router.post("/offline-sync", async (req: AuthenticatedRequest, res) => {
  const parsed = offlineSyncSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies OfflineSyncRequest;
  const results: OfflineSyncResponse["results"] = [];

  for (const action of body.actions) {
    try {
      if (action.type === "createFarm") {
        const farmBody = createFarmSchema.parse(action.payload);
        const inserted = await pool.query(
          `
          INSERT INTO farms (owner_id, name, district, region, size_acres, crop_types, epa_registration_number, verification_status, badge_status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'none')
          RETURNING id
          `,
          [req.auth!.userId, farmBody.name, farmBody.district, farmBody.region, farmBody.sizeAcres ?? null, farmBody.cropTypes, farmBody.epaRegistrationNumber ?? null]
        );
        results.push({ actionId: action.actionId, type: action.type, ok: true, entityId: inserted.rows[0].id });
        continue;
      }

      if (action.type === "createCropCycle") {
        const cycleBody = createCropCycleSchema.parse(action.payload);
        const inserted = await pool.query(
          `
          INSERT INTO crop_cycles (farm_id, crop_type, planting_date, notes, status)
          SELECT id, $2, $3, $4, 'growing'
          FROM farms
          WHERE id = $1 AND owner_id = $5
          RETURNING id
          `,
          [cycleBody.farmId, cycleBody.cropType, cycleBody.plantingDate, cycleBody.notes ?? null, req.auth!.userId]
        );
        if (!inserted.rowCount) {
          throw new Error("Farm not found");
        }
        results.push({ actionId: action.actionId, type: action.type, ok: true, entityId: inserted.rows[0].id });
        continue;
      }

      if (action.type === "createInputLog") {
        const logBody = createInputLogSchema.parse(action.payload);
        const cycleCheck = await pool.query(
          `
          SELECT cc.id, cc.crop_type
          FROM crop_cycles cc
          INNER JOIN farms f ON f.id = cc.farm_id
          WHERE cc.id = $1 AND f.owner_id = $2
          LIMIT 1
          `,
          [logBody.cropCycleId, req.auth!.userId]
        );
        if (!cycleCheck.rowCount) {
          throw new Error("Crop cycle not found");
        }
        const pesticideCheck = logBody.inputType === "pesticide" ? await crossCheckPesticide(logBody.productName, String(cycleCheck.rows[0].crop_type)) : null;
        const withdrawalDays = Math.max(Number(logBody.withdrawalPeriodDays ?? 0), pesticideCheck?.withdrawalDays ?? 0);
        const safeHarvestDate = computeSafeHarvestDate(logBody.applicationDate, withdrawalDays);
        const inserted = await pool.query(
          `
          INSERT INTO input_logs (
            crop_cycle_id, input_type, product_name, epa_approval_status,
            application_date, concentration, unit, withdrawal_period_days, safe_harvest_date
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
          `,
          [
            logBody.cropCycleId,
            logBody.inputType,
            logBody.productName,
            pesticideCheck?.epaStatus ?? "unverified",
            logBody.applicationDate,
            logBody.concentration ?? null,
            logBody.unit ?? null,
            withdrawalDays,
            safeHarvestDate,
          ]
        );
        results.push({ actionId: action.actionId, type: action.type, ok: true, entityId: inserted.rows[0].id });
        continue;
      }

      if (action.type === "markMarketReady") {
        const readyBody = markMarketReadySchema.parse(action.payload);
        const updated = await pool.query(
          `
          UPDATE crop_cycles cc
          SET market_ready = $2,
              market_ready_at = CASE WHEN $2 THEN now() ELSE NULL END,
              harvest_date = COALESCE($3::date, harvest_date),
              status = CASE WHEN $2 THEN 'ready' ELSE 'growing' END
          FROM farms f
          WHERE cc.id = $1 AND f.id = cc.farm_id AND f.owner_id = $4
          RETURNING cc.id
          `,
          [readyBody.cropCycleId, readyBody.marketReady, normalizeDate(readyBody.harvestDate), req.auth!.userId]
        );
        if (!updated.rowCount) {
          throw new Error("Crop cycle not found");
        }
        results.push({ actionId: action.actionId, type: action.type, ok: true, entityId: updated.rows[0].id });
        continue;
      }

      results.push({ actionId: action.actionId, type: action.type, ok: false, message: "Unknown action" });
    } catch (error) {
      results.push({
        actionId: action.actionId,
        type: action.type,
        ok: false,
        message: error instanceof Error ? error.message : "Failed to sync action",
      });
    }
  }

  return res.json({ results } satisfies OfflineSyncResponse);
});

export default router;
