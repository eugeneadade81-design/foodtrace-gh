package com.foodtrace.api.controller;

import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.service.ManufacturerService;
import com.foodtrace.api.service.RegulatorService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CompatibilityControllers {

  @RestController
  @RequestMapping("/api/manufacturer")
  static class ManufacturerController {
    private final ManufacturerService manufacturerService;

    ManufacturerController(ManufacturerService manufacturerService) {
      this.manufacturerService = manufacturerService;
    }

    @GetMapping("/dashboard")
    Map<String, Object> dashboard(Authentication authentication) {
      return manufacturerService.dashboard(currentUser(authentication));
    }

    @PostMapping("/profile")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, Object> createProfile(@RequestBody Map<String, Object> body, Authentication authentication) {
      return manufacturerService.createProfile(currentUser(authentication), body);
    }

    @PostMapping("/batches")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, Object> createBatch(@RequestBody Map<String, Object> body, Authentication authentication) {
      return manufacturerService.createBatch(currentUser(authentication), body);
    }

    @PostMapping("/recalls")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, Object> createRecall(@RequestBody Map<String, Object> body, Authentication authentication) {
      return manufacturerService.createRecall(currentUser(authentication), body);
    }

    private CurrentUser currentUser(Authentication auth) {
      return (CurrentUser) auth.getPrincipal();
    }
  }

  @RestController
  @RequestMapping("/api/regulator")
  static class RegulatorController {
    private final RegulatorService regulatorService;

    RegulatorController(RegulatorService regulatorService) {
      this.regulatorService = regulatorService;
    }

    @GetMapping("/dashboard")
    Map<String, Object> dashboard() {
      return regulatorService.dashboard();
    }

    @PatchMapping("/reports")
    Map<String, Object> reviewReport(@RequestBody Map<String, Object> body) {
      return regulatorService.reviewReport(body);
    }

    @PostMapping("/recalls")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, Object> createRecall(@RequestBody Map<String, Object> body, Authentication authentication) {
      return regulatorService.createRecall(currentUser(authentication), body);
    }

    private CurrentUser currentUser(Authentication auth) {
      return (CurrentUser) auth.getPrincipal();
    }
  }

  @RestController
  @RequestMapping("/api/assistant")
  static class AssistantController {
    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static final String SYSTEM_PROMPT =
        "You are a helpful assistant for FoodTrace GH, a food and drug safety platform in Ghana. "
        + "Help users understand food safety, medicine safety, expiry dates, proper storage, recalls, "
        + "and how to use the FoodTrace platform. Be concise, friendly, and relevant to Ghana's context. "
        + "Keep responses under 200 words.";

    private final ObjectMapper mapper;

    AssistantController(ObjectMapper mapper) {
      this.mapper = mapper;
    }

    @GetMapping
    Map<String, Object> get() {
      String key = System.getenv("ANTHROPIC_API_KEY");
      return Map.of("status", key != null && !key.isBlank() ? "ready" : "not_configured");
    }

    @PostMapping("/chat")
    Map<String, Object> chat(@RequestBody Map<String, Object> body) {
      String message = String.valueOf(body.getOrDefault("message", "")).trim();
      if (message.isBlank()) return Map.of("reply", "Please ask a question.");
      String key = System.getenv("ANTHROPIC_API_KEY");
      if (key == null || key.isBlank()) return Map.of("reply", fallback(message));
      try {
        return Map.of("reply", callClaude(key, message));
      } catch (Exception e) {
        return Map.of("reply", fallback(message));
      }
    }

    @PostMapping("/query")
    Map<String, Object> query(@RequestBody Map<String, Object> body) {
      return chat(body);
    }

    private String callClaude(String apiKey, String message) throws Exception {
      String payload = mapper.writeValueAsString(Map.of(
          "model", "claude-haiku-4-5-20251001",
          "max_tokens", 512,
          "system", SYSTEM_PROMPT,
          "messages", java.util.List.of(Map.of("role", "user", "content", message))
      ));
      HttpRequest req = HttpRequest.newBuilder()
          .uri(URI.create("https://api.anthropic.com/v1/messages"))
          .header("Content-Type", "application/json")
          .header("x-api-key", apiKey)
          .header("anthropic-version", "2023-06-01")
          .POST(HttpRequest.BodyPublishers.ofString(payload))
          .build();
      HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
      JsonNode root = mapper.readTree(res.body());
      return root.path("content").path(0).path("text").asText("I could not generate a response. Please try again.");
    }

    private String fallback(String message) {
      String q = message.toLowerCase();
      if (q.contains("expir") || q.contains("date")) {
        return "Always check the expiry date on packaging before consuming any food or medicine. "
            + "If expired, do not use it. Scan the QR code on FoodTrace to see if a product has an active recall.";
      }
      if (q.contains("recall") || q.contains("unsafe") || q.contains("dangerous")) {
        return "If a product is recalled, stop using it immediately and dispose of it safely. "
            + "Use FoodTrace to report it. If you feel unwell after consuming a recalled product, seek medical help.";
      }
      if (q.contains("store") || q.contains("storage") || q.contains("keep")) {
        return "Store medicines in a cool, dry place away from direct sunlight. "
            + "Refrigerate only if the label says so. Keep food sealed and away from pests.";
      }
      if (q.contains("scan") || q.contains("qr") || q.contains("how")) {
        return "Open the Scanner tab, point your camera at the QR code on the product, and FoodTrace will show you "
            + "if the product is safe, under caution, or recalled - with a recommended action.";
      }
      return "I can help with food safety, medicine storage, expiry dates, recalls, and how to use FoodTrace GH. "
          + "Try asking about checking an expiry date, storing medicine safely, scanning a QR code, or what to do after a recall alert.";
    }
  }

  @RestController
  @RequestMapping("/api/audio")
  static class AudioController {
    @PostMapping("/speech")
    Map<String, Object> speech(@RequestBody Map<String, Object> body) {
      return Map.of("status", "not_configured",
          "message", "Google Cloud TTS is not configured. Set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT to enable audio summaries.");
    }
  }

  @RestController
  @RequestMapping("/api/sms")
  static class SmsController {
    @PostMapping("/callback")
    Map<String, Object> callback(@RequestBody Map<String, Object> body) {
      // Accepts Africa's Talking SMS callbacks; actual delivery not yet implemented
      return Map.of("status", "not_configured",
          "message", "SMS delivery not configured. Set AFRICASTALKING_API_KEY to enable.");
    }
  }

  @RestController
  @RequestMapping("/api/ussd")
  static class UssdController {
    @PostMapping("/callback")
    Map<String, Object> callback(@RequestBody Map<String, Object> body) {
      // Accepts Africa's Talking USSD callbacks; actual menu logic not yet implemented
      return Map.of("response", "END FoodTrace USSD is not yet configured.", "status", "not_configured");
    }
  }
}
