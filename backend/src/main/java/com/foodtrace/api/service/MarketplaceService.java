package com.foodtrace.api.service;

import com.foodtrace.api.security.CurrentUser;
import java.lang.reflect.Array;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MarketplaceService {
  private final JdbcClient jdbc;

  public MarketplaceService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, Object> feed(CurrentUser user, String domain, String query, int limit) {
    String domainFilter = normalizeDomain(domain);
    int safeLimit = Math.max(1, Math.min(limit, 50));
    String search = query == null || query.isBlank() ? null : "%" + query.trim().toLowerCase(Locale.ROOT) + "%";

    List<Map<String, Object>> posts = jdbc.sql("""
        SELECT mp.id, mp.domain, mp.title, mp.caption, mp.location, mp.image_url, mp.price_text,
               mp.hashtags, mp.qr_code_string, mp.safety_status, mp.safety_label, mp.safety_source,
               mp.status, mp.regulator_note, mp.created_at,
               u.full_name AS seller_name, u.role AS seller_role,
               COUNT(DISTINCT l.user_id) AS like_count,
               COUNT(DISTINCT c.id) AS comment_count,
               EXISTS (SELECT 1 FROM marketplace_post_likes ml WHERE ml.post_id = mp.id AND ml.user_id = CAST(:viewerId AS uuid)) AS liked_by_viewer,
               EXISTS (SELECT 1 FROM marketplace_post_saves ms WHERE ms.post_id = mp.id AND ms.user_id = CAST(:viewerId AS uuid)) AS saved_by_viewer
        FROM marketplace_posts mp
        JOIN users u ON u.id = mp.seller_id
        LEFT JOIN marketplace_post_likes l ON l.post_id = mp.id
        LEFT JOIN marketplace_post_comments c ON c.post_id = mp.id
        WHERE mp.status <> 'hidden'
          AND (:domain IS NULL OR mp.domain = CAST(:domain AS marketplace_post_domain))
          AND (:search IS NULL OR lower(mp.title) LIKE :search OR lower(mp.caption) LIKE :search OR lower(u.full_name) LIKE :search)
        GROUP BY mp.id, u.full_name, u.role
        ORDER BY mp.created_at DESC
        LIMIT :limit
        """)
        .param("viewerId", user.id())
        .param("domain", domainFilter)
        .param("search", search)
        .param("limit", safeLimit)
        .query(DatabaseRowMapper::toMap)
        .list();

    return Map.of("posts", posts, "count", posts.size());
  }

  public Map<String, Object> createPost(CurrentUser user, Map<String, Object> body) {
    requireSeller(user);
    Validate.require(body, "title", "domain");

    String domain = normalizeDomain(String.valueOf(body.get("domain")));
    if (domain == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "domain must be food, drug, or farm");

    SafetySnapshot safety = resolveSafety(domain, body);
    Map<String, Object> post = jdbc.sql("""
        INSERT INTO marketplace_posts
          (seller_id, seller_role, domain, title, caption, location, image_url, price_text,
           hashtags, qr_code_string, product_batch_id, drug_batch_id, farm_id,
           safety_status, safety_label, safety_source)
        VALUES
          (CAST(:sellerId AS uuid), CAST(:sellerRole AS user_role), CAST(:domain AS marketplace_post_domain),
           :title, :caption, :location, :imageUrl, :priceText, CAST(:hashtags AS text[]),
           :qrCodeString, CAST(:productBatchId AS uuid), CAST(:drugBatchId AS uuid), CAST(:farmId AS uuid),
           :safetyStatus, :safetyLabel, :safetySource)
        RETURNING id, domain, title, caption, location, image_url, price_text, hashtags,
                  qr_code_string, safety_status, safety_label, safety_source, status, created_at
        """)
        .param("sellerId", user.id())
        .param("sellerRole", user.role())
        .param("domain", domain)
        .param("title", body.get("title"))
        .param("caption", String.valueOf(body.getOrDefault("caption", "")))
        .param("location", body.get("location"))
        .param("imageUrl", body.get("imageUrl"))
        .param("priceText", body.get("priceText"))
        .param("hashtags", stringArray(body.get("hashtags")))
        .param("qrCodeString", safety.qrCodeString())
        .param("productBatchId", safety.productBatchId())
        .param("drugBatchId", safety.drugBatchId())
        .param("farmId", safety.farmId())
        .param("safetyStatus", safety.status())
        .param("safetyLabel", safety.label())
        .param("safetySource", safety.source())
        .query(DatabaseRowMapper::toMap)
        .single();

    return Map.of("post", post);
  }

  public Map<String, Object> flagPost(CurrentUser user, String postId, Map<String, Object> body) {
    if (!"regulator".equals(user.role())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only regulators can flag marketplace posts");
    }
    Map<String, Object> post = jdbc.sql("""
        UPDATE marketplace_posts
        SET status = 'flagged', regulator_note = :note, updated_at = now()
        WHERE id = CAST(:postId AS uuid)
        RETURNING id, status, regulator_note
        """)
        .param("postId", postId)
        .param("note", String.valueOf(body.getOrDefault("note", "Flagged for review")))
        .query(DatabaseRowMapper::toMap)
        .optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
    return Map.of("post", post);
  }

  public Map<String, Object> toggleLike(CurrentUser user, String postId) {
    ensurePostExists(postId);
    boolean liked = jdbc.sql("SELECT 1 FROM marketplace_post_likes WHERE post_id = CAST(:p AS uuid) AND user_id = CAST(:u AS uuid)")
        .param("p", postId).param("u", user.id()).query(Integer.class).optional().isPresent();
    if (liked) {
      jdbc.sql("DELETE FROM marketplace_post_likes WHERE post_id = CAST(:p AS uuid) AND user_id = CAST(:u AS uuid)")
          .param("p", postId).param("u", user.id()).update();
    } else {
      jdbc.sql("INSERT INTO marketplace_post_likes (post_id, user_id) VALUES (CAST(:p AS uuid), CAST(:u AS uuid)) ON CONFLICT DO NOTHING")
          .param("p", postId).param("u", user.id()).update();
    }
    long count = jdbc.sql("SELECT COUNT(*) FROM marketplace_post_likes WHERE post_id = CAST(:p AS uuid)")
        .param("p", postId).query(Long.class).single();
    return Map.of("liked", !liked, "likeCount", count);
  }

  public Map<String, Object> toggleSave(CurrentUser user, String postId) {
    ensurePostExists(postId);
    boolean saved = jdbc.sql("SELECT 1 FROM marketplace_post_saves WHERE post_id = CAST(:p AS uuid) AND user_id = CAST(:u AS uuid)")
        .param("p", postId).param("u", user.id()).query(Integer.class).optional().isPresent();
    if (saved) {
      jdbc.sql("DELETE FROM marketplace_post_saves WHERE post_id = CAST(:p AS uuid) AND user_id = CAST(:u AS uuid)")
          .param("p", postId).param("u", user.id()).update();
    } else {
      jdbc.sql("INSERT INTO marketplace_post_saves (post_id, user_id) VALUES (CAST(:p AS uuid), CAST(:u AS uuid)) ON CONFLICT DO NOTHING")
          .param("p", postId).param("u", user.id()).update();
    }
    return Map.of("saved", !saved);
  }

  public Map<String, Object> comments(String postId) {
    ensurePostExists(postId);
    List<Map<String, Object>> comments = jdbc.sql("""
        SELECT c.id, c.body, c.created_at, u.full_name AS author_name, u.role AS author_role
        FROM marketplace_post_comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.post_id = CAST(:p AS uuid)
        ORDER BY c.created_at ASC
        """)
        .param("p", postId)
        .query(DatabaseRowMapper::toMap)
        .list();
    return Map.of("comments", comments, "count", comments.size());
  }

  public Map<String, Object> addComment(CurrentUser user, String postId, Map<String, Object> body) {
    ensurePostExists(postId);
    String text = value(body.get("body"));
    if (text == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment body is required");
    Map<String, Object> comment = jdbc.sql("""
        INSERT INTO marketplace_post_comments (post_id, user_id, body)
        VALUES (CAST(:p AS uuid), CAST(:u AS uuid), :body)
        RETURNING id, body, created_at
        """)
        .param("p", postId)
        .param("u", user.id())
        .param("body", text)
        .query(DatabaseRowMapper::toMap)
        .single();
    comment.put("authorName", user.fullName());
    comment.put("authorRole", user.role());
    return Map.of("comment", comment);
  }

  public Map<String, Object> recallPost(CurrentUser user, String postId, Map<String, Object> body) {
    if (!"regulator".equals(user.role())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only regulators can recall marketplace posts");
    }
    Map<String, Object> post = jdbc.sql("""
        UPDATE marketplace_posts
        SET status = 'recalled', safety_status = 'recalled', safety_label = 'Recalled',
            regulator_note = :note, updated_at = now()
        WHERE id = CAST(:postId AS uuid)
        RETURNING id, status, safety_status, safety_label, regulator_note
        """)
        .param("postId", postId)
        .param("note", String.valueOf(body.getOrDefault("note", "Recalled by regulator")))
        .query(DatabaseRowMapper::toMap)
        .optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
    return Map.of("post", post);
  }

  private void ensurePostExists(String postId) {
    boolean exists = jdbc.sql("SELECT 1 FROM marketplace_posts WHERE id = CAST(:p AS uuid)")
        .param("p", postId).query(Integer.class).optional().isPresent();
    if (!exists) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
  }

  private SafetySnapshot resolveSafety(String domain, Map<String, Object> body) {
    String qr = value(body.get("qrCodeString"));
    if (qr != null) {
      SafetySnapshot byQr = "drug".equals(domain) ? drugSafety(qr) : foodSafety(qr);
      if (byQr != null) return byQr;
    }
    String farmId = value(body.get("farmId"));
    if ("farm".equals(domain) && farmId != null) {
      return new SafetySnapshot(null, null, farmId, null, "epa_cleared", "EPA Cleared", "EPA/FoodTrace GH");
    }
    return new SafetySnapshot(null, null, null, qr, "unverified", "Pending verification", "FoodTrace GH");
  }

  private SafetySnapshot foodSafety(String qr) {
    return jdbc.sql("""
        SELECT pb.id AS product_batch_id, q.code_string, q.status AS qr_status, pb.recall_status
        FROM qr_codes q
        JOIN product_batches pb ON pb.id = q.batch_id
        WHERE q.code_string = :qr
        LIMIT 1
        """)
        .param("qr", qr)
        .query(DatabaseRowMapper::toMap)
        .optional()
        .map(row -> {
          String status = String.valueOf(row.get("recallStatus"));
          String qrStatus = String.valueOf(row.get("qrStatus"));
          boolean recalled = "recalled".equals(status) || "recalled".equals(qrStatus);
          return new SafetySnapshot(String.valueOf(row.get("productBatchId")), null, null, qr,
              recalled ? "recalled" : "fda_approved",
              recalled ? "Recalled" : "FDA Approved",
              "FDA/FoodTrace GH");
        })
        .orElse(null);
  }

  private SafetySnapshot drugSafety(String qr) {
    return jdbc.sql("""
        SELECT db.id AS drug_batch_id, q.code_string, q.status AS qr_status, db.recall_status, db.expiry_date
        FROM drug_qr_codes q
        JOIN drug_batches db ON db.id = q.drug_batch_id
        WHERE q.code_string = :qr
        LIMIT 1
        """)
        .param("qr", qr)
        .query(DatabaseRowMapper::toMap)
        .optional()
        .map(row -> {
          String status = String.valueOf(row.get("recallStatus"));
          String qrStatus = String.valueOf(row.get("qrStatus"));
          boolean recalled = "recalled".equals(status) || "recalled".equals(qrStatus);
          return new SafetySnapshot(null, String.valueOf(row.get("drugBatchId")), null, qr,
              recalled ? "recalled" : "fda_approved",
              recalled ? "Recalled" : "FDA Approved",
              "FDA/FoodTrace GH");
        })
        .orElse(null);
  }

  private void requireSeller(CurrentUser user) {
    if (!List.of("farmer", "manufacturer", "pharmacist").contains(user.role())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only sellers can create marketplace posts");
    }
  }

  private String normalizeDomain(String value) {
    if (value == null || value.isBlank() || "all".equalsIgnoreCase(value)) return null;
    String normalized = value.toLowerCase(Locale.ROOT);
    if (List.of("food", "drug", "farm").contains(normalized)) return normalized;
    return null;
  }

  private String[] stringArray(Object value) {
    if (value instanceof List<?> list) return list.stream().map(String::valueOf).toArray(String[]::new);
    if (value != null && value.getClass().isArray()) {
      int length = Array.getLength(value);
      String[] result = new String[length];
      for (int i = 0; i < length; i++) result[i] = String.valueOf(Array.get(value, i));
      return result;
    }
    String text = value(value);
    if (text == null) return new String[0];
    return List.of(text.split(",")).stream().map(String::trim).filter(s -> !s.isBlank()).toArray(String[]::new);
  }

  private String value(Object value) {
    if (value == null) return null;
    String text = String.valueOf(value).trim();
    return text.isEmpty() || "null".equalsIgnoreCase(text) ? null : text;
  }

  private record SafetySnapshot(
      String productBatchId,
      String drugBatchId,
      String farmId,
      String qrCodeString,
      String status,
      String label,
      String source) {
  }
}
