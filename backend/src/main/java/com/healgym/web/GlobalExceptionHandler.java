package com.healgym.web;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Map<String, Object>> handleApi(ApiException exception) {
    return ResponseEntity.status(exception.getStatus()).body(exception.getBody());
  }

  @ExceptionHandler({
    NoHandlerFoundException.class,
    NoResourceFoundException.class,
    HttpRequestMethodNotSupportedException.class
  })
  public ResponseEntity<Map<String, Object>> handleNotFound(HttpServletRequest request) {
    return ResponseEntity.status(404).body(ErrorResponses.notFound(request));
  }

  @ExceptionHandler(Throwable.class)
  public ResponseEntity<Map<String, Object>> handleUnexpected(Throwable error) {
    System.err.println("❌ Erro no servidor: " + error);
    return ResponseEntity.status(500).body(ErrorResponses.internal(error));
  }
}
