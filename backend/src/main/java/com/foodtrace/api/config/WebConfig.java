package com.foodtrace.api.config;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties(AppProperties.class)
public class WebConfig implements WebMvcConfigurer {
  private final AppProperties properties;

  public WebConfig(AppProperties properties) {
    this.properties = properties;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    List<String> origins = new ArrayList<>(List.of("http://localhost:5173", "http://127.0.0.1:5173"));
    if (properties.frontendUrl() != null && !properties.frontendUrl().isBlank()) {
      origins.addAll(Arrays.stream(properties.frontendUrl().split(",")).map(String::trim).filter(s -> !s.isBlank()).toList());
    }
    if (properties.mobileOrigins() != null && !properties.mobileOrigins().isBlank()) {
      origins.addAll(Arrays.stream(properties.mobileOrigins().split(",")).map(String::trim).filter(s -> !s.isBlank()).toList());
    }

    registry.addMapping("/**")
        .allowedOrigins(origins.stream().distinct().toArray(String[]::new))
        .allowedMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(false);
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    Path uploads = Path.of(properties.uploadsDir()).toAbsolutePath().normalize();
    registry.addResourceHandler("/uploads/**").addResourceLocations(uploads.toUri().toString() + "/");
  }
}
