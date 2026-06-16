package com.foodtrace.api.controller;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CompatibilityControllers {
  @RestController
  @RequestMapping("/api/manufacturer")
  static class ManufacturerController {
    @GetMapping("/dashboard")
    Map<String, Object> dashboard() {
      Map<String, Object> dashboard = new LinkedHashMap<>();
      dashboard.put("profile", null);
      dashboard.put("batches", java.util.List.of());
      dashboard.put("metrics", Map.of());
      return Map.of("dashboard", dashboard);
    }

    @PostMapping({"/profile", "/batches", "/recalls"})
    Map<String, Object> post(@RequestBody Map<String, Object> body) {
      return Map.of("received", body, "status", "accepted");
    }

    @GetMapping("/batches/{id}")
    Map<String, Object> batch(@PathVariable String id) {
      return Map.of("batch", Map.of("id", id));
    }

    @PostMapping("/batches/{id}/recall")
    Map<String, Object> recallBatch(@PathVariable String id, @RequestBody Map<String, Object> body) {
      return Map.of("batchId", id, "received", body, "status", "accepted");
    }
  }

  @RestController
  @RequestMapping("/api/regulator")
  static class RegulatorController {
    @GetMapping({"/dashboard", "/analytics", "/violations", "/reports"})
    Map<String, Object> get() {
      return Map.of("dashboard", Map.of(), "reports", java.util.List.of());
    }

    @PatchMapping("/reports")
    Map<String, Object> patchReports(@RequestBody Map<String, Object> body) {
      return Map.of("received", body, "status", "accepted");
    }

    @PostMapping("/recalls")
    Map<String, Object> recalls(@RequestBody Map<String, Object> body) {
      return Map.of("received", body, "status", "accepted");
    }
  }

  @RestController
  @RequestMapping("/api/assistant")
  static class AssistantController {
    @GetMapping
    Map<String, Object> get() {
      return Map.of("title", "General guidance", "answer", "FoodTrace assistant endpoint is available.");
    }

    @PostMapping("/query")
    Map<String, Object> query(@RequestBody Map<String, Object> body) {
      Object question = body.getOrDefault("question", "FoodTrace guidance");
      return Map.of(
          "title", "General guidance",
          "answer", "Spring Boot received your FoodTrace assistant question: " + question);
    }
  }

  @RestController
  @RequestMapping("/api/audio")
  static class AudioController {
    @PostMapping("/speech")
    Map<String, Object> speech(@RequestBody Map<String, Object> body) {
      return Map.of("received", body, "status", "not_configured");
    }
  }

  @RestController
  @RequestMapping("/api/sms")
  static class SmsController {
    @PostMapping("/callback")
    Map<String, Object> callback(@RequestBody Map<String, Object> body) {
      return Map.of("received", body, "status", "ok");
    }
  }

  @RestController
  @RequestMapping("/api/ussd")
  static class UssdController {
    @PostMapping("/callback")
    Map<String, Object> callback(@RequestBody Map<String, Object> body) {
      return Map.of("response", "END FoodTrace received your request.", "received", body);
    }
  }
}
