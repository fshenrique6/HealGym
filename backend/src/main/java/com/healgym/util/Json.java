package com.healgym.util;

import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.types.ObjectId;

public final class Json {

  private Json() {}

  public static Map<String, Object> obj(Object... keyValues) {
    Map<String, Object> map = new LinkedHashMap<>();
    for (int i = 0; i + 1 < keyValues.length; i += 2) {
      map.put((String) keyValues[i], keyValues[i + 1]);
    }
    return map;
  }

  public static Object convert(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof ObjectId) {
      return ((ObjectId) value).toHexString();
    }
    if (value instanceof Date) {
      return Js.iso((Date) value);
    }
    if (value instanceof Map) {
      Map<String, Object> result = new LinkedHashMap<>();
      for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {
        if (entry.getValue() == null) {
          continue;
        }
        result.put(String.valueOf(entry.getKey()), convert(entry.getValue()));
      }
      return result;
    }
    if (value instanceof List) {
      List<Object> result = new ArrayList<>();
      for (Object item : (List<?>) value) {
        result.add(convert(item));
      }
      return result;
    }
    if (value instanceof Double || value instanceof Float) {
      double d = ((Number) value).doubleValue();
      if (Double.isNaN(d) || Double.isInfinite(d)) {
        return null;
      }
      if (d == Math.rint(d) && Math.abs(d) < 1e15) {
        return (long) d;
      }
      return d;
    }
    return value;
  }

  @SuppressWarnings("unchecked")
  public static Map<String, Object> map(Object value) {
    return (Map<String, Object>) convert(value);
  }
}
