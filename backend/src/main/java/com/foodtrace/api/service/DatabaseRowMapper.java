package com.foodtrace.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

final class DatabaseRowMapper {
  private static final ObjectMapper JSON = new ObjectMapper();

  private DatabaseRowMapper() {
  }

  static Map<String, Object> toMap(ResultSet rs, int rowNum) throws SQLException {
    ResultSetMetaData meta = rs.getMetaData();
    Map<String, Object> row = new LinkedHashMap<>();
    for (int i = 1; i <= meta.getColumnCount(); i++) {
      Object value = rs.getObject(i);
      row.put(toCamel(meta.getColumnLabel(i)), normalize(value));
    }
    return row;
  }

  private static Object normalize(Object value) {
    if (value instanceof OffsetDateTime dateTime) {
      return dateTime.toString();
    }
    // jsonb/json columns come back as org.postgresql.util.PGobject — unwrap to
    // a plain Map/List instead of letting Jackson serialize the driver's
    // internal {type, value} shape. Reflection avoids a compile-time
    // dependency on the postgresql driver, which is runtime-scoped.
    if (value != null && "org.postgresql.util.PGobject".equals(value.getClass().getName())) {
      try {
        Object type = value.getClass().getMethod("getType").invoke(value);
        if ("jsonb".equals(type) || "json".equals(type)) {
          Object raw = value.getClass().getMethod("getValue").invoke(value);
          if (raw == null) return null;
          try {
            return JSON.readValue((String) raw, Object.class);
          } catch (Exception parseEx) {
            return raw;
          }
        }
      } catch (ReflectiveOperationException ex) {
        // fall through and return the raw value below
      }
    }
    if (value instanceof LocalDate date) {
      return date.toString();
    }
    // PostgreSQL arrays (e.g. text[] hashtags, crop_types) come back as a
    // java.sql.Array the JSON serializer can't walk — unwrap to a plain List.
    if (value instanceof java.sql.Array sqlArray) {
      try {
        Object array = sqlArray.getArray();
        if (array instanceof Object[] objects) {
          return java.util.Arrays.asList(objects);
        }
        return array;
      } catch (SQLException ex) {
        return java.util.List.of();
      }
    }
    return value;
  }

  private static String toCamel(String value) {
    StringBuilder builder = new StringBuilder();
    boolean nextUpper = false;
    for (char c : value.toCharArray()) {
      if (c == '_') {
        nextUpper = true;
        continue;
      }
      builder.append(nextUpper ? Character.toUpperCase(c) : c);
      nextUpper = false;
    }
    return builder.toString();
  }
}
