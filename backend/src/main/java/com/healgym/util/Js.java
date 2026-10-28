package com.healgym.util;

import java.math.BigDecimal;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class Js {

  private static final DateTimeFormatter ISO =
      DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

  private static final Pattern NUMBER_LITERAL =
      Pattern.compile("^[+-]?(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?$");
  private static final Pattern FLOAT_PREFIX =
      Pattern.compile("^[+-]?(\\d+\\.?\\d*([eE][+-]?\\d+)?|\\.\\d+([eE][+-]?\\d+)?)");
  private static final Pattern INT_PREFIX = Pattern.compile("^[+-]?\\d+");

  private Js() {}

  public static String iso(Date date) {
    return ISO.format(date.toInstant());
  }

  public static boolean truthy(Object value) {
    if (value == null) {
      return false;
    }
    if (value instanceof Boolean) {
      return (Boolean) value;
    }
    if (value instanceof Number) {
      double d = ((Number) value).doubleValue();
      return d != 0 && !Double.isNaN(d);
    }
    if (value instanceof String) {
      return !((String) value).isEmpty();
    }
    return true;
  }

  public static String trim(String value) {
    int start = 0;
    int end = value.length();
    while (start < end && isJsWhitespace(value.charAt(start))) {
      start++;
    }
    while (end > start && isJsWhitespace(value.charAt(end - 1))) {
      end--;
    }
    return value.substring(start, end);
  }

  private static boolean isJsWhitespace(char c) {
    return c == '\u0009'
        || c == '\u000B'
        || c == '\u000C'
        || c == ' '
        || c == '\u00A0'
        || c == '\uFEFF'
        || c == '\n'
        || c == '\r'
        || c == '\u2028'
        || c == '\u2029'
        || Character.getType(c) == Character.SPACE_SEPARATOR;
  }

  public static String numberToString(double d) {
    if (Double.isNaN(d)) {
      return "NaN";
    }
    if (Double.isInfinite(d)) {
      return d > 0 ? "Infinity" : "-Infinity";
    }
    if (d == 0) {
      return "0";
    }
    if (Math.abs(d) < 1e21 && Math.abs(d) >= 1e-6) {
      return new BigDecimal(Double.toString(d)).stripTrailingZeros().toPlainString();
    }
    return Double.toString(d);
  }

  public static String toStr(Object value) {
    if (value == null) {
      return "";
    }
    if (value instanceof String) {
      return (String) value;
    }
    if (value instanceof Boolean) {
      return value.toString();
    }
    if (value instanceof Number) {
      Number n = (Number) value;
      if (n instanceof Integer || n instanceof Long || n instanceof Short || n instanceof Byte) {
        return n.toString();
      }
      return numberToString(n.doubleValue());
    }
    if (value instanceof List) {
      StringJoiner joiner = new StringJoiner(",");
      for (Object item : (List<?>) value) {
        joiner.add(item == null ? "" : toStr(item));
      }
      return joiner.toString();
    }
    if (value instanceof Map) {
      return "[object Object]";
    }
    if (value instanceof Date) {
      return iso((Date) value);
    }
    return value.toString();
  }

  public static double toNumber(Object value) {
    if (value == null) {
      return 0;
    }
    if (value instanceof Number) {
      return ((Number) value).doubleValue();
    }
    if (value instanceof Boolean) {
      return ((Boolean) value) ? 1 : 0;
    }
    if (value instanceof String) {
      String s = trim((String) value);
      if (s.isEmpty()) {
        return 0;
      }
      if (NUMBER_LITERAL.matcher(s).matches()) {
        return Double.parseDouble(s);
      }
      if (s.equals("Infinity") || s.equals("+Infinity")) {
        return Double.POSITIVE_INFINITY;
      }
      if (s.equals("-Infinity")) {
        return Double.NEGATIVE_INFINITY;
      }
      if (s.matches("^0[xX][0-9a-fA-F]+$")) {
        return (double) Long.parseLong(s.substring(2), 16);
      }
      return Double.NaN;
    }
    if (value instanceof List) {
      List<?> list = (List<?>) value;
      if (list.isEmpty()) {
        return 0;
      }
      if (list.size() == 1) {
        return toNumber(list.get(0));
      }
      return Double.NaN;
    }
    return Double.NaN;
  }

  public static double parseFloat(Object value) {
    String s = trim(toStr(value));
    Matcher m = FLOAT_PREFIX.matcher(s);
    if (m.find()) {
      return Double.parseDouble(m.group());
    }
    if (s.startsWith("Infinity") || s.startsWith("+Infinity")) {
      return Double.POSITIVE_INFINITY;
    }
    if (s.startsWith("-Infinity")) {
      return Double.NEGATIVE_INFINITY;
    }
    return Double.NaN;
  }

  public static double parseInt(Object value) {
    String s = trim(toStr(value));
    Matcher m = INT_PREFIX.matcher(s);
    if (m.find()) {
      return new BigDecimal(m.group().startsWith("+") ? m.group().substring(1) : m.group())
          .doubleValue();
    }
    return Double.NaN;
  }

  public static double round(double value) {
    return Math.floor(value + 0.5);
  }
}
