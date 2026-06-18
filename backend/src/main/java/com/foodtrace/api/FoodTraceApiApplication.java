package com.foodtrace.api;

import java.net.URI;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FoodTraceApiApplication {
  public static void main(String[] args) {
    String dbUrl = System.getenv("DATABASE_URL");
    if (dbUrl != null && (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://"))) {
      try {
        URI uri = new URI(dbUrl.replace("postgres://", "postgresql://"));
        String host = uri.getHost();
        int port = uri.getPort() == -1 ? 5432 : uri.getPort();
        String db = uri.getPath(); // e.g. /foodtrace_db
        String userInfo = uri.getUserInfo();
        String user = "";
        String password = "";
        if (userInfo != null) {
          int colon = userInfo.indexOf(':');
          if (colon >= 0) {
            user = userInfo.substring(0, colon);
            password = userInfo.substring(colon + 1);
          } else {
            user = userInfo;
          }
        }
        String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + db;
        System.setProperty("DATABASE_URL", jdbcUrl);
        if (!user.isEmpty()) System.setProperty("DATABASE_USERNAME", user);
        if (!password.isEmpty()) System.setProperty("DATABASE_PASSWORD", password);
      } catch (Exception e) {
        System.err.println("Failed to parse DATABASE_URL: " + e.getMessage());
      }
    }
    SpringApplication.run(FoodTraceApiApplication.class, args);
  }
}
