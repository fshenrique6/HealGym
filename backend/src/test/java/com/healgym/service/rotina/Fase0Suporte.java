package com.healgym.service.rotina;

import com.healgym.model.User;
import com.healgym.service.ExerciseDatabase;
import com.healgym.web.ApiException;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Apoio dos testes da Fase 0. Não altera produção: só monta perfis, lê o volume da proposta e tenta
 * gravar numa memória isolada.
 */
final class Fase0Suporte {

  static final int SEED = 12345;
  static final Date AGORA = new Date(1_700_000_000_000L);

  static final String[] GRANDES = {"peito", "costas", "quadriceps", "isquiotibiais"};

  private Fase0Suporte() {}

  static User.Profile perfil(String objetivo, String experiencia, String frequencia, int dias, int minutos) {
    User.Profile perfil = new User.Profile();
    perfil.trainingGoal = objetivo;
    perfil.trainingExperience = experiencia;
    perfil.recentFrequency = frequencia;
    perfil.availableDays = dias;
    perfil.preferredSessionMinutes = minutos;
    return perfil;
  }

  /** Perfil cuja capacidade comporta exatamente {@code sessoes} sessões quando há dias suficientes. */
  static User.Profile perfilParaSessoes(int sessoes, String objetivo, int minutos) {
    switch (sessoes) {
      case 1:
        return perfil(objetivo, "nunca", "nenhuma", 1, minutos);
      case 2:
        return perfil(objetivo, "nunca", "nenhuma", 2, minutos);
      case 3:
        return perfil(objetivo, "nunca", "nenhuma", 3, minutos);
      case 4:
        return perfil(objetivo, "de_1_a_2_anos", "semanal_3_4", 4, minutos);
      case 5:
        return perfil(objetivo, "de_6_a_12_meses", "semanal_5_mais", 5, minutos);
      case 6:
        return perfil(objetivo, "de_2_a_5_anos", "semanal_5_mais", 6, minutos);
      default:
        throw new IllegalArgumentException("Sessões fora de 1 a 6: " + sessoes);
    }
  }

  static PreferenciasTreino preferencias(Map<String, Object> bruto) {
    List<String> erros = new ArrayList<>();
    PreferenciasTreino prefs = PreferenciasTreino.ler(bruto, erros);
    if (!erros.isEmpty()) {
      throw new IllegalArgumentException("Preferências de teste inválidas: " + erros);
    }
    return prefs;
  }

  static PerfilInterpretado interpretar(User.Profile perfil, PreferenciasTreino prefs, int concluidos) {
    return PerfilInterpretado.interpretar(
        perfil, prefs == null ? PreferenciasTreino.padrao() : prefs, concluidos);
  }

  static PerfilInterpretado interpretar(User.Profile perfil) {
    return interpretar(perfil, null, -1);
  }

  static MotorRotina.Proposta gerar(PerfilInterpretado perfil) {
    return MotorRotina.gerar(new MotorRotina.Pedido(perfil, SEED));
  }

  static MotorRotina.Proposta gerar(PerfilInterpretado perfil, String estrategia) {
    MotorRotina.Pedido pedido = new MotorRotina.Pedido(perfil, SEED);
    pedido.estrategia = estrategia;
    return MotorRotina.gerar(pedido);
  }

  static User usuario(User.Profile perfil) {
    return RotinaServicoTest.usuario(
        perfil.trainingGoal,
        perfil.trainingExperience,
        perfil.recentFrequency,
        perfil.availableDays,
        perfil.preferredSessionMinutes);
  }

  static Map<String, Object> corpo(User usuario, Map<String, Object> preferencias) {
    Map<String, Object> corpo = RotinaServicoTest.corpo(usuario);
    if (preferencias != null) {
      corpo.put("preferencias", preferencias);
    }
    return corpo;
  }

  static final class Gravacao {
    final Map<String, Object> previa;
    final boolean salvou;
    final String erro;

    Gravacao(Map<String, Object> previa, boolean salvou, String erro) {
      this.previa = previa;
      this.salvou = salvou;
      this.erro = erro;
    }
  }

  /** Prévia e tentativa de salvar, sem confirmação extra, num armazenamento em memória. */
  static Gravacao tentarSalvar(User usuario, Map<String, Object> corpo) {
    RotinaServico servico = new RotinaServico(new ArmazemMemoria(), () -> AGORA);
    Map<String, Object> previa = servico.previa(usuario, corpo);
    Map<String, Object> pedido = new LinkedHashMap<>(corpo);
    pedido.put("assinaturaPrevia", previa.get("assinatura"));
    try {
      servico.salvar(usuario, pedido);
      return new Gravacao(previa, true, null);
    } catch (ApiException e) {
      Object mensagem = e.getBody() == null ? null : e.getBody().get("message");
      return new Gravacao(previa, false, e.getStatus() + ": " + mensagem);
    }
  }

