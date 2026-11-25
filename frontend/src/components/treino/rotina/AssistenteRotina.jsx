import styled from 'styled-components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { dadosTreinoDoPerfil } from '../../../utils/perfilTreino';
import {
  codigoDoErro,
  corpoDaRotina,
  diasValidos,
  mensagemDeErro,
  personalizacaoApos,
  personalizacaoConfirmada,
  personalizacaoInicial,
  preferenciasIniciais,
  semDiasFixos,
} from '../../../utils/rotina';
import DialogoAcao from '../../DialogoAcao';
import { BotaoTexto, Cartao, Esqueleto, Olho, Surge, Texto, TituloCartao } from '../ui';
import { CURVA } from '../movimento';
import TrocaExercicioDialog from './TrocaExercicioDialog';
import EtapaPerfil from './EtapaPerfil';
import EtapaOrganizacao from './EtapaOrganizacao';
import EtapaPrevia from './EtapaPrevia';

const AssistenteRotina = ({ rotinaAtiva, onFechar, onSalvo }) => {
  const { user, updateUser } = useAuth();
  const [etapa, setEtapa] = useState(0);
  const [opcoes, setOpcoes] = useState(null);
  const [perfil, setPerfil] = useState(() => dadosTreinoDoPerfil(user?.profile));
  const [preferencias, setPreferencias] = useState(() => preferenciasIniciais(rotinaAtiva, null));
  const [personalizacao, setPersonalizacao] = useState(() => personalizacaoInicial(rotinaAtiva));
  const [modoAgenda, setModoAgenda] = useState(
    rotinaAtiva?.agenda?.modo === 'calendario' ? 'calendario' : 'flexivel',
  );
  const [diasFixos, setDiasFixos] = useState(
    Array.isArray(rotinaAtiva?.agenda?.dias) ? rotinaAtiva.agenda.dias.map(Number) : [],
  );
  const [proposta, setProposta] = useState(null);
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [troca, setTroca] = useState(null);
  const [aviso, setAviso] = useState(null);
  const gerandoRef = useRef(false);
  const salvandoRef = useRef(false);
  const reduzir = useReducedMotion();

  useEffect(() => {
    let ativo = true;
    api
      .getOpcoesRotina()
      .then((res) => {
        if (!ativo) return;
        setOpcoes(res.data);
        setPreferencias((atual) => {
          const base = preferenciasIniciais(rotinaAtiva, res.data);
          const jaEscolheu = Array.isArray(atual.equipamentos) && atual.equipamentos.length > 0;
          return jaEscolheu ? { ...base, ...atual, equipamentos: atual.equipamentos } : base;
        });
      })
      .catch((error) => {
        if (ativo) setErro(mensagemDeErro(error, 'Não foi possível carregar as opções.'));
      })
      .finally(() => {
        if (ativo) setCarregandoOpcoes(false);
      });
    return () => {
      ativo = false;
    };
  }, [rotinaAtiva]);

  const agendaPedido = useCallback(() => {
    if (modoAgenda === 'calendario') {
      return { modo: 'calendario', dias: diasFixos.length ? diasFixos : null };
    }
    return { modo: 'flexivel' };
  }, [modoAgenda, diasFixos]);

  const montarCorpo = useCallback(
    (extra = {}) =>
      corpoDaRotina({
        perfil,
        preferencias,
        variacao: extra.variacao ?? personalizacao.variacao,
        estrategia: extra.estrategia ?? personalizacao.estrategia,
        agenda: extra.agenda !== undefined ? extra.agenda : personalizacao.agenda || agendaPedido(),
        ajustes: extra.ajustes ?? personalizacao.ajustes,
      }),
    [perfil, preferencias, personalizacao, agendaPedido],
  );

  const gerarPrevia = useCallback(
    async (mudanca) => {
      if (gerandoRef.current) return;
      gerandoRef.current = true;
      setGerando(true);
      setErro('');
      const usada = mudanca ? personalizacaoApos(personalizacao, mudanca) : personalizacao;
      const tentar = async (pers) => {
        const corpo = corpoDaRotina({
          perfil,
          preferencias,
          variacao: pers.variacao,
          estrategia: pers.estrategia,
          agenda: pers.agenda || agendaPedido(),
          ajustes: pers.ajustes,
        });
        return { resposta: await api.previaRotina(corpo), usada: pers };
      };
      try {
        let resultado;
        try {
          resultado = await tentar(usada);
        } catch (error) {
          const semDias = semDiasFixos(usada);
          if (semDias && error?.response?.status === 400) {
            resultado = await tentar(semDias);
            setDiasFixos([]);
            setErro('A quantidade de dias não bateu com as sessões. A prévia ficou no modo flexível.');
          } else {
            throw error;
          }
        }
        const data = resultado.resposta?.data;
        setProposta(data);
        setPersonalizacao(personalizacaoConfirmada(resultado.usada, data));
        if (data?.agenda?.modo === 'calendario') {
          setModoAgenda('calendario');
          setDiasFixos((data.agenda.dias || []).map(Number));
        }
        setEtapa(2);
      } catch (error) {
        setErro(mensagemDeErro(error, 'Não foi possível montar a proposta.'));
      } finally {
        gerandoRef.current = false;
        setGerando(false);
      }
    },
    [perfil, preferencias, personalizacao, agendaPedido],
  );

  const carregarAlternativas = useCallback(
    async (sessao, posicao) => api.alternativasPrevia({ ...montarCorpo(), sessao, posicao }),
    [montarCorpo],
  );

  const salvar = async (confirmarSubstituicao = false) => {
    if (!proposta?.assinatura || salvandoRef.current) return;
    if (
      modoAgenda === 'calendario' &&
      !diasValidos({ modo: 'calendario', dias: diasFixos }, proposta.sessoesPorSemana)
    ) {
      setErro(`Escolha exatamente ${proposta.sessoesPorSemana} dias, um para cada treino.`);
      setEtapa(1);
      return;
    }
    salvandoRef.current = true;
    setSalvando(true);
    setErro('');
    try {
      const corpo = {
        ...montarCorpo({ agenda: agendaPedido() }),
        assinaturaPrevia: proposta.assinatura,
        baseVersao: proposta.baseVersao ?? undefined,
        confirmarSubstituicao,
      };
      const resposta = await api.salvarRotina(corpo);
      if (resposta?.data?.perfilAlterado && resposta.data.user) {
        updateUser?.(resposta.data.user);
      }
      await onSalvo?.(resposta.data);
      onFechar?.();
    } catch (error) {
      if (!error?.response) {
        try {
          const atual = await api.getRotina();
          if (atual?.success && atual.data?.rotina?.assinatura === proposta.assinatura) {
            await onSalvo?.(atual.data);
            onFechar?.();
            return;
          }
        } catch {
          setErro('Sem resposta do servidor. Verifique sua conexão e tente de novo.');
          return;
        }
      }
      const codigo = codigoDoErro(error);
      if (codigo === 'sessoes_em_andamento') {
        setAviso({
          titulo: 'Treino em andamento',
          mensagem:
            'Você tem um treino em andamento. Conclua ou encerre esse treino antes de alterar sua programação.',
        });
      } else if (codigo === 'previa_desatualizada' && error.response?.data?.proposta) {
        setProposta(error.response.data.proposta);
        setErro('A proposta foi atualizada. Revise antes de salvar.');
      } else {
        setErro(mensagemDeErro(error, 'Não foi possível salvar a rotina.'));
      }
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  };

  const passo = reduzir
    ? { duration: 0 }
    : { duration: 0.22, ease: CURVA };

  return (
    <Painel>
      <Surge ordem={0}>
        <Topo>
          <BotaoTexto type="button" onClick={etapa === 0 ? onFechar : () => setEtapa((atual) => Math.max(0, atual - 1))}>
            <FiArrowLeft aria-hidden="true" />
            {etapa === 0 ? 'Voltar' : 'Etapa anterior'}
          </BotaoTexto>
          <Olho>
            {etapa + 1} de 3
          </Olho>
        </Topo>
      </Surge>

      <Surge ordem={1}>
        <Cartao>
          <AnimatePresence mode="wait" initial={false}>
            <Etapa
              key={etapa === 2 && proposta ? 'previa' : etapa === 2 ? 'montando' : `etapa-${etapa}`}
              initial={reduzir ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduzir ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={passo}
            >
              {etapa === 0 && (
                <EtapaPerfil
                  perfil={perfil}
                  onAlterar={(campo, valor) => setPerfil((atual) => ({ ...atual, [campo]: valor }))}
                  onContinuar={() => {
                    setErro('');
                    setEtapa(1);
                  }}
                />
              )}

              {etapa === 1 && (
                <EtapaOrganizacao
                  modo={modoAgenda}
                  onModo={setModoAgenda}
                  dias={diasFixos}
                  onDias={setDiasFixos}
                  preferencias={preferencias}
                  onPreferencias={setPreferencias}
                  opcoes={opcoes}
                  carregando={carregandoOpcoes}
                  gerando={gerando}
                  erro={erro}
                  alterando={Boolean(rotinaAtiva)}
                  onVoltar={() => setEtapa(0)}
                  onGerar={() => {
                    const agenda = agendaPedido();
                    setPersonalizacao((atual) => ({ ...atual, agenda, estrategia: null }));
                    gerarPrevia({ tipo: 'agenda', agenda, estrategia: null });
                  }}
                />
              )}

              {etapa === 2 && gerando && !proposta && (
                <div>
                  <TituloCartao>Montando sua rotina</TituloCartao>
                  <Texto>Analisando perfil, recuperação e tempo disponível.</Texto>
                  <Esqueleto $altura="72px" />
                </div>
              )}

              {etapa === 2 && proposta && (
                <EtapaPrevia
                  proposta={proposta}
                  perfil={perfil}
                  rotinaAtual={rotinaAtiva}
                  gerando={gerando}
                  salvando={salvando}
                  erro={erro}
                  onAjustar={(destino) => setEtapa(destino === 'duracao' || destino === 'experiencia' ? 0 : 1)}
                  onSalvar={() => salvar(false)}
                  onTrocar={setTroca}
                />
              )}
            </Etapa>
          </AnimatePresence>
        </Cartao>
      </Surge>

      <TrocaExercicioDialog
        alvo={troca}
        carregar={carregarAlternativas}
        onEscolher={async (opcao) => {
          await gerarPrevia({
            tipo: 'troca',
            sessao: troca.sessao,
            posicao: troca.posicao,
            exercicioId: opcao.exercicioId,
          });
          setTroca(null);
        }}
        onFechar={() => setTroca(null)}
        aplicando={gerando}
      />

      <DialogoAcao
        aberto={Boolean(aviso)}
        tipo="alerta"
        titulo={aviso?.titulo}
        mensagem={aviso?.mensagem}
        linhaUnica
        rotuloConfirmar="OK"
        onConfirmar={() => setAviso(null)}
        onCancelar={() => setAviso(null)}
      />
    </Painel>
  );
};

const Painel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const Etapa = styled(motion.div)``;

const Topo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
`;

export default AssistenteRotina;
