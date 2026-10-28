package com.healgym.validation;

import java.util.Arrays;
import java.util.List;

public final class ProfileRules {

  public static final List<String> GENDERS = Arrays.asList("masculino", "feminino");
  public static final List<String> BODY_TYPES = Arrays.asList("ectomorfo", "mesomorfo", "endomorfo");

  private ProfileRules() {}

  public static void apply(Validator validator, boolean optional) {
    Validator.Field gender = validator.field("gender");
    if (optional) {
      gender.optional();
    }
    gender.isIn(GENDERS, optional ? "Gênero deve ser masculino ou feminino" : "Gênero inválido");

    Validator.Field height = validator.field("height");
    if (optional) {
      height.optional();
    }
    height.isFloat(100, 250, "Altura deve estar entre 100 e 250 cm");

    Validator.Field weight = validator.field("weight");
    if (optional) {
      weight.optional();
    }
    weight.isFloat(30, 300, "Peso deve estar entre 30 e 300 kg");

    Validator.Field bodyType = validator.field("bodyType");
    if (optional) {
      bodyType.optional();
    }
    bodyType.isIn(
        BODY_TYPES,
        optional ? "Biotipo deve ser ectomorfo, mesomorfo ou endomorfo" : "Biotipo inválido");

    Validator.Field age = validator.field("age");
    if (optional) {
      age.optional();
    }
    age.isInt(13, 120, "Idade deve estar entre 13 e 120 anos");
  }
}
