package com.healgym.model;

import com.healgym.util.Js;
import com.healgym.util.Json;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class User {

  public static class ValidationFailure extends RuntimeException {
    public ValidationFailure(String message) {
      super(message, null, false, false);
    }
  }

  public static class Profile {
    public String avatar;
    public String phone;
    public Date dateOfBirth;
    public String gender;
    public Double height;
    public Double weight;
    public String bodyType;
    public List<String> goals = new ArrayList<>();
    public String fitnessLevel;

    public static Profile fromDocument(Document document) {
      Profile profile = new Profile();
      if (document == null) {
        return profile;
      }
      profile.avatar = document.getString("avatar");
      profile.phone = document.getString("phone");
      profile.dateOfBirth = document.get("dateOfBirth", Date.class);
      profile.gender = document.getString("gender");
      profile.height = number(document.get("height"));
      profile.weight = number(document.get("weight"));
      profile.bodyType = document.getString("bodyType");
      profile.fitnessLevel = document.getString("fitnessLevel");

      Object goals = document.get("goals");
      if (goals instanceof List) {
        for (Object goal : (List<?>) goals) {
          if (goal != null) {
            profile.goals.add(String.valueOf(goal));
          }
        }
      }
      return profile;
    }

    public Document toDocument() {
      Document document = new Document();
      putIfPresent(document, "avatar", avatar);
      putIfPresent(document, "phone", phone);
      putIfPresent(document, "dateOfBirth", dateOfBirth);
      putIfPresent(document, "gender", gender);
      putIfPresent(document, "height", height);
      putIfPresent(document, "weight", weight);
      putIfPresent(document, "bodyType", bodyType);
      document.put("goals", new ArrayList<>(goals));
      putIfPresent(document, "fitnessLevel", fitnessLevel);
      return document;
    }
  }

  public static final List<String> ROLES = Arrays.asList("user", "admin");
  public static final List<String> GENDERS = Arrays.asList("masculino", "feminino");
  public static final List<String> BODY_TYPES = Arrays.asList("ectomorfo", "mesomorfo", "endomorfo");
  public static final List<String> FITNESS_LEVELS =
      Arrays.asList("iniciante", "intermediario", "avancado");

  private static final Pattern EMAIL_PATTERN =
      Pattern.compile("^\\w+([.-]?\\w+)*@\\w+([.-]?\\w+)*(\\.\\w{2,3})+$");
  private static final BCryptPasswordEncoder ENCODER =
      new BCryptPasswordEncoder(BCryptPasswordEncoder.BCryptVersion.$2A, 12);
  private static final SecureRandom RANDOM = new SecureRandom();

  private ObjectId id;
  private String name;
  private String email;
  private String password;
  private String role = "user";
  private boolean active = true;
  private Date lastLogin;
  private String passwordResetToken;
  private Date passwordResetExpires;
  private String accountDeletionToken;
  private Date accountDeletionExpires;
  private String emailChangeCodeHash;
  private Date emailChangeExpires;
  private String emailChangeNewEmail;
  private int emailChangeAttempts;
  private Date emailChangeLastSent;
  private Profile profile = new Profile();
  private boolean profileSetupCompleted = false;
  private Date createdAt;
  private Date updatedAt;
  private int version = 0;
  private boolean passwordModified = false;

  public static User fromDocument(Document document) {
    if (document == null) {
      return null;
    }
    User user = new User();
    user.id = document.getObjectId("_id");
    user.name = document.getString("name");
    user.email = document.getString("email");
    user.password = document.getString("password");
    user.role = document.getString("role") == null ? "user" : document.getString("role");
    Boolean active = document.getBoolean("isActive");
    user.active = active == null || active;
    user.lastLogin = document.get("lastLogin", Date.class);
    user.passwordResetToken = document.getString("passwordResetToken");
    user.passwordResetExpires = document.get("passwordResetExpires", Date.class);
    user.accountDeletionToken = document.getString("accountDeletionToken");
    user.accountDeletionExpires = document.get("accountDeletionExpires", Date.class);
    user.emailChangeCodeHash = document.getString("emailChangeCodeHash");
    user.emailChangeExpires = document.get("emailChangeExpires", Date.class);
    user.emailChangeNewEmail = document.getString("emailChangeNewEmail");
    Double attempts = number(document.get("emailChangeAttempts"));
    user.emailChangeAttempts = attempts == null ? 0 : attempts.intValue();
    user.emailChangeLastSent = document.get("emailChangeLastSent", Date.class);
    user.profile = Profile.fromDocument(document.get("profile", Document.class));
    Boolean setup = document.getBoolean("profileSetupCompleted");
    user.profileSetupCompleted = setup != null && setup;
    user.createdAt = document.get("createdAt", Date.class);
    user.updatedAt = document.get("updatedAt", Date.class);
    Double version = number(document.get("__v"));
    user.version = version == null ? 0 : version.intValue();
    return user;
  }

  public Document toDocument() {
    Document document = new Document();
    document.put("_id", id);
    putIfPresent(document, "name", name);
    putIfPresent(document, "email", email);
    putIfPresent(document, "password", password);
    document.put("role", role);
    document.put("isActive", active);
    putIfPresent(document, "lastLogin", lastLogin);
    putIfPresent(document, "passwordResetToken", passwordResetToken);
    putIfPresent(document, "passwordResetExpires", passwordResetExpires);
    putIfPresent(document, "accountDeletionToken", accountDeletionToken);
    putIfPresent(document, "accountDeletionExpires", accountDeletionExpires);
    putIfPresent(document, "emailChangeCodeHash", emailChangeCodeHash);
    putIfPresent(document, "emailChangeExpires", emailChangeExpires);
    putIfPresent(document, "emailChangeNewEmail", emailChangeNewEmail);
    if (emailChangeCodeHash != null) {
      document.put("emailChangeAttempts", emailChangeAttempts);
    }
    putIfPresent(document, "emailChangeLastSent", emailChangeLastSent);
    document.put("profile", profile.toDocument());
    document.put("profileSetupCompleted", profileSetupCompleted);
    putIfPresent(document, "createdAt", createdAt);
    putIfPresent(document, "updatedAt", updatedAt);
    document.put("__v", version);
    return document;
  }

  public Map<String, Object> toJson() {
    Document document = toDocument();
    document.remove("password");
    document.remove("passwordResetToken");
    document.remove("passwordResetExpires");
    document.remove("accountDeletionToken");
    document.remove("accountDeletionExpires");
    document.remove("emailChangeCodeHash");
    document.remove("emailChangeExpires");
    document.remove("emailChangeNewEmail");
    document.remove("emailChangeAttempts");
    document.remove("emailChangeLastSent");
    return Json.map(document);
  }

  public void validate() {
    if (name == null || name.isEmpty()) {
      throw new ValidationFailure("Nome é obrigatório");
    }
    if (name.length() < 2) {
      throw new ValidationFailure("Nome deve ter pelo menos 2 caracteres");
    }
    if (name.length() > 50) {
      throw new ValidationFailure("Nome deve ter no máximo 50 caracteres");
    }

    if (email == null || email.isEmpty()) {
      throw new ValidationFailure("E-mail é obrigatório");
    }
    if (!EMAIL_PATTERN.matcher(email).find()) {
      throw new ValidationFailure("Por favor, insira um e-mail válido");
    }

    if (passwordModified) {
      if (password == null || password.isEmpty()) {
        throw new ValidationFailure("Senha é obrigatória");
      }
      if (password.length() < 6) {
        throw new ValidationFailure("Senha deve ter pelo menos 6 caracteres");
      }
    }

    if (role != null && !ROLES.contains(role)) {
      throw new ValidationFailure("`" + role + "` is not a valid enum value for path `role`.");
    }
    if (profile.gender != null && !GENDERS.contains(profile.gender)) {
      throw new ValidationFailure(
          "`" + profile.gender + "` is not a valid enum value for path `profile.gender`.");
    }
    if (profile.height != null && profile.height < 100) {
      throw new ValidationFailure("Altura deve ser pelo menos 100 cm");
    }
    if (profile.height != null && profile.height > 250) {
      throw new ValidationFailure("Altura deve ser no máximo 250 cm");
    }
    if (profile.weight != null && profile.weight < 30) {
      throw new ValidationFailure("Peso deve ser pelo menos 30 kg");
    }
    if (profile.weight != null && profile.weight > 300) {
      throw new ValidationFailure("Peso deve ser no máximo 300 kg");
    }
    if (profile.bodyType != null && !BODY_TYPES.contains(profile.bodyType)) {
      throw new ValidationFailure(
          "`" + profile.bodyType + "` is not a valid enum value for path `profile.bodyType`.");
    }
    if (profile.fitnessLevel != null && !FITNESS_LEVELS.contains(profile.fitnessLevel)) {
      throw new ValidationFailure(
          "`"
              + profile.fitnessLevel
              + "` is not a valid enum value for path `profile.fitnessLevel`.");
    }
  }

  public void prepareForSave(boolean validate) {
    if (validate) {
      validate();
    }

    Date now = new Date();
    if (id == null) {
      id = new ObjectId();
      createdAt = now;
      version = 0;
    }

    if (passwordModified) {
      password = ENCODER.encode(password);
      passwordModified = false;
    }

    updatedAt = now;
  }

  public boolean comparePassword(String candidate) {
    if (password == null || candidate == null) {
      return false;
    }
    return ENCODER.matches(candidate, password);
  }

  public String createPasswordResetToken() {
    String token = randomToken();
    passwordResetToken = sha256(token);
    passwordResetExpires = new Date(System.currentTimeMillis() + 15L * 60 * 1000);
    return token;
  }

  public String createAccountDeletionToken() {
    String token = randomToken();
    accountDeletionToken = sha256(token);
    accountDeletionExpires = new Date(System.currentTimeMillis() + 30L * 60 * 1000);
    return token;
  }

  public String beginEmailChange(String newEmail) {
    int value = RANDOM.nextInt(1_000_000);
    String code = String.format("%06d", value);
    emailChangeCodeHash = sha256(code);
    emailChangeExpires = new Date(System.currentTimeMillis() + 10L * 60 * 1000);
    emailChangeNewEmail = newEmail;
    emailChangeAttempts = 0;
    emailChangeLastSent = new Date();
    return code;
  }

  public void invalidateEmailChange() {
    emailChangeCodeHash = null;
    emailChangeExpires = null;
    emailChangeNewEmail = null;
    emailChangeAttempts = 0;
  }

  public void clearEmailChange() {
    invalidateEmailChange();
    emailChangeLastSent = null;
  }

  public boolean hasPendingEmailChange() {
    return emailChangeCodeHash != null && emailChangeNewEmail != null && emailChangeExpires != null;
  }

  public boolean matchesEmailChangeCode(String code) {
    if (emailChangeCodeHash == null || code == null) {
      return false;
    }
    return MessageDigest.isEqual(
        emailChangeCodeHash.getBytes(StandardCharsets.UTF_8),
        sha256(code).getBytes(StandardCharsets.UTF_8));
  }

  public String getEmailChangeNewEmail() {
    return emailChangeNewEmail;
  }

  public Date getEmailChangeExpires() {
    return emailChangeExpires;
  }

  public int getEmailChangeAttempts() {
    return emailChangeAttempts;
  }

  public void setEmailChangeAttempts(int emailChangeAttempts) {
    this.emailChangeAttempts = emailChangeAttempts;
  }

  public Date getEmailChangeLastSent() {
    return emailChangeLastSent;
  }

  public static String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
      StringBuilder builder = new StringBuilder();
      for (byte b : hash) {
        builder.append(String.format("%02x", b));
      }
      return builder.toString();
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  private static String randomToken() {
    byte[] bytes = new byte[32];
    RANDOM.nextBytes(bytes);
    StringBuilder builder = new StringBuilder();
    for (byte b : bytes) {
      builder.append(String.format("%02x", b));
    }
    return builder.toString();
  }

  private static Double number(Object value) {
    return value instanceof Number ? ((Number) value).doubleValue() : null;
  }

  private static void putIfPresent(Document document, String key, Object value) {
    if (value != null) {
      document.put(key, value);
    }
  }

  public ObjectId getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name == null ? null : Js.trim(name);
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email == null ? null : Js.trim(email.toLowerCase(Locale.ROOT));
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
    this.passwordModified = true;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }

  public Date getLastLogin() {
    return lastLogin;
  }

  public void setLastLogin(Date lastLogin) {
    this.lastLogin = lastLogin;
  }

  public void setPasswordResetToken(String passwordResetToken) {
    this.passwordResetToken = passwordResetToken;
  }

  public void setPasswordResetExpires(Date passwordResetExpires) {
    this.passwordResetExpires = passwordResetExpires;
  }

  public void setAccountDeletionToken(String accountDeletionToken) {
    this.accountDeletionToken = accountDeletionToken;
  }

  public void setAccountDeletionExpires(Date accountDeletionExpires) {
    this.accountDeletionExpires = accountDeletionExpires;
  }

  public Profile getProfile() {
    return profile;
  }

  public void setProfile(Profile profile) {
    this.profile = profile;
  }

  public boolean isProfileSetupCompleted() {
    return profileSetupCompleted;
  }

  public void setProfileSetupCompleted(boolean profileSetupCompleted) {
    this.profileSetupCompleted = profileSetupCompleted;
  }

  public Date getCreatedAt() {
    return createdAt;
  }

  public Date getUpdatedAt() {
    return updatedAt;
  }
}
