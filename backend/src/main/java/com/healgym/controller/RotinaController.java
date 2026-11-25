package com.healgym.controller;

import com.healgym.model.User;
import com.healgym.repository.RotinaRepository;
import com.healgym.repository.UserRepository;
import com.healgym.security.AuthService;
import com.healgym.service.rotina.RotinaServico;
import com.healgym.util.Json;
import com.healgym.web.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Rotina semanal: consulta, prévia sem gravação, salvamento idempotente, agenda e início de sessão. */
@RestController
@RequestMapping("/api/rotina")
public class RotinaController extends BaseController {

  private final AuthService auth;
  private final UserRepository users;
  private final RotinaServico rotinas;

  public RotinaController(AuthService auth, UserRepository users, RotinaRepository repositorio) {
    this.auth = auth;
    this.users = users;
    this.rotinas = new RotinaServico(repositorio);
  }

  private ApiException failure(String message, Exception cause) {
    return new ApiException(500, Json.obj("message", message, "error", cause.getMessage()));
  }

  private User usuarioAtual(HttpServletRequest request) {
    User atual = auth.authenticate(request);
    User user = users.findById(atual.getId());
    if (user == null) {
      throw new ApiException(404, Json.obj("message", "Usuário não encontrado"));
    }
    return user;
  }

  @GetMapping
  public ResponseEntity<Object> consultar(HttpServletRequest request) {
    User user = usuarioAtual(request);
    try {
      return ok(Json.obj("success", true, "data", rotinas.consultar(user)));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao consultar rotina: " + e);
      throw failure("Erro ao consultar rotina", e);
    }
  }

  @GetMapping("/opcoes")
  public ResponseEntity<Object> opcoes(HttpServletRequest request) {
    auth.authenticate(request);
    return ok(Json.obj("success", true, "data", RotinaServico.opcoes()));
  }

  @PostMapping("/previa")
  public ResponseEntity<Object> previa(HttpServletRequest request) {
    User user = usuarioAtual(request);
    try {
      return ok(Json.obj("success", true, "data", rotinas.previa(user, body(request))));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao montar prévia da rotina: " + e);
      throw failure("Erro ao montar prévia da rotina", e);
    }
  }

  @PostMapping("/previa/alternativas")
  public ResponseEntity<Object> alternativas(HttpServletRequest request) {
    User user = usuarioAtual(request);
    try {
      return ok(Json.obj("success", true, "data", rotinas.alternativas(user, body(request))));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao buscar alternativas: " + e);
      throw failure("Erro ao buscar alternativas", e);
    }
  }

  @PostMapping
  public ResponseEntity<Object> salvar(HttpServletRequest request) {
    User user = usuarioAtual(request);
    try {
      Map<String, Object> resultado = rotinas.salvar(user, body(request));
      if (Boolean.TRUE.equals(resultado.get("perfilAlterado"))) {
        users.save(user, false);
        resultado.put("user", user.toJson());
      }
      int status = Boolean.TRUE.equals(resultado.get("criada")) ? 201 : 200;
      return json(status, Json.obj("success", true, "data", resultado));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao salvar rotina: " + e);
      throw failure("Erro ao salvar rotina", e);
    }
  }

  @PatchMapping("/agenda")
  public ResponseEntity<Object> agenda(HttpServletRequest request) {
    User user = usuarioAtual(request);
    try {
      return ok(Json.obj("success", true, "data", rotinas.atualizarAgenda(user, body(request))));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao atualizar agenda: " + e);
      throw failure("Erro ao atualizar agenda", e);
    }
  }

  @PostMapping("/sessoes/{codigo}/iniciar")
  public ResponseEntity<Object> iniciar(HttpServletRequest request, @PathVariable String codigo) {
    User user = usuarioAtual(request);
    try {
      Map<String, Object> resultado = rotinas.iniciar(user, codigo);
      int status = Boolean.TRUE.equals(resultado.get("criado")) ? 201 : 200;
      return json(status, Json.obj("success", true, "data", resultado));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao iniciar sessão da rotina: " + e);
      throw failure("Erro ao iniciar sessão da rotina", e);
    }
  }
}
