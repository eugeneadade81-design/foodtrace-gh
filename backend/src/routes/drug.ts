import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { requireAuth, type AuthenticatedRequest, requireRole } from "../middleware/auth";
import type {
  CreateDrugBatchRequest,
  CreateDrugBatchResponse,
  CreateDrugRecordRequest,
  CreateDrugRecallRequest,
  DrugDashboardResponse,
  DrugScanResult,
  PharmacyProfile,
  RegisterPharmacyRequest,
} from "@foodtrace/shared";

const router = Router();

const registerPharmacySchema = z.object({
  businessName: z.string().trim().min(2),
  ghanaPharmacyCouncilNumber: z.string().trim().min(3),
  district: z.string().trim().min(2),
  region: z.string().trim().min(2),
});

const createDrugSchema = z.object({
  name: z.string().trim().min(2),
  genericName: z.string().trim().optional().nullable(),
  manufacturerName: z.string().trim().optional().nullable(),
  fdaDrugRegistrationNumber: z.string().trim().optional().nullable(),
  drugClass: z.string().trim().optional().nullable(),
  dosageForm: z.string().trim().optional().nullable(),
  strength: z.string().trim().optional().nullable(),
  requiresPrescription: z.boolean().optional(),
  isControlled: z.boolean().optional(),
  fdaApprovalStatus: z.enum(["approved", "banned", "restricted", "under_review", "not_approved"]).optional(),
  storageConditions: z.string().trim().optional().nullable(),
  sideEffectsSummary: z.string().trim().optional().nullable(),
});

const createDrugBatchSchema = z.object({
  drugId: z.string().uuid(),
  batchNumber: z.string().trim().min(2),
  manufactureDate: z.string().min(8),
  expiryDate: z.string().min(8),
  quantityReceived: z.number().int().positive(),
  quantityRemaining: z.number().int().nonnegative().optional(),
  supplierName: z.string().trim().optional().nullable(),
});

const createDrugRecallSchema = z.object({
  batchId: z.string().uuid(),
  reason: z.string().trim().min(3),
});

function makeDrugQrCode(batchNumber: string) {
  return `DR-QR-${batchNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
}

function normalizeDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

async function getPharmacyProfile(userId: string): Promise<PharmacyProfile | null> {
  const result = await pool.query(
    `
    SELECT id, user_id, business_name, ghana_pharmacy_council_number, district, region, is_verified
    FROM pharmacies
    WHERE user_id = $1
    LIMIT 1
    `,
    [userId]
  );

  if (!result.rowCount) return null;
  return {
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    businessName: result.rows[0].business_name,
    ghanaPharmacyCouncilNumber: result.rows[0].ghana_pharmacy_council_number,
    district: result.rows[0].district,
    region: result.rows[0].region,
    isVerified: result.rows[0].is_verified,
  };
}

async function loadPharmacyDashboard(userId: string): Promise<DrugDashboardResponse> {
  const pharmacy = await getPharmacyProfile(userId);
  if (!pharmacy) {
    return {
      pharmacy: null,
      metrics: { drugs: 0, batches: 0, qrCodes: 0, recalls: 0 },
      drugs: [],
      batches: [],
      recalls: [],
    };
  }

  const [drugs, batches, recalls, qrCodes] = await Promise.all([
    pool.query(
      `
      SELECT id, name, generic_name, manufacturer_name, drug_class, dosage_form, strength, fda_approval_status
      FROM drugs
      ORDER BY created_at DESC
      LIMIT 50
      `
    ),
    pool.query(
      `
      SELECT
        db.id,
        db.drug_id,
        db.pharmacy_id,
        db.batch_number,
        db.manufacture_date,
        db.expiry_date,
        db.quantity_received,
        db.quantity_remaining,
        db.recall_status,
        q.code_string AS qr_code,
        q.scan_count
      FROM drug_batches db
      LEFT JOIN drug_qr_codes q ON q.drug_batch_id = db.id
      WHERE db.pharmacy_id = $1
      ORDER BY db.created_at DESC
      `,
      [pharmacy.id]
    ),
    pool.query(
      `
      SELECT id, drug_batch_id, reason, created_at
      FROM drug_recall_events
      WHERE drug_batch_id IN (
        SELECT id FROM drug_batches WHERE pharmacy_id = $1
      )
      ORDER BY created_at DESC
      `,
      [pharmacy.id]
    ),
    pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM drug_qr_codes q
      INNER JOIN drug_batches db ON db.id = q.drug_batch_id
      WHERE db.pharmacy_id = $1
      `,
      [pharmacy.id]
    ),
  ]);

  return {
    pharmacy,
    metrics: {
      drugs: drugs.rowCount ?? 0,
      batches: batches.rowCount ?? 0,
      qrCodes: Number(qrCodes.rows[0]?.total ?? 0),
      recalls: recalls.rowCount ?? 0,
    },
    drugs: drugs.rows.map((row) => ({
      id: row.id,
      name: row.name,
      genericName: row.generic_name,
      manufacturerName: row.manufacturer_name,
      drugClass: row.drug_class,
      dosageForm: row.dosage_form,
      strength: row.strength,
      fdaApprovalStatus: row.fda_approval_status,
    })),
    batches: batches.rows.map((row) => ({
      id: row.id,
      drugId: row.drug_id,
      pharmacyId: row.pharmacy_id,
      batchNumber: row.batch_number,
      manufactureDate: row.manufacture_date,
      expiryDate: row.expiry_date,
      quantityReceived: Number(row.quantity_received),
      quantityRemaining: Number(row.quantity_remaining),
      recallStatus: row.recall_status,
      qrCode: row.qr_code,
      scanCount: Number(row.scan_count ?? 0),
    })),
    recalls: recalls.rows.map((row) => ({
      id: row.id,
      drugBatchId: row.drug_batch_id,
      reason: row.reason,
      createdAt: row.created_at,
    })),
  };
}

