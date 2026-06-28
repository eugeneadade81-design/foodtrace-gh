package com.foodtrace.api.service;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

final class DatabaseRowMapper {
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
