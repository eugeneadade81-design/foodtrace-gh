package com.foodtrace.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Sends transactional email via the Resend HTTP API (port 443) instead of
 * raw SMTP — Render's free tier blocks outbound SMTP (25/465/587) to
 * prevent spam abuse, so a real SMTP_USERNAME/SMTP_PASSWORD pair still
 * fails with a connection timeout there. HTTPS isn't blocked.
 */
@Service
public class EmailService {
  private static final Logger log = LoggerFactory.getLogger(EmailService.class);
  private static final HttpClient HTTP = HttpClient.newHttpClient();
  private static final String FROM = "FoodTrace GH <onboarding@resend.dev>";

  private final ObjectMapper mapper;
  private final String apiKey;
  private final String replyTo;
  private final boolean configured;

  public EmailService(ObjectMapper mapper, @Value("${RESEND_API_KEY:}") String apiKey,
      @Value("${SMTP_USERNAME:}") String replyTo) {
    this.mapper = mapper;
    this.apiKey = apiKey;
    this.replyTo = (replyTo == null || replyTo.isBlank()) ? null : replyTo;
    this.configured = apiKey != null && !apiKey.isBlank();
  }

  /** Returns true if it actually sent an email; false if Resend isn't configured yet. */
  public boolean sendPasswordResetCode(String toEmail, String code) {
    if (!configured) {
      log.warn("RESEND_API_KEY not set — password reset code for {} was generated but not emailed.", toEmail);
      return false;
    }
    try {
      Map<String, Object> body = new java.util.LinkedHashMap<>();
      body.put("from", FROM);
      body.put("to", List.of(toEmail));
      body.put("subject", "Your FoodTrace GH password reset code");
      body.put("text", """
          Your password reset code is: %s

          This code expires in 15 minutes. If you didn't request this, you can ignore this email.

          — FoodTrace GH
          """.formatted(code));
      if (replyTo != null) body.put("reply_to", replyTo);

      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create("https://api.resend.com/emails"))
          .header("Content-Type", "application/json")
          .header("Authorization", "Bearer " + apiKey)
          .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
          .build();
      HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        return true;
      }
      log.error("Resend API error sending password reset email to {}: {} {}", toEmail, response.statusCode(), response.body());
      return false;
    } catch (Exception error) {
      log.error("Failed to send password reset email to {}: {}", toEmail, error.getMessage());
      return false;
    }
  }
}
