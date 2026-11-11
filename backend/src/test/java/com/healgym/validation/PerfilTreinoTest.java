package com.healgym.validation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.healgym.model.User;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.junit.jupiter.api.Test;

class PerfilTreinoTest {

  @Test
  void jsonDaRespostaConfereComOPayloadEPreservaDadosPessoais() {
    Map<String, Object> body = perfilCompleto();
    Validator validator = new Validator(body);
    TrainingProfile.validate(validator, true);
    assertFalse(validator.hasErrors());

    User user = usuario();
    User.Profile profile = user.getProfile();
    profile.gender = "masculino";
    profile.height = 180.0;
    profile.weight = 80.0;
    profile.bodyType = "mesomorfo";
    profile.phone = "11999999999";
    TrainingProfile.apply(profile, body);

    Map<String, Object> json = user.toJson();
    @SuppressWarnings("unchecked")
    Map<String, Object> perfil = (Map<String, Object>) json.get("profile");

    assertEquals("forca", perfil.get("trainingGoal"));
    assertEquals("de_1_a_2_anos", perfil.get("trainingExperience"));
    assertEquals("semanal_3_4", perfil.get("recentFrequency"));
    assertEquals(4, ((Number) perfil.get("availableDays")).intValue());
    assertEquals(75, ((Number) perfil.get("preferredSessionMinutes")).intValue());
    assertEquals("masculino", perfil.get("gender"));
    assertEquals(180.0, ((Number) perfil.get("height")).doubleValue());
    assertEquals(80.0, ((Number) perfil.get("weight")).doubleValue());
    assertEquals("mesomorfo", perfil.get("bodyType"));
    assertEquals("11999999999", perfil.get("phone"));
    assertFalse(perfil.containsKey("physicalLimitations"));
  }

  @Test
  void aceitaValoresPermitidos() {
    Map<String, Object> body = perfilCompleto();

    Validator validator = new Validator(body);
    TrainingProfile.validate(validator, true);
    assertFalse(validator.hasErrors());

    User.Profile profile = pessoal();
    TrainingProfile.apply(profile, body);

    assertEquals("forca", profile.trainingGoal);
    assertEquals("de_1_a_2_anos", profile.trainingExperience);
    assertEquals("semanal_3_4", profile.recentFrequency);
    assertEquals(4, profile.availableDays);
    assertEquals(75, profile.preferredSessionMinutes);
    assertFalse(profile.toDocument().containsKey("physicalLimitations"));
  }

  @Test
  void rejeitaObjetivoExperienciaFrequenciaDiasEDuracao() {
    assertTrue(invalido(TrainingProfile.GOAL, "emagrecer"));
    assertTrue(invalido(TrainingProfile.EXPERIENCE, "avancado"));
    assertTrue(invalido(TrainingProfile.FREQUENCY, "todos os dias"));
    assertTrue(invalido(TrainingProfile.DAYS, 0));
    assertTrue(invalido(TrainingProfile.DAYS, 7));
    assertTrue(invalido(TrainingProfile.MINUTES, 50));
    assertTrue(invalido(TrainingProfile.MINUTES, 100));
  }

  @Test
  void cadastroExigeSelecoesEAtualizacaoParcialAceitaAusencia() {
    Validator incompleto = new Validator(new LinkedHashMap<>());
    TrainingProfile.validate(incompleto, true);
    assertTrue(incompleto.hasErrors());
    assertTrue(temErro(incompleto, TrainingProfile.GOAL));
    assertTrue(temErro(incompleto, TrainingProfile.EXPERIENCE));
    assertTrue(temErro(incompleto, TrainingProfile.FREQUENCY));
    assertTrue(temErro(incompleto, TrainingProfile.DAYS));
    assertTrue(temErro(incompleto, TrainingProfile.MINUTES));

    Validator parcial = new Validator(new LinkedHashMap<>());
    TrainingProfile.validate(parcial, false);
    assertFalse(parcial.hasErrors());
  }

  @Test
  void atualizacaoParcialPreservaPessoaisObjetivoAntigoENaoMexeEmGoals() {
    User.Profile profile = pessoal();
    profile.goals = Arrays.asList("perder peso");
    profile.fitnessLevel = "intermediario";
    profile.trainingGoal = "hipertrofia";
    profile.trainingExperience = "nunca";

    Map<String, Object> body = new LinkedHashMap<>();
    body.put(TrainingProfile.FREQUENCY, "irregular");
    body.put("environment", "casa");
    body.put("equipment", Arrays.asList("halter"));
    body.put("trainingBreak", "6 meses");
    body.put("physicalLimitations", "dor no ombro");

    Validator validator = new Validator(body);
    TrainingProfile.validate(validator, false);
    assertFalse(validator.hasErrors());
    TrainingProfile.apply(profile, body);

    assertEquals("masculino", profile.gender);
    assertEquals(180.0, profile.height);
    assertEquals(80.0, profile.weight);
    assertEquals("mesomorfo", profile.bodyType);
    assertEquals(List.of("perder peso"), profile.goals);
    assertEquals("intermediario", profile.fitnessLevel);
    assertEquals("hipertrofia", profile.trainingGoal);
    assertEquals("nunca", profile.trainingExperience);
    assertEquals("irregular", profile.recentFrequency);
    assertNull(profile.availableDays);
    assertNull(profile.preferredSessionMinutes);
    assertFalse(profile.toDocument().containsKey("physicalLimitations"));
  }

