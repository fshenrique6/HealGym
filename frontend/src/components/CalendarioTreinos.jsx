import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiX,
} from 'react-icons/fi';
import api from '../services/api';
import { descreverSeries, rotuloDivisao, uidDoExercicio } from '../utils/treinoExecucao';
import {
  Cabecalho,
  cascaDialogo,
  Corpo,
  Fechar,
  Identidade,
  IdentidadeTexto,
  Marca,
  Overlay,
  Titulo,
} from './modalPainelEstilos';

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const chaveLocal = (data) => `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;

const dataDaChave = (chave) => {
  const [ano, mes, dia] = chave.split('-').map(Number);
  return new Date(ano, mes, dia);
};

const instanteTreino = (treino) => {
  const bruto = treino?.dataRealizacao || treino?.createdAt;
  if (!bruto) return null;
  const data = new Date(bruto);
  return Number.isNaN(data.getTime()) ? null : data;
};

const agruparPorDia = (treinos) => {
  const mapa = new Map();
  treinos.forEach((treino) => {
    if (treino?.realizado !== true) return;
    const data = instanteTreino(treino);
    if (!data) return;
    const chave = chaveLocal(data);
    const lista = mapa.get(chave) || [];
    lista.push(treino);
    mapa.set(chave, lista);
  });
  mapa.forEach((lista) => {
    lista.sort((a, b) => instanteTreino(a) - instanteTreino(b));
  });
  return mapa;
};

const semanasDoMes = (ano, mes) => {
  const primeiro = new Date(ano, mes, 1);
  const deslocamento = (primeiro.getDay() + 6) % 7;
  const quantidade = new Date(ano, mes + 1, 0).getDate();
  const celulas = Array.from({ length: deslocamento }, () => null);
  for (let dia = 1; dia <= quantidade; dia += 1) {
    celulas.push(new Date(ano, mes, dia));
  }
  while (celulas.length % 7 !== 0) celulas.push(null);
  const linhas = [];
  for (let indice = 0; indice < celulas.length; indice += 7) {
    linhas.push(celulas.slice(indice, indice + 7));
  }
  return linhas;
};

const limitarMes = (ano, mes) => {
  const agora = new Date();
  const maximo = agora.getFullYear() * 12 + agora.getMonth();
  const minimo = 1970 * 12;
  let absoluto = ano * 12 + mes;
  if (absoluto > maximo) absoluto = maximo;
  if (absoluto < minimo) absoluto = minimo;
  return { ano: Math.floor(absoluto / 12), mes: absoluto % 12 };
};

const tituloDia = (data) => {
  const texto = data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const rotuloAcessivel = (data, quantidade, hoje) => {
  const quando = data.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const registro =
    quantidade === 0
      ? 'nenhum treino registrado'
      : quantidade === 1
        ? '1 treino realizado'
        : `${quantidade} treinos realizados`;
  return hoje ? `${quando}, hoje, ${registro}` : `${quando}, ${registro}`;
};

const divisaoDoTreino = (treino) =>
  [rotuloDivisao(treino), treino?.letraTreino ? `Treino ${treino.letraTreino}` : null]
    .filter(Boolean)
    .join(' · ');

const duracaoRegistrada = (treino) => {
  const segundos = Number(treino?.duracaoRealSegundos);
  if (!Number.isFinite(segundos) || segundos <= 0) return null;
  return `${Math.max(1, Math.round(segundos / 60))} min`;
};

const tempoPrevisto = (treino) => {
  const minutos = Number(treino?.tempoDisponivel);
  if (!Number.isFinite(minutos) || minutos <= 0) return null;
  return `${Math.round(minutos)} min`;
};

const horaRegistrada = (treino) => {
  const data = treino?.dataRealizacao ? new Date(treino.dataRealizacao) : null;
  if (!data || Number.isNaN(data.getTime())) return null;
  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const temMedida = (serie) => {
  const temCarga = serie?.carga !== null && serie?.carga !== undefined && serie?.carga !== '';
  const temReps =
    serie?.repeticoes !== null && serie?.repeticoes !== undefined && serie?.repeticoes !== '';
  return temCarga || temReps;
};

const seriesDoExercicio = (exercicio, indice, execucao) => {
  if (!execucao || !Array.isArray(execucao.exercicios)) return [];
  const uid = uidDoExercicio(exercicio, indice);
  const entrada = execucao.exercicios.find((item) => item?.uid === uid);
  if (!entrada || !Array.isArray(entrada.series)) return [];
  return entrada.series.filter((serie) => Boolean(serie?.concluida) || temMedida(serie));
};

const textoSeries = (series) => {
  const comMedidas = series.filter(temMedida);
  const soConcluidas = series.filter((serie) => serie?.concluida && !temMedida(serie));
  const partes = [];
  if (comMedidas.length > 0) partes.push(descreverSeries(comMedidas));
  if (soConcluidas.length === 1)
    partes.push('1 série concluída, sem carga ou repetições informadas');
  if (soConcluidas.length > 1) {
    partes.push(`${soConcluidas.length} séries concluídas, sem carga ou repetições informadas`);
  }
  return partes.join(' · ');
};

const HOVER = { scale: 1.02 };
const TOQUE = { scale: 0.98 };
const HOVER_ICONE = { scale: 1.05 };
const TOQUE_ICONE = { scale: 0.95 };
const MOLA_MODAL = { type: 'spring', duration: 0.5 };
const MOLA_PAINEL = { type: 'spring', duration: 0.4 };

const CalendarioTreinos = ({ aberto, onFechar }) => {
  const navigate = useNavigate();
  const tituloId = useId();
  const mesId = useId();
  const dialogRef = useRef(null);
  const fecharRef = useRef(null);
  const pedido = useRef(0);
  const moverFoco = useRef(false);
  const selecionadoRef = useRef(null);
  const onFecharRef = useRef(onFechar);
  const abertoRef = useRef(aberto);
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState(() => new Date().getMonth());
  const [foco, setFoco] = useState(() => chaveLocal(new Date()));
  const [selecionado, setSelecionado] = useState(null);
  const [treinos, setTreinos] = useState([]);
  const [mesCarregado, setMesCarregado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [truncado, setTruncado] = useState(false);
  const [execucoes, setExecucoes] = useState({});
  const [carregandoExecucao, setCarregandoExecucao] = useState(false);
  const [visivel, setVisivel] = useState(aberto);
  const [abertoAntes, setAbertoAntes] = useState(aberto);

  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto);
    if (aberto) {
      const hoje = new Date();
      setAno(hoje.getFullYear());
      setMes(hoje.getMonth());
      setFoco(chaveLocal(hoje));
      setSelecionado(null);
      setTreinos([]);
      setMesCarregado(null);
      setErro('');
      setTruncado(false);
      setExecucoes({});
      setCarregando(true);
      setVisivel(true);
    }
  }

  selecionadoRef.current = selecionado;
  onFecharRef.current = onFechar;
  abertoRef.current = aberto;

  const agora = new Date();
  const chaveHoje = chaveLocal(agora);
  const chaveMes = `${ano}-${mes}`;
  const pronto = mesCarregado === chaveMes && !carregando && !erro;
  const agrupados = agruparPorDia(pronto ? treinos : []);
  const semanas = semanasDoMes(ano, mes);
  const noMesAtual = ano === agora.getFullYear() && mes === agora.getMonth();
  const noInicio = ano === 1970 && mes === 0;
  const podeAvancarAno =
    new Date(ano + 1, mes, 1) <= new Date(agora.getFullYear(), agora.getMonth(), 1);
  const listaSelecionada = selecionado ? agrupados.get(selecionado) || [] : [];
  const dataSelecionada = selecionado ? dataDaChave(selecionado) : null;
  const mensagem = carregando
    ? 'Carregando treinos...'
    : erro
      ? erro
      : pronto && treinos.length === 0
        ? 'Nenhum treino realizado neste mês.'
        : pronto && truncado
          ? 'Há registros demais neste mês. A lista pode estar incompleta.'
          : '';

  useEffect(() => {
    if (aberto) setVisivel(true);
  }, [aberto]);

  useEffect(() => {
    if (!visivel) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const quadro = window.requestAnimationFrame(() => {
      if (abertoRef.current) fecharRef.current?.focus();
    });

    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        evento.stopPropagation();
        if (selecionadoRef.current) {
          setSelecionado(null);
          return;
        }
        onFecharRef.current();
        return;
      }
      if (evento.key !== 'Tab' || !dialogRef.current) return;
      const focaveis = Array.from(
        dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((elemento) => !elemento.disabled);
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', aoTeclar);
    return () => {
      window.cancelAnimationFrame(quadro);
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [visivel]);

  useEffect(() => {
    if (!aberto) return undefined;
    let cancelado = false;
    const id = pedido.current + 1;
    pedido.current = id;
    const anoPedido = ano;
    const mesPedido = mes;
    setCarregando(true);
    setErro('');
    const inicio = new Date(anoPedido, mesPedido, 1);
    const fim = new Date(anoPedido, mesPedido + 1, 1);

    api
      .getCompletedWorkouts(inicio.toISOString(), fim.toISOString())
      .then((resposta) => {
        if (cancelado || pedido.current !== id || !abertoRef.current) return;
        if (!resposta?.success || !Array.isArray(resposta.data)) {
          setTreinos([]);
          setTruncado(false);
          setMesCarregado(`${anoPedido}-${mesPedido}`);
          setErro('Não foi possível carregar os treinos deste mês.');
          return;
        }
        setTreinos(resposta.data);
        setTruncado(Boolean(resposta.truncado));
        setMesCarregado(`${anoPedido}-${mesPedido}`);
        setErro('');
      })
      .catch(() => {
        if (cancelado || pedido.current !== id || !abertoRef.current) return;
        setTreinos([]);
        setTruncado(false);
        setMesCarregado(`${anoPedido}-${mesPedido}`);
        setErro('Não foi possível carregar os treinos deste mês.');
      })
      .finally(() => {
        if (!cancelado && pedido.current === id) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [aberto, ano, mes]);

  useEffect(() => {
    if (!moverFoco.current) return;
    moverFoco.current = false;
    dialogRef.current?.querySelector(`[data-dia="${foco}"]`)?.focus();
  }, [foco, ano, mes]);

  useEffect(() => {
    if (!selecionado || !pronto) return undefined;
    const lista = agruparPorDia(treinos).get(selecionado) || [];
    if (lista.length === 0) {
      setExecucoes({});
      setCarregandoExecucao(false);
      return undefined;
    }

    let cancelado = false;
    setCarregandoExecucao(true);
    Promise.all(
      lista.map(async (treino) => {
        if (!treino?._id) return [null, { estado: 'vazio', dados: null }];
        try {
          const resposta = await api.getWorkoutExecution(treino._id);
          if (!resposta?.success) return [treino._id, { estado: 'erro', dados: null }];
          return [
            treino._id,
            {
              estado: resposta.data ? 'ok' : 'vazio',
              dados: resposta.data || null,
            },
          ];
        } catch {
          return [treino._id, { estado: 'erro', dados: null }];
        }
      }),
    ).then((pares) => {
      if (cancelado) return;
      const mapa = {};
      pares.forEach(([id, info]) => {
        if (id) mapa[id] = info;
      });
      setExecucoes(mapa);
      setCarregandoExecucao(false);
    });

    return () => {
      cancelado = true;
    };
  }, [selecionado, treinos, pronto]);

  const irPara = (novoAno, novoMes, mover) => {
    const destino = limitarMes(novoAno, novoMes);
    const hoje = new Date();
    const dia =
      destino.ano === hoje.getFullYear() && destino.mes === hoje.getMonth()
        ? hoje
        : new Date(destino.ano, destino.mes, 1);
    if (mover) moverFoco.current = true;
    setAno(destino.ano);
    setMes(destino.mes);
    setFoco(chaveLocal(dia));
    setSelecionado(null);
  };

  const focarData = (data) => {
    const hoje = new Date();
    const candidato = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const primeiro = new Date(1970, 0, 1);
    if (candidato < primeiro || candidato > ultimo) return;
    moverFoco.current = true;
    setAno(candidato.getFullYear());
    setMes(candidato.getMonth());
    setFoco(chaveLocal(candidato));
  };

  const escolher = (data) => {
    if (!pronto) return;
    const chave = chaveLocal(data);
    setFoco(chave);
    setSelecionado((atual) => (atual === chave ? null : chave));
  };

  const aoTeclarDia = (evento, data) => {
    const passos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      escolher(data);
      return;
    }
    if (evento.key === 'Home') {
      evento.preventDefault();
      focarData(new Date(ano, mes, 1));
      return;
    }
    if (evento.key === 'End') {
      evento.preventDefault();
      focarData(new Date(ano, mes + 1, 0));
      return;
    }
    if (evento.key === 'PageUp') {
      evento.preventDefault();
      irPara(ano, mes - 1, true);
      return;
    }
    if (evento.key === 'PageDown') {
      evento.preventDefault();
      irPara(ano, mes + 1, true);
      return;
    }
    const passo = passos[evento.key];
    if (!passo) return;
    evento.preventDefault();
    focarData(new Date(data.getFullYear(), data.getMonth(), data.getDate() + passo));
  };

  const voltarHoje = () => {
    const hoje = new Date();
    moverFoco.current = true;
    setAno(hoje.getFullYear());
    setMes(hoje.getMonth());
    setFoco(chaveLocal(hoje));
    setSelecionado(null);
  };

  return createPortal(
    <AnimatePresence onExitComplete={() => !abertoRef.current && setVisivel(false)}>
      {aberto && (
        <OverlayCalendario
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onFechar}
        >
          <Dialogo
            ref={dialogRef}
            id="calendario-treinos"
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            initial={{ opacity: 0, scale: 0.9, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            transition={MOLA_MODAL}
            onClick={(evento) => evento.stopPropagation()}
          >
            <Cabecalho>
              <Identidade>
                <Marca aria-hidden="true">
                  <FiCalendar />
                </Marca>
                <IdentidadeTexto>
                  <Titulo id={tituloId}>Calendário de treinos</Titulo>
                </IdentidadeTexto>
              </Identidade>
              <Fechar
                as={motion.button}
                ref={fecharRef}
                type="button"
                aria-label="Fechar calendário"
                onClick={onFechar}
                whileHover={{ rotate: 90 }}
                whileTap={TOQUE_ICONE}
                transition={{ duration: 0.3 }}
              >
                <FiX />
              </Fechar>
            </Cabecalho>
            <CorpoCalendario>
              <AreaFixa>
              <Navegacao>
                <GrupoSetas>
                  <Seta
                    type="button"
                    aria-label="Ano anterior"
                    disabled={noInicio}
                    onClick={() => irPara(ano - 1, mes, false)}
                    whileHover={noInicio ? undefined : HOVER_ICONE}
                    whileTap={noInicio ? undefined : TOQUE_ICONE}
                  >
                    <FiChevronsLeft />
                  </Seta>
                  <Seta
                    type="button"
                    aria-label="Mês anterior"
                    disabled={noInicio}
                    onClick={() => irPara(ano, mes - 1, false)}
                    whileHover={noInicio ? undefined : HOVER_ICONE}
                    whileTap={noInicio ? undefined : TOQUE_ICONE}
                  >
                    <FiChevronLeft />
                  </Seta>
                </GrupoSetas>
                <MesSlot>
                  <AnimatePresence mode="wait">
                    <MesAtual
                      key={chaveMes}
                      id={mesId}
                      aria-live="polite"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      {MESES[mes]} {ano}
                    </MesAtual>
                  </AnimatePresence>
                </MesSlot>
                <GrupoSetas>
                  <Seta
                    type="button"
                    aria-label="Próximo mês"
                    disabled={noMesAtual}
                    onClick={() => irPara(ano, mes + 1, false)}
                    whileHover={noMesAtual ? undefined : HOVER_ICONE}
                    whileTap={noMesAtual ? undefined : TOQUE_ICONE}
                  >
                    <FiChevronRight />
                  </Seta>
                  <Seta
                    type="button"
                    aria-label="Próximo ano"
                    disabled={!podeAvancarAno}
                    onClick={() => irPara(ano + 1, mes, false)}
                    whileHover={podeAvancarAno ? HOVER_ICONE : undefined}
                    whileTap={podeAvancarAno ? TOQUE_ICONE : undefined}
                  >
                    <FiChevronsRight />
                  </Seta>
                </GrupoSetas>
                <BotaoHoje type="button" onClick={voltarHoje} whileHover={HOVER} whileTap={TOQUE}>
                  Hoje
                </BotaoHoje>
              </Navegacao>

              <Grade role="grid" aria-labelledby={mesId} aria-busy={carregando}>
                <Linha role="row">
                  {SEMANA.map((dia) => (
                    <Coluna key={dia} role="columnheader">
                      {dia}
                    </Coluna>
                  ))}
                </Linha>
                <AnimatePresence mode="wait">
                  <Semanas
                    key={chaveMes}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                  >
                {semanas.map((linha, indiceLinha) => (
                  <Linha role="row" key={`semana-${indiceLinha}`}>
                    {linha.map((data, indiceDia) => {
                      if (!data) {
                        return (
                          <Vazio key={`vazio-${indiceLinha}-${indiceDia}`} aria-hidden="true" />
                        );
                      }
                      const chave = chaveLocal(data);
                      const quantidade = agrupados.get(chave)?.length || 0;
                      const hoje = chave === chaveHoje;
                      const rotulo = pronto
                        ? rotuloAcessivel(data, quantidade, hoje)
                        : data.toLocaleDateString('pt-BR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          });
                      return (
                        <Dia
                          key={chave}
                          type="button"
                          role="gridcell"
                          data-dia={chave}
                          tabIndex={chave === foco ? 0 : -1}
                          $hoje={hoje}
                          $realizado={quantidade > 0}
                          $selecionado={chave === selecionado}
                          aria-current={hoje ? 'date' : undefined}
                          aria-selected={chave === selecionado}
                          aria-label={rotulo}
                          onClick={() => escolher(data)}
                          onKeyDown={(evento) => aoTeclarDia(evento, data)}
                          whileHover={HOVER}
                          whileTap={TOQUE}
                        >
                          <Numero>{data.getDate()}</Numero>
                          {quantidade > 0 && (
                            <Indicadores aria-hidden="true">
                              <Ponto />
                              {quantidade > 1 && <Contagem>{quantidade}</Contagem>}
                            </Indicadores>
                          )}
                        </Dia>
                      );
                    })}
                  </Linha>
                ))}
                  </Semanas>
                </AnimatePresence>
              </Grade>

              <EstadoSlot>
                <AnimatePresence mode="wait">
                  {mensagem && (
                    <Estado
                      key={mensagem}
                      role="status"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      {mensagem}
                    </Estado>
                  )}
                </AnimatePresence>
              </EstadoSlot>

              <Legenda>
                <ItemLegenda>
                  <Amostra $tipo="realizado" aria-hidden="true" />
                  Treino realizado
                </ItemLegenda>
                <ItemLegenda>
                  <Amostra $tipo="hoje" aria-hidden="true" />
                  Dia atual
                </ItemLegenda>
                <ItemLegenda>
                  <Amostra $tipo="neutro" aria-hidden="true" />
                  Sem registro
                </ItemLegenda>
              </Legenda>
              <Nota>
                Dias sem marcação não indicam descanso nem falha. O calendário mostra somente
                treinos registrados como realizados.
              </Nota>
            </AreaFixa>

              <AreaDetalhe>
              <AnimatePresence mode="wait">
              {dataSelecionada && (
                <Detalhe
                  key={selecionado}
                  aria-live="polite"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <DetalheTitulo>{tituloDia(dataSelecionada)}</DetalheTitulo>
                  {listaSelecionada.length === 0 ? (
                    <DetalheVazio>Nenhum treino registrado neste dia.</DetalheVazio>
                  ) : (
                    listaSelecionada.map((treino, indice) => {
                      const execucao = treino._id ? execucoes[treino._id] : null;
                      const divisao = divisaoDoTreino(treino);
                      const duracao = duracaoRegistrada(treino);
                      const previsto = tempoPrevisto(treino);
                      const hora = horaRegistrada(treino);
                      const exercicios = Array.isArray(treino.exercicios) ? treino.exercicios : [];
                      return (
                        <Ficha
                          key={treino._id || `${selecionado}-${indice}`}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...MOLA_PAINEL, delay: indice * 0.05 }}
                        >
                          <FichaTitulo>
                            {treino.titulo || 'Treino sem título informado'}
                          </FichaTitulo>
                          <Metadados>
                            <Meta>Status: realizado</Meta>
                            {hora && <Meta>Horário registrado: {hora}</Meta>}
                            {!treino.dataRealizacao && treino.createdAt && (
                              <Meta>
                                Sem data de realização. O dia usa a data em que o registro foi
                                criado.
                              </Meta>
                            )}
                            {divisao && <Meta>Divisão: {divisao}</Meta>}
                            {duracao && <Meta>Duração registrada: {duracao}</Meta>}
                            {previsto && <Meta>Tempo disponível: {previsto}</Meta>}
                            {exercicios.length > 0 && (
                              <Meta>
                                {exercicios.length}{' '}
                                {exercicios.length === 1 ? 'exercício' : 'exercícios'}
                              </Meta>
                            )}
                          </Metadados>
                          {treino.objetivo && <Objetivo>{treino.objetivo}</Objetivo>}
                          {exercicios.length > 0 && (
                            <ListaExercicios>
                              {exercicios.map((exercicio, indiceExercicio) => {
                                const series = seriesDoExercicio(
                                  exercicio,
                                  indiceExercicio,
                                  execucao?.estado === 'ok' ? execucao.dados : null,
                                );
                                return (
                                  <Exercicio
                                    key={exercicio?.uid || `${treino._id}-${indiceExercicio}`}
                                  >
                                    <ExercicioNome>
                                      {exercicio?.nome || 'Exercício sem nome informado'}
                                    </ExercicioNome>
                                    {series.length > 0 && <Series>{textoSeries(series)}</Series>}
                                  </Exercicio>
                                );
                              })}
                            </ListaExercicios>
                          )}
                          {carregandoExecucao && !execucao && (
                            <AvisoExecucao>Carregando registros da execução...</AvisoExecucao>
                          )}
                          {execucao?.estado === 'erro' && (
                            <AvisoExecucao>
                              Não foi possível carregar os registros da execução deste treino.
                            </AvisoExecucao>
                          )}
                          {treino._id && (
                            <AbrirFicha
                              type="button"
                              onClick={() => navigate(`/treino/${treino._id}`)}
                              whileHover={HOVER}
                              whileTap={TOQUE}
                            >
                              Abrir ficha
                            </AbrirFicha>
                          )}
                        </Ficha>
                      );
                    })
                  )}
                </Detalhe>
              )}
              </AnimatePresence>
              </AreaDetalhe>
            </CorpoCalendario>
          </Dialogo>
        </OverlayCalendario>
      )}
    </AnimatePresence>,
    document.body,
  );
};

const OverlayCalendario = styled(Overlay)`
  align-items: flex-start;
