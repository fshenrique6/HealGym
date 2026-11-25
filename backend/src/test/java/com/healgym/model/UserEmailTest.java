package com.healgym.model;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class UserEmailTest {

  @Test
  void dominioLongoAceitoPeloCadastroNaoQuebraAGravacao() {
    User user = new User();
    user.setName("Pessoa Teste");
    user.setEmail("pessoa@example.online");
    assertDoesNotThrow(user::validate);
  }

  @Test
  void emailSemDominioContinuaInvalido() {
    User user = new User();
    user.setName("Pessoa Teste");
    user.setEmail("pessoa@");
    assertThrows(User.ValidationFailure.class, user::validate);
  }
}
