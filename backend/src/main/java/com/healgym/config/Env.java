package com.healgym.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class Env {

  private static final Map<String, String> FILE_VALUES = new HashMap<>();

  private Env() {}

  public static void load() {
    Path path = Paths.get(".env");
    if (!Files.isRegularFile(path)) {
      return;
    }

    List<String> lines;
    try {
      lines = Files.readAllLines(path, StandardCharsets.UTF_8);
    } catch (IOException e) {
      return;
    }

    for (String rawLine : lines) {
      String line = rawLine.replace("\uFEFF", "").trim();
      if (line.isEmpty() || line.startsWith("#")) {
        continue;
      }
      if (line.startsWith("export ")) {
        line = line.substring(7).trim();
      }

      int separator = line.indexOf('=');
      if (separator <= 0) {
        continue;
      }

      String key = line.substring(0, separator).trim();
      String value = line.substring(separator + 1).trim();

      if (value.length() >= 2
          && (value.startsWith("\"") && value.indexOf('"', 1) > 0)) {
        int end = value.indexOf('"', 1);
        value = value.substring(1, end).replace("\\n", "\n").replace("\\r", "\r");
      } else if (value.length() >= 2
          && (value.startsWith("'") && value.indexOf('\'', 1) > 0)) {
        int end = value.indexOf('\'', 1);
        value = value.substring(1, end);
      } else if (value.length() >= 2
          && (value.startsWith("`") && value.indexOf('`', 1) > 0)) {
        int end = value.indexOf('`', 1);
        value = value.substring(1, end);
      } else {
        int comment = value.indexOf('#');
        if (comment >= 0) {
          value = value.substring(0, comment);
        }
        value = value.trim();
      }

      FILE_VALUES.putIfAbsent(key, value);
    }
  }

  public static String get(String key) {
    String value = System.getenv(key);
    if (value != null) {
      return value;
    }
    return FILE_VALUES.get(key);
  }

  public static String orDefault(String key, String fallback) {
    String value = get(key);
    if (value == null || value.isEmpty()) {
      return fallback;
    }
    return value;
  }

  public static boolean hasValue(String key) {
    String value = get(key);
    return value != null && !value.isEmpty();
  }
}
