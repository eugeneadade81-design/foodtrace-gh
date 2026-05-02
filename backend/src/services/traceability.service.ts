import { pool } from "../config/db";
import type { ProductScanResult, DrugScanResult } from "@foodtrace/shared";

function normalizeCode(codeString: string) {
  return codeString.trim().toUpperCase();
}

function toIsoDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function crossCheckPesticide(productName: string, cropType: string) {
  const result = await pool.query(
    `
    SELECT name, active_ingredient, epa_status, approved_crops, withdrawal_days, ban_reason
    FROM pesticides
    WHERE LOWER(name) = LOWER($1) OR LOWER(active_ingredient) = LOWER($1)
    LIMIT 1
    `,
    [productName]
  );

  if (!result.rowCount) {
    return {
      found: false,
      name: productName,
      epaStatus: "unverified" as const,
      approvedCrops: [] as string[],
      withdrawalDays: 0,
      message: `No EPA record found for ${productName}. Verify manually before use on ${cropType}.`,
    };
  }

  const row = result.rows[0];
  const approvedCrops = Array.isArray(row.approved_crops) ? row.approved_crops : [];
  const cropAllowed = approvedCrops.length === 0 || approvedCrops.some((item: string) => item.toLowerCase() === cropType.toLowerCase());
  const epaStatus = row.epa_status as "approved" | "banned" | "restricted" | "unverified";
  const withdrawalDays = Number(row.withdrawal_days ?? 0);

  if (epaStatus === "banned") {
    return {
      found: true,
      name: row.name as string,
      epaStatus,
      approvedCrops,
      withdrawalDays,
      message: `${row.name} is banned by EPA and should not be used.`,
    };
  }

  if (epaStatus === "restricted" && !cropAllowed) {
    return {
      found: true,
      name: row.name as string,
      epaStatus,
      approvedCrops,
      withdrawalDays,
      message: `${row.name} is restricted and is not approved for ${cropType}.`,
    };
  }

  return {
    found: true,
    name: row.name as string,
    epaStatus,
    approvedCrops,
    withdrawalDays,
    message: cropAllowed
      ? `${row.name} is EPA ${epaStatus} for this crop.`
      : `${row.name} is EPA ${epaStatus} but has no approval listed for ${cropType}.`,
  };
}

