package com.foodtrace.api.service;

import com.foodtrace.api.dto.ApiDtos.AuthResponse;
import com.foodtrace.api.dto.ApiDtos.AuthUser;
import com.foodtrace.api.dto.ApiDtos.LoginRequest;
import com.foodtrace.api.dto.ApiDtos.OtpRequest;
import com.foodtrace.api.dto.ApiDtos.RegisterRequest;
import com.foodtrace.api.dto.ApiDtos.VerifyOtpRequest;
import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.security.JwtService;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
  private final JdbcClient jdbc;
  private final JwtService jwtService;
  private final PasswordEncoder passwordEncoder;
  private final SecureRandom random = new SecureRandom();

  public AuthService(JdbcClient jdbc, JwtService jwtService, PasswordEncoder passwordEncoder) {
    this.jdbc = jdbc;
    this.jwtService = jwtService;
    this.passwordEncoder = passwordEncoder;
  }

  public Map<String, Object> requestOtp(OtpRequest request) {
    Map<String, Object> user = findUserByIdentifier(request.identifier())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    String token = String.valueOf(100000 + random.nextInt(900000));
    OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(10);
    jdbc.sql("INSERT INTO otp_tokens (user_id, token, purpose, expires_at) VALUES (:userId, :token, :purpose, :expiresAt)")
        .param("userId", user.get("id"))
        .param("token", token)
        .param("purpose", valueOrDefault(request.purpose(), "login"))
        .param("expiresAt", expiresAt)
        .update();
    return Map.of("sent", true, "otp", token, "expiresAt", expiresAt.toString());
  }

  public AuthResponse verifyOtp(VerifyOtpRequest request) {
    Map<String, Object> user = findUserByIdentifier(request.identifier())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    Map<String, Object> otp = jdbc.sql("""
        SELECT id, expires_at, used_at
        FROM otp_tokens
        WHERE user_id = :userId AND token = :token AND purpose = :purpose
        ORDER BY created_at DESC
        LIMIT 1
        """)
        .param("userId", user.get("id"))
        .param("token", request.token())
        .param("purpose", valueOrDefault(request.purpose(), "login"))
        .query(DatabaseRowMapper::toMap)
        .optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OTP"));
    if (otp.get("usedAt") != null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "OTP already used");
    }
    jdbc.sql("UPDATE otp_tokens SET used_at = now() WHERE id = :id").param("id", otp.get("id")).update();
    return authResponse(user);
  }

  public AuthResponse register(RegisterRequest request) {
    boolean exists = jdbc.sql("SELECT id FROM users WHERE (:phone IS NOT NULL AND phone = :phone) OR (:email IS NOT NULL AND email = :email) LIMIT 1")
        .param("phone", blankToNull(request.phone()))
        .param("email", blankToNull(request.email()))
        .query()
        .optionalValue()
        .isPresent();
    if (exists) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists");
    }
    Map<String, Object> user = jdbc.sql("""
        INSERT INTO users (full_name, phone, email, password_hash, role, language, is_verified, is_active)
        VALUES (:fullName, :phone, :email, :passwordHash, CAST(:role AS user_role), :language, false, true)
        RETURNING id, full_name, phone, email, role, language, is_verified, is_active
        """)
        .param("fullName", request.fullName())
        .param("phone", blankToNull(request.phone()))
        .param("email", blankToNull(request.email()))
        .param("passwordHash", passwordEncoder.encode(request.password()))
        .param("role", request.role())
        .param("language", valueOrDefault(request.language(), "en"))
        .query(DatabaseRowMapper::toMap)
        .single();
    return authResponse(user);
  }

  public AuthResponse login(LoginRequest request) {
    Map<String, Object> user = jdbc.sql("""
        SELECT id, full_name, phone, email, password_hash, role, language, is_verified, is_active
        FROM users
        WHERE email = :identifier OR phone = :identifier
        LIMIT 1
        """)
        .param("identifier", request.identifier())
        .query(DatabaseRowMapper::toMap)
        .optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    if (!passwordEncoder.matches(request.password(), String.valueOf(user.get("passwordHash")))) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }
    return authResponse(user);
  }

  public AuthUser me(String userId) {
    return findUserById(userId).map(this::toUser)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
  }

  private Optional<Map<String, Object>> findUserByIdentifier(String identifier) {
    String normalized = identifier == null ? "" : identifier.trim().toLowerCase();
    String phoneDigits = normalized.replaceAll("\\D", "");
    return jdbc.sql("""
        SELECT id, full_name, phone, email, role, language, is_verified, is_active
        FROM users
        WHERE (:isEmail IS TRUE AND LOWER(email) = :identifier)
           OR (:isEmail IS FALSE AND phone IS NOT NULL AND regexp_replace(phone, '\\D', '', 'g') = :phoneDigits)
        LIMIT 1
        """)
        .param("isEmail", normalized.contains("@"))
        .param("identifier", normalized)
        .param("phoneDigits", phoneDigits)
        .query(DatabaseRowMapper::toMap)
        .optional();
  }

  private Optional<Map<String, Object>> findUserById(String userId) {
    return jdbc.sql("SELECT id, full_name, phone, email, role, language, is_verified, is_active FROM users WHERE id = :id LIMIT 1")
        .param("id", userId)
        .query(DatabaseRowMapper::toMap)
        .optional();
  }

  private AuthResponse authResponse(Map<String, Object> row) {
    AuthUser user = toUser(row);
    String token = jwtService.sign(new CurrentUser(user.id(), user.role(), user.fullName()));
    return new AuthResponse(token, user);
  }

  private AuthUser toUser(Map<String, Object> row) {
    return new AuthUser(
        String.valueOf(row.get("id")),
        String.valueOf(row.get("fullName")),
        stringOrNull(row.get("phone")),
        stringOrNull(row.get("email")),
        String.valueOf(row.get("role")),
        String.valueOf(row.getOrDefault("language", "en")),
        Boolean.TRUE.equals(row.get("isVerified")),
        Boolean.TRUE.equals(row.get("isActive")));
  }

  private static String valueOrDefault(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value;
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value;
  }

  private static String stringOrNull(Object value) {
    return value == null ? null : String.valueOf(value);
  }
}