  @Test
  void perfilAntigoSemCamposNovosContinuaValido() {
    Document antigo =
        new Document("gender", "feminino")
            .append("height", 165)
            .append("weight", 62)
            .append("bodyType", "ectomorfo")
            .append("goals", Arrays.asList())
            .append("fitnessLevel", "iniciante");

    User.Profile profile = User.Profile.fromDocument(antigo);
    assertNull(profile.trainingGoal);
    assertNull(profile.trainingExperience);
    assertNull(profile.recentFrequency);
    assertNull(profile.availableDays);
    assertNull(profile.preferredSessionMinutes);
    assertEquals("feminino", profile.gender);
    assertEquals(165.0, profile.height);
    assertEquals("iniciante", profile.fitnessLevel);

    Document gravado = profile.toDocument();
    assertFalse(gravado.containsKey(TrainingProfile.GOAL));
    assertFalse(gravado.containsKey(TrainingProfile.DAYS));
    assertFalse(gravado.containsKey("trainingBreak"));
    assertFalse(gravado.containsKey("environment"));
    assertFalse(gravado.containsKey("equipment"));
    assertFalse(gravado.containsKey("physicalLimitations"));

    User user = usuario();
    user.setProfile(profile);
    user.validate();
  }

  @Test
  void roundTripNaoPromoveExperienciaANivelENaoCopiaObjetivoParaGoals() {
    User.Profile profile = pessoal();
    profile.trainingGoal = "resistencia";
    profile.trainingExperience = "mais_de_5_anos";
    profile.recentFrequency = "semanal_5_mais";
    profile.availableDays = 6;
    profile.preferredSessionMinutes = 120;

    User.Profile lido = User.Profile.fromDocument(profile.toDocument());
    assertEquals("resistencia", lido.trainingGoal);
    assertEquals("mais_de_5_anos", lido.trainingExperience);
    assertEquals("semanal_5_mais", lido.recentFrequency);
    assertEquals(6, lido.availableDays);
    assertEquals(120, lido.preferredSessionMinutes);
    assertFalse(lido.toDocument().containsKey("physicalLimitations"));
    assertNull(lido.fitnessLevel);
    assertTrue(lido.goals.isEmpty());
  }

  @Test
  void persistenciaRejeitaValorInvalidoEAceitaCampoAusente() {
    User user = usuario();
    user.getProfile().gender = "masculino";
    user.getProfile().height = 180.0;
    user.getProfile().weight = 80.0;
    user.getProfile().bodyType = "mesomorfo";
    user.validate();

    user.getProfile().trainingGoal = "cutting";
    assertThrows(User.ValidationFailure.class, user::validate);

    user.getProfile().trainingGoal = null;
    user.getProfile().availableDays = 8;
    assertThrows(User.ValidationFailure.class, user::validate);

    user.getProfile().availableDays = null;
    user.getProfile().preferredSessionMinutes = 40;
    assertThrows(User.ValidationFailure.class, user::validate);
  }

  @Test
  void modeloNaoTemInterrupcaoAmbienteNemEquipamento() {
    assertEquals(
        List.of(
            "trainingGoal",
            "trainingExperience",
            "recentFrequency",
            "availableDays",
            "preferredSessionMinutes"),
        TrainingProfile.CAMPOS);

    User.Profile profile = pessoal();
    TrainingProfile.apply(profile, perfilCompleto());
    for (String chave : profile.toDocument().keySet()) {
      String normalizada = chave.toLowerCase();
      assertFalse(normalizada.contains("break"));
      assertFalse(normalizada.contains("interrupt"));
      assertFalse(normalizada.contains("environment"));
      assertFalse(normalizada.contains("equipment"));
      assertFalse(normalizada.contains("afast"));
      assertFalse(normalizada.contains("limitation"));
    }
  }

  private static boolean invalido(String campo, Object valor) {
    Map<String, Object> body = perfilCompleto();
    body.put(campo, valor);
    Validator validator = new Validator(body);
    TrainingProfile.validate(validator, true);
    return temErro(validator, campo);
  }

  private static boolean temErro(Validator validator, String campo) {
    for (Map<String, Object> erro : validator.errors()) {
      if (campo.equals(erro.get("path"))) {
        return true;
      }
    }
    return false;
  }

  private static Map<String, Object> perfilCompleto() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put(TrainingProfile.GOAL, "forca");
    body.put(TrainingProfile.EXPERIENCE, "de_1_a_2_anos");
    body.put(TrainingProfile.FREQUENCY, "semanal_3_4");
    body.put(TrainingProfile.DAYS, 4);
    body.put(TrainingProfile.MINUTES, 75);
    return body;
  }

  private static User.Profile pessoal() {
    User.Profile profile = new User.Profile();
    profile.gender = "masculino";
    profile.height = 180.0;
    profile.weight = 80.0;
    profile.bodyType = "mesomorfo";
    return profile;
  }

  private static User usuario() {
    User user = new User();
    user.setName("Ana");
    user.setEmail("ana@example.com");
    user.setPassword("segura1");
    return user;
  }
}
