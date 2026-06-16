package com.foodtrace.api.controller;

import com.foodtrace.api.service.ScanService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/drug", "/api/drugs", "/api/pharmacy"})
public class DrugController {
  private final ScanService scanService;

  public DrugController(ScanService scanService) {
    this.scanService = scanService;
  }

  @GetMapping("/scan/{codeString}")
  public Map<String, Object> scan(@PathVariable String codeString) {
    return Map.of("result", scanService.scanDrug(codeString), "cached", false);
  }

  @GetMapping("/dashboard")
  public Map<String, Object> dashboard() {
    return Map.of("dashboard", Map.of("drugs", java.util.List.of(), "batches", java.util.List.of(), "metrics", Map.of()));
  }

  @PostMapping({"/register", "/drugs", "/batches", "/drug-batches", "/recalls"})
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    return Map.of("received", body, "status", "accepted");
  }
}
