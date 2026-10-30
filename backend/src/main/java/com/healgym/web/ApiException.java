package com.healgym.web;

import java.util.Map;

public class ApiException extends RuntimeException {

  private final int status;
  private final transient Map<String, Object> body;

  public ApiException(int status, Map<String, Object> body) {
    super(null, null, false, false);
    this.status = status;
    this.body = body;
  }

  public int getStatus() {
    return status;
  }

  public Map<String, Object> getBody() {
    return body;
  }
}
