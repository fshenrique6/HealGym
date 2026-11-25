package com.healgym.service.rotina;

import com.healgym.service.CoberturaMuscular;
import com.healgym.service.ExerciseDatabase;
import com.healgym.service.SessionPlanner;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Motor de rotinas (versão 2): interpreta o perfil, escolhe a estrutura viável, monta as sessões
 * com exercícios do catálogo, equilibra o volume semanal e organiza a agenda.
 *
 * <p>É determinístico: o mesmo pedido gera a mesma proposta e a mesma assinatura. Não acessa o
 * banco; persistência fica com o serviço de rotinas.
 */
public final class MotorRotina {

  public static final int VERSAO = 2;
  public static final int MAX_AJUSTES = 30;
  public static final int MAX_VARIACAO = 1000;
  public static final int MAX_ALTERNATIVAS = 6;

  /** Pedido inválido; a mensagem é exibida ao usuário. */
  public static final class Invalido extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public Invalido(String mensagem) {
      super(mensagem);
    }
  }

  public static final class Ajuste {
    public final String sessao;
    public final int posicao;
    public final String exercicioId;

    public Ajuste(String sessao, int posicao, String exercicioId) {
      this.sessao = sessao;
      this.posicao = posicao;
      this.exercicioId = exercicioId;
    }

    Map<String, Object> toMap() {
      Map<String, Object> mapa = new LinkedHashMap<>();
      mapa.put("sessao", sessao);
      mapa.put("posicao", posicao);
      mapa.put("exercicioId", exercicioId);
      return mapa;
    }
  }

  public static final class Pedido {
    public final PerfilInterpretado perfil;
    public final int seed;
    public int variacao;
    public String estrategia;
    public Object agenda;
    /**
     * A estrutura já está na rotina salva. Não autoriza uma divisão nova: só permite continuar
     * uma programação antiga que ainda cabe nas regras de compatibilidade.
     */
    public boolean manterEstruturaSalva;
    public final List<Ajuste> ajustes = new ArrayList<>();

    public Pedido(PerfilInterpretado perfil, int seed) {
      this.perfil = perfil;
      this.seed = seed;
    }
  }

  private MotorRotina() {}

  /**
   * Lê os campos de personalização enviados pelo cliente (variação, estrutura, agenda e trocas).
   * O perfil e as preferências são lidos à parte.
   */
  public static Pedido lerPedido(Map<?, ?> corpo, PerfilInterpretado perfil, int seed) {
    Pedido pedido = new Pedido(perfil, seed);
    if (corpo == null) {
      return pedido;
    }
    Object variacao = corpo.get("variacao");
    if (variacao != null) {
      Integer valor = inteiro(variacao);
      if (valor == null || valor < 0 || valor > MAX_VARIACAO) {
        throw new Invalido("Variação inválida.");
      }
      pedido.variacao = valor;
    }
    Object estrategia = corpo.get("estrategia");
    if (estrategia != null) {
      if (!(estrategia instanceof String) || !EstrategiaSemanal.ESTRUTURAS.containsKey(estrategia)) {
        throw new Invalido("Estrutura de rotina inválida.");
      }
      pedido.estrategia = (String) estrategia;
    }
    pedido.agenda = corpo.get("agenda");
    Object ajustes = corpo.get("ajustes");
    if (ajustes != null) {
      if (!(ajustes instanceof List) || ((List<?>) ajustes).size() > MAX_AJUSTES) {
        throw new Invalido("Lista de trocas inválida.");
      }
      Map<String, Ajuste> porPosicao = new LinkedHashMap<>();
      for (Object bruto : (List<?>) ajustes) {
        if (!(bruto instanceof Map)) {
          throw new Invalido("Troca inválida.");
        }
        Map<?, ?> mapa = (Map<?, ?>) bruto;
        Object sessao = mapa.get("sessao");
        Integer posicao = inteiro(mapa.get("posicao"));
        Object exercicio = mapa.get("exercicioId");
        if (!(sessao instanceof String)
            || ((String) sessao).length() > 4
            || posicao == null
            || posicao < 1
            || posicao > 20
            || !(exercicio instanceof String)
            || ((String) exercicio).length() > 120) {
          throw new Invalido("Troca inválida.");
        }
        porPosicao.remove(sessao + ":" + posicao);
        porPosicao.put(sessao + ":" + posicao, new Ajuste((String) sessao, posicao, (String) exercicio));
      }
      pedido.ajustes.addAll(porPosicao.values());
    }
    return pedido;
  }

  static String mensagemEstruturaIndisponivel(String codigo) {
    if ("ppl_3".equals(codigo)) {
      return "Empurrar, puxar e pernas em três dias fica abaixo do volume mínimo de cada grupo. Para três dias, use corpo inteiro ou a divisão híbrida.";
    }
    return "Essa estrutura não está disponível para o seu perfil atual.";
  }

  static Integer inteiro(Object valor) {
    if (valor instanceof Integer || valor instanceof Long || valor instanceof Short) {
      long numero = ((Number) valor).longValue();
      return numero > Integer.MAX_VALUE || numero < Integer.MIN_VALUE ? null : (int) numero;
    }
    if (valor instanceof Number) {
      double d = ((Number) valor).doubleValue();
      return d == Math.rint(d) && Math.abs(d) < Integer.MAX_VALUE ? (int) d : null;
    }
    return null;
  }

  public static Proposta gerar(Pedido pedido) {
    PerfilInterpretado p = pedido.perfil;
    int n = EstrategiaSemanal.sessoes(p);
    List<EstrategiaSemanal.Estrutura> viaveis = EstrategiaSemanal.viaveis(p, n);
    EstrategiaSemanal.Estrutura estrutura = viaveis.get(0);
    if (pedido.estrategia != null) {
      estrutura = null;
      for (EstrategiaSemanal.Estrutura candidata : viaveis) {
        if (candidata.codigo.equals(pedido.estrategia)) {
          estrutura = candidata;
        }
      }
      if (estrutura == null) {
        EstrategiaSemanal.Estrutura registrada = EstrategiaSemanal.ESTRUTURAS.get(pedido.estrategia);
        boolean continuaASalva =
            pedido.manterEstruturaSalva
                && registrada != null
                && registrada.modelos.size() == n
                && !p.conservador();
        if (continuaASalva) {
          estrutura = registrada;
        }
      }
      if (estrutura == null) {
        throw new Invalido(mensagemEstruturaIndisponivel(pedido.estrategia));
      }
    }
    List<String> erros = new ArrayList<>();
    AgendaSemanal.Agenda agenda = AgendaSemanal.ler(pedido.agenda, n, erros);
    if (!erros.isEmpty()) {
      throw new Invalido(erros.get(0));
    }
    if (agenda.calendario() && agenda.dias == null) {
      agenda = new AgendaSemanal.Agenda(AgendaSemanal.CALENDARIO, AgendaSemanal.sugeridos(n));
    }

    SeletorExercicios.UsoSemanal uso = new SeletorExercicios.UsoSemanal();
    List<MontadorSessao.Sessao> sessoes = new ArrayList<>();
    for (int i = 0; i < estrutura.modelos.size(); i++) {
      sessoes.add(
          MontadorSessao.montar(
              codigo(i),
              ModelosSessao.modelo(estrutura.modelos.get(i)),
              p,
              uso,
              pedido.seed,
              pedido.variacao));
    }
    VolumeSemanal.equilibrar(sessoes, p, pedido.seed, pedido.variacao);
    VolumeSemanal.recuperarAusentes(sessoes, p, pedido.seed, pedido.variacao);
    List<Map<String, Object>> aplicados = new ArrayList<>();
    for (Ajuste ajuste : pedido.ajustes) {
      aplicados.add(aplicar(sessoes, ajuste, p));
    }
    VolumeSemanal.recuperarAusentes(sessoes, p, pedido.seed, pedido.variacao);
    for (MontadorSessao.Sessao sessao : sessoes) {
      AquecimentoSessao.aplicar(sessao.itens, sessao.minutos, p);
      avisarSePassarDoTempo(sessao);
    }
    return new Proposta(p, estrutura, viaveis, sessoes, agenda, pedido.variacao, aplicados);
  }

  private static void avisarSePassarDoTempo(MontadorSessao.Sessao sessao) {
    if (sessao.segundos() <= sessao.minutos * 60L) {
      return;
    }
    for (String aviso : sessao.avisos) {
      if (aviso.startsWith("Mesmo só com os exercícios essenciais")) {
        return;
      }
    }
    sessao.avisos.add(
        "Mesmo só com os exercícios essenciais, a estimativa passa de "
            + sessao.minutos
            + " min. As séries leves dos exercícios pesados entram nessa conta. Considere uma duração maior.");
  }

  static String codigo(int indice) {
    return String.valueOf((char) ('A' + indice));
  }

  private static Map<String, Object> aplicar(
      List<MontadorSessao.Sessao> sessoes, Ajuste ajuste, PerfilInterpretado p) {
    MontadorSessao.Sessao sessao = null;
    for (MontadorSessao.Sessao candidata : sessoes) {
      if (candidata.codigo.equals(ajuste.sessao)) {
        sessao = candidata;
      }
    }
    if (sessao == null) {
      throw new Invalido("A sessão da troca não existe nesta proposta.");
    }
    Map<String, Object> opcao = null;
    for (Map<String, Object> candidata :
        opcoesDeTroca(sessao.itens, ajuste.posicao, sessao.modelo.foco, p, sessao.minutos)) {
      if (ajuste.exercicioId.equals(candidata.get("exercicioId"))) {
        opcao = candidata;
      }
    }
    if (opcao == null) {
      throw new Invalido("A troca escolhida não é compatível com este exercício.");
    }
    int indice = indice(sessao.itens, ajuste.posicao);
    Map<String, Object> anterior = sessao.itens.get(indice);
    Map<String, Object> novo =
        prescreverTroca(
            anterior,
            ExerciseDatabase.porId(ajuste.exercicioId),
            MontadorSessao.numero(opcao.get("series")),
            p);
    sessao.itens.set(indice, novo);
    Map<String, Object> aplicado = ajuste.toMap();
    aplicado.put("de", anterior.get("nome"));
    aplicado.put("para", novo.get("nome"));
    return aplicado;
  }

  static int indice(List<Map<String, Object>> itens, int posicao) {
    for (int i = 0; i < itens.size(); i++) {
      if (MontadorSessao.numero(itens.get(i).get("posicao")) == posicao) {
        return i;
      }
    }
    throw new Invalido("Exercício não encontrado nesta sessão.");
  }

  /**
   * Opções de troca para o exercício na posição indicada. O substituto precisa trabalhar o mesmo
   * grupo muscular; o mesmo padrão de movimento vem primeiro. Equipamento, exercícios evitados e
   * limitações continuam valendo. A vaga pode listar padrões de outro grupo, e esses não entram.
   */
  public static List<Map<String, Object>> opcoesDeTroca(
      List<Map<String, Object>> itens,
      int posicao,
      String foco,
      PerfilInterpretado p,
      int minutos) {
    int indice = indice(itens, posicao);
    Map<String, Object> atual = itens.get(indice);
    String padraoAtual = String.valueOf(atual.get("padrao"));
    Set<String> padroes = new LinkedHashSet<>();
    padroes.add(padraoAtual);
    ModelosSessao.Vaga vaga =
        atual.get("vaga") instanceof String ? ModelosSessao.vaga((String) atual.get("vaga")) : null;
    if (vaga != null) {
      padroes.addAll(vaga.todosPadroes());
    }
    Set<String> ids = new LinkedHashSet<>();
    Set<String> assinaturas = new LinkedHashSet<>();
    for (int i = 0; i < itens.size(); i++) {
      if (i != indice) {
        ids.add(String.valueOf(itens.get(i).get("exercicioId")));
        assinaturas.add(SeletorExercicios.assinatura(itens.get(i)));
      }
    }
    boolean principal = Prescricao.PRINCIPAL.equals(atual.get("papel"));
    List<ExerciseDatabase.Exercise> candidatos = new ArrayList<>();
    for (ExerciseDatabase.Exercise e : SeletorExercicios.candidatos(padroes, null, p)) {
      if (!e.id.equals(atual.get("exercicioId"))
          && !ids.contains(e.id)
          && !assinaturas.contains(SeletorExercicios.assinatura(e))) {
        candidatos.add(e);
      }
    }
    String grupoAtual = VolumeSemanal.grupo(String.valueOf(atual.get("musculoPrincipalCodigo")));
    if (grupoAtual != null) {
      candidatos.removeIf(e -> !grupoAtual.equals(VolumeSemanal.grupo(e.principal)));
    }
    candidatos.sort(
        (a, b) -> {
          int porPadrao =
              Boolean.compare(b.padrao.equals(padraoAtual), a.padrao.equals(padraoAtual));
          if (porPadrao != 0) {
            return porPadrao;
          }
          int porNota =
              Double.compare(
                  SeletorExercicios.nota(b, principal, foco, null, p),
                  SeletorExercicios.nota(a, principal, foco, null, p));
          return porNota != 0 ? porNota : a.id.compareTo(b.id);
        });
    int segundosAtuais = SessionPlanner.segundosTotais(itens, minutos);
    List<Map<String, Object>> opcoes = new ArrayList<>();
    for (ExerciseDatabase.Exercise e : candidatos) {
      if (opcoes.size() >= MAX_ALTERNATIVAS) {
        break;
      }
      int series = MontadorSessao.numero(atual.get("series"));
      Map<String, Object> novo = prescreverTroca(atual, e, series, p);
      int segundos = simular(itens, indice, novo, minutos, p);
      if (segundos > minutos * 60 && MontadorSessao.numero(novo.get("series")) > 2) {
        novo = prescreverTroca(atual, e, 2, p);
        segundos = simular(itens, indice, novo, minutos, p);
      }
      if (segundos > Math.max(minutos * 60, segundosAtuais)) {
        continue;
      }
      Map<String, Object> opcao = new LinkedHashMap<>();
      opcao.put("exercicioId", e.id);
      opcao.put("nome", e.nome);
      opcao.put("padraoRotulo", novo.get("padraoRotulo"));
      opcao.put("equipamentoRotulo", novo.get("equipamentoRotulo"));
      opcao.put("mesmoPadrao", e.padrao.equals(padraoAtual));
      opcao.put("papel", novo.get("papel"));
      opcao.put("series", novo.get("series"));
      opcao.put("repeticoes", novo.get("repeticoes"));
      opcao.put("descanso", novo.get("descanso"));
      opcao.put("duracaoEstimadaMinutos", Math.max(1, (int) Math.round(segundos / 60.0)));
      opcao.put("diferencaMinutos", (int) Math.round((segundos - segundosAtuais) / 60.0));
      opcoes.add(opcao);
    }
    return opcoes;
  }

  private static int simular(
      List<Map<String, Object>> itens,
      int indice,
      Map<String, Object> novo,
      int minutos,
      PerfilInterpretado perfil) {
    List<Map<String, Object>> copia = new ArrayList<>();
    for (int i = 0; i < itens.size(); i++) {
      copia.add(i == indice ? novo : new LinkedHashMap<>(itens.get(i)));
    }
    AquecimentoSessao.aplicar(copia, minutos, perfil);
    return SessionPlanner.segundosTotais(copia, minutos);
  }

  /** Prescreve o exercício novo herdando a posição, a vaga e a prioridade do anterior. */
  public static Map<String, Object> prescreverTroca(
      Map<String, Object> anterior, ExerciseDatabase.Exercise e, int series, PerfilInterpretado p) {
    boolean principal = Prescricao.PRINCIPAL.equals(anterior.get("papel"));
    String papel = Prescricao.papel(e, principal);
    int limitado = Math.max(2, Math.min(series, Prescricao.seriesMaximas(papel, p)));
    Map<String, Object> novo = Prescricao.item(e, papel, limitado, p);
    for (String campo :
        new String[] {
          "prioridade", "vaga", "vagaRotulo", "bloco", "blocoOrdem", "ordem", "posicao", "obrigatorio", "uid"
        }) {
      if (anterior.containsKey(campo)) {
        novo.put(campo, anterior.get(campo));
      }
    }
    return novo;
  }

  /** Treino avulso com o motor novo, para um foco escolhido pelo usuário. */
  public static Map<String, Object> sessaoAvulsa(
      PerfilInterpretado perfil, String foco, int minutos, int variante, int seed) {
    String[] modelos;
    switch (foco) {
      case "superior":
        modelos = new String[] {"SUP_A", "SUP_B", "SUP_C"};
        break;
      case "inferior":
        modelos = new String[] {"INF_A", "INF_B", "INF_C"};
        break;
      case "empurrar":
        modelos = new String[] {"PUSH_A", "PUSH_B"};
        break;
      case "puxar":
        modelos = new String[] {"PULL_A", "PULL_B"};
        break;
      case "corpo_inteiro":
        modelos = new String[] {"FB_A", "FB_B", "FB_C"};
        break;
      default:
        throw new Invalido("Foco de treino inválido.");
    }
    int indice = Math.floorMod(variante, modelos.length);
    PerfilInterpretado p = perfil.comMinutos(minutos);
    MontadorSessao.Sessao sessao =
        MontadorSessao.montar(
            "X",
            ModelosSessao.modelo(modelos[indice]),
            p,
            new SeletorExercicios.UsoSemanal(),
            seed,
            Math.max(0, variante / modelos.length));
    AquecimentoSessao.aplicar(sessao.itens, sessao.minutos, p);
    Map<String, Object> mapa = sessaoComoMapa(sessao, 1, p);
    mapa.put("focoPedido", foco);
    return mapa;
  }

  static Map<String, Object> sessaoComoMapa(
      MontadorSessao.Sessao sessao, int ordem, PerfilInterpretado p) {
    String foco = sessao.modelo.foco;
    String grupamento = ModelosSessao.FOCO_GRUPAMENTO.get(foco);
    int totalSeries = 0;
    List<Map<String, Object>> exercicios = new ArrayList<>();
    for (Map<String, Object> item : sessao.itens) {
      totalSeries += MontadorSessao.numero(item.get("series"));
      exercicios.add(new LinkedHashMap<>(item));
    }
    Map<String, Object> mapa = new LinkedHashMap<>();
    mapa.put("codigo", sessao.codigo);
    mapa.put("ordem", ordem);
    mapa.put("nome", "Treino " + sessao.codigo);
    mapa.put("foco", foco);
    mapa.put("focoRotulo", ModelosSessao.FOCO_ROTULO.get(foco));
    mapa.put("grupos", ModelosSessao.FOCO_GRUPOS.get(foco));
    mapa.put("grupamento", grupamento);
    mapa.put("modelo", sessao.modelo.codigo);
    mapa.put("minutos", sessao.minutos);
    mapa.put("duracaoEstimadaMinutos", sessao.duracaoMinutos());
    mapa.put("totalSeries", totalSeries);
    mapa.put("exercicios", exercicios);
    mapa.put("cobertura", CoberturaMuscular.calcular(grupamento, sessao.itens));
    mapa.put("avisos", new ArrayList<>(sessao.avisos));
    mapa.put("removidosPorTempo", new ArrayList<>(sessao.removidosPorTempo));
    return mapa;
  }

  /** Resultado do motor: o que o usuário vê na prévia e o que é gravado ao salvar. */
  public static final class Proposta {
    public final PerfilInterpretado perfil;
    final EstrategiaSemanal.Estrutura estrutura;
    final List<EstrategiaSemanal.Estrutura> viaveis;
    final List<MontadorSessao.Sessao> sessoes;
    final AgendaSemanal.Agenda agenda;
    public final int variacao;
    final List<Map<String, Object>> ajustes;
    final List<Map<String, Object>> volume;
    final List<Map<String, Object>> sequencia;
    final List<String> avisosAgenda;
    final List<String> avisos;
    final List<Map<String, Object>> mensagens;
    final List<String> gruposDescobertos;
    final List<Map<String, Object>> explicacao;
    public final String assinatura;

    Proposta(
        PerfilInterpretado perfil,
        EstrategiaSemanal.Estrutura estrutura,
        List<EstrategiaSemanal.Estrutura> viaveis,
        List<MontadorSessao.Sessao> sessoes,
        AgendaSemanal.Agenda agenda,
        int variacao,
        List<Map<String, Object>> ajustes) {
      this.perfil = perfil;
      this.estrutura = estrutura;
      this.viaveis = viaveis;
      this.sessoes = Collections.unmodifiableList(sessoes);
      this.agenda = agenda;
      this.variacao = variacao;
      this.ajustes = ajustes;
      this.volume = VolumeSemanal.resumo(sessoes, perfil);
      this.sequencia = AgendaSemanal.sequencia(sessoes);
      this.avisosAgenda = AgendaSemanal.avisos(agenda, sessoes);
      this.gruposDescobertos = gruposDescobertos(volume, perfil);
      this.avisos = avisos(perfil, sessoes, volume);
      this.mensagens = mensagens(perfil, sessoes, volume);
      this.explicacao = ExplicacaoRotina.gerar(perfil, estrutura, sessoes, agenda, sequencia);
      this.assinatura = assinar(this);
    }

    public String estrategia() {
      return estrutura.codigo;
    }

    public int totalSessoes() {
      return sessoes.size();
    }

    public String motivoMenosSessoes() {
      return PerfilInterpretado.motivoMenosSessoes(perfil, sessoes.size());
    }

    public String modoAgenda() {
      return agenda.modo;
    }

    public List<Integer> diasAgenda() {
      return agenda.dias == null ? new ArrayList<>() : new ArrayList<>(agenda.dias);
    }

    public List<Map<String, Object>> sessoesComoMapa() {
      List<Map<String, Object>> lista = new ArrayList<>();
      for (int i = 0; i < sessoes.size(); i++) {
        lista.add(sessaoComoMapa(sessoes.get(i), i + 1, perfil));
      }
      return lista;
    }

    public Map<String, Object> toMap() {
      Map<String, Object> mapa = new LinkedHashMap<>();
      mapa.put("motorVersao", VERSAO);
      mapa.put("perfil", perfil.resumo());
      mapa.put("preferencias", perfil.preferencias.toDocument());
      mapa.put("estrategia", estrutura.toMap());
      List<Map<String, Object>> alternativas = new ArrayList<>();
      for (EstrategiaSemanal.Estrutura viavel : viaveis) {
        if (!viavel.codigo.equals(estrutura.codigo)) {
          alternativas.add(viavel.toMap());
        }
      }
      mapa.put("alternativas", alternativas);
      mapa.put("sessoesPorSemana", sessoes.size());
      String motivo = motivoMenosSessoes();
      if (motivo != null) {
        mapa.put("motivoMenosSessoes", motivo);
      }
      Map<String, Object> agendaMapa = agenda.toMap();
      agendaMapa.put("sugeridos", new ArrayList<>(AgendaSemanal.sugeridos(sessoes.size())));
      mapa.put("agenda", agendaMapa);
      mapa.put("avisosAgenda", new ArrayList<>(avisosAgenda));
      mapa.put("sequencia", sequencia);
      mapa.put("sessoes", sessoesComoMapa());
      mapa.put("volume", volume);
      mapa.put("gruposDescobertos", new ArrayList<>(gruposDescobertos));
      mapa.put("coberturaCompleta", gruposDescobertos.isEmpty());
      mapa.put("explicacao", explicacao);
      mapa.put("avisos", new ArrayList<>(avisos));
      mapa.put("mensagens", copiarMensagens(mensagens));
      mapa.put("variacao", variacao);
      mapa.put("ajustes", ajustes);
      mapa.put("assinatura", assinatura);
      return mapa;
    }
  }

  static List<String> avisos(
      PerfilInterpretado p,
      List<MontadorSessao.Sessao> sessoes,
      List<Map<String, Object>> volume) {
    List<String> avisos = new ArrayList<>();
    if (p.reavaliacao) {
      avisos.add(
          "Você já registrou várias sessões desde que informou estar começando. Se quiser, atualize a experiência antes de salvar uma programação nova. Nada muda sem a sua confirmação.");
    }
    boolean cortesPorTempo = false;
    boolean faltaramExercicios = false;
    for (MontadorSessao.Sessao sessao : sessoes) {
      for (String aviso : sessao.avisos) {
        avisos.add("Treino " + sessao.codigo + ": " + aviso);
      }
      cortesPorTempo |= !sessao.removidosPorTempo.isEmpty();
      faltaramExercicios |= !sessao.vagasSemExercicio.isEmpty();
    }
    List<String> abaixo = new ArrayList<>();
    for (Map<String, Object> linha : volume) {
      if ("abaixo".equals(linha.get("status"))) {
        abaixo.add(
            String.valueOf(linha.get("rotulo")).toLowerCase(Locale.ROOT)
                + " ("
                + numero(linha.get("efetivas"))
                + " de "
                + linha.get("minimo")
                + " séries)");
      }
    }
    if (cortesPorTempo && "forca".equals(p.objetivo) && p.minutos <= 45) {
      avisos.add(
          "Treinos de força pedem descansos longos (2 a 3 min). Com "
              + p.minutos
              + " min, cada sessão comporta só os exercícios principais; com 60 min ou mais, os complementares voltam.");
    }
    for (Map<String, Object> linha : volume) {
      double efetivas =
          linha.get("efetivas") instanceof Number ? ((Number) linha.get("efetivas")).doubleValue() : 0;
      int minimo = linha.get("minimo") instanceof Number ? ((Number) linha.get("minimo")).intValue() : 0;
      if (minimo <= 0 || efetivas > 0.01) {
        continue;
      }
      String codigo = String.valueOf(linha.get("codigo"));
      String rotulo = String.valueOf(linha.get("rotulo"));
      boolean compativel = VolumeSemanal.existeCompativel(codigo, p);
      boolean grande = VolumeSemanal.GRANDES.contains(codigo);
      if (grande || !compativel) {
        String ajuste =
            compativel
                ? "O tempo da sessão não coube um movimento desse grupo. Aumente a duração para incluí-lo."
                : "Não há exercício compatível com os equipamentos, as limitações ou os exercícios evitados. Ajuste essas preferências.";
        avisos.add(rotulo + " ficou sem estímulo nesta semana. " + ajuste);
      } else {
        avisos.add(
            rotulo
                + " não entrou nesta semana porque o tempo da sessão não coube. Aumente a duração para incluir um exercício desse grupo.");
      }
    }
    if (!abaixo.isEmpty()) {
      String motivo =
          cortesPorTempo
              ? "o tempo disponível por sessão"
              : faltaramExercicios
                  ? "a falta de exercícios compatíveis com suas preferências"
                  : sessoes.size() <= 2
                      ? "o número de sessões por semana"
                      : "o limite de séries por sessão";
      avisos.add(
          "Alguns músculos ficam com menos séries do que o ideal nesta semana. O principal motivo é "
              + motivo
              + ".");
    }
    if (p.lacunas.contains("experiência")) {
      avisos.add("Seu perfil não informa a experiência em musculação; a rotina usa a abordagem mais conservadora.");
    }
    return avisos;
  }

  /**
   * Classificação para a prévia. O texto longo continua em {@code avisos}; aqui só entra o que a
   * tela deve tratar de forma diferente. Regras internas do motor não viram mensagem.
   */
  static List<Map<String, Object>> mensagens(
      PerfilInterpretado p,
      List<MontadorSessao.Sessao> sessoes,
      List<Map<String, Object>> volume) {
    List<Map<String, Object>> lista = new ArrayList<>();
    if (p.reavaliacao) {
      lista.add(mensagem("reavaliacao", "observacao", "Você pode atualizar a experiência.", "experiencia"));
    }
    List<String> semPreferencia = new ArrayList<>();
    List<String> semTempo = new ArrayList<>();
    List<String> foraDoTempo = new ArrayList<>();
    for (Map<String, Object> linha : volume) {
      double efetivas =
          linha.get("efetivas") instanceof Number ? ((Number) linha.get("efetivas")).doubleValue() : 0;
      int minimo = linha.get("minimo") instanceof Number ? ((Number) linha.get("minimo")).intValue() : 0;
      if (minimo <= 0 || efetivas > 0.01) {
        continue;
      }
      String codigo = String.valueOf(linha.get("codigo"));
      String rotulo = String.valueOf(linha.get("rotulo"));
      boolean compativel = VolumeSemanal.existeCompativel(codigo, p);
      if (VolumeSemanal.GRANDES.contains(codigo) || !compativel) {
        (compativel ? semTempo : semPreferencia).add(rotulo);
      } else {
        foraDoTempo.add(rotulo);
      }
    }
    if (!semPreferencia.isEmpty()) {
      lista.add(
          mensagem(
              "sem_estimulo",
              "bloqueio",
              fraseGrupos(semPreferencia, "ficou", "ficaram")
                  + " sem exercício compatível. Ajuste equipamentos, limitações ou exercícios evitados.",
              "preferencias"));
    }
    if (!semTempo.isEmpty()) {
      lista.add(
          mensagem(
              "sem_estimulo_tempo",
              "bloqueio",
              fraseGrupos(semTempo, "ficou", "ficaram") + " sem exercício porque o tempo não coube.",
              "duracao"));
    }
    if (semPreferencia.isEmpty()) {
      Map<String, Object> falta = faltaDeExercicio(sessoes);
      if (falta != null) {
        lista.add(falta);
      }
    }
    boolean cortesPorTempo = false;
    boolean passouDoTempo = false;
    for (MontadorSessao.Sessao sessao : sessoes) {
      cortesPorTempo |= !sessao.removidosPorTempo.isEmpty();
      passouDoTempo |= sessao.segundos() > sessao.minutos * 60L;
    }
    if (!foraDoTempo.isEmpty()) {
      lista.add(
          mensagem(
              "fora_tempo",
              "observacao",
              fraseGrupos(foraDoTempo, "ficou", "ficaram") + " de fora pelo tempo disponível.",
              "duracao"));
    } else if (cortesPorTempo && "forca".equals(p.objetivo) && p.minutos <= 45) {
      lista.add(
          mensagem(
              "forca_curta",
              "observacao",
              "Com este tempo, a força fica nos exercícios principais.",
              "duracao"));
    } else if (passouDoTempo) {
      lista.add(
          mensagem(
              "tempo_sessao",
              "observacao",
              "A estimativa passa do tempo escolhido.",
              "duracao"));
    }
    return lista;
  }

  private static Map<String, Object> faltaDeExercicio(List<MontadorSessao.Sessao> sessoes) {
    Set<String> motivos = new LinkedHashSet<>();
    List<String> nomes = new ArrayList<>();
    for (MontadorSessao.Sessao sessao : sessoes) {
      for (Map<String, Object> ocorrencia : sessao.ocorrencias) {
        if (!"sem_exercicio".equals(ocorrencia.get("codigo"))) {
          continue;
        }
        String nome = String.valueOf(ocorrencia.get("rotulo")).toLowerCase(Locale.ROOT);
        if (!nomes.contains(nome)) {
          nomes.add(nome);
        }
        Object motivo = ocorrencia.get("motivo");
        if (motivo != null && !String.valueOf(motivo).isEmpty()) {
          motivos.add(String.valueOf(motivo));
        }
      }
    }
    if (nomes.isEmpty()) {
      return null;
    }
    String detalhe = "";
    if (motivos.size() == 1) {
      switch (motivos.iterator().next()) {
        case "equipamento":
          detalhe = " com os equipamentos disponíveis";
          break;
        case "limitacao":
          detalhe = " com as limitações informadas";
          break;
        case "evitado":
          detalhe = " sem os exercícios que você pediu para evitar";
          break;
        default:
          break;
      }
    }
    return mensagem(
        "sem_exercicio",
        "atencao",
        "Não há exercício compatível para " + AgendaSemanal.juntar(nomes) + detalhe + ".",
        "preferencias");
  }

  private static String fraseGrupos(List<String> grupos, String um, String varios) {
    if (grupos.size() == 1) {
      return grupos.get(0) + " " + um;
    }
    return AgendaSemanal.juntar(grupos) + " " + varios;
  }

  private static Map<String, Object> mensagem(String codigo, String nivel, String resumo, String acao) {
    Map<String, Object> mapa = new LinkedHashMap<>();
    mapa.put("codigo", codigo);
    mapa.put("nivel", nivel);
    mapa.put("resumo", resumo);
    if (acao != null) {
      mapa.put("acao", acao);
    }
    return mapa;
  }

  private static List<Map<String, Object>> copiarMensagens(List<Map<String, Object>> mensagens) {
    List<Map<String, Object>> copia = new ArrayList<>();
    for (Map<String, Object> mensagem : mensagens) {
      copia.add(new LinkedHashMap<>(mensagem));
    }
    return copia;
  }

  static List<String> gruposDescobertos(List<Map<String, Object>> volume, PerfilInterpretado perfil) {
    List<String> grupos = new ArrayList<>();
    for (Map<String, Object> linha : volume) {
      double efetivas =
          linha.get("efetivas") instanceof Number ? ((Number) linha.get("efetivas")).doubleValue() : 0;
      int minimo = linha.get("minimo") instanceof Number ? ((Number) linha.get("minimo")).intValue() : 0;
      String codigo = String.valueOf(linha.get("codigo"));
      boolean semExercicio = !VolumeSemanal.existeCompativel(codigo, perfil);
      if (minimo > 0 && efetivas <= 0.01 && (VolumeSemanal.GRANDES.contains(codigo) || semExercicio)) {
        grupos.add(String.valueOf(linha.get("rotulo")));
      }
    }
    return grupos;
  }

  static String numero(Object valor) {
    if (!(valor instanceof Number)) {
      return String.valueOf(valor);
    }
    double d = ((Number) valor).doubleValue();
    if (d == Math.rint(d)) {
      return String.valueOf((long) d);
    }
    return String.format(Locale.ROOT, "%.1f", d).replace('.', ',');
  }

  /** Assinatura do conteúdo de treino. A agenda fica de fora: mudar dias não cria nova versão. */
  static String assinar(Proposta proposta) {
    PerfilInterpretado p = proposta.perfil;
    StringBuilder texto =
        new StringBuilder("v")
            .append(VERSAO)
            .append('|')
            .append(proposta.estrutura.codigo)
            .append('|')
            .append(p.objetivo)
            .append('|')
            .append(p.nivelTecnico)
            .append('|')
            .append(p.capacidade)
            .append('|')
            .append(p.dias)
            .append('|')
            .append(p.minutos)
            .append('|')
            .append(p.preferencias.canonico())
            .append('|')
            .append(proposta.variacao);
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      texto.append('|').append(sessao.codigo).append(':').append(sessao.modelo.codigo);
      for (Map<String, Object> item : sessao.itens) {
        texto
            .append(';')
            .append(item.get("exercicioId"))
            .append('x')
            .append(item.get("series"))
            .append('@')
            .append(item.get("repeticoes"));
      }
    }
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(texto.toString().getBytes(StandardCharsets.UTF_8));
      StringBuilder hex = new StringBuilder();
      for (byte b : hash) {
        hex.append(String.format("%02x", b));
      }
      return hex.toString();
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 indisponível", e);
    }
  }
}
