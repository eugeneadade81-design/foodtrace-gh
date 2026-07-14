package com.foodtrace.api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.foodtrace.api.service.FoodService;
import com.foodtrace.api.service.WeatherService;
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
class FoodControllerTest {

  @Autowired MockMvc mockMvc;
  @MockBean JdbcClient jdbcClient;
  @MockBean FoodService foodService;
  @MockBean WeatherService weatherService;

  @Test
  @WithMockUser(roles = "FARMER")
  void pesticides_search_returns_matches() throws Exception {
    when(foodService.searchPesticides(eq("fura"))).thenReturn(List.of(
        Map.of("name", "Furadan", "activeIngredient", "Carbofuran", "epaStatus", "banned",
            "withdrawalDays", 0, "healthRisks", "Highly toxic", "banReason", "Banned by EPA Ghana in 2015")));

    mockMvc.perform(get("/api/food/pesticides").param("q", "fura"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pesticides[0].name").value("Furadan"))
        .andExpect(jsonPath("$.pesticides[0].epaStatus").value("banned"));
  }

  @Test
  @WithMockUser(roles = "FARMER")
  void pesticides_with_no_query_returns_full_list() throws Exception {
    when(foodService.searchPesticides(isNull())).thenReturn(List.of(
        Map.of("name", "Confidor", "epaStatus", "approved"),
        Map.of("name", "Furadan", "epaStatus", "banned")));

    mockMvc.perform(get("/api/food/pesticides"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pesticides.length()").value(2));
  }

  @Test
  void food_endpoints_require_authentication() throws Exception {
    mockMvc.perform(get("/api/food/pesticides").param("q", "fura"))
        .andExpect(status().isUnauthorized());
  }
}
