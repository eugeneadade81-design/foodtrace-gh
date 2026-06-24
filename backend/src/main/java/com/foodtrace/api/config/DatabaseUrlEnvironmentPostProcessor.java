package com.foodtrace.api.config;

import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {
  @Override
  public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
    String databaseUrl = environment.getProperty("DATABASE_URL");
    if (databaseUrl == null || databaseUrl.isBlank() || databaseUrl.startsWith("jdbc:")) {
      return;
    }

    if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
      return;
    }

    URI uri = URI.create(databaseUrl);
    StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://").append(uri.getHost());
    if (uri.getPort() > 0) {
      jdbcUrl.append(":").append(uri.getPort());
    }
    jdbcUrl.append(uri.getPath() == null || uri.getPath().isBlank() ? "/postgres" : uri.getPath());

    Map<String, String> params = new LinkedHashMap<>();
    if (uri.getRawQuery() != null && !uri.getRawQuery().isBlank()) {
      for (String pair : uri.getRawQuery().split("&")) {
        String[] parts = pair.split("=", 2);
        if (parts.length == 2) {
          params.put(parts[0], parts[1]);
        }
      }
    }

    String username = null;
    String password = null;
    String userInfo = uri.getRawUserInfo();
    if (userInfo != null && !userInfo.isBlank()) {
      String[] parts = userInfo.split(":", 2);
      username = decode(parts[0]);
      params.putIfAbsent("user", encode(username));
      if (parts.length > 1) {
        password = decode(parts[1]);
        params.putIfAbsent("password", encode(password));
      }
    }

    if (!params.isEmpty()) {
      jdbcUrl.append("?");
      boolean first = true;
      for (Map.Entry<String, String> entry : params.entrySet()) {
        if (!first) {
          jdbcUrl.append("&");
        }
        jdbcUrl.append(entry.getKey()).append("=").append(entry.getValue());
        first = false;
      }
    }

    Map<String, Object> overrides = new LinkedHashMap<>();
    overrides.put("spring.datasource.url", jdbcUrl.toString());
    if (username != null && environment.getProperty("DATABASE_USERNAME") == null) {
      overrides.put("spring.datasource.username", username);
    }
    if (password != null && environment.getProperty("DATABASE_PASSWORD") == null) {
      overrides.put("spring.datasource.password", password);
    }

    environment.getPropertySources().addFirst(new MapPropertySource("foodtraceDatabaseUrlAdapter", overrides));
  }

  @Override
  public int getOrder() {
    return Ordered.HIGHEST_PRECEDENCE;
  }

  private static String decode(String value) {
    return URLDecoder.decode(value, StandardCharsets.UTF_8);
  }

  private static String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}