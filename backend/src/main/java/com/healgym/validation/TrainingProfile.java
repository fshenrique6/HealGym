package com.healgym.validation;

import com.healgym.model.User;
import com.healgym.util.Js;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Dados de musculação do perfil. Ficam separados de goals, fitnessLevel, peso, IMC e biotipo.
 * Campos ausentes permanecem nulos para não inventar histórico nem quebrar perfis antigos.
 */
public final class TrainingProfile {

  public static final String GOAL = "trainingGoal";
  public static final String EXPERIENCE = "trainingExperience";
  public static final String FREQUENCY = "recentFrequency";
  public static final String DAYS = "availableDays";
  public static final String MINUTES = "preferredSessionMinutes";

  public static final List<String> CAMPOS =
      Collections.unmodifiableList(Arrays.asList(GOAL, EXPERIENCE, FREQUENCY, DAYS, MINUTES));

  public static final List<String> GOALS =
      Collections.unmodifiableList(Arrays.asList("hipertrofia", "forca", "resistencia"));

  public static final List<String> EXPERIENCES =
      Collections.unmodifiableList(
          Arrays.asList(
              "nunca",
              "menos_6_meses",
              "de_6_a_12_meses",
              "de_1_a_2_anos",
              "de_2_a_5_anos",
              "mais_de_5_anos"));

  public static final List<String> FREQUENCIES =
      Collections.unmodifiableList(
          Arrays.asList("nenhuma", "irregular", "semanal_1_2", "semanal_3_4", "semanal_5_mais"));

  public static final List<Integer> SESSION_MINUTES =
      Collections.unmodifiableList(Arrays.asList(30, 45, 60, 75, 90, 120));

  private TrainingProfile() {}

  public static void validate(Validator validator, boolean required) {
    Validator.Field goal = validator.field(GOAL);
    if (!required) {
      goal.optional();
    }
    goal.isIn(GOALS, "Selecione um objetivo de treino válido");

    Validator.Field experience = validator.field(EXPERIENCE);
    if (!required) {
      experience.optional();
    }
    experience.isIn(EXPERIENCES, "Selecione uma experiência em musculação válida");

    Validator.Field frequency = validator.field(FREQUENCY);
    if (!required) {
      frequency.optional();
    }
    frequency.isIn(FREQUENCIES, "Selecione a frequência dos últimos 3 meses");

    Validator.Field days = validator.field(DAYS);
    if (!required) {
      days.optional();
    }
    days.isInt(1, 6, "Escolha de 1 a 6 dias disponíveis");

    Validator.Field minutes = validator.field(MINUTES);
    if (!required) {
      minutes.optional();
    }
    minutes.custom(
        (value, body) -> {
          Integer parsed = inteiro(value);
          return parsed != null && SESSION_MINUTES.contains(parsed);
        },
        "Selecione uma duração de sessão válida");
  }

  public static void apply(User.Profile profile, Map<String, Object> body) {
    if (body.containsKey(GOAL)) {
      profile.trainingGoal = Js.toStr(body.get(GOAL));
    }
    if (body.containsKey(EXPERIENCE)) {
      profile.trainingExperience = Js.toStr(body.get(EXPERIENCE));
    }
    if (body.containsKey(FREQUENCY)) {
      profile.recentFrequency = Js.toStr(body.get(FREQUENCY));
    }
    if (body.containsKey(DAYS)) {
      profile.availableDays = inteiro(body.get(DAYS));
    }
    if (body.containsKey(MINUTES)) {
      profile.preferredSessionMinutes = inteiro(body.get(MINUTES));
    }
  }

  public static String erroDePersistencia(User.Profile profile) {
    if (profile == null) {
      return null;
    }
    if (profile.trainingGoal != null && !GOALS.contains(profile.trainingGoal)) {
      return "Objetivo de treino inválido";
    }
    if (profile.trainingExperience != null && !EXPERIENCES.contains(profile.trainingExperience)) {
      return "Experiência em musculação inválida";
    }
    if (profile.recentFrequency != null && !FREQUENCIES.contains(profile.recentFrequency)) {
      return "Frequência de treino inválida";
    }
    if (profile.availableDays != null
        && (profile.availableDays < 1 || profile.availableDays > 6)) {
      return "Dias disponíveis devem ficar entre 1 e 6";
    }
    if (profile.preferredSessionMinutes != null
        && !SESSION_MINUTES.contains(profile.preferredSessionMinutes)) {
      return "Duração da sessão inválida";
    }
    return null;
  }

  public static Integer inteiro(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof Number) {
      double number = ((Number) value).doubleValue();
      if (Double.isNaN(number) || number != Math.rint(number) || number > Integer.MAX_VALUE) {
        return null;
      }
      return (int) number;
    }
    String text = Js.toStr(value).trim();
    if (!text.matches("-?\\d+")) {
      return null;
    }
    try {
      return Integer.parseInt(text);
    } catch (NumberFormatException ex) {
      return null;
    }
  }

  public static Set<String> chavesPersistidas(User.Profile profile) {
    return new LinkedHashSet<>(profile.toDocument().keySet());
  }
}
