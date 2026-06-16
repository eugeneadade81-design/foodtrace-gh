package com.foodtrace.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "foodtrace")
public record AppProperties(
    String jwtSecret,
    String frontendUrl,
    String mobileOrigins,
    String uploadsDir) {
}
