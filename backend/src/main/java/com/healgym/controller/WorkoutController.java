package com.healgym.controller;

import com.healgym.model.User;
import com.healgym.repository.ExecutionRepository;
import com.healgym.repository.WorkoutRepository;
import com.healgym.security.AuthService;
import com.healgym.service.CoberturaMuscular;
import com.healgym.service.ExecucaoRegras;
import com.healgym.service.ExerciseDatabase;
import com.healgym.service.SessionPlanner;
import com.healgym.service.WorkoutGenerator;
import com.healgym.util.Js;
import com.healgym.util.Json;
import com.healgym.web.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workouts")
public class WorkoutController extends BaseController {

  private static final Pattern EXERCICIO_ID = Pattern.compile("^[a-z0-9-]{1,90}$");
  private static final Pattern UID = Pattern.compile("^[a-zA-Z0-9-]{1,40}$");

  private final AuthService auth;
  private final WorkoutRepository workouts;
  private final ExecutionRepository execucoes;

  public WorkoutController(AuthService auth, WorkoutRepository workouts, ExecutionRepository execucoes) {
    this.auth = auth;
    this.workouts = workouts;
    this.execucoes = execucoes;
  }

  private ApiException message(int status, String message) {
    return new ApiException(status, Json.obj("message", message));
  }

  private ApiException failure(String message, Exception cause) {
    return new ApiException(500, Json.obj("message", message, "error", cause.getMessage()));
  }

  private static String nivel(User user) {
    return user.getProfile() == null ? null : user.getProfile().fitnessLevel;
  }

  private static List<String> objetivos(User user) {
    return user.getProfile() == null ? null : user.getProfile().goals;
  }

  private static int seed(User user) {
    return user.getId() == null ? 0 : user.getId().hashCode();
  }

  @SuppressWarnings("unchecked")
  private static List<Map<String, Object>> itens(Document workout) {
    Object lista = workout.get("exercicios");
    if (!(lista instanceof List)) {
      return new ArrayList<>();
    }
    List<Map<String, Object>> itens = new ArrayList<>();
    for (Object item : (List<Object>) lista) {
      if (item instanceof Map) {
        itens.add((Map<String, Object>) item);
      }
    }
    return itens;
  }

  private Document treinoDoUsuario(String id, User user) {
    Document workout = workouts.findOwned(id, user.getId());
    if (workout == null) {
      throw message(404, "Treino não encontrado");
    }
    return workout;
  }

  private static double tempoDe(Document workout) {
    Object tempo = workout.get("tempoDisponivel");
    return tempo instanceof Number ? ((Number) tempo).doubleValue() : 60;
  }

