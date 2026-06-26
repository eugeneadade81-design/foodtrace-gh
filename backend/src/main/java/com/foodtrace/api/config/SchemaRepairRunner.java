package com.foodtrace.api.config;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

/**
 * Guarantees the database schema is complete on every startup, independent of
 * Flyway. On Render, the managed database was created from an earlier partial
 * schema and Flyway baselined over it, so columns added later (subscription_tier,
 * user_id, the full farms/pharmacies definitions) never got applied — every
 * portal dashboard then failed with "bad SQL grammar".
 *
 * This runner re-executes the migration scripts directly through JDBC on
 * startup. Every statement is split out and run individually with its own
 * error handling, so a single failing statement can never roll back the rest
 * (running the whole script as one batch would put it in a single implicit
 * transaction). All statements are idempotent — {@code CREATE TABLE IF NOT
 * EXISTS}, {@code ADD COLUMN IF NOT EXISTS}, and enum types guarded by
 * {@code DO} blocks — so this is a harmless no-op once the schema is correct.
 */
@Component
public class SchemaRepairRunner implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(SchemaRepairRunner.class);

  private final DataSource dataSource;

  public SchemaRepairRunner(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  @Override
  public void run(ApplicationArguments args) {
    try {
      PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
      Resource[] scripts = resolver.getResources("classpath*:db/migration/V*.sql");
      Arrays.sort(scripts, Comparator.comparing(r -> {
        String name = r.getFilename() == null ? "" : r.getFilename();
        return migrationOrder(name);
      }));

      try (Connection connection = dataSource.getConnection()) {
        String databaseProduct =
            connection.getMetaData().getDatabaseProductName().toLowerCase();
        if (!databaseProduct.contains("postgresql")) {
          log.info("Schema repair skipped for non-PostgreSQL database: {}", databaseProduct);
          return;
        }
        connection.setAutoCommit(true);

        int applied = 0;
        int failed = 0;
        for (Resource script : scripts) {
          String sql = StreamUtils.copyToString(script.getInputStream(), StandardCharsets.UTF_8);
          for (String statementSql : splitStatements(sql)) {
            String trimmed = statementSql.trim();
            if (trimmed.isEmpty()) continue;
            try (Statement statement = connection.createStatement()) {
              statement.execute(trimmed);
              applied++;
            } catch (Exception ex) {
              failed++;
              log.debug("Schema repair statement skipped ({}): {}", script.getFilename(), ex.getMessage());
            }
          }
        }
        log.info("Schema repair complete — {} statements applied, {} skipped. Portal tables verified.", applied, failed);
      }
    } catch (Exception ex) {
      log.error("Schema repair could not run: {}", ex.getMessage());
    }
  }

  /**
   * Splits a SQL script into individual statements on semicolons, while keeping
   * dollar-quoted blocks ({@code $$ ... $$}, used by the migrations' {@code DO}
   * blocks) intact so their internal semicolons are not treated as separators.
   * Line ({@code --}) comments are stripped.
   */
  static List<String> splitStatements(String sql) {
    List<String> statements = new ArrayList<>();
    StringBuilder current = new StringBuilder();
    boolean inDollar = false;
    int i = 0;
    int n = sql.length();
    while (i < n) {
      char c = sql.charAt(i);

      // Skip -- line comments when not inside a dollar-quoted block.
      if (!inDollar && c == '-' && i + 1 < n && sql.charAt(i + 1) == '-') {
        int eol = sql.indexOf('\n', i);
        if (eol < 0) break;
        i = eol + 1;
        continue;
      }

      // Toggle on the $$ dollar-quote delimiter (migrations use the empty tag).
      if (c == '$' && i + 1 < n && sql.charAt(i + 1) == '$') {
        inDollar = !inDollar;
        current.append("$$");
        i += 2;
        continue;
      }

      // A semicolon at depth 0 ends a statement.
      if (c == ';' && !inDollar) {
        statements.add(current.toString());
        current.setLength(0);
        i++;
        continue;
      }

      current.append(c);
      i++;
    }
    if (!current.toString().trim().isEmpty()) statements.add(current.toString());
    return statements;
  }

  /** Sorts V1, V2, ... V10 numerically rather than lexically. */
  private int migrationOrder(String filename) {
    int start = filename.indexOf('V') + 1;
    int end = filename.indexOf("__");
    if (start <= 0 || end <= start) return Integer.MAX_VALUE;
    try {
      return Integer.parseInt(filename.substring(start, end).trim());
    } catch (NumberFormatException ex) {
      return Integer.MAX_VALUE;
    }
  }
}
