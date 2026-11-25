package com.healgym.service.rotina;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.healgym.model.User;
import com.healgym.service.ExerciseDatabase;
import com.healgym.web.ApiException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

/** Regras de persistência da rotina sobre um armazenamento em memória (nenhum banco é usado). */
class RotinaServicoTest {

  private static final long DIA = 24L * 60 * 60 * 1000;

  private ArmazemMemoria armazem;
  private AtomicLong agora;
  private RotinaServico servico;

  @BeforeEach
  void preparar() {
    armazem = new ArmazemMemoria();
    agora = new AtomicLong(Instant.parse("2026-03-02T10:00:00Z").toEpochMilli());
    servico = new RotinaServico(armazem, () -> new Date(agora.get()));
  }

  // ------------------------------------------------------------------ auxiliares

  static User usuario(String objetivo, String experiencia, String frequencia, int dias, int minutos) {
    ObjectId id = new ObjectId();
    Document perfil =
        new Document("trainingGoal", objetivo)
            .append("trainingExperience", experiencia)
            .append("recentFrequency", frequencia)
            .append("availableDays", dias)
            .append("preferredSessionMinutes", minutos)
            .append("gender", "feminino")
            .append("weight", 68.0)
            .append("height", 1.65);
    return User.fromDocument(
        new Document("_id", id)
            .append("name", "Pessoa de teste")
            .append("email", "teste-" + id + "@exemplo.test")
            .append("profile", perfil));
  }

