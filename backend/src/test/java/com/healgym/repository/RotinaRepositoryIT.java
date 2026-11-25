package com.healgym.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.healgym.model.User;
import com.healgym.service.rotina.RotinaServico;
import com.mongodb.ConnectionString;
import com.mongodb.ErrorCategory;
import com.mongodb.MongoWriteException;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Integração com um Mongo descartável. Só roda com {@code -Dhealgym.teste.mongo=<uri>} e recusa
 * a porta 27017, hosts remotos e bancos sem "teste" no nome. Cada execução usa um banco novo.
 *
 * <pre>
 * docker run --rm -d --name healgym-mongo-teste -p 27027:27017 mongo:7
 * mvn test -Dtest=RotinaRepositoryIT -Dhealgym.teste.mongo=mongodb://localhost:27027/healgym_teste
 * docker stop healgym-mongo-teste
 * </pre>
 */
class RotinaRepositoryIT {

  private static MongoClient client;
  private static MongoDatabase database;
  private MongoCollection<Document> rotinas;
  private MongoCollection<Document> treinos;
  private MongoCollection<Document> execucoes;
  private RotinaRepository repositorio;

  static String uriSegura() {
    String uri = System.getProperty("healgym.teste.mongo");
    assumeTrue(uri != null && !uri.isBlank(), "Defina -Dhealgym.teste.mongo para rodar");
    if (uri.startsWith("mongodb+srv")) {
      throw new IllegalStateException("Recusado: use um Mongo local descartável.");
    }
    ConnectionString conexao = new ConnectionString(uri);
    for (String host : conexao.getHosts()) {
      int separador = host.lastIndexOf(':');
      String nome = separador < 0 ? host : host.substring(0, separador);
      int porta = separador < 0 ? 27017 : Integer.parseInt(host.substring(separador + 1));
      if (porta == 27017) {
        throw new IllegalStateException("Recusado: a porta 27017 é a do banco de desenvolvimento.");
      }
      if (!nome.equals("localhost") && !nome.equals("127.0.0.1")) {
        throw new IllegalStateException("Recusado: apenas Mongo local.");
      }
    }
    String banco = conexao.getDatabase();
    if (banco == null || !banco.contains("teste")) {
      throw new IllegalStateException("Recusado: o nome do banco precisa conter 'teste'.");
    }
    return uri;
  }

  @BeforeAll
  static void conectar() {
    String uri = uriSegura();
    client = MongoClients.create(uri);
    database =
        client.getDatabase(new ConnectionString(uri).getDatabase() + "_" + new ObjectId().toHexString());
  }

  @AfterAll
  static void desconectar() {
    if (client != null) {
      client.close();
    }
  }

  @BeforeEach
  void preparar() {
    String sufixo = new ObjectId().toHexString();
    rotinas = database.getCollection("training_routines_" + sufixo);
    treinos = database.getCollection("workouts_" + sufixo);
    execucoes = database.getCollection("workout_executions_" + sufixo);
    repositorio = new RotinaRepository(rotinas, treinos, execucoes);
    repositorio.ensureIndexes();
  }

  private static Document rotina(ObjectId usuario, int versao, String status) {
    return new Document("_id", new ObjectId())
        .append("user", usuario)
        .append("versao", versao)
        .append("revisao", 0)
        .append("status", status);
  }

  private static Document instancia(ObjectId usuario, ObjectId rotinaId, String codigo) {
    Date agora = new Date();
    return new Document("_id", new ObjectId())
        .append("user", usuario)
        .append("rotinaId", rotinaId)
        .append("rotinaCodigo", codigo)
        .append("realizado", false)
        .append("createdAt", agora)
        .append("updatedAt", agora);
  }

  /** Mesmo efeito do endpoint de conclusão: substitui o documento com realizado = true. */
  private void concluir(Document treino, Date quando) {
    treino.put("realizado", true);
    treino.put("dataRealizacao", quando);
    treinos.replaceOne(Filters.eq("_id", treino.get("_id")), treino);
  }

  @Test
  void indicesSaoCriadosSobreTreinosAntigosESaoIdempotentes() {
    MongoCollection<Document> legado = database.getCollection("workouts_legado_" + new ObjectId());
    ObjectId usuario = new ObjectId();
    for (int i = 0; i < 3; i++) {
      legado.insertOne(new Document("user", usuario).append("realizado", false).append("letraTreino", "A"));
    }
    RotinaRepository comLegado = new RotinaRepository(rotinas, legado, execucoes);
    comLegado.ensureIndexes();
    comLegado.ensureIndexes();
    legado.insertOne(new Document("user", usuario).append("realizado", false).append("letraTreino", "A"));
    assertEquals(4, legado.countDocuments(Filters.eq("user", usuario)));
    boolean parcial = false;
    for (Document indice : legado.listIndexes()) {
      if ("rotina_sessao_aberta".equals(indice.get("name"))) {
        parcial = Boolean.TRUE.equals(indice.get("unique")) && indice.get("partialFilterExpression") != null;
      }
    }
    assertTrue(parcial, "Índice único parcial presente");
  }

