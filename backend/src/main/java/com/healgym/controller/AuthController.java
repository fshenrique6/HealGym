package com.healgym.controller;

import com.healgym.model.User;
import com.healgym.repository.UserRepository;
import com.healgym.security.AuthService;
import com.healgym.security.JwtService;
import com.healgym.security.RateLimiter;
import com.healgym.service.EmailService;
import com.healgym.util.Js;
import com.healgym.util.Json;
import com.healgym.validation.ProfileRules;
import com.healgym.validation.Validator;
import com.healgym.web.ApiException;
import com.mongodb.client.model.Filters;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController extends BaseController {

  private static final Pattern STRONG_PASSWORD_PATTERN =
      Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)");

  private static final long WINDOW = 15 * 60 * 1000L;

  private static final RateLimiter AUTHENTICATION_LIMITER =
      new RateLimiter(WINDOW, 20, "Muitas tentativas. Tente novamente em alguns minutos.");
  private static final RateLimiter PASSWORD_RECOVERY_REQUEST_LIMITER =
      new RateLimiter(
          WINDOW, 5, "Muitas solicitações de recuperação. Tente novamente em alguns minutos.");
  private static final RateLimiter PASSWORD_RESET_LIMITER =
      new RateLimiter(
          WINDOW, 10, "Muitas tentativas de redefinição. Tente novamente em alguns minutos.");
  private static final RateLimiter EMAIL_CHANGE_LIMITER =
      new RateLimiter(
          WINDOW, 5, "Muitas solicitações de alteração de e-mail. Tente novamente em alguns minutos.");
  private static final long EMAIL_CHANGE_COOLDOWN_MS = 60L * 1000;
  private static final int EMAIL_CHANGE_MAX_ATTEMPTS = 5;

  private static final String PASSWORD_RECOVERY_MESSAGE =
      "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.";

  private static final String NEW_PASSWORD_STRENGTH_MESSAGE =
      "Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número";

  private final UserRepository users;
  private final AuthService auth;
  private final JwtService jwt;
  private final EmailService emailService;

  public AuthController(
      UserRepository users, AuthService auth, JwtService jwt, EmailService emailService) {
    this.users = users;
    this.auth = auth;
    this.jwt = jwt;
    this.emailService = emailService;
  }

  @PostMapping("/register")
  public ResponseEntity<Object> register(HttpServletRequest request, HttpServletResponse response) {
    AUTHENTICATION_LIMITER.check(request, response);

    Map<String, Object> body = body(request);
    Validator validator = new Validator(body);
    validator
        .field("name")
        .trim()
        .isLength(2, 50, "Nome deve ter entre 2 e 50 caracteres");
    validator.field("email").isEmail("E-mail inválido").normalizeEmail();
    validator
        .field("password")
        .isLength(6, null, "Senha deve ter pelo menos 6 caracteres")
        .matches(
            STRONG_PASSWORD_PATTERN,
            "Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número");
    validator
        .field("confirmPassword")
        .custom(
            (value, current) -> Objects.equals(value, current.get("password")),
            "Confirmação de senha não confere");
    failOnValidationErrors(validator);

    try {
      String name = Js.toStr(body.get("name"));
      String email = Js.toStr(body.get("email"));
      String password = Js.toStr(body.get("password"));

      User existingUser = users.findOne(Filters.eq("email", email));
      if (existingUser != null) {
        throw error(400, "E-mail já está em uso");
      }

      User user = new User();
      user.setName(name);
      user.setEmail(email);
      user.setPassword(password);

      users.save(user, true);

      String token = jwt.sign(user.getId().toHexString());

      user.setLastLogin(new Date());
      users.save(user, true);

      return json(
          201,
          Json.obj(
              "message",
              "Usuário criado com sucesso",
              "token",
              token,
              "user",
              Json.obj(
                  "id", user.getId(),
                  "name", user.getName(),
                  "email", user.getEmail(),
                  "role", user.getRole(),
                  "createdAt", user.getCreatedAt(),
                  "profileSetupCompleted", user.isProfileSetupCompleted(),
                  "profile", user.getProfile().toDocument())));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro no registro: " + e);
      throw internalError();
    }
  }

  @PostMapping("/login")
  public ResponseEntity<Object> login(HttpServletRequest request, HttpServletResponse response) {
    AUTHENTICATION_LIMITER.check(request, response);

    Map<String, Object> body = body(request);
    Validator validator = new Validator(body);
    validator.field("email").isEmail("E-mail inválido").normalizeEmail();
    validator.field("password").notEmpty("Senha é obrigatória");
    failOnValidationErrors(validator);

    try {
      String email = Js.toStr(body.get("email"));
      Object password = body.get("password");

      User user = users.findOne(Filters.eq("email", email));
      if (user == null) {
        throw error(401, "Credenciais inválidas");
      }

      if (!user.isActive()) {
        throw error(401, "Conta desativada. Entre em contato com o suporte.");
      }

      if (!(password instanceof String)) {
        throw new IllegalArgumentException("Illegal arguments");
      }

      if (!user.comparePassword((String) password)) {
        throw error(401, "Credenciais inválidas");
      }

      String token = jwt.sign(user.getId().toHexString());

      user.setLastLogin(new Date());
      users.save(user, true);

      return ok(
          Json.obj(
              "message",
              "Login realizado com sucesso",
              "token",
              token,
              "user",
              Json.obj(
                  "id", user.getId(),
                  "name", user.getName(),
                  "email", user.getEmail(),
                  "role", user.getRole(),
                  "lastLogin", user.getLastLogin(),
                  "profileSetupCompleted", user.isProfileSetupCompleted(),
                  "profile", user.getProfile().toDocument())));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro no login: " + e);
      throw internalError();
    }
  }

  @GetMapping("/profile")
  public ResponseEntity<Object> profile(HttpServletRequest request) {
    User current = auth.authenticate(request);
    return ok(Json.obj("user", current.toJson()));
  }

  @PutMapping("/profile")
  public ResponseEntity<Object> updateProfile(HttpServletRequest request) {
    User current = auth.authenticate(request);

    Map<String, Object> body = body(request);
    Validator validator = new Validator(body);
    validator
        .field("name")
        .optional()
        .trim()
        .isLength(2, 50, "Nome deve ter entre 2 e 50 caracteres");
    validator.field("email").optional().isEmail("E-mail inválido").normalizeEmail();
    ProfileRules.apply(validator, true);
    validator
        .field("newPassword")
        .optional()
        .isLength(6, null, "Nova senha deve ter pelo menos 6 caracteres")
        .matches(STRONG_PASSWORD_PATTERN, NEW_PASSWORD_STRENGTH_MESSAGE);
    failOnValidationErrors(validator);

    try {
      Object name = body.get("name");
      Object gender = body.get("gender");
      Object height = body.get("height");
      Object weight = body.get("weight");
      Object bodyType = body.get("bodyType");
      Object age = body.get("age");
      Object newPassword = body.get("newPassword");

      User user = users.findById(current.getId());

      if (user == null) {
        throw error(404, "Usuário não encontrado");
      }

      if (Js.truthy(name)) {
        user.setName(Js.toStr(name));
      }
      if (Js.truthy(newPassword)) {
        user.setPassword(Js.toStr(newPassword));
      }

      if (Js.truthy(gender)
          || Js.truthy(height)
          || Js.truthy(weight)
          || Js.truthy(bodyType)
          || Js.truthy(age)) {
        if (Js.truthy(gender)) {
          user.getProfile().gender = Js.toStr(gender);
        }
        if (Js.truthy(height)) {
          user.getProfile().height = Js.parseFloat(height);
        }
        if (Js.truthy(weight)) {
          user.getProfile().weight = Js.parseFloat(weight);
        }
        if (Js.truthy(bodyType)) {
          user.getProfile().bodyType = Js.toStr(bodyType);
        }

        if (Js.truthy(age)) {
          user.getProfile().dateOfBirth =
              dateOfBirthForAge(user.getProfile().dateOfBirth, (int) Js.parseInt(age));
        }
      }

      users.save(user, true);

      return ok(Json.obj("message", "Perfil atualizado com sucesso", "user", user.toJson()));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw internalError();
    }
  }

  @PostMapping("/email-change/request")
  public ResponseEntity<Object> requestEmailChange(
      HttpServletRequest request, HttpServletResponse response) {
    EMAIL_CHANGE_LIMITER.check(request, response);
    User current = auth.authenticate(request);
    String requested = normalizeNewEmail(body(request));

    try {
      User user = requireUser(current);
      enforceEmailChangeCooldown(user);
      if (requested.equals(user.getEmail())) {
        throw error(400, "Informe um e-mail diferente do atual.");
      }
      ensureEmailAvailable(user, requested);
      String code = user.beginEmailChange(requested);
      users.save(user, true);
      try {
        emailService.sendEmailChangeCode(user.getEmail(), code);
      } catch (Exception emailError) {
        user.clearEmailChange();
        users.save(user, true);
        throw error(500, "Erro ao enviar e-mail. Tente novamente.");
      }
      return ok(
          Json.obj("message", "Enviamos um código de verificação para o seu e-mail atual."));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw internalError();
    }
  }

  @PostMapping("/email-change/confirm")
  public ResponseEntity<Object> confirmEmailChange(
      HttpServletRequest request, HttpServletResponse response) {
    EMAIL_CHANGE_LIMITER.check(request, response);
    User current = auth.authenticate(request);
    Map<String, Object> body = body(request);
    String code = Js.trim(Js.toStr(body.get("code")));
    if (!code.matches("\\d{6}")) {
      throw error(400, "Código inválido");
    }

    try {
      User user = requireUser(current);
      if (!user.hasPendingEmailChange()) {
        throw error(400, "Não há solicitação de alteração de e-mail.");
      }
      if (user.getEmailChangeExpires().before(new Date())) {
        user.invalidateEmailChange();
        users.save(user, true);
        throw error(400, "Código expirado. Solicite um novo código.");
      }
      if (!user.matchesEmailChangeCode(code)) {
        user.setEmailChangeAttempts(user.getEmailChangeAttempts() + 1);
        if (user.getEmailChangeAttempts() >= EMAIL_CHANGE_MAX_ATTEMPTS) {
          user.invalidateEmailChange();
          users.save(user, true);
          throw error(400, "Muitas tentativas incorretas. Solicite um novo código.");
        }
        users.save(user, true);
        throw error(400, "Código inválido");
      }

      String nextEmail = user.getEmailChangeNewEmail();
      ensureEmailAvailable(user, nextEmail);
      user.setEmail(nextEmail);
      user.invalidateEmailChange();
      users.save(user, true);
      return ok(Json.obj("message", "E-mail alterado com sucesso!", "user", user.toJson()));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw internalError();
    }
  }

  @PostMapping("/email-change/resend")
  public ResponseEntity<Object> resendEmailChange(
      HttpServletRequest request, HttpServletResponse response) {
    EMAIL_CHANGE_LIMITER.check(request, response);
    User current = auth.authenticate(request);

    try {
      User user = requireUser(current);
      if (!user.hasPendingEmailChange()) {
        throw error(400, "Não há solicitação de alteração de e-mail.");
      }
      if (user.getEmailChangeExpires().before(new Date())) {
        user.invalidateEmailChange();
        users.save(user, true);
        throw error(400, "Código expirado. Solicite um novo código.");
      }
      enforceEmailChangeCooldown(user);
      ensureEmailAvailable(user, user.getEmailChangeNewEmail());
      String code = user.beginEmailChange(user.getEmailChangeNewEmail());
      users.save(user, true);
      try {
        emailService.sendEmailChangeCode(user.getEmail(), code);
      } catch (Exception emailError) {
        user.clearEmailChange();
        users.save(user, true);
        throw error(500, "Erro ao enviar e-mail. Tente novamente.");
      }
      return ok(
          Json.obj("message", "Enviamos um novo código para o seu e-mail atual."));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw internalError();
    }
  }

  @PostMapping("/email-change/cancel")
  public ResponseEntity<Object> cancelEmailChange(HttpServletRequest request) {
    User current = auth.authenticate(request);
    try {
      User user = requireUser(current);
      user.invalidateEmailChange();
      users.save(user, true);
      return ok(Json.obj("message", "Alteração de e-mail cancelada."));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw internalError();
    }
  }

  private User requireUser(User current) {
    User user = users.findById(current.getId());
    if (user == null) {
      throw error(404, "Usuário não encontrado");
    }
    return user;
  }

  private String normalizeNewEmail(Map<String, Object> body) {
    String emailInput = Js.trim(Js.toStr(body.get("newEmail")));
    if (emailInput.isEmpty()) {
      throw error(400, "E-mail é obrigatório");
    }
    body.put("newEmail", emailInput);
    Validator validator = new Validator(body);
    validator.field("newEmail").isEmail("E-mail inválido").normalizeEmail();
    failOnValidationErrors(validator);
    Object normalized = body.get("newEmail");
    if (!(normalized instanceof String) || ((String) normalized).isEmpty()) {
      throw error(400, "E-mail inválido");
    }
    return (String) normalized;
  }

  private void ensureEmailAvailable(User user, String email) {
    User existing = users.findOne(Filters.eq("email", email));
    if (existing != null && !existing.getId().equals(user.getId())) {
      throw error(400, "E-mail já está em uso");
    }
  }

  private void enforceEmailChangeCooldown(User user) {
    Date lastSent = user.getEmailChangeLastSent();
    if (lastSent != null && System.currentTimeMillis() - lastSent.getTime() < EMAIL_CHANGE_COOLDOWN_MS) {
      throw error(429, "Aguarde um minuto para solicitar outro código.");
    }
  }

  private static Date dateOfBirthForAge(Date current, int age) {
    ZoneId zone = ZoneId.systemDefault();
    LocalDate today = LocalDate.now(zone);
    int month = 1;
    int day = 1;
    if (current != null) {
      LocalDate existing = current.toInstant().atZone(zone).toLocalDate();
      month = existing.getMonthValue();
      day = existing.getDayOfMonth();
    }
    int dayThisYear = Math.min(day, LocalDate.of(today.getYear(), month, 1).lengthOfMonth());
    boolean birthdayReached = !LocalDate.of(today.getYear(), month, dayThisYear).isAfter(today);
    int year = today.getYear() - age - (birthdayReached ? 0 : 1);
    int safeDay = Math.min(day, LocalDate.of(year, month, 1).lengthOfMonth());
    return Date.from(LocalDate.of(year, month, safeDay).atStartOfDay(zone).toInstant());
  }

  @PostMapping("/change-password")
  public ResponseEntity<Object> changePassword(HttpServletRequest request) {
    User current = auth.authenticate(request);

    Map<String, Object> body = body(request);
    Validator validator = new Validator(body);
    validator.field("currentPassword").notEmpty("Senha atual é obrigatória");
    validator
        .field("newPassword")
        .isLength(6, null, "Nova senha deve ter pelo menos 6 caracteres")
        .matches(STRONG_PASSWORD_PATTERN, NEW_PASSWORD_STRENGTH_MESSAGE);
    failOnValidationErrors(validator);

    try {
      Object currentPassword = body.get("currentPassword");
      String newPassword = Js.toStr(body.get("newPassword"));

      User user = users.findById(current.getId());

      if (!(currentPassword instanceof String)) {
        throw new IllegalArgumentException("Illegal arguments");
      }

      if (!user.comparePassword((String) currentPassword)) {
        throw error(400, "Senha atual incorreta");
      }

      user.setPassword(newPassword);
      users.save(user, true);

      return ok(Json.obj("message", "Senha alterada com sucesso"));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao alterar senha: " + e);
      throw internalError();
    }
  }

  @PostMapping("/verify-token")
  public ResponseEntity<Object> verifyToken(HttpServletRequest request) {
    User current = auth.authenticate(request);
    return ok(Json.obj("valid", true, "user", current.toJson()));
  }

  @PostMapping("/forgot-password")
  public ResponseEntity<Object> forgotPassword(
      HttpServletRequest request, HttpServletResponse response) {
    PASSWORD_RECOVERY_REQUEST_LIMITER.check(request, response);

    Map<String, Object> body = body(request);
    Validator validator = new Validator(body);
    String emailInput = Js.trim(Js.toStr(body.get("email")));
    if (emailInput.isEmpty()) {
      throw error(400, "E-mail é obrigatório");
    }
    body.put("email", emailInput);
    validator.field("email").isEmail("E-mail inválido").normalizeEmail();
    failOnValidationErrors(validator);

    try {
      Object normalized = body.get("email");
      if (!(normalized instanceof String) || ((String) normalized).isEmpty()) {
        throw error(400, "E-mail inválido");
      }
      String email = (String) normalized;

      User user = users.findOne(Filters.eq("email", email));
      if (user == null) {
        throw new ApiException(
            404,
            Json.obj(
                "error",
                "Não encontramos uma conta cadastrada com este e-mail.",
                "code",
                "EMAIL_NOT_FOUND"));
      }

      if (!user.isActive()) {
        throw error(400, "Conta desativada. Entre em contato com o suporte.");
      }

      String resetToken = user.createPasswordResetToken();
      users.save(user, false);

      try {
        emailService.sendPasswordResetEmail(user.getEmail(), resetToken);
      } catch (Exception emailError) {
        user.setPasswordResetToken(null);
        user.setPasswordResetExpires(null);
        users.save(user, false);

        System.err.println("Erro ao enviar email de recuperação");
        throw error(500, "Erro ao enviar e-mail de recuperação. Tente novamente.");
      }

      return ok(Json.obj("message", PASSWORD_RECOVERY_MESSAGE));
    } catch (ApiException e) {
      throw e;
    } catch (com.mongodb.MongoException e) {
      System.err.println("Erro na recuperação de senha: falha ao consultar o banco");
      throw internalError();
    } catch (Exception e) {
      System.err.println("Erro na recuperação de senha: " + e.getClass().getSimpleName());
      throw internalError();
    }
  }

  @PostMapping("/reset-password/{token}")
  public ResponseEntity<Object> resetPassword(
      @PathVariable("token") String token,
      HttpServletRequest request,
      HttpServletResponse response) {
    PASSWORD_RESET_LIMITER.check(request, response);

    Map<String, Object> body = body(request);
    Validator validator = new Validator(body);
    validator
        .field("password")
        .isLength(6, null, "Nova senha deve ter pelo menos 6 caracteres")
        .matches(STRONG_PASSWORD_PATTERN, NEW_PASSWORD_STRENGTH_MESSAGE);
    validator
        .field("confirmPassword")
        .custom(
            (value, current) -> Objects.equals(value, current.get("password")),
            "Confirmação de senha não confere");
    failOnValidationErrors(validator);

    try {
      String password = Js.toStr(body.get("password"));

      String hashedToken = User.sha256(token);

      User user =
          users.findOne(
              Filters.and(
                  Filters.eq("passwordResetToken", hashedToken),
                  Filters.gt("passwordResetExpires", new Date())));

      if (user == null) {
        throw error(400, "Token de recuperação inválido ou expirado");
      }

      user.setPassword(password);
      user.setPasswordResetToken(null);
      user.setPasswordResetExpires(null);
      users.save(user, true);

      return ok(Json.obj("message", "Senha redefinida com sucesso!"));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao redefinir senha: " + e);
      throw internalError();
    }
  }

  @PostMapping("/request-account-deletion")
  public ResponseEntity<Object> requestAccountDeletion(HttpServletRequest request) {
    User current = auth.authenticate(request);

    try {
      User user = users.findById(current.getId());
      if (user == null) {
        throw error(404, "Usuário não encontrado");
      }

      if (!user.isActive()) {
        throw error(400, "Conta já está desativada");
      }

      String deletionToken = user.createAccountDeletionToken();
      users.save(user, false);

      try {
        EmailService.Result result =
            emailService.sendAccountDeletionEmail(user.getEmail(), deletionToken);
        if (result.devMode) {
          return ok(
              Json.obj(
                  "message",
                  "E-mail de confirmação de exclusão enviado com sucesso!",
                  "devMode",
                  true,
                  "note",
                  "Modo de desenvolvimento - use o link exibido no terminal ou configure o Resend"));
        }
        return ok(
            Json.obj(
                "message",
                "E-mail de confirmação de exclusão enviado com sucesso! Verifique sua caixa de entrada."));
      } catch (Exception emailError) {
        user.setAccountDeletionToken(null);
        user.setAccountDeletionExpires(null);
        users.save(user, false);

        System.err.println(
            "Erro ao enviar email de confirmação de exclusão: " + emailError);
        throw error(500, "Erro ao enviar e-mail de confirmação. Tente novamente.");
      }
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro na solicitação de exclusão de conta: " + e);
      throw internalError();
    }
  }

  @PostMapping("/confirm-account-deletion/{token}")
  public ResponseEntity<Object> confirmAccountDeletion(@PathVariable("token") String token) {
    try {
      String hashedToken = User.sha256(token);

      User user =
          users.findOne(
              Filters.and(
                  Filters.eq("accountDeletionToken", hashedToken),
                  Filters.gt("accountDeletionExpires", new Date())));

      if (user == null) {
        throw error(400, "Token de confirmação inválido ou expirado");
      }

      users.deleteById(user.getId());

      return ok(Json.obj("message", "Conta excluída com sucesso. Sentiremos sua falta!"));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao confirmar exclusão de conta: " + e);
      throw internalError();
    }
  }
}
