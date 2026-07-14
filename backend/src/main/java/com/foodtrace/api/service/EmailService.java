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
 * Sends transactional email via the SendGrid HTTP API (port 443) instead of
 * raw SMTP — Render's free tier blocks outbound SMTP (25/465/587) to
 * prevent spam abuse. HTTPS isn't blocked.
 *
 * Uses SendGrid's Single Sender Verification (not full domain
 * authentication), so SMTP_USERNAME must be the exact address verified in
 * SendGrid — unlike Resend's sandbox mode, this lets us send to ANY
 * recipient, not just the account owner.
 */
@Service
public class EmailService {
  private static final Logger log = LoggerFactory.getLogger(EmailService.class);
  private static final HttpClient HTTP = HttpClient.newHttpClient();

  private final ObjectMapper mapper;
  private final String apiKey;
  private final String fromEmail;
  private final boolean configured;

  public EmailService(ObjectMapper mapper, @Value("${SENDGRID_API_KEY:}") String apiKey,
      @Value("${SMTP_USERNAME:}") String fromEmail) {
    this.mapper = mapper;
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.configured = apiKey != null && !apiKey.isBlank() && fromEmail != null && !fromEmail.isBlank();
  }

  /** Returns true if it actually sent an email; false if SendGrid isn't configured yet. */
  public boolean sendPasswordResetCode(String toEmail, String code) {
    if (!configured) {
      log.warn("SENDGRID_API_KEY/SMTP_USERNAME not set — password reset code for {} was generated but not emailed.", toEmail);
      return false;
    }
    try {
      Map<String, Object> body = Map.of(
          "personalizations", List.of(Map.of("to", List.of(Map.of("email", toEmail)))),
          "from", Map.of("email", fromEmail, "name", "FoodTrace GH"),
          "reply_to", Map.of("email", fromEmail),
          "subject", "Your FoodTrace GH password reset code",
          "content", List.of(Map.of("type", "text/plain", "value", """
              Your password reset code is: %s

              This code expires in 15 minutes. If you didn't request this, you can ignore this email.

              — FoodTrace GH
              """.formatted(code)))
      );

      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create("https://api.sendgrid.com/v3/mail/send"))
          .header("Content-Type", "application/json")
          .header("Authorization", "Bearer " + apiKey)
          .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
          .build();
      HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        return true;
      }
      log.error("SendGrid API error sending password reset email to {}: {} {}", toEmail, response.statusCode(), response.body());
      return false;
    } catch (Exception error) {
      log.error("Failed to send password reset email to {}: {}", toEmail, error.getMessage());
      return false;
    }
  }
}
