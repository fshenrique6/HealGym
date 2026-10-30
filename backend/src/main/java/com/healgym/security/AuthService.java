package com.healgym.security;

import com.healgym.model.User;
import com.healgym.repository.UserRepository;
import com.healgym.util.Json;
import com.healgym.web.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class AuthService {

  private final JwtService jwtService;
  private final UserRepository users;

  public AuthService(JwtService jwtService, UserRepository users) {
    this.jwtService = jwtService;
    this.users = users;
  }

  public User authenticate(HttpServletRequest request) {
    try {
      String authHeader = request.getHeader("Authorization");

      if (authHeader == null || !authHeader.startsWith("Bearer ")) {
        throw new ApiException(401, Json.obj("error", "Acesso negado. Token não fornecido."));
      }

      String token = authHeader.substring(7);

      Map<String, Object> decoded;
      try {
        decoded = jwtService.verify(token);
      } catch (JwtService.JwtFailure failure) {
        if (failure.isExpired()) {
          throw new ApiException(401, Json.obj("error", "Token expirado. Faça login novamente."));
        }
        throw new ApiException(401, Json.obj("error", "Token inválido."));
      }

      Object userId = decoded.get("userId");
      User user = users.findById(userId);

      if (user == null) {
        throw new ApiException(
            401, Json.obj("error", "Token inválido. Usuário não encontrado."));
      }

      if (!user.isActive()) {
        throw new ApiException(
            401, Json.obj("error", "Conta desativada. Entre em contato com o suporte."));
      }

      return user;
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro na autenticação: " + e);
      throw new ApiException(500, Json.obj("error", "Erro interno do servidor"));
    }
  }

  public void authorize(User user, String... roles) {
    if (user == null) {
      throw new ApiException(401, Json.obj("error", "Usuário não autenticado"));
    }

    if (!Arrays.asList(roles).contains(user.getRole())) {
      throw new ApiException(403, Json.obj("error", "Acesso negado. Permissões insuficientes."));
    }
  }
}
