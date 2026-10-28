package com.healgym.security;

import com.healgym.config.Env;
import com.healgym.util.Js;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;

public final class ClientIp {

  private ClientIp() {}

  public static String of(HttpServletRequest request) {
    double configured = Js.toNumber(Env.hasValue("TRUST_PROXY_HOPS") ? Env.get("TRUST_PROXY_HOPS") : "1");
    int hops = Double.isNaN(configured) ? 0 : (int) configured;

    List<String> addresses = new ArrayList<>();
    addresses.add(request.getRemoteAddr());

    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isEmpty()) {
      String[] parts = forwarded.split(",");
      for (int i = parts.length - 1; i >= 0; i--) {
        String part = parts[i].trim();
        if (!part.isEmpty()) {
          addresses.add(part);
        }
      }
    }

    for (int i = 0; i < addresses.size() - 1; i++) {
      if (i < hops) {
        continue;
      }
      return addresses.get(i);
    }
    return addresses.get(addresses.size() - 1);
  }
}
