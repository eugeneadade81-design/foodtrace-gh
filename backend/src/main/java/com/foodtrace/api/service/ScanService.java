package com.foodtrace.api.service;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ScanService {
  private final JdbcClient jdbc;

  public ScanService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  // ── Food scan ──────────────────────────────────────────────────────────────

  public Map<String, Object> scanFood(String codeString) {
    String code = normalize(codeString);
    return jdbc.sql("""
        SELECT
          q.id            AS qr_id,
          q.code_string,
          q.status        AS qr_status,
          q.scan_count,
          pb.id           AS batch_id,
          pb.batch_number,
          pb.product_name,
          pb.farm_origin,
          pb.packaging_date,
          pb.expiry_date,
          pb.recall_status,
          pb.recall_reason,
          m.company_name,
          (pb.expiry_date < CURRENT_DATE) AS is_expired,
          EXISTS (
            SELECT 1 FROM recall_events re
            WHERE re.batch_id = pb.id AND re.resolved_at IS NULL
          ) AS has_active_recall
        FROM qr_codes q
        JOIN product_batches pb ON pb.id = q.batch_id
        JOIN manufacturers   m  ON m.id  = pb.manufacturer_id
        WHERE q.code_string = :code
        LIMIT 1
        """)
        .param("code", code)
        .query(DatabaseRowMapper::toMap)
        .optional()
        .map(row -> {
          jdbc.sql("UPDATE qr_codes SET scan_count = scan_count + 1 WHERE id = :id")
              .param("id", row.get("qrId")).update();
          return buildFoodResult(row);
        })
        .orElseGet(() -> notFound(code));
  }

  // ── Drug scan ──────────────────────────────────────────────────────────────

  public Map<String, Object> scanDrug(String codeString) {
    String code = normalize(codeString);
    return jdbc.sql("""
        SELECT
          q.id              AS qr_id,
          q.code_string,
          q.status          AS qr_status,
          q.scan_count,
          db.id             AS batch_id,
          db.batch_number,
          db.expiry_date,
          db.recall_status,
          d.name            AS product_name,
          d.generic_name,
          d.fda_approval_status,
          p.business_name   AS pharmacy_name,
          (db.expiry_date < CURRENT_DATE) AS is_expired,
          EXISTS (
            SELECT 1 FROM drug_recall_events dre
            WHERE dre.drug_batch_id = db.id
          ) AS has_active_recall
        FROM drug_qr_codes q
        JOIN drug_batches db ON db.id  = q.drug_batch_id
        JOIN drugs         d  ON d.id  = db.drug_id
        JOIN pharmacies    p  ON p.id  = db.pharmacy_id
        WHERE q.code_string = :code
        LIMIT 1
        """)
        .param("code", code)
        .query(DatabaseRowMapper::toMap)
        .optional()
        .map(row -> {
          jdbc.sql("UPDATE drug_qr_codes SET scan_count = scan_count + 1 WHERE id = :id")
              .param("id", row.get("qrId")).update();
          return buildDrugResult(row);
        })
        .orElseGet(() -> notFound(code));
  }

  // ── Consumer report ────────────────────────────────────────────────────────

  public Map<String, Object> submitReport(String codeString, String reporterId, Map<String, Object> body) {
    String description = String.valueOf(body.getOrDefault("description", "")).trim();
    if (description.length() < 10) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description must be at least 10 characters");
    }
    Object qrId = jdbc.sql("SELECT id FROM qr_codes WHERE code_string = :code LIMIT 1")
        .param("code", normalize(codeString))
        .query(DatabaseRowMapper::toMap)
        .optional()
        .map(row -> row.get("id"))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found"));
    Map<String, Object> report = jdbc.sql("""
        INSERT INTO consumer_reports (qr_code_id, reporter_id, description, photo_url, district, status)
        VALUES (:qrId, :reporterId, :description, :photoUrl, :district, 'pending')
        RETURNING id, qr_code_id, reporter_id, description, photo_url, district, status, created_at
        """)
        .param("qrId", qrId)
        .param("reporterId", reporterId)
        .param("description", description)
        .param("photoUrl", body.get("photoUrl"))
        .param("district", body.get("district"))
        .query(DatabaseRowMapper::toMap)
        .single();
    return Map.of("report", report);
  }

  // ── Status derivation ──────────────────────────────────────────────────────

  /**
   * Food status priority:
   * 1. RECALLED — batch.recall_status = 'recalled' OR active recall_event exists
   * 2. CAUTION  — expiry date has passed
   * 3. SAFE     — everything is fine
   */
  private String deriveFoodStatus(Map<String, Object> row) {
    if (hasActiveRecall(row)) return "recalled";
    if (Boolean.TRUE.equals(row.get("isExpired"))) return "caution";
    return "safe";
  }

  /**
   * Drug status priority:
   * 1. RECALLED — batch.recall_status = 'recalled' OR drug_recall_event exists
   * 2. CAUTION  — fda_approval_status is not 'approved' OR expiry date has passed
   * 3. SAFE     — fda_approval_status = 'approved' AND not expired AND no recall
   */
  private String deriveDrugStatus(Map<String, Object> row) {
    if (hasActiveRecall(row)) return "recalled";
    boolean expired = Boolean.TRUE.equals(row.get("isExpired"));
    String fda = String.valueOf(row.get("fdaApprovalStatus"));
    if (expired || "banned".equals(fda) || "restricted".equals(fda)
        || "under_review".equals(fda) || "not_approved".equals(fda)) {
      return "caution";
    }
    return "safe";
  }

  private boolean hasActiveRecall(Map<String, Object> row) {
    String recallStatus = String.valueOf(row.get("recallStatus"));
    return "recalled".equals(recallStatus) || Boolean.TRUE.equals(row.get("hasActiveRecall"));
  }

  // ── Result builders ────────────────────────────────────────────────────────

  private Map<String, Object> buildFoodResult(Map<String, Object> row) {
    String status = deriveFoodStatus(row);
    boolean expired = Boolean.TRUE.equals(row.get("isExpired"));

    String title = switch (status) {
      case "recalled" -> "Product Recalled";
      case "caution"  -> expired ? "Product Expired" : "Use With Caution";
      default         -> "Product Verified";
    };

    String summary = switch (status) {
      case "recalled" -> "This product has been recalled. Do not consume it.";
      case "caution"  -> expired
          ? "This product has passed its expiry date and may no longer be safe."
          : "This product has a safety concern. Review the details carefully before use.";
      default -> "This product has been verified. No recalls or safety issues were found for this batch.";
    };

    String recommendedAction = switch (status) {
      case "recalled" -> "Stop using this product immediately. Return it to the seller or report it to FDA Ghana.";
      case "caution"  -> expired
          ? "Do not consume an expired product. Dispose of it safely and notify FDA Ghana if concerned."
          : "Exercise caution. Do not use if the product is banned or restricted. Contact FDA Ghana for guidance.";
      default -> "Safe to use. Keep the packaging and QR code for future reference.";
    };

    // Speech-optimised sentence spoken automatically on the result screen
    String audioSummary = switch (status) {
      case "recalled" -> "Warning. This product has been recalled. Do not consume it. "
          + "Return it to the seller or report it to FDA Ghana immediately.";
      case "caution"  -> expired
          ? "Caution. This product has passed its expiry date and may no longer be safe. Do not consume it."
          : "Caution. This product has a safety concern. Check the details on screen and contact FDA Ghana if needed.";
      default -> "Good news. This product is verified and safe. No recalls or safety issues were found for this batch.";
    };

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("codeString",       row.get("codeString"));
    result.put("status",           status);
    result.put("statusLabel",      statusLabel(status));
    result.put("title",            title);
    result.put("summary",          summary);
    result.put("audioSummary",     audioSummary);
    result.put("recommendedAction", recommendedAction);
    result.put("productName",      row.get("productName"));
    result.put("farmOrigin",       row.get("farmOrigin"));
    result.put("batchNumber",      row.get("batchNumber"));
    result.put("manufacturerName", row.get("companyName"));
    result.put("packagingDate",    row.get("packagingDate"));
    result.put("expiryDate",       row.get("expiryDate"));
    result.put("recallStatus",     row.get("recallStatus"));
    result.put("qrStatus",         row.get("qrStatus"));
    result.put("scanCount",        row.get("scanCount"));
    result.put("reason",           row.get("recallReason"));
    return result;
  }

  private Map<String, Object> buildDrugResult(Map<String, Object> row) {
    String status = deriveDrugStatus(row);
    boolean expired = Boolean.TRUE.equals(row.get("isExpired"));
    String fda = String.valueOf(row.get("fdaApprovalStatus"));
    String fdaLabel = fda.replace("_", " ");

    String title = switch (status) {
      case "recalled" -> "Medicine Recalled";
      case "caution"  -> expired ? "Medicine Expired" : "Medicine Safety Warning";
      default         -> "Medicine Verified";
    };

    String summary = switch (status) {
      case "recalled" -> "This medicine has been recalled. Do not use it.";
      case "caution"  -> expired
          ? "This medicine has passed its expiry date. Do not use it."
          : "This medicine's approval status is \"" + fdaLabel + "\". It may not be safe for use.";
      default -> "This medicine has been verified by FoodTrace GH. No recalls or approval issues were found.";
    };

    String recommendedAction = switch (status) {
      case "recalled" -> "Do not use this medicine. Return it to the pharmacy or report it to the Ghana Pharmacy Council.";
      case "caution"  -> expired
          ? "Dispose of this expired medicine safely. Do not dispense it. Contact your pharmacist."
          : "Do not dispense or use a " + fdaLabel + " medicine. Report to the Ghana Pharmacy Council.";
      default -> "Safe to use as prescribed. Keep the packaging and QR code for traceability records.";
    };

    String audioSummary = switch (status) {
      case "recalled" -> "Warning. This medicine has been recalled. Do not use it. "
          + "Return it to the pharmacy or report it to the Ghana Pharmacy Council immediately.";
      case "caution"  -> expired
          ? "Caution. This medicine has passed its expiry date. Do not use it. Dispose of it safely."
          : "Caution. This medicine's approval status is " + fdaLabel + ". "
              + "Do not use it without consulting a pharmacist or the Ghana Pharmacy Council.";
      default -> "Good news. This medicine is verified and approved. No recalls or safety issues were found.";
    };

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("codeString",        row.get("codeString"));
    result.put("status",            status);
    result.put("statusLabel",       statusLabel(status));
    result.put("title",             title);
    result.put("summary",           summary);
    result.put("audioSummary",      audioSummary);
    result.put("recommendedAction", recommendedAction);
    result.put("drugName",          row.get("productName"));
    result.put("genericName",       row.get("genericName"));
    result.put("batchNumber",       row.get("batchNumber"));
    result.put("manufacturerName",  row.get("pharmacyName"));
    result.put("pharmacyName",      row.get("pharmacyName"));
    result.put("expiryDate",        row.get("expiryDate"));
    result.put("fdaApprovalStatus", fda);
    result.put("recallStatus",      row.get("recallStatus"));
    result.put("qrStatus",          row.get("qrStatus"));
    result.put("scanCount",         row.get("scanCount"));
    return result;
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  private String statusLabel(String status) {
    return switch (status) {
      case "safe"     -> "GREEN";
      case "caution"  -> "YELLOW";
      case "recalled" -> "RED";
      default         -> "NOT_FOUND";
    };
  }

  private Map<String, Object> notFound(String code) {
    return Map.of(
        "codeString",        code,
        "status",            "not_found",
        "statusLabel",       "NOT_FOUND",
        "title",             "No match found",
        "summary",           "We could not find a product registered for this QR or batch code.",
        "audioSummary",      "No matching product was found for this code. Please check the label and try again.",
        "recommendedAction", "Check the code and try again. If the problem persists, contact the seller.");
  }

  private String normalize(String codeString) {
    return codeString.trim().toUpperCase();
  }
}
