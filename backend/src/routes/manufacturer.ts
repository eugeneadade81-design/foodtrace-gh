import { Router } from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";
import QRCode from "qrcode";
import { pool } from "../config/db";
import { requireAuth, type AuthenticatedRequest, requireRole } from "../middleware/auth";
import type {
  CreateManufacturerProfileRequest,
  CreateProductBatchRequest,
  CreateProductBatchResponse,
  CreateRecallRequest,
  ManufacturerDashboardResponse,
  ManufacturerProfile,
} from "@foodtrace/shared";

const router = Router();
const qrOutputDir = path.join(process.cwd(), "uploads", "qrcodes");
fs.mkdirSync(qrOutputDir, { recursive: true });

const createProfileSchema = z.object({
  companyName: z.string().trim().min(2),
  fdaRegistrationNumber: z.string().trim().optional().nullable(),
  sector: z.string().trim().optional().nullable(),
  subscriptionTier: z.enum(["micro", "small", "medium", "large"]).optional(),
});

const createBatchSchema = z.object({
  batchNumber: z.string().trim().min(2),
  productName: z.string().trim().min(2).optional().nullable(),
  farmOrigin: z.string().trim().min(2).optional().nullable(),
  ingredientSources: z.unknown().optional(),
  processingSteps: z.unknown().optional(),
  qualityChecks: z.unknown().optional(),
  packagingDate: z.string().min(8),
  expiryDate: z.string().min(8),
});

const createRecallSchema = z.object({
  batchId: z.string().uuid(),
  recallType: z.enum(["manufacturer", "regulator"]),
  reason: z.string().trim().min(3),
  scopeDistricts: z.array(z.string().trim().min(2)).optional(),
});

function normalizeJson(value: unknown) {
  if (value === undefined) return [];
  return value;
}

async function getManufacturerProfile(userId: string): Promise<ManufacturerProfile | null> {
  const result = await pool.query(
    `
    SELECT id, user_id, company_name, fda_registration_number, sector, is_verified, subscription_tier
    FROM manufacturers
    WHERE user_id = $1
    LIMIT 1
    `,
    [userId]
  );

  if (!result.rowCount) return null;
  return {
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    companyName: result.rows[0].company_name,
    fdaRegistrationNumber: result.rows[0].fda_registration_number,
    sector: result.rows[0].sector,
    isVerified: result.rows[0].is_verified,
    subscriptionTier: result.rows[0].subscription_tier,
  };
}

