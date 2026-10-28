package com.healgym.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healgym.config.Env;
import com.healgym.util.Json;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public class JwtService {

  public static class JwtFailure extends RuntimeException {
    private final boolean expired;

    public JwtFailure(String message, boolean expired) {
      super(message, null, false, false);
      this.expired = expired;
    }

    public boolean isExpired() {
      return expired;
    }
  }

  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
  private static final Base64.Decoder DECODER = Base64.getUrlDecoder();
  private static final Pattern DURATION =
      Pattern.compile(
          "^(-?(?:\\d+)?\\.?\\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$",
          Pattern.CASE_INSENSITIVE);

  public String sign(String userId) {
    try {
      String expiresIn = Env.orDefault("JWT_EXPIRE", "7d");
      double milliseconds = parseDuration(expiresIn);
      long issuedAt = System.currentTimeMillis() / 1000;
      long expiresAt = (long) Math.floor(issuedAt + milliseconds / 1000);

      String header =
          ENCODER.encodeToString(
              MAPPER.writeValueAsBytes(Json.obj("alg", "HS256", "typ", "JWT")));
      String payload =
          ENCODER.encodeToString(
              MAPPER.writeValueAsBytes(
                  Json.obj("userId", userId, "iat", issuedAt, "exp", expiresAt)));

      String content = header + "." + payload;
      return content + "." + ENCODER.encodeToString(hmac("HmacSHA256", content));
    } catch (Exception e) {
      throw new IllegalStateException(e.getMessage(), e);
    }
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> verify(String token) {
    String[] parts = token.split("\\.", -1);
    if (parts.length != 3) {
      throw new JwtFailure("jwt malformed", false);
    }

    Map<String, Object> header;
    Map<String, Object> payload;
    try {
      header = MAPPER.readValue(DECODER.decode(parts[0]), Map.class);
      payload = MAPPER.readValue(DECODER.decode(parts[1]), Map.class);
    } catch (Exception e) {
      throw new JwtFailure("invalid token", false);
    }

    if (header == null || payload == null) {
      throw new JwtFailure("invalid token", false);
    }
    if (parts[2].isEmpty()) {
      throw new JwtFailure("jwt signature is required", false);
    }

    String algorithm = String.valueOf(header.get("alg"));
    String macAlgorithm;
    switch (algorithm) {
      case "HS256":
        macAlgorithm = "HmacSHA256";
        break;
      case "HS384":
        macAlgorithm = "HmacSHA384";
        break;
      case "HS512":
        macAlgorithm = "HmacSHA512";
        break;
      default:
        throw new JwtFailure("invalid algorithm", false);
    }

    byte[] expected;
    byte[] provided;
    try {
      expected = hmac(macAlgorithm, parts[0] + "." + parts[1]);
      provided = DECODER.decode(parts[2]);
    } catch (Exception e) {
      throw new JwtFailure("invalid signature", false);
    }
    if (!MessageDigest.isEqual(expected, provided)) {
      throw new JwtFailure("invalid signature", false);
    }

    Object exp = payload.get("exp");
    if (exp instanceof Number) {
      long now = System.currentTimeMillis() / 1000;
      if (now >= ((Number) exp).doubleValue()) {
        throw new JwtFailure("jwt expired", true);
      }
    } else if (exp != null) {
      throw new JwtFailure("invalid exp value", false);
    }

    return payload;
  }

  private byte[] hmac(String algorithm, String content) throws GeneralSecurityException {
    byte[] secret = Env.orDefault("JWT_SECRET", "").getBytes(StandardCharsets.UTF_8);
    Mac mac = Mac.getInstance(algorithm);
    mac.init(new SecretKeySpec(secret.length == 0 ? new byte[] {0} : secret, algorithm));
    return mac.doFinal(content.getBytes(StandardCharsets.UTF_8));
  }

  private double parseDuration(String value) {
    Matcher matcher = DURATION.matcher(value.trim());
    if (!matcher.matches()) {
      throw new IllegalArgumentException(
          "\"expiresIn\" should be a number of seconds or string representing a timespan");
    }

    double n = Double.parseDouble(matcher.group(1));
    String unit = matcher.group(2) == null ? "ms" : matcher.group(2).toLowerCase(Locale.ROOT);

    switch (unit) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * 31557600000.0;
      case "weeks":
      case "week":
      case "w":
        return n * 604800000.0;
      case "days":
      case "day":
      case "d":
        return n * 86400000.0;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * 3600000.0;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * 60000.0;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * 1000.0;
      default:
        return n;
    }
  }
}