async function logDrugScan(codeString: string, userId: string | null, userAgent: string | undefined) {
  const qrResult = await pool.query(
    `SELECT id FROM drug_qr_codes WHERE code_string = $1 LIMIT 1`,
    [codeString]
  );
  if (!qrResult.rowCount) return null;

  const qrId = qrResult.rows[0].id as string;
  await pool.query(`UPDATE drug_qr_codes SET scan_count = scan_count + 1 WHERE id = $1`, [qrId]);
  await pool.query(
    `INSERT INTO drug_consumer_scans (drug_qr_code_id, user_id) VALUES ($1, $2)`,
    [qrId, userId]
  );
  return qrId;
}

function buildDrugScanResult(row: Record<string, unknown>): DrugScanResult {
  const recalled = row.recall_status === "recalled" || row.qr_status === "recalled";
  const expired = row.expiry_date ? new Date(String(row.expiry_date)) < new Date() : false;
  const status = recalled ? "recalled" : expired ? "caution" : "safe";
  return {
    codeString: String(row.code_string),
    status,
    statusLabel:
      status === "safe" ? "GREEN" : status === "recalled" ? "RED" : status === "caution" ? "YELLOW" : "NOT_FOUND",
    title: recalled ? "Recalled drug" : "Verified drug",
    summary: recalled
      ? "This drug batch is recalled. Do not dispense."
      : expired
        ? "This drug batch is expired or nearing expiry. Handle with caution."
        : "No active recall flag found for this batch.",
    drugName: row.name ? String(row.name) : undefined,
    batchNumber: row.batch_number ? String(row.batch_number) : undefined,
    manufacturerName: row.manufacturer_name ? String(row.manufacturer_name) : undefined,
    manufactureDate:
      row.manufacture_date && typeof (row.manufacture_date as any).toISOString === "function"
        ? (row.manufacture_date as any).toISOString().slice(0, 10)
        : row.manufacture_date
          ? String(row.manufacture_date).slice(0, 10)
          : undefined,
    expiryDate:
      row.expiry_date && typeof (row.expiry_date as any).toISOString === "function"
        ? (row.expiry_date as any).toISOString().slice(0, 10)
        : row.expiry_date
          ? String(row.expiry_date).slice(0, 10)
          : undefined,
    quantityRemaining: row.quantity_remaining !== undefined ? Number(row.quantity_remaining) : undefined,
    fdaApprovalStatus: row.fda_approval_status ? String(row.fda_approval_status) : undefined,
    recallStatus: row.recall_status ? String(row.recall_status) : undefined,
    scanCount: Number(row.scan_count ?? 0),
    reason: row.recall_reason ? String(row.recall_reason) : null,
    recommendedAction: recalled
      ? "Do not dispense. Return to pharmacy supervisor or regulator."
      : expired
        ? "Check expiry date and follow pharmacy procedure before dispensing."
        : "Proceed with normal dispensing checks.",
  };
}

