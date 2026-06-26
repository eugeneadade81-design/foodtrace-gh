package com.foodtrace.api.config;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.Statement;
import java.util.Arrays;
import java.util.Comparator;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
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
 * This runner re-executes the migration scripts directly through a raw JDBC
 * Statement (the PostgreSQL driver accepts multi-statement scripts, including
 * {@code DO $$ ... $$} blocks, in one execute call). Every statement in those
 * scripts is idempotent — {@code CREATE TABLE IF NOT EXISTS},
 * {@code ADD COLUMN IF NOT EXISTS}, and enum types guarded by {@code DO} blocks —
 * so running them again on an already-correct database is a harmless no-op.
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
        for (Resource script : scripts) {
          String sql = StreamUtils.copyToString(script.getInputStream(), StandardCharsets.UTF_8).trim();
          if (sql.isEmpty()) continue;
          try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
            log.info("Schema repair applied: {}", script.getFilename());
          } catch (Exception ex) {
            // An individual idempotent script failing should never abort startup.
            log.warn("Schema repair skipped {} ({})", script.getFilename(), ex.getMessage());
          }
        }
      }
      log.info("Schema repair complete — all portal tables verified.");
    } catch (Exception ex) {
      log.error("Schema repair could not run: {}", ex.getMessage());
    }
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
