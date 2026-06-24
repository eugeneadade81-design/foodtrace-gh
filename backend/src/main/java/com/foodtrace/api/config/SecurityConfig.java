package com.foodtrace.api.config;

import com.foodtrace.api.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
    CorsConfiguration corsConfig = new CorsConfiguration();
    corsConfig.addAllowedOriginPattern("*");
    corsConfig.addAllowedMethod("*");
    corsConfig.addAllowedHeader("*");
    corsConfig.setAllowCredentials(false);
    UrlBasedCorsConfigurationSource corsSource = new UrlBasedCorsConfigurationSource();
    corsSource.registerCorsConfiguration("/**", corsConfig);

    return http
        .cors(cors -> cors.configurationSource(corsSource))
        .csrf(csrf -> csrf.disable())
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) ->
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
        .authorizeHttpRequests(auth -> auth
            // Public: auth endpoints
            .requestMatchers("/api/auth/roles", "/api/auth/register", "/api/auth/login",
                "/api/auth/request-otp", "/api/auth/verify-otp").permitAll()
            // Public: consumers can scan food or drug QR without logging in
            .requestMatchers(HttpMethod.GET, "/api/scan/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/drug/scan/**",
                "/api/drugs/scan/**", "/api/pharmacy/scan/**").permitAll()
            // Public: static assets and health
            .requestMatchers("/uploads/**", "/actuator/**").permitAll()
            // Role-guarded: farmer portal
            .requestMatchers("/api/food/**", "/api/farmer/**")
                .hasAnyRole("FARMER", "REGULATOR")
            // Role-guarded: manufacturer portal
            .requestMatchers("/api/manufacturer/**")
                .hasAnyRole("MANUFACTURER", "REGULATOR")
            // Role-guarded: regulator portal
            .requestMatchers("/api/regulator/**").hasRole("REGULATOR")
            // Role-guarded: pharmacy portal (drug scan GET is already permitAll above)
            .requestMatchers("/api/drug/**", "/api/drugs/**", "/api/pharmacy/**")
                .hasAnyRole("PHARMACIST", "REGULATOR")
            // Everything else (scan POST/report, /api/auth/me, assistant, audio) needs a valid JWT
            .anyRequest().authenticated()
        )
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }
}
