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

  public Map<String, Object> scanFood(String codeString) {
    String code = normalize(codeString);
    return jdbc.sql("""
        SELECT
          q.id AS qr_id,
          q.code_string,
          q.status AS qr_status,
          q.scan_count,
          pb.id AS batch_id,
          pb.batch_number,
          pb.product_name,
          pb.farm_origin,
          pb.packaging_date,
          pb.expiry_date,
          pb.recall_status,
          pb.recall_reason,
          m.company_name
        FROM qr_codes q
        JOIN product_batches pb ON pb.id = q.batch_id
        JOIN manufacturers m ON m.id = pb.manufacturer_id
        WHERE q.code_string = :code
        LIMIT 1
        """)
        .param("code", code)
        .query(DatabaseRowMapper::toMap)
        .optional()
        .map(row -> {
          jdbc.sql("UPDATE qr_codes SET scan_count = scan_count + 1 WHERE id = :id").param("id", row.get("qrId")).update();
          return buildFoodResult(row);
        })
        .orElseGet(() -> notFound(code));
  }

  public Map<String, Object> scanDrug(String codeString) {
    String code = normalize(codeString);
    return jdbc.sql("""
        SELECT
          q.id AS qr_id,
          q.code_string,
          q.status AS qr_status,
          q.scan_count,
          db.batch_number,
          db.expiry_date,
          db.recall_status,
          d.name AS product_name,
          d.generic_name,
          p.business_name AS pharmacy_name
        FROM drug_qr_codes q
        JOIN drug_batches db ON db.id = q.drug_batch_id
        JOIN drugs d ON d.id = db.drug_id
        JOIN pharmacies p ON p.id = db.pharmacy_id
        WHERE q.code_string = :code
        LIMIT 1
        """)
        .param("code", code)
        .query(DatabaseRowMapper::toMap)
        .optional()
        .map(row -> {
          jdbc.sql("UPDATE drug_qr_codes SET scan_count = scan_count + 1 WHERE id = :id").param("id", row.get("qrId")).update();
          return buildDrugResult(row);
        })
        .orElseGet(() -> notFound(code));
  }

  public Map<String, Object> submitReport(String codeString, String reporterId, Map<String, Object> body) {
    String description = String.valueOf(body.getOrDefault("description", "")).trim();
    if (description.length() < 10) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description must be at least 10 characters");
    }
    Object qrId = jdbc.sql("SELECT id FROM qr_codes WHERE code_string = :code LIMIT 1")
        .param("code", normalize(codeString))
        .query()
        .optionalValue()
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

  private Map<String, Object> buildFoodResult(Map<String, Object> row) {
    String status = deriveStatus(row);
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("codeString", row.get("codeString"));
    result.put("status", status);
    result.put("statusLabel", status.equals("safe") ? "GREEN" : status.equals("recalled") ? "RED" : "YELLOW");
    result.put("title", status.equals("recalled") ? "Recalled product" : "Verified product");
    result.put("summary", status.equals("recalled") ? "This product is flagged for recall. Do not consume it." : "No recall flag or major issue found for this batch.");
    result.put("productName", row.get("productName"));
    result.put("farmOrigin", row.get("farmOrigin"));
    result.put("batchNumber", row.get("batchNumber"));
    result.put("manufacturerName", row.get("companyName"));
    result.put("packagingDate", row.get("packagingDate"));
    result.put("expiryDate", row.get("expiryDate"));
    result.put("recallStatus", row.get("recallStatus"));
    result.put("qrStatus", row.get("qrStatus"));
    result.put("scanCount", row.get("scanCount"));
    result.put("reason", row.get("recallReason"));
    result.put("recommendedAction", status.equals("recalled") ? "Do not consume. Return to seller or report to FDA." : "Proceed normally and keep the label for reference.");
    return result;
  }

  private Map<String, Object> buildDrugResult(Map<String, Object> row) {
    Map<String, Object> result = buildFoodResult(row);
    result.put("title", "Verified medicine");
    result.put("pharmacyName", row.get("pharmacyName"));
    result.put("genericName", row.get("genericName"));
    return result;
  }

  private String deriveStatus(Map<String, Object> row) {
    String qr = String.valueOf(row.get("qrStatus"));
    String recall = String.valueOf(row.get("recallStatus"));
    if ("invalidated".equals(qr) || "recalled".equals(qr) || "recalled".equals(recall)) {
      return "recalled";
    }
    if ("under_investigation".equals(qr) || "under_investigation".equals(recall)) {
      return "caution";
    }
    return "safe";
  }

  private Map<String, Object> notFound(String code) {
    return Map.of(
        "codeString", code,
        "status", "not_found",
        "title", "No match found",
        "summary", "We could not find a product for this QR or batch code.",
        "recommendedAction", "Check the code and try again.");
  }

  private String normalize(String codeString) {
    return codeString.trim().toUpperCase();
  }
}
