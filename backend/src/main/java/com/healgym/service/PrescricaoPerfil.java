package com.healgym.service;

import com.healgym.model.User;
import com.healgym.validation.TrainingProfile;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Interpreta o perfil para a prescrição. Não grava fitnessLevel nem goals.
 *
 * <p>O tempo declarado não vira nível avançado. A frequência recente só eleva o rank inicial
 * quando a experiência já é de pelo menos um ano e o treino recente é regular (3 ou mais vezes
 * por semana). Frequência ausente, irregular, de 1 a 2 vezes ou inexistente mantém o rank
 * conservador. Dias disponíveis e duração preferida não alteram rank nem modo: o planejador
 * semanal é quem os lê.
 *
 * <p>Rank 1 e 2 são os mesmos já usados pelo gerador (iniciante e intermediário). O rank 3 só
 * aparece quando o perfil antigo traz fitnessLevel avançado e a experiência nova está ausente.
 */
public final class PrescricaoPerfil {

  public static final int RANK_CONSERVADOR = 1;
  public static final int RANK_REGULAR = 2;
  public static final int RANK_LEGADO_AVANCADO = 3;

  private static final Set<String> EXPERIENCIA_INICIAL =
      new HashSet<>(Arrays.asList("nunca", "menos_6_meses", "de_6_a_12_meses"));

  private static final Set<String> EXPERIENCIA_PODE_SUBIR =
      new HashSet<>(Arrays.asList("de_1_a_2_anos", "de_2_a_5_anos", "mais_de_5_anos"));

  private static final Set<String> FREQUENCIA_REGULAR =
      new HashSet<>(Arrays.asList("semanal_3_4", "semanal_5_mais"));

  private PrescricaoPerfil() {}

  public static final class Configuracao {
    public final String modo;
    public final int rank;
    public final String origemModo;
    public final String origemRank;
    public final Integer dias;
    public final Integer minutos;
    public final String origemDias;
    public final String origemMinutos;

    Configuracao(
        String modo,
        int rank,
        String origemModo,
        String origemRank,
        Integer dias,
        Integer minutos,
        String origemDias,
        String origemMinutos) {
      this.modo = modo;
      this.rank = rank;
      this.origemModo = origemModo;
      this.origemRank = origemRank;
      this.dias = dias;
      this.minutos = minutos;
      this.origemDias = origemDias;
      this.origemMinutos = origemMinutos;
    }
  }

  public static Configuracao interpretar(User.Profile profile) {
    if (profile == null) {
      return new Configuracao("hipertrofia", RANK_CONSERVADOR, "padrao", "padrao", null, null, "ausente", "ausente");
    }
    Escolha modo = modo(profile);
    EscolhaInt rank = rank(profile);
    EscolhaInt dias = dias(profile);
    EscolhaInt minutos = minutos(profile);
    return new Configuracao(
        modo.valor,
        rank.valor,
        modo.origem,
        rank.origem,
        dias.valor == 0 ? null : dias.valor,
        minutos.valor == 0 ? null : minutos.valor,
        dias.origem,
        minutos.origem);
  }

  private static EscolhaInt dias(User.Profile profile) {
    Integer valor = profile.availableDays;
    if (valor != null && valor >= 1 && valor <= 6) {
      return new EscolhaInt(valor, "perfil");
    }
    return new EscolhaInt(0, "ausente");
  }

  private static EscolhaInt minutos(User.Profile profile) {
    Integer valor = profile.preferredSessionMinutes;
    if (valor != null && TrainingProfile.SESSION_MINUTES.contains(valor)) {
      return new EscolhaInt(valor, "perfil");
    }
    return new EscolhaInt(0, "ausente");
  }

  private static Escolha modo(User.Profile profile) {
    if (profile.trainingGoal != null && TrainingProfile.GOALS.contains(profile.trainingGoal)) {
      return new Escolha(profile.trainingGoal, "perfil");
    }
    if (profile.goals == null || profile.goals.isEmpty()) {
      return new Escolha("hipertrofia", "padrao");
    }
    return new Escolha(WorkoutGenerator.modoObjetivo(profile.goals), "legado");
  }

  private static EscolhaInt rank(User.Profile profile) {
    if (EXPERIENCIA_INICIAL.contains(profile.trainingExperience)
        || EXPERIENCIA_PODE_SUBIR.contains(profile.trainingExperience)) {
      return new EscolhaInt(rankDaExperiencia(profile.trainingExperience, profile.recentFrequency), "experiencia");
    }
    return new EscolhaInt(WorkoutGenerator.nivelRank(profile.fitnessLevel), "legado");
  }

  static int rankDaExperiencia(String experiencia, String frequencia) {
    if (EXPERIENCIA_PODE_SUBIR.contains(experiencia) && FREQUENCIA_REGULAR.contains(frequencia)) {
      return RANK_REGULAR;
    }
    return RANK_CONSERVADOR;
  }

  private static final class Escolha {
    final String valor;
    final String origem;

    Escolha(String valor, String origem) {
      this.valor = valor;
      this.origem = origem;
    }
  }

  private static final class EscolhaInt {
    final int valor;
    final String origem;

    EscolhaInt(int valor, String origem) {
      this.valor = valor;
      this.origem = origem;
    }
  }
}
