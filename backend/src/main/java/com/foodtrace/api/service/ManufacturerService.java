package com.foodtrace.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodtrace.api.security.CurrentUser;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ManufacturerService {
  private final JdbcClient jdbc;
  private final QrCodeService qrCodeService;
  private final ObjectMapper json = new ObjectMapper();

  public ManufacturerService(JdbcClient jdbc, QrCodeService qrCodeService) {
    this.jdbc = jdbc;
    this.qrCodeService = qrCodeService;
  }

  public Map<String, Object> dashboard(CurrentUser user) {
    Map<String, Object> profile = jdbc.sql("""
        SELECT id, company_name, fda_registration_number, sector, subscription_tier, is_verified
        FROM manufacturers WHERE user_id = :userId LIMIT 1
        """)
        .param("userId", user.id())
        .query(DatabaseRowMapper::toMap)
        .optional().orElse(null);

    String manufacturerId = profile != null ? String.valueOf(profile.get("id")) : null;

    List<Map<String, Object>> batches = manufacturerId == null ? List.of() : jdbc.sql("""
        SELECT pb.id, pb.batch_number, pb.product_name, pb.farm_origin, pb.packaging_date,
               pb.expiry_date, pb.recall_status,
               (SELECT q.code_string FROM qr_codes q WHERE q.batch_id = pb.id LIMIT 1) AS qr_code
        FROM product_batches pb
        WHERE pb.manufacturer_id = :mid
        ORDER BY pb.created_at DESC
        """)
        .param("mid", UUID.fromString(manufacturerId))
        .query(DatabaseRowMapper::toMap).list();

    List<Map<String, Object>> recalls = manufacturerId == null ? List.of() : jdbc.sql("""
        SELECT re.id, re.reason, re.recall_type, re.created_at,
               pb.batch_number, pb.product_name
        FROM recall_events re
        JOIN product_batches pb ON pb.id = re.batch_id
        WHERE pb.manufacturer_id = :mid
        ORDER BY re.created_at DESC
        """)
        .param("mid", UUID.fromString(manufacturerId))
        .query(DatabaseRowMapper::toMap).list();

    long qrCount = manufacturerId == null ? 0 : jdbc.sql("""
        SELECT COUNT(q.id) FROM qr_codes q
        JOIN product_batches pb ON pb.id = q.batch_id
        WHERE pb.manufacturer_id = :mid
        """)
        .param("mid", UUID.fromString(manufacturerId))
        .query(Long.class).single();

    long activeRecalls = recalls.stream()
        .filter(r -> {
          Object s = r.get("recallStatus");
          return s == null || "active".equals(String.valueOf(s));
        }).count();

    Map<String, Object> metrics = Map.of(
        "batches", batches.size(),
        "qrCodes", qrCount,
        "recalls", recalls.size(),
        "activeRecalls", activeRecalls);

    Map<String, Object> dashboard = new LinkedHashMap<>();
    dashboard.put("profile", profile);
    dashboard.put("batches", batches);
    dashboard.put("recalls", recalls);
    dashboard.put("metrics", metrics);
    return Map.of("dashboard", dashboard);
  }

  public Map<String, Object> createProfile(CurrentUser user, Map<String, Object> body) {
    Validate.require(body, "companyName");
    boolean exists = jdbc.sql("SELECT 1 FROM manufacturers WHERE user_id = :uid")
        .param("uid", user.id()).query(Integer.class).optional().isPresent();
    if (exists) throw new ResponseStatusException(HttpStatus.CONFLICT, "Manufacturer profile already exists");

    String tier = String.valueOf(body.getOrDefault("subscriptionTier", "micro"));
    Map<String, Object> profile = jdbc.sql("""
        INSERT INTO manufacturers (user_id, company_name, fda_registration_number, sector, subscription_tier)
        VALUES (:uid, :companyName, :fdaReg, :sector, CAST(:tier AS subscription_tier))
        RETURNING id, company_name, fda_registration_number, sector, subscription_tier, is_verified
        """)
        .param("uid", user.id())
        .param("companyName", body.get("companyName"))
        .param("fdaReg", body.get("fdaRegistrationNumber"))
        .param("sector", body.get("sector"))
        .param("tier", tier)
        .query(DatabaseRowMapper::toMap).single();
    return Map.of("profile", profile);
  }

  public Map<String, Object> createBatch(CurrentUser user, Map<String, Object> body) {
    Validate.require(body, "batchNumber", "packagingDate", "expiryDate");
    UUID manufacturerId = jdbc.sql("SELECT id FROM manufacturers WHERE user_id = :uid LIMIT 1")
        .param("uid", user.id()).query(UUID.class).optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Create a manufacturer profile first"));

    String batchNumber = String.valueOf(body.get("batchNumber"));
    Map<String, Object> batch = jdbc.sql("""
        INSERT INTO product_batches
          (manufacturer_id, batch_number, product_name, farm_origin,
           ingredient_sources, processing_steps, quality_checks, packaging_date, expiry_date, image_url)
        VALUES (:mid, :batchNumber, :productName, :farmOrigin,
                CAST(:ingredientSources AS jsonb), CAST(:processingSteps AS jsonb),
                CAST(:qualityChecks AS jsonb), CAST(:packagingDate AS date), CAST(:expiryDate AS date), :imageUrl)
        RETURNING id, batch_number, product_name, farm_origin, packaging_date, expiry_date, recall_status, image_url
        """)
        .param("mid", manufacturerId)
        .param("batchNumber", batchNumber)
        .param("productName", body.get("productName"))
        .param("farmOrigin", body.get("farmOrigin"))
        .param("ingredientSources", toJson(body.get("ingredientSources")))
        .param("processingSteps", toJson(body.get("processingSteps")))
        .param("qualityChecks", toJson(body.get("qualityChecks")))
        .param("packagingDate", body.get("packagingDate"))
        .param("expiryDate", body.get("expiryDate"))
        .param("imageUrl", body.get("imageUrl"))
        .query(DatabaseRowMapper::toMap).single();

    UUID batchId = UUID.fromString(String.valueOf(batch.get("id")));
    String codeString = "FT-" + batchNumber.toUpperCase().replaceAll("[^A-Z0-9]", "") + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    String qrUrl = qrCodeService.generateAndSave(codeString);

    Map<String, Object> qr = jdbc.sql("""
        INSERT INTO qr_codes (batch_id, code_string, s3_url)
        VALUES (:batchId, :codeString, :url)
        RETURNING id, code_string, s3_url, status, scan_count
        """)
        .param("batchId", batchId)
        .param("codeString", codeString)
        .param("url", qrUrl)
        .query(DatabaseRowMapper::toMap).single();

    Map<String, Object> qrCode = new LinkedHashMap<>();
    qrCode.put("id", qr.get("id"));
    qrCode.put("codeString", qr.get("codeString"));
    qrCode.put("url", qr.get("s3Url"));
    qrCode.put("status", qr.get("status"));

    return Map.of("batch", batch, "qrCode", qrCode);
  }

  public Map<String, Object> createRecall(CurrentUser user, Map<String, Object> body) {
    String batchId = String.valueOf(body.get("batchId"));
    String reason = String.valueOf(body.getOrDefault("reason", "Manufacturer recall"));

    jdbc.sql("""
        UPDATE product_batches SET recall_status = 'recalled', recall_reason = :reason, recalled_at = now()
        WHERE id = :batchId
        AND manufacturer_id = (SELECT id FROM manufacturers WHERE user_id = :uid LIMIT 1)
        """)
        .param("batchId", UUID.fromString(batchId))
        .param("reason", reason)
        .param("uid", user.id())
        .update();

    Map<String, Object> recall = jdbc.sql("""
        INSERT INTO recall_events (batch_id, issued_by, recall_type, reason, scope_districts)
        VALUES (:batchId, :issuedBy, :recallType, :reason, CAST(:districts AS text[]))
        RETURNING id, batch_id, recall_type, reason, created_at
        """)
        .param("batchId", UUID.fromString(batchId))
        .param("issuedBy", user.id())
        .param("recallType", body.getOrDefault("recallType", "manufacturer"))
        .param("reason", reason)
        .param("districts", toDistrictsArray(body.get("scopeDistricts")))
        .query(DatabaseRowMapper::toMap).single();

    jdbc.sql("UPDATE qr_codes SET status = 'recalled' WHERE batch_id = :batchId")
        .param("batchId", UUID.fromString(batchId)).update();

    return Map.of("recall", recall);
  }

  private String toJson(Object value) {
    try {
      return json.writeValueAsString(value != null ? value : List.of());
    } catch (Exception e) {
      return "[]";
    }
  }

  @SuppressWarnings("unchecked")
  private String[] toDistrictsArray(Object value) {
    if (value instanceof List<?> list) return list.stream().map(String::valueOf).toArray(String[]::new);
    return new String[0];
  }
}
