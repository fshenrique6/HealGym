package com.healgym.service.rotina;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;

import com.healgym.model.User;
import com.healgym.service.ExerciseDatabase;
import com.healgym.validation.TrainingProfile;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * As 3.240 combinações válidas de objetivo, experiência, frequência, dias e duração. Academia
 * completa, sem limitação e sem histórico. Uma combinação que não lança exceção ainda pode ser
 * inválida.
 */
class Fase0MatrizTest {

  @Test
  void matrizDe3240CombinacoesNaoAprovaProgramaInvalido() {
    int total = 0;
    int invalidas = 0;
    int grandesZerados = 0;
    int abaixoImpossivel = 0;
    int comAlgumAbaixo = 0;
    Map<String, Integer> estrategias = new LinkedHashMap<>();
    List<String> exemplos = new ArrayList<>();
    for (String objetivo : TrainingProfile.GOALS) {
      for (String experiencia : TrainingProfile.EXPERIENCES) {
        for (String frequencia : TrainingProfile.FREQUENCIES) {
          for (int dias = 1; dias <= 6; dias++) {
            for (int minutos : TrainingProfile.SESSION_MINUTES) {
              total++;
              String contexto =
                  objetivo + " / " + experiencia + " / " + frequencia + " / " + dias + "d / " + minutos + "min";
              User.Profile bruto = Fase0Suporte.perfil(objetivo, experiencia, frequencia, dias, minutos);
              PerfilInterpretado perfil = Fase0Suporte.interpretar(bruto);
              MotorRotina.Proposta proposta;
              try {
                proposta = Fase0Suporte.gerar(perfil);
              } catch (RuntimeException e) {
                invalidas++;
                anotar(exemplos, contexto + " lançou " + e.getClass().getSimpleName() + ": " + e.getMessage());
                continue;
              }
              String repetida = Fase0Suporte.gerar(perfil).assinatura;
              String problema = invalida(proposta, perfil, repetida);
              if (problema != null) {
                invalidas++;
                anotar(exemplos, contexto + " — " + problema);
              }
              estrategias.merge(proposta.estrategia(), 1, Integer::sum);
              boolean abaixo = false;
              boolean zerouGrande = false;
              boolean abaixoFolgado = false;
              for (Map<String, Object> linha : proposta.volume) {
                if ("abaixo".equals(linha.get("status"))) {
                  abaixo = true;
                }
                boolean grande = false;
                for (String grupo : Fase0Suporte.GRANDES) {
                  grande |= grupo.equals(linha.get("codigo"));
                }
                if (!grande) {
                  continue;
                }
                if (Fase0Suporte.numero(linha.get("efetivas")) <= 0.01) {
                  zerouGrande = true;
                  anotar(exemplos, contexto + " — " + linha.get("rotulo") + " sem estímulo efetivo");
                }
                if ("abaixo".equals(linha.get("status"))
                    && minutos == 120
                    && proposta.totalSessoes() >= 3
                    && perfil.capacidade >= 2) {
                  abaixoFolgado = true;
                  anotar(
                      exemplos,
                      contexto
                          + " — "
                          + linha.get("rotulo")
                          + " abaixo do próprio mínimo ("
                          + linha.get("efetivas")
                          + "/"
                          + linha.get("minimo")
                          + ") em "
                          + proposta.estrategia());
                }
              }
              if (zerouGrande) {
                grandesZerados++;
              }
              if (abaixoFolgado) {
                abaixoImpossivel++;
              }
              if (abaixo) {
                comAlgumAbaixo++;
              }
            }
          }
        }
      }
    }
    int esperadas =
        TrainingProfile.GOALS.size()
            * TrainingProfile.EXPERIENCES.size()
            * TrainingProfile.FREQUENCIES.size()
            * 6
            * TrainingProfile.SESSION_MINUTES.size();
    String resumo =
        "MATRIZ "
            + total
            + " combinações (esperado "
            + esperadas
            + ")"
            + "\ninválidas="
            + invalidas
            + "\ngrandesSemEstímulo="
            + grandesZerados
            + "\nabaixoCom120minE3ouMaisSessoes="
            + abaixoImpossivel
            + "\ncomAlgumGrupoAbaixo="
            + comAlgumAbaixo
            + "\nestruturas="
            + estrategias
            + "\nexemplos="
            + exemplos;
    System.out.println(resumo);
    assertEquals(esperadas, total, resumo);
    if (invalidas > 0 || grandesZerados > 0 || abaixoImpossivel > 0) {
      fail(resumo);
    }
  }

