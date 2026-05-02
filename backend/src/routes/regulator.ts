import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { requireAuth, type AuthenticatedRequest, requireRole } from "../middleware/auth";
import type {
  RegulatorAnalyticsSummary,
  RegulatorDashboardResponse,
  RegulatorRecallRequest,
  RegulatorReportSummary,
  RegulatorViolationAlertSummary,
  ReviewReportRequest,
} from "@foodtrace/shared";

const router = Router();

const reviewReportSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["reviewing", "resolved", "dismissed"]),
});

const recallSchema = z.object({
  batchId: z.string().uuid(),
  reason: z.string().trim().min(3),
  scopeDistricts: z.array(z.string().trim().min(2)).optional(),
  domain: z.enum(["food", "drug"]).optional(),
});

async function findBatchDomain(batchId: string): Promise<"food" | "drug" | null> {
  const food = await pool.query(`SELECT id FROM product_batches WHERE id = $1 LIMIT 1`, [batchId]);
  if (food.rowCount) {
    return "food";
  }

  const drug = await pool.query(`SELECT id FROM drug_batches WHERE id = $1 LIMIT 1`, [batchId]);
  if (drug.rowCount) {
    return "drug";
  }

  return null;
}

async function loadDashboard(): Promise<RegulatorDashboardResponse> {
  const [
    farms,
    manufacturers,
    pharmacies,
    foodRecalls,
    drugRecalls,
    reports,
    foodScans,
    drugScans,
    foodRiskReports,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM farms`),
    pool.query(`SELECT COUNT(*)::int AS total FROM manufacturers`),
    pool.query(`SELECT COUNT(*)::int AS total FROM pharmacies`),
    pool.query(`SELECT id, batch_id, recall_type, reason, scope_districts, created_at FROM recall_events ORDER BY created_at DESC LIMIT 20`),
    pool.query(`SELECT id, drug_batch_id, reason, created_at FROM drug_recall_events ORDER BY created_at DESC LIMIT 20`),
    pool.query(`SELECT id, qr_code_id, reporter_id, description, district, status, created_at, photo_url FROM consumer_reports ORDER BY created_at DESC LIMIT 20`),
    pool.query(`SELECT COUNT(*)::int AS total FROM consumer_scans`),
    pool.query(`SELECT COUNT(*)::int AS total FROM drug_consumer_scans`),
    pool.query(`SELECT id, reporter_id, description, district, status, created_at FROM consumer_reports WHERE status IN ('pending','reviewing') ORDER BY created_at DESC LIMIT 10`),
  ]);

  const pendingReports = reports.rows.filter((row) => row.status === "pending").length;
  const reviewingReports = reports.rows.filter((row) => row.status === "reviewing").length;
  const resolvedReports = reports.rows.filter((row) => row.status === "resolved").length;
  const foodRecallCount = foodRecalls.rowCount ?? 0;
  const drugRecallCount = drugRecalls.rowCount ?? 0;
  const totalScans = Number(foodScans.rows[0]?.total ?? 0) + Number(drugScans.rows[0]?.total ?? 0);

  const alerts: RegulatorViolationAlertSummary[] = [
    ...foodRiskReports.rows.map((row) => ({
      id: `report-${row.id}`,
      source: "report" as const,
      severity: row.status === "pending" ? ("medium" as const) : ("low" as const),
      title: "Consumer report needs review",
      description: row.description,
      district: row.district,
      createdAt: row.created_at,
    })),
    ...foodRecalls.rows.map((row) => ({
      id: `food-recall-${row.id}`,
      source: "food" as const,
      severity: "high" as const,
      title: "Food recall active",
      description: row.reason,
      createdAt: row.created_at,
    })),
    ...drugRecalls.rows.map((row) => ({
      id: `drug-recall-${row.id}`,
      source: "drug" as const,
      severity: "high" as const,
      title: "Drug recall active",
      description: row.reason,
      createdAt: row.created_at,
    })),
  ];

  const topDistricts = Array.from(
    new Set([
      ...reports.rows.map((row) => row.district).filter((value): value is string => Boolean(value)),
      ...foodRecalls.rows.flatMap((row) => row.scope_districts ?? []),
    ])
  ).slice(0, 5);

  return {
    compliance: {
      farms: Number(farms.rows[0]?.total ?? 0),
      manufacturers: Number(manufacturers.rows[0]?.total ?? 0),
      pharmacies: Number(pharmacies.rows[0]?.total ?? 0),
      foodRecalls: foodRecallCount,
      drugRecalls: drugRecallCount,
      pendingReports,
      reviewingReports,
      resolvedReports,
      safeScans: Math.max(totalScans - alerts.filter((alert) => alert.severity === "high").length, 0),
      cautionScans: alerts.filter((alert) => alert.severity === "medium").length,
      recalledScans: alerts.filter((alert) => alert.severity === "high").length,
    },
    alerts,
    reports: reports.rows.map((row) => ({
      id: row.id,
      qrCodeId: row.qr_code_id,
      reporterId: row.reporter_id,
      description: row.description,
      district: row.district,
      status: row.status,
      createdAt: row.created_at,
    })) satisfies RegulatorReportSummary[],
    recalls: [
      ...foodRecalls.rows.map((row) => ({
        id: row.id,
        batchId: row.batch_id,
        recallType: row.recall_type,
        reason: row.reason,
        scopeDistricts: row.scope_districts,
        createdAt: row.created_at,
      })),
      ...drugRecalls.rows.map((row) => ({
        id: row.id,
        batchId: row.drug_batch_id,
        recallType: "regulator",
        reason: row.reason,
        createdAt: row.created_at,
      })),
    ],
    analytics: {
      totalScans,
      foodScans: Number(foodScans.rows[0]?.total ?? 0),
      drugScans: Number(drugScans.rows[0]?.total ?? 0),
      activeRecallCount: foodRecallCount + drugRecallCount,
      topDistricts,
      highRiskAlerts: alerts.filter((alert) => alert.severity === "high").length,
    } satisfies RegulatorAnalyticsSummary,
  };
}

router.use(requireAuth);
router.use(requireRole("regulator"));

router.get("/dashboard", async (_req, res) => {
  const dashboard = await loadDashboard();
  return res.json({ dashboard });
});

router.get("/analytics", async (_req, res) => {
  const dashboard = await loadDashboard();
  return res.json({ compliance: dashboard.compliance, analytics: dashboard.analytics });
});

router.get("/violations", async (_req, res) => {
  const dashboard = await loadDashboard();
  return res.json({ alerts: dashboard.alerts });
});

router.patch("/reports", async (req: AuthenticatedRequest, res) => {
  const parsed = reviewReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies ReviewReportRequest;
  const updated = await pool.query(
    `
    UPDATE consumer_reports
    SET status = $2
    WHERE id = $1
    RETURNING id, qr_code_id, reporter_id, description, photo_url, district, status, created_at
    `,
    [body.reportId, body.status]
  );

  if (!updated.rowCount) {
    return res.status(404).json({ error: "Report not found" });
  }

  return res.json({
    report: {
      id: updated.rows[0].id,
      qrCodeId: updated.rows[0].qr_code_id,
      reporterId: updated.rows[0].reporter_id,
      description: updated.rows[0].description,
      photoUrl: updated.rows[0].photo_url,
      district: updated.rows[0].district,
      status: updated.rows[0].status,
      createdAt: updated.rows[0].created_at,
    },
  });
});

router.post("/recalls", async (req: AuthenticatedRequest, res) => {
  const parsed = recallSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies RegulatorRecallRequest;
  const domain = body.domain ?? (await findBatchDomain(body.batchId));
  if (!domain) {
    return res.status(404).json({ error: "Batch not found" });
  }

  if (domain === "food") {
    await pool.query(
      `UPDATE product_batches SET recall_status = 'recalled', recall_reason = $2, recalled_at = now() WHERE id = $1`,
      [body.batchId, body.reason]
    );
    await pool.query(`UPDATE qr_codes SET status = 'recalled' WHERE batch_id = $1`, [body.batchId]);

    const recall = await pool.query(
      `
      INSERT INTO recall_events (batch_id, issued_by, recall_type, reason, scope_districts, notification_sent_at)
      VALUES ($1, $2, 'regulator', $3, $4, now())
      RETURNING id, batch_id, recall_type, reason, scope_districts, created_at
      `,
      [body.batchId, req.auth!.userId, body.reason, body.scopeDistricts ?? []]
    );

    return res.status(201).json({ recall: recall.rows[0] });
  }

  await pool.query(`UPDATE drug_batches SET recall_status = 'recalled' WHERE id = $1`, [body.batchId]);
  await pool.query(`UPDATE drug_qr_codes SET status = 'recalled' WHERE drug_batch_id = $1`, [body.batchId]);

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
