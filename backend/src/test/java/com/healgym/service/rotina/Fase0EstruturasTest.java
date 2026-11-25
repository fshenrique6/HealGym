package com.healgym.service.rotina;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.healgym.model.User;
import com.healgym.service.ExerciseDatabase;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;

/** As divisões oferecidas precisam conseguir cumprir o volume que o próprio motor define. */
class Fase0EstruturasTest {

  @Test
  void estruturaOferecidaNaoPodeFicarAbaixoDoProprioMinimo() {
    List<String> problemas = new ArrayList<>();
    for (EstrategiaSemanal.Estrutura estrutura : EstrategiaSemanal.ESTRUTURAS.values()) {
      if (estrutura.modelos.size() < 3) {
        continue;
      }
      for (int capacidadeAlvo : new int[] {2, 3}) {
        User.Profile bruto = perfilDaEstrutura(estrutura.modelos.size(), capacidadeAlvo);
        PerfilInterpretado perfil = Fase0Suporte.interpretar(bruto);
        if (!oferecida(perfil, estrutura.codigo)) {
          continue;
        }
        MotorRotina.Proposta proposta = Fase0Suporte.gerar(perfil, estrutura.codigo);
        for (String grupo : Fase0Suporte.GRANDES) {
          Map<String, Object> linha = Fase0Suporte.linha(proposta, grupo);
          if (!"abaixo".equals(linha.get("status"))) {
            continue;
          }
          int frequencia = (int) Fase0Suporte.numero(linha.get("frequencia"));
          int teto = MontadorSessao.capGrupoSessao(perfil.capacidade) * Math.max(1, frequencia);
          problemas.add(
              estrutura.codigo
                  + " / capacidade "
                  + perfil.capacidade
                  + " / "
                  + perfil.minutos
                  + " min: "
                  + linha.get("rotulo")
                  + " ficou com "
                  + linha.get("efetivas")
                  + " de "
                  + linha.get("minimo")
                  + " (frequência direta "
                  + frequencia
                  + ", teto alcançável "
                  + teto
                  + ")");
        }
      }
    }
    assertTrue(
        problemas.isEmpty(),
        "Estruturas oferecidas não atingem o mínimo do próprio VolumeSemanal, com 120 min e academia completa: "
            + problemas);
  }

  @Test
  void textoNaoPodePrometerFrequenciaQueOModeloNaoEntrega() {
    List<String> problemas = new ArrayList<>();
    conferirFrequencia(problemas, "full_body_2", 2, "duas vezes", 2);
    conferirFrequencia(problemas, "full_body_3", 3, "três vezes", 3);
    assertTrue(problemas.isEmpty(), "A explicação promete mais frequência do que a proposta entrega: " + problemas);
  }

  @Test
  void descansoRecomendadoNaoImpedeIniciarNoMesmoInstante() {
    User.Profile bruto = Fase0Suporte.perfil("hipertrofia", "mais_de_5_anos", "semanal_3_4", 2, 75);
    User usuario = Fase0Suporte.usuario(bruto);
    ArmazemMemoria armazem = new ArmazemMemoria();
    RotinaServico servico = new RotinaServico(armazem, () -> Fase0Suporte.AGORA);
    Map<String, Object> corpo = RotinaServicoTest.corpo(usuario);
    Map<String, Object> previa = servico.previa(usuario, corpo);
    corpo.put("assinaturaPrevia", previa.get("assinatura"));
    Map<String, Object> salva = servico.salvar(usuario, corpo);
    @SuppressWarnings("unchecked")
    org.bson.Document rotina = (org.bson.Document) salva.get("rotina");
    boolean descanso = false;
    Object sequencia = rotina.get("sequencia");
    if (sequencia instanceof List) {
      for (Object passo : (List<?>) sequencia) {
        if (passo instanceof Map && "A".equals(((Map<?, ?>) passo).get("codigo"))) {
          descanso = Boolean.TRUE.equals(((Map<?, ?>) passo).get("descansoDepois"));
        }
      }
    }
    assertTrue(descanso, "O cenário precisa recomendar descanso depois do Treino A para testar a recuperação");
    ObjectId treinoA = (ObjectId) servico.iniciar(usuario, "A").get("treinoId");
    armazem.concluir(treinoA, Fase0Suporte.AGORA);
    Map<String, Object> inicio = servico.iniciar(usuario, "B");
    assertNotNull(
        inicio.get("avisoRecuperacao"),
        "O Treino B foi iniciado no mesmo instante da conclusão do A, embora a sequência peça descanso. Resposta: "
            + inicio);
  }

