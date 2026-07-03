package com.foodtrace.api.controller;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<Map<String, Object>> responseStatus(ResponseStatusException ex) {
    HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
    String message = ex.getReason() == null || ex.getReason().isBlank()
        ? status.getReasonPhrase()
        : ex.getReason();
    return ResponseEntity.status(status).body(Map.of(
        "status", status.value(),
        "error", message));
  }

  // Bad client input (malformed UUID, missing/blank ids, unparseable body,
  // invalid enum value) should be a clean 400 — not a 500 "Server error".
  @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class})
  ResponseEntity<Map<String, Object>> badRequest(Exception ex) {
    String detail = String.valueOf(ex.getMessage());
    String message = detail.contains("UUID")
        ? "Invalid or missing id."
        : "Invalid request. Please check the values and try again.";
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
        "status", 400, "error", message));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<Map<String, Object>> dataIntegrity(DataIntegrityViolationException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
        "status", 400,
        "error", "That value isn't allowed. Please check your input and try again."));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, Object>> unexpected(Exception ex) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
        "status", 500,
        "error", "Server error",
        "detail", ex.getClass().getSimpleName() + ": " + String.valueOf(ex.getMessage())));
  }
}