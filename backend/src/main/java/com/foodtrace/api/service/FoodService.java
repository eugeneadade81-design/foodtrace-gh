package com.foodtrace.api.service;

import com.foodtrace.api.security.CurrentUser;
import java.lang.reflect.Array;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class FoodService {
  private final JdbcClient jdbc;

  public FoodService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, Object> dashboard(CurrentUser user) {
    List<Map<String, Object>> farms = jdbc.sql("SELECT id, name, district, region, crop_types, verification_status, badge_status FROM farms WHERE owner_id = :owner ORDER BY created_at DESC")
        .param("owner", user.id()).query(DatabaseRowMapper::toMap).list();
    List<Map<String, Object>> cropCycles = jdbc.sql("""
        SELECT cc.id, cc.farm_id, cc.crop_type, cc.planting_date, cc.harvest_date, cc.market_ready
        FROM crop_cycles cc
        JOIN farms f ON f.id = cc.farm_id
        WHERE f.owner_id = :owner
        ORDER BY cc.created_at DESC
        """)
        .param("owner", user.id()).query(DatabaseRowMapper::toMap).list();
    List<Map<String, Object>> inputLogs = jdbc.sql("""
        SELECT il.id, il.crop_cycle_id, il.input_type, il.product_name, il.application_date, il.withdrawal_period_days, il.safe_harvest_date, il.epa_approval_status
        FROM input_logs il
        JOIN crop_cycles cc ON cc.id = il.crop_cycle_id
        JOIN farms f ON f.id = cc.farm_id
        WHERE f.owner_id = :owner
        ORDER BY il.created_at DESC
        LIMIT 20
        """)
        .param("owner", user.id()).query(DatabaseRowMapper::toMap).list();
    long readyCycles = cropCycles.stream().filter(c -> Boolean.TRUE.equals(c.get("marketReady"))).count();
    java.time.LocalDate today = java.time.LocalDate.now();
    long pendingWithdrawalCycles = cropCycles.stream().filter(c -> {
      Object shd = c.get("safeHarvestDate");
      if (shd == null) return false;
      try { return java.time.LocalDate.parse(shd.toString()).isAfter(today); } catch (Exception e) { return false; }
    }).count();
    long overdueWithdrawalCycles = cropCycles.stream().filter(c -> {
      Object shd = c.get("safeHarvestDate");
      if (shd == null) return false;
      try { return java.time.LocalDate.parse(shd.toString()).isBefore(today); } catch (Exception e) { return false; }
    }).count();
    return Map.of("farms", farms, "cropCycles", cropCycles, "inputLogs", inputLogs,
        "metrics", Map.of("farms", farms.size(), "cropCycles", cropCycles.size(),
            "readyCycles", readyCycles, "pendingWithdrawalCycles", pendingWithdrawalCycles,
            "overdueWithdrawalCycles", overdueWithdrawalCycles));
  }

  public Map<String, Object> createFarm(CurrentUser user, Map<String, Object> body) {
    Map<String, Object> farm = jdbc.sql("""
        INSERT INTO farms (owner_id, name, district, region, size_acres, crop_types, epa_registration_number, verification_status, badge_status)
        VALUES (:owner, :name, :district, :region, :sizeAcres, CAST(:cropTypes AS text[]), :epa, 'pending', 'none')
        RETURNING id, name, district, region, crop_types, verification_status, badge_status
        """)
        .param("owner", user.id()).param("name", body.get("name")).param("district", body.get("district"))
        .param("region", body.get("region")).param("sizeAcres", body.get("sizeAcres"))
        .param("cropTypes", cropTypes(body.get("cropTypes"))).param("epa", body.get("epaRegistrationNumber"))
        .query(DatabaseRowMapper::toMap).single();
    return Map.of("farm", farm);
  }

  public Map<String, Object> createCropCycle(CurrentUser user, Map<String, Object> body) {
    Map<String, Object> cycle = jdbc.sql("""
        INSERT INTO crop_cycles (farm_id, crop_type, planting_date, notes, status)
        SELECT id, :cropType, :plantingDate, :notes, 'growing'
        FROM farms
        WHERE id = :farmId AND owner_id = :owner
        RETURNING id, farm_id, crop_type, planting_date, harvest_date, market_ready, status
        """)
        .param("farmId", body.get("farmId")).param("owner", user.id()).param("cropType", body.get("cropType"))
        .param("plantingDate", body.get("plantingDate")).param("notes", body.get("notes"))
        .query(DatabaseRowMapper::toMap).single();
    return Map.of("cropCycle", cycle);
  }

  public Map<String, Object> createInputLog(CurrentUser user, Map<String, Object> body) {
    int withdrawalDays = Number.class.isInstance(body.get("withdrawalPeriodDays")) ? ((Number) body.get("withdrawalPeriodDays")).intValue() : 0;
    LocalDate applicationDate = LocalDate.parse(String.valueOf(body.get("applicationDate")));
    Map<String, Object> log = jdbc.sql("""
        INSERT INTO input_logs (crop_cycle_id, input_type, product_name, epa_approval_status, application_date, concentration, unit, withdrawal_period_days, safe_harvest_date)
        SELECT cc.id, CAST(:inputType AS input_type), :productName, 'unverified', :applicationDate, :concentration, :unit, :withdrawalDays, :safeHarvestDate
        FROM crop_cycles cc
        JOIN farms f ON f.id = cc.farm_id
        WHERE cc.id = :cycleId AND f.owner_id = :owner
        RETURNING id, crop_cycle_id, input_type, product_name, application_date, withdrawal_period_days, safe_harvest_date, epa_approval_status
        """)
        .param("cycleId", body.get("cropCycleId")).param("owner", user.id()).param("inputType", body.get("inputType"))
        .param("productName", body.get("productName")).param("applicationDate", applicationDate)
        .param("concentration", body.get("concentration")).param("unit", body.get("unit"))
        .param("withdrawalDays", withdrawalDays).param("safeHarvestDate", applicationDate.plusDays(withdrawalDays))
        .query(DatabaseRowMapper::toMap).single();
    return Map.of("inputLog", log, "safeHarvestDate", log.get("safeHarvestDate"));
  }

  public Map<String, Object> markReady(CurrentUser user, Map<String, Object> body) {
    Map<String, Object> cycle = jdbc.sql("""
        UPDATE crop_cycles cc
        SET market_ready = :ready,
            market_ready_at = CASE WHEN :ready THEN now() ELSE NULL END,
            harvest_date = COALESCE(CAST(:harvestDate AS date), harvest_date),
            status = CASE WHEN :ready THEN 'ready' ELSE 'growing' END
        FROM farms f
        WHERE cc.id = :cycleId AND f.id = cc.farm_id AND f.owner_id = :owner
        RETURNING cc.id, cc.farm_id, cc.crop_type, cc.planting_date, cc.harvest_date, cc.market_ready, cc.status
        """)
        .param("cycleId", body.get("cropCycleId")).param("owner", user.id()).param("ready", body.get("marketReady"))
        .param("harvestDate", body.get("harvestDate"))
        .query(DatabaseRowMapper::toMap).single();
    return Map.of("cropCycle", cycle);
  }

  private String[] cropTypes(Object value) {
    if (value instanceof List<?> list) {
      return list.stream().map(String::valueOf).toArray(String[]::new);
    }
    if (value != null && value.getClass().isArray()) {
      int length = Array.getLength(value);
      String[] result = new String[length];
      for (int i = 0; i < length; i++) {
        result[i] = String.valueOf(Array.get(value, i));
      }
      return result;
    }
    return new String[0];
  }
}
