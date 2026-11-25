package com.healgym.service.rotina;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.healgym.model.User;
import com.healgym.service.ExerciseDatabase;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class MotorRotinaTest {

  private static final int SEED = 12345;
  private static final List<Integer> DURACOES = Arrays.asList(30, 45, 60, 75, 90, 120);
  private static final List<String> OBJETIVOS = Arrays.asList("hipertrofia", "forca", "resistencia");

  /** Perfis da matriz de testes: nome, experiência, frequência (null = não informado). */
  private static final String[][] PERFIS = {
    {"iniciante absoluto", "nunca", "nenhuma"},
    {"iniciante com baixa frequência", "menos_6_meses", "semanal_1_2"},
    {"retorno após pausa", "de_2_a_5_anos", "nenhuma"},
    {"intermediário regular", "de_1_a_2_anos", "semanal_3_4"},
    {"experiente regular", "mais_de_5_anos", "semanal_5_mais"},
    {"perfil antigo incompleto", null, null},
  };

  static User.Profile perfil(String objetivo, String exp, String freq, Integer dias, Integer minutos) {
    User.Profile p = new User.Profile();
    p.trainingGoal = objetivo;
    p.trainingExperience = exp;
    p.recentFrequency = freq;
    p.availableDays = dias;
    p.preferredSessionMinutes = minutos;
    return p;
  }

  static PerfilInterpretado interpretar(User.Profile perfil) {
    return PerfilInterpretado.interpretar(perfil, PreferenciasTreino.padrao(), -1);
  }

  static MotorRotina.Proposta gerar(PerfilInterpretado p) {
    return MotorRotina.gerar(new MotorRotina.Pedido(p, SEED));
  }

  static PreferenciasTreino preferencias(Map<String, Object> bruto) {
    List<String> erros = new ArrayList<>();
    PreferenciasTreino prefs = PreferenciasTreino.ler(bruto, erros);
    assertTrue(erros.isEmpty(), "preferências deveriam ser válidas: " + erros);
    return prefs;
  }

  static Map<String, Object> mapa(Object... pares) {
    Map<String, Object> mapa = new LinkedHashMap<>();
    for (int i = 0; i < pares.length; i += 2) {
      mapa.put((String) pares[i], pares[i + 1]);
    }
    return mapa;
  }

  /** Invariantes que toda proposta precisa respeitar. */
  static void validar(MotorRotina.Proposta proposta, PerfilInterpretado p, String contexto) {
    int esperadas = Math.min(p.dias, p.maxSessoes);
    assertEquals(esperadas, proposta.totalSessoes(), contexto + ": número de sessões");
    assertTrue(proposta.totalSessoes() <= p.maxSessoes, contexto + ": acima da capacidade");
    Set<String> uids = new HashSet<>();
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      String ctx = contexto + " / Treino " + sessao.codigo;
      assertTrue(sessao.itens.size() >= 3, ctx + ": sessão com menos de 3 exercícios");
      Set<String> ids = new HashSet<>();
      Map<String, Integer> porGrupo = new LinkedHashMap<>();
      int total = 0;
      boolean temComposto = false;
      for (int i = 0; i < sessao.itens.size(); i++) {
        Map<String, Object> item = sessao.itens.get(i);
        String id = String.valueOf(item.get("exercicioId"));
        ExerciseDatabase.Exercise e = ExerciseDatabase.porId(id);
        assertNotNull(e, ctx + ": exercício fora do catálogo " + id);
        assertTrue(e.ativo, ctx + ": exercício inativo " + id);
        assertTrue(
            e.dificuldade <= SeletorExercicios.dificuldadeMaxima(p.nivelTecnico),
            ctx + ": exercício difícil demais para o nível técnico " + id);
        assertTrue(p.preferencias.permite(e), ctx + ": exercício contraria as preferências " + id);
        assertTrue(ids.add(id), ctx + ": exercício repetido na sessão " + id);
        assertEquals(i + 1, MontadorSessao.numero(item.get("posicao")), ctx + ": posição");
        assertEquals(sessao.codigo + (i + 1), item.get("uid"), ctx + ": uid determinístico");
        assertTrue(uids.add(String.valueOf(item.get("uid"))), ctx + ": uid repetido na rotina");
        String papel = String.valueOf(item.get("papel"));
        int series = MontadorSessao.numero(item.get("series"));
        assertTrue(series >= 2, ctx + ": menos de 2 séries em " + id);
        int aproximacao = MontadorSessao.numero(item.get("seriesAproximacao"));
        if (i == 0) {
          assertTrue(aproximacao >= 1, ctx + ": a sessão começa sem série leve");
        }
        int topo = topoDaFaixa(String.valueOf(item.get("repeticoes")));
        if (Boolean.TRUE.equals(item.get("composto")) && sessao.minutos >= 75 && topo > 0 && topo <= 8) {
          assertTrue(aproximacao >= 2, ctx + ": composto pesado sem preparação em " + id);
        }
        assertTrue(
            series <= Prescricao.seriesMaximas(papel, p),
            ctx + ": séries acima do máximo em " + id + " (" + series + ")");
        total += series;
        String grupo = VolumeSemanal.grupo((String) item.get("musculoPrincipalCodigo"));
        if (grupo != null) {
          porGrupo.merge(grupo, series, Integer::sum);
        }
        temComposto |= Boolean.TRUE.equals(item.get("composto"));
        if (Prescricao.CORE.equals(papel)) {
          assertFalse(item.containsKey("rirAlvo"), ctx + ": core não deve ter RIR alvo");
        } else {
          assertNotNull(item.get("rirAlvo"), ctx + ": RIR alvo ausente em " + id);
          if (p.conservador()) {
            assertEquals("2-3", item.get("rirAlvo"), ctx + ": perfil conservador perto da falha");
          }
        }
        if (Prescricao.PRINCIPAL.equals(papel) && "forca".equals(p.objetivo) && p.conservador()) {
          assertNotEquals("4-6", item.get("repeticoes"), ctx + ": 4-6 para perfil conservador");
        }
      }
      if (temComposto) {
        assertEquals(
            Prescricao.PRINCIPAL,
            sessao.itens.get(0).get("papel"),
            ctx + ": o primeiro exercício deve ser o principal");
      }
      assertTrue(
          total <= MontadorSessao.capSeriesSessao(p.capacidade),
          ctx + ": séries por sessão acima do teto (" + total + ")");
      for (Map.Entry<String, Integer> grupo : porGrupo.entrySet()) {
        assertTrue(
            grupo.getValue() <= MontadorSessao.capGrupoSessao(p.capacidade),
            ctx + ": séries diretas de " + grupo.getKey() + " acima do teto por sessão");
      }
      boolean avisouTempo = false;
      for (String aviso : sessao.avisos) {
        avisouTempo |= aviso.startsWith("Mesmo só com os exercícios essenciais");
      }
      assertTrue(
          sessao.segundos() <= sessao.minutos * 60 || avisouTempo,
          ctx + ": passa do tempo sem aviso (" + sessao.duracaoMinutos() + " min)");
    }
    for (Map<String, Object> linha : proposta.volume) {
      assertNotEquals(
          "acima",
          linha.get("status"),
          contexto + ": volume semanal acima do máximo em " + linha.get("codigo"));
    }
    if (p.capacidade == 1) {
      assertTrue(proposta.estrategia().startsWith("full_body"), contexto + ": capacidade 1 fora do corpo inteiro");
    }
    assertEquals(64, proposta.assinatura.length(), contexto + ": assinatura");
    assertFalse(proposta.explicacao.isEmpty(), contexto + ": sem explicação");
  }

  @Test
  void matrizDePerfisObjetivosDiasEDuracoes() {
    int combinacoes = 0;
    for (String[] perfil : PERFIS) {
      for (String objetivo : OBJETIVOS) {
        for (int dias = 1; dias <= 6; dias++) {
          for (int minutos : DURACOES) {
            User.Profile bruto = perfil(objetivo, perfil[1], perfil[2], dias, minutos);
            if (perfil[1] == null) {
              bruto.fitnessLevel = "intermediario";
              bruto.trainingGoal = null;
              bruto.goals = Arrays.asList("ganhar massa muscular");
            }
            PerfilInterpretado p = interpretar(bruto);
            String contexto = perfil[0] + " / " + objetivo + " / " + dias + " dias / " + minutos + " min";
            MotorRotina.Proposta proposta = gerar(p);
            validar(proposta, p, contexto);
            assertEquals(
                proposta.assinatura,
                gerar(interpretar(bruto)).assinatura,
                contexto + ": geração não determinística");
            combinacoes++;
          }
        }
      }
    }
    assertEquals(PERFIS.length * OBJETIVOS.size() * 6 * DURACOES.size(), combinacoes);
  }

  @Test
  void inicianteComSeisDiasRecebeTresSessoesDeCorpoInteiroEExplicacao() {
    PerfilInterpretado p = interpretar(perfil("hipertrofia", "nunca", "nenhuma", 6, 60));
    MotorRotina.Proposta proposta = gerar(p);
    assertEquals("full_body_3", proposta.estrategia());
    assertEquals(3, proposta.totalSessoes());
    assertTrue(
        proposta.explicacao.stream().anyMatch(item -> "frequencia".equals(item.get("tipo"))),
        "deve explicar por que não usa os 6 dias");
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        if (item.get("rirAlvo") != null) {
          assertEquals("2-3", item.get("rirAlvo"));
        }
      }
    }
  }

  @Test
  void inicianteEExperienteNaoRecebemAMesmaPrescricao() {
    MotorRotina.Proposta iniciante =
        gerar(interpretar(perfil("hipertrofia", "nunca", "nenhuma", 3, 60)));
    MotorRotina.Proposta experiente =
        gerar(interpretar(perfil("hipertrofia", "mais_de_5_anos", "semanal_5_mais", 3, 60)));
    assertNotEquals(iniciante.assinatura, experiente.assinatura);
    assertNotEquals(iniciante.estrategia(), experiente.estrategia());
  }

  @Test
  void retornoAposPausaUsaVolumeDeReadaptacaoMasRespeitaAExperiencia() {
    PerfilInterpretado retorno = interpretar(perfil("hipertrofia", "de_2_a_5_anos", "nenhuma", 5, 60));
    assertEquals(3, retorno.nivelTecnico);
    assertEquals(1, retorno.capacidade);
    assertEquals("retorno", retorno.fase);
    MotorRotina.Proposta proposta = gerar(retorno);
    assertEquals(3, proposta.totalSessoes());
    boolean usaBarra = false;
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        usaBarra |= String.valueOf(item.get("equipamento")).contains("barra");
      }
    }
    assertTrue(usaBarra, "quem tem experiência mantém exercícios técnicos que já domina");
  }

  @Test
  void experienteComDoisDiasUsaCorpoInteiroEAvisaSobreVolume() {
    PerfilInterpretado p = interpretar(perfil("hipertrofia", "mais_de_5_anos", "semanal_3_4", 2, 90));
    MotorRotina.Proposta proposta = gerar(p);
    assertEquals("full_body_2", proposta.estrategia());
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      assertTrue(sessao.itens.size() >= 7, "com 90 min, a sessão deve aproveitar o tempo");
    }
    assertTrue(proposta.avisos.stream().anyMatch(a -> a.contains("menos séries do que o ideal")));
  }

  @Test
  void forcaComTrintaMinutosMantemPrincipaisECortaComplementaresComAviso() {
    PerfilInterpretado p = interpretar(perfil("forca", "de_2_a_5_anos", "semanal_3_4", 3, 30));
    MotorRotina.Proposta proposta = gerar(p);
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      assertTrue(sessao.segundos() <= 30 * 60, "Treino " + sessao.codigo + " passa de 30 min");
      assertEquals(Prescricao.PRINCIPAL, sessao.itens.get(0).get("papel"));
      assertFalse(sessao.removidosPorTempo.isEmpty(), "deveria registrar o que saiu");
      for (Map<String, Object> item : sessao.itens) {
        assertEquals(1, MontadorSessao.numero(item.get("prioridade")), "só essenciais cabem");
      }
    }
    assertTrue(proposta.avisos.stream().anyMatch(a -> a.startsWith("Treinos de força pedem descansos longos")));
    assertTrue(
        proposta.explicacao.stream()
            .anyMatch(item -> String.valueOf(item.get("texto")).contains("ficaram de fora")));
  }

  @Test
  void principalDeForcaEhBilateralEComBarraOuMaquinaQuandoUsa4a6() {
    PerfilInterpretado p = interpretar(perfil("forca", "mais_de_5_anos", "semanal_5_mais", 6, 75));
    MotorRotina.Proposta proposta = gerar(p);
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      Map<String, Object> principal = sessao.itens.get(0);
      assertEquals(Prescricao.PRINCIPAL, principal.get("papel"));
      assertFalse(Boolean.TRUE.equals(principal.get("unilateral")), "principal unilateral em " + sessao.codigo);
      if ("4-6".equals(principal.get("repeticoes"))) {
        ExerciseDatabase.Exercise e = ExerciseDatabase.porId(String.valueOf(principal.get("exercicioId")));
        assertTrue(Prescricao.cargaEstavel(e), "4-6 só com carga estável: " + e.nome);
      }
    }
  }

  @Test
  void dadosDemograficosNaoAlteramARotina() {
    User.Profile a = perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60);
    User.Profile b = perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60);
    a.gender = "masculino";
    a.bodyType = "ectomorfo";
    a.height = 190.0;
    a.weight = 95.0;
    a.dateOfBirth = new Date(0);
    b.gender = "feminino";
    b.bodyType = "endomorfo";
    b.height = 155.0;
    b.weight = 52.0;
    b.dateOfBirth = new Date();
    assertEquals(gerar(interpretar(a)).assinatura, gerar(interpretar(b)).assinatura);
  }

  @Test
  void perfilIncompletoUsaPadroesConservadoresEExplicaAsLacunas() {
    PerfilInterpretado p = interpretar(new User.Profile());
    assertEquals("nao_informado", p.fase);
    assertEquals(PerfilInterpretado.DIAS_PADRAO, p.dias);
    assertEquals(PerfilInterpretado.MINUTOS_PADRAO, p.minutos);
    assertEquals(5, p.lacunas.size());
    MotorRotina.Proposta proposta = gerar(p);
    validar(proposta, p, "perfil vazio");
    assertTrue(proposta.explicacao.stream().anyMatch(item -> "perfil".equals(item.get("tipo"))));
  }

  @Test
  void historicoDoAppSoElevaAFrequenciaConsiderada() {
    User.Profile bruto = perfil("hipertrofia", "de_1_a_2_anos", "irregular", 4, 60);
    PerfilInterpretado semHistorico = PerfilInterpretado.interpretar(bruto, PreferenciasTreino.padrao(), 0);
    PerfilInterpretado comHistorico = PerfilInterpretado.interpretar(bruto, PreferenciasTreino.padrao(), 12);
    assertEquals(1, semHistorico.capacidade);
    assertEquals(2, comHistorico.capacidade);
    assertTrue(comHistorico.frequenciaPeloHistorico);
    PerfilInterpretado regular =
        PerfilInterpretado.interpretar(
            perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60), PreferenciasTreino.padrao(), 0);
    assertEquals(2, regular.capacidade, "ausência de registros no app não reduz o declarado");
    assertTrue(
        gerar(comHistorico).explicacao.stream().anyMatch(item -> "historico".equals(item.get("tipo"))));
  }

  @Test
  void estruturaPedidaPrecisaSerViavel() {
    PerfilInterpretado intermediario = interpretar(perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 3, 60));
    MotorRotina.Pedido pedido = new MotorRotina.Pedido(intermediario, SEED);
    pedido.estrategia = "ppl_3";
    MotorRotina.Invalido recusa =
        assertThrows(MotorRotina.Invalido.class, () -> MotorRotina.gerar(pedido));
    assertTrue(recusa.getMessage().contains("corpo inteiro"));
    assertTrue(recusa.getMessage().contains("híbrida"));

    pedido.manterEstruturaSalva = true;
    assertEquals("ppl_3", MotorRotina.gerar(pedido).estrategia());

    PerfilInterpretado iniciante = interpretar(perfil("hipertrofia", "nunca", "nenhuma", 3, 60));
    MotorRotina.Pedido invalido = new MotorRotina.Pedido(iniciante, SEED);
    invalido.estrategia = "ppl_3";
    invalido.manterEstruturaSalva = true;
    assertThrows(MotorRotina.Invalido.class, () -> MotorRotina.gerar(invalido));
  }

  @Test
  void calendarioAceitaDomingoEAvisaSobreDiasSeguidosSemBloquear() {
    PerfilInterpretado p = interpretar(perfil("hipertrofia", "nunca", "nenhuma", 3, 60));
    MotorRotina.Pedido pedido = new MotorRotina.Pedido(p, SEED);
    pedido.agenda = mapa("modo", "calendario", "dias", Arrays.asList(7, 5, 6));
    MotorRotina.Proposta proposta = MotorRotina.gerar(pedido);
    assertEquals(Arrays.asList(5, 6, 7), proposta.diasAgenda());
    assertFalse(proposta.avisosAgenda.isEmpty(), "corpo inteiro em dias seguidos deve gerar aviso");
    assertTrue(proposta.avisosAgenda.get(0).contains("dias seguidos"));

    MotorRotina.Pedido espacado = new MotorRotina.Pedido(p, SEED);
    espacado.agenda = mapa("modo", "calendario", "dias", Arrays.asList(1, 3, 5));
    assertTrue(MotorRotina.gerar(espacado).avisosAgenda.isEmpty());
  }

  @Test
  void calendarioInvalidoEhRecusado() {
    PerfilInterpretado p = interpretar(perfil("hipertrofia", "nunca", "nenhuma", 3, 60));
    for (Object dias :
        Arrays.asList(
            Arrays.asList(1, 2),
            Arrays.asList(1, 1, 3),
            Arrays.asList(0, 2, 4),
            Arrays.asList(1, 2, 8),
            Arrays.asList(1.5, 2, 4),
            "1,2,3")) {
      MotorRotina.Pedido pedido = new MotorRotina.Pedido(p, SEED);
      pedido.agenda = mapa("modo", "calendario", "dias", dias);
      assertThrows(MotorRotina.Invalido.class, () -> MotorRotina.gerar(pedido), "dias " + dias);
    }
    MotorRotina.Pedido modo = new MotorRotina.Pedido(p, SEED);
    modo.agenda = mapa("modo", "aleatorio");
    assertThrows(MotorRotina.Invalido.class, () -> MotorRotina.gerar(modo));
  }

  @Test
  void sequenciaFlexivelNuncaPassaDoLimiteDeDiasSeguidos() {
    for (EstrategiaSemanal.Estrutura estrutura : EstrategiaSemanal.ESTRUTURAS.values()) {
      PerfilInterpretado p =
          interpretar(perfil("hipertrofia", "mais_de_5_anos", "semanal_5_mais", estrutura.modelos.size(), 60));
      MotorRotina.Pedido pedido = new MotorRotina.Pedido(p, SEED);
      if (EstrategiaSemanal.viaveis(p, estrutura.modelos.size()).contains(estrutura)) {
        pedido.estrategia = estrutura.codigo;
      } else {
        continue;
      }
      MotorRotina.Proposta proposta = MotorRotina.gerar(pedido);
      int n = proposta.totalSessoes();
      List<Map<String, Object>> duasVoltas = new ArrayList<>(proposta.sequencia);
      duasVoltas.addAll(proposta.sequencia);
      int seguidos = 0;
      int maior = 0;
      for (Map<String, Object> passo : duasVoltas) {
        seguidos++;
        maior = Math.max(maior, seguidos);
        if (Boolean.TRUE.equals(passo.get("descansoDepois"))) {
          seguidos = 0;
        }
      }
      assertTrue(maior <= AgendaSemanal.maxSeguidos(n), estrutura.codigo + ": " + maior + " sessões seguidas");
      assertEquals(
          Boolean.TRUE,
          proposta.sequencia.get(n - 1).get("descansoDepois"),
          estrutura.codigo + ": o ciclo deve fechar com descanso");
    }
  }

  @Test
  void preferenciasSaoRespeitadasEReservasExplicadas() {
    PreferenciasTreino prefs =
        preferencias(
            mapa(
                "equipamentos", Arrays.asList("halteres", "banco"),
                "limitacoes", Arrays.asList("acima_cabeca"),
                "evitar", Arrays.asList("quadriceps_completo-afundo-com-halteres")));
    PerfilInterpretado p =
        PerfilInterpretado.interpretar(
            perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60), prefs, -1);
    MotorRotina.Proposta proposta = gerar(p);
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        ExerciseDatabase.Exercise e = ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
        assertTrue(prefs.permite(e), e.nome);
        assertNotEquals("desenvolvimento", e.padrao);
        assertNotEquals("puxada_vertical", e.padrao);
        assertNotEquals("quadriceps_completo-afundo-com-halteres", e.id);
      }
    }
    assertFalse(proposta.avisos.isEmpty(), "faltas de exercício precisam ser avisadas");
    assertTrue(proposta.explicacao.stream().anyMatch(item -> "preferencias".equals(item.get("tipo"))));
  }

  @Test
  void supinoComBarraEhTrocadoPorHalteresComALimitacao() {
    PreferenciasTreino prefs = preferencias(mapa("limitacoes", Arrays.asList("supino_barra")));
    PerfilInterpretado p =
        PerfilInterpretado.interpretar(
            perfil("hipertrofia", "mais_de_5_anos", "semanal_5_mais", 6, 75), prefs, -1);
    for (MontadorSessao.Sessao sessao : gerar(p).sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        String padrao = String.valueOf(item.get("padrao"));
        if (padrao.startsWith("supino")) {
          assertFalse(String.valueOf(item.get("equipamento")).contains("barra"), String.valueOf(item.get("nome")));
        }
      }
    }
  }

  @Test
  void prioridadesAntigasNaoMudamANovaProgramacao() {
    User.Profile bruto = perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 75);
    MotorRotina.Proposta normal = gerar(interpretar(bruto));
    PreferenciasTreino pedidas = preferencias(mapa("prioridades", Arrays.asList("ombros", "peito")));
    assertTrue(pedidas.prioridades.isEmpty(), "pedido novo descarta grupos prioritários");
    assertEquals(normal.assinatura, gerar(PerfilInterpretado.interpretar(bruto, pedidas, -1)).assinatura);

    PreferenciasTreino gravadas =
        PreferenciasTreino.fromDocument(mapa("prioridades", Arrays.asList("ombros", "peito")));
    assertEquals(Arrays.asList("peito", "ombros"), gravadas.prioridades);
    assertTrue(gravadas.gruposPrioritarios().isEmpty());
    MotorRotina.Proposta antiga = gerar(PerfilInterpretado.interpretar(bruto, gravadas, -1));
    assertEquals(normal.assinatura, antiga.assinatura);
    assertEquals(efetivas(normal, "deltoide_lateral"), efetivas(antiga, "deltoide_lateral"), 0.01);
  }

  @Test
  void semBarraNaoEscolheExercicioQueDependeDeBarra() {
    User.Profile bruto = perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60);
    PreferenciasTreino prefs =
        preferencias(
            mapa(
                "equipamentos",
                Arrays.asList("halteres", "banco", "maquina", "polia", "barra_fixa")));
    MotorRotina.Proposta proposta = gerar(PerfilInterpretado.interpretar(bruto, prefs, -1));
    assertFalse(ids(proposta).isEmpty());
    for (String id : ids(proposta)) {
      ExerciseDatabase.Exercise e = ExerciseDatabase.porId(id);
      assertFalse(e.equipamento.contains("barra"), e.nome + " usa barra");
      assertTrue(prefs.permite(e), e.nome);
    }
  }

  @Test
  void agachamentoComBarraEvitadoNaoEntraNaProgramacao() {
    String evitado = "quadriceps_completo-agachamento-com-barra";
    assertNotNull(ExerciseDatabase.porId(evitado));
    User.Profile bruto = perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 75);
    PreferenciasTreino prefs = preferencias(mapa("evitar", Arrays.asList(evitado)));
    assertFalse(ids(gerar(PerfilInterpretado.interpretar(bruto, prefs, -1))).contains(evitado));
    assertTrue(ids(gerar(interpretar(bruto))).contains(evitado), "o perfil equivalente usa o agachamento");
  }

  @Test
  void limitacaoAcimaDaCabecaRemoveOsMovimentosIncompativeis() {
    User.Profile bruto = perfil("hipertrofia", "mais_de_5_anos", "semanal_5_mais", 5, 75);
    PreferenciasTreino prefs = preferencias(mapa("limitacoes", Arrays.asList("acima_cabeca")));
    MotorRotina.Proposta proposta = gerar(PerfilInterpretado.interpretar(bruto, prefs, -1));
    for (String id : ids(proposta)) {
      ExerciseDatabase.Exercise e = ExerciseDatabase.porId(id);
      assertNotEquals("desenvolvimento", e.padrao, e.nome);
      assertNotEquals("puxada_vertical", e.padrao, e.nome);
      assertNotEquals("longa-triceps-frances-com-halteres", e.id);
    }
    assertEquals(
        "limitacao",
        prefs.motivoExclusao(ExerciseDatabase.porId("anterior-desenvolvimento-com-barra")));
  }

  @Test
  void preferenciaDeEquipamentoFavoreceAlternativaEquivalente() {
    User.Profile bruto = perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 75);
    ExerciseDatabase.Exercise barra = ExerciseDatabase.porId("quadriceps_completo-agachamento-com-barra");
    ExerciseDatabase.Exercise smith = ExerciseDatabase.porId("quadriceps_completo-agachamento-no-smith");
    PreferenciasTreino livres = preferencias(mapa("preferenciaEquipamento", "livres"));
    PreferenciasTreino maquinas = preferencias(mapa("preferenciaEquipamento", "maquinas"));
    PerfilInterpretado pLivres = PerfilInterpretado.interpretar(bruto, livres, -1);
    PerfilInterpretado pMaquinas = PerfilInterpretado.interpretar(bruto, maquinas, -1);
    double deltaLivre =
        SeletorExercicios.nota(barra, true, "inferior", null, pLivres)
            - SeletorExercicios.nota(barra, true, "inferior", null, pMaquinas);
    double deltaMaquina =
        SeletorExercicios.nota(smith, true, "inferior", null, pMaquinas)
            - SeletorExercicios.nota(smith, true, "inferior", null, pLivres);
    assertEquals(5, deltaLivre, 0.01);
    assertEquals(5, deltaMaquina, 0.01);
    assertTrue(
        SeletorExercicios.nota(barra, true, "inferior", null, pLivres)
            > SeletorExercicios.nota(smith, true, "inferior", null, pLivres));
    assertTrue(
        SeletorExercicios.nota(smith, true, "inferior", null, pMaquinas)
            > SeletorExercicios.nota(barra, true, "inferior", null, pMaquinas));

    List<String> comLivres = ids(gerar(pLivres));
    List<String> comMaquinas = ids(gerar(pMaquinas));
    assertTrue(comLivres.contains(barra.id), "pesos livres mantêm o agachamento com barra");
    assertFalse(comMaquinas.contains(barra.id), "máquinas trocam o agachamento com barra");
    assertTrue(
        comMaquinas.contains(smith.id) || comMaquinas.contains("quadriceps_completo-leg-press"),
        "a preferência escolhe um agachamento em máquina");
  }

  @Test
  void objetivoMudaRepeticoesEDescansoDoPrincipal() {
    User.Profile base = perfil("hipertrofia", "de_2_a_5_anos", "semanal_3_4", 4, 75);
    Map<String, Object> forca = principal(gerar(interpretar(perfilDe(base, "forca"))));
    Map<String, Object> hipertrofia = principal(gerar(interpretar(perfilDe(base, "hipertrofia"))));
    Map<String, Object> resistencia = principal(gerar(interpretar(perfilDe(base, "resistencia"))));
    assertNotEquals(forca.get("repeticoes"), resistencia.get("repeticoes"));
    assertTrue(numero(forca.get("descansoSegundos")) > numero(hipertrofia.get("descansoSegundos")));
    assertTrue(numero(hipertrofia.get("descansoSegundos")) > numero(resistencia.get("descansoSegundos")));
  }

  @Test
  void experienciaEFrequenciaRecenteMudamOVolumeInicial() {
    MotorRotina.Proposta iniciante =
        gerar(interpretar(perfil("hipertrofia", "nunca", "nenhuma", 4, 60)));
    MotorRotina.Proposta experiente =
        gerar(interpretar(perfil("hipertrofia", "mais_de_5_anos", "semanal_5_mais", 4, 60)));
    MotorRotina.Proposta retorno =
        gerar(interpretar(perfil("hipertrofia", "mais_de_5_anos", "nenhuma", 4, 60)));
    assertTrue(series(experiente) > series(iniciante));
    assertTrue(series(experiente) > series(retorno), "pausa longa reduz o volume inicial");
    assertEquals(1, interpretar(perfil("hipertrofia", "mais_de_5_anos", "nenhuma", 4, 60)).capacidade);
  }

  @Test
  void trintaMinutosCabeMenosQueNoventaENaoEstouraOTempo() {
    User.Profile curto = perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 30);
    User.Profile longo = perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 90);
    MotorRotina.Proposta rapida = gerar(interpretar(curto));
    MotorRotina.Proposta completa = gerar(interpretar(longo));
    assertTrue(ids(completa).size() > ids(rapida).size());
    for (MontadorSessao.Sessao sessao : rapida.sessoes) {
      assertTrue(sessao.segundos() <= 30 * 60, sessao.codigo);
      assertEquals(Prescricao.PRINCIPAL, sessao.itens.get(0).get("papel"));
    }
    for (MontadorSessao.Sessao sessao : completa.sessoes) {
      assertTrue(sessao.segundos() <= 90 * 60, sessao.codigo);
    }
  }

  @Test
  void trocarOsDiasFixosMudaSomenteAAgenda() {
    PerfilInterpretado p = interpretar(perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 3, 60));
    MotorRotina.Pedido segunda = new MotorRotina.Pedido(p, SEED);
    segunda.agenda = mapa("modo", "calendario", "dias", Arrays.asList(1, 3, 5));
    MotorRotina.Pedido terca = new MotorRotina.Pedido(p, SEED);
    terca.agenda = mapa("modo", "calendario", "dias", Arrays.asList(2, 4, 6));
    MotorRotina.Proposta a = MotorRotina.gerar(segunda);
    MotorRotina.Proposta b = MotorRotina.gerar(terca);
    assertEquals(Arrays.asList(1, 3, 5), a.diasAgenda());
    assertEquals(Arrays.asList(2, 4, 6), b.diasAgenda());
    assertEquals(ids(a), ids(b), "os exercícios seguem a sequência; mudam os dias");
  }

  static List<String> ids(MotorRotina.Proposta proposta) {
    List<String> ids = new ArrayList<>();
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        ids.add(String.valueOf(item.get("exercicioId")));
      }
    }
    return ids;
  }

  static int series(MotorRotina.Proposta proposta) {
    int total = 0;
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        total += MontadorSessao.numero(item.get("series"));
      }
    }
    return total;
  }

  static Map<String, Object> principal(MotorRotina.Proposta proposta) {
    return proposta.sessoes.get(0).itens.get(0);
  }

  static int numero(Object valor) {
    return MontadorSessao.numero(valor);
  }

  static User.Profile perfilDe(User.Profile base, String objetivo) {
    return perfil(
        objetivo,
        base.trainingExperience,
        base.recentFrequency,
        base.availableDays,
        base.preferredSessionMinutes);
  }

  static double efetivas(MotorRotina.Proposta proposta, String grupo) {
    for (Map<String, Object> linha : proposta.volume) {
      if (grupo.equals(linha.get("codigo"))) {
        return ((Number) linha.get("efetivas")).doubleValue();
      }
    }
    return 0;
  }

  @Test
  void variacaoMudaExerciciosMasMantemEstrutura() {
    PerfilInterpretado p = interpretar(perfil("hipertrofia", "mais_de_5_anos", "semanal_5_mais", 4, 60));
    MotorRotina.Proposta base = gerar(p);
    boolean mudou = false;
    for (int variacao = 1; variacao <= 5 && !mudou; variacao++) {
      MotorRotina.Pedido pedido = new MotorRotina.Pedido(p, SEED);
      pedido.variacao = variacao;
      MotorRotina.Proposta outra = MotorRotina.gerar(pedido);
      assertEquals(base.estrategia(), outra.estrategia());
      validar(outra, p, "variação " + variacao);
      mudou = !outra.assinatura.equals(base.assinatura);
    }
    assertTrue(mudou, "alguma variação deveria trocar exercícios");
  }

  @Test
  void trocaValidaEhAplicadaETrocaInvalidaEhRecusada() {
    PerfilInterpretado p = interpretar(perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60));
    MotorRotina.Proposta base = gerar(p);
    MontadorSessao.Sessao sessao = base.sessoes.get(0);
    Map<String, Object> alvo = sessao.itens.get(1);
    int posicao = MontadorSessao.numero(alvo.get("posicao"));
    List<Map<String, Object>> opcoes =
        MotorRotina.opcoesDeTroca(sessao.itens, posicao, sessao.modelo.foco, p, sessao.minutos);
    assertFalse(opcoes.isEmpty(), "deveria haver alternativas para " + alvo.get("nome"));
    for (Map<String, Object> opcao : opcoes) {
      ExerciseDatabase.Exercise e = ExerciseDatabase.porId(String.valueOf(opcao.get("exercicioId")));
      assertNotNull(e);
      assertNotEquals(alvo.get("exercicioId"), e.id);
    }
    String escolhido = String.valueOf(opcoes.get(0).get("exercicioId"));

    MotorRotina.Pedido pedido = new MotorRotina.Pedido(p, SEED);
    pedido.ajustes.add(new MotorRotina.Ajuste(sessao.codigo, posicao, escolhido));
    MotorRotina.Proposta ajustada = MotorRotina.gerar(pedido);
    assertEquals(escolhido, ajustada.sessoes.get(0).itens.get(1).get("exercicioId"));
    assertEquals(sessao.codigo + posicao, ajustada.sessoes.get(0).itens.get(1).get("uid"));
    assertNotEquals(base.assinatura, ajustada.assinatura);
    validar(ajustada, p, "com troca");

    for (MotorRotina.Ajuste invalido :
        Arrays.asList(
            new MotorRotina.Ajuste(sessao.codigo, posicao, "inexistente"),
            new MotorRotina.Ajuste(sessao.codigo, posicao, "panturrilha-em-maquina-inexistente"),
            new MotorRotina.Ajuste("Z", posicao, escolhido),
            new MotorRotina.Ajuste(sessao.codigo, 99, escolhido))) {
      MotorRotina.Pedido errado = new MotorRotina.Pedido(p, SEED);
      errado.ajustes.add(invalido);
      assertThrows(MotorRotina.Invalido.class, () -> MotorRotina.gerar(errado));
    }
    String deOutroPadrao = null;
    for (ExerciseDatabase.Exercise e : ExerciseDatabase.ativos()) {
      if ("panturrilha".equals(e.padrao)) {
        deOutroPadrao = e.id;
      }
    }
    MotorRotina.Pedido outroPadrao = new MotorRotina.Pedido(p, SEED);
    outroPadrao.ajustes.add(new MotorRotina.Ajuste(sessao.codigo, posicao, deOutroPadrao));
    assertThrows(MotorRotina.Invalido.class, () -> MotorRotina.gerar(outroPadrao));
  }

  @Test
  void lerPedidoValidaTiposELimites() {
    PerfilInterpretado p = interpretar(perfil("hipertrofia", "nunca", "nenhuma", 3, 60));
    assertThrows(MotorRotina.Invalido.class, () -> MotorRotina.lerPedido(mapa("variacao", -1), p, SEED));
    assertThrows(MotorRotina.Invalido.class, () -> MotorRotina.lerPedido(mapa("variacao", "2"), p, SEED));
    assertThrows(MotorRotina.Invalido.class, () -> MotorRotina.lerPedido(mapa("estrategia", "xyz"), p, SEED));
    assertThrows(MotorRotina.Invalido.class, () -> MotorRotina.lerPedido(mapa("ajustes", "A1"), p, SEED));
    List<Object> muitas = new ArrayList<>(Collections.nCopies(31, mapa("sessao", "A", "posicao", 1, "exercicioId", "x")));
    assertThrows(MotorRotina.Invalido.class, () -> MotorRotina.lerPedido(mapa("ajustes", muitas), p, SEED));
    MotorRotina.Pedido pedido =
        MotorRotina.lerPedido(
            mapa(
                "variacao", 3,
                "ajustes",
                    Arrays.asList(
                        mapa("sessao", "A", "posicao", 2, "exercicioId", "x"),
                        mapa("sessao", "A", "posicao", 2, "exercicioId", "y"))),
            p,
            SEED);
    assertEquals(3, pedido.variacao);
    assertEquals(1, pedido.ajustes.size(), "a última troca da mesma posição vale");
    assertEquals("y", pedido.ajustes.get(0).exercicioId);
  }

  @Test
  void treinoAvulsoRespeitaFocoETempo() {
    PerfilInterpretado p = interpretar(perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60));
    Map<String, String> focoEsperado = new LinkedHashMap<>();
    focoEsperado.put("corpo_inteiro", "FULL_BODY");
    focoEsperado.put("superior", "SUPERIOR");
    focoEsperado.put("inferior", "INFERIOR");
    focoEsperado.put("empurrar", "EMPURRAR");
    focoEsperado.put("puxar", "PUXAR");
    for (Map.Entry<String, String> foco : focoEsperado.entrySet()) {
      for (int minutos : DURACOES) {
        Map<String, Object> sessao = MotorRotina.sessaoAvulsa(p, foco.getKey(), minutos, 0, SEED);
        assertEquals(foco.getValue(), sessao.get("foco"));
        assertTrue(MontadorSessao.numero(sessao.get("duracaoEstimadaMinutos")) <= minutos, foco + " " + minutos);
        assertFalse(((List<?>) sessao.get("exercicios")).isEmpty());
      }
    }
    assertThrows(MotorRotina.Invalido.class, () -> MotorRotina.sessaoAvulsa(p, "abc", 60, 0, SEED));
  }

  @Test
  void preferenciasInvalidasSaoRecusadas() {
    List<Object> casos =
        Arrays.asList(
            mapa("equipamentos", Collections.emptyList()),
            mapa("equipamentos", Arrays.asList("kettlebell")),
            mapa("preferenciaEquipamento", "elasticos"),
            mapa("evitar", Arrays.asList("exercicio-que-nao-existe")),
            mapa("limitacoes", Arrays.asList("joelho_ruim")),
            "texto");
    for (Object caso : casos) {
      List<String> erros = new ArrayList<>();
      PreferenciasTreino.ler(caso, erros);
      assertFalse(erros.isEmpty(), "deveria recusar " + caso);
    }
  }

  @Test
  void limitacoesApontamParaExerciciosDoCatalogo() {
    for (String id : PreferenciasTreino.idsDeLimitacoes()) {
      assertNotNull(ExerciseDatabase.porId(id), "id de limitação fora do catálogo: " + id);
    }
  }

  @Test
  void ordemDasPreferenciasNaoMudaAAssinatura() {
    User.Profile bruto = perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60);
    PreferenciasTreino a =
        preferencias(
            mapa(
                "evitar",
                Arrays.asList("posteriores-stiff-com-halteres", "quadriceps_completo-afundo-com-halteres"),
                "equipamentos",
                Arrays.asList("maquina", "halteres", "barra", "banco", "polia")));
    PreferenciasTreino b =
        preferencias(
            mapa(
                "evitar",
                Arrays.asList("quadriceps_completo-afundo-com-halteres", "posteriores-stiff-com-halteres"),
                "equipamentos",
                Arrays.asList("barra", "banco", "polia", "halteres", "maquina")));
    assertEquals(
        gerar(PerfilInterpretado.interpretar(bruto, a, -1)).assinatura,
        gerar(PerfilInterpretado.interpretar(bruto, b, -1)).assinatura);
  }

  @Test
  void previaClassificaAvisosSemAlterarOTextoDoMotor() {
    PerfilInterpretado semHistorico =
        PerfilInterpretado.interpretar(
            perfil("hipertrofia", "de_1_a_2_anos", "semanal_5_mais", 4, 60),
            PreferenciasTreino.padrao(),
            0);
    assertFalse(semHistorico.frequenciaSemRegistro);
    assertEquals(2, semHistorico.capacidade);
    MotorRotina.Proposta leve = gerar(semHistorico);
    assertTrue(leve.avisos.stream().noneMatch(a -> a.contains("séries registradas")));
    assertTrue(leve.mensagens.stream().noneMatch(m -> "sem_historico".equals(m.get("codigo"))));
    assertTrue(leve.mensagens.stream().noneMatch(m -> "interno".equals(m.get("nivel"))));
    assertTrue(
        leve.mensagens.stream().noneMatch(m -> String.valueOf(m.get("resumo")).contains("menos séries")));

    MotorRotina.Proposta curta = gerar(interpretar(perfil("forca", "de_2_a_5_anos", "semanal_3_4", 3, 30)));
    assertTrue(curta.avisos.stream().anyMatch(a -> a.startsWith("Treinos de força pedem descansos longos")));
    assertTrue(
        curta.mensagens.stream()
            .anyMatch(
                m ->
                    "observacao".equals(m.get("nivel"))
                        && "duracao".equals(m.get("acao"))
                        && !String.valueOf(m.get("resumo")).contains("descansos longos")));
    if (curta.gruposDescobertos.isEmpty()) {
      assertTrue(curta.mensagens.stream().noneMatch(m -> "bloqueio".equals(m.get("nivel"))));
    }

    PreferenciasTreino prefs =
        preferencias(mapa("equipamentos", Arrays.asList("halteres", "banco"), "limitacoes", Arrays.asList("acima_cabeca")));
    MotorRotina.Proposta restrita =
        gerar(
            PerfilInterpretado.interpretar(
                perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60), prefs, -1));
    assertFalse(restrita.avisos.isEmpty());
    boolean bloqueia = !restrita.gruposDescobertos.isEmpty();
    assertEquals(
        bloqueia,
        restrita.mensagens.stream().anyMatch(m -> "bloqueio".equals(m.get("nivel"))));
    if (!bloqueia) {
      assertTrue(restrita.mensagens.stream().anyMatch(m -> "sem_exercicio".equals(m.get("codigo"))));
    }
    assertTrue(restrita.toMap().containsKey("mensagens"));

    PerfilInterpretado comHistorico =
        PerfilInterpretado.interpretar(
            perfil("hipertrofia", "nunca", "nenhuma", 3, 60), PreferenciasTreino.padrao(), 12);
    assertTrue(comHistorico.reavaliacao);
    MotorRotina.Proposta acompanhada = gerar(comHistorico);
    assertTrue(
        acompanhada.mensagens.stream()
            .anyMatch(m -> "reavaliacao".equals(m.get("codigo")) && "observacao".equals(m.get("nivel"))));

    MotorRotina.Proposta miudos =
        gerar(interpretar(perfil("hipertrofia", "menos_6_meses", "semanal_1_2", 3, 30)));
    List<String> pequenosSemSerie = new ArrayList<>();
    for (Map<String, Object> linha : miudos.volume) {
      double efetivas =
          linha.get("efetivas") instanceof Number ? ((Number) linha.get("efetivas")).doubleValue() : 0;
      int minimo = linha.get("minimo") instanceof Number ? ((Number) linha.get("minimo")).intValue() : 0;
      String codigo = String.valueOf(linha.get("codigo"));
      if (minimo > 0
          && efetivas <= 0.01
          && !VolumeSemanal.GRANDES.contains(codigo)
          && VolumeSemanal.existeCompativel(codigo, miudos.perfil)) {
        pequenosSemSerie.add(String.valueOf(linha.get("rotulo")));
      }
    }
    long observacoesDeTempo =
        miudos.mensagens.stream().filter(m -> "fora_tempo".equals(m.get("codigo"))).count();
    assertFalse(pequenosSemSerie.isEmpty(), "o perfil curto deveria deixar um músculo pequeno de fora");
    assertEquals(1, observacoesDeTempo, pequenosSemSerie.toString());
    Map<String, Object> observacao =
        miudos.mensagens.stream().filter(m -> "fora_tempo".equals(m.get("codigo"))).findFirst().orElseThrow();
    String resumo = String.valueOf(observacao.get("resumo"));
    assertEquals("observacao", observacao.get("nivel"));
    assertEquals("duracao", observacao.get("acao"));
    assertTrue(resumo.endsWith("de fora pelo tempo disponível."), resumo);
    for (String rotulo : pequenosSemSerie) {
      assertTrue(resumo.contains(rotulo), resumo);
    }
  }

  @Test
  void propostaSerializaSemReferenciasCompartilhadas() {
    PerfilInterpretado p = interpretar(perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60));
    MotorRotina.Proposta proposta = gerar(p);
    Map<String, Object> mapa = proposta.toMap();
    assertEquals(MotorRotina.VERSAO, mapa.get("motorVersao"));
    assertEquals(proposta.assinatura, mapa.get("assinatura"));
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> sessoes = (List<Map<String, Object>>) mapa.get("sessoes");
    assertEquals(4, sessoes.size());
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> exercicios = (List<Map<String, Object>>) sessoes.get(0).get("exercicios");
    exercicios.get(0).put("series", 99);
    assertNotEquals(99, proposta.sessoes.get(0).itens.get(0).get("series"));
  }

  /** Maior número da faixa. "8-12" vale 12; "4-6" vale 6. */
  private static int topoDaFaixa(String repeticoes) {
    String digitos = "";
    int maior = 0;
    String texto = repeticoes == null ? "" : repeticoes;
    for (int i = 0; i <= texto.length(); i++) {
      char c = i == texto.length() ? ' ' : texto.charAt(i);
      if (c >= '0' && c <= '9') {
        digitos += c;
      } else if (!digitos.isEmpty()) {
        maior = Math.max(maior, Integer.parseInt(digitos));
        digitos = "";
      }
    }
    return maior;
  }
}