`;

const Dialogo = styled(motion.div)`
  margin-top: 3rem;
  width: min(100%, 880px);
  ${cascaDialogo}
  max-height: min(92vh, 900px);

  @media (max-width: 640px) {
    max-height: calc(100dvh - 1.5rem);
  }
`;

const CorpoCalendario = styled(Corpo)`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
`;

const AreaFixa = styled.div`
  flex-shrink: 0;
`;

const AreaDetalhe = styled.div`
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(198, 169, 100, 0.45);
    border-radius: 99px;
  }
`;

const Navegacao = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.9rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'anterior seguinte'
      'mes hoje';
  }
`;

const GrupoSetas = styled.div`
  display: flex;
  gap: 0.35rem;

  &:first-child {
    @media (max-width: 640px) {
      grid-area: anterior;
    }
  }

  &:nth-child(3) {
    @media (max-width: 640px) {
      grid-area: seguinte;
      justify-content: flex-end;
    }
  }
`;

const Seta = styled(motion.button)`
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid rgba(198, 169, 100, 0.35);
  background: transparent;
  color: var(--accent);
  padding: 0;
  text-transform: none;
  letter-spacing: 0;

  svg {
    font-size: 1rem;
  }

  &:hover:not(:disabled) {
    background: rgba(198, 169, 100, 0.12);
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const MesSlot = styled.div`
  min-height: 1.4rem;
  display: grid;
  align-items: center;

  @media (max-width: 640px) {
    grid-area: mes;
  }
