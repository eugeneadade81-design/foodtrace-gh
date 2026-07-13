package com.foodtrace.api.service;

import com.foodtrace.api.security.CurrentUser;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * In-app notifications. Other services call {@link #notify} / {@link #notifyRegulators}
 * when something happens (post approved, new comment, recall, pending review);
 * the mobile bell reads them via the controller.
 */
@Service
public class NotificationService {
  private final JdbcClient jdbc;
  private final PushNotificationService pushNotificationService;

  public NotificationService(JdbcClient jdbc, PushNotificationService pushNotificationService) {
    this.jdbc = jdbc;
    this.pushNotificationService = pushNotificationService;
  }

  public void notify(String userId, String type, String title, String body, String postId) {
    if (userId == null) return;
    jdbc.sql("""
        INSERT INTO notifications (user_id, type, title, body, post_id)
        VALUES (CAST(:u AS uuid), :t, :ti, :b, CAST(:p AS uuid))
        """)
        .param("u", userId)
        .param("t", type)
        .param("ti", title)
        .param("b", body == null ? "" : body)
        .param("p", postId)
        .update();
    pushNotificationService.sendToUser(userId, title, body == null ? "" : body);
  }

  /** Notifies every user who previously scanned this batch that it's now recalled. */
  public void notifyScannersOfRecall(String batchId, String productName) {
    List<String> scannerIds = jdbc.sql("""
        SELECT DISTINCT cs.user_id
        FROM consumer_scans cs
        JOIN qr_codes q ON q.id = cs.qr_code_id
        WHERE q.batch_id = CAST(:batchId AS uuid) AND cs.user_id IS NOT NULL
        """)
        .param("batchId", batchId)
        .query(String.class)
        .list();
    for (String userId : scannerIds) {
      notify(userId, "recall", "Product you scanned was recalled",
          productName + " has just been recalled. Do not consume it — check the app for details.", null);
    }
  }

  /** Notifies every user who previously scanned this drug batch that it's now recalled. */
  public void notifyDrugScannersOfRecall(String drugBatchId, String drugName) {
    List<String> scannerIds = jdbc.sql("""
        SELECT DISTINCT dcs.user_id
        FROM drug_consumer_scans dcs
        JOIN drug_qr_codes q ON q.id = dcs.drug_qr_code_id
        WHERE q.drug_batch_id = CAST(:batchId AS uuid) AND dcs.user_id IS NOT NULL
        """)
        .param("batchId", drugBatchId)
        .query(String.class)
        .list();
    for (String userId : scannerIds) {
      notify(userId, "recall", "Medicine you scanned was recalled",
          drugName + " has just been recalled. Do not use it — check the app for details.", null);
    }
  }

  public void notifyRegulators(String type, String title, String body, String postId) {
    List<String> regulators = jdbc.sql("SELECT id FROM users WHERE role = 'regulator' AND is_active = true")
        .query(String.class).list();
    for (String r : regulators) notify(r, type, title, body, postId);
  }

  public Map<String, Object> list(CurrentUser user) {
    List<Map<String, Object>> items = jdbc.sql("""
        SELECT id, type, title, body, post_id, is_read, created_at
        FROM notifications
        WHERE user_id = CAST(:u AS uuid)
        ORDER BY created_at DESC
        LIMIT 50
        """)
        .param("u", user.id())
        .query(DatabaseRowMapper::toMap)
        .list();
    long unread = jdbc.sql("SELECT COUNT(*) FROM notifications WHERE user_id = CAST(:u AS uuid) AND is_read = false")
        .param("u", user.id())
        .query(Long.class).single();
    return Map.of("notifications", items, "unread", unread);
  }

  public Map<String, Object> markAllRead(CurrentUser user) {
    jdbc.sql("UPDATE notifications SET is_read = true WHERE user_id = CAST(:u AS uuid) AND is_read = false")
        .param("u", user.id())
        .update();
    return Map.of("ok", true);
  }
}
