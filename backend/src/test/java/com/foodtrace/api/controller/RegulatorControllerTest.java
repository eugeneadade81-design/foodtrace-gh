package com.foodtrace.api.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.foodtrace.api.service.AuditLogService;
import com.foodtrace.api.service.RegulatorService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class RegulatorControllerTest {

  @Autowired MockMvc mockMvc;
  @MockBean JdbcClient jdbcClient;
  @MockBean RegulatorService regulatorService;
  @MockBean AuditLogService auditLogService;

  @Test
  @WithMockUser(roles = "REGULATOR")
  void audit_logs_returns_recent_entries() throws Exception {
    when(auditLogService.recent(eq(100))).thenReturn(List.of(
        Map.of("action", "recall.issued", "entityType", "product_batch", "actorName", "Accra Foods Admin",
            "actorRole", "manufacturer", "metadata", Map.of("reason", "Test", "issuedBy", "manufacturer"))));

    mockMvc.perform(get("/api/regulator/audit-logs"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.logs[0].action").value("recall.issued"))
        .andExpect(jsonPath("$.logs[0].actorRole").value("manufacturer"));
  }

  @Test
  void audit_logs_requires_regulator_role() throws Exception {
    mockMvc.perform(get("/api/regulator/audit-logs"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "FARMER")
  void audit_logs_rejects_non_regulator_role() throws Exception {
    mockMvc.perform(get("/api/regulator/audit-logs"))
        .andExpect(status().isForbidden());
  }
}