`;

const MesAtual = styled(motion.p)`
  margin: 0;
  text-align: center;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.04em;

  @media (max-width: 640px) {
    font-size: 0.92rem;
  }
`;

const BotaoHoje = styled(motion.button)`
  justify-self: end;
  border: 1px solid rgba(198, 169, 100, 0.45);
  background: transparent;
  color: var(--accent);
  border-radius: 8px;
  padding: 0.35rem 0.7rem;
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0.03em;
  text-transform: none;

  &:hover {
    background: rgba(198, 169, 100, 0.12);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    grid-area: hoje;
  }
`;

const Grade = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Semanas = styled(motion.div)`
  display: grid;
  gap: 0.35rem;
`;

const Linha = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.35rem;
`;

const Coluna = styled.span`
  text-align: center;
  color: rgba(224, 224, 224, 0.72);
  font-family: 'Cormorant', serif;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.02em;
`;

const Vazio = styled.div`
  min-height: 3.15rem;
`;

const Dia = styled(motion.button)`
  min-height: 3.15rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  border-radius: 8px;
  padding: 0.3rem 0.15rem;
  text-transform: none;
  letter-spacing: 0;
  color: ${(props) => (props.$hoje ? 'var(--accent)' : 'var(--white)')};
  background: ${(props) => {
    if (props.$realizado) return 'rgba(76, 175, 80, 0.14)';
    if (props.$hoje) return 'rgba(198, 169, 100, 0.12)';
    return 'rgba(255, 255, 255, 0.03)';
  }};
  border: 1px solid
    ${(props) => {
      if (props.$hoje) return 'var(--accent)';
      if (props.$realizado) return 'rgba(76, 175, 80, 0.55)';
      return 'rgba(198, 169, 100, 0.18)';
    }};
  box-shadow: ${(props) => (props.$selecionado ? 'inset 0 0 0 1px var(--accent)' : 'none')};

  &:hover {
    background: ${(props) =>
      props.$realizado ? 'rgba(76, 175, 80, 0.22)' : 'rgba(198, 169, 100, 0.16)'};
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    min-height: 2.75rem;
  }
`;