// Public drug consumer scan endpoint.
router.get("/scan/:codeString", async (req, res) => {
  const { codeString } = req.params;
  const result = await pool.query(
    `
    SELECT
      q.id AS qr_id,
      q.code_string,
      q.status AS qr_status,
      q.scan_count,
      db.id AS batch_id,
      db.batch_number,
      db.manufacture_date,
      db.expiry_date,
      db.quantity_remaining,
      db.recall_status,
      d.name,
      d.manufacturer_name,
      d.fda_approval_status,
      (
        SELECT r.reason
        FROM drug_recall_events r
        WHERE r.drug_batch_id = db.id
        ORDER BY r.created_at DESC
        LIMIT 1
      ) AS recall_reason
    FROM drug_qr_codes q
    JOIN drug_batches db ON db.id = q.drug_batch_id
    JOIN drugs d ON d.id = db.drug_id
    WHERE q.code_string = $1
    LIMIT 1
    `,
    [codeString]
  );

  if (!result.rowCount) {
    return res.status(404).json({
      result: {
        codeString,
        status: "not_found",
        title: "No match found",
        summary: "We could not find a drug batch for this QR code.",
        recommendedAction: "Check the code and try again.",
      } satisfies DrugScanResult,
    });
  }

  const payload = buildDrugScanResult(result.rows[0]);
  await logDrugScan(codeString, null, req.headers["user-agent"] as string | undefined);
  return res.json({ result: payload });
});

router.use(requireAuth);
router.use(requireRole("pharmacist"));

router.get("/dashboard", async (req: AuthenticatedRequest, res) => {
  const dashboard = await loadPharmacyDashboard(req.auth!.userId);
  return res.json({ dashboard });
});

router.post("/register", async (req: AuthenticatedRequest, res) => {
  const parsed = registerPharmacySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies RegisterPharmacyRequest;
  const existing = await getPharmacyProfile(req.auth!.userId);
  if (existing) {
    return res.status(409).json({ error: "Pharmacy profile already exists" });
  }

  const result = await pool.query(
    `
    INSERT INTO pharmacies (user_id, business_name, ghana_pharmacy_council_number, district, region, is_verified)
    VALUES ($1, $2, $3, $4, $5, false)
    RETURNING id, user_id, business_name, ghana_pharmacy_council_number, district, region, is_verified
    `,
    [req.auth!.userId, body.businessName, body.ghanaPharmacyCouncilNumber, body.district, body.region]
  );

  return res.status(201).json({
    pharmacy: {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      businessName: result.rows[0].business_name,
      ghanaPharmacyCouncilNumber: result.rows[0].ghana_pharmacy_council_number,
      district: result.rows[0].district,
      region: result.rows[0].region,
      isVerified: result.rows[0].is_verified,
    } satisfies PharmacyProfile,
  });
});

router.post("/drugs", async (req: AuthenticatedRequest, res) => {
  const parsed = createDrugSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies CreateDrugRecordRequest;
  const inserted = await pool.query(
    `
    INSERT INTO drugs (
      name, generic_name, manufacturer_name, fda_drug_registration_number,
      drug_class, dosage_form, strength, requires_prescription, is_controlled,
      fda_approval_status, storage_conditions, side_effects_summary, last_updated
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
    RETURNING id, name, generic_name, manufacturer_name, drug_class, dosage_form, strength, fda_approval_status
    `,
    [
      body.name,
      body.genericName ?? null,
      body.manufacturerName ?? null,
      body.fdaDrugRegistrationNumber ?? null,
      body.drugClass ?? null,
      body.dosageForm ?? null,
      body.strength ?? null,
      body.requiresPrescription ?? false,
      body.isControlled ?? false,
      body.fdaApprovalStatus ?? "under_review",
      body.storageConditions ?? null,
      body.sideEffectsSummary ?? null,
    ]
  );

  return res.status(201).json({ drug: inserted.rows[0] });
});

