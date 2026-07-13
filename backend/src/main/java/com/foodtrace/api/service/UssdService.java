package com.foodtrace.api.service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * State machine for the Africa's Talking USSD menu. AT posts the phone number and the
 * '*'-joined history of everything the caller has typed this session; we re-derive where
 * they are in the menu from that history each time (AT does not keep session state for us).
 *
 * 1) Verify a batch code   2) Report unsafe food   3) View active recalls
 */
@Service
public class UssdService {
  private final JdbcClient jdbc;
  private final ScanService scanService;
  private final PasswordEncoder passwordEncoder;

  public UssdService(JdbcClient jdbc, ScanService scanService, PasswordEncoder passwordEncoder) {
    this.jdbc = jdbc;
    this.scanService = scanService;
    this.passwordEncoder = passwordEncoder;
  }

  public String handle(String phoneNumber, String text) {
    String input = text == null ? "" : text.trim();
    String[] parts = input.isEmpty() ? new String[0] : input.split("\\*");

    if (parts.length == 0) return mainMenu();

    return switch (parts[0]) {
      case "1" -> handleVerify(parts);
      case "2" -> handleReport(phoneNumber, parts);
      case "3" -> handleActiveRecalls();
      default -> "END Invalid choice. Please dial in again.";
    };
  }

  private String mainMenu() {
    return "CON Welcome to FoodTrace GH\n1. Verify a batch code\n2. Report unsafe food\n3. View active recalls";
  }

  private String handleVerify(String[] parts) {
    if (parts.length < 2) return "CON Enter the batch or QR code (e.g. FT-QR-1001):";
    String code = parts[1].trim();
    Map<String, Object> result = scanService.scanFood(code, null);
    if ("not_found".equals(result.get("status"))) {
      result = scanService.scanDrug(code, null);
    }
    String title = String.valueOf(result.getOrDefault("title", "No match found"));
    String summary = String.valueOf(result.getOrDefault("summary", "We could not find that code."));
    return "END " + title + ". " + summary;
  }

  private String handleReport(String phoneNumber, String[] parts) {
    if (parts.length < 2) return "CON Enter the batch or QR code you're reporting:";
    if (parts.length < 3) return "CON Briefly describe the issue:";

    String code = parts[1].trim();
    String description = String.join("*", java.util.Arrays.copyOfRange(parts, 2, parts.length)).trim();
    if (description.length() < 10) {
      return "END Description too short. Please dial in again and describe the issue in a few more words.";
    }

    String userId = findOrCreateReporter(phoneNumber);
    try {
      scanService.submitReport(code, userId, Map.of("description", description));
      return "END Thank you. Your report has been submitted for review.";
    } catch (Exception e) {
      return "END We could not find that code. Please check it and dial in again.";
    }
  }

  private String handleActiveRecalls() {
    var recalls = jdbc.sql("""
        SELECT pb.product_name, re.reason
        FROM recall_events re
        JOIN product_batches pb ON pb.id = re.batch_id
        WHERE re.resolved_at IS NULL
        ORDER BY re.created_at DESC
        LIMIT 3
        """)
        .query(DatabaseRowMapper::toMap)
        .list();

    if (recalls.isEmpty()) return "END No active recalls right now.";

    StringBuilder sb = new StringBuilder("END Active recalls:\n");
    for (var r : recalls) {
      sb.append("- ").append(r.get("productName")).append(": ").append(r.get("reason")).append("\n");
    }
    return sb.toString().stripTrailing();
  }

  /** USSD callers rarely have an app account yet; find their consumer profile by phone or create one on the fly. */
  private String findOrCreateReporter(String phoneNumber) {
    Optional<UUID> existing = jdbc.sql("SELECT id FROM users WHERE phone = :phone LIMIT 1")
        .param("phone", phoneNumber).query(UUID.class).optional();
    if (existing.isPresent()) return existing.get().toString();

    return jdbc.sql("""
        INSERT INTO users (full_name, phone, password_hash, role, is_verified, is_active)
        VALUES ('USSD Reporter', :phone, :password, 'consumer', true, true)
        RETURNING id
        """)
        .param("phone", phoneNumber)
        .param("password", passwordEncoder.encode(UUID.randomUUID().toString()))
        .query(UUID.class).single().toString();
  }
}