const Numero = styled.span`
  font-family: 'Cinzel', serif;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1;
`;

const Indicadores = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  min-height: 0.7rem;
`;

const Ponto = styled.span`
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: #4caf50;
`;

const Contagem = styled.span`
  color: #8dcea0;
  font-family: 'Cormorant', serif;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1;
`;

const EstadoSlot = styled.div`
  min-height: 1.2rem;
  margin: 0.75rem 0 0;
`;

const Estado = styled(motion.p)`
  margin: 0;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.98rem;
  font-style: normal;
  line-height: 1.3;
  text-align: center;
`;

const Legenda = styled.ul`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem 1.1rem;
  margin: 0.35rem 0 0;
  padding: 0;
  list-style: none;
`;

const ItemLegenda = styled.li`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: rgba(224, 224, 224, 0.78);
  font-family: 'Cormorant', serif;
  font-size: 0.92rem;
  line-height: 1.2;
`;

const Amostra = styled.span`
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 3px;
  background: ${(props) => {
    if (props.$tipo === 'realizado') return 'rgba(76, 175, 80, 0.85)';
    if (props.$tipo === 'hoje') return 'var(--accent)';
    return 'rgba(255, 255, 255, 0.08)';
  }};
  border: 1px solid
    ${(props) => {
      if (props.$tipo === 'realizado') return 'rgba(76, 175, 80, 0.9)';
      if (props.$tipo === 'hoje') return 'var(--accent)';
      return 'rgba(198, 169, 100, 0.28)';
    }};