  static User intermediario() {
    return usuario("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60);
  }

  private void treinoComSerie(User usuario, boolean realizado, Date data) {
    Document treino = armazem.inserirTreinoAvulso(usuario.getId(), realizado, data);
    if (!realizado) {
      return;
    }
    Map<String, Object> serie = new LinkedHashMap<>();
    serie.put("concluida", true);
    armazem.registrarExecucao(
        usuario.getId(),
        treino.getObjectId("_id"),
        new Document("exercicios", List.of(new Document("series", List.of(serie)))));
  }

  static Map<String, Object> corpo(User usuario) {
    Map<String, Object> corpo = new LinkedHashMap<>();
    corpo.put("perfil", new LinkedHashMap<>(RotinaServico.camposDeTreino(usuario.getProfile())));
    return corpo;
  }

  @SuppressWarnings("unchecked")
  static Map<String, Object> perfilDo(Map<String, Object> corpo) {
    return (Map<String, Object>) corpo.get("perfil");
  }

  /** Simula o assistente: gera a prévia e devolve o pedido de salvamento correspondente. */
  Map<String, Object> pedidoSalvar(User usuario, Map<String, Object> corpo) {
    Map<String, Object> previa = servico.previa(usuario, corpo);
    Map<String, Object> pedido = new LinkedHashMap<>(corpo);
    pedido.put("assinaturaPrevia", previa.get("assinatura"));
    if (previa.get("baseVersao") != null) {
      pedido.put("baseVersao", previa.get("baseVersao"));
    }
    return pedido;
  }

  Document salvarPadrao(User usuario) {
    return (Document) servico.salvar(usuario, pedidoSalvar(usuario, corpo(usuario))).get("rotina");
  }

  static ApiException falha(int status, Executable acao) {
    ApiException erro = assertThrows(ApiException.class, acao);
    assertEquals(status, erro.getStatus(), String.valueOf(erro.getBody()));
    assertNotNull(erro.getBody().get("message"));
    return erro;
  }

  @SuppressWarnings("unchecked")
  static Map<String, Object> estado(Map<String, Object> consulta) {
    return (Map<String, Object>) consulta.get("estado");
  }

  @SuppressWarnings("unchecked")
  static String status(Map<String, Object> estado, String codigo) {
    for (Map<String, Object> sessao : (List<Map<String, Object>>) estado.get("sessoes")) {
      if (codigo.equals(sessao.get("codigo"))) {
        return (String) sessao.get("status");
      }
    }
    throw new AssertionError("Sessão " + codigo + " ausente");
  }

  @SuppressWarnings("unchecked")
  static Map<String, Object> sessaoDoEstado(Map<String, Object> estado, String codigo) {
    for (Map<String, Object> sessao : (List<Map<String, Object>>) estado.get("sessoes")) {
      if (codigo.equals(sessao.get("codigo"))) {
        return sessao;
      }
    }
    throw new AssertionError("Sessão " + codigo + " ausente");
  }

  @SuppressWarnings("unchecked")
  static List<Map<String, Object>> exercicios(Map<String, Object> sessaoOuTreino) {
    return (List<Map<String, Object>>) sessaoOuTreino.get("exercicios");
  }

  Document treino(User usuario, ObjectId id) {
    for (Document treino : armazem.treinosDe(usuario.getId())) {
      if (id.equals(treino.get("_id"))) {
        return treino;
      }
    }
    throw new AssertionError("Treino não encontrado");
  }

  // ------------------------------------------------------------------ leitura e prévia

  @Test
  void consultarSemRotinaNaoGravaEDevolveOPerfilInterpretado() {
    User usuario = intermediario();
    Map<String, Object> consulta = servico.consultar(usuario);
    assertNull(consulta.get("rotina"));
    assertNotNull(consulta.get("perfil"));
    assertEquals(0, armazem.escritas.get());
  }

  @Test
  void pplDeTresDiasNaoNascePorPedidoMasARotinaAntigaContinua() {
    User usuario = usuario("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 3, 90);
    Map<String, Object> pedido = corpo(usuario);
    pedido.put("estrategia", "ppl_3");
    ApiException recusa = falha(400, () -> servico.previa(usuario, pedido));
    String mensagem = String.valueOf(recusa.getBody().get("message"));
    assertTrue(mensagem.contains("corpo inteiro"), mensagem);
    assertTrue(mensagem.contains("híbrida"), mensagem);
    assertTrue(armazem.rotinasDe(usuario.getId()).isEmpty());

    Document treino =
        armazem.inserirTreinoAvulso(usuario.getId(), true, new Date(agora.get() - DIA));
    String assinatura = "a".repeat(64);
    Document antiga =
        new Document("_id", new ObjectId())
            .append("user", usuario.getId())
            .append("versao", 1)
            .append("revisao", 0)
            .append("status", "ativa")
            .append("assinatura", assinatura)
            .append("estrategia", new Document("codigo", "ppl_3").append("rotulo", "Empurrar, puxar e pernas"))
            .append(
                "sessoes",
                List.of(
                    new Document("codigo", "A"),
                    new Document("codigo", "B"),
                    new Document("codigo", "C")))
            .append("createdAt", new Date(agora.get()))
            .append("updatedAt", new Date(agora.get()));
    assertTrue(armazem.inserirRotina(antiga));

    Map<String, Object> previa = servico.previa(usuario, pedido);
    @SuppressWarnings("unchecked")
    Map<String, Object> estrategia = (Map<String, Object>) previa.get("estrategia");
    assertEquals("ppl_3", estrategia.get("codigo"));
    Map<String, Object> consulta = servico.consultar(usuario);
    Document guardada = (Document) consulta.get("rotina");
    assertEquals(assinatura, guardada.getString("assinatura"));
    assertEquals(true, treino.get("realizado"));
    assertEquals(1, armazem.rotinasDe(usuario.getId()).size());

    Map<String, Object> alternativas = new LinkedHashMap<>(pedido);
    alternativas.put("sessao", "A");
    alternativas.put("posicao", 1);
    assertFalse(servico.alternativas(usuario, alternativas).isEmpty());

    User iniciante = usuario("hipertrofia", "nunca", "nenhuma", 3, 60);
    Document doIniciante = new Document(antiga);
    doIniciante.put("_id", new ObjectId());
    doIniciante.put("user", iniciante.getId());
    assertTrue(armazem.inserirRotina(doIniciante));
    Map<String, Object> pedidoIniciante = corpo(iniciante);
    pedidoIniciante.put("estrategia", "ppl_3");
    falha(400, () -> servico.previa(iniciante, pedidoIniciante));
    assertEquals("ativa", armazem.ativa(iniciante.getId()).getString("status"));
  }

  @Test
  void previaNaoGravaNadaEInformaOContexto() {
    User usuario = intermediario();
    Map<String, Object> previa = servico.previa(usuario, corpo(usuario));
    assertEquals(64, ((String) previa.get("assinatura")).length());
    assertNull(previa.get("baseVersao"));
    assertEquals(false, previa.get("mesmaRotinaAtiva"));
    assertTrue(((List<?>) previa.get("sessoesEmAndamento")).isEmpty());
    assertFalse(((List<?>) previa.get("sessoes")).isEmpty());
    assertFalse(((List<?>) previa.get("explicacao")).isEmpty());

    Map<String, Object> alternativasCorpo = corpo(usuario);
    alternativasCorpo.put("sessao", "A");
    alternativasCorpo.put("posicao", 1);
    List<Map<String, Object>> opcoes = servico.alternativas(usuario, alternativasCorpo);
    assertFalse(opcoes.isEmpty());

    assertEquals(0, armazem.escritas.get());
    assertTrue(armazem.rotinasDe(usuario.getId()).isEmpty());
    assertTrue(armazem.treinosDe(usuario.getId()).isEmpty());
  }

  @Test
  void dadosDeEntradaInvalidosSaoRecusadosSemGravar() {
    User usuario = intermediario();
    falha(400, () -> servico.previa(usuario, new LinkedHashMap<>()));

    Map<String, Object> semObjetivo = corpo(usuario);
    perfilDo(semObjetivo).remove("trainingGoal");
    ApiException erro = falha(400, () -> servico.previa(usuario, semObjetivo));
    assertNotNull(erro.getBody().get("details"));

    Map<String, Object> seteDias = corpo(usuario);
    perfilDo(seteDias).put("availableDays", 7);
    falha(400, () -> servico.previa(usuario, seteDias));

    Map<String, Object> equipamentoDesconhecido = corpo(usuario);
    equipamentoDesconhecido.put("preferencias", Map.of("equipamentos", List.of("laser")));
    falha(400, () -> servico.previa(usuario, equipamentoDesconhecido));

    Map<String, Object> exercicioInventado = corpo(usuario);
    exercicioInventado.put("preferencias", Map.of("evitar", List.of("supino-voador-imaginario")));
    falha(400, () -> servico.previa(usuario, exercicioInventado));

    Map<String, Object> estruturaInexistente = corpo(usuario);
    estruturaInexistente.put("estrategia", "nao_existe");
    falha(400, () -> servico.previa(usuario, estruturaInexistente));

    assertEquals(0, armazem.escritas.get());
  }

  @Test
  void opcoesVemDasTabelasDaValidacao() {
    Map<String, Object> opcoes = RotinaServico.opcoes();
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> exercicios = (List<Map<String, Object>>) opcoes.get("exercicios");
    assertEquals(ExerciseDatabase.ativos().size(), exercicios.size());
    for (Map<String, Object> exercicio : exercicios) {
      ExerciseDatabase.Exercise doCatalogo = ExerciseDatabase.porId((String) exercicio.get("id"));
      assertNotNull(doCatalogo);
      assertTrue(doCatalogo.ativo);
    }
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> limitacoes = (List<Map<String, Object>>) opcoes.get("limitacoes");
    assertEquals(PreferenciasTreino.LIMITACOES.size(), limitacoes.size());
    for (Map<String, Object> limitacao : limitacoes) {
      assertNotNull(limitacao.get("detalhe"), "Limitação sem explicação: " + limitacao.get("id"));
    }
  }

  // ------------------------------------------------------------------ salvar

  @Test
  void salvarCriaAVersaoUmERepetirNaoDuplica() {
    User usuario = intermediario();
    Map<String, Object> pedido = pedidoSalvar(usuario, corpo(usuario));
    Map<String, Object> primeira = servico.salvar(usuario, pedido);
    Map<String, Object> segunda = servico.salvar(usuario, pedido);
    Map<String, Object> terceira = servico.salvar(usuario, pedidoSalvar(usuario, corpo(usuario)));

    Document rotina = (Document) primeira.get("rotina");
    assertEquals(true, primeira.get("criada"));
    assertEquals(1, rotina.get("versao"));
    assertEquals(0, rotina.get("revisao"));
    assertEquals("ativa", rotina.get("status"));
    assertEquals(usuario.getId(), rotina.get("user"));
    assertEquals(false, segunda.get("criada"));
    assertEquals(false, terceira.get("criada"));
    assertEquals(rotina.get("_id"), ((Document) segunda.get("rotina")).get("_id"));
    assertEquals(rotina.get("_id"), ((Document) terceira.get("rotina")).get("_id"));
    assertEquals(1, armazem.rotinasDe(usuario.getId()).size());
    assertTrue(armazem.treinosDe(usuario.getId()).isEmpty(), "Salvar não cria treinos");
  }

  @Test
  void salvarExigeUmaPreviaAtual() {
    User usuario = intermediario();
    falha(400, () -> servico.salvar(usuario, corpo(usuario)));

    Map<String, Object> pedido = corpo(usuario);
    pedido.put("assinaturaPrevia", "0".repeat(64));
    ApiException erro = falha(409, () -> servico.salvar(usuario, pedido));
    assertEquals("previa_desatualizada", erro.getBody().get("codigo"));
    assertNotNull(erro.getBody().get("proposta"), "Devolve a proposta atualizada para revisão");
    assertTrue(armazem.rotinasDe(usuario.getId()).isEmpty());
  }

  @Test
  void historicoNovoEntreAPreviaEOSalvamentoExigeNovaRevisao() {
    User usuario = usuario("hipertrofia", "de_1_a_2_anos", "nenhuma", 3, 60);
    Map<String, Object> pedido = pedidoSalvar(usuario, corpo(usuario));
    for (int i = 0; i < 6; i++) {
      treinoComSerie(usuario, true, new Date(agora.get() - DIA));
    }
    ApiException erro = falha(409, () -> servico.salvar(usuario, pedido));
    assertEquals("previa_desatualizada", erro.getBody().get("codigo"));
  }

  @Test
  void salvamentosSimultaneosDaMesmaPropostaCriamUmaUnicaVersao() throws Exception {
    User usuario = intermediario();
    Map<String, Object> pedido = pedidoSalvar(usuario, corpo(usuario));
    armazem.atrasoLeituraMs = 15;
    List<Callable<Map<String, Object>>> tarefas = new ArrayList<>();
    for (int i = 0; i < 8; i++) {
      User copia = User.fromDocument(usuario.toDocument());
      tarefas.add(() -> servico.salvar(copia, new LinkedHashMap<>(pedido)));
    }
    int criadas = 0;
    Set<Object> ids = new HashSet<>();
    for (Future<Map<String, Object>> futuro : simultaneos(tarefas)) {
      Map<String, Object> resultado = futuro.get(30, TimeUnit.SECONDS);
      if (Boolean.TRUE.equals(resultado.get("criada"))) {
        criadas++;
      }
      ids.add(((Document) resultado.get("rotina")).get("_id"));
    }
    assertEquals(1, criadas);
    assertEquals(1, ids.size());
    assertEquals(1, armazem.rotinasDe(usuario.getId()).size());
    assertTrue(armazem.duplicatasRecusadas.get() > 0, "A disputa chegou à restrição de unicidade");
  }

  @Test
  void salvamentosSimultaneosDePropostasDiferentesTemUmUnicoVencedor() throws Exception {
    User usuario = intermediario();
    Map<String, Object> pedidoA = pedidoSalvar(usuario, corpo(usuario));
    Map<String, Object> corpoB = corpo(usuario);
    corpoB.put("variacao", 1);
    Map<String, Object> pedidoB = pedidoSalvar(usuario, corpoB);
    assertNotEquals(pedidoA.get("assinaturaPrevia"), pedidoB.get("assinaturaPrevia"));
    armazem.atrasoLeituraMs = 15;
    List<Callable<Map<String, Object>>> tarefas = new ArrayList<>();
    for (int i = 0; i < 6; i++) {
      Map<String, Object> pedido = i % 2 == 0 ? pedidoA : pedidoB;
      User copia = User.fromDocument(usuario.toDocument());
      tarefas.add(() -> servico.salvar(copia, new LinkedHashMap<>(pedido)));
    }
    int criadas = 0;
    int conflitos = 0;
    for (Future<Map<String, Object>> futuro : simultaneos(tarefas)) {
      try {
        if (Boolean.TRUE.equals(futuro.get(30, TimeUnit.SECONDS).get("criada"))) {
          criadas++;
        }
      } catch (ExecutionException e) {
        ApiException erro = (ApiException) e.getCause();
        assertEquals(409, erro.getStatus());
        assertEquals("rotina_alterada", erro.getBody().get("codigo"));
        conflitos++;
      }
    }
    assertEquals(1, criadas);
    assertTrue(conflitos >= 1);
    assertEquals(1, armazem.rotinasDe(usuario.getId()).size());
    assertTrue(armazem.duplicatasRecusadas.get() > 0, "A disputa chegou à restrição de unicidade");
  }

  private static <T> List<Future<T>> simultaneos(List<Callable<T>> tarefas) throws InterruptedException {
    ExecutorService pool = Executors.newFixedThreadPool(tarefas.size());
    CountDownLatch largada = new CountDownLatch(1);
    List<Future<T>> futuros = new ArrayList<>();
    for (Callable<T> tarefa : tarefas) {
      futuros.add(
          pool.submit(
              () -> {
                largada.await();
                return tarefa.call();
              }));
    }
    largada.countDown();
    pool.shutdown();
    assertTrue(pool.awaitTermination(60, TimeUnit.SECONDS));
    return futuros;
  }

  @Test
  void versaoDeReferenciaDesatualizadaEhRecusadaENovaVersaoPreservaAAnterior() {
    User usuario = intermediario();
    Document primeira = salvarPadrao(usuario);

    Map<String, Object> outra = corpo(usuario);
    outra.put("variacao", 2);
    Map<String, Object> pedido = pedidoSalvar(usuario, outra);
    assertEquals(1, pedido.get("baseVersao"));

    Map<String, Object> semBase = new LinkedHashMap<>(pedido);
    semBase.remove("baseVersao");
    assertEquals("rotina_alterada", falha(409, () -> servico.salvar(usuario, semBase)).getBody().get("codigo"));

    Map<String, Object> baseErrada = new LinkedHashMap<>(pedido);
    baseErrada.put("baseVersao", 7);
    assertEquals("rotina_alterada", falha(409, () -> servico.salvar(usuario, baseErrada)).getBody().get("codigo"));

    Map<String, Object> resultado = servico.salvar(usuario, pedido);
    Document segunda = (Document) resultado.get("rotina");
    assertEquals(true, resultado.get("criada"));
    assertEquals(2, segunda.get("versao"));

    List<Document> todas = armazem.rotinasDe(usuario.getId());
    assertEquals(2, todas.size(), "A versão anterior não é apagada");
    for (Document rotina : todas) {
      if (rotina.get("_id").equals(primeira.get("_id"))) {
        assertEquals("substituida", rotina.get("status"));
        assertNotNull(rotina.get("substituidaEm"));
        assertEquals(primeira.get("sessoes"), rotina.get("sessoes"));
      }
    }
    assertEquals(segunda.get("_id"), ((Document) servico.consultar(usuario).get("rotina")).get("_id"));
  }

  @Test
  void trocarRotinaComTreinoEmAndamentoExigeConfirmacaoEPreservaOTreino() {
    User usuario = intermediario();
    salvarPadrao(usuario);
    ObjectId aberto = (ObjectId) servico.iniciar(usuario, "A").get("treinoId");
    Document antes = treino(usuario, aberto);

    Map<String, Object> novoPerfil = corpo(usuario);
    perfilDo(novoPerfil).put("availableDays", 3);
    Map<String, Object> pedido = pedidoSalvar(usuario, novoPerfil);
    ApiException erro = falha(409, () -> servico.salvar(usuario, pedido));
    assertEquals("sessoes_em_andamento", erro.getBody().get("codigo"));
    assertEquals(true, erro.getBody().get("requerConfirmacao"));
    assertEquals(1, ((List<?>) erro.getBody().get("sessoes")).size());
    assertEquals(1, armazem.rotinasDe(usuario.getId()).size());
    assertEquals(4, usuario.getProfile().availableDays, "Recusa não altera o perfil");

    pedido.put("confirmarSubstituicao", true);
    Map<String, Object> resultado = servico.salvar(usuario, pedido);
    assertEquals(true, resultado.get("criada"));
    assertEquals(true, resultado.get("perfilAlterado"));
    assertEquals(3, usuario.getProfile().availableDays);

    Document depois = treino(usuario, aberto);
    assertEquals(antes, depois, "O treino em andamento continua exatamente como estava");
    assertEquals(false, depois.get("realizado"));

    Map<String, Object> estado = estado(servico.consultar(usuario));
    assertEquals(1, estado.get("ciclo"));
    assertEquals(CicloRotina.PLANEJADA, status(estado, "A"), "Treinos da versão anterior não contam na nova");
    servico.exigirSequencia(usuario, depois);
  }

  @Test
  void regenerarPreservaTreinosConcluidos() {
    User usuario = intermediario();
    salvarPadrao(usuario);
    ObjectId feito = (ObjectId) servico.iniciar(usuario, "A").get("treinoId");
    armazem.concluir(feito, new Date(agora.get()));
    Document concluido = treino(usuario, feito);

    Map<String, Object> outra = corpo(usuario);
    outra.put("variacao", 3);
    Map<String, Object> resultado = servico.salvar(usuario, pedidoSalvar(usuario, outra));
    assertEquals(true, resultado.get("criada"), "Sem treino aberto, não precisa de confirmação");

    assertEquals(concluido, treino(usuario, feito));
    assertEquals(1, armazem.treinosDe(usuario.getId()).size());
  }

  @Test
  void mudarSoAAgendaComTreinoAbertoPreservaRotinaEExecucao() {
    User usuario = intermediario();
    Document rotina = salvarPadrao(usuario);
    ObjectId aberto = (ObjectId) servico.iniciar(usuario, "A").get("treinoId");
    Document antes = treino(usuario, aberto);
    int sessoes = ((List<?>) rotina.get("sessoes")).size();

    Map<String, Object> pedido = corpo(usuario);
    pedido.put("agenda", Map.of("modo", "calendario", "dias", AgendaSemanal.sugeridos(sessoes)));
    Map<String, Object> resultado = servico.salvar(usuario, pedidoSalvar(usuario, pedido));
    Document atual = (Document) resultado.get("rotina");

    assertEquals(false, resultado.get("criada"));
    assertEquals(rotina.get("_id"), atual.get("_id"));
    assertEquals(rotina.get("assinatura"), atual.get("assinatura"));
    assertEquals(rotina.get("sessoes"), atual.get("sessoes"));
    assertEquals("calendario", ((Map<?, ?>) atual.get("agenda")).get("modo"));
    assertEquals(antes, treino(usuario, aberto));
    assertEquals(1, armazem.rotinasDe(usuario.getId()).size());
  }

  @Test
  void mesmaPropostaComOutraAgendaAtualizaSemCriarVersao() {
    User usuario = intermediario();
    Document rotina = salvarPadrao(usuario);
    int sessoes = ((List<?>) rotina.get("sessoes")).size();

    Map<String, Object> comCalendario = corpo(usuario);
    comCalendario.put(
        "agenda", Map.of("modo", "calendario", "dias", AgendaSemanal.sugeridos(sessoes)));
    Map<String, Object> resultado = servico.salvar(usuario, pedidoSalvar(usuario, comCalendario));
    Document atual = (Document) resultado.get("rotina");

    assertEquals(false, resultado.get("criada"));
    assertEquals(rotina.get("_id"), atual.get("_id"));
    assertEquals(1, atual.get("versao"));
    assertEquals(1, atual.get("revisao"));
    assertEquals(rotina.get("assinatura"), atual.get("assinatura"));
    assertEquals("calendario", ((Map<?, ?>) atual.get("agenda")).get("modo"));
    assertEquals(1, armazem.rotinasDe(usuario.getId()).size());
  }

  @Test
  void salvarAlteraSomenteOsCamposDeTreinoDoPerfil() {
    User usuario = intermediario();
    Map<String, Object> corpo = corpo(usuario);
    perfilDo(corpo).put("preferredSessionMinutes", 45);
    Map<String, Object> resultado = servico.salvar(usuario, pedidoSalvar(usuario, corpo));
    assertEquals(true, resultado.get("perfilAlterado"));
    assertEquals(45, usuario.getProfile().preferredSessionMinutes);
    assertEquals("feminino", usuario.getProfile().gender);
    assertEquals(68.0, usuario.getProfile().weight);
    assertEquals("hipertrofia", usuario.getProfile().trainingGoal);

    Map<String, Object> repetido = servico.salvar(usuario, pedidoSalvar(usuario, corpo));
    assertEquals(false, repetido.get("perfilAlterado"));
    assertEquals(false, repetido.get("criada"));
  }

  @Test
  void perfilAlteradoDepoisDeSalvarEhSinalizadoSemApagarNada() {
    User usuario = intermediario();
    salvarPadrao(usuario);
    int escritas = armazem.escritas.get();

    Map<String, Object> consulta = servico.consultar(usuario);
    assertEquals(false, consulta.get("desatualizada"));

    usuario.getProfile().availableDays = 3;
    usuario.getProfile().trainingGoal = "forca";
    consulta = servico.consultar(usuario);
    assertEquals(true, consulta.get("desatualizada"));
    assertEquals(Arrays.asList("objetivo", "dias disponíveis"), consulta.get("mudancasPerfil"));
    assertEquals(escritas, armazem.escritas.get(), "Consultar não grava");
    assertEquals(1, armazem.rotinasDe(usuario.getId()).size());
  }

  @Test
  void historicoDasUltimasQuatroSemanasEntraNaInterpretacao() {
    User usuario = usuario("hipertrofia", "nunca", "nenhuma", 3, 60);
    for (int i = 0; i < 5; i++) {
      treinoComSerie(usuario, true, new Date(agora.get() - 40 * DIA));
    }
    armazem.inserirTreinoAvulso(usuario.getId(), false, new Date(agora.get() - DIA));
    for (int i = 0; i < 5; i++) {
      treinoComSerie(usuario, true, new Date(agora.get() - (i + 1) * DIA));
    }
    Map<?, ?> perfil = (Map<?, ?>) servico.previa(usuario, corpo(usuario)).get("perfil");
    assertEquals(false, perfil.get("frequenciaPeloHistorico"), "Treinos antigos e abertos não contam");

    treinoComSerie(usuario, true, new Date(agora.get() - 28 * DIA));
    perfil = (Map<?, ?>) servico.previa(usuario, corpo(usuario)).get("perfil");
    assertEquals(true, perfil.get("frequenciaPeloHistorico"));

    Document rotina = salvarPadrao(usuario);
    assertEquals(6, ((Map<?, ?>) rotina.get("entrada")).get("concluidosRecentes"));
  }

  // ------------------------------------------------------------------ iniciar e ciclo

  @Test
  void iniciarEhIdempotenteECopiaASessaoComNovosIdentificadores() {
    User usuario = intermediario();
    Document rotina = salvarPadrao(usuario);
    Map<String, Object> primeira = servico.iniciar(usuario, "A");
    Map<String, Object> segunda = servico.iniciar(usuario, "A");
    assertEquals(true, primeira.get("criado"));
    assertEquals(false, segunda.get("criado"));
    assertEquals(primeira.get("treinoId"), segunda.get("treinoId"));
    assertEquals(1, armazem.treinosDe(usuario.getId()).size());

    Document treino = treino(usuario, (ObjectId) primeira.get("treinoId"));
    assertEquals("ROTINA", treino.get("tipoDivisao"));
    assertEquals("A", treino.get("letraTreino"));
    assertEquals("A", treino.get("rotinaCodigo"));
    assertEquals(rotina.get("_id"), treino.get("rotinaId"));
    assertEquals(1, treino.get("rotinaVersao"));
    assertEquals(1, treino.get("ciclo"));
    assertEquals(MotorRotina.VERSAO, treino.get("motorVersao"));
    assertEquals(false, treino.get("realizado"));
    assertTrue(((String) treino.get("titulo")).startsWith("Treino A · "));
    assertNotNull(treino.get("resumo"));
    assertNotNull(treino.get("cobertura"));

    List<Map<String, Object>> modelo = exercicios(RotinaServico.sessao(rotina, "A"));
    List<Map<String, Object>> copiados = exercicios(treino);
    assertEquals(modelo.size(), copiados.size());
    Set<Object> uids = new HashSet<>();
    for (int i = 0; i < modelo.size(); i++) {
      assertEquals(modelo.get(i).get("exercicioId"), copiados.get(i).get("exercicioId"));
      assertEquals(modelo.get(i).get("series"), copiados.get(i).get("series"));
      assertEquals(modelo.get(i).get("uid"), copiados.get(i).get("rotinaUid"));
      assertNotEquals(modelo.get(i).get("uid"), copiados.get(i).get("uid"));
      uids.add(copiados.get(i).get("uid"));
    }
    assertEquals(modelo.size(), uids.size());

    falha(400, () -> servico.iniciar(usuario, "a"));
    falha(400, () -> servico.iniciar(usuario, "Z"));
    falha(400, () -> servico.iniciar(usuario, null));
    if (((List<?>) rotina.get("sessoes")).size() < 6) {
      falha(404, () -> servico.iniciar(usuario, "F"));
    }
  }

  @Test
  void sessaoSeguinteFicaBloqueadaAteAAnteriorSerConcluida() {
    User usuario = intermediario();
    Document rotina = salvarPadrao(usuario);
    assertTrue(((List<?>) rotina.get("sessoes")).size() >= 2);

    ApiException bloqueio = falha(409, () -> servico.iniciar(usuario, "B"));
    assertEquals("sessao_bloqueada", bloqueio.getBody().get("codigo"));
    assertTrue(String.valueOf(bloqueio.getBody().get("message")).contains("Treino A"));
    assertEquals(0, armazem.treinosDe(usuario.getId()).size(), "Consultar a sessão futura não cria ficha");

    ObjectId aberto = (ObjectId) servico.iniciar(usuario, "A").get("treinoId");
    assertEquals("A", estado(servico.consultar(usuario)).get("proxima"));
    falha(409, () -> servico.iniciar(usuario, "B"));
    assertEquals(1, armazem.treinosDe(usuario.getId()).size());

    Document futuro =
        new Document("_id", new ObjectId())
            .append("user", usuario.getId())
            .append("rotinaId", rotina.getObjectId("_id"))
            .append("rotinaCodigo", "B")
            .append("realizado", false)
            .append("createdAt", new Date(agora.get()));
    assertTrue(armazem.inserirInstancia(futuro));
    falha(409, () -> servico.exigirSequencia(usuario, futuro));
    falha(409, () -> servico.iniciar(usuario, "B"));
    assertEquals(2, armazem.treinosDe(usuario.getId()).size(), "A ficha antiga permanece e não é duplicada");
    servico.exigirSequencia(usuario, treino(usuario, aberto));

    Document avulso = new Document("_id", new ObjectId()).append("user", usuario.getId()).append("realizado", false);
    servico.exigirSequencia(usuario, avulso);

    armazem.concluir(aberto, new Date(agora.get()));
    assertEquals("B", estado(servico.consultar(usuario)).get("proxima"));
    Map<String, Object> liberado = servico.iniciar(usuario, "B");
    assertEquals(false, liberado.get("criado"));
    assertEquals(futuro.get("_id"), liberado.get("treinoId"));
    servico.exigirSequencia(usuario, futuro);
  }

  @Test
  void programacoesDeUmASeisTreinosSoLiberamAPrimeiraSessao() {
    for (int dias = 1; dias <= 6; dias++) {
      User usuario = usuario("hipertrofia", "de_1_a_2_anos", "semanal_3_4", dias, 60);
      Document rotina = salvarPadrao(usuario);
      int total = ((List<?>) rotina.get("sessoes")).size();
      assertTrue(total >= 1 && total <= 6, "dias " + dias + " gerou " + total);
      assertEquals("A", estado(servico.consultar(usuario)).get("proxima"));
      if (total > 1) {
        falha(409, () -> servico.iniciar(usuario, "B"));
        assertEquals(0, armazem.treinosDe(usuario.getId()).size());
      }
      assertEquals(true, servico.iniciar(usuario, "A").get("criado"));
      assertEquals("A", estado(servico.consultar(usuario)).get("proxima"), "Recarregar mantém a sessão atual");
    }
  }

  @Test
  void iniciosSimultaneosDeSessoesDiferentesNaoAbremASeguinte() throws Exception {
    User usuario = intermediario();
    salvarPadrao(usuario);
    List<Callable<Object>> tarefas = new ArrayList<>();
    for (int i = 0; i < 6; i++) {
      String codigo = i % 2 == 0 ? "A" : "B";
      tarefas.add(
          () -> {
            try {
              return servico.iniciar(usuario, codigo);
            } catch (ApiException e) {
              return e;
            }
          });
    }
    int criados = 0;
    int bloqueios = 0;
    for (Future<Object> futuro : simultaneos(tarefas)) {
      Object resultado = futuro.get(30, TimeUnit.SECONDS);
      if (resultado instanceof ApiException erro) {
        assertEquals(409, erro.getStatus());
        assertEquals("sessao_bloqueada", erro.getBody().get("codigo"));
        bloqueios++;
      } else {
        @SuppressWarnings("unchecked")
        Map<String, Object> mapa = (Map<String, Object>) resultado;
        if (Boolean.TRUE.equals(mapa.get("criado"))) {
          criados++;
        }
      }
    }
    assertEquals(1, criados);
    assertTrue(bloqueios >= 1);
    List<Document> treinos = armazem.treinosDe(usuario.getId());
    assertEquals(1, treinos.size());
    assertEquals("A", treinos.get(0).get("rotinaCodigo"));
  }

  @Test
  void programacaoSemanalRespeitaAOrdemGravadaENaoOTitulo() {
    User ana = intermediario();
    User bruno = usuario("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 3, 60);
    String chave = "programa-ana";
    for (int ordem = 1; ordem <= 6; ordem++) {
      String titulo = ordem == 1 ? "Treino A" : "Sessão " + ordem + " — Inferior";
      armazem.guardar(fichaPrograma(ana.getId(), chave, "s" + ordem, ordem, titulo, false));
    }
    armazem.guardar(fichaPrograma(bruno.getId(), chave, "s1", 1, "Sessão 1 — Inferior", false));
    armazem.guardar(fichaPrograma(bruno.getId(), chave, "s2", 2, "Sessão 2 — Inferior", false));
    Document antiga = fichaPrograma(ana.getId(), "programa-antigo", "s3", 3, "Sessão 3 — Inferior", false);
    armazem.guardar(antiga);
    Document avulso =
        new Document("_id", new ObjectId())
            .append("user", ana.getId())
            .append("titulo", "Sessão 3 — Inferior")
            .append("realizado", false);
    armazem.guardar(avulso);

    List<Document> fichas = armazem.doPrograma(ana.getId(), chave);
    assertEquals(6, fichas.size());
    Document primeira = fichas.get(0);
    Document terceira = fichas.get(2);
    assertEquals("s1", primeira.get("programaCodigo"));
    assertEquals("s3", terceira.get("programaCodigo"));
    assertEquals(8, armazem.treinosDe(ana.getId()).size());

    servico.exigirSequencia(ana, primeira);
    ApiException bloqueio = falha(409, () -> servico.exigirSequencia(ana, terceira));
    assertEquals("sessao_bloqueada", bloqueio.getBody().get("codigo"));
    assertEquals("Conclua o Treino A para liberar este treino.", bloqueio.getBody().get("message"));
    servico.anotarSequencia(ana, terceira);
    assertEquals(false, terceira.get("execucaoPermitida"));
    assertEquals(false, terceira.get("exclusaoPermitida"));
    assertEquals(false, servico.podeExcluir(ana, terceira));
    servico.exigirSequencia(ana, avulso);
    assertEquals(true, servico.podeExcluir(ana, avulso));

    falha(403, () -> servico.exigirSequencia(bruno, terceira));
    falha(409, () -> servico.exigirSequencia(bruno, armazem.doPrograma(bruno.getId(), chave).get(1)));

    for (int total = 1; total <= 6; total++) {
      User usuario = usuario("hipertrofia", "de_1_a_2_anos", "semanal_3_4", total, 45);
      String programa = "tamanho-" + total;
      for (int ordem = 1; ordem <= total; ordem++) {
        armazem.guardar(fichaPrograma(usuario.getId(), programa, "s" + ordem, ordem, "Sessão " + ordem, false));
      }
      List<Document> sessoes = armazem.doPrograma(usuario.getId(), programa);
      servico.exigirSequencia(usuario, sessoes.get(0));
      servico.reservarExecucao(usuario, sessoes.get(0));
      if (total > 1) {
        falha(409, () -> servico.exigirSequencia(usuario, sessoes.get(1)));
        falha(409, () -> servico.reservarExecucao(usuario, sessoes.get(1)));
      }
    }

    armazem.concluir(primeira.getObjectId("_id"), new Date(agora.get()));
    Document concluida = armazem.doPrograma(ana.getId(), chave).get(0);
    Document segunda = armazem.doPrograma(ana.getId(), chave).get(1);
    assertEquals(true, concluida.get("realizado"));
    servico.exigirSequencia(ana, concluida);
    assertEquals(false, servico.podeExcluir(ana, concluida), "Concluir não autoriza apagar o histórico");
    falha(409, () -> servico.exigirSequencia(ana, terceira));
    servico.exigirSequencia(ana, segunda);

    armazem.concluir(segunda.getObjectId("_id"), new Date(agora.get()));
    servico.exigirSequencia(ana, armazem.doPrograma(ana.getId(), chave).get(2));
    assertEquals(8, armazem.treinosDe(ana.getId()).size(), "Concluir A e B não recria nem apaga fichas");
  }

  @Test
  void rotinaAtivaImpedeOutraProgramacaoMesmoComExecucaoGravada() {
    User usuario = intermediario();
    Document rotina = salvarPadrao(usuario);
    ObjectId treinoA = (ObjectId) servico.iniciar(usuario, "A").get("treinoId");
    String chave = "semana-antiga";
    Document sessao1 = fichaPrograma(usuario.getId(), chave, "s1", 1, "Sessão 1 — Empurrar", false);
    Document sessao2 = fichaPrograma(usuario.getId(), chave, "s2", 2, "Sessão 2 — Puxar", false);
    Document sessao3 = fichaPrograma(usuario.getId(), chave, "s3", 3, "Sessão 3 — Pernas", false);
    armazem.guardar(sessao1);
    armazem.guardar(sessao2);
    armazem.guardar(sessao3);
    armazem.registrarExecucao(
        usuario.getId(),
        treinoA,
        new Document("status", "em_andamento").append("iniciadoEm", new Date(1_000)));
    armazem.registrarExecucao(
        usuario.getId(),
        sessao2.getObjectId("_id"),
        new Document("status", "em_andamento").append("iniciadoEm", new Date(2_000)));
    int antes = armazem.treinosDe(usuario.getId()).size();

    servico.reservarExecucao(usuario, treino(usuario, treinoA));
    ApiException bloqueio = falha(409, () -> servico.reservarExecucao(usuario, sessao2));
    assertEquals("sessao_bloqueada", bloqueio.getBody().get("codigo"));
    assertTrue(String.valueOf(bloqueio.getBody().get("message")).contains("Treino A"));
    falha(409, () -> servico.exigirSequencia(usuario, sessao3));
    falha(409, () -> servico.reservarExecucao(usuario, sessao1));

    Document antiga =
        new Document("_id", new ObjectId())
            .append("user", usuario.getId())
            .append("rotinaId", new ObjectId())
            .append("rotinaCodigo", "B")
            .append("titulo", "Treino B · Antigo")
            .append("realizado", false);
    armazem.guardar(antiga);
    falha(409, () -> servico.reservarExecucao(usuario, antiga));

    Document avulso = new Document("_id", new ObjectId()).append("user", usuario.getId()).append("realizado", false);
    armazem.guardar(avulso);
    servico.reservarExecucao(usuario, avulso);

    Document fichaA = treino(usuario, treinoA);
    fichaA.put("estadoExecucao", "em_andamento");
    sessao2.put("estadoExecucao", "em_andamento");
    sessao3.put("estadoExecucao", "nao_iniciado");
    servico.anotarLista(usuario, List.of(fichaA, sessao2, sessao3));
    assertEquals(true, fichaA.get("execucaoPermitida"));
    assertEquals("em_andamento", fichaA.get("estadoExecucao"));
    assertEquals(false, sessao2.get("execucaoPermitida"));
    assertEquals("nao_iniciado", sessao2.get("estadoExecucao"));
    assertNotNull(sessao2.get("bloqueioMensagem"));
    assertEquals(false, sessao3.get("execucaoPermitida"));
    assertEquals(false, sessao2.get("realizado"));
    assertEquals(antes + 2, armazem.treinosDe(usuario.getId()).size(), "A anotação não apaga nem recria fichas");

    User outro = usuario("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 3, 60);
    falha(403, () -> servico.reservarExecucao(outro, sessao2));

    armazem.concluir(treinoA, new Date(agora.get()));
    servico.liberarExecucao(usuario, treino(usuario, treinoA));
    assertEquals("B", estado(servico.consultar(usuario)).get("proxima"));
    falha(409, () -> servico.reservarExecucao(usuario, sessao2));
    Map<String, Object> liberado = servico.iniciar(usuario, "B");
    assertEquals(rotina.getObjectId("_id"), treino(usuario, (ObjectId) liberado.get("treinoId")).get("rotinaId"));
    if (((List<?>) rotina.get("sessoes")).size() >= 3) {
      falha(409, () -> servico.iniciar(usuario, "C"));
    }
  }

  @Test
  void programacaoSemanalSoReservaASessaoLiberadaEAposAConclusao() {
    User usuario = intermediario();
    String chave = "ciclo-unico";
    List<Document> fichas = new ArrayList<>();
    for (int ordem = 1; ordem <= 6; ordem++) {
      Document ficha =
          fichaPrograma(usuario.getId(), chave, "s" + ordem, ordem, ordem == 1 ? "Treino A" : "Sessão " + ordem, false);
      armazem.guardar(ficha);
      fichas.add(ficha);
    }
    falha(409, () -> servico.reservarExecucao(usuario, fichas.get(1)));
    falha(409, () -> servico.reservarExecucao(usuario, fichas.get(2)));
    servico.reservarExecucao(usuario, fichas.get(0));
    servico.reservarExecucao(usuario, fichas.get(0));

    armazem.concluir(fichas.get(0).getObjectId("_id"), new Date(agora.get()));
    servico.liberarExecucao(usuario, fichas.get(0));
    falha(409, () -> servico.reservarExecucao(usuario, fichas.get(2)));
    servico.reservarExecucao(usuario, fichas.get(1));
    armazem.concluir(fichas.get(1).getObjectId("_id"), new Date(agora.get()));
    servico.liberarExecucao(usuario, fichas.get(1));
    servico.reservarExecucao(usuario, fichas.get(2));
    assertEquals(6, armazem.treinosDe(usuario.getId()).size());
    assertEquals(false, fichas.get(2).get("realizado"));
  }

  @Test
  void duasReservasSimultaneasNaoAbremDuasExecucoes() throws Exception {
    User usuario = intermediario();
    Document primeira = fichaPrograma(usuario.getId(), "programa-a", "s1", 1, "Treino A", false);
    Document segunda = fichaPrograma(usuario.getId(), "programa-b", "s1", 1, "Sessão 2 — Puxar", false);
    armazem.guardar(primeira);
    armazem.guardar(segunda);
    List<Callable<Object>> tarefas = new ArrayList<>();
    for (int i = 0; i < 8; i++) {
      Document alvo = i % 2 == 0 ? primeira : segunda;
      tarefas.add(
          () -> {
            try {
              servico.reservarExecucao(usuario, alvo);
              return "ok";
            } catch (ApiException e) {
              return e;
            }
          });
    }
    int ok = 0;
    int bloqueios = 0;
    ObjectId vencedor = null;
    for (Future<Object> futuro : simultaneos(tarefas)) {
      Object resultado = futuro.get(30, TimeUnit.SECONDS);
      if (resultado instanceof ApiException erro) {
        assertEquals(409, erro.getStatus());
        assertEquals("sessao_em_andamento", erro.getBody().get("codigo"));
        bloqueios++;
      } else {
        ok++;
      }
    }
    assertTrue(ok >= 1);
    assertTrue(bloqueios >= 1);
    if (armazem.execucaoReservada(usuario.getId()).equals(primeira.getObjectId("_id"))) {
      vencedor = primeira.getObjectId("_id");
      falha(409, () -> servico.reservarExecucao(usuario, segunda));
    } else {
      vencedor = segunda.getObjectId("_id");
      falha(409, () -> servico.reservarExecucao(usuario, primeira));
    }
    assertNotNull(vencedor);
    assertEquals(2, armazem.treinosDe(usuario.getId()).size(), "A disputa não apaga fichas");
  }

  @Test
  void iniciarSemRotinaEhRecusado() {
    User usuario = intermediario();
    falha(404, () -> servico.iniciar(usuario, "A"));
    assertEquals(0, armazem.escritas.get());
  }

  @Test
  void iniciosSimultaneosCriamUmUnicoTreino() throws Exception {
    User usuario = intermediario();
    salvarPadrao(usuario);
    armazem.atrasoLeituraMs = 15;
    List<Callable<Map<String, Object>>> tarefas = new ArrayList<>();
    for (int i = 0; i < 8; i++) {
      tarefas.add(() -> servico.iniciar(usuario, "A"));
    }
    Set<Object> ids = new HashSet<>();
    int criados = 0;
    for (Future<Map<String, Object>> futuro : simultaneos(tarefas)) {
      Map<String, Object> resultado = futuro.get(30, TimeUnit.SECONDS);
      ids.add(resultado.get("treinoId"));
      if (Boolean.TRUE.equals(resultado.get("criado"))) {
        criados++;
      }
    }
    assertEquals(1, ids.size());
    assertEquals(1, criados);
    assertEquals(1, armazem.treinosDe(usuario.getId()).size());
    assertTrue(armazem.duplicatasRecusadas.get() > 0, "A disputa chegou à restrição de unicidade");
  }

  @Test
  void cicloSoAvancaComConclusoesRegistradas() {
    User usuario = intermediario();
    salvarPadrao(usuario);
    Map<String, Object> estado = estado(servico.consultar(usuario));
    int total = (int) estado.get("totalSessoes");
    assertTrue(total >= 2);
    assertEquals(1, estado.get("ciclo"));
    assertEquals("A", estado.get("proxima"));

    agora.addAndGet(10 * DIA);
    estado = estado(servico.consultar(usuario));
    assertEquals(0, estado.get("concluidasNoCiclo"), "Datas que passam não concluem sessões");
    assertEquals("A", estado.get("proxima"));

    List<String> feitas = new ArrayList<>();
    for (int i = 0; i < total; i++) {
      String codigo = (String) estado.get("proxima");
      ObjectId treino = (ObjectId) servico.iniciar(usuario, codigo).get("treinoId");
      assertEquals(CicloRotina.EM_ANDAMENTO, status(estado(servico.consultar(usuario)), codigo));
      assertEquals(codigo, estado(servico.consultar(usuario)).get("proxima"), "Em andamento vem primeiro");
      agora.addAndGet(DIA);
      armazem.concluir(treino, new Date(agora.get()));
      feitas.add(codigo);
      estado = estado(servico.consultar(usuario));
      if (i < total - 1) {
        assertEquals(CicloRotina.CONCLUIDA, status(estado, codigo));
        assertEquals(i + 1, estado.get("concluidasNoCiclo"));
      }
    }
    assertEquals(total, new HashSet<>(feitas).size(), "Cada sessão foi feita uma vez, em ordem");
    assertEquals(2, estado.get("ciclo"), "Semana concluída abre o próximo ciclo");
    assertEquals("A", estado.get("proxima"));
    assertEquals(0, estado.get("concluidasNoCiclo"));
    assertNotNull(sessaoDoEstado(estado, "A").get("ultimaConclusao"));

    ObjectId proximo = (ObjectId) servico.iniciar(usuario, "A").get("treinoId");
    assertEquals(2, treino(usuario, proximo).get("ciclo"));
    long concluidos =
        armazem.treinosDe(usuario.getId()).stream()
            .filter(t -> Boolean.TRUE.equals(t.get("realizado")))
            .count();
    assertEquals(total, concluidos, "O histórico do ciclo anterior continua intacto");
  }

  @Test
  void treinoAbertoMostraSeAExecucaoJaComecou() {
    User usuario = intermediario();
    salvarPadrao(usuario);
    ObjectId treino = (ObjectId) servico.iniciar(usuario, "A").get("treinoId");
    Map<String, Object> sessao = sessaoDoEstado(estado(servico.consultar(usuario)), "A");
    assertEquals(treino, sessao.get("treinoAbertoId"));
    assertEquals(false, sessao.get("execucaoIniciada"));

    armazem.registrarExecucao(
        usuario.getId(),
        treino,
        new Document(
            "exercicios",
            List.of(new Document("uid", "x").append("series", List.of(new Document("reps", 10))))));
    sessao = sessaoDoEstado(estado(servico.consultar(usuario)), "A");
    assertEquals(true, sessao.get("execucaoIniciada"));
  }

  // ------------------------------------------------------------------ agenda

  @Test
  void agendaUsaRevisaoCondicionalENaoCriaVersao() {
    User usuario = intermediario();
    Document rotina = salvarPadrao(usuario);
    int sessoes = ((List<?>) rotina.get("sessoes")).size();
    List<Integer> dias = new ArrayList<>(AgendaSemanal.sugeridos(sessoes));
    dias.set(dias.size() - 1, 7);
    Map<String, Object> pedido = new LinkedHashMap<>();
    pedido.put("revisao", 0);
    pedido.put("agenda", Map.of("modo", "calendario", "dias", dias));

    Document atual = (Document) servico.atualizarAgenda(usuario, pedido).get("rotina");
    assertEquals(1, atual.get("revisao"));
    assertEquals(1, atual.get("versao"));
    assertEquals(rotina.get("assinatura"), atual.get("assinatura"));
    assertEquals(rotina.get("sessoes"), atual.get("sessoes"));
    Map<?, ?> agenda = (Map<?, ?>) atual.get("agenda");
    assertEquals("calendario", agenda.get("modo"));
    assertTrue(((List<?>) agenda.get("dias")).contains(7), "Domingo é um dia como outro qualquer");
    boolean explicou = false;
    for (Object item : (List<?>) atual.get("explicacao")) {
      Map<?, ?> trecho = (Map<?, ?>) item;
      if ("agenda".equals(trecho.get("tipo"))) {
        explicou = String.valueOf(trecho.get("texto")).contains("Dias combinados");
      }
    }
    assertTrue(explicou, "A explicação acompanha a agenda nova");

    ApiException conflito = falha(409, () -> servico.atualizarAgenda(usuario, pedido));
    assertEquals("rotina_alterada", conflito.getBody().get("codigo"));

    Map<String, Object> repetidos = new LinkedHashMap<>();
    repetidos.put("revisao", 1);
    List<Integer> diasRepetidos = new ArrayList<>();
    for (int i = 0; i < sessoes; i++) {
      diasRepetidos.add(1);
    }
    repetidos.put("agenda", Map.of("modo", "calendario", "dias", diasRepetidos));
    falha(400, () -> servico.atualizarAgenda(usuario, repetidos));

    Map<String, Object> flexivel = new LinkedHashMap<>();
    flexivel.put("revisao", 1);
    flexivel.put("agenda", Map.of("modo", "flexivel"));
    Document deVolta = (Document) servico.atualizarAgenda(usuario, flexivel).get("rotina");
    assertEquals("flexivel", ((Map<?, ?>) deVolta.get("agenda")).get("modo"));
    assertEquals(2, deVolta.get("revisao"));
    assertEquals(1, armazem.rotinasDe(usuario.getId()).size());
  }

  // ------------------------------------------------------------------ propriedade

  @Test
  void usuariosNaoAcessamRotinasNemTreinosUnsDosOutros() {
    User ana = intermediario();
    User bruno = usuario("forca", "de_2_a_5_anos", "semanal_3_4", 3, 75);
    Document rotinaAna = salvarPadrao(ana);
    servico.iniciar(ana, "A");

    Map<String, Object> consulta = servico.consultar(bruno);
    assertNull(consulta.get("rotina"));
    Map<String, Object> previa = servico.previa(bruno, corpo(bruno));
    assertNull(previa.get("baseVersao"));
    assertTrue(((List<?>) previa.get("sessoesEmAndamento")).isEmpty());
    falha(404, () -> servico.iniciar(bruno, "A"));
    Map<String, Object> agenda = new LinkedHashMap<>();
    agenda.put("revisao", 0);
    agenda.put("agenda", Map.of("modo", "flexivel"));
    falha(404, () -> servico.atualizarAgenda(bruno, agenda));

    PerfilInterpretado perfil = servico.perfilDaRotina(bruno, rotinaAna.getObjectId("_id"));
    assertEquals("forca", perfil.objetivo, "Rotina de outra conta não é usada");

    Document rotinaBruno = salvarPadrao(bruno);
    assertEquals(1, rotinaBruno.get("versao"), "Versões são contadas por usuário");
    assertTrue(armazem.treinosDe(bruno.getId()).isEmpty());
    assertEquals(1, armazem.treinosDe(ana.getId()).size());
    assertEquals(rotinaAna.get("_id"), ((Document) servico.consultar(ana).get("rotina")).get("_id"));
  }

  // ------------------------------------------------------------------ treino avulso

  @Test
  void treinoAvulsoRespeitaAsPreferenciasDaRotinaENaoGrava() {
    User usuario = intermediario();
    String evitado = "medio-supino-reto-com-barra";
    Map<String, Object> brutas = Map.of("limitacoes", List.of("acima_cabeca"), "evitar", List.of(evitado));
    PreferenciasTreino preferencias = PreferenciasTreino.ler(brutas, new ArrayList<>());
    Map<String, Object> corpo = corpo(usuario);
    corpo.put("preferencias", brutas);
    servico.salvar(usuario, pedidoSalvar(usuario, corpo));
    int escritas = armazem.escritas.get();

    for (int variante = 0; variante < 4; variante++) {
      Document treino = servico.treinoAvulso(usuario, "superior", 45, variante, new Date(agora.get()));
      assertEquals("AVULSO", treino.get("tipoDivisao"));
      assertEquals("superior", treino.get("avulsoFoco"));
      assertEquals("SUPERIOR", treino.get("focoSessao"));
      assertEquals(MotorRotina.VERSAO, treino.get("motorVersao"));
      assertEquals(45, treino.get("tempoDisponivel"));
      assertEquals(false, treino.get("realizado"));
      Set<Object> uids = new HashSet<>();
      for (Map<String, Object> item : exercicios(treino)) {
        ExerciseDatabase.Exercise e = ExerciseDatabase.porId((String) item.get("exercicioId"));
        assertNotNull(e, "Só exercícios do catálogo");
        assertNotEquals(evitado, e.id);
        assertTrue(preferencias.permite(e), "Preferências da rotina respeitadas: " + e.nome);
        assertFalse(item.containsKey("rotinaUid"));
        uids.add(item.get("uid"));
      }
      assertEquals(exercicios(treino).size(), uids.size());
    }
    assertEquals(escritas, armazem.escritas.get(), "Montar o treino avulso não grava");
    falha(400, () -> servico.treinoAvulso(usuario, "bracos", 45, 0, new Date()));
  }

  @Test
  void treinoAvulsoSemRotinaUsaOPerfilAtual() {
    User usuario = usuario("forca", "de_2_a_5_anos", "semanal_3_4", 3, 60);
    Document treino = servico.treinoAvulso(usuario, "inferior", 60, 0, new Date(agora.get()));
    assertTrue(String.valueOf(treino.get("objetivo")).startsWith(servico.perfilAtual(usuario).objetivoRotulo()));
    assertFalse(exercicios(treino).isEmpty());
    assertEquals(0, armazem.escritas.get());
  }

  @Test
  void perfilDaRotinaUsaOsDadosDaCriacao() {
    User usuario = intermediario();
    Map<String, Object> corpo = corpo(usuario);
    corpo.put("preferencias", Map.of("limitacoes", List.of("acima_cabeca")));
    Document rotina = (Document) servico.salvar(usuario, pedidoSalvar(usuario, corpo)).get("rotina");
    usuario.getProfile().trainingGoal = "forca";

    PerfilInterpretado perfil = servico.perfilDaRotina(usuario, rotina.getObjectId("_id"));
    assertEquals("hipertrofia", perfil.objetivo);
    assertEquals(List.of("acima_cabeca"), perfil.preferencias.limitacoes);
  }

  private static Document fichaPrograma(
      ObjectId usuario, String chave, String codigo, int ordem, String titulo, boolean realizado) {
    return new Document("_id", new ObjectId())
        .append("user", usuario)
        .append("programaChave", chave)
        .append("programaCodigo", codigo)
        .append("programaOrdem", ordem)
        .append("titulo", titulo)
        .append("realizado", realizado)
        .append("createdAt", new Date());
  }
}
