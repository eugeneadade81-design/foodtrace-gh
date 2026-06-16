package com.foodtrace.api.dto;

import java.util.List;
import java.util.Map;

public final class ApiDtos {
  private ApiDtos() {
  }

  public record AuthUser(String id, String fullName, String phone, String email, String role, String language, boolean isVerified, boolean isActive) {
  }

  public record AuthResponse(String token, AuthUser user) {
  }

  public record RegisterRequest(String fullName, String phone, String email, String password, String role, String language) {
  }

  public record LoginRequest(String identifier, String password) {
  }

  public record OtpRequest(String identifier, String purpose) {
  }

  public record VerifyOtpRequest(String identifier, String token, String purpose) {
  }

  public record DashboardResponse(Map<String, Object> dashboard) {
  }

  public record ScanResponse(Map<String, Object> result, boolean cached) {
  }

  public record AssistantResponse(String title, String answer) {
  }

  public record UssdResponse(String response) {
  }

  public static final List<String> USER_ROLES = List.of("consumer", "farmer", "manufacturer", "regulator", "pharmacist");
}