  private static String invalida(MotorRotina.Proposta proposta, PerfilInterpretado perfil, String repetida) {
    if (!proposta.assinatura.equals(repetida)) {
      return "assinatura instável";
    }
    if (proposta.totalSessoes() != Math.min(perfil.dias, perfil.maxSessoes)) {
      return "sessões " + proposta.totalSessoes() + " em vez de " + Math.min(perfil.dias, perfil.maxSessoes);
    }
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      if (sessao.itens.size() < 3) {
        return "Treino " + sessao.codigo + " com " + sessao.itens.size() + " exercícios";
      }
      boolean avisouTempo = false;
      for (String aviso : sessao.avisos) {
        avisouTempo |= aviso.startsWith("Mesmo só com os exercícios essenciais");
      }
      if (sessao.segundos() > sessao.minutos * 60 && !avisouTempo) {
        return "Treino " + sessao.codigo + " passa de " + sessao.minutos + " min sem aviso";
      }
      int total = 0;
      Map<String, Integer> porGrupo = new LinkedHashMap<>();
      Set<String> ids = new HashSet<>();
      for (Map<String, Object> item : sessao.itens) {
        String id = String.valueOf(item.get("exercicioId"));
        ExerciseDatabase.Exercise exercicio = ExerciseDatabase.porId(id);
        if (exercicio == null || !exercicio.ativo) {
          return "exercício fora do catálogo " + id;
        }
        if (!perfil.preferencias.permite(exercicio)) {
          return exercicio.nome + " contraria as preferências";
        }
        if (exercicio.dificuldade > SeletorExercicios.dificuldadeMaxima(perfil.nivelTecnico)) {
          return exercicio.nome + " acima da dificuldade do nível";
        }
        if (!ids.add(id)) {
          return "exercício repetido " + id;
        }
        int series = MontadorSessao.numero(item.get("series"));
        if (series < 2) {
          return exercicio.nome + " com " + series + " séries";
        }
        total += series;
        String grupo = VolumeSemanal.grupo((String) item.get("musculoPrincipalCodigo"));
        if (grupo != null) {
          porGrupo.merge(grupo, series, Integer::sum);
        }
        if (perfil.conservador()
            && item.get("rirAlvo") != null
            && !"2-3".equals(item.get("rirAlvo"))) {
          return exercicio.nome + " com RIR " + item.get("rirAlvo") + " num perfil conservador";
        }
        if (perfil.conservador()
            && "forca".equals(perfil.objetivo)
            && Prescricao.PRINCIPAL.equals(item.get("papel"))
            && "4-6".equals(item.get("repeticoes"))) {
          return "faixa 4-6 para perfil conservador";
        }
      }
      if (total > MontadorSessao.capSeriesSessao(perfil.capacidade)) {
        return "Treino " + sessao.codigo + " com " + total + " séries, acima do teto";
      }
      for (Map.Entry<String, Integer> grupo : porGrupo.entrySet()) {
        if (grupo.getValue() > MontadorSessao.capGrupoSessao(perfil.capacidade)) {
          return grupo.getKey() + " acima do teto na sessão " + sessao.codigo;
        }
      }
    }
    for (Map<String, Object> linha : proposta.volume) {
      if ("acima".equals(linha.get("status"))) {
        return linha.get("rotulo") + " acima do máximo semanal";
      }
    }
    return null;
  }

  private static void anotar(List<String> exemplos, String texto) {
    if (exemplos.size() < 12) {
      exemplos.add(texto);
    }
  }
}
