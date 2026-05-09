import { Router } from "express";
import fs from "fs";
import path from "path";
import type { QueryResultRow } from "pg";
import multer from "multer";
import { pool } from "../config/db";
import { type AuthenticatedRequest, requireAuth } from "../middleware/auth";
import { verifyAuthToken } from "../lib/jwt";
import { getCachedJson, setCachedJson } from "../lib/scanCache";
import type {
  ConsumerReportSummary,
  FlagConsumerReportRequest,
  FlagConsumerReportResponse,
  ProductScanResult,
  ProductScanStatus,
  SubmitConsumerReportRequest,
  SubmitConsumerReportResponse,
} from "@foodtrace/shared";

const router = Router();
const reportUploadDir = path.join(process.cwd(), "uploads", "reports");
fs.mkdirSync(reportUploadDir, { recursive: true });

const reportUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, reportUploadDir),
    filename: (_req, file, cb) => {
      const stamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${stamp}-${safeName}`);
    },
  }),
});

const scanCachePrefix = "foodtrace:scan:";

function deriveStatus(row: QueryResultRow): ProductScanStatus {
  const today = new Date();
  const expiryDate = row.expiry_date ? new Date(row.expiry_date) : null;

  if (row.qr_status === "invalidated" || row.qr_status === "recalled" || row.recall_status === "recalled") {
    return "recalled";
  }

  if (expiryDate && expiryDate < today) {
    return "caution";
  }

  if (row.qr_status === "under_investigation" || row.recall_status === "under_investigation") {
    return "caution";
  }

  return "safe";
}

function buildResult(row: QueryResultRow): ProductScanResult {
  const status = deriveStatus(row);
  const statusLabel =
    status === "safe" ? "GREEN" : status === "recalled" ? "RED" : status === "not_found" ? "NOT_FOUND" : "YELLOW";
  return {
    codeString: row.code_string,
    status,
    statusLabel,
    title: status === "recalled" ? "Recalled product" : "Verified product",
    summary:
      status === "recalled"
        ? "This product is flagged for recall. Do not consume it."
        : status === "caution"
          ? "This product needs caution. Review the reason before use."
          : "No recall flag or major issue found for this batch.",
    productName: row.product_name ?? null,
    farmOrigin: row.farm_origin ?? null,
    batchNumber: row.batch_number,
    manufacturerName: row.company_name,
    packagingDate: row.packaging_date?.toISOString?.().slice(0, 10) ?? row.packaging_date,
    expiryDate: row.expiry_date?.toISOString?.().slice(0, 10) ?? row.expiry_date,
    recallStatus: row.recall_status,
    qrStatus: row.qr_status,
    scanCount: Number(row.scan_count ?? 0),
    reason: row.recall_reason ?? row.latest_recall_reason ?? null,
    recommendedAction:
      status === "recalled"
        ? "Do not consume. Return to seller or report to FDA."
        : status === "caution"
          ? "Check the batch details and use carefully."
          : "Proceed normally and keep the label for reference.",
  };
}

async function logScan(codeString: string, req: AuthenticatedRequest | undefined) {
  const token = req?.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice("Bearer ".length)
    : undefined;

  let userId: string | null = null;
  if (token) {
    try {
      userId = verifyAuthToken(token).sub;
    } catch {
      userId = null;
    }
  }

  const qrResult = await pool.query(
    `SELECT id, scan_count FROM qr_codes WHERE code_string = $1 LIMIT 1`,
    [codeString]
  );
  if (!qrResult.rowCount) {
    return;
  }

  const qrId = qrResult.rows[0].id as string;
  await pool.query(`UPDATE qr_codes SET scan_count = scan_count + 1 WHERE id = $1`, [qrId]);
  await pool.query(
    `INSERT INTO consumer_scans (qr_code_id, user_id, user_agent)
     VALUES ($1, $2, $3)`,
    [qrId, userId, req?.headers["user-agent"] ?? null]
  );
}

function normalizeCode(codeString: string) {
  return codeString.trim().toUpperCase();
}

function mapReportRow(row: QueryResultRow): ConsumerReportSummary {
  return {
    id: row.id,
    qrCodeId: row.qr_code_id,
    reporterId: row.reporter_id,
    description: row.description,
    photoUrl: row.photo_url,
    district: row.district,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function loadScanResult(codeString: string) {
  const cacheKey = `${scanCachePrefix}${codeString}`;
  const cached = await getCachedJson<ProductScanResult>(cacheKey);
  if (cached) {
    return { result: cached, cached: true };
  }

  const result = await pool.query(
    `
    SELECT
      q.id AS qr_id,
      q.code_string,
      q.status AS qr_status,
      q.scan_count,
      q.s3_url,
      pb.id AS batch_id,
      pb.batch_number,
      pb.product_name,
      pb.farm_origin,
      pb.packaging_date,
      pb.expiry_date,
      pb.recall_status,
      pb.recall_reason,
      m.company_name,
      m.fda_registration_number,
      (
        SELECT r.reason
        FROM recall_events r
        WHERE r.batch_id = pb.id
        ORDER BY r.created_at DESC
        LIMIT 1
      ) AS latest_recall_reason
    FROM qr_codes q
    JOIN product_batches pb ON pb.id = q.batch_id
    JOIN manufacturers m ON m.id = pb.manufacturer_id
    WHERE q.code_string = $1
    LIMIT 1
    `,
    [codeString]
  );

  if (!result.rowCount) {
    const notFound: ProductScanResult = {
      codeString,
      status: "not_found",
      title: "No match found",
      summary: "We could not find a product for this QR or batch code.",
      recommendedAction: "Check the code and try again.",
    };
    await setCachedJson(cacheKey, notFound, 45);
    return { result: notFound, cached: false };
  }

  const payload = buildResult(result.rows[0]);
  await setCachedJson(cacheKey, payload, payload.status === "recalled" ? 120 : 300);
  return { result: payload, cached: false };
}

router.get("/:codeString", async (req, res) => {
  const codeString = normalizeCode(req.params.codeString);
  const { result, cached } = await loadScanResult(codeString);
  if (result.status === "not_found") {
    return res.status(404).json({ result, cached });
  }

  await logScan(codeString, req as AuthenticatedRequest | undefined);
  return res.json({
    result: {
      ...result,
      scanCount: Number(result.scanCount ?? 0) + 1,
    },
    cached,
  });
});

router.post("/:codeString/log", requireAuth, async (req: AuthenticatedRequest, res) => {
  await logScan(normalizeCode(String(req.params.codeString)), req);
  return res.status(204).send();
});

const reportSchema = {
  parse(body: Record<string, unknown>): SubmitConsumerReportRequest {
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const district = typeof body.district === "string" ? body.district.trim() : null;
    const photoUrl = typeof body.photoUrl === "string" ? body.photoUrl.trim() : null;

    if (description.length < 10) {
      throw new Error("Description must be at least 10 characters");
    }

    return {
      description,
      district: district || null,
      photoUrl: photoUrl || null,
    };
  },
};

async function saveReport(
  codeString: string,
  reporterId: string,
  payload: SubmitConsumerReportRequest,
  photoUrl: string | null
) {
  const qrCheck = await pool.query(
    `SELECT id FROM qr_codes WHERE code_string = $1 LIMIT 1`,
    [codeString]
  );
  if (!qrCheck.rowCount) {
    return null;
  }

  const inserted = await pool.query(
    `
    INSERT INTO consumer_reports (qr_code_id, reporter_id, description, photo_url, district, status)
    VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING id, qr_code_id, reporter_id, description, photo_url, district, status, created_at
    `,
    [
      qrCheck.rows[0].id,
      reporterId,
      payload.description,
      photoUrl,
      payload.district ?? null,
    ]
  );

  return mapReportRow(inserted.rows[0]);
}

router.post(
  "/:codeString/report",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    if (!req.is("multipart/form-data")) {
      return next();
    }

    const uploadCompleted = await new Promise<boolean>((resolve) => {
      reportUpload.single("photo")(req, res, (error) => {
        if (error) {
          next(error);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
    if (!uploadCompleted) {
      return;
    }
    return next();
  },
  async (req: AuthenticatedRequest, res) => {
    if (req.auth?.role !== "consumer") {
      return res.status(403).json({ error: "Consumer role required" });
    }

    let payload: SubmitConsumerReportRequest;
    try {
      payload = reportSchema.parse(req.body as Record<string, unknown>);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid report" });
    }

    const codeString = normalizeCode(String(req.params.codeString));
    const photoUrl =
      req.file?.filename ? `/uploads/reports/${req.file.filename}` : payload.photoUrl ?? null;

    const report = await saveReport(codeString, req.auth.userId, payload, photoUrl);
    if (!report) {
      return res.status(404).json({ error: "Batch not found" });
    }

    return res.status(201).json({
      report,
    } satisfies SubmitConsumerReportResponse);
  }
);

router.patch(
  "/reports/:reportId/flag",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    if (req.auth?.role !== "regulator") {
      return res.status(403).json({ error: "Regulator role required" });
    }
    return next();
  },
  async (req: AuthenticatedRequest, res) => {
    const body = req.body as Partial<FlagConsumerReportRequest>;
    const reportId = body.reportId ?? req.params.reportId;
    const status = body.status ?? "reviewing";

    const updated = await pool.query(
      `
      UPDATE consumer_reports
      SET status = $2
      WHERE id = $1
      RETURNING id, qr_code_id, reporter_id, description, photo_url, district, status, created_at
      `,
      [reportId, status]
    );

    if (!updated.rowCount) {
      return res.status(404).json({ error: "Report not found" });
    }

    return res.json({
      report: mapReportRow(updated.rows[0]),
    } satisfies FlagConsumerReportResponse);
  }
);

export default router;
