package com.healgym.controller;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ExercicioIdTest {

  @Test
  void idDoCatalogoComSublinhadoPodeSerTrocado() {
    assertTrue(WorkoutController.exercicioIdValido("quadriceps_completo-agachamento-com-barra"));
    assertTrue(WorkoutController.exercicioIdValido("medio-supino-reto-com-barra"));
    assertFalse(WorkoutController.exercicioIdValido("agachamento com barra"));
    assertFalse(WorkoutController.exercicioIdValido("../passwd"));
    assertFalse(WorkoutController.exercicioIdValido(""));
  }
}
