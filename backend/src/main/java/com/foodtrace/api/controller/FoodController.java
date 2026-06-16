package com.foodtrace.api.controller;

import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.service.FoodService;
import java.util.HashMap;
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
@RequestMapping({"/api/food", "/api/farmer"})
public class FoodController {
  private final FoodService foodService;

  public FoodController(FoodService foodService) {
    this.foodService = foodService;
  }

  @GetMapping("/dashboard")
  public Map<String, Object> dashboard(Authentication authentication) {
    return Map.of("dashboard", foodService.dashboard(currentUser(authentication)));
  }

  @PostMapping("/farms")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createFarm(@RequestBody Map<String, Object> body, Authentication authentication) {
    return foodService.createFarm(currentUser(authentication), body);
  }

  @PostMapping("/crop-cycles")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createCropCycle(@RequestBody Map<String, Object> body, Authentication authentication) {
    return foodService.createCropCycle(currentUser(authentication), body);
  }

  @PostMapping("/farms/{farmId}/cycles")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createCropCycleForFarm(@org.springframework.web.bind.annotation.PathVariable String farmId, @RequestBody Map<String, Object> body, Authentication authentication) {
    Map<String, Object> payload = new HashMap<>(body);
    payload.put("farmId", farmId);
    return foodService.createCropCycle(currentUser(authentication), payload);
  }

  @PostMapping("/input-logs")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createInputLog(@RequestBody Map<String, Object> body, Authentication authentication) {
    return foodService.createInputLog(currentUser(authentication), body);
  }

  @PostMapping("/cycles/{cycleId}/inputs")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createInputLogForCycle(@org.springframework.web.bind.annotation.PathVariable String cycleId, @RequestBody Map<String, Object> body, Authentication authentication) {
    Map<String, Object> payload = new HashMap<>(body);
    payload.put("cropCycleId", cycleId);
    return foodService.createInputLog(currentUser(authentication), payload);
  }

  @GetMapping("/cycles/{cycleId}/status")
  public Map<String, Object> cycleStatus(@org.springframework.web.bind.annotation.PathVariable String cycleId) {
    Map<String, Object> response = new HashMap<>();
    response.put("cropCycleId", cycleId);
    response.put("safeHarvestDate", null);
    return response;
  }

  @PatchMapping("/crop-cycles/market-ready")
  public Map<String, Object> markReady(@RequestBody Map<String, Object> body, Authentication authentication) {
    return foodService.markReady(currentUser(authentication), body);
  }

  @PostMapping("/offline-sync")
  public Map<String, Object> offlineSync(@RequestBody Map<String, Object> body) {
    return Map.of("results", java.util.List.of(), "received", body);
  }

  private CurrentUser currentUser(Authentication authentication) {
    return (CurrentUser) authentication.getPrincipal();
  }
}