  @Test
  void versaoEhUnicaPorUsuario() {
    ObjectId ana = new ObjectId();
    ObjectId bruno = new ObjectId();
    assertTrue(repositorio.inserirRotina(rotina(ana, 1, "ativa")));
    assertFalse(repositorio.inserirRotina(rotina(ana, 1, "ativa")));
    assertTrue(repositorio.inserirRotina(rotina(bruno, 1, "ativa")));
    assertTrue(repositorio.inserirRotina(rotina(ana, 2, "ativa")));
    assertEquals(2, repositorio.ativa(ana).get("versao"));
    assertEquals(1, repositorio.ativa(bruno).get("versao"));
    assertNull(repositorio.ativa(new ObjectId()));

    repositorio.substituirAnteriores(ana, 2, new Date());
    assertEquals("substituida", rotinas.find(Filters.and(Filters.eq("user", ana), Filters.eq("versao", 1))).first().get("status"));
    assertEquals("ativa", repositorio.ativa(ana).get("status"));
    assertEquals("ativa", repositorio.ativa(bruno).get("status"));
    assertEquals(3, rotinas.countDocuments(), "Nada é apagado");
  }

  @Test
  void atualizacaoUsaRevisaoEDono() {
    ObjectId ana = new ObjectId();
    Document doc = rotina(ana, 1, "ativa");
    repositorio.inserirRotina(doc);
    ObjectId id = doc.getObjectId("_id");
    assertTrue(repositorio.atualizarRotina(ana, id, 0, new Document("agenda", new Document("modo", "flexivel"))));
    assertFalse(repositorio.atualizarRotina(ana, id, 0, new Document("agenda", new Document("modo", "calendario"))));
    assertFalse(repositorio.atualizarRotina(new ObjectId(), id, 1, new Document("agenda", "x")));
    Document atual = repositorio.rotina(ana, id);
    assertEquals(1, atual.get("revisao"));
    assertEquals("flexivel", ((Document) atual.get("agenda")).get("modo"));
    assertNull(repositorio.rotina(new ObjectId(), id), "Outra conta não lê a rotina");
  }

  @Test
  void apenasUmTreinoAbertoPorSessaoEConcluirLiberaOProximo() {
    ObjectId ana = new ObjectId();
    ObjectId rotinaId = new ObjectId();
    Document primeiro = instancia(ana, rotinaId, "A");
    assertTrue(repositorio.inserirInstancia(primeiro));
    assertFalse(repositorio.inserirInstancia(instancia(ana, rotinaId, "A")));
    assertTrue(repositorio.inserirInstancia(instancia(ana, rotinaId, "B")));
    assertTrue(repositorio.inserirInstancia(instancia(new ObjectId(), rotinaId, "A")));
    assertEquals(primeiro.get("_id"), repositorio.instanciaAberta(ana, rotinaId, "A").get("_id"));

    concluir(primeiro, new Date());
    assertNull(repositorio.instanciaAberta(ana, rotinaId, "A"));
    Document segundo = instancia(ana, rotinaId, "A");
    assertTrue(repositorio.inserirInstancia(segundo), "Concluído sai do índice parcial");
    concluir(segundo, new Date());
    assertTrue(repositorio.inserirInstancia(instancia(ana, rotinaId, "A")));
    assertEquals(4, repositorio.instancias(ana, rotinaId).size());
  }

  @Test
  void leiturasFiltramPorUsuario() {
    ObjectId ana = new ObjectId();
    ObjectId bruno = new ObjectId();
    ObjectId rotinaId = new ObjectId();
    Document daAna = instancia(ana, rotinaId, "A");
    repositorio.inserirInstancia(daAna);
    assertTrue(repositorio.instancias(bruno, rotinaId).isEmpty());
    assertNull(repositorio.instanciaAberta(bruno, rotinaId, "A"));

    execucoes.insertOne(new Document("user", ana).append("workout", daAna.get("_id")).append("status", "em_andamento"));
    assertEquals(1, repositorio.execucoes(ana, List.of(daAna.getObjectId("_id"))).size());
    assertTrue(repositorio.execucoes(bruno, List.of(daAna.getObjectId("_id"))).isEmpty());

    Date agora = new Date();
    Date limite = new Date(agora.getTime() - RotinaServico.JANELA_HISTORICO_MS);
    treinos.insertOne(new Document("user", ana).append("realizado", true).append("dataRealizacao", agora));
    treinos.insertOne(new Document("user", ana).append("realizado", true).append("dataRealizacao", limite));
    treinos.insertOne(new Document("user", ana).append("realizado", true).append("dataRealizacao", new Date(limite.getTime() - 1)));
    treinos.insertOne(new Document("user", bruno).append("realizado", true).append("dataRealizacao", agora));
    assertEquals(2, repositorio.concluidosDesde(ana, limite));
  }

