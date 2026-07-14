package com.foodtrace.api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.foodtrace.api.service.DrugService;
import com.foodtrace.api.service.ScanService;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class DrugControllerTest {

  @Autowired MockMvc mockMvc;
  @MockBean JdbcClient jdbcClient;
  @MockBean ScanService scanService;
  @MockBean DrugService drugService;

  @Test
  void scan_drug_is_public_no_auth_required() throws Exception {
    when(scanService.scanDrug(eq("DR-QR-1001"), any())).thenReturn(Map.of(
        "codeString", "DR-QR-1001", "status", "safe", "title", "Medicine Verified", "summary", "s"));

    mockMvc.perform(get("/api/drug/scan/DR-QR-1001"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.result.status").value("safe"));
  }

  @Test
  void scan_drug_without_auth_passes_null_userId() throws Exception {
    when(scanService.scanDrug(eq("DR-QR-1001"), any())).thenReturn(Map.of(
        "codeString", "DR-QR-1001", "status", "safe", "title", "t", "summary", "s"));

    mockMvc.perform(get("/api/drug/scan/DR-QR-1001")).andExpect(status().isOk());

    verify(scanService).scanDrug(eq("DR-QR-1001"), eq(null));
  }

  @Test
  void scan_unknown_drug_code_returns_not_found() throws Exception {
    when(scanService.scanDrug(eq("UNKNOWN"), any())).thenReturn(Map.of(
        "codeString", "UNKNOWN", "status", "not_found", "title", "No match found", "summary", "s"));

    mockMvc.perform(get("/api/drug/scan/UNKNOWN"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.result.status").value("not_found"));
  }
}
