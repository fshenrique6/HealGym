package com.healgym.controller;

import com.healgym.util.Json;
import com.healgym.validation.Validator;
import com.healgym.web.ApiException;
import com.healgym.web.JsonBodyFilter;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;

public abstract class BaseController {

  @SuppressWarnings("unchecked")
  protected Map<String, Object> body(HttpServletRequest request) {
    Object body = request.getAttribute(JsonBodyFilter.BODY_ATTRIBUTE);
    if (body instanceof Map) {
      return (Map<String, Object>) body;
    }
    return new LinkedHashMap<>();
  }

  protected ResponseEntity<Object> json(int status, Map<String, Object> payload) {
    return ResponseEntity.status(status).body(Json.convert(payload));
  }

  protected ResponseEntity<Object> ok(Map<String, Object> payload) {
    return json(200, payload);
  }

  protected ApiException error(int status, String message) {
    return new ApiException(status, Json.obj("error", message));
  }

  protected ApiException internalError() {
    return error(500, "Erro interno do servidor");
  }

  protected void failOnValidationErrors(Validator validator) {
    if (validator.hasErrors()) {
      throw new ApiException(
          400, Json.obj("error", validator.messages(), "details", validator.errors()));
    }
  }
}