  @Test
  void chaveDoTreinoAvulsoEhUnicaPorUsuario() {
    ObjectId ana = new ObjectId();
    treinos.insertOne(new Document("user", ana).append("chaveIdempotencia", "chave-12345678"));
    MongoWriteException erro =
        assertThrows(
            MongoWriteException.class,
            () -> treinos.insertOne(new Document("user", ana).append("chaveIdempotencia", "chave-12345678")));
    assertEquals(ErrorCategory.DUPLICATE_KEY, erro.getError().getCategory());
    treinos.insertOne(new Document("user", new ObjectId()).append("chaveIdempotencia", "chave-12345678"));
    treinos.insertOne(new Document("user", ana).append("realizado", false));
    treinos.insertOne(new Document("user", ana).append("realizado", false));
    assertEquals(3, treinos.countDocuments(Filters.eq("user", ana)));
  }

  @Test
  void execucoesEmLoteFiltramPorUsuario() {
    ExecutionRepository repositorioExecucoes = new ExecutionRepository(execucoes);
    ObjectId ana = new ObjectId();
    ObjectId treinoA = new ObjectId();
    ObjectId treinoB = new ObjectId();
    execucoes.insertOne(new Document("user", ana).append("workout", treinoA).append("status", "em_andamento"));
    execucoes.insertOne(new Document("user", new ObjectId()).append("workout", treinoB));
    Map<ObjectId, Document> mapa = repositorioExecucoes.porTreinos(ana, List.of(treinoA, treinoB));
    assertEquals(1, mapa.size());
    assertTrue(mapa.containsKey(treinoA));
    assertTrue(repositorioExecucoes.porTreinos(ana, List.of()).isEmpty());
  }

  @Test
  void servicoSobreOMongoReal() throws Exception {
    RotinaServico servico = new RotinaServico(repositorio);
    ObjectId id = new ObjectId();
    User usuario =
        User.fromDocument(
            new Document("_id", id)
                .append("email", "it-" + id + "@exemplo.test")
                .append(
                    "profile",
                    new Document("trainingGoal", "hipertrofia")
                        .append("trainingExperience", "de_1_a_2_anos")
                        .append("recentFrequency", "semanal_3_4")
                        .append("availableDays", 4)
                        .append("preferredSessionMinutes", 60)));
    Map<String, Object> corpo = new LinkedHashMap<>();
    Map<String, Object> perfil = new LinkedHashMap<>();
    perfil.put("trainingGoal", "hipertrofia");
    perfil.put("trainingExperience", "de_1_a_2_anos");
    perfil.put("recentFrequency", "semanal_3_4");
    perfil.put("availableDays", 4);
    perfil.put("preferredSessionMinutes", 60);
    corpo.put("perfil", perfil);
    Map<String, Object> previa = servico.previa(usuario, corpo);
    assertEquals(0, rotinas.countDocuments(), "Prévia não grava");

    corpo.put("assinaturaPrevia", previa.get("assinatura"));
    Map<String, Object> primeira = servico.salvar(usuario, corpo);
    Map<String, Object> segunda = servico.salvar(usuario, corpo);
    assertEquals(true, primeira.get("criada"));
    assertEquals(false, segunda.get("criada"));
    assertEquals(1, rotinas.countDocuments());

    Document salva = repositorio.ativa(id);
    assertEquals(previa.get("assinatura"), salva.get("assinatura"));
    assertNotNull(salva.get("sessoes"));

    ExecutorService pool = Executors.newFixedThreadPool(6);
    CountDownLatch largada = new CountDownLatch(1);
    List<Future<Map<String, Object>>> futuros = new ArrayList<>();
    for (int i = 0; i < 6; i++) {
      futuros.add(
          pool.submit(
              () -> {
                largada.await();
                return servico.iniciar(usuario, "A");
              }));
    }
    largada.countDown();
    Set<Object> ids = new HashSet<>();
    for (Future<Map<String, Object>> futuro : futuros) {
      ids.add(futuro.get(30, TimeUnit.SECONDS).get("treinoId"));
    }
    pool.shutdown();
    assertEquals(1, ids.size());
    assertEquals(1, treinos.countDocuments(Filters.eq("user", id)));

    Map<String, Object> consulta = servico.consultar(usuario);
    @SuppressWarnings("unchecked")
    Map<String, Object> estado = (Map<String, Object>) consulta.get("estado");
    assertEquals("A", estado.get("proxima"));
    assertEquals(1, rotinas.countDocuments());
  }
}
