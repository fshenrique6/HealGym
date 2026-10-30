package com.healgym.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healgym.config.Env;
import com.healgym.util.Json;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

public final class ErrorResponses {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private ErrorResponses() {}

  public static Map<String, Object> internal(Throwable error) {
    String message =
        "development".equals(Env.get("NODE_ENV"))
            ? String.valueOf(error.getMessage())
            : "Algo deu errado";
    return Json.obj("error", "Erro interno do servidor", "message", message);
  }

  public static Map<String, Object> notFound(HttpServletRequest request) {
    String query = request.getQueryString();
    String path = request.getRequestURI() + (query == null ? "" : "?" + query);
    return Json.obj("error", "404 - Route not found", "method", request.getMethod(), "path", path);
  }

  public static void write(HttpServletResponse response, int status, Map<String, Object> body)
      throws IOException {
    byte[] bytes = MAPPER.writeValueAsBytes(Json.convert(body));
    response.setStatus(status);
    response.setContentType("application/json;charset=utf-8");
    response.setContentLength(bytes.length);
    response.getOutputStream().write(bytes);
    response.getOutputStream().flush();
  }

  public static void writeInternal(HttpServletResponse response, Throwable error)
      throws IOException {
    System.err.println("❌ Erro no servidor: " + error);
    write(response, 500, internal(error));
  }
}