export async function lookupFoodProduct(codeString: string) {
  const normalized = normalizeCode(codeString);
  const result = await pool.query(
    `
    SELECT
      q.code_string,
      q.status AS qr_status,
      q.scan_count,
      pb.batch_number,
      pb.packaging_date,
      pb.expiry_date,
      pb.recall_status,
      pb.recall_reason,
      m.company_name,
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
    [normalized]
  );

  if (!result.rowCount) {
    return {
      found: false,
      result: {
        codeString: normalized,
        status: "not_found",
        title: "No match found",
        summary: "We could not find a product for this code.",
        recommendedAction: "Check the batch number and try again.",
      } satisfies ProductScanResult,
    };
  }

  const row = result.rows[0];
  const status =
    row.qr_status === "recalled" || row.recall_status === "recalled"
      ? "recalled"
      : row.qr_status === "under_investigation" || row.recall_status === "under_investigation"
        ? "caution"
        : toIsoDate(row.expiry_date) && new Date(String(row.expiry_date)) < new Date()
          ? "caution"
          : "safe";

  const scanResult: ProductScanResult = {
    codeString: normalized,
    status,
    title: status === "recalled" ? "Recalled product" : "Verified product",
    summary:
      status === "recalled"
        ? "This product is flagged for recall. Do not consume it."
        : status === "caution"
          ? "This product needs caution. Review the reason before use."
          : "No recall flag or major issue found for this batch.",
    batchNumber: row.batch_number,
    manufacturerName: row.company_name,
    packagingDate: toIsoDate(row.packaging_date) ?? undefined,
    expiryDate: toIsoDate(row.expiry_date) ?? undefined,
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

  const districtText = "Not captured in USSD record";
  const plainText =
    status === "safe"
      ? `SAFE: ${scanResult.batchNumber ?? "Product"}. Farm: ${districtText}. Expires: ${scanResult.expiryDate ?? "N/A"}. All chemicals EPA approved.`
      : status === "recalled"
        ? `RECALLED: ${scanResult.batchNumber ?? "Product"}. DO NOT EAT. Reason: ${scanResult.reason ?? "Recall issued"}. Call FDA: 0800-FOOD.`
        : `CAUTION: ${scanResult.batchNumber ?? "Product"}. Under investigation. Check FoodTrace app for details.`;

  return { found: true, result: scanResult, plainText };
}

export async function lookupDrugProduct(codeString: string) {
  const normalized = normalizeCode(codeString);
  const result = await pool.query(
    `
    SELECT
      q.code_string,
      q.status AS qr_status,
      q.scan_count,
      db.batch_number,
      db.manufacture_date,
      db.expiry_date,
      db.quantity_remaining,
      db.recall_status,
      db.recall_reason,
      d.name,
      d.manufacturer_name,
      d.requires_prescription,
      d.fda_approval_status
    FROM drug_qr_codes q
    JOIN drug_batches db ON db.id = q.drug_batch_id
    JOIN drugs d ON d.id = db.drug_id
    WHERE q.code_string = $1
    LIMIT 1
    `,
    [normalized]
  );

  if (!result.rowCount) {
    return {
      found: false,
      result: {
        codeString: normalized,
        status: "not_found",
        title: "No match found",
        summary: "We could not find a drug batch for this code.",
        recommendedAction: "Check the packaging code and try again.",
      } satisfies DrugScanResult,
    };
  }

  const row = result.rows[0];
  const expired = row.expiry_date ? new Date(String(row.expiry_date)) < new Date() : false;
  const status = row.qr_status === "recalled" || row.recall_status === "recalled" ? "recalled" : expired ? "caution" : "safe";

  const scanResult: DrugScanResult = {
    codeString: normalized,
    status,
    title: status === "recalled" ? "Recalled drug" : "Verified drug",
    summary:
      status === "recalled"
        ? "This drug batch is recalled. Do not dispense."
        : status === "caution"
          ? "This drug batch is expired or nearing expiry. Handle with caution."
          : "No active recall flag found for this batch.",
    drugName: row.name,
    batchNumber: row.batch_number,
    manufacturerName: row.manufacturer_name,
    manufactureDate: toIsoDate(row.manufacture_date) ?? undefined,
    expiryDate: toIsoDate(row.expiry_date) ?? undefined,
    quantityRemaining: Number(row.quantity_remaining ?? 0),
    fdaApprovalStatus: row.fda_approval_status,
    recallStatus: row.recall_status,
    scanCount: Number(row.scan_count ?? 0),
    reason: row.recall_reason ?? null,
    recommendedAction:
      status === "recalled"
        ? "Do not dispense. Return to pharmacy supervisor or regulator."
        : status === "caution"
          ? "Check expiry date and follow pharmacy procedure before dispensing."
          : "Proceed with normal dispensing checks.",
  };

  const plainText =
    `Name: ${scanResult.drugName ?? "N/A"}. ` +
    `FDA status: ${scanResult.fdaApprovalStatus ?? "N/A"}. ` +
    `Expiry: ${scanResult.expiryDate ?? "N/A"}. ` +
    `Requires prescription: ${row.requires_prescription ? "YES" : "NO"}. ` +
    `Recall status: ${scanResult.recallStatus ?? "N/A"}.`;

  return { found: true, result: scanResult, plainText };
}

export async function logFarmerPesticideInput(params: {
  farmerId: string;
  pesticideName: string;
  cropType: string;
  applicationDate: string;
}) {
  const farmer = await pool.query(
    `SELECT id, full_name, phone FROM users WHERE id = $1 AND role = 'farmer' LIMIT 1`,
    [params.farmerId]
  );
  if (!farmer.rowCount) {
    return { ok: false as const, message: "Farmer not found." };
  }

  const cycle = await pool.query(
    `
    SELECT cc.id, cc.crop_type, cc.planting_date, f.name AS farm_name, f.district
    FROM crop_cycles cc
    INNER JOIN farms f ON f.id = cc.farm_id
    WHERE f.owner_id = $1 AND cc.market_ready = false
    ORDER BY cc.created_at DESC
    LIMIT 1
    `,
    [params.farmerId]
  );

  if (!cycle.rowCount) {
    return { ok: false as const, message: "No open crop cycle found." };
  }

  const crossCheck = await crossCheckPesticide(params.pesticideName, params.cropType);
  const safeHarvestDate = addDays(params.applicationDate, crossCheck.withdrawalDays);

  await pool.query(
    `
    INSERT INTO input_logs (crop_cycle_id, input_type, product_name, application_date, withdrawal_period_days, safe_harvest_date, epa_approval_status)
    VALUES ($1, 'pesticide', $2, $3, $4, $5, $6)
    `,
    [
      cycle.rows[0].id,
      params.pesticideName,
      params.applicationDate,
      crossCheck.withdrawalDays,
      safeHarvestDate,
      crossCheck.epaStatus,
    ]
  );

  return {
    ok: true as const,
    crossCheck,
    cropType: cycle.rows[0].crop_type as string,
    farmName: cycle.rows[0].farm_name as string,
    district: cycle.rows[0].district as string,
    safeHarvestDate,
    warning: crossCheck.epaStatus === "banned" ? `WARNING: ${crossCheck.name} is BANNED by EPA Ghana. Do not use. This has been reported.` : null,
  };
}

export async function findFarmerByPhone(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  const result = await pool.query(
    `
    SELECT id, full_name, phone
    FROM users
    WHERE role = 'farmer'
      AND regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = $1
    LIMIT 1
    `,
    [digits]
  );
  if (!result.rowCount) {
    return null;
  }
  return {
    id: result.rows[0].id as string,
    fullName: result.rows[0].full_name as string,
    phone: result.rows[0].phone as string | null,
  };
}

export async function logFarmInputByPhone(params: {
  phoneNumber: string;
  pesticideName: string;
  cropType: string;
  applicationDate: string;
}) {
  const farmer = await findFarmerByPhone(params.phoneNumber);
  if (!farmer) {
    return { ok: false as const, message: "Phone not registered. Visit foodtrace.gh or call extension officer." };
  }

  const outcome = await logFarmerPesticideInput({
    farmerId: farmer.id,
    pesticideName: params.pesticideName,
    cropType: params.cropType,
    applicationDate: params.applicationDate,
  });

  if (!outcome.ok) {
    return outcome;
  }

  return outcome;
}
