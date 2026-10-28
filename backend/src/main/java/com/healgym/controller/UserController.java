package com.healgym.controller;

import com.healgym.model.User;
import com.healgym.repository.UserRepository;
import com.healgym.security.AuthService;
import com.healgym.util.Js;
import com.healgym.util.Json;
import com.healgym.validation.ProfileRules;
import com.healgym.validation.Validator;
import com.healgym.web.ApiException;
import com.mongodb.client.model.Filters;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController extends BaseController {

  private final UserRepository users;
  private final AuthService auth;

  public UserController(UserRepository users, AuthService auth) {
    this.users = users;
    this.auth = auth;
  }

  @PostMapping("/profile-setup/skip")
  public ResponseEntity<Object> skipProfileSetup(HttpServletRequest request) {
    User current = auth.authenticate(request);

    try {
      User user = users.findById(current.getId());

      if (user == null) {
        throw error(404, "Usuário não encontrado");
      }

      user.setProfileSetupCompleted(true);
      users.save(user, false);

      return ok(Json.obj("message", "Setup marcado como completo", "user", user.toJson()));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao pular setup: " + e);
      throw internalError();
    }
  }

  @PostMapping("/profile-setup")
  public ResponseEntity<Object> profileSetup(HttpServletRequest request) {
    User current = auth.authenticate(request);

    Map<String, Object> body = body(request);
    Validator validator = new Validator(body);
    ProfileRules.apply(validator, false);
    if (validator.hasErrors()) {
      throw new ApiException(
          400, Json.obj("error", "Dados inválidos", "details", validator.errors()));
    }

    try {
      Object gender = body.get("gender");
      Object height = body.get("height");
      Object weight = body.get("weight");
      Object bodyType = body.get("bodyType");
      Object age = body.get("age");

      int currentYear = LocalDate.now().getYear();
      int birthYear = (int) (currentYear - Js.toNumber(age));
      Date dateOfBirth =
          Date.from(LocalDate.of(birthYear, 1, 1).atStartOfDay(ZoneId.systemDefault()).toInstant());

      User user = users.findById(current.getId());

      if (user == null) {
        throw error(404, "Usuário não encontrado");
      }

      user.getProfile().gender = Js.toStr(gender);
      user.getProfile().height = Js.toNumber(height);
      user.getProfile().weight = Js.toNumber(weight);
      user.getProfile().bodyType = Js.toStr(bodyType);
      user.getProfile().dateOfBirth = dateOfBirth;
      user.setProfileSetupCompleted(true);
      users.save(user, false);

      return ok(Json.obj("message", "Perfil atualizado com sucesso", "user", user.toJson()));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw internalError();
    }
  }

  @GetMapping("")
  public ResponseEntity<Object> list(HttpServletRequest request) {
    User current = auth.authenticate(request);
    auth.authorize(current, "admin");

    try {
      double parsedPage = Js.parseInt(request.getParameter("page"));
      double parsedLimit = Js.parseInt(request.getParameter("limit"));
      double page = Js.truthy(parsedPage) ? parsedPage : 1;
      double limit = Js.truthy(parsedLimit) ? parsedLimit : 10;
      String search = request.getParameter("search");
      if (search == null) {
        search = "";
      }

      Bson query =
          search.isEmpty()
              ? new Document()
              : Filters.or(
                  Filters.regex("name", search, "i"), Filters.regex("email", search, "i"));

      List<User> found = users.find(query, (int) ((page - 1) * limit), (int) limit);
      long total = users.count(query);

      List<Object> items = new ArrayList<>();
      for (User user : found) {
        items.add(user.toJson());
      }

      double totalPages = Math.ceil(total / limit);

      return ok(
          Json.obj(
              "users",
              items,
              "currentPage",
              page,
              "totalPages",
              totalPages,
              "totalUsers",
              total,
              "hasNextPage",
              page < totalPages,
              "hasPrevPage",
              page > 1));
    } catch (Exception e) {
      System.err.println("Erro ao listar usuários: " + e);
      throw internalError();
    }
  }

  @GetMapping("/{id}")
  public ResponseEntity<Object> get(@PathVariable("id") String id, HttpServletRequest request) {
    User current = auth.authenticate(request);

    try {
      if (!current.getId().toHexString().equals(id) && !"admin".equals(current.getRole())) {
        throw error(403, "Acesso negado");
      }

      User user = users.findById(id);

      if (user == null) {
        throw error(404, "Usuário não encontrado");
      }

      return ok(Json.obj("user", user.toJson()));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao buscar usuário: " + e);
      throw internalError();
    }
  }

  @PutMapping("/{id}")
  public ResponseEntity<Object> update(@PathVariable("id") String id, HttpServletRequest request) {
    User current = auth.authenticate(request);
    auth.authorize(current, "admin");

    try {
      Map<String, Object> body = body(request);
      Object name = body.get("name");
      Object email = body.get("email");
      Object role = body.get("role");
      Object isActive = body.get("isActive");
      Object profile = body.get("profile");

      User user = users.findById(id);
      if (user == null) {
        throw error(404, "Usuário não encontrado");
      }

      if (Js.truthy(email) && !Js.toStr(email).equals(user.getEmail())) {
        User existingUser = users.findOne(Filters.eq("email", Js.toStr(email)));
        if (existingUser != null) {
          throw error(400, "E-mail já está em uso");
        }
      }

      if (Js.truthy(name)) {
        user.setName(castString(name));
      }
      if (Js.truthy(email)) {
        user.setEmail(castString(email));
      }
      if (Js.truthy(role)) {
        user.setRole(castString(role));
      }
      if (isActive instanceof Boolean) {
        user.setActive((Boolean) isActive);
      }
      if (Js.truthy(profile)) {
        mergeProfile(user.getProfile(), profile);
      }

      users.save(user, true);

      return ok(Json.obj("message", "Usuário atualizado com sucesso", "user", user.toJson()));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao atualizar usuário: " + e);
      throw internalError();
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Object> delete(@PathVariable("id") String id, HttpServletRequest request) {
    User current = auth.authenticate(request);
    auth.authorize(current, "admin");

    try {
      User user = users.findById(id);
      if (user == null) {
        throw error(404, "Usuário não encontrado");
      }

      if (current.getId().toHexString().equals(id)) {
        throw error(400, "Você não pode deletar sua própria conta");
      }

      users.deleteById(user.getId());

      return ok(Json.obj("message", "Usuário deletado com sucesso"));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao deletar usuário: " + e);
      throw internalError();
    }
  }

  @GetMapping("/stats/overview")
  public ResponseEntity<Object> overview(HttpServletRequest request) {
    User current = auth.authenticate(request);
    auth.authorize(current, "admin");

    try {
      long totalUsers = users.count();
      long activeUsers = users.count(Filters.eq("isActive", true));
      long inactiveUsers = users.count(Filters.eq("isActive", false));
      long admins = users.count(Filters.eq("role", "admin"));

      Date thirtyDaysAgo = Date.from(ZonedDateTime.now().minusDays(30).toInstant());
      long recentUsers = users.count(Filters.gte("createdAt", thirtyDaysAgo));
      long recentlyActive = users.count(Filters.gte("lastLogin", thirtyDaysAgo));

      return ok(
          Json.obj(
              "totalUsers",
              totalUsers,
              "activeUsers",
              activeUsers,
              "inactiveUsers",
              inactiveUsers,
              "admins",
              admins,
              "recentUsers",
              recentUsers,
              "recentlyActive",
              recentlyActive));
    } catch (Exception e) {
      System.err.println("Erro ao buscar estatísticas: " + e);
      throw internalError();
    }
  }

  private static String castString(Object value) {
    if (value instanceof String) {
      return (String) value;
    }
    if (value instanceof Number || value instanceof Boolean) {
      return Js.toStr(value);
    }
    throw new IllegalArgumentException("Cast to string failed");
  }

  private static Double castNumber(Object value) {
    if (value == null) {
      return null;
    }
    double number = Js.toNumber(value);
    if (Double.isNaN(number) || value instanceof Map || value instanceof List) {
      throw new IllegalArgumentException("Cast to Number failed");
    }
    return number;
  }

  private static Date castDate(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof Number) {
      return new Date(((Number) value).longValue());
    }
    if (value instanceof String) {
      String text = (String) value;
      try {
        return Date.from(Instant.parse(text));
      } catch (DateTimeParseException ignored) {
      }
      try {
        return Date.from(ZonedDateTime.parse(text).toInstant());
      } catch (DateTimeParseException ignored) {
      }
      try {
        return Date.from(LocalDate.parse(text).atStartOfDay(ZoneId.of("UTC")).toInstant());
      } catch (DateTimeParseException ignored) {
      }
    }
    throw new IllegalArgumentException("Cast to date failed");
  }

  private static void mergeProfile(User.Profile target, Object source) {
    if (!(source instanceof Map)) {
      throw new IllegalArgumentException("Cast to Embedded failed");
    }
    Map<?, ?> values = (Map<?, ?>) source;

    if (values.containsKey("avatar")) {
      target.avatar = values.get("avatar") == null ? null : castString(values.get("avatar"));
    }
    if (values.containsKey("phone")) {
      target.phone = values.get("phone") == null ? null : castString(values.get("phone"));
    }
    if (values.containsKey("dateOfBirth")) {
      target.dateOfBirth = castDate(values.get("dateOfBirth"));
    }
    if (values.containsKey("gender")) {
      target.gender = values.get("gender") == null ? null : castString(values.get("gender"));
    }
    if (values.containsKey("height")) {
      target.height = castNumber(values.get("height"));
    }
    if (values.containsKey("weight")) {
      target.weight = castNumber(values.get("weight"));
    }
    if (values.containsKey("bodyType")) {
      target.bodyType = values.get("bodyType") == null ? null : castString(values.get("bodyType"));
    }
    if (values.containsKey("goals")) {
      Object goals = values.get("goals");
      List<String> casted = new ArrayList<>();
      if (goals instanceof List) {
        for (Object goal : (List<?>) goals) {
          casted.add(castString(goal));
        }
      } else if (goals != null) {
        casted.add(castString(goals));
      }
      target.goals = casted;
    }
    if (values.containsKey("fitnessLevel")) {
      target.fitnessLevel =
          values.get("fitnessLevel") == null ? null : castString(values.get("fitnessLevel"));
    }
  }
}
