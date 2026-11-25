package com.healgym.service.rotina;

import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.bson.types.ObjectId;

/**
 * Acesso a dados das rotinas. Toda operação recebe o usuário e filtra por ele.
 *
 * <p>Garantias esperadas da implementação (no Mongo, por índices únicos):
 *
 * <ul>
 *   <li>no máximo uma rotina por par (usuário, versão);
 *   <li>no máximo uma instância aberta ({@code realizado: false}) por (usuário, rotina, sessão);
 *   <li>no máximo uma execução sequencial aberta por usuário ({@code sequenciaAberta}).
 * </ul>
 */
public interface RotinaArmazem {

  /** Rotina de maior versão do usuário (a ativa), ou {@code null}. */
  Document ativa(ObjectId usuario);

  /** Qualquer versão da rotina, desde que pertença ao usuário. */
  Document rotina(ObjectId usuario, ObjectId id);

  /** Insere uma nova versão; {@code false} se essa versão já existe para o usuário. */
  boolean inserirRotina(Document rotina);

  /** Marca como substituídas as versões anteriores a {@code versaoAtual}. Não apaga nada. */
  void substituirAnteriores(ObjectId usuario, int versaoAtual, Date quando);

  /**
   * Atualiza campos da rotina só se a revisão ainda for a esperada, incrementando-a.
   *
   * @return {@code false} se a rotina mudou desde a leitura
   */
  boolean atualizarRotina(ObjectId usuario, ObjectId id, int revisaoEsperada, Document campos);

  /** Treinos criados a partir da rotina, concluídos ou não. */
  List<Document> instancias(ObjectId usuario, ObjectId rotinaId);

  /** Fichas da mesma programação semanal do usuário, na ordem gravada. */
  List<Document> doPrograma(ObjectId usuario, String chave);

  /** Instância aberta da sessão, se houver. */
  Document instanciaAberta(ObjectId usuario, ObjectId rotinaId, String codigo);

  /** Insere a instância; {@code false} se já existe uma aberta para a mesma sessão. */
  boolean inserirInstancia(Document treino);

  /**
   * Reserva a única execução sequencial aberta do usuário para este treino.
   * {@code false} se outro treino já ocupa essa vaga. A disputa é atômica.
   */
  boolean reivindicarExecucao(ObjectId usuario, ObjectId treinoId);

  /** Solta a vaga se ela ainda apontar para este treino. Não apaga a ficha nem a execução. */
  void liberarExecucao(ObjectId usuario, ObjectId treinoId);

  /**
   * Treino que já reservou a vaga, ou {@code null} se ninguém reservou ou se a reserva está numa
   * ficha já concluída.
   */
  ObjectId execucaoReservada(ObjectId usuario);

  /** Fichas sequenciais ainda não concluídas. A ordem entre programações diferentes não é decidida aqui. */
  List<Document> sequenciaisAbertas(ObjectId usuario);

  /** Execuções registradas para os treinos indicados, por id do treino. */
  Map<ObjectId, Document> execucoes(ObjectId usuario, Collection<ObjectId> treinos);

  /** Quantidade de treinos concluídos desde a data, de qualquer origem. */
  long concluidosDesde(ObjectId usuario, Date desde);

  /**
   * Treinos concluídos desde a data que têm ao menos uma série marcada como feita. Um treino só
   * marcado como realizado, sem série, não entra.
   */
  long concluidosVerificados(ObjectId usuario, Date desde);
}
