package com.foodtrace.api.controller;

import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.service.ManufacturerService;
import com.foodtrace.api.service.RegulatorService;
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
    @GetMapping
    Map<String, Object> get() {
      return Map.of("title", "General guidance", "answer", "FoodTrace assistant endpoint is available.");
    }

    @PostMapping("/query")
    Map<String, Object> query(@RequestBody Map<String, Object> body) {
      Object question = body.getOrDefault("question", "FoodTrace guidance");
      return Map.of("title", "General guidance",
          "answer", "FoodTrace received your question: " + question);
    }
  }

  @RestController
  @RequestMapping("/api/audio")
  static class AudioController {
    @PostMapping("/speech")
    Map<String, Object> speech(@RequestBody Map<String, Object> body) {
      return Map.of("received", body, "status", "not_configured",
          "message", "Google Cloud TTS is not configured. Set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT.");
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
