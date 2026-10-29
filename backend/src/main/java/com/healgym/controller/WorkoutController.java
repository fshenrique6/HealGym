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
  public ResponseEntity<Object> myWorkouts(HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      List<Document> found = workouts.findByUser(user.getId(), 50);

      return ok(
          Json.obj("success", true, "count", found.size(), "data", new ArrayList<Object>(found)));
    } catch (Exception e) {
      System.err.println("Erro ao buscar treinos: " + e);
      throw failure("Erro ao buscar treinos", e);
    }
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


