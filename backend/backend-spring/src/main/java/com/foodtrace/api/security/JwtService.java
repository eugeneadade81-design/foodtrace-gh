package com.foodtrace.api.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.foodtrace.api.config.AppProperties;
import java.time.Instant;
import java.util.Date;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final Algorithm algorithm;

  public JwtService(AppProperties properties) {
    this.algorithm = Algorithm.HMAC256(properties.jwtSecret());
  }

  public String sign(CurrentUser user) {
    Instant now = Instant.now();
    return JWT.create()
        .withSubject(user.id())
        .withClaim("role", user.role())
        .withClaim("fullName", user.fullName())
        .withIssuedAt(Date.from(now))
        .withExpiresAt(Date.from(now.plusSeconds(60L * 60L * 24L * 7L)))
        .sign(algorithm);
  }

  public CurrentUser verify(String token) {
    DecodedJWT jwt = JWT.require(algorithm).build().verify(token);
    return new CurrentUser(jwt.getSubject(), jwt.getClaim("role").asString(), jwt.getClaim("fullName").asString());
  }
}
