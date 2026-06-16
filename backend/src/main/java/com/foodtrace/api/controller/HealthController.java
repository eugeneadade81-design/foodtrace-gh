package com.foodtrace.api.controller;

import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  private final JdbcClient jdbc;

  public HealthController(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    String database = "connected";
    try {
      jdbc.sql("SELECT 1").query().singleValue();
    } catch (RuntimeException error) {
      database = "disconnected";
    }
    return Map.of("status", database.equals("connected") ? "ok" : "degraded", "database", database, "redis", "not_configured");
  }

  @GetMapping("/api")
  public Map<String, Object> api() {
    return Map.of("ok", true, "service", "foodtrace-gh-spring-api", "version", "v1");
  }
}
