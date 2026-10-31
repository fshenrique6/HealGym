import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { LuRuler } from 'react-icons/lu';
import api from '../services/api';
import {
  CAMPOS,
  compararMedicoes,
  faixaCinturaAltura,
  formatarCm,
  formatarData,
  formatarDataCurta,
  formatarHora,
  formatarRazao,
  formularioVazio,
  hojeLocal,
  leituraCinturaQuadril,
  ordenarMedicoes,
  pontosDaMedida,
  relacaoCinturaAltura,
  relacaoCinturaQuadril,
  resumoCinturaAltura,
  resumoCinturaQuadril,
  validarMedicao,
} from '../utils/medidasCorporais';
import {
  Cabecalho,
  cascaDialogo,
  Corpo,
  Fechar,
  Identidade,
  IdentidadeTexto,
  Marca,
  Nota,
  Overlay,
  Rotulo,
  Subtitulo,
  Texto,
  Titulo,
} from './modalPainelEstilos';

const ABAS = [
  { id: 'visao', nome: 'Visão geral' },
  { id: 'registrar', nome: 'Registrar medida' },
  { id: 'historico', nome: 'Histórico' },
];

const HOVER = { scale: 1.02 };
const TOQUE = { scale: 0.98 };
const HOVER_ICONE = { scale: 1.05 };
const TOQUE_ICONE = { scale: 0.95 };
const MOLA_MODAL = { type: 'spring', duration: 0.5 };
const MOLA_PAINEL = { type: 'spring', duration: 0.4 };
const SURGIR = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

const formularioDe = (registro) => {
  const form = formularioVazio(registro.data);
  CAMPOS.forEach((campo) => {
    if (registro[campo.id] != null && registro[campo.id] !== '') {
      form[campo.id] = String(registro[campo.id]).replace('.', ',');
    }
  });
  return form;
};

const assinaturaFormulario = (form) =>
  [form.data, ...CAMPOS.map((campo) => form[campo.id] ?? '')].join('\u0001');

const formularioAlterado = (form, editandoId, registros) => {
  if (!editandoId) return assinaturaFormulario(form) !== assinaturaFormulario(formularioVazio());
  const registro = registros.find((item) => item.id === editandoId);
  const base = registro ? formularioDe(registro) : formularioVazio();
  return assinaturaFormulario(form) !== assinaturaFormulario(base);
};

const medidasPresentes = (registro) =>
  CAMPOS.filter((campo) => registro[campo.id] != null && registro[campo.id] !== '');

const deltaCurto = (item) => {
  if (!item || item.semAnterior || item.semPar || item.delta == null) return null;
  if (item.direcao === 'estavel') return 'sem mudança';
  const sinal = item.direcao === 'aumento' ? '+' : '−';
  return `${sinal}${formatarCm(Math.abs(item.delta))} cm`;
};

const ValoresMedida = ({ registro, itens }) => (
  <ListaValores>
    {medidasPresentes(registro).map((campo) => {
      const item = itens?.find((entrada) => entrada.id === campo.id);
      const delta = deltaCurto(item);
      return (
        <ValorMedida key={campo.id}>
          <span>{campo.nome}</span>
          <ValorNumero>
            <strong>{formatarCm(registro[campo.id])} cm</strong>
            {delta ? <em>{delta}</em> : null}
          </ValorNumero>
        </ValorMedida>
      );
    })}
  </ListaValores>
);

const textoComparacao = (item) => {
  if (item.semAnterior) return 'Sem medição anterior';
  if (item.semPar) return 'Sem esta medida no registro anterior';
  if (item.direcao === 'estavel') return 'Sem mudança';
  const nome = item.direcao === 'aumento' ? 'Aumento' : 'Redução';
  return `${nome} de ${formatarCm(Math.abs(item.delta))} cm`;
};

const textoDescarte = {
  fechar: 'Há alterações não salvas. Descartar e fechar?',
  cancelar: 'Há alterações não salvas. Descartar a edição?',
  editar: 'Há alterações não salvas. Descartar e editar o outro registro?',
};

