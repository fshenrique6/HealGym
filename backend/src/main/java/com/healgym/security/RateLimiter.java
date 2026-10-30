package com.healgym.security;

import com.healgym.util.Json;
import com.healgym.web.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.HashMap;
import java.util.Map;

public class RateLimiter {

  private static final class Entry {
    int hits;
    long resetTime;
  }

  private final long windowMs;
  private final int limit;
  private final String message;
  private final Map<String, Entry> store = new HashMap<>();

  public RateLimiter(long windowMs, int limit, String message) {
    this.windowMs = windowMs;
    this.limit = limit;
    this.message = message;
  }

  public void check(HttpServletRequest request, HttpServletResponse response) {
    String key = ClientIp.of(request);
    long now = System.currentTimeMillis();

    int totalHits;
    long resetTime;
    synchronized (store) {
      store.values().removeIf(entry -> entry.resetTime <= now);
      Entry entry = store.get(key);
      if (entry == null) {
        entry = new Entry();
        entry.resetTime = now + windowMs;
        store.put(key, entry);
      }
      entry.hits++;
      totalHits = entry.hits;
      resetTime = entry.resetTime;
    }

    long resetSeconds = Math.max(0, (long) Math.ceil((resetTime - now) / 1000.0));
    int remaining = Math.max(0, limit - totalHits);

    response.setHeader("RateLimit-Policy", limit + ";w=" + (windowMs / 1000));
    response.setHeader(
        "RateLimit", "limit=" + limit + ", remaining=" + remaining + ", reset=" + resetSeconds);

    if (totalHits > limit) {
      response.setHeader("Retry-After", String.valueOf(resetSeconds));
      throw new ApiException(429, Json.obj("error", message));
    }
  }
}
