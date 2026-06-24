package com.foodtrace.api.controller;

import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.service.DrugService;
import com.foodtrace.api.service.ScanService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/drug", "/api/drugs", "/api/pharmacy"})
public class DrugController {
  private final ScanService scanService;
  private final DrugService drugService;

  public DrugController(ScanService scanService, DrugService drugService) {
    this.scanService = scanService;
    this.drugService = drugService;
  }

  @GetMapping("/scan/{codeString}")
  public Map<String, Object> scan(@PathVariable String codeString) {
    return Map.of("result", scanService.scanDrug(codeString), "cached", false);
  }

  @GetMapping("/dashboard")
  public Map<String, Object> dashboard(Authentication authentication) {
    return drugService.dashboard(currentUser(authentication));
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> registerPharmacy(@RequestBody Map<String, Object> body, Authentication authentication) {
    return drugService.registerPharmacy(currentUser(authentication), body);
  }

  @PostMapping("/drugs")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createDrug(@RequestBody Map<String, Object> body, Authentication authentication) {
    return drugService.createDrug(currentUser(authentication), body);
  }

  @PostMapping({"/batches", "/drug-batches"})
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createBatch(@RequestBody Map<String, Object> body, Authentication authentication) {
    return drugService.createBatch(currentUser(authentication), body);
  }

  @PostMapping("/recalls")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createRecall(@RequestBody Map<String, Object> body, Authentication authentication) {
    return drugService.createRecall(currentUser(authentication), body);
  }

  private CurrentUser currentUser(Authentication authentication) {
    return (CurrentUser) authentication.getPrincipal();
  }
}