const Grafico = ({ nome, pontos }) => {
  if (pontos.length === 0) {
    return <Texto>Nenhuma medição de {nome.toLowerCase()} registrada.</Texto>;
  }

  const largura = 640;
  const altura = 168;
  const margem = { esquerda: 46, direita: 16, topo: 16, baixo: 32 };
  const valores = pontos.map((ponto) => ponto.valor);
  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  const folga = menor === maior ? 1 : (maior - menor) * 0.16;
  const piso = menor - folga;
  const teto = maior + folga;
  const areaLargura = largura - margem.esquerda - margem.direita;
  const areaAltura = altura - margem.topo - margem.baixo;
  const xDo = (indice) =>
    margem.esquerda + (pontos.length === 1 ? areaLargura / 2 : (indice / (pontos.length - 1)) * areaLargura);
  const yDo = (valor) => margem.topo + (1 - (valor - piso) / (teto - piso)) * areaAltura;
  const traco =
    pontos.length > 1
      ? pontos.map((ponto, indice) => `${indice === 0 ? 'M' : 'L'} ${xDo(indice)} ${yDo(ponto.valor)}`).join(' ')
      : '';
  const datasRepetidas = new Set(
    pontos.map((ponto) => ponto.data).filter((data, indice, lista) => lista.indexOf(data) !== indice),
  );
  const indicesRotulo = new Set([0, pontos.length - 1]);
  if (pontos.length > 2) indicesRotulo.add(Math.floor((pontos.length - 1) / 2));
  const rotuloPonto = (ponto) => {
    const quando = datasRepetidas.has(ponto.data)
      ? `${formatarData(ponto.data)}, ${formatarHora(ponto.createdAt)}`
      : formatarData(ponto.data);
    return `${quando}: ${formatarCm(ponto.valor)} cm`;
  };

  return (
    <GraficoCaixa>
      <GraficoTela viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={`Evolução de ${nome} em centímetros`}>
        <line
          x1={margem.esquerda}
          y1={yDo(menor)}
          x2={largura - margem.direita}
          y2={yDo(menor)}
          stroke="rgba(255,255,255,0.08)"
        />
        <line
          x1={margem.esquerda}
          y1={yDo(maior)}
          x2={largura - margem.direita}
          y2={yDo(maior)}
          stroke="rgba(255,255,255,0.08)"
        />
        <text x={margem.esquerda - 8} y={yDo(maior) + 4} textAnchor="end" fill="rgba(224,224,224,0.72)" fontSize="12">
          {formatarCm(maior)}
        </text>
        {menor !== maior && (
          <text x={margem.esquerda - 8} y={yDo(menor) + 4} textAnchor="end" fill="rgba(224,224,224,0.72)" fontSize="12">
            {formatarCm(menor)}
          </text>
        )}
        {traco && <path d={traco} fill="none" stroke="#C6A964" strokeWidth="1.5" />}
        {pontos.map((ponto, indice) => (
          <circle key={ponto.id} cx={xDo(indice)} cy={yDo(ponto.valor)} r="4" fill="#C6A964">
            <title>{rotuloPonto(ponto)}</title>
          </circle>
        ))}
        {pontos.map((ponto, indice) =>
          indicesRotulo.has(indice) ? (
            <text
              key={`${ponto.id}-data`}
              x={xDo(indice)}
              y={altura - 8}
              textAnchor="middle"
              fill="rgba(224,224,224,0.72)"
              fontSize="12"
            >
              {datasRepetidas.has(ponto.data)
                ? `${formatarDataCurta(ponto.data)} ${formatarHora(ponto.createdAt)}`
                : formatarDataCurta(ponto.data)}
            </text>
          ) : null,
        )}
      </GraficoTela>
      <ListaLeitura>
        {pontos.map((ponto) => (
          <li key={ponto.id}>{rotuloPonto(ponto)}</li>
        ))}
      </ListaLeitura>
      <NotaGrafico>
        {pontos.length > 1
          ? 'Cada ponto é uma medição registrada. A linha só liga registros consecutivos e não representa dias sem medição.'
          : 'O ponto é a única medição registrada desta medida.'}
      </NotaGrafico>
    </GraficoCaixa>
  );
};