`;

const Nota = styled.p`
  margin: 0.7rem 0 0;
  color: rgba(224, 224, 224, 0.58);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.9rem;
  line-height: 1.35;
  text-align: center;
`;

const Detalhe = styled(motion.section)`
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const DetalheTitulo = styled.h3`
  margin: 0 0 0.7rem;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.03em;
  text-transform: none;
`;

const DetalheVazio = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 1rem;
  line-height: 1.35;
`;

const Ficha = styled(motion.article)`
  padding: 0.85rem 0.9rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(198, 169, 100, 0.2);
  border-left: 3px solid #4caf50;

  & + & {
    margin-top: 0.7rem;
  }
`;

const FichaTitulo = styled.h4`
  margin: 0;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0;
  text-transform: none;
`;

const Metadados = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.9rem;
  margin-top: 0.4rem;
`;

const Meta = styled.span`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.98rem;
  line-height: 1.3;
`;

const Objetivo = styled.p`
  margin: 0.45rem 0 0;
  color: rgba(224, 224, 224, 0.78);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.98rem;
  line-height: 1.35;
`;

const ListaExercicios = styled.ul`
  margin: 0.65rem 0 0;
  padding: 0;
  list-style: none;
`;

const Exercicio = styled.li`
  padding: 0.4rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);

  &:first-child {
    border-top: none;
    padding-top: 0;
  }
`;

const ExercicioNome = styled.div`
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  line-height: 1.3;
`;

const Series = styled.div`
  margin-top: 0.1rem;
  color: rgba(141, 206, 160, 0.95);
  font-family: 'Cormorant', serif;
  font-size: 0.92rem;
  line-height: 1.3;
`;

const AvisoExecucao = styled.p`
  margin: 0.55rem 0 0;
  color: rgba(224, 224, 224, 0.66);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.92rem;
  line-height: 1.3;
`;

const AbrirFicha = styled(motion.button)`
  margin-top: 0.7rem;
  border: 1px solid rgba(198, 169, 100, 0.45);
  background: transparent;
  color: var(--accent);
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0.03em;
  text-transform: none;

  &:hover {
    background: rgba(198, 169, 100, 0.12);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

export default CalendarioTreinos;