  static double numero(Object valor) {
    return valor instanceof Number ? ((Number) valor).doubleValue() : 0;
  }

  @SuppressWarnings("unchecked")
  static List<Map<String, Object>> volumeDe(Map<String, Object> previa) {
    return (List<Map<String, Object>>) previa.get("volume");
  }

  @SuppressWarnings("unchecked")
  static List<String> avisosDe(Map<String, Object> previa) {
    Object avisos = previa.get("avisos");
    if (!(avisos instanceof List)) {
      return new ArrayList<>();
    }
    List<String> lista = new ArrayList<>();
    for (Object aviso : (List<Object>) avisos) {
      lista.add(String.valueOf(aviso));
    }
    return lista;
  }

  static Map<String, Object> linha(List<Map<String, Object>> volume, String codigo) {
    for (Map<String, Object> linha : volume) {
      if (codigo.equals(linha.get("codigo"))) {
        return linha;
      }
    }
    return null;
  }

  static Map<String, Object> linha(MotorRotina.Proposta proposta, String codigo) {
    for (Map<String, Object> linha : proposta.volume) {
      if (codigo.equals(linha.get("codigo"))) {
        return linha;
      }
    }
    return null;
  }

  /** Grupos cujo próprio mínimo é positivo e que ficaram com estímulo efetivo zero. */
  static List<String> gruposSemEstimulo(List<Map<String, Object>> volume) {
    List<String> grupos = new ArrayList<>();
    for (Map<String, Object> linha : volume) {
      if (numero(linha.get("minimo")) > 0 && numero(linha.get("efetivas")) <= 0.01) {
        grupos.add(String.valueOf(linha.get("codigo")));
      }
    }
    return grupos;
  }

  static List<String> gruposSemEstimulo(MotorRotina.Proposta proposta) {
    return gruposSemEstimulo(proposta.volume);
  }

  /** Diretas zero, mas com algum estímulo indireto. Não é tratado como músculo intocado. */
  static List<String> somenteIndiretos(List<Map<String, Object>> volume) {
    List<String> grupos = new ArrayList<>();
    for (Map<String, Object> linha : volume) {
      if (numero(linha.get("diretas")) <= 0.01 && numero(linha.get("indiretas")) > 0.01) {
        grupos.add(String.valueOf(linha.get("codigo")));
      }
    }
    return grupos;
  }

  static boolean avisoNomeia(List<String> avisos, String rotulo) {
    String alvo = rotulo.toLowerCase(new Locale("pt", "BR"));
    for (String aviso : avisos) {
      if (aviso.toLowerCase(new Locale("pt", "BR")).contains(alvo)) {
        return true;
      }
    }
    return false;
  }

  static String descrever(List<Map<String, Object>> volume, List<String> codigos) {
    StringBuilder texto = new StringBuilder();
    for (String codigo : codigos) {
      Map<String, Object> linha = linha(volume, codigo);
      if (linha == null) {
        continue;
      }
      if (texto.length() > 0) {
        texto.append("; ");
      }
      texto
          .append(linha.get("rotulo"))
          .append(" diretas=")
          .append(linha.get("diretas"))
          .append(" indiretas=")
          .append(linha.get("indiretas"))
          .append(" efetivas=")
          .append(linha.get("efetivas"))
          .append(" mínimo=")
          .append(linha.get("minimo"));
    }
    return texto.toString();
  }

  static boolean existeCompativel(String grupo, PerfilInterpretado perfil) {
    List<ModelosSessao.Vaga> vagas = ModelosSessao.COMPLEMENTOS.get(grupo);
    if (vagas == null) {
      return false;
    }
    for (ModelosSessao.Vaga vaga : vagas) {
      for (ExerciseDatabase.Exercise exercicio :
          SeletorExercicios.candidatos(vaga.todosPadroes(), null, perfil)) {
        if (grupo.equals(VolumeSemanal.grupo(exercicio.principal))) {
          return true;
        }
      }
    }
    return false;
  }

  static List<String> idsDoGrupo(String grupo) {
    List<String> ids = new ArrayList<>();
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.ativos()) {
      if (grupo.equals(exercicio.grupo)) {
        ids.add(exercicio.id);
      }
    }
    return ids;
  }

  static String textoVisivel(ExerciseDatabase.Exercise exercicio) {
    return (exercicio.nome
            + " "
            + exercicio.tecnica
            + " "
            + exercicio.cuidado
            + " "
            + exercicio.enfase)
        .toLowerCase(new Locale("pt", "BR"));
  }
}
