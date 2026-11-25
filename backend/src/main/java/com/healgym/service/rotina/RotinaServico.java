package com.healgym.service.rotina;

import com.healgym.model.User;
import com.healgym.service.CoberturaMuscular;
import com.healgym.service.ExecucaoRegras;
import com.healgym.service.ExerciseAnatomy;
import com.healgym.service.ExerciseDatabase;
import com.healgym.util.Json;
import com.healgym.validation.TrainingProfile;
import com.healgym.validation.Validator;
import com.healgym.web.ApiException;
import java.text.Collator;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.Objects;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import org.bson.Document;
import org.bson.types.ObjectId;

/**
 * Regras de persistência das rotinas.
 *
 * <ul>
 *   <li>Leitura e prévia não gravam nada.
 *   <li>Salvar é idempotente: a mesma proposta (mesma assinatura) não cria outra versão.
 *   <li>Versões anteriores nunca são apagadas; treinos concluídos e em andamento são preservados.
 *   <li>Trocar uma rotina com treinos em andamento exige confirmação explícita.
 *   <li>Concorrência: versão única por usuário e revisão condicional para edições.
 * </ul>
 */
public final class RotinaServico {

  public static final long JANELA_HISTORICO_MS = 28L * 24 * 60 * 60 * 1000;
  static final String DURACAO_OBSERVACAO = "Estimativa. A duração real depende do ritmo de execução.";
  private static final Pattern CODIGO_SESSAO = Pattern.compile("^[A-F]$");
  private static final String[] CAMPOS_PERFIL = {
    TrainingProfile.GOAL,
    TrainingProfile.EXPERIENCE,
    TrainingProfile.FREQUENCY,
    TrainingProfile.DAYS,
    TrainingProfile.MINUTES
  };
  private static final Map<String, String> ROTULOS_PERFIL = new LinkedHashMap<>();

  static {
    ROTULOS_PERFIL.put(TrainingProfile.GOAL, "objetivo");
    ROTULOS_PERFIL.put(TrainingProfile.EXPERIENCE, "experiência");
    ROTULOS_PERFIL.put(TrainingProfile.FREQUENCY, "frequência recente");
    ROTULOS_PERFIL.put(TrainingProfile.DAYS, "dias disponíveis");
    ROTULOS_PERFIL.put(TrainingProfile.MINUTES, "duração da sessão");
  }

  private final RotinaArmazem armazem;
  private final Supplier<Date> relogio;

  public RotinaServico(RotinaArmazem armazem) {
    this(armazem, Date::new);
  }

  public RotinaServico(RotinaArmazem armazem, Supplier<Date> relogio) {
    this.armazem = armazem;
    this.relogio = relogio;
  }

  static ApiException erro(int status, String mensagem) {
    return new ApiException(status, Json.obj("message", mensagem));
  }

  static ApiException conflito(String codigo, String mensagem, Object... extras) {
    Map<String, Object> corpo = Json.obj("message", mensagem, "codigo", codigo);
    corpo.putAll(Json.obj(extras));
    return new ApiException(409, corpo);
  }

  static int seed(User usuario) {
    return usuario.getId() == null ? 0 : usuario.getId().hashCode();
  }

  static int numero(Object valor) {
    return valor instanceof Number ? ((Number) valor).intValue() : 0;
  }

  /** Dados de entrada lidos e validados de uma requisição de prévia ou salvamento. */
  static final class Entrada {
    final Map<String, Object> perfilCampos;
    final PreferenciasTreino preferencias;
    final PerfilInterpretado perfil;
    final MotorRotina.Pedido pedido;

    Entrada(
        Map<String, Object> perfilCampos,
        PreferenciasTreino preferencias,
        PerfilInterpretado perfil,
        MotorRotina.Pedido pedido) {
      this.perfilCampos = perfilCampos;
      this.preferencias = preferencias;
      this.perfil = perfil;
      this.pedido = pedido;
    }
  }

  static Map<String, Object> camposDeTreino(User.Profile perfil) {
    Map<String, Object> campos = new LinkedHashMap<>();
    campos.put(TrainingProfile.GOAL, perfil == null ? null : perfil.trainingGoal);
    campos.put(TrainingProfile.EXPERIENCE, perfil == null ? null : perfil.trainingExperience);
    campos.put(TrainingProfile.FREQUENCY, perfil == null ? null : perfil.recentFrequency);
    campos.put(TrainingProfile.DAYS, perfil == null ? null : perfil.availableDays);
    campos.put(TrainingProfile.MINUTES, perfil == null ? null : perfil.preferredSessionMinutes);
    return campos;
  }

  int concluidosRecentes(ObjectId usuario) {
    long total =
        armazem.concluidosVerificados(usuario, new Date(relogio.get().getTime() - JANELA_HISTORICO_MS));
    return (int) Math.min(Integer.MAX_VALUE, Math.max(0, total));
  }

  Entrada ler(User usuario, Map<String, Object> corpo) {
    Object perfilBruto = corpo.get("perfil");
    if (!(perfilBruto instanceof Map)) {
      throw erro(400, "Informe os dados de treino do perfil.");
    }
    @SuppressWarnings("unchecked")
    Map<String, Object> perfilMapa = (Map<String, Object>) perfilBruto;
    Validator validator = new Validator(perfilMapa);
    TrainingProfile.validate(validator, true);
    if (validator.hasErrors()) {
      throw new ApiException(
          400, Json.obj("message", "Revise os dados de treino.", "details", validator.errors()));
    }
    User.Profile original = usuario.getProfile() == null ? new User.Profile() : usuario.getProfile();
    User.Profile copia = User.Profile.fromDocument(original.toDocument());
    TrainingProfile.apply(copia, perfilMapa);
    List<String> erros = new ArrayList<>();
    PreferenciasTreino preferencias = PreferenciasTreino.ler(corpo.get("preferencias"), erros);
    if (!erros.isEmpty()) {
      throw erro(400, erros.get(0));
    }
    PerfilInterpretado perfil =
        PerfilInterpretado.interpretar(copia, preferencias, concluidosRecentes(usuario.getId()));
    try {
      MotorRotina.Pedido pedido = MotorRotina.lerPedido(corpo, perfil, seed(usuario));
      pedido.manterEstruturaSalva = estruturaJaSalva(usuario.getId(), pedido.estrategia);
      return new Entrada(camposDeTreino(copia), preferencias, perfil, pedido);
    } catch (MotorRotina.Invalido e) {
      throw erro(400, e.getMessage());
    }
  }