  @Test
  void trocaPodeMudarOMusculoSemReequilibrar() {
    PerfilInterpretado perfil =
        Fase0Suporte.interpretar(Fase0Suporte.perfil("hipertrofia", "de_2_a_5_anos", "semanal_3_4", 4, 90));
    MotorRotina.Proposta proposta = Fase0Suporte.gerar(perfil);
    int oferecidas = 0;
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        String grupo = VolumeSemanal.grupo((String) item.get("musculoPrincipalCodigo"));
        List<Map<String, Object>> opcoes =
            MotorRotina.opcoesDeTroca(
                sessao.itens,
                MontadorSessao.numero(item.get("posicao")),
                sessao.modelo.foco,
                perfil,
                sessao.minutos);
        oferecidas += opcoes.size();
        for (Map<String, Object> opcao : opcoes) {
          ExerciseDatabase.Exercise exercicio =
              ExerciseDatabase.porId(String.valueOf(opcao.get("exercicioId")));
          String outro = VolumeSemanal.grupo(exercicio.principal);
          if (outro == null || outro.equals(grupo)) {
            continue;
          }
          MotorRotina.Pedido pedido = new MotorRotina.Pedido(perfil, Fase0Suporte.SEED);
          pedido.ajustes.add(
              new MotorRotina.Ajuste(
                  sessao.codigo, MontadorSessao.numero(item.get("posicao")), exercicio.id));
          MotorRotina.Proposta depois = MotorRotina.gerar(pedido);
          double antes = Fase0Suporte.numero(Fase0Suporte.linha(proposta, grupo).get("efetivas"));
          double apos = Fase0Suporte.numero(Fase0Suporte.linha(depois, grupo).get("efetivas"));
          assertEquals(
              grupo,
              outro,
              "A troca de "
                  + item.get("nome")
                  + " para "
                  + exercicio.nome
                  + " muda "
                  + grupo
                  + " ("
                  + antes
                  + ") para "
                  + outro
                  + " e o volume efetivo de "
                  + grupo
                  + " vai a "
                  + apos
                  + " sem novo equilíbrio. Avisos: "
                  + depois.avisos);
        }
      }
    }
    assertTrue(oferecidas > 0, "O motor precisa continuar oferecendo trocas do mesmo grupo muscular.");
  }

  private static void conferirFrequencia(
      List<String> problemas, String estrategia, int dias, String promessa, int frequenciaMinima) {
    User.Profile bruto = Fase0Suporte.perfil("hipertrofia", "de_2_a_5_anos", "semanal_5_mais", dias, 90);
    PerfilInterpretado perfil = Fase0Suporte.interpretar(bruto);
    assertTrue(oferecida(perfil, estrategia), estrategia + " deveria ser oferecida a este perfil");
    MotorRotina.Proposta proposta = Fase0Suporte.gerar(perfil, estrategia);
    String porque = EstrategiaSemanal.porque(EstrategiaSemanal.ESTRUTURAS.get(estrategia), perfil);
    assertTrue(porque.contains(promessa), porque);
    for (Map<String, Object> linha : proposta.volume) {
      if (Fase0Suporte.numero(linha.get("minimo")) <= 0) {
        continue;
      }
      int frequencia = (int) Fase0Suporte.numero(linha.get("frequencia"));
      if (frequencia < frequenciaMinima) {
        problemas.add(
            estrategia + ": " + linha.get("rotulo") + " aparece " + frequencia + " vez(es), texto \"" + porque + "\"");
      }
    }
  }

  private static boolean oferecida(PerfilInterpretado perfil, String codigo) {
    for (EstrategiaSemanal.Estrutura estrutura : EstrategiaSemanal.viaveis(perfil, EstrategiaSemanal.sessoes(perfil))) {
      if (estrutura.codigo.equals(codigo)) {
        return true;
      }
    }
    return false;
  }

  /** 120 minutos para o tempo não ser a desculpa. Capacidade 2 ou 3, com dias iguais ao tamanho da estrutura. */
  private static User.Profile perfilDaEstrutura(int sessoes, int capacidade) {
    if (capacidade >= 3) {
      return Fase0Suporte.perfil("hipertrofia", "mais_de_5_anos", "semanal_5_mais", sessoes, 120);
    }
    if (sessoes >= 5) {
      return Fase0Suporte.perfil("hipertrofia", "de_1_a_2_anos", "semanal_5_mais", sessoes, 120);
    }
    return Fase0Suporte.perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", sessoes, 120);
  }
}
