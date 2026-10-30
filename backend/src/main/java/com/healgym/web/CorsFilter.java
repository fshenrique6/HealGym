package com.healgym.web;

import com.healgym.config.Env;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class CorsFilter extends OncePerRequestFilter {

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String origin = request.getHeader("Origin");

    boolean allowed = origin == null || isAllowed(origin);
    if (!allowed) {
      ErrorResponses.writeInternal(response, new RuntimeException("Not allowed by CORS"));
      return;
    }

    if (origin != null) {
      response.setHeader("Access-Control-Allow-Origin", origin);
    }
    response.addHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Credentials", "true");

    if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
      response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
      response.setStatus(204);
      response.setHeader("Content-Length", "0");
      return;
    }

    chain.doFilter(request, response);
  }

  private boolean isAllowed(String origin) {
    String normalized = normalize(origin);
    if (!"production".equals(Env.get("NODE_ENV")) && LOCAL_ORIGINS.contains(normalized)) {
      return true;
    }
    return configuredOrigins().contains(normalized);
  }

  private static String normalize(String origin) {
    String value = origin.trim();
    while (value.endsWith("/")) {
      value = value.substring(0, value.length() - 1);
    }
    return value;
  }

  private static Set<String> configuredOrigins() {
    Set<String> origins = new LinkedHashSet<>();
    addOrigins(origins, Env.get("FRONTEND_URL"));
    addOrigins(origins, Env.get("CORS_ORIGINS"));
    return origins;
  }

  private static void addOrigins(Set<String> origins, String raw) {
    if (raw == null || raw.isEmpty()) {
      return;
    }
    for (String part : raw.split(",")) {
      String origin = normalize(part);
      if (!origin.isEmpty()) {
        origins.add(origin);
      }
    }
  }

  private static final List<String> LOCAL_ORIGINS =
      List.of(
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:5173",
          "http://127.0.0.1:5173",
          "http://localhost:4173",
          "http://127.0.0.1:4173");
}
