package com.foodtrace.api.controller;

import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.service.ScanService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/scan")
public class ScanController {
  private final ScanService scanService;

  public ScanController(ScanService scanService) {
    this.scanService = scanService;
  }

  @GetMapping("/{codeString}")
  public Map<String, Object> scan(@PathVariable String codeString) {
    return Map.of("result", scanService.scanFood(codeString), "cached", false);
  }

  @PostMapping("/{codeString}/log")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void log(@PathVariable String codeString) {
    scanService.scanFood(codeString);
  }

  @PostMapping("/{codeString}/report")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> report(@PathVariable String codeString, @RequestBody Map<String, Object> body, Authentication authentication) {
    CurrentUser user = (CurrentUser) authentication.getPrincipal();
    return scanService.submitReport(codeString, user.id(), body);
  }
}
