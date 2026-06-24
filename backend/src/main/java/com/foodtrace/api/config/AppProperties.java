package com.foodtrace.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "foodtrace")
public record AppProperties(
    String jwtSecret,
    String frontendUrl,
    String mobileOrigins,
    String uploadsDir,
    boolean exposeOtp,
    String publicApiUrl,
    // Africa's Talking SMS/USSD — set AFRICASTALKING_API_KEY etc to enable
    String africasTalkingApiKey,
    String africasTalkingUsername,
    String africasTalkingShortcode,
    // Google Cloud TTS — set GOOGLE_APPLICATION_CREDENTIALS (file path) + GOOGLE_CLOUD_PROJECT
    String googleCloudProject) {
}
