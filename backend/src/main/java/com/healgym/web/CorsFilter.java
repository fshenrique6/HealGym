package com.healgym.web;

import com.healgym.config.Env;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
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
    if (!"production".equals(Env.get("NODE_ENV"))) {
      return true;
    }

    List<String> allowedOrigins = new ArrayList<>();
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://localhost:5173");
    String frontendUrl = Env.get("FRONTEND_URL");
    if (frontendUrl != null && !frontendUrl.isEmpty()) {
      allowedOrigins.add(frontendUrl);
    }
    return allowedOrigins.contains(origin);
  }
}
