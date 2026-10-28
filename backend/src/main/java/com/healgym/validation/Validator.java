package com.healgym.validation;

import com.healgym.util.Js;
import com.healgym.util.Json;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.regex.Pattern;

public class Validator {

  private static final Pattern FLOAT_PATTERN =
      Pattern.compile("^(?:[-+])?(?:[0-9]+)?(?:\\.[0-9]*)?(?:[eE][+\\-]?(?:[0-9]+))?$");
  private static final Pattern INT_PATTERN = Pattern.compile("^[-+]?[0-9]+$");

  private final Map<String, Object> body;
  private final List<Map<String, Object>> errors = new ArrayList<>();

  public Validator(Map<String, Object> body) {
    this.body = body;
  }

  public Field field(String path) {
    return new Field(path);
  }

  public boolean hasErrors() {
    return !errors.isEmpty();
  }

  public List<Map<String, Object>> errors() {
    return errors;
  }

  public String messages() {
    List<String> messages = new ArrayList<>();
    for (Map<String, Object> error : errors) {
      messages.add(String.valueOf(error.get("msg")));
    }
    return String.join("; ", messages);
  }

  public class Field {

    private final String path;
    private boolean skipped = false;

    private Field(String path) {
      this.path = path;
    }

    public Field optional() {
      if (!body.containsKey(path)) {
        skipped = true;
      }
      return this;
    }

    private void fail(String message) {
      Map<String, Object> error = Json.obj("type", "field");
      if (body.containsKey(path)) {
        error.put("value", body.get(path));
      }
      error.put("msg", message);
      error.put("path", path);
      error.put("location", "body");
      errors.add(error);
    }

    private String text() {
      return Js.toStr(body.get(path));
    }

    public Field trim() {
      if (skipped) {
        return this;
      }
      body.put(path, Js.trim(text()));
      return this;
    }

    public Field isLength(int min, Integer max, String message) {
      if (skipped) {
        return this;
      }
      String value = text();
      int length = value.codePointCount(0, value.length());
      if (!(length >= min && (max == null || length <= max))) {
        fail(message);
      }
      return this;
    }

    public Field notEmpty(String message) {
      if (skipped) {
        return this;
      }
      if (text().isEmpty()) {
        fail(message);
      }
      return this;
    }

    public Field isEmail(String message) {
      if (skipped) {
        return this;
      }
      if (!EmailRules.isEmail(text())) {
        fail(message);
      }
      return this;
    }

    public Field normalizeEmail() {
      if (skipped) {
        return this;
      }
      String normalized = EmailRules.normalizeEmail(text());
      body.put(path, normalized == null ? Boolean.FALSE : normalized);
      return this;
    }

    public Field isIn(List<String> values, String message) {
      if (skipped) {
        return this;
      }
      if (!values.contains(text())) {
        fail(message);
      }
      return this;
    }

    public Field isFloat(double min, double max, String message) {
      if (skipped) {
        return this;
      }
      String value = text();
      boolean valid = false;
      if (!(value.isEmpty() || value.equals(".") || value.equals("-") || value.equals("+"))) {
        double parsed = Js.parseFloat(value.replace(',', '.'));
        valid = FLOAT_PATTERN.matcher(value).matches() && parsed >= min && parsed <= max;
      }
      if (!valid) {
        fail(message);
      }
      return this;
    }

    public Field isInt(double min, double max, String message) {
      if (skipped) {
        return this;
      }
      String value = text();
      boolean valid = false;
      if (INT_PATTERN.matcher(value).matches()) {
        double parsed = Js.parseInt(value);
        valid = parsed >= min && parsed <= max;
      }
      if (!valid) {
        fail(message);
      }
      return this;
    }

    public Field matches(Pattern pattern, String message) {
      if (skipped) {
        return this;
      }
      if (!pattern.matcher(text()).find()) {
        fail(message);
      }
      return this;
    }

    public Field custom(BiPredicate<Object, Map<String, Object>> check, String message) {
      if (skipped) {
        return this;
      }
      if (!check.test(body.get(path), body)) {
        fail(message);
      }
      return this;
    }
  }
}
