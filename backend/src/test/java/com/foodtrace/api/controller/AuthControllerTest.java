package com.foodtrace.api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.foodtrace.api.dto.ApiDtos.AuthResponse;
import com.foodtrace.api.dto.ApiDtos.AuthUser;
import com.foodtrace.api.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

  @Autowired MockMvc mockMvc;
  @MockBean JdbcClient jdbcClient;
  @MockBean AuthService authService;

  @Test
  void register_returns_token_and_user() throws Exception {
    when(authService.register(any())).thenReturn(
        new AuthResponse("jwt-token-here",
            new AuthUser("abc", "Test User", "+233200000001", null,
                "consumer", "en", false, true)));

    mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"fullName":"Test User","phone":"+233200000001","password":"test1234","role":"consumer"}
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").value("jwt-token-here"))
        .andExpect(jsonPath("$.user.role").value("consumer"));
  }

  @Test
  void login_returns_token() throws Exception {
    when(authService.login(any())).thenReturn(
        new AuthResponse("jwt-token-here",
            new AuthUser("abc", "Ama Farmer", "+233200000001", null,
                "farmer", "en", true, true)));

    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"identifier":"+233200000001","password":"test1234"}
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").value("jwt-token-here"))
        .andExpect(jsonPath("$.user.role").value("farmer"));
  }

  @Test
  void login_returns_401_on_wrong_password() throws Exception {
    when(authService.login(any()))
        .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"identifier":"+233200000001","password":"wrong"}
                """))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void me_returns_401_without_token() throws Exception {
    mockMvc.perform(get("/api/auth/me"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void roles_returns_list_without_auth() throws Exception {
    mockMvc.perform(get("/api/auth/roles"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.roles").isArray());
  }
}