async function createDrugBatch(req: AuthenticatedRequest, res: import("express").Response) {
  const parsed = createDrugBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const pharmacy = await getPharmacyProfile(req.auth!.userId);
  if (!pharmacy) {
    return res.status(404).json({ error: "Pharmacy profile not found" });
  }

  const body = parsed.data satisfies CreateDrugBatchRequest;
  const drugCheck = await pool.query(`SELECT id FROM drugs WHERE id = $1 LIMIT 1`, [body.drugId]);
  if (!drugCheck.rowCount) {
    return res.status(404).json({ error: "Drug not found" });
  }

  const batch = await pool.query(
    `
    INSERT INTO drug_batches (
      drug_id, pharmacy_id, batch_number, manufacture_date, expiry_date,
      quantity_received, quantity_remaining, supplier_name, recall_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
    RETURNING id, drug_id, pharmacy_id, batch_number, manufacture_date, expiry_date, quantity_received, quantity_remaining, recall_status
    `,
    [
      body.drugId,
      pharmacy.id,
      body.batchNumber,
      normalizeDate(body.manufactureDate),
      normalizeDate(body.expiryDate),
      body.quantityReceived,
      body.quantityRemaining ?? body.quantityReceived,
      body.supplierName ?? null,
    ]
  );

  const codeString = makeDrugQrCode(body.batchNumber);
  const qr = await pool.query(
    `
    INSERT INTO drug_qr_codes (drug_batch_id, code_string, s3_url, scan_count, status)
    VALUES ($1, $2, $3, 0, 'active')
    RETURNING id, code_string, status
    `,
    [batch.rows[0].id, codeString, null]
  );

  const response: CreateDrugBatchResponse = {
    batch: {
      id: batch.rows[0].id,
      drugId: batch.rows[0].drug_id,
      pharmacyId: batch.rows[0].pharmacy_id,
      batchNumber: batch.rows[0].batch_number,
      manufactureDate: batch.rows[0].manufacture_date,
      expiryDate: batch.rows[0].expiry_date,
      quantityReceived: Number(batch.rows[0].quantity_received),
      quantityRemaining: Number(batch.rows[0].quantity_remaining),
      recallStatus: batch.rows[0].recall_status,
      qrCode: codeString,
      scanCount: 0,
    },
    qrCode: {
      id: qr.rows[0].id,
      codeString: qr.rows[0].code_string,
      status: qr.rows[0].status,
    },
  };

  return res.status(201).json(response);
}

router.post("/batches", createDrugBatch);
router.post("/drug-batches", createDrugBatch);

router.post("/recalls", async (req: AuthenticatedRequest, res) => {
  const parsed = createDrugRecallSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const pharmacy = await getPharmacyProfile(req.auth!.userId);
  if (!pharmacy) {
    return res.status(404).json({ error: "Pharmacy profile not found" });
  }

  const body = parsed.data satisfies CreateDrugRecallRequest;
  const batchCheck = await pool.query(
    `SELECT id FROM drug_batches WHERE id = $1 AND pharmacy_id = $2 LIMIT 1`,
    [body.batchId, pharmacy.id]
  );
  if (!batchCheck.rowCount) {
    return res.status(404).json({ error: "Drug batch not found" });
  }

  await pool.query(
    `UPDATE drug_batches SET recall_status = 'recalled' WHERE id = $1`,
    [body.batchId]
  );
  await pool.query(
    `UPDATE drug_qr_codes SET status = 'recalled' WHERE drug_batch_id = $1`,
    [body.batchId]
  );

  const recall = await pool.query(
    `
    INSERT INTO drug_recall_events (drug_batch_id, issued_by, reason)
    VALUES ($1, $2, $3)
    RETURNING id, drug_batch_id, reason, created_at
    `,
    [body.batchId, req.auth!.userId, body.reason]
  );

  return res.status(201).json({ recall: recall.rows[0] });
});

export default router;