  @PostMapping("/generate")
  public ResponseEntity<Object> generate(HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      Map<String, Object> body = body(request);
      Object tempoBruto = body.get("tempoDisponivel");

      double tempoDisponivel = Js.toNumber(tempoBruto);
      if (!Js.truthy(tempoBruto) || tempoDisponivel < 30 || tempoDisponivel > 120) {
        throw message(400, "Tempo disponível deve estar entre 30 e 120 minutos");
      }

      WorkoutGenerator.Resolved resolved = WorkoutGenerator.resolveGrupamentoGeracao(body);
      if (resolved.error != null) {
        throw message(400, resolved.error);
      }

      String grupamento = resolved.grupamento;
      String letraTreino = resolved.letra;

      if (!WorkoutGenerator.WORKOUT_GROUPS.contains(grupamento)) {
        throw message(400, "Grupamento muscular inválido");
      }

      if (Double.isNaN(tempoDisponivel)) {
        throw new IllegalArgumentException(
            "Workout validation failed: tempoDisponivel: Cast to Number failed for value "
                + "\""
                + Js.toStr(tempoBruto)
                + "\" (type "
                + (tempoBruto instanceof String ? "string" : "object")
                + ") at path \"tempoDisponivel\"");
      }

      int variante = 0;
      if ("FULL_BODY".equals(grupamento)) {
        int anteriores = 0;
        for (Document anterior : workouts.findByUser(user.getId(), 200)) {
          if ("FULL_BODY".equals(anterior.get("grupamento"))) {
            anteriores++;
          }
        }
        variante = anteriores % 2;
      }

      WorkoutGenerator.Metadata metadata = WorkoutGenerator.gerarMetadados(grupamento, letraTreino);
      String modo = WorkoutGenerator.modoObjetivo(objetivos(user));
      WorkoutGenerator.Session session =
          WorkoutGenerator.montar(
              grupamento, tempoDisponivel, nivel(user), objetivos(user), seed(user), variante);
      String titulo =
          "FULL_BODY".equals(grupamento)
              ? metadata.titulo + " — Sessão " + (variante + 1)
              : metadata.titulo;
      Object tipoDivisao = body.get("tipoDivisao");

      Date now = new Date();
      Document workout =
          new Document("_id", new ObjectId())
              .append("user", user.getId())
              .append("titulo", titulo)
              .append("grupamento", grupamento)
              .append("objetivo", WorkoutGenerator.rotuloModo(modo) + ". " + metadata.objetivo)
              .append("modo", modo)
              .append("tipoDivisao", WorkoutGenerator.DIVISOES.contains(tipoDivisao) ? tipoDivisao : null)
              .append("letraTreino", letraTreino)
              .append("variante", "FULL_BODY".equals(grupamento) ? variante + 1 : null)
              .append("tempoDisponivel", tempoDisponivel)
              .append("duracaoEstimadaMinutos", session.duracaoEstimadaMinutos)
              .append(
                  "duracaoObservacao",
                  "Estimativa. A duração real depende do ritmo de execução.")
              .append("exercicios", new ArrayList<Object>(session.exercicios))
              .append("resumo", session.resumo)
              .append("cobertura", session.cobertura)
              .append("observacoes", session.observacoes)
              .append("realizado", false)
              .append("createdAt", now)
              .append("updatedAt", now)
              .append("__v", 0);

      workouts.insert(workout);

      return json(201, Json.obj("success", true, "data", workout));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao gerar treino: " + e);
      throw failure("Erro ao gerar treino", e);
    }
  }

  @GetMapping("/my-workouts")
  public ResponseEntity<Object> myWorkouts(
      @RequestParam(value = "de", required = false) String de,
      @RequestParam(value = "ate", required = false) String ate,
      HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      if (periodoAusente(de) && periodoAusente(ate)) {
        List<Document> found = workouts.findByUser(user.getId(), 50);

        return ok(
            Json.obj("success", true, "count", found.size(), "data", new ArrayList<Object>(found)));
      }
      if (periodoAusente(de) || periodoAusente(ate)) {
        throw message(400, "Informe o início e o fim do período");
      }

      Date inicio;
      Date fim;
      try {
        inicio = Date.from(Instant.parse(de));
        fim = Date.from(Instant.parse(ate));
      } catch (DateTimeParseException e) {
        throw message(400, "Período inválido");
      }
      long amplitude = fim.getTime() - inicio.getTime();
      if (amplitude <= 0 || amplitude > 40L * 24 * 60 * 60 * 1000) {
        throw message(400, "Período inválido");
      }

      int limite = 200;
      List<Document> found = workouts.findRealizadosEntre(user.getId(), inicio, fim, limite);
      return ok(
          Json.obj(
              "success",
              true,
              "count",
              found.size(),
              "truncado",
              found.size() == limite,
              "data",
              new ArrayList<Object>(found)));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao buscar treinos: " + e);
      throw failure("Erro ao buscar treinos", e);
    }
  }

  private static boolean periodoAusente(String valor) {
    return valor == null || valor.isBlank();
  }

  @GetMapping("/progresso")
  public ResponseEntity<Object> progresso(
      @RequestParam(value = "exercicios", required = false) String exercicios,
      @RequestParam(value = "excluir", required = false) String excluir,
      HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      if (exercicios == null || exercicios.isEmpty()) {
        throw message(400, "Informe os exercícios");
      }
      String[] ids = exercicios.split(",");
      if (ids.length > 20) {
        throw message(400, "Exercícios demais na consulta");
      }
      ObjectId ignorar = null;
      if (excluir != null && !excluir.isEmpty()) {
        if (!ObjectId.isValid(excluir)) {
          throw message(400, "Treino inválido");
        }
        ignorar = new ObjectId(excluir);
      }
      List<Document> recentes = execucoes.recentes(user.getId(), ignorar, 60);
      Map<String, Object> dados = new LinkedHashMap<>();
      for (String id : ids) {
        String limpo = id.trim();
        if (!EXERCICIO_ID.matcher(limpo).matches()) {
          throw message(400, "Exercício inválido");
        }
        ExerciseDatabase.Exercise exercicio = ExerciseDatabase.porId(limpo);
        dados.put(
            limpo,
            ExecucaoRegras.progresso(limpo, exercicio == null ? null : exercicio.nome, recentes, 5));
      }
      return ok(Json.obj("success", true, "data", dados));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao buscar progresso: " + e);
      throw failure("Erro ao buscar progresso", e);
    }
  }

  @GetMapping("/{id}")
  public ResponseEntity<Object> get(@PathVariable("id") String id, HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      Document workout = treinoDoUsuario(id, user);
      return ok(Json.obj("success", true, "data", workout));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao buscar treino: " + e);
      throw failure("Erro ao buscar treino", e);
    }
  }

  @GetMapping("/{id}/execucao")
  public ResponseEntity<Object> execucao(@PathVariable("id") String id, HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      Document workout = treinoDoUsuario(id, user);
      Document execucao = execucoes.find(user.getId(), workout.getObjectId("_id"));
      return ok(Json.obj("success", true, "data", execucao));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao buscar execução: " + e);
      throw failure("Erro ao buscar execução do treino", e);
    }
  }

  @PutMapping("/{id}/execucao")
  public ResponseEntity<Object> salvarExecucao(@PathVariable("id") String id, HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      Document workout = treinoDoUsuario(id, user);
      if (Boolean.TRUE.equals(workout.get("realizado"))) {
        throw message(409, "Este treino já foi concluído e não aceita novos registros");
      }
      Map<String, Object> body = body(request);
      Date agora = new Date();
      ObjectId workoutId = workout.getObjectId("_id");
      Document execucao = execucoes.find(user.getId(), workoutId);
      if (execucao == null) {
        execucao =
            new Document("user", user.getId())
                .append("workout", workoutId)
                .append("status", "em_andamento")
                .append("iniciadoEm", agora)
                .append("tempoAcumuladoSegundos", 0)
                .append("exercicios", new ArrayList<>())
                .append("createdAt", agora);
      }
      try {
        List<Document> mescladas =
            ExecucaoRegras.mesclar(
                itens(workout), body.get("exercicios"), ExecucaoRegras.entradas(execucao), agora);
        execucao.put("exercicios", mescladas);
        if (body.containsKey("tempoAcumuladoSegundos")) {
          Integer tempo =
              ExecucaoRegras.inteiro(
                  body.get("tempoAcumuladoSegundos"), ExecucaoRegras.MAX_SEGUNDOS, "Tempo");
          execucao.put("tempoAcumuladoSegundos", tempo == null ? 0 : tempo);
        }
      } catch (ExecucaoRegras.Invalido e) {
        throw message(400, e.getMessage());
      }
      execucao.put("updatedAt", agora);
      execucoes.save(execucao);
      return ok(Json.obj("success", true, "data", execucao));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao salvar execução: " + e);
      throw failure("Erro ao salvar registro do treino", e);
    }
  }

  private static Date instante(Object valor) {
    if (!(valor instanceof String) || ((String) valor).isEmpty()) {
      return null;
    }
    try {
      return Date.from(Instant.parse((String) valor));
    } catch (DateTimeParseException e) {
      throw new ExecucaoRegras.Invalido("Data inválida");
    }
  }

  private Document sessaoDe(Document workout, User user, Date agora) {
    Document execucao = execucoes.find(user.getId(), workout.getObjectId("_id"));
    if (execucao != null) {
      return execucao;
    }
    return new Document("user", user.getId())
        .append("workout", workout.getObjectId("_id"))
        .append("status", "pausado")
        .append("tempoAcumuladoSegundos", 0)
        .append("exercicios", new ArrayList<>())
        .append("pulados", new ArrayList<>())
        .append("createdAt", agora)
        .append("updatedAt", agora);
  }

  @PostMapping("/{id}/execucao/controle")
  public ResponseEntity<Object> controlarExecucao(@PathVariable("id") String id, HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      Document workout = treinoDoUsuario(id, user);
      if (Boolean.TRUE.equals(workout.get("realizado"))) {
        throw message(409, "Este treino já foi concluído");
      }
      Map<String, Object> body = body(request);
      Object acao = body.get("acao");
      if (!(acao instanceof String)) {
        throw message(400, "Informe a ação da sessão");
      }
      Date agora = new Date();
      Document execucao = sessaoDe(workout, user, agora);
      boolean aplicado = true;
      try {
        switch ((String) acao) {
          case "iniciar":
            aplicado = ExecucaoRegras.iniciar(execucao, agora);
            break;
          case "pausar":
            aplicado = ExecucaoRegras.pausar(execucao, instante(body.get("vistoEm")), agora);
            break;
          case "retomar":
            aplicado = ExecucaoRegras.retomar(execucao, agora);
            break;
          case "descanso":
            Integer segundos = ExecucaoRegras.inteiro(body.get("descansoSegundos"), 600, "Descanso");
            Integer serie = ExecucaoRegras.inteiro(body.get("descansoSerie"), ExecucaoRegras.MAX_SERIES, "Série");
            Object uid = body.get("descansoUid");
            Object rotulo = body.get("descansoRotulo");
            if (segundos == null || serie == null || !(uid instanceof String) || !UID.matcher((String) uid).matches()) {
              throw new ExecucaoRegras.Invalido("Descanso inválido");
            }
            if (localizar(itens(workout), (String) uid) == null) {
              throw new ExecucaoRegras.Invalido("Exercício não pertence a este treino");
            }
            String texto = rotulo instanceof String ? ((String) rotulo).trim() : "";
            if (texto.length() > 160) {
              texto = texto.substring(0, 160);
            }
            aplicado = ExecucaoRegras.iniciarDescanso(execucao, segundos, texto, (String) uid, serie, agora);
            break;
          case "pular_descanso":
            ExecucaoRegras.pularDescanso(execucao, agora);
            break;
          case "posicao":
            Object uidAtual = body.get("exercicioAtualUid");
            Integer serieAtual = ExecucaoRegras.inteiro(body.get("serieAtual"), ExecucaoRegras.MAX_SERIES, "Série");
            if (uidAtual != null && (!(uidAtual instanceof String) || !UID.matcher((String) uidAtual).matches() || localizar(itens(workout), (String) uidAtual) == null)) {
              throw new ExecucaoRegras.Invalido("Exercício não pertence a este treino");
            }
            List<String> pulados = new ArrayList<>();
            Object lista = body.get("pulados");
            if (lista instanceof List) {
              for (Object item : (List<?>) lista) {
                if (!(item instanceof String) || !UID.matcher((String) item).matches() || localizar(itens(workout), (String) item) == null) {
                  throw new ExecucaoRegras.Invalido("Exercício pulado inválido");
                }
                if (!pulados.contains(item)) {
                  pulados.add((String) item);
                }
              }
            }
            ExecucaoRegras.definirPosicao(
                execucao,
                uidAtual instanceof String ? (String) uidAtual : null,
                serieAtual,
                lista instanceof List ? pulados : null,
                agora);
            break;
          default:
            throw new ExecucaoRegras.Invalido("Ação inválida");
        }
      } catch (ExecucaoRegras.Invalido e) {
        throw message(400, e.getMessage());
      }
      execucoes.save(execucao);
      return ok(Json.obj("success", true, "aplicado", aplicado, "data", execucao, "agora", agora));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao controlar execução: " + e);
      throw failure("Erro ao controlar a sessão de treino", e);
    }
  }

  @PatchMapping("/{id}/complete")
  public ResponseEntity<Object> complete(@PathVariable("id") String id, HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      Document workout = treinoDoUsuario(id, user);
      if (Boolean.TRUE.equals(workout.get("realizado"))) {
        return ok(Json.obj("success", true, "data", workout));
      }
      Integer duracao;
      try {
        duracao =
            ExecucaoRegras.inteiro(
                body(request).get("duracaoRealSegundos"), ExecucaoRegras.MAX_SEGUNDOS, "Duração");
      } catch (ExecucaoRegras.Invalido e) {
        throw message(400, e.getMessage());
      }

      Date now = new Date();
      Document execucao = execucoes.find(user.getId(), workout.getObjectId("_id"));
      if (execucao != null && ExecucaoRegras.encerrar(execucao, duracao, now)) {
        execucoes.save(execucao);
        if (duracao == null && execucao.get("duracaoRealSegundos") instanceof Number) {
          duracao = ((Number) execucao.get("duracaoRealSegundos")).intValue();
        }
      }
      workout.put("realizado", true);
      workout.put("dataRealizacao", now);
      if (duracao != null) {
        workout.put("duracaoRealSegundos", duracao);
      }
      workout.put("updatedAt", now);
      workouts.replace(workout);

      return ok(Json.obj("success", true, "data", workout));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao marcar treino como realizado: " + e);
      throw failure("Erro ao marcar treino como realizado", e);
    }
  }

  private static Map<String, Object> localizar(List<Map<String, Object>> itens, String uid) {
    for (int i = 0; i < itens.size(); i++) {
      if (uid.equals(ExecucaoRegras.uidDe(itens.get(i), i))) {
        return itens.get(i);
      }
    }
    return null;
  }

  private static void completarPadrao(Map<String, Object> item) {
    if (item.get("padrao") instanceof String) {
      return;
    }
    ExerciseDatabase.Exercise exercicio = ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
    if (exercicio != null) {
      item.put("padrao", exercicio.padrao);
    }
  }

  @GetMapping("/{id}/exercicios/{uid}/alternativas")
  public ResponseEntity<Object> alternativas(
      @PathVariable("id") String id, @PathVariable("uid") String uid, HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      if (!UID.matcher(uid).matches()) {
        throw message(400, "Exercício inválido");
      }
      Document workout = treinoDoUsuario(id, user);
      List<Map<String, Object>> itens = itens(workout);
      Map<String, Object> atual = localizar(itens, uid);
      if (atual == null) {
        throw message(404, "Exercício não encontrado neste treino");
      }
      completarPadrao(atual);
      List<Map<String, Object>> opcoes =
          SessionPlanner.alternativas(
              atual,
              itens,
              tempoDe(workout),
              WorkoutGenerator.nivelRank(nivel(user)),
              WorkoutGenerator.modoObjetivo(objetivos(user)));
      boolean executado =
          ExecucaoRegras.temSerieConcluida(execucoes.find(user.getId(), workout.getObjectId("_id")), uid);
      return ok(Json.obj("success", true, "data", opcoes, "temSeriesConcluidas", executado));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao buscar alternativas: " + e);
      throw failure("Erro ao buscar alternativas", e);
    }
  }

  @PostMapping("/{id}/exercicios/{uid}/trocar")
  public ResponseEntity<Object> trocar(
      @PathVariable("id") String id, @PathVariable("uid") String uid, HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      if (!UID.matcher(uid).matches()) {
        throw message(400, "Exercício inválido");
      }
      Document workout = treinoDoUsuario(id, user);
      if (Boolean.TRUE.equals(workout.get("realizado"))) {
        throw message(409, "Não é possível trocar exercícios de um treino concluído");
      }
      Map<String, Object> body = body(request);
      Object novoId = body.get("exercicioId");
      if (!(novoId instanceof String) || !EXERCICIO_ID.matcher((String) novoId).matches()) {
        throw message(400, "Informe o exercício substituto");
      }
      List<Map<String, Object>> itens = itens(workout);
      Map<String, Object> atual = localizar(itens, uid);
      if (atual == null) {
        throw message(404, "Exercício não encontrado neste treino");
      }
      completarPadrao(atual);
      ObjectId workoutId = workout.getObjectId("_id");
      boolean executado = ExecucaoRegras.temSerieConcluida(execucoes.find(user.getId(), workoutId), uid);
      if (executado && !Boolean.TRUE.equals(body.get("confirmar"))) {
        throw new ApiException(
            409,
            Json.obj(
                "message",
                "Este exercício já tem séries concluídas. Confirme para substituir; os registros feitos serão mantidos no histórico.",
                "requerConfirmacao",
                true));
      }
      int experiencia = WorkoutGenerator.nivelRank(nivel(user));
      String modo = WorkoutGenerator.modoObjetivo(objetivos(user));
      double tempo = tempoDe(workout);
      Map<String, Object> escolhida = null;
      for (Map<String, Object> opcao : SessionPlanner.alternativas(atual, itens, tempo, experiencia, modo)) {
        if (novoId.equals(opcao.get("exercicioId"))) {
          escolhida = opcao;
        }
      }
      ExerciseDatabase.Exercise exercicio = ExerciseDatabase.porId((String) novoId);
      if (escolhida == null || exercicio == null) {
        throw message(400, "Exercício substituto não é equivalente a este");
      }
      Map<String, Object> novo = SessionPlanner.substituto(atual, exercicio, experiencia, modo);
      novo.put("series", escolhida.get("series"));
      List<Object> atualizados = new ArrayList<>();
      for (Map<String, Object> item : itens) {
        atualizados.add(item == atual ? novo : item);
      }
      List<Map<String, Object>> comoMapa = new ArrayList<>();
      for (Object item : atualizados) {
        @SuppressWarnings("unchecked")
        Map<String, Object> mapa = (Map<String, Object>) item;
        comoMapa.add(mapa);
      }
      Date now = new Date();
      Object historicoBruto = workout.get("substituicoes");
      List<Object> historico = historicoBruto instanceof List ? new ArrayList<>((List<?>) historicoBruto) : new ArrayList<>();
      historico.add(
          new Document("uidAnterior", uid)
              .append("exercicioAnterior", atual.get("exercicioId"))
              .append("nomeAnterior", atual.get("nome"))
              .append("uidNovo", novo.get("uid"))
              .append("exercicioNovo", novo.get("exercicioId"))
              .append("nomeNovo", novo.get("nome"))
              .append("data", now));
      String grupamento = String.valueOf(workout.get("grupamento"));
      workout.put("exercicios", atualizados);
      workout.put("substituicoes", historico);
      workout.put(
          "duracaoEstimadaMinutos",
          Math.max(1, (int) Math.round(WorkoutGenerator.estimarSegundos(comoMapa, tempo) / 60.0)));
      workout.put("cobertura", CoberturaMuscular.calcular(grupamento, comoMapa));
      workout.put("resumo", CoberturaMuscular.resumo(grupamento, comoMapa));
      workout.put("updatedAt", now);
      workouts.replace(workout);
      return ok(Json.obj("success", true, "data", workout));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao trocar exercício: " + e);
      throw failure("Erro ao trocar exercício", e);
    }
  }

  @GetMapping("/{id}/ciclo")
  public ResponseEntity<Object> ciclo(@PathVariable("id") String id, HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      Document workout = treinoDoUsuario(id, user);
      Object tipo = workout.get("tipoDivisao");
      if (!"ABC".equals(tipo) && !"ABCD".equals(tipo)) {
        throw message(400, "A visão do ciclo está disponível para treinos ABC e ABCD");
      }
      Map<String, Object> ciclo =
          WorkoutGenerator.ciclo(
              (String) tipo,
              workout.getString("letraTreino"),
              itens(workout),
              tempoDe(workout),
              nivel(user),
              objetivos(user),
              seed(user));
      return ok(Json.obj("success", true, "data", ciclo));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao montar ciclo: " + e);
      throw failure("Erro ao montar visão do ciclo", e);
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Object> delete(@PathVariable("id") String id, HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      Document workout = treinoDoUsuario(id, user);

      workouts.deleteDocument(workout.getObjectId("_id"));
      execucoes.deleteByWorkout(user.getId(), workout.getObjectId("_id"));

      return ok(Json.obj("success", true, "message", "Treino deletado com sucesso"));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao deletar treino: " + e);
      throw failure("Erro ao deletar treino", e);
    }
  }

  @DeleteMapping("")
  public ResponseEntity<Object> clear(HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      workouts.deleteAllByUser(user.getId());
      execucoes.deleteAllByUser(user.getId());

      return ok(Json.obj("success", true, "message", "Histórico de treinos limpo com sucesso"));
    } catch (Exception e) {
      System.err.println("Erro ao limpar histórico: " + e);
      throw failure("Erro ao limpar histórico de treinos", e);
    }
  }
}
