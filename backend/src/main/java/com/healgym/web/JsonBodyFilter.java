package com.healgym.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class JsonBodyFilter extends OncePerRequestFilter {

  public static final String BODY_ATTRIBUTE = "healgym.body";

  private static final int LIMIT_BYTES = 100 * 1024;
  private static final ObjectMapper MAPPER = new ObjectMapper();

  @Override
  @SuppressWarnings("unchecked")
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    Map<String, Object> body = new LinkedHashMap<>();

    String contentType = request.getContentType();
    boolean json =
        contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("application/json");

    if (json) {
      byte[] bytes = request.getInputStream().readNBytes(LIMIT_BYTES + 1);
      if (bytes.length > LIMIT_BYTES) {
        ErrorResponses.writeInternal(response, new RuntimeException("request entity too large"));
        return;
      }

      String text = new String(bytes, StandardCharsets.UTF_8);
      if (text.startsWith("\uFEFF")) {
        text = text.substring(1);
      }
      String trimmed = text.trim();

      if (!trimmed.isEmpty()) {
        char first = trimmed.charAt(0);
        if (first != '{' && first != '[') {
          ErrorResponses.writeInternal(response, new RuntimeException("Unexpected token in JSON"));
          return;
        }
        try {
          Object parsed = MAPPER.readValue(trimmed, Object.class);
          if (parsed instanceof Map) {
            body = (Map<String, Object>) parsed;
          }
        } catch (IOException e) {
          ErrorResponses.writeInternal(response, e);
          return;
        }
      }
    }

    request.setAttribute(BODY_ATTRIBUTE, body);
    chain.doFilter(request, response);
  }
}
