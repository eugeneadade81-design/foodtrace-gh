package com.foodtrace.api.config;

import com.foodtrace.api.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
    return http
        .cors(cors -> cors.configurationSource(request -> {
          var config = new org.springframework.web.cors.CorsConfiguration();
          config.addAllowedOriginPattern("*");
          config.addAllowedMethod("*");
          config.addAllowedHeader("*");
          config.setAllowCredentials(false);
          return config;
        }))
        .csrf(csrf -> csrf.disable())
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(
                AntPathRequestMatcher.antMatcher("/health"),
                AntPathRequestMatcher.antMatcher("/api"),
                AntPathRequestMatcher.antMatcher("/api/auth/**"),
                AntPathRequestMatcher.antMatcher("/api/scan/**"),
                AntPathRequestMatcher.antMatcher("/api/drug/scan/**"),
                AntPathRequestMatcher.antMatcher("/api/assistant/**"),
                AntPathRequestMatcher.antMatcher("/api/sms/**"),
                AntPathRequestMatcher.antMatcher("/api/ussd/**"),
                AntPathRequestMatcher.antMatcher("/uploads/**")
            ).permitAll()
            .anyRequest().authenticated())
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }
}
