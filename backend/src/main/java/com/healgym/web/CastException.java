package com.healgym.web;

public class CastException extends RuntimeException {

  public CastException(String message) {
    super(message);
  }

  public static CastException objectId(Object value, String model) {
    String type = value instanceof String ? "string" : value == null ? "null" : "object";
    String printable = value instanceof String ? "\"" + value + "\"" : String.valueOf(value);
    return new CastException(
        "Cast to ObjectId failed for value "
            + printable
            + " (type "
            + type
            + ") at path \"_id\" for model \""
            + model
            + "\"");
  }
}
