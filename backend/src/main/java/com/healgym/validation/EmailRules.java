package com.healgym.validation;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public final class EmailRules {

  private static final Pattern EMAIL_USER_UTF8_PART =
      Pattern.compile(
          "^[a-z\\d!#$%&'*+\\-/=?^_`{|}~\\u00A1-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]+$",
          Pattern.CASE_INSENSITIVE);
  private static final Pattern QUOTED_EMAIL_USER_UTF8 =
      Pattern.compile(
          "^([\\s\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f\\x21\\x23-\\x5b\\x5d-\\x7e\\u00A1-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]"
              + "|(\\\\[\\x01-\\x09\\x0b\\x0c\\x0d-\\x7f\\u00A1-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]))*$",
          Pattern.CASE_INSENSITIVE);
  private static final Pattern TLD_PATTERN =
      Pattern.compile(
          "^([a-z\\u00A1-\\u00A8\\u00AA-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]{2,}|xn[a-z0-9-]{2,})$",
          Pattern.CASE_INSENSITIVE);
  private static final Pattern FQDN_PART =
      Pattern.compile("^[a-z_\\u00a1-\\uffff0-9-]+$", Pattern.CASE_INSENSITIVE);
  private static final Pattern FULL_WIDTH = Pattern.compile("[\\uff01-\\uff5e]");
  private static final Pattern WHITESPACE = Pattern.compile("\\s");
  private static final Pattern NUMERIC = Pattern.compile("^\\d+$");
  private static final Pattern DOTS = Pattern.compile("\\.+");

  private static final Set<String> ICLOUD_DOMAINS =
      new HashSet<>(Arrays.asList("icloud.com", "me.com", "mac.com"));
  private static final Set<String> OUTLOOK_DOMAINS =
      new HashSet<>(
          Arrays.asList(
              "hotmail.at", "hotmail.be", "hotmail.ca", "hotmail.cl", "hotmail.co.il",
              "hotmail.co.nz", "hotmail.co.th", "hotmail.co.uk", "hotmail.com", "hotmail.com.ar",
              "hotmail.com.au", "hotmail.com.br", "hotmail.com.gr", "hotmail.com.mx",
              "hotmail.com.pe", "hotmail.com.tr", "hotmail.com.vn", "hotmail.cz", "hotmail.de",
              "hotmail.dk", "hotmail.es", "hotmail.fr", "hotmail.hu", "hotmail.id", "hotmail.ie",
              "hotmail.in", "hotmail.it", "hotmail.jp", "hotmail.kr", "hotmail.lv", "hotmail.my",
              "hotmail.ph", "hotmail.pt", "hotmail.sa", "hotmail.sg", "hotmail.sk", "live.be",
              "live.co.uk", "live.com", "live.com.ar", "live.com.mx", "live.de", "live.es",
              "live.eu", "live.fr", "live.it", "live.nl", "msn.com", "outlook.at", "outlook.be",
              "outlook.cl", "outlook.co.il", "outlook.co.nz", "outlook.co.th", "outlook.com",
              "outlook.com.ar", "outlook.com.au", "outlook.com.br", "outlook.com.gr",
              "outlook.com.pe", "outlook.com.tr", "outlook.com.vn", "outlook.cz", "outlook.de",
              "outlook.dk", "outlook.es", "outlook.fr", "outlook.hu", "outlook.id", "outlook.ie",
              "outlook.in", "outlook.it", "outlook.jp", "outlook.kr", "outlook.lv", "outlook.my",
              "outlook.ph", "outlook.pt", "outlook.sa", "outlook.sg", "outlook.sk",
              "passport.com"));
  private static final Set<String> YAHOO_DOMAINS =
      new HashSet<>(
          Arrays.asList(
              "rocketmail.com", "yahoo.ca", "yahoo.co.uk", "yahoo.com", "yahoo.de", "yahoo.fr",
              "yahoo.in", "yahoo.it", "ymail.com"));
  private static final Set<String> YANDEX_DOMAINS =
      new HashSet<>(Arrays.asList("yandex.ru", "yandex.ua", "yandex.kz", "yandex.com", "yandex.by", "ya.ru"));

  private EmailRules() {}

  public static boolean isEmail(String value) {
    if (value.length() > 254) {
      return false;
    }

    int at = value.lastIndexOf('@');
    String domain;
    String user;
    if (at < 0) {
      domain = value;
      user = "";
    } else {
      domain = value.substring(at + 1);
      user = value.substring(0, at);
    }

    if (byteLength(user) > 64 || byteLength(domain) > 254) {
      return false;
    }

    if (!isFqdn(domain)) {
      return false;
    }

    if (!user.isEmpty() && user.charAt(0) == '"') {
      String inner = user.length() >= 2 ? user.substring(1, user.length() - 1) : "";
      return QUOTED_EMAIL_USER_UTF8.matcher(inner).matches();
    }

    String[] userParts = user.split("\\.", -1);
    for (String part : userParts) {
      if (!EMAIL_USER_UTF8_PART.matcher(part).matches()) {
        return false;
      }
    }

    return true;
  }

  private static int byteLength(String value) {
    return value.getBytes(StandardCharsets.UTF_8).length;
  }

  private static boolean isFqdn(String value) {
    String[] parts = value.split("\\.", -1);
    String tld = parts[parts.length - 1];

    if (parts.length < 2) {
      return false;
    }
    if (!TLD_PATTERN.matcher(tld).find()) {
      return false;
    }
    if (WHITESPACE.matcher(tld).find()) {
      return false;
    }
    if (NUMERIC.matcher(tld).find()) {
      return false;
    }

    for (String part : parts) {
      if (part.length() > 63) {
        return false;
      }
      if (!FQDN_PART.matcher(part).find()) {
        return false;
      }
      if (FULL_WIDTH.matcher(part).find()) {
        return false;
      }
      if (part.startsWith("-") || part.endsWith("-")) {
        return false;
      }
      if (part.contains("_")) {
        return false;
      }
    }
    return true;
  }

  public static String normalizeEmail(String email) {
    int at = email.lastIndexOf('@');
    String user;
    String domain;
    if (at < 0) {
      user = "";
      domain = email;
    } else {
      user = email.substring(0, at);
      domain = email.substring(at + 1);
    }

    domain = domain.toLowerCase(Locale.ROOT);

    if (domain.equals("gmail.com") || domain.equals("googlemail.com")) {
      user = user.split("\\+", -1)[0];
      user = DOTS.matcher(user).replaceAll("");
      if (user.isEmpty()) {
        return null;
      }
      user = user.toLowerCase(Locale.ROOT);
      domain = "gmail.com";
    } else if (ICLOUD_DOMAINS.contains(domain)) {
      user = user.split("\\+", -1)[0];
      if (user.isEmpty()) {
        return null;
      }
      user = user.toLowerCase(Locale.ROOT);
    } else if (OUTLOOK_DOMAINS.contains(domain)) {
      user = user.split("\\+", -1)[0];
      if (user.isEmpty()) {
        return null;
      }
      user = user.toLowerCase(Locale.ROOT);
    } else if (YAHOO_DOMAINS.contains(domain)) {
      String[] components = user.split("-", -1);
      if (components.length > 1) {
        user = String.join("-", Arrays.copyOf(components, components.length - 1));
      } else {
        user = components[0];
      }
      if (user.isEmpty()) {
        return null;
      }
      user = user.toLowerCase(Locale.ROOT);
    } else if (YANDEX_DOMAINS.contains(domain)) {
      user = user.toLowerCase(Locale.ROOT);
      domain = "yandex.ru";
    } else {
      user = user.toLowerCase(Locale.ROOT);
    }

    return user + "@" + domain;
  }
}