  /** O cliente não escolhe esta permissão. Ela só existe quando a rotina ativa já usa o código. */
  private boolean estruturaJaSalva(ObjectId usuario, String estrategia) {
    if (estrategia == null) {
      return false;
    }
    Document ativa = armazem.ativa(usuario);
    Object guardada = ativa == null ? null : ativa.get("estrategia");
    return guardada instanceof Map && estrategia.equals(((Map<?, ?>) guardada).get("codigo"));
  }

  static MotorRotina.Proposta gerar(Entrada entrada) {
    try {
      return MotorRotina.gerar(entrada.pedido);
    } catch (MotorRotina.Invalido e) {
      throw erro(400, e.getMessage());
    }
  }

  // ---------------------------------------------------------------- opções

  private static final Map<String, String> GRUPOS_CATALOGO = new LinkedHashMap<>();

  static {
    GRUPOS_CATALOGO.put("PEITO", "Peito");
    GRUPOS_CATALOGO.put("COSTAS", "Costas");
    GRUPOS_CATALOGO.put("OMBROS", "Ombros");
    GRUPOS_CATALOGO.put("TRICEPS", "Tríceps");
    GRUPOS_CATALOGO.put("BICEPS", "Bíceps");
    GRUPOS_CATALOGO.put("PERNAS", "Pernas");
    GRUPOS_CATALOGO.put("CORE", "Core");
  }

  private static List<Map<String, Object>> rotulos(Map<String, String> valores) {
    List<Map<String, Object>> lista = new ArrayList<>();
    for (Map.Entry<String, String> valor : valores.entrySet()) {
      lista.add(Json.obj("id", valor.getKey(), "rotulo", valor.getValue()));
    }
    return lista;
  }

  /** Valores aceitos pelo assistente de criação, vindos das mesmas tabelas da validação. */
  public static Map<String, Object> opcoes() {
    List<Map<String, Object>> limitacoes = new ArrayList<>();
    for (Map.Entry<String, String> limitacao : PreferenciasTreino.LIMITACOES.entrySet()) {
      limitacoes.add(
          Json.obj(
              "id", limitacao.getKey(),
              "rotulo", limitacao.getValue(),
              "detalhe", PreferenciasTreino.LIMITACOES_DETALHE.get(limitacao.getKey())));
    }
    List<String> ordemGrupos = new ArrayList<>(GRUPOS_CATALOGO.keySet());
    Collator collator = Collator.getInstance(new Locale("pt", "BR"));
    List<ExerciseDatabase.Exercise> ativos = ExerciseDatabase.ativos();
    ativos.sort(
        Comparator.comparingInt(
                (ExerciseDatabase.Exercise e) -> {
                  int indice = ordemGrupos.indexOf(e.grupo);
                  return indice < 0 ? ordemGrupos.size() : indice;
                })
            .thenComparing(e -> e.nome, collator));
    List<Map<String, Object>> exercicios = new ArrayList<>();
    for (ExerciseDatabase.Exercise e : ativos) {
      exercicios.add(
          Json.obj(
              "id", e.id,
              "nome", e.nome,
              "grupo", e.grupo,
              "grupoRotulo", GRUPOS_CATALOGO.getOrDefault(e.grupo, e.grupo),
              "padraoRotulo", ExerciseAnatomy.rotuloPadrao(e.padrao)));
    }
    Map<String, Object> resposta = new LinkedHashMap<>();
    resposta.put("equipamentos", rotulos(PreferenciasTreino.EQUIPAMENTOS));
    resposta.put("preferenciasEquipamento", rotulos(PreferenciasTreino.PREFERENCIAS));
    resposta.put("limitacoes", limitacoes);
    resposta.put("prioridades", rotulos(PreferenciasTreino.PRIORIDADES));
    resposta.put("exercicios", exercicios);
    resposta.put(
        "limites",
        Json.obj(
            "maxEvitar", PreferenciasTreino.MAX_EVITAR,
            "maxPrioridades", PreferenciasTreino.MAX_PRIORIDADES,
            "maxAjustes", MotorRotina.MAX_AJUSTES,
            "maxVariacao", MotorRotina.MAX_VARIACAO,
            "minutos", new ArrayList<>(TrainingProfile.SESSION_MINUTES)));
    return resposta;
  }

  // ---------------------------------------------------------------- leitura

  /** Rotina ativa, estado do ciclo e se o perfil mudou desde a criação. Não grava nada. */
  public Map<String, Object> consultar(User usuario) {
    ObjectId id = usuario.getId();
    Document ativa = armazem.ativa(id);
    Map<String, Object> resposta = new LinkedHashMap<>();
    if (ativa == null) {
      resposta.put(
          "perfil",
          PerfilInterpretado.interpretar(
                  usuario.getProfile(), PreferenciasTreino.padrao(), concluidosRecentes(id))
              .resumo());
      return resposta;
    }
    List<Document> instancias = armazem.instancias(id, ativa.getObjectId("_id"));
    List<ObjectId> abertas = new ArrayList<>();
    for (Document treino : instancias) {
      if (!Boolean.TRUE.equals(treino.get("realizado"))) {
        abertas.add(treino.getObjectId("_id"));
      }
    }
    resposta.put("rotina", ativa);
    resposta.put("estado", CicloRotina.calcular(ativa, instancias, armazem.execucoes(id, abertas)));
    List<String> mudancas = mudancasDePerfil(ativa, usuario.getProfile());
    resposta.put("desatualizada", !mudancas.isEmpty());
    resposta.put("mudancasPerfil", mudancas);
    String reavaliacao = motivoReavaliacao(ativa, relogio.get());
    if (reavaliacao != null) {
      resposta.put("reavaliacao", reavaliacao);
    }
    return resposta;
  }

  /** Oito semanas na mesma programação. A troca só acontece se a pessoa confirmar. */
  static final long REAVALIACAO_MS = 56L * 24 * 60 * 60 * 1000;

  static String motivoReavaliacao(Document rotina, Date agora) {
    Object criada = rotina.get("createdAt");
    if (!(criada instanceof Date) || agora == null) {
      return null;
    }
    if (agora.getTime() - ((Date) criada).getTime() < REAVALIACAO_MS) {
      return null;
    }
    return "Esta programação já tem várias semanas. Se ficou fácil ou a sua frequência mudou, monte uma nova. A atual só muda se você confirmar.";
  }

  static List<String> mudancasDePerfil(Document rotina, User.Profile perfil) {
    List<String> mudancas = new ArrayList<>();
    Object entrada = rotina.get("entrada");
    Object usados = entrada instanceof Map ? ((Map<?, ?>) entrada).get("perfil") : null;
    if (!(usados instanceof Map)) {
      return mudancas;
    }
    Map<String, Object> atuais = camposDeTreino(perfil);
    for (String campo : CAMPOS_PERFIL) {
      Object antes = ((Map<?, ?>) usados).get(campo);
      Object agora = atuais.get(campo);
      if (!Objects.equals(antes == null ? null : String.valueOf(antes), agora == null ? null : String.valueOf(agora))) {
        mudancas.add(ROTULOS_PERFIL.get(campo));
      }
    }
    return mudancas;
  }

