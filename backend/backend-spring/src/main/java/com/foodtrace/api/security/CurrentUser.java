package com.foodtrace.api.security;

public record CurrentUser(String id, String role, String fullName) {
}
