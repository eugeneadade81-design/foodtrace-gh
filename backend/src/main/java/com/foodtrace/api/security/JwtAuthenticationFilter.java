package com.foodtrace.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtService jwtService;

  public JwtAuthenticationFilter(JwtService jwtService) {
    this.jwtService = jwtService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      try {
        CurrentUser user = jwtService.verify(header.substring("Bearer ".length()));
        var auth = new AbstractAuthenticationToken(List.of(new SimpleGrantedAuthority("ROLE_" + user.role().toUpperCase()))) {
          @Override
          public Object getCredentials() {
            return "";
          }

          @Override
          public Object getPrincipal() {
            return user;
          }
        };
        auth.setAuthenticated(true);
        SecurityContextHolder.getContext().setAuthentication(auth);
      } catch (RuntimeException ignored) {
        SecurityContextHolder.clearContext();
      }
    }
    filterChain.doFilter(request, response);
  }
}