const MedidasCorporais = ({ aberto, altura, sexo, imc, classificacaoImc, onFechar, onResumo }) => {
  const tituloId = useId();
  const baseId = useId();
  const dialogRef = useRef(null);
  const fecharRef = useRef(null);
  const corpoRef = useRef(null);
  const dataRef = useRef(null);
  const enviarRef = useRef(false);
  const focarDataRef = useRef(false);
  const abasRef = useRef({});
  const escapeRef = useRef(() => {});
  const onResumoRef = useRef(onResumo);
  const onFecharRef = useRef(onFechar);
  const ajudaRef = useRef(null);
  const confirmandoRef = useRef(null);

  const [registros, setRegistros] = useState([]);
  const [truncado, setTruncado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  const [form, setForm] = useState(() => formularioVazio());
  const [erros, setErros] = useState({});
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [ajuda, setAjuda] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [medidaGrafico, setMedidaGrafico] = useState('cintura');
  const [aba, setAba] = useState('visao');
  const [expandidoId, setExpandidoId] = useState(null);
  const [descarte, setDescarte] = useState(null);

  onResumoRef.current = onResumo;
  onFecharRef.current = onFechar;
  ajudaRef.current = ajuda;
  confirmandoRef.current = confirmandoId;

  const publicar = useCallback((lista) => {
    onResumoRef.current?.({
      quantidade: lista.length,
      ultimaData: lista.length ? lista[lista.length - 1].data : null,
    });
  }, []);

  const carregar = useCallback(
    async ({ silencioso = false } = {}) => {
      if (!silencioso) setCarregando(true);
      try {
        const dados = await api.getBodyMeasurements();
        const lista = ordenarMedicoes(dados.medicoes || []);
        setRegistros(lista);
        setTruncado(Boolean(dados.truncado));
        setErroCarga(null);
        publicar(lista);
      } catch (error) {
        setErroCarga(error.message || 'Não foi possível carregar as medições.');
      } finally {
        if (!silencioso) setCarregando(false);
      }
    },
    [publicar],
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!aberto) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    fecharRef.current?.focus();

    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        escapeRef.current();
        return;
      }
      if (evento.key !== 'Tab' || !dialogRef.current) return;
      const focaveis = Array.from(
        dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((elemento) => !elemento.disabled && elemento.tabIndex !== -1);
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
      document.body.style.overflow = anterior;
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    if (corpoRef.current) corpoRef.current.scrollTop = 0;
  }, [aba, aberto]);

  const atual = registros[registros.length - 1] || null;
  const anterior = registros.length > 1 ? registros[registros.length - 2] : null;
  const comparacao = compararMedicoes(atual, anterior);
  const razaoAltura = atual ? relacaoCinturaAltura(atual.cintura, altura) : null;
  const faixaAltura = faixaCinturaAltura(razaoAltura);
  const resumoAltura = resumoCinturaAltura(razaoAltura);
  const razaoQuadril = atual ? relacaoCinturaQuadril(atual.cintura, atual.quadril) : null;
  const leituraQuadril = leituraCinturaQuadril(razaoQuadril, sexo);
  const resumoQuadril = resumoCinturaQuadril(razaoQuadril, sexo);
  const medidasNoGrafico = CAMPOS.filter((campo) =>
    registros.some((item) => item[campo.id] != null && item[campo.id] !== ''),
  );
  const medidaSelecionada =
    medidasNoGrafico.find((campo) => campo.id === medidaGrafico) || medidasNoGrafico[0] || null;
  const cargaInicial = carregando && registros.length === 0 && !erroCarga;

  const alterarCampo = (campo, valor) => {
    setForm((atualForm) => ({ ...atualForm, [campo]: valor }));
    setErros((atualErros) => ({ ...atualErros, [campo]: undefined, geral: undefined }));
  };

  const limparEdicao = () => {
    setEditandoId(null);
    setForm(formularioVazio());
    setErros({});
    setDescarte(null);
  };

  const encerrar = () => {
    setAba('visao');
    setAjuda(null);
    setConfirmandoId(null);
    setDescarte(null);
    setExpandidoId(null);
    setAviso(null);
    focarDataRef.current = false;
    onFecharRef.current?.();
  };

  const solicitarFechar = () => {
    if (formularioAlterado(form, editandoId, registros)) {
      setDescarte({ tipo: 'fechar' });
      return;
    }
    limparEdicao();
    encerrar();
  };

  const selecionarAba = (id) => {
    setDescarte(null);
    setAba(id);
  };

  const irParaRegistro = () => {
    focarDataRef.current = true;
    selecionarAba('registrar');
  };

  const aplicarEdicao = (registro) => {
    setEditandoId(registro.id);
    setForm(formularioDe(registro));
    setErros({});
    setConfirmandoId(null);
    setAviso(null);
    setAjuda(null);
    setDescarte(null);
    focarDataRef.current = true;
    setAba('registrar');
  };

  const iniciarEdicao = (registro) => {
    if (editandoId === registro.id) {
      focarDataRef.current = true;
      selecionarAba('registrar');
      return;
    }
    if (formularioAlterado(form, editandoId, registros)) {
      setDescarte({ tipo: 'editar', id: registro.id });
      return;
    }
    aplicarEdicao(registro);
  };

  const cancelarEdicao = () => {
    limparEdicao();
    setAba('historico');
  };

  const confirmarDescarte = () => {
    if (!descarte) return;
    if (descarte.tipo === 'fechar') {
      limparEdicao();
      encerrar();
      return;
    }
    if (descarte.tipo === 'cancelar') {
      limparEdicao();
      setAba('historico');
      return;
    }
    const registro = registros.find((item) => item.id === descarte.id);
    if (registro) aplicarEdicao(registro);
    else setDescarte(null);
  };

  const salvar = async (evento) => {
    evento.preventDefault();
    if (enviarRef.current) return;
    const validacao = validarMedicao(form);
    setErros(validacao.erros);
    if (Object.keys(validacao.erros).length > 0) return;

    enviarRef.current = true;
    setSalvando(true);
    setAviso(null);
    try {
      if (editandoId) {
        await api.updateBodyMeasurement(editandoId, validacao.payload);
        setAviso({ tipo: 'ok', texto: 'Medição atualizada.' });
      } else {
        await api.createBodyMeasurement(validacao.payload);
        setAviso({ tipo: 'ok', texto: 'Medição salva.' });
      }
      setEditandoId(null);
      setForm(formularioVazio());
      setErros({});
      setAjuda(null);
      setDescarte(null);
      setAba('visao');
      await carregar({ silencioso: true });
    } catch (error) {
      setAviso({ tipo: 'erro', texto: error.message || 'Não foi possível salvar a medição.' });
    } finally {
      enviarRef.current = false;
      setSalvando(false);
    }
  };

  const excluir = async (id) => {
    if (enviarRef.current) return;
    enviarRef.current = true;
    setExcluindoId(id);
    setAviso(null);
    try {
      await api.deleteBodyMeasurement(id);
      if (editandoId === id) limparEdicao();
      if (expandidoId === id) setExpandidoId(null);
      setConfirmandoId(null);
      setAviso({ tipo: 'ok', texto: 'Medição excluída.' });
      await carregar({ silencioso: true });
    } catch (error) {
      setAviso({ tipo: 'erro', texto: error.message || 'Não foi possível excluir a medição.' });
    } finally {
      enviarRef.current = false;
      setExcluindoId(null);
    }
  };

  const navegarAbas = (evento) => {
    const indice = ABAS.findIndex((item) => item.id === aba);
    if (indice < 0) return;
    let proximo = null;
    if (evento.key === 'ArrowRight') proximo = (indice + 1) % ABAS.length;
    else if (evento.key === 'ArrowLeft') proximo = (indice - 1 + ABAS.length) % ABAS.length;
    else if (evento.key === 'Home') proximo = 0;
    else if (evento.key === 'End') proximo = ABAS.length - 1;
    else return;
    evento.preventDefault();
    const id = ABAS[proximo].id;
    selecionarAba(id);
    abasRef.current[id]?.focus();
  };

  escapeRef.current = () => {
    if (confirmandoRef.current) {
      setConfirmandoId(null);
      return;
    }
    if (ajudaRef.current) {
      setAjuda(null);
      return;
    }
    if (descarte) {
      setDescarte(null);
      return;
    }
    solicitarFechar();
  };

  useEffect(() => {
    if (!ajuda) return undefined;
    const aoPonteiro = (evento) => {
      const alvo = evento.target;
      if (alvo instanceof Element && alvo.closest('[data-ajuda-raiz]')) return;
      setAjuda(null);
    };
    document.addEventListener('pointerdown', aoPonteiro);
    return () => document.removeEventListener('pointerdown', aoPonteiro);
  }, [ajuda]);

  const renderCampo = (campo) => {
    const ajudaId = `${baseId}-${campo.id}-ajuda`;
    const erroId = `${baseId}-${campo.id}-erro`;
    const aberta = ajuda === campo.id;
    return (
      <Campo key={campo.id} $frente={aberta} data-ajuda-raiz={aberta ? '' : undefined}>
        <LinhaRotulo>
          <label htmlFor={`${baseId}-${campo.id}`}>{campo.nome}</label>
          <BotaoAjuda
            type="button"
            whileHover={HOVER_ICONE}
            whileTap={TOQUE_ICONE}
            aria-label={`Como medir ${campo.nome.toLowerCase()}`}
            aria-expanded={aberta}
            aria-controls={ajudaId}
            onClick={() => setAjuda(aberta ? null : campo.id)}
          >
            ?
          </BotaoAjuda>
        </LinhaRotulo>
        <LinhaEntrada>
          <Entrada
            id={`${baseId}-${campo.id}`}
            inputMode="decimal"
            autoComplete="off"
            value={form[campo.id]}
            aria-invalid={erros[campo.id] ? 'true' : 'false'}
            aria-describedby={`${ajudaId} ${erros[campo.id] ? erroId : ''}`.trim()}
            onChange={(evento) => alterarCampo(campo.id, evento.target.value)}
          />
          <Unidade>cm</Unidade>
        </LinhaEntrada>
        <AnimatePresence initial={false}>
          {aberta && (
            <Ajuda key="ajuda" id={ajudaId} {...SURGIR}>
              {campo.passos.map((passo) => (
                <Passo key={passo}>{passo}</Passo>
              ))}
              <Fonte>{campo.fonte}</Fonte>
            </Ajuda>
          )}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {erros[campo.id] && (
            <Erro key="erro" id={erroId} role="alert" {...SURGIR}>
              {erros[campo.id]}
            </Erro>
          )}
        </AnimatePresence>
      </Campo>
    );
  };

  const renderAjudaIndicador = (id, conteudo) => (
    <AnimatePresence initial={false}>
      {ajuda === id && (
        <Ajuda key={id} id={`${baseId}-${id}-ajuda`} {...SURGIR}>
          {conteudo}
        </Ajuda>
      )}
    </AnimatePresence>
  );

  const aoPainelPronto = () => {
    if (aba !== 'registrar' || !focarDataRef.current || !dataRef.current) return;
    focarDataRef.current = false;
    dataRef.current.focus();
  };

  const painelVisao = cargaInicial ? (
    <Texto>Carregando medições...</Texto>
  ) : !atual ? (
    erroCarga ? null : (
      <Cartao>
        <Rotulo>Última medição</Rotulo>
        <Texto>Nenhuma medição registrada.</Texto>
        <AcoesFormulario>
          <BotaoSalvar type="button" onClick={irParaRegistro} whileHover={HOVER} whileTap={TOQUE}>
            Registrar primeira medição
          </BotaoSalvar>
        </AcoesFormulario>
      </Cartao>
    )
  ) : (
    <Painel>
      <Cartao>
        <Rotulo>Última medição</Rotulo>
        <DataAtual>{formatarData(atual.data)}</DataAtual>
        <ValoresMedida registro={atual} itens={anterior ? comparacao : null} />
        {!anterior && <NotaCurta>Sem medição anterior.</NotaCurta>}
      </Cartao>

      <Secao>
        <Rotulo>Indicadores corporais</Rotulo>
        <GradeIndicadores>
          <Cartao $frente={ajuda === 'relacao-altura'} data-ajuda-raiz={ajuda === 'relacao-altura' ? '' : undefined}>
            <LinhaRotulo>
              <NomeIndicador>Cintura / altura</NomeIndicador>
              <BotaoAjuda
                type="button"
                whileHover={HOVER_ICONE}
                whileTap={TOQUE_ICONE}
                aria-label="Como ler a relação cintura/altura"
                aria-expanded={ajuda === 'relacao-altura'}
                aria-controls={`${baseId}-relacao-altura-ajuda`}
                onClick={() => setAjuda(ajuda === 'relacao-altura' ? null : 'relacao-altura')}
              >
                ?
              </BotaoAjuda>
            </LinhaRotulo>
            {razaoAltura == null ? (
              <>
                <Indisponivel>Indisponível</Indisponivel>
                <Frase>{altura ? 'Informe a cintura para calcular.' : 'A altura do perfil é necessária.'}</Frase>
              </>
            ) : (
              <>
                <ValorIndicador>{formatarRazao(razaoAltura)}</ValorIndicador>
                {resumoAltura?.titulo && <Faixa>{resumoAltura.titulo}</Faixa>}
                {resumoAltura?.frase && <Frase>{resumoAltura.frase}</Frase>}
              </>
            )}
            {renderAjudaIndicador(
              'relacao-altura',
              <>
                <Passo>Compara a cintura com a altura e descreve a gordura concentrada no meio do corpo.</Passo>
                <Passo>O cálculo divide a cintura pela altura, as duas em centímetros.</Passo>
                {razaoAltura != null ? (
                  <Passo>
                    Nesta medição: cintura {formatarCm(atual.cintura)} cm e altura {formatarCm(altura)} cm.
                  </Passo>
                ) : (
                  <Passo>Falta a cintura nesta medição ou a altura no perfil.</Passo>
                )}
                {faixaAltura && (
                  <Passo>
                    {faixaAltura.nome}. {faixaAltura.texto}
                  </Passo>
                )}
                <Fonte>
                  Faixas da diretriz NICE NG246 para adultos. Não se aplicam da mesma forma a crianças, gestantes,
                  idosos frágeis ou pessoas com muita massa muscular. Não é diagnóstico e não substitui o IMC.
                </Fonte>
                <Fonte>
                  Estas circunferências não estimam percentual de gordura. Essa conta pede dobras cutâneas, impedância
                  ou populações específicas.
                </Fonte>
              </>,
            )}
          </Cartao>

          <Cartao $frente={ajuda === 'relacao-quadril'} data-ajuda-raiz={ajuda === 'relacao-quadril' ? '' : undefined}>
            <LinhaRotulo>
              <NomeIndicador>Cintura / quadril</NomeIndicador>
              <BotaoAjuda
                type="button"
                whileHover={HOVER_ICONE}
                whileTap={TOQUE_ICONE}
                aria-label="Como ler a relação cintura/quadril"
                aria-expanded={ajuda === 'relacao-quadril'}
                aria-controls={`${baseId}-relacao-quadril-ajuda`}
                onClick={() => setAjuda(ajuda === 'relacao-quadril' ? null : 'relacao-quadril')}
              >
                ?
              </BotaoAjuda>
            </LinhaRotulo>
            {razaoQuadril == null ? (
              <>
                <Indisponivel>Indisponível</Indisponivel>
                <Frase>Informe cintura e quadril na mesma medição.</Frase>
              </>
            ) : (
              <>
                <ValorIndicador>{formatarRazao(razaoQuadril)}</ValorIndicador>
                {resumoQuadril?.titulo && <Faixa>{resumoQuadril.titulo}</Faixa>}
                {resumoQuadril?.frase && <Frase>{resumoQuadril.frase}</Frase>}
              </>
            )}
            {renderAjudaIndicador(
              'relacao-quadril',
              <>
                <Passo>Compara a cintura com o quadril na mesma medição.</Passo>
                <Passo>O cálculo divide a cintura pelo quadril, as duas em centímetros.</Passo>
                {razaoQuadril != null ? (
                  <Passo>
                    Nesta medição: cintura {formatarCm(atual.cintura)} cm e quadril {formatarCm(atual.quadril)} cm.
                  </Passo>
                ) : (
                  <Passo>Falta a cintura ou o quadril nesta medição.</Passo>
                )}
                {leituraQuadril && <Passo>{leituraQuadril}</Passo>}
                <Fonte>
                  Pontos de corte da consulta de especialistas da OMS de 2008, para adultos. Não identificam doença por
                  si só.
                </Fonte>
              </>,
            )}
          </Cartao>
        </GradeIndicadores>
        {imc && (
          <LinhaImc>
            IMC do perfil: {imc} kg/m²{classificacaoImc ? ` · ${classificacaoImc}` : ''}
          </LinhaImc>
        )}
      </Secao>
    </Painel>
  );

  const painelRegistro = cargaInicial ? (
    <Texto>Carregando medições...</Texto>
  ) : (
    <Formulario onSubmit={salvar} noValidate aria-busy={salvando}>
      {editandoId && <Rotulo>Editar medição</Rotulo>}
      <Campo>
        <LinhaRotulo>
          <label htmlFor={`${baseId}-data`}>Data da medição</label>
        </LinhaRotulo>
        <Entrada
          ref={dataRef}
          id={`${baseId}-data`}
          type="date"
          min="1900-01-01"
          max={hojeLocal()}
          value={form.data}
          aria-invalid={erros.data ? 'true' : 'false'}
          aria-describedby={erros.data ? `${baseId}-data-erro` : undefined}
          onChange={(evento) => alterarCampo('data', evento.target.value)}
        />
        <AnimatePresence initial={false}>
          {erros.data && (
            <Erro id={`${baseId}-data-erro`} role="alert" {...SURGIR}>
              {erros.data}
            </Erro>
          )}
        </AnimatePresence>
      </Campo>

      <GrupoTitulo>Medidas principais</GrupoTitulo>
      <Grade>{CAMPOS.filter((campo) => campo.grupo === 'principais').map(renderCampo)}</Grade>
      <GrupoTitulo>Medidas adicionais</GrupoTitulo>
      <Grade>{CAMPOS.filter((campo) => campo.grupo === 'adicionais').map(renderCampo)}</Grade>
      <AnimatePresence initial={false}>
        {erros.geral && (
          <Erro role="alert" {...SURGIR}>
            {erros.geral}
          </Erro>
        )}
      </AnimatePresence>
      <AcoesFormulario>
        <BotaoSalvar
          type="submit"
          disabled={salvando}
          whileHover={salvando ? undefined : HOVER}
          whileTap={salvando ? undefined : TOQUE}
        >
          {salvando ? 'Salvando...' : 'Salvar medição'}
        </BotaoSalvar>
        {editandoId && (
          <BotaoSecundario
            type="button"
            onClick={cancelarEdicao}
            disabled={salvando}
            whileHover={salvando ? undefined : HOVER}
            whileTap={salvando ? undefined : TOQUE}
          >
            Cancelar edição
          </BotaoSecundario>
        )}
      </AcoesFormulario>
    </Formulario>
  );

  const painelHistorico = cargaInicial ? (
    <Texto>Carregando medições...</Texto>
  ) : (
    <Painel>
      <Cartao>
        <CabecaGrafico>
          <Rotulo>Evolução</Rotulo>
          {medidasNoGrafico.length > 0 && medidaSelecionada && (
            <Selecao
              id={`${baseId}-grafico`}
              aria-label="Medida no gráfico"
              value={medidaSelecionada.id}
              onChange={(evento) => setMedidaGrafico(evento.target.value)}
            >
              {medidasNoGrafico.map((campo) => (
                <option key={campo.id} value={campo.id}>
                  {campo.nome}
                </option>
              ))}
            </Selecao>
          )}
        </CabecaGrafico>
        <AnimatePresence mode="wait" initial={false}>
          {medidaSelecionada ? (
            <GraficoAnimado
              key={medidaSelecionada.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <Grafico nome={medidaSelecionada.nome} pontos={pontosDaMedida(registros, medidaSelecionada.id)} />
            </GraficoAnimado>
          ) : (
            !erroCarga && (
              <GraficoAnimado
                key="vazio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Texto>Quando você salvar uma medição, a evolução aparece neste gráfico.</Texto>
              </GraficoAnimado>
            )
          )}
        </AnimatePresence>
      </Cartao>

      <Secao>
        <Rotulo>Medições</Rotulo>
        {registros.length === 0 && !erroCarga ? (
          <Texto>Quando você salvar uma medição, a data e os valores ficam neste histórico.</Texto>
        ) : (
          <ListaHistorico>
            <AnimatePresence initial={false}>
              {[...registros].reverse().map((registro, ordem) => {
                const indice = registros.findIndex((item) => item.id === registro.id);
                const previo = indice > 0 ? registros[indice - 1] : null;
                const comparacaoItem = previo ? compararMedicoes(registro, previo) : [];
                const repetida = registros.filter((item) => item.data === registro.data).length > 1;
                const abertoItem = expandidoId === registro.id;
                const detalhesId = `${baseId}-detalhe-${registro.id}`;
                const ocupado = salvando || excluindoId === registro.id;
                return (
                  <ItemHistorico
                    key={registro.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ ...MOLA_PAINEL, delay: Math.min(ordem, 6) * 0.04 }}
                  >
                    <CabecaItem>
                      <DataItem>
                        {formatarData(registro.data)}
                        {repetida ? ` · ${formatarHora(registro.createdAt)}` : ''}
                      </DataItem>
                      <AcoesItem>
                        <BotaoTexto
                          type="button"
                          whileHover={HOVER}
                          whileTap={TOQUE}
                          aria-expanded={abertoItem}
                          aria-controls={detalhesId}
                          onClick={() => setExpandidoId(abertoItem ? null : registro.id)}
                        >
                          {abertoItem ? 'Ocultar' : 'Detalhes'}
                        </BotaoTexto>
                        <BotaoTexto
                          type="button"
                          whileHover={salvando ? undefined : HOVER}
                          whileTap={salvando ? undefined : TOQUE}
                          onClick={() => iniciarEdicao(registro)}
                          disabled={salvando}
                        >
                          Editar
                        </BotaoTexto>
                        <BotaoTexto
                          type="button"
                          whileHover={ocupado ? undefined : HOVER}
                          whileTap={ocupado ? undefined : TOQUE}
                          onClick={() => setConfirmandoId(registro.id)}
                          disabled={ocupado}
                        >
                          Excluir
                        </BotaoTexto>
                      </AcoesItem>
                    </CabecaItem>
                    <ValoresMedida registro={registro} />
                    <AnimatePresence initial={false}>
                      {abertoItem && (
                        <Detalhe
                          key="detalhe"
                          id={detalhesId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.2 }}
                        >
                          {previo ? (
                            <ListaComparacao>
                              {comparacaoItem.map((item) => (
                                <ComparacaoItem key={item.id}>
                                  <span>{item.nome}</span>
                                  <span>{textoComparacao(item)}</span>
                                </ComparacaoItem>
                              ))}
                            </ListaComparacao>
                          ) : (
                            <NotaCurta>Sem medição anterior.</NotaCurta>
                          )}
                        </Detalhe>
                      )}
                    </AnimatePresence>
                    <AnimatePresence initial={false}>
                      {confirmandoId === registro.id && (
                        <Confirmacao key="confirma" {...SURGIR}>
                          <Texto>Excluir a medição de {formatarData(registro.data)}?</Texto>
                          <AcoesItem>
                            <BotaoTexto
                              type="button"
                              whileHover={excluindoId === registro.id ? undefined : HOVER}
                              whileTap={excluindoId === registro.id ? undefined : TOQUE}
                              onClick={() => excluir(registro.id)}
                              disabled={excluindoId === registro.id}
                            >
                              {excluindoId === registro.id ? 'Excluindo...' : 'Confirmar exclusão'}
                            </BotaoTexto>
                            <BotaoTexto
                              type="button"
                              whileHover={HOVER}
                              whileTap={TOQUE}
                              onClick={() => setConfirmandoId(null)}
                            >
                              Cancelar
                            </BotaoTexto>
                          </AcoesItem>
                        </Confirmacao>
                      )}
                    </AnimatePresence>
                  </ItemHistorico>
                );
              })}
            </AnimatePresence>
          </ListaHistorico>
        )}
        {truncado && <NotaFina>O histórico exibido traz as 1000 medições mais recentes.</NotaFina>}
      </Secao>
    </Painel>
  );

  return createPortal(
    <AnimatePresence>
      {aberto && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={solicitarFechar}
        >
          <Dialogo
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            initial={{ opacity: 0, scale: 0.9, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            transition={MOLA_MODAL}
            onClick={(evento) => evento.stopPropagation()}
          >
            <Topo>
              <CabecalhoModal>
                <Identidade>
                  <Marca aria-hidden="true">
                    <LuRuler />
                  </Marca>
                  <IdentidadeTexto>
                    <TituloModal id={tituloId}>Medidas corporais</TituloModal>
                    <Subtitulo>Acompanhe sua evolução física</Subtitulo>
                  </IdentidadeTexto>
                </Identidade>
                <Fechar
                  as={motion.button}
                  ref={fecharRef}
                  type="button"
                  aria-label="Fechar"
                  onClick={solicitarFechar}
                  whileHover={{ rotate: 90 }}
                  whileTap={TOQUE_ICONE}
                  transition={{ duration: 0.3 }}
                >
                  <FiX />
                </Fechar>
              </CabecalhoModal>
              <BarraAbas role="tablist" aria-label="Seções de medidas corporais" onKeyDown={navegarAbas}>
                {ABAS.map((item) => (
                  <Aba
                    key={item.id}
                    ref={(elemento) => {
                      abasRef.current[item.id] = elemento;
                    }}
                    id={`${baseId}-aba-${item.id}`}
                    type="button"
                    role="tab"
                    aria-selected={aba === item.id}
                    aria-controls={`${baseId}-painel-${item.id}`}
                    tabIndex={aba === item.id ? 0 : -1}
                    whileHover={HOVER}
                    whileTap={TOQUE}
                    onClick={() => selecionarAba(item.id)}
                  >
                    {item.nome}
                  </Aba>
                ))}
              </BarraAbas>
              <AnimatePresence initial={false}>
                {descarte && (
                  <FaixaDescarte key="descarte" role="status" {...SURGIR}>
                    <TextoDescarte>{textoDescarte[descarte.tipo]}</TextoDescarte>
                    <AcoesItem>
                      <BotaoTexto type="button" whileHover={HOVER} whileTap={TOQUE} onClick={confirmarDescarte}>
                        Descartar
                      </BotaoTexto>
                      <BotaoTexto type="button" whileHover={HOVER} whileTap={TOQUE} onClick={() => setDescarte(null)}>
                        Continuar
                      </BotaoTexto>
                    </AcoesItem>
                  </FaixaDescarte>
                )}
              </AnimatePresence>
            </Topo>
            <Conteudo ref={corpoRef}>
              <AnimatePresence initial={false}>
                {aviso?.texto && (
                  <Aviso
                    key={aviso.texto}
                    role={aviso.tipo === 'erro' ? 'alert' : 'status'}
                    aria-live="polite"
                    $tipo={aviso.tipo}
                    {...SURGIR}
                  >
                    {aviso.texto}
                  </Aviso>
                )}
              </AnimatePresence>
              {erroCarga && (
                <BlocoErro>
                  <Erro role="alert" {...SURGIR}>
                    {erroCarga}
                  </Erro>
                  {registros.length === 0 && (
                    <BotaoSecundario type="button" whileHover={HOVER} whileTap={TOQUE} onClick={() => carregar()}>
                      Tentar de novo
                    </BotaoSecundario>
                  )}
                </BlocoErro>
              )}
              <AnimatePresence mode="wait" initial={false}>
                <PainelAba
                  key={aba}
                  role="tabpanel"
                  id={`${baseId}-painel-${aba}`}
                  aria-labelledby={`${baseId}-aba-${aba}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  onAnimationComplete={aoPainelPronto}
                >
                  {aba === 'visao' && painelVisao}
                  {aba === 'registrar' && painelRegistro}
                  {aba === 'historico' && painelHistorico}
                </PainelAba>
              </AnimatePresence>
            </Conteudo>
          </Dialogo>
        </Overlay>
      )}
    </AnimatePresence>,
    document.body,
  );
};

const Dialogo = styled(motion.div)`
  ${cascaDialogo}
  width: min(100%, 800px);
  max-height: min(86dvh, 740px);

  @media (max-width: 640px) {
    width: 100%;
    max-height: calc(100dvh - 1.5rem);
  }
`;

const Topo = styled.div`
  flex-shrink: 0;
`;

const CabecalhoModal = styled(Cabecalho)`
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const TituloModal = styled(Titulo)`
  font-size: 1.5rem;
  line-height: 1.15;
  letter-spacing: 0.06em;
`;

const BarraAbas = styled.div`
  display: flex;
  gap: 1.15rem;
  padding: 0 1.15rem;
  background: var(--gradient-end);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Aba = styled(motion.button)`
  flex-shrink: 0;
  margin: 0 0 -1px;
  padding: 0.62rem 0.05rem 0.55rem;
  border: none;
  border-bottom: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 1.02rem;
  line-height: 1.2;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;

  &[aria-selected='true'] {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  &:hover {
    color: var(--white);
  }

  &[aria-selected='true']:hover {
    color: var(--accent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const FaixaDescarte = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem 0.75rem;
  padding: 0.55rem 1.15rem;
  background: rgba(198, 169, 100, 0.06);
  border-bottom: 1px solid rgba(198, 169, 100, 0.22);
`;

const TextoDescarte = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.98rem;
  line-height: 1.3;
`;

const Conteudo = styled(Corpo)`
  flex: 1 1 auto;
  min-height: 0;
`;

const PainelAba = styled(motion.div)`
  min-width: 0;
`;

const Painel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
`;

const Secao = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
`;

const Cartao = styled.section`
  position: relative;
  z-index: ${(props) => (props.$frente ? 3 : 0)};
  min-width: 0;
  padding: 0.7rem 0.75rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const GradeIndicadores = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  align-items: start;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Aviso = styled(motion.p)`
  margin: 0 0 0.75rem;
  color: ${(props) => (props.$tipo === 'erro' ? '#ff8f8f' : 'var(--accent)')};
  font-family: 'Cormorant', serif;
  font-size: 0.98rem;
  line-height: 1.3;
`;

const BlocoErro = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.75rem;
  margin-bottom: 0.75rem;
`;

const DataAtual = styled.p`
  margin: 0.1rem 0 0;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  line-height: 1.3;
`;

const ListaValores = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
  margin-top: 0.5rem;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const ValorMedida = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  min-width: 0;
  margin: 0;
  padding: 0.4rem 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #0a0a0a;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.98rem;
  line-height: 1.2;
  user-select: none;
  pointer-events: none;
`;

const ValorNumero = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  min-width: 0;
  color: var(--white);
  font-weight: 600;

  em {
    color: var(--accent);
    font-style: normal;
    font-weight: 500;
    font-size: 0.84rem;
  }
`;

const NotaCurta = styled.p`
  margin: 0.4rem 0 0;
  color: rgba(224, 224, 224, 0.62);
  font-family: 'Cormorant', serif;
  font-size: 0.86rem;
  line-height: 1.3;
`;

const ListaComparacao = styled.ul`
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const ComparacaoItem = styled.li`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.15rem 0.75rem;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  line-height: 1.3;

  span:last-child {
    color: var(--accent);
    text-align: right;
  }
`;

const NomeIndicador = styled.h4`
  margin: 0;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.25;
`;

const ValorIndicador = styled.p`
  margin: 0.2rem 0 0.1rem;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 1.2rem;
  line-height: 1.1;
`;

const Indisponivel = styled.p`
  margin: 0.2rem 0 0.1rem;
  color: rgba(224, 224, 224, 0.55);
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  line-height: 1.2;
`;

const Faixa = styled.p`
  margin: 0.15rem 0 0;
  color: var(--accent);
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.25;
`;

const Frase = styled.p`
  margin: 0.15rem 0 0;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.92rem;
  line-height: 1.3;
`;

const LinhaImc = styled.p`
  margin: 0;
  color: rgba(224, 224, 224, 0.62);
  font-family: 'Cormorant', serif;
  font-size: 0.88rem;
  line-height: 1.3;
`;

const NotaFina = styled(Nota)`
  margin: 0.15rem 0 0;
`;

const CabecaGrafico = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;

  h3 {
    margin: 0;
  }
`;

const Selecao = styled.select`
  width: auto;
  min-width: 9.5rem;
  max-width: 100%;
  margin: 0;
  padding: 0.4rem 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #0a0a0a;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: rgba(198, 169, 100, 0.7);
  }
`;

const GraficoAnimado = styled(motion.div)`
  min-width: 0;
`;

const GraficoCaixa = styled.div`
  position: relative;
`;

const GraficoTela = styled.svg`
  width: 100%;
  height: auto;
  display: block;
`;

const ListaLeitura = styled.ul`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const NotaGrafico = styled.p`
  margin: 0.35rem 0 0;
  color: rgba(224, 224, 224, 0.62);
  font-family: 'Cormorant', serif;
  font-size: 0.86rem;
  line-height: 1.35;
`;

const ListaHistorico = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const ItemHistorico = styled(motion.li)`
  padding: 0.5rem 0.65rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const CabecaItem = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.35rem 0.75rem;
`;

const DataItem = styled.p`
  margin: 0;
  min-width: 0;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 0.98rem;
  line-height: 1.25;
`;

const Detalhe = styled(motion.div)`
  margin-top: 0.45rem;
`;

const AcoesItem = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.45rem;
  justify-content: flex-end;
`;

const Confirmacao = styled(motion.div)`
  margin-top: 0.55rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const Formulario = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Grade = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 0.75rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Campo = styled.div`
  position: relative;
  z-index: ${(props) => (props.$frente ? 3 : 0)};
  min-width: 0;
`;

const GrupoTitulo = styled.p`
  margin: 0.05rem 0 0;
  color: var(--accent);
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  line-height: 1.25;
`;

const LinhaRotulo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.18rem;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.92rem;
  line-height: 1.2;

  label {
    cursor: pointer;
  }
`;

const BotaoAjuda = styled(motion.button)`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--background);
  font-family: 'Cinzel', serif;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: var(--accent-light);
    border-color: var(--accent-light);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const LinhaEntrada = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
`;

const Entrada = styled.input`
  width: 100%;
  min-width: 0;
  padding: 0.4rem 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #0a0a0a;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  color-scheme: dark;

  &:focus {
    outline: none;
    border-color: rgba(198, 169, 100, 0.7);
  }
`;

const Unidade = styled.span`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  flex-shrink: 0;
`;

const Ajuda = styled(motion.div)`
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  z-index: 4;
  margin: 0;
  padding: 0.6rem 0.7rem;
  border-radius: 8px;
  background: #141414;
  border: 1px solid rgba(198, 169, 100, 0.28);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.5);
`;

const Passo = styled.p`
  margin: 0 0 0.25rem;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.92rem;
  line-height: 1.35;
`;

const Fonte = styled.p`
  margin: 0.35rem 0 0;
  color: rgba(224, 224, 224, 0.55);
  font-family: 'Cormorant', serif;
  font-size: 0.82rem;
  line-height: 1.3;
`;

const Erro = styled(motion.p)`
  margin: 0.3rem 0 0;
  color: #ff8f8f;
  font-family: 'Cormorant', serif;
  font-size: 0.9rem;
  line-height: 1.3;
`;

const AcoesFormulario = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.15rem;
`;

const BotaoSalvar = styled(motion.button)`
  background: transparent;
  border: 1px solid rgba(198, 169, 100, 0.55);
  color: var(--accent);
  border-radius: 8px;
  padding: 0.32rem 0.7rem;
  font-family: 'Cormorant', serif;
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: rgba(198, 169, 100, 0.12);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`;

const BotaoSecundario = styled(motion.button)`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--text-secondary);
  border-radius: 8px;
  padding: 0.32rem 0.7rem;
  font-family: 'Cormorant', serif;
  font-size: 0.98rem;
  line-height: 1.2;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--white);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`;

const BotaoTexto = styled(motion.button)`
  background: transparent;
  border: none;
  color: var(--accent);
  padding: 0.1rem 0.05rem;
  font-family: 'Cormorant', serif;
  font-size: 0.92rem;
  line-height: 1.2;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--white);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`;

export default MedidasCorporais;