  // ---------------------------------------------------------------- prévia

  /** Monta a proposta sem gravar nada. */
  public Map<String, Object> previa(User usuario, Map<String, Object> corpo) {
    Entrada entrada = ler(usuario, corpo);
    MotorRotina.Proposta proposta = gerar(entrada);
    Map<String, Object> resposta = proposta.toMap();
    Document ativa = armazem.ativa(usuario.getId());
    resposta.put("baseVersao", ativa == null ? null : numero(ativa.get("versao")));
    resposta.put(
        "mesmaRotinaAtiva", ativa != null && proposta.assinatura.equals(ativa.getString("assinatura")));
    resposta.put("sessoesEmAndamento", ativa == null ? new ArrayList<>() : sessoesAbertas(usuario.getId(), ativa));
    resposta.put("perfilEntrada", entrada.perfilCampos);
    return resposta;
  }

  /** Opções de troca para um exercício da prévia. Não grava nada. */
  public List<Map<String, Object>> alternativas(User usuario, Map<String, Object> corpo) {
    Entrada entrada = ler(usuario, corpo);
    MotorRotina.Proposta proposta = gerar(entrada);
    Object codigo = corpo.get("sessao");
    Integer posicao = MotorRotina.inteiro(corpo.get("posicao"));
    if (!(codigo instanceof String) || posicao == null) {
      throw erro(400, "Informe a sessão e a posição do exercício.");
    }
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      if (sessao.codigo.equals(codigo)) {
        try {
          return MotorRotina.opcoesDeTroca(
              sessao.itens, posicao, sessao.modelo.foco, entrada.perfil, sessao.minutos);
        } catch (MotorRotina.Invalido e) {
          throw erro(404, e.getMessage());
        }
      }
    }
    throw erro(404, "Sessão não encontrada nesta proposta.");
  }

  // ---------------------------------------------------------------- salvar

  /**
   * Salva a proposta confirmada pelo usuário. Atualiza os campos de treino do perfil do objeto
   * {@code usuario} (quem chama persiste o usuário se {@code perfilAlterado} for verdadeiro).
   */
  public Map<String, Object> salvar(User usuario, Map<String, Object> corpo) {
    Object assinaturaPrevia = corpo.get("assinaturaPrevia");
    if (!(assinaturaPrevia instanceof String) || ((String) assinaturaPrevia).length() != 64) {
      throw erro(400, "Gere a prévia antes de salvar.");
    }
    Integer baseVersao = null;
    if (corpo.get("baseVersao") != null) {
      baseVersao = MotorRotina.inteiro(corpo.get("baseVersao"));
      if (baseVersao == null || baseVersao < 1) {
        throw erro(400, "Versão de referência inválida.");
      }
    }
    boolean confirmar = Boolean.TRUE.equals(corpo.get("confirmarSubstituicao"));
    Entrada entrada = ler(usuario, corpo);
    MotorRotina.Proposta proposta = gerar(entrada);
    if (!proposta.gruposDescobertos.isEmpty()) {
      throw conflito(
          "cobertura_insuficiente",
          "Esta programação deixa "
              + String.join(", ", proposta.gruposDescobertos)
              + " sem estímulo. Ajuste os equipamentos, a duração ou os exercícios evitados antes de salvar.",
          "grupos",
          proposta.gruposDescobertos);
    }
    if (!proposta.assinatura.equals(assinaturaPrevia)) {
      throw conflito(
          "previa_desatualizada",
          "A proposta mudou desde a prévia. Revise a versão atualizada antes de salvar.",
          "proposta",
          proposta.toMap());
    }
    ObjectId usuarioId = usuario.getId();
    Date agora = relogio.get();
    Document ativa = armazem.ativa(usuarioId);
    if (ativa != null && proposta.assinatura.equals(ativa.getString("assinatura"))) {
      Document atual = ajustarAgendaSeMudou(usuarioId, ativa, proposta, agora);
      return resposta(atual, false, atualizarPerfil(usuario, entrada));
    }
    int versaoAtiva = ativa == null ? 0 : numero(ativa.get("versao"));
    boolean baseDiferente =
        ativa == null ? baseVersao != null : baseVersao == null || baseVersao != versaoAtiva;
    if (baseDiferente) {
      throw conflito(
          "rotina_alterada",
          "Sua rotina foi alterada em outra tela. Revise a versão atual antes de salvar.");
    }
    if (ativa != null && !confirmar) {
      List<Map<String, Object>> abertas = sessoesAbertas(usuarioId, ativa);
      if (!abertas.isEmpty()) {
        throw conflito(
            "sessoes_em_andamento",
            "Você tem treinos em andamento desta rotina. Eles continuam no histórico; confirme para criar a nova rotina.",
            "requerConfirmacao",
            true,
            "sessoes",
            abertas);
      }
    }
    Document nova = documentoRotina(usuarioId, proposta, entrada, versaoAtiva + 1, agora);
    if (!armazem.inserirRotina(nova)) {
      Document vencedora = armazem.ativa(usuarioId);
      if (vencedora != null && proposta.assinatura.equals(vencedora.getString("assinatura"))) {
        return resposta(vencedora, false, atualizarPerfil(usuario, entrada));
      }
      throw conflito(
          "rotina_alterada",
          "Outra alteração da rotina foi salva ao mesmo tempo. Revise a versão atual antes de salvar.");
    }
    if (ativa != null) {
      armazem.substituirAnteriores(usuarioId, versaoAtiva + 1, agora);
    }
    return resposta(nova, true, atualizarPerfil(usuario, entrada));
  }

  private static Map<String, Object> resposta(Document rotina, boolean criada, boolean perfilAlterado) {
    Map<String, Object> resposta = new LinkedHashMap<>();
    resposta.put("rotina", rotina);
    resposta.put("criada", criada);
    resposta.put("perfilAlterado", perfilAlterado);
    return resposta;
  }

  private static boolean atualizarPerfil(User usuario, Entrada entrada) {
    if (usuario.getProfile() == null) {
      usuario.setProfile(new User.Profile());
    }
    if (camposDeTreino(usuario.getProfile()).equals(entrada.perfilCampos)) {
      return false;
    }
    TrainingProfile.apply(usuario.getProfile(), entrada.perfilCampos);
    return true;
  }

  private Document ajustarAgendaSeMudou(
      ObjectId usuario, Document ativa, MotorRotina.Proposta proposta, Date agora) {
    Object agenda = ativa.get("agenda");
    Map<?, ?> atual = agenda instanceof Map ? (Map<?, ?>) agenda : new LinkedHashMap<>();
    if (Objects.equals(String.valueOf(atual.get("modo")), proposta.modoAgenda())
        && Objects.equals(String.valueOf(atual.get("dias")), String.valueOf(proposta.diasAgenda()))) {
      return ativa;
    }
    Map<String, Object> mapa = proposta.toMap();
    Document campos =
        new Document("agenda", mapa.get("agenda"))
            .append("avisosAgenda", mapa.get("avisosAgenda"))
            .append("explicacao", mapa.get("explicacao"))
            .append("updatedAt", agora);
    if (!armazem.atualizarRotina(usuario, ativa.getObjectId("_id"), numero(ativa.get("revisao")), campos)) {
      throw conflito(
          "rotina_alterada",
          "Sua rotina foi alterada em outra tela. Revise a versão atual antes de salvar.");
    }
    return armazem.ativa(usuario);
  }

  static Document documentoRotina(
      ObjectId usuario, MotorRotina.Proposta proposta, Entrada entrada, int versao, Date agora) {
    Document documento =
        new Document("_id", new ObjectId())
            .append("user", usuario)
            .append("versao", versao)
            .append("revisao", 0)
            .append("status", "ativa");
    for (Map.Entry<String, Object> campo : proposta.toMap().entrySet()) {
      documento.append(campo.getKey(), campo.getValue());
    }
    documento.append(
        "entrada",
        new Document("perfil", new Document(entrada.perfilCampos))
            .append("concluidosRecentes", entrada.perfil.concluidosRecentes)
            .append("estrategiaPedida", entrada.pedido.estrategia)
            .append("variacao", entrada.pedido.variacao));
    documento.append("createdAt", agora).append("updatedAt", agora);
    return documento;
  }

  private List<Map<String, Object>> sessoesAbertas(ObjectId usuario, Document rotina) {
    List<Map<String, Object>> abertas = new ArrayList<>();
    for (Document treino : armazem.instancias(usuario, rotina.getObjectId("_id"))) {
      if (!Boolean.TRUE.equals(treino.get("realizado"))) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("codigo", treino.get("rotinaCodigo"));
        item.put("titulo", treino.get("titulo"));
        item.put("treinoId", treino.getObjectId("_id"));
        abertas.add(item);
      }
    }
    return abertas;
  }

  // ---------------------------------------------------------------- agenda

  /** Troca o modo ou os dias da agenda sem criar nova versão. */
  public Map<String, Object> atualizarAgenda(User usuario, Map<String, Object> corpo) {
    ObjectId usuarioId = usuario.getId();
    Document ativa = armazem.ativa(usuarioId);
    if (ativa == null) {
      throw erro(404, "Você ainda não tem uma rotina salva.");
    }
    Integer revisao = MotorRotina.inteiro(corpo.get("revisao"));
    if (revisao == null) {
      throw erro(400, "Informe a revisão da rotina.");
    }
    if (revisao != numero(ativa.get("revisao"))) {
      throw conflito(
          "rotina_alterada", "Sua rotina foi alterada em outra tela. Atualize a página e tente de novo.");
    }
    List<MontadorSessao.Sessao> sessoes = reconstruir(ativa);
    List<String> erros = new ArrayList<>();
    AgendaSemanal.Agenda agenda = AgendaSemanal.ler(corpo.get("agenda"), sessoes.size(), erros);
    if (!erros.isEmpty()) {
      throw erro(400, erros.get(0));
    }
    if (agenda.calendario() && agenda.dias == null) {
      agenda = new AgendaSemanal.Agenda(AgendaSemanal.CALENDARIO, AgendaSemanal.sugeridos(sessoes.size()));
    }
    Map<String, Object> agendaMapa = agenda.toMap();
    agendaMapa.put("sugeridos", new ArrayList<>(AgendaSemanal.sugeridos(sessoes.size())));
    Document campos =
        new Document("agenda", agendaMapa)
            .append("avisosAgenda", AgendaSemanal.avisos(agenda, sessoes))
            .append(
                "explicacao",
                explicacaoComAgenda(
                    ativa.get("explicacao"),
                    ExplicacaoRotina.textoAgenda(agenda, sessoes, sequencia(ativa))))
            .append("updatedAt", relogio.get());
    if (!armazem.atualizarRotina(usuarioId, ativa.getObjectId("_id"), revisao, campos)) {
      throw conflito(
          "rotina_alterada", "Sua rotina foi alterada em outra tela. Atualize a página e tente de novo.");
    }
    return consultar(usuario);
  }

  @SuppressWarnings("unchecked")
  static List<MontadorSessao.Sessao> reconstruir(Document rotina) {
    List<MontadorSessao.Sessao> sessoes = new ArrayList<>();
    Object lista = rotina.get("sessoes");
    if (!(lista instanceof List)) {
      return sessoes;
    }
    for (Object bruto : (List<Object>) lista) {
      if (!(bruto instanceof Map)) {
        continue;
      }
      Map<String, Object> sessao = (Map<String, Object>) bruto;
      String modeloCodigo = String.valueOf(sessao.get("modelo"));
      ModelosSessao.Modelo modelo =
          ModelosSessao.MODELOS.containsKey(modeloCodigo)
              ? ModelosSessao.modelo(modeloCodigo)
              : new ModelosSessao.Modelo(modeloCodigo, String.valueOf(sessao.get("foco")));
      MontadorSessao.Sessao reconstruida =
          new MontadorSessao.Sessao(String.valueOf(sessao.get("codigo")), modelo, numero(sessao.get("minutos")));
      Object exercicios = sessao.get("exercicios");
      if (exercicios instanceof List) {
        for (Object item : (List<Object>) exercicios) {
          if (item instanceof Map) {
            reconstruida.itens.add(new LinkedHashMap<>((Map<String, Object>) item));
          }
        }
      }
      sessoes.add(reconstruida);
    }
    return sessoes;
  }

  @SuppressWarnings("unchecked")
  private static List<Map<String, Object>> sequencia(Document rotina) {
    List<Map<String, Object>> passos = new ArrayList<>();
    Object lista = rotina.get("sequencia");
    if (lista instanceof List) {
      for (Object passo : (List<Object>) lista) {
        if (passo instanceof Map) {
          passos.add((Map<String, Object>) passo);
        }
      }
    }
    return passos;
  }

  private static List<Object> explicacaoComAgenda(Object explicacao, String texto) {
    List<Object> itens = new ArrayList<>();
    if (explicacao instanceof List) {
      for (Object item : (List<?>) explicacao) {
        if (item instanceof Map && "agenda".equals(((Map<?, ?>) item).get("tipo"))) {
          Map<String, Object> novo = new LinkedHashMap<>();
          for (Map.Entry<?, ?> campo : ((Map<?, ?>) item).entrySet()) {
            novo.put(String.valueOf(campo.getKey()), campo.getValue());
          }
          novo.put("texto", texto);
          itens.add(novo);
        } else {
          itens.add(item);
        }
      }
    }
    return itens;
  }

  // ---------------------------------------------------------------- iniciar sessão

  /**
   * Impede executar ou concluir uma sessão fora da ordem persistida. Enquanto a rotina ativa
   * tiver uma próxima sessão, só ela pode receber execução — inclusive contra outra programação
   * semanal. Sem essa próxima, vale a ordem gravada da própria ficha. Treino concluído e avulso
   * não entram na trava.
   */
  public void exigirSequencia(User usuario, Document treino) {
    validarSequencia(usuario, treino, false, new Panorama());
  }

  /**
   * Aplica {@link #exigirSequencia} e reserva, de forma atômica, a única execução sequencial
   * aberta do usuário. Repetir a reserva do mesmo treino é permitido.
   */
  public void reservarExecucao(User usuario, Document treino) {
    validarSequencia(usuario, treino, true, new Panorama());
  }

  /** Solta a reserva deste treino. Não altera realizado, não apaga ficha e não apaga execução. */
  public void liberarExecucao(User usuario, Document treino) {
    if (treino.get("_id") instanceof ObjectId) {
      armazem.liberarExecucao(usuario.getId(), treino.getObjectId("_id"));
    }
    treino.remove("sequenciaAberta");
  }

  private void validarSequencia(User usuario, Document treino, boolean reservar, Panorama panorama) {
    if (treino.get("user") instanceof ObjectId && !treino.get("user").equals(usuario.getId())) {
      throw erro(403, "Você não tem permissão para alterar este treino.");
    }
    if (Boolean.TRUE.equals(treino.get("realizado")) || !sequencial(treino)) {
      return;
    }
    exigirOrdem(usuario, treino, panorama);
    ObjectId este = treino.get("_id") instanceof ObjectId ? treino.getObjectId("_id") : null;
    ObjectId ocupante = panorama.ocupante(usuario, este);
    if (ocupante != null && !ocupante.equals(este)) {
      throw conflito("sessao_em_andamento", panorama.mensagemOcupante(usuario, ocupante));
    }
    if (reservar) {
      if (este == null || !armazem.reivindicarExecucao(usuario.getId(), este)) {
        throw conflito(
            "sessao_em_andamento",
            "Há outro treino em andamento. Conclua esse treino antes de iniciar outro.");
      }
      treino.put("sequenciaAberta", usuario.getId());
    }
  }

  /**
   * Excluir uma ficha da programação em curso só é seguro na sessão liberada e ainda não
   * concluída. Concluídas e futuras permanecem: apagá-las mudaria o ciclo ou o histórico.
   * Avulsos e fichas sem programação seguem o comportamento anterior.
   */
  public boolean podeExcluir(User usuario, Document treino) {
    if (treino.get("user") instanceof ObjectId && !treino.get("user").equals(usuario.getId())) {
      return false;
    }
    if (Boolean.TRUE.equals(treino.get("realizado")) && sequencial(treino)) {
      return false;
    }
    try {
      exigirSequencia(usuario, treino);
      return true;
    } catch (ApiException e) {
      return false;
    }
  }

  private void exigirOrdem(User usuario, Document treino, Panorama panorama) {
    Document ativa = panorama.ativa(usuario);
    String proximaAtiva = ativa == null ? null : panorama.proxima(usuario, ativa);
    Object rotinaId = treino.get("rotinaId");
    Object codigo = treino.get("rotinaCodigo");
    boolean daRotina = rotinaId instanceof ObjectId && codigo instanceof String;

    if (proximaAtiva != null) {
      if (daRotina && rotinaId.equals(ativa.getObjectId("_id"))) {
        if (!proximaAtiva.equals(codigo)) {
          throw conflito("sessao_bloqueada", mensagemBloqueio(ativa, proximaAtiva));
        }
        return;
      }
      if (daRotina) {
        exigirOrdemDaRotina(usuario, (ObjectId) rotinaId, (String) codigo, panorama);
        return;
      }
      throw conflito("sessao_bloqueada", mensagemBloqueio(ativa, proximaAtiva));
    }

    if (daRotina) {
      exigirOrdemDaRotina(usuario, (ObjectId) rotinaId, (String) codigo, panorama);
      return;
    }

    if (treino.get("programaChave") instanceof String
        && treino.get("programaCodigo") instanceof String
        && treino.get("programaOrdem") instanceof Number) {
      String codigoPrograma = (String) treino.get("programaCodigo");
      List<Document> irmaos = panorama.programa(usuario, (String) treino.get("programaChave"));
      String liberada = proximaDoPrograma(irmaos);
      if (!codigoPrograma.equals(liberada)) {
        throw conflito("sessao_bloqueada", mensagemDoPrograma(irmaos, liberada));
      }
    }
  }

  /** Ordem interna de uma versão da rotina. Se a versão não existe mais, não inventa bloqueio. */
  private void exigirOrdemDaRotina(
      User usuario, ObjectId rotinaId, String codigo, Panorama panorama) {
    Document dona = armazem.rotina(usuario.getId(), rotinaId);
    if (dona == null) {
      return;
    }
    String liberada = panorama.proxima(usuario, dona);
    if (liberada == null || !liberada.equals(codigo)) {
      throw conflito("sessao_bloqueada", mensagemBloqueio(dona, liberada == null ? "" : liberada));
    }
  }

  /** Anota a resposta de leitura, sem gravar, se esta ficha pode receber execução agora. */
  public void anotarSequencia(User usuario, Document treino) {
    anotarCom(usuario, treino, new Panorama());
  }

  /** Anota uma lista inteira com uma única leitura da rotina, das fichas abertas e das execuções. */
  public void anotarLista(User usuario, List<Document> treinos) {
    Panorama panorama = new Panorama();
    for (Document treino : treinos) {
      anotarCom(usuario, treino, panorama);
    }
  }

  private void anotarCom(User usuario, Document treino, Panorama panorama) {
    try {
      validarSequencia(usuario, treino, false, panorama);
      treino.put("execucaoPermitida", true);
    } catch (ApiException e) {
      treino.put("execucaoPermitida", false);
      Object mensagem = e.getBody().get("message");
      treino.put(
          "bloqueioMensagem",
          mensagem instanceof String ? mensagem : "Conclua o treino anterior para liberar este treino.");
      if (!Boolean.TRUE.equals(treino.get("realizado"))) {
        treino.put("estadoExecucao", "nao_iniciado");
      }
    }
    treino.put("exclusaoPermitida", podeExcluirCom(usuario, treino, panorama));
  }

  private boolean podeExcluirCom(User usuario, Document treino, Panorama panorama) {
    if (treino.get("user") instanceof ObjectId && !treino.get("user").equals(usuario.getId())) {
      return false;
    }
    if (Boolean.TRUE.equals(treino.get("realizado")) && sequencial(treino)) {
      return false;
    }
    try {
      validarSequencia(usuario, treino, false, panorama);
      return true;
    } catch (ApiException e) {
      return false;
    }
  }

  private final class Panorama {
    private boolean ativaLida;
    private Document ativa;
    private final Map<ObjectId, String> proximas = new HashMap<>();
    private final Set<ObjectId> proximasLidas = new HashSet<>();
    private final Map<String, List<Document>> programas = new HashMap<>();
    private List<Document> abertas;
    private Map<ObjectId, Document> execucoesPorTreino;
    private boolean reservadaLida;
    private ObjectId reservada;
    private boolean iniciadaLida;
    private ObjectId iniciada;

    Document ativa(User usuario) {
      if (!ativaLida) {
        ativa = armazem.ativa(usuario.getId());
        ativaLida = true;
      }
      return ativa;
    }

    String proxima(User usuario, Document rotina) {
      ObjectId id = rotina.getObjectId("_id");
      if (proximasLidas.add(id)) {
        Map<String, Object> estado =
            CicloRotina.calcular(
                rotina, armazem.instancias(usuario.getId(), id), new LinkedHashMap<>());
        String codigo = estado.get("proxima") instanceof String ? (String) estado.get("proxima") : "";
        proximas.put(id, codigo.isBlank() ? null : codigo);
      }
      return proximas.get(id);
    }

    List<Document> programa(User usuario, String chave) {
      return programas.computeIfAbsent(chave, valor -> armazem.doPrograma(usuario.getId(), valor));
    }

    ObjectId ocupante(User usuario, ObjectId este) {
      if (!reservadaLida) {
        reservada = armazem.execucaoReservada(usuario.getId());
        reservadaLida = true;
      }
      if (reservada != null) {
        return reservada;
      }
      if (!iniciadaLida) {
        iniciada = iniciadaLiberada(usuario);
        iniciadaLida = true;
      }
      return iniciada != null && !iniciada.equals(este) ? iniciada : null;
    }

    String mensagemOcupante(User usuario, ObjectId ocupante) {
      for (Document ficha : abertas(usuario)) {
        if (ocupante.equals(ficha.get("_id"))) {
          if (ficha.get("titulo") instanceof String && !((String) ficha.get("titulo")).isBlank()) {
            return fraseConclusao((String) ficha.get("titulo"));
          }
          if (ficha.get("rotinaCodigo") instanceof String) {
            return fraseConclusao("Treino " + ficha.get("rotinaCodigo"));
          }
        }
      }
      return "Há outro treino em andamento. Conclua esse treino antes de iniciar outro.";
    }

    private List<Document> abertas(User usuario) {
      if (abertas == null) {
        abertas = armazem.sequenciaisAbertas(usuario.getId());
      }
      return abertas;
    }

    private ObjectId iniciadaLiberada(User usuario) {
      List<ObjectId> ids = new ArrayList<>();
      for (Document ficha : abertas(usuario)) {
        if (ficha.get("_id") instanceof ObjectId) {
          ids.add(ficha.getObjectId("_id"));
        }
      }
      if (execucoesPorTreino == null) {
        execucoesPorTreino = armazem.execucoes(usuario.getId(), ids);
      }
      ObjectId melhor = null;
      long quando = Long.MAX_VALUE;
      for (Document ficha : abertas(usuario)) {
        if (!(ficha.get("_id") instanceof ObjectId) || !sequencial(ficha)) {
          continue;
        }
        Document execucao = execucoesPorTreino.get(ficha.getObjectId("_id"));
        if (!ExecucaoRegras.iniciada(execucao)) {
          continue;
        }
        try {
          exigirOrdem(usuario, ficha, this);
        } catch (ApiException e) {
          continue;
        }
        long marco = marco(execucao, ficha);
        if (melhor == null || marco < quando) {
          melhor = ficha.getObjectId("_id");
          quando = marco;
        }
      }
      return melhor;
    }
  }

  private static long marco(Document execucao, Document ficha) {
    if (execucao != null && execucao.get("iniciadoEm") instanceof Date) {
      return ((Date) execucao.get("iniciadoEm")).getTime();
    }
    if (ficha.get("createdAt") instanceof Date) {
      return ((Date) ficha.get("createdAt")).getTime();
    }
    return Long.MAX_VALUE;
  }

  static String mensagemBloqueio(Document rotina, String codigoLiberado) {
    String nome = "treino anterior";
    Map<String, Object> sessao = rotina == null ? null : sessao(rotina, codigoLiberado);
    if (sessao != null && sessao.get("nome") instanceof String && !((String) sessao.get("nome")).isBlank()) {
      nome = (String) sessao.get("nome");
    } else if (codigoLiberado != null && !codigoLiberado.isBlank()) {
      nome = "Treino " + codigoLiberado;
    }
    return fraseConclusao(nome);
  }

  private static boolean sequencial(Document treino) {
    return (treino.get("rotinaId") instanceof ObjectId && treino.get("rotinaCodigo") instanceof String)
        || (treino.get("programaChave") instanceof String
            && treino.get("programaCodigo") instanceof String
            && treino.get("programaOrdem") instanceof Number);
  }

  private static String proximaDoPrograma(List<Document> irmaos) {
    Document proxima = null;
    for (Document item : irmaos) {
      if (Boolean.TRUE.equals(item.get("realizado"))) {
        continue;
      }
      if (!(item.get("programaCodigo") instanceof String) || !(item.get("programaOrdem") instanceof Number)) {
        continue;
      }
      if (proxima == null
          || ((Number) item.get("programaOrdem")).intValue()
              < ((Number) proxima.get("programaOrdem")).intValue()) {
        proxima = item;
      }
    }
    return proxima == null ? "" : (String) proxima.get("programaCodigo");
  }

  private static String mensagemDoPrograma(List<Document> irmaos, String codigoLiberado) {
    String nome = "treino anterior";
    for (Document item : irmaos) {
      if (codigoLiberado.equals(item.get("programaCodigo"))
          && item.get("titulo") instanceof String
          && !((String) item.get("titulo")).isBlank()) {
        nome = (String) item.get("titulo");
        break;
      }
    }
    return fraseConclusao(nome);
  }

  static String fraseConclusao(String nome) {
    String texto = nome == null ? "" : nome.trim();
    if (texto.isEmpty()) {
      texto = "treino anterior";
    }
    if (texto.regionMatches(true, 0, "o ", 0, 2) || texto.regionMatches(true, 0, "a ", 0, 2)) {
      return "Conclua " + texto + " para liberar este treino.";
    }
    if (texto.regionMatches(true, 0, "sessão", 0, 6) || texto.regionMatches(true, 0, "sessao", 0, 6)) {
      return "Conclua a " + texto + " para liberar este treino.";
    }
    return "Conclua o " + texto + " para liberar este treino.";
  }

  /**
   * Cria (ou reaproveita) o treino da sessão indicada. Repetir a chamada devolve a mesma
   * instância aberta; nunca cria duplicatas.
   */
  public Map<String, Object> iniciar(User usuario, String codigo) {
    if (codigo == null || !CODIGO_SESSAO.matcher(codigo).matches()) {
      throw erro(400, "Sessão inválida.");
    }
    ObjectId usuarioId = usuario.getId();
    Document ativa = armazem.ativa(usuarioId);
    if (ativa == null) {
      throw erro(404, "Você ainda não tem uma rotina salva.");
    }
    Map<String, Object> sessao = sessao(ativa, codigo);
    if (sessao == null) {
      throw erro(404, "Sessão não encontrada nesta rotina.");
    }
    ObjectId rotinaId = ativa.getObjectId("_id");
    List<Document> instancias = armazem.instancias(usuarioId, rotinaId);
    Map<String, Object> estado = CicloRotina.calcular(ativa, instancias, new LinkedHashMap<>());
    String liberada = estado.get("proxima") instanceof String ? (String) estado.get("proxima") : "";
    if (!codigo.equals(liberada)) {
      throw conflito("sessao_bloqueada", mensagemBloqueio(ativa, liberada));
    }
    String aviso = avisoRecuperacao(ativa, codigo, instancias, relogio.get());
    Document aberta = armazem.instanciaAberta(usuarioId, rotinaId, codigo);
    if (aberta != null) {
      reservarExecucao(usuario, aberta);
      return respostaInicio(aberta.getObjectId("_id"), false, aviso);
    }
    Document treino = instancia(usuarioId, ativa, sessao, numero(estado.get("ciclo")), relogio.get());
    if (!armazem.inserirInstancia(treino)) {
      aberta = armazem.instanciaAberta(usuarioId, rotinaId, codigo);
      if (aberta != null) {
        reservarExecucao(usuario, aberta);
        return respostaInicio(aberta.getObjectId("_id"), false, aviso);
      }
      throw conflito("tente_novamente", "Não foi possível iniciar o treino agora. Tente novamente.");
    }
    reservarExecucao(usuario, treino);
    return respostaInicio(treino.getObjectId("_id"), true, aviso);
  }

  /**
   * Um dia é uma heurística de recuperação, não uma proibição. A sessão fora de ordem continua
   * bloqueada; treinar antes desse intervalo só recebe uma orientação.
   */
  static final long RECUPERACAO_MS = 24L * 60 * 60 * 1000;

  private static Map<String, Object> respostaInicio(ObjectId treinoId, boolean criado, String aviso) {
    Map<String, Object> resposta = new LinkedHashMap<>();
    resposta.put("treinoId", treinoId);
    resposta.put("criado", criado);
    if (aviso != null) {
      resposta.put("avisoRecuperacao", aviso);
    }
    return resposta;
  }

  private static String avisoRecuperacao(
      Document rotina, String codigo, List<Document> instancias, Date agora) {
    List<Map<String, Object>> passos = sequencia(rotina);
    int indice = -1;
    for (int i = 0; i < passos.size(); i++) {
      if (codigo.equals(passos.get(i).get("codigo"))) {
        indice = i;
      }
    }
    if (indice < 0 || passos.isEmpty()) {
      return null;
    }
    Map<String, Object> anterior = passos.get((indice + passos.size() - 1) % passos.size());
    if (!Boolean.TRUE.equals(anterior.get("descansoDepois"))) {
      return null;
    }
    String codigoAnterior = String.valueOf(anterior.get("codigo"));
    Date ultima = null;
    for (Document treino : instancias) {
      if (!codigoAnterior.equals(treino.get("rotinaCodigo"))
          || !Boolean.TRUE.equals(treino.get("realizado"))) {
        continue;
      }
      Object data = treino.get("dataRealizacao");
      if (data instanceof Date && (ultima == null || ((Date) data).after(ultima))) {
        ultima = (Date) data;
      }
    }
    if (ultima == null) {
      return null;
    }
    long decorrido = agora.getTime() - ultima.getTime();
    if (decorrido < 0 || decorrido >= RECUPERACAO_MS) {
      return null;
    }
    return "O treino anterior recomenda um dia de descanso. Se ainda estiver cansado, vale esperar. A sessão continua disponível.";
  }

  @SuppressWarnings("unchecked")
  static Map<String, Object> sessao(Document rotina, String codigo) {
    Object lista = rotina.get("sessoes");
    if (lista instanceof List) {
      for (Object sessao : (List<Object>) lista) {
        if (sessao instanceof Map && codigo.equals(((Map<String, Object>) sessao).get("codigo"))) {
          return (Map<String, Object>) sessao;
        }
      }
    }
    return null;
  }

  /**
   * Copia os exercícios com identificadores novos; o identificador do modelo fica em
   * {@code rotinaUid}. Assim, registros de execução nunca se misturam entre treinos.
   */
  @SuppressWarnings("unchecked")
  static List<Map<String, Object>> copiarExercicios(Object lista) {
    List<Map<String, Object>> exercicios = new ArrayList<>();
    if (lista instanceof List) {
      for (Object item : (List<Object>) lista) {
        if (item instanceof Map) {
          Document copia = new Document((Map<String, Object>) item);
          copia.put("rotinaUid", copia.get("uid"));
          copia.put("uid", new ObjectId().toHexString());
          exercicios.add(copia);
        }
      }
    }
    return exercicios;
  }

  @SuppressWarnings("unchecked")
  static Document instancia(
      ObjectId usuario, Document rotina, Map<String, Object> sessao, int ciclo, Date agora) {
    List<Map<String, Object>> comoMapa = copiarExercicios(sessao.get("exercicios"));
    List<Object> exercicios = new ArrayList<>(comoMapa);
    String grupamento = String.valueOf(sessao.get("grupamento"));
    Map<?, ?> perfil = rotina.get("perfil") instanceof Map ? (Map<?, ?>) rotina.get("perfil") : new LinkedHashMap<>();
    Map<?, ?> estrategia =
        rotina.get("estrategia") instanceof Map ? (Map<?, ?>) rotina.get("estrategia") : new LinkedHashMap<>();
    List<Object> observacoes = new ArrayList<>();
    if (sessao.get("avisos") instanceof List) {
      observacoes.addAll((List<Object>) sessao.get("avisos"));
    }
    String codigo = String.valueOf(sessao.get("codigo"));
    return new Document("_id", new ObjectId())
        .append("user", usuario)
        .append("titulo", sessao.get("nome") + " · " + sessao.get("focoRotulo"))
        .append("grupamento", grupamento)
        .append("objetivo", perfil.get("objetivoRotulo") + ". " + estrategia.get("rotulo"))
        .append("modo", perfil.get("objetivo"))
        .append("tipoDivisao", "ROTINA")
        .append("letraTreino", codigo)
        .append("tempoDisponivel", sessao.get("minutos"))
        .append("duracaoEstimadaMinutos", sessao.get("duracaoEstimadaMinutos"))
        .append("duracaoObservacao", DURACAO_OBSERVACAO)
        .append("exercicios", exercicios)
        .append("resumo", CoberturaMuscular.resumo(grupamento, comoMapa))
        .append("cobertura", CoberturaMuscular.calcular(grupamento, comoMapa))
        .append("observacoes", observacoes)
        .append("realizado", false)
        .append("rotinaId", rotina.getObjectId("_id"))
        .append("rotinaVersao", rotina.get("versao"))
        .append("rotinaCodigo", codigo)
        .append("rotinaOrdem", sessao.get("ordem"))
        .append("rotinaFoco", sessao.get("focoRotulo"))
        .append("focoSessao", sessao.get("foco"))
        .append("ciclo", ciclo)
        .append("motorVersao", MotorRotina.VERSAO)
        .append("createdAt", agora)
        .append("updatedAt", agora)
        .append("__v", 0);
  }

  // ---------------------------------------------------------------- treino avulso

  public static final List<String> FOCOS_AVULSO =
      Collections.unmodifiableList(
          Arrays.asList("corpo_inteiro", "superior", "inferior", "empurrar", "puxar"));

  /** Perfil atual com as preferências da rotina ativa (equipamentos, limitações, exercícios evitados). */
  public PerfilInterpretado perfilAtual(User usuario) {
    Document ativa = armazem.ativa(usuario.getId());
    PreferenciasTreino preferencias =
        ativa == null ? PreferenciasTreino.padrao() : PreferenciasTreino.fromDocument(ativa.get("preferencias"));
    return PerfilInterpretado.interpretar(
        usuario.getProfile(), preferencias, concluidosRecentes(usuario.getId()));
  }

  /** Monta (sem gravar) um treino avulso com o motor novo. */
  @SuppressWarnings("unchecked")
  public Document treinoAvulso(User usuario, String foco, int minutos, int variante, Date agora) {
    if (!FOCOS_AVULSO.contains(foco)) {
      throw erro(400, "Foco de treino inválido.");
    }
    PerfilInterpretado perfil = perfilAtual(usuario);
    Map<String, Object> sessao;
    try {
      sessao = MotorRotina.sessaoAvulsa(perfil, foco, minutos, variante, seed(usuario));
    } catch (MotorRotina.Invalido e) {
      throw erro(400, e.getMessage());
    }
    List<Map<String, Object>> comoMapa = copiarExercicios(sessao.get("exercicios"));
    for (Map<String, Object> item : comoMapa) {
      item.remove("rotinaUid");
    }
    String grupamento = String.valueOf(sessao.get("grupamento"));
    String focoRotulo = String.valueOf(sessao.get("focoRotulo"));
    List<Object> observacoes = new ArrayList<>();
    if (sessao.get("avisos") instanceof List) {
      observacoes.addAll((List<Object>) sessao.get("avisos"));
    }
    return new Document("_id", new ObjectId())
        .append("user", usuario.getId())
        .append("titulo", "Treino avulso · " + focoRotulo)
        .append("grupamento", grupamento)
        .append(
            "objetivo",
            perfil.objetivoRotulo() + ". Treino avulso com foco em " + focoRotulo.toLowerCase(new Locale("pt", "BR")) + ".")
        .append("modo", perfil.objetivo)
        .append("tipoDivisao", "AVULSO")
        .append("letraTreino", null)
        .append("variante", null)
        .append("tempoDisponivel", minutos)
        .append("duracaoEstimadaMinutos", sessao.get("duracaoEstimadaMinutos"))
        .append("duracaoObservacao", DURACAO_OBSERVACAO)
        .append("exercicios", new ArrayList<Object>(comoMapa))
        .append("resumo", CoberturaMuscular.resumo(grupamento, comoMapa))
        .append("cobertura", CoberturaMuscular.calcular(grupamento, comoMapa))
        .append("observacoes", observacoes)
        .append("realizado", false)
        .append("focoSessao", sessao.get("foco"))
        .append("avulsoFoco", foco)
        .append("motorVersao", MotorRotina.VERSAO)
        .append("createdAt", agora)
        .append("updatedAt", agora)
        .append("__v", 0);
  }

  /** Perfil usado para trocas em treinos criados por uma rotina: o mesmo da criação. */
  public PerfilInterpretado perfilDaRotina(User usuario, ObjectId rotinaId) {
    Document rotina = rotinaId == null ? null : armazem.rotina(usuario.getId(), rotinaId);
    if (rotina == null) {
      return PerfilInterpretado.interpretar(usuario.getProfile(), PreferenciasTreino.padrao(), -1);
    }
    User.Profile perfil = new User.Profile();
    Object entrada = rotina.get("entrada");
    Object campos = entrada instanceof Map ? ((Map<?, ?>) entrada).get("perfil") : null;
    if (campos instanceof Map) {
      Map<String, Object> mapa = new LinkedHashMap<>();
      for (Map.Entry<?, ?> campo : ((Map<?, ?>) campos).entrySet()) {
        mapa.put(String.valueOf(campo.getKey()), campo.getValue());
      }
      TrainingProfile.apply(perfil, mapa);
    } else {
      perfil = usuario.getProfile();
    }
    Object concluidos = entrada instanceof Map ? ((Map<?, ?>) entrada).get("concluidosRecentes") : null;
    return PerfilInterpretado.interpretar(
        perfil,
        PreferenciasTreino.fromDocument(rotina.get("preferencias")),
        concluidos instanceof Number ? ((Number) concluidos).intValue() : -1);
  }
}
