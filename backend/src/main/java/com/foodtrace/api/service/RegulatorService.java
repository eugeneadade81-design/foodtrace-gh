package com.foodtrace.api.service;

import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.storage.StorageService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RegulatorService {
  private static final Logger log = LoggerFactory.getLogger(RegulatorService.class);
  private final JdbcClient jdbc;
  private final RecallSmsNotifier recallSmsNotifier;
  private final StorageService storageService;
  private final NotificationService notifications;

  public RegulatorService(JdbcClient jdbc, RecallSmsNotifier recallSmsNotifier, StorageService storageService, NotificationService notifications) {
    this.jdbc = jdbc;
    this.recallSmsNotifier = recallSmsNotifier;
    this.storageService = storageService;
    this.notifications = notifications;
  }

  public Map<String, Object> dashboard() {
    long farms = count("SELECT COUNT(*) FROM farms");
    long manufacturers = count("SELECT COUNT(*) FROM manufacturers");
    long pharmacies = count("SELECT COUNT(*) FROM pharmacies");
    long foodRecalls = count("SELECT COUNT(*) FROM recall_events");
    long drugRecalls = count("SELECT COUNT(*) FROM drug_recall_events");
    long pendingReports = count("SELECT COUNT(*) FROM consumer_reports WHERE status = 'pending'");
    long reviewingReports = count("SELECT COUNT(*) FROM consumer_reports WHERE status = 'reviewing'");
    long resolvedReports = count("SELECT COUNT(*) FROM consumer_reports WHERE status = 'resolved'");
    long foodScans = jdbc.sql("SELECT COALESCE(SUM(scan_count), 0) FROM qr_codes").query(Long.class).single();
    long drugScans = jdbc.sql("SELECT COALESCE(SUM(scan_count), 0) FROM drug_qr_codes").query(Long.class).single();
    long totalScans = foodScans + drugScans;
    long safeScans = jdbc.sql("SELECT COALESCE(SUM(scan_count), 0) FROM qr_codes WHERE status = 'active'").query(Long.class).single();
    long recalledScans = jdbc.sql("SELECT COALESCE(SUM(scan_count), 0) FROM qr_codes WHERE status = 'recalled'").query(Long.class).single();
    long highRiskAlerts = count("SELECT COUNT(*) FROM product_batches WHERE recall_status = 'recalled'");

    List<Map<String, Object>> reports = jdbc.sql("""
        SELECT cr.id, cr.description, cr.district, cr.status, cr.created_at,
               u.full_name AS reporter_name
        FROM consumer_reports cr
        JOIN users u ON u.id = cr.reporter_id
        ORDER BY cr.created_at DESC LIMIT 20
        """).query(DatabaseRowMapper::toMap).list();

    List<Map<String, Object>> recalls = jdbc.sql("""
        SELECT re.id, re.reason, re.recall_type, re.created_at,
               pb.batch_number, pb.product_name, pb.id AS batch_id
        FROM recall_events re
        JOIN product_batches pb ON pb.id = re.batch_id
        ORDER BY re.created_at DESC LIMIT 20
        """).query(DatabaseRowMapper::toMap).list();

    List<Map<String, Object>> alerts = jdbc.sql("""
        SELECT pb.id, pb.batch_number AS title, pb.recall_reason AS description,
               'manufacturer' AS source
        FROM product_batches pb
        WHERE pb.recall_status = 'recalled'
        UNION ALL
        SELECT db.id, db.batch_number AS title, dre.reason AS description,
               'pharmacy' AS source
        FROM drug_batches db
        JOIN drug_recall_events dre ON dre.drug_batch_id = db.id
        ORDER BY 1 DESC LIMIT 10
        """).query(DatabaseRowMapper::toMap).list();

    List<String> topDistricts = jdbc.sql("""
        SELECT district FROM consumer_reports
        WHERE district IS NOT NULL
        GROUP BY district ORDER BY COUNT(*) DESC LIMIT 5
        """).query(String.class).list();

    Map<String, Object> compliance = new LinkedHashMap<>();
    compliance.put("farms", farms);
    compliance.put("manufacturers", manufacturers);
    compliance.put("pharmacies", pharmacies);
    compliance.put("foodRecalls", foodRecalls);
    compliance.put("drugRecalls", drugRecalls);
    compliance.put("pendingReports", pendingReports);
    compliance.put("reviewingReports", reviewingReports);
    compliance.put("resolvedReports", resolvedReports);
    compliance.put("safeScans", safeScans);
    compliance.put("cautionScans", 0);
    compliance.put("recalledScans", recalledScans);

    Map<String, Object> analytics = new LinkedHashMap<>();
    analytics.put("totalScans", totalScans);
    analytics.put("foodScans", foodScans);
    analytics.put("drugScans", drugScans);
    analytics.put("highRiskAlerts", highRiskAlerts);
    analytics.put("topDistricts", topDistricts);
    analytics.put("activeRecallCount", highRiskAlerts);

    Map<String, Object> dashboard = new LinkedHashMap<>();
    dashboard.put("compliance", compliance);
    dashboard.put("analytics", analytics);
    dashboard.put("reports", reports);
    dashboard.put("recalls", recalls);
    dashboard.put("alerts", alerts);
    return Map.of("dashboard", dashboard);
  }

  private static final List<String> REPORT_STATUSES = List.of("pending", "reviewing", "resolved", "dismissed");

  public Map<String, Object> reviewReport(Map<String, Object> body) {
    String reportId = blankToNull(body.get("reportId"));
    String status = blankToNull(body.get("status"));
    if (reportId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a report to review first.");
    }
    if (status == null || !REPORT_STATUSES.contains(status.toLowerCase())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be reviewing, resolved, or dismissed.");
    }
    UUID id;
    try {
      id = UUID.fromString(reportId);
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That report id is not valid.");
    }
    int updated = jdbc.sql("""
        UPDATE consumer_reports SET status = CAST(:status AS report_status)
        WHERE id = :reportId
        """)
        .param("reportId", id)
        .param("status", status.toLowerCase())
        .update();
    if (updated == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found");
    return Map.of("updated", true);
  }

  private static String blankToNull(Object value) {
    if (value == null) return null;
    String s = String.valueOf(value).trim();
    return s.isEmpty() || "null".equalsIgnoreCase(s) ? null : s;
  }

  public Map<String, Object> createRecall(CurrentUser user, Map<String, Object> body) {
    String domain = String.valueOf(body.getOrDefault("domain", "food"));
    String batchId = String.valueOf(body.get("batchId"));
    String reason = String.valueOf(body.getOrDefault("reason", "Regulator recall"));

    if ("drug".equals(domain)) {
      jdbc.sql("UPDATE drug_batches SET recall_status = 'recalled' WHERE id = :id")
          .param("id", UUID.fromString(batchId)).update();
      jdbc.sql("UPDATE drug_qr_codes SET status = 'recalled' WHERE drug_batch_id = :id")
          .param("id", UUID.fromString(batchId)).update();
      Map<String, Object> recall = jdbc.sql("""
          INSERT INTO drug_recall_events (drug_batch_id, issued_by, reason)
          VALUES (:batchId, :issuedBy, :reason)
          RETURNING id, drug_batch_id, reason, created_at
          """)
          .param("batchId", UUID.fromString(batchId))
          .param("issuedBy", user.id())
          .param("reason", reason)
          .query(DatabaseRowMapper::toMap).single();
      recallSmsNotifier.notifyDrugRecall(UUID.fromString(batchId), reason);
      String drugName = jdbc.sql("""
          SELECT d.name FROM drug_batches db JOIN drugs d ON d.id = db.drug_id WHERE db.id = :id
          """)
          .param("id", UUID.fromString(batchId))
          .query(String.class).optional().orElse("A medicine");
      notifications.notifyDrugScannersOfRecall(batchId, drugName);
      return Map.of("recall", recall);
    }

    jdbc.sql("UPDATE product_batches SET recall_status = 'recalled', recall_reason = :reason, recalled_at = now() WHERE id = :id")
        .param("id", UUID.fromString(batchId))
        .param("reason", reason).update();
    jdbc.sql("UPDATE qr_codes SET status = 'recalled' WHERE batch_id = :id")
        .param("id", UUID.fromString(batchId)).update();

    @SuppressWarnings("unchecked")
    String[] districts = body.get("scopeDistricts") instanceof List<?> l
        ? l.stream().map(String::valueOf).toArray(String[]::new) : new String[0];

    Map<String, Object> recall = jdbc.sql("""
        INSERT INTO recall_events (batch_id, issued_by, recall_type, reason, scope_districts)
        VALUES (:batchId, :issuedBy, 'regulator', :reason, CAST(:districts AS text[]))
        RETURNING id, batch_id, recall_type, reason, created_at
        """)
        .param("batchId", UUID.fromString(batchId))
        .param("issuedBy", user.id())
        .param("reason", reason)
        .param("districts", districts)
        .query(DatabaseRowMapper::toMap).single();
    recallSmsNotifier.notifyFoodRecall(UUID.fromString(batchId), reason);
    String productName = jdbc.sql("SELECT COALESCE(product_name, batch_number) FROM product_batches WHERE id = :batchId")
        .param("batchId", UUID.fromString(batchId)).query(String.class).single();
    notifications.notifyScannersOfRecall(batchId, productName);
    return Map.of("recall", recall);
  }

  public Map<String, Object> addRecallEvidence(String recallId, MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An evidence file is required");
    }
    String url;
    try {
      url = storageService.store(file.getBytes(), file.getOriginalFilename() != null ? file.getOriginalFilename() : "evidence",
          file.getContentType() != null ? file.getContentType() : "application/octet-stream");
    } catch (Exception e) {
      log.error("Failed to store recall evidence for recall {}", recallId, e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store the evidence file");
    }

    Map<String, Object> recall = jdbc.sql("""
        UPDATE recall_events SET evidence_urls = array_append(evidence_urls, :url)
        WHERE id = :id
        RETURNING id, batch_id, evidence_urls
        """)
        .param("id", UUID.fromString(recallId))
        .param("url", url)
        .query(DatabaseRowMapper::toMap).optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recall not found"));
    return Map.of("recall", recall);
  }

  private long count(String sql) {
    return jdbc.sql(sql).query(Long.class).single();
  }
}