async function getManufacturerDashboard(userId: string): Promise<ManufacturerDashboardResponse> {
  const profile = await getManufacturerProfile(userId);

  if (!profile) {
    return {
      profile: null,
      metrics: { batches: 0, qrCodes: 0, recalls: 0, activeRecalls: 0 },
      batches: [],
      recalls: [],
    };
  }

  const batches = await pool.query(
    `
    SELECT
      pb.id,
      pb.manufacturer_id,
      pb.batch_number,
      pb.packaging_date,
      pb.expiry_date,
      pb.recall_status,
      q.code_string AS qr_code,
      q.scan_count
    FROM product_batches pb
    LEFT JOIN qr_codes q ON q.batch_id = pb.id
    WHERE pb.manufacturer_id = $1
    ORDER BY pb.created_at DESC
    `,
    [profile.id]
  );

  const recalls = await pool.query(
    `
    SELECT id, batch_id, recall_type, reason, created_at
    FROM recall_events
    WHERE batch_id IN (
      SELECT id FROM product_batches WHERE manufacturer_id = $1
    )
    ORDER BY created_at DESC
    `,
    [profile.id]
  );

  const qrCodes = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM qr_codes q
    INNER JOIN product_batches pb ON pb.id = q.batch_id
    WHERE pb.manufacturer_id = $1
    `,
    [profile.id]
  );

  return {
    profile,
    metrics: {
      batches: batches.rowCount ?? 0,
      qrCodes: Number(qrCodes.rows[0]?.total ?? 0),
      recalls: recalls.rowCount ?? 0,
      activeRecalls: recalls.rows.length,
    },
    batches: batches.rows.map((row) => ({
      id: row.id,
      manufacturerId: row.manufacturer_id,
      batchNumber: row.batch_number,
      packagingDate: row.packaging_date,
      expiryDate: row.expiry_date,
      recallStatus: row.recall_status,
      qrCode: row.qr_code,
      scanCount: Number(row.scan_count ?? 0),
    })),
    recalls: recalls.rows.map((row) => ({
      id: row.id,
      batchId: row.batch_id,
      recallType: row.recall_type,
      reason: row.reason,
      createdAt: row.created_at,
    })),
  };
}

function makeQrCode(batchNumber: string) {
  return `FT-QR-${batchNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
}

async function ensureQrImage(codeString: string) {
  const filename = `${codeString}.png`;
  const filePath = path.join(qrOutputDir, filename);
  if (!fs.existsSync(filePath)) {
    await QRCode.toFile(filePath, codeString, { width: 512, margin: 2 });
  }
  return `/uploads/qrcodes/${filename}`;
}

router.use(requireAuth);
router.use(requireRole("manufacturer"));

router.get("/dashboard", async (req: AuthenticatedRequest, res) => {
  const dashboard = await getManufacturerDashboard(req.auth!.userId);
  return res.json({ dashboard });
});

router.post("/profile", async (req: AuthenticatedRequest, res) => {
  const parsed = createProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies CreateManufacturerProfileRequest;
  const existing = await getManufacturerProfile(req.auth!.userId);
  if (existing) {
    return res.status(409).json({ error: "Manufacturer profile already exists" });
  }

  const result = await pool.query(
    `
    INSERT INTO manufacturers (user_id, company_name, fda_registration_number, sector, is_verified, subscription_tier)
    VALUES ($1, $2, $3, $4, false, $5)
    RETURNING id, user_id, company_name, fda_registration_number, sector, is_verified, subscription_tier
    `,
    [req.auth!.userId, body.companyName, body.fdaRegistrationNumber ?? null, body.sector ?? null, body.subscriptionTier ?? "micro"]
  );

  return res.status(201).json({
    profile: {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      companyName: result.rows[0].company_name,
      fdaRegistrationNumber: result.rows[0].fda_registration_number,
      sector: result.rows[0].sector,
      isVerified: result.rows[0].is_verified,
      subscriptionTier: result.rows[0].subscription_tier,
    } satisfies ManufacturerProfile,
  });
});

router.post("/batches", async (req: AuthenticatedRequest, res) => {
  const parsed = createBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const profile = await getManufacturerProfile(req.auth!.userId);
  if (!profile) {
    return res.status(404).json({ error: "Manufacturer profile not found" });
  }

  const body = parsed.data satisfies CreateProductBatchRequest;
  const batch = await pool.query(
    `
    INSERT INTO product_batches (
      manufacturer_id,
      batch_number,
      product_name,
      farm_origin,
      ingredient_sources,
      processing_steps,
      quality_checks,
      packaging_date,
      expiry_date,
      recall_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
    RETURNING id, manufacturer_id, batch_number, packaging_date, expiry_date, recall_status
    `,
    [
      profile.id,
      body.batchNumber,
      body.productName ?? null,
      body.farmOrigin ?? null,
      JSON.stringify(normalizeJson(body.ingredientSources)),
      JSON.stringify(normalizeJson(body.processingSteps)),
      JSON.stringify(normalizeJson(body.qualityChecks)),
      body.packagingDate,
      body.expiryDate,
    ]
  );

  const codeString = makeQrCode(body.batchNumber);
  const qrUrl = await ensureQrImage(codeString);
  const qr = await pool.query(
    `
    INSERT INTO qr_codes (batch_id, code_string, s3_url, scan_count, status)
    VALUES ($1, $2, $3, 0, 'active')
    RETURNING id, code_string, status
    `,
    [batch.rows[0].id, codeString, qrUrl]
  );

  const response: CreateProductBatchResponse = {
    batch: {
      id: batch.rows[0].id,
      manufacturerId: batch.rows[0].manufacturer_id,
      batchNumber: batch.rows[0].batch_number,
      packagingDate: batch.rows[0].packaging_date,
      expiryDate: batch.rows[0].expiry_date,
      recallStatus: batch.rows[0].recall_status,
      qrCode: codeString,
      scanCount: 0,
    },
    qrCode: {
      id: qr.rows[0].id,
      codeString: qr.rows[0].code_string,
      status: qr.rows[0].status,
      url: qrUrl,
    },
  };

  return res.status(201).json(response);
});

router.get("/batches/:id", async (req: AuthenticatedRequest, res) => {
  const profile = await getManufacturerProfile(req.auth!.userId);
  if (!profile) return res.status(404).json({ error: "Manufacturer profile not found" });

  const batchId = String(req.params.id);
  const result = await pool.query(
    `
    SELECT
      pb.id,
      pb.manufacturer_id,
      pb.batch_number,
      pb.product_name,
      pb.farm_origin,
      pb.ingredient_sources,
      pb.processing_steps,
      pb.quality_checks,
      pb.packaging_date,
      pb.expiry_date,
      pb.recall_status,
      pb.recall_reason,
      q.code_string AS qr_code,
      q.s3_url AS qr_url,
      q.status AS qr_status,
      q.scan_count
    FROM product_batches pb
    LEFT JOIN qr_codes q ON q.batch_id = pb.id
    WHERE pb.id = $1 AND pb.manufacturer_id = $2
    LIMIT 1
    `,
    [batchId, profile.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Batch not found" });

  return res.json({ batch: result.rows[0] });
});

router.post("/recalls", async (req: AuthenticatedRequest, res) => {
  const parsed = createRecallSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const profile = await getManufacturerProfile(req.auth!.userId);
  if (!profile) {
    return res.status(404).json({ error: "Manufacturer profile not found" });
  }

  const body = parsed.data satisfies CreateRecallRequest;
  const batchCheck = await pool.query(
    `SELECT id FROM product_batches WHERE id = $1 AND manufacturer_id = $2 LIMIT 1`,
    [body.batchId, profile.id]
  );
  if (!batchCheck.rowCount) {
    return res.status(404).json({ error: "Batch not found" });
  }

  const updatedBatch = await pool.query(
    `
    UPDATE product_batches
    SET recall_status = 'recalled',
        recall_reason = $2,
        recalled_at = now()
    WHERE id = $1
    RETURNING id
    `,
    [body.batchId, body.reason]
  );

  await pool.query(
    `UPDATE qr_codes SET status = 'recalled' WHERE batch_id = $1`,
    [body.batchId]
  );

  const recall = await pool.query(
    `
    INSERT INTO recall_events (batch_id, issued_by, recall_type, reason, scope_districts, notification_sent_at)
    VALUES ($1, $2, $3, $4, $5, now())
    RETURNING id, batch_id, recall_type, reason, created_at
    `,
    [body.batchId, req.auth!.userId, body.recallType, body.reason, body.scopeDistricts ?? []]
  );

  return res.status(201).json({
    batchId: updatedBatch.rows[0].id,
    recall: recall.rows[0],
  });
});

// Compatibility alias for `/api/manufacturer/batches/:id/recall`.
router.post("/batches/:id/recall", async (req: AuthenticatedRequest, res) => {
  const parsed = createRecallSchema.safeParse({
    ...(req.body ?? {}),
    batchId: req.params.id,
    recallType: "manufacturer",
  });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const profile = await getManufacturerProfile(req.auth!.userId);
  if (!profile) {
    return res.status(404).json({ error: "Manufacturer profile not found" });
  }

  const body = parsed.data satisfies CreateRecallRequest;
  const batchCheck = await pool.query(`SELECT id FROM product_batches WHERE id = $1 AND manufacturer_id = $2 LIMIT 1`, [
    body.batchId,
    profile.id,
  ]);
  if (!batchCheck.rowCount) {
    return res.status(404).json({ error: "Batch not found" });
  }

  const updatedBatch = await pool.query(
    `
    UPDATE product_batches
    SET recall_status = 'recalled',
        recall_reason = $2,
        recalled_at = now()
    WHERE id = $1
    RETURNING id
    `,
    [body.batchId, body.reason]
  );

  await pool.query(`UPDATE qr_codes SET status = 'recalled' WHERE batch_id = $1`, [body.batchId]);

  const recall = await pool.query(
    `
    INSERT INTO recall_events (batch_id, issued_by, recall_type, reason, scope_districts, notification_sent_at)
    VALUES ($1, $2, $3, $4, $5, now())
    RETURNING id, batch_id, recall_type, reason, created_at
    `,
    [body.batchId, req.auth!.userId, body.recallType, body.reason, body.scopeDistricts ?? []]
  );

  return res.status(201).json({
    batchId: updatedBatch.rows[0].id,
    recall: recall.rows[0],
  });
});

export default router;
