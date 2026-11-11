import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiPlay } from 'react-icons/fi';
import api from '../services/api';

const ROTULOS = {
  hipertrofia: 'Hipertrofia',
  forca: 'Força',
  resistencia: 'Resistência muscular',
};

const mensagemFalha = (error) => {
  if (!error?.response) {
    return 'Não foi possível montar a programação. O servidor não respondeu.';
  }
  if (error.response.status === 401 || error.response.status === 403) {
    return 'Não foi possível montar a programação. Entre novamente para consultar suas sessões.';
  }
  return error.message || 'Não foi possível montar a programação.';
};

const estadoDa = (sessao, andamentoId) => {
  if (sessao.realizado) return 'Realizado';
  if (sessao.treinoId && sessao.treinoId === andamentoId) return 'Em andamento';
  if (sessao.treinoId) return 'Salvo';
  return 'Ainda não salvo';
};

const ProgramaSemanalPainel = ({ onAtualizado, onPrograma }) => {
  const navigate = useNavigate();
  const [programa, setPrograma] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [andamentoId, setAndamentoId] = useState(null);

  const publicar = (dados) => {
    setPrograma(dados);
    if (onPrograma) onPrograma(dados);
  };

  const carregar = async () => {
    setCarregando(true);
    setErro('');
    try {
      const resposta = await api.getWorkoutProgram();
      if (!resposta?.success || !resposta.data?.sessoes?.length) {
        publicar(null);
        setErro('A consulta da programação não devolveu sessões utilizáveis.');
        return;
      }
      publicar(resposta.data);
    } catch (error) {
      publicar(null);
      setErro(mensagemFalha(error));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    const pendente = programa?.sessoes?.find((sessao) => !sessao.realizado && sessao.treinoId);
    if (!pendente) {
      setAndamentoId(null);
      return undefined;
    }
    let ativo = true;
    api
      .getWorkoutExecution(pendente.treinoId)
      .then((resposta) => {
        if (!ativo) return;
        const execucao = resposta?.data;
        const aberta = Boolean(execucao?.iniciadoEm) && execucao.status !== 'concluida';
        setAndamentoId(aberta ? pendente.treinoId : null);
      })
      .catch(() => {
        if (ativo) setAndamentoId(null);
      });
    return () => {
      ativo = false;
    };
  }, [programa]);

  const salvar = async (codigo) => {
    if (salvando) return null;
    setSalvando(true);
    setErro('');
    try {
      const resposta = await api.saveWorkoutProgram();
      const dados = resposta?.data;
      if (!dados?.sessoes?.length) {
        setErro('A programação foi enviada, mas a resposta não trouxe as sessões.');
        return null;
      }
      publicar(dados);
      if (onAtualizado) onAtualizado();
      if (codigo) {
        const sessao = dados.sessoes.find((item) => item.codigo === codigo);
        if (sessao?.treinoId) navigate(`/treino/${sessao.treinoId}`);
      }
      return dados;
    } catch (error) {
      setErro(error?.message || 'Não foi possível salvar a programação.');
      return null;
    } finally {
      setSalvando(false);
    }
  };

  const abrir = (sessao) => {
    if (sessao.treinoId) {
      navigate(`/treino/${sessao.treinoId}`);
      return;
    }
    salvar(sessao.codigo);
  };

  const iniciar = async (sessao) => {
    if (sessao.treinoId) {
      navigate(`/treino/${sessao.treinoId}/executar`);
      return;
    }
    await salvar(sessao.codigo);
  };

  if (carregando) {
    return (
      <Painel>
        <Olho>Minha programação</Olho>
        <Nota>Montando a programação a partir do seu perfil. Esta consulta não grava treinos.</Nota>
      </Painel>
    );
  }

  if (!programa) {
    return (
      <Painel role="alert">
        <Olho>Minha programação</Olho>
        <Erro>{erro || 'Programação indisponível.'}</Erro>
        <BotaoSecundario type="button" onClick={carregar} style={{ marginTop: '0.85rem' }}>
          Tentar de novo
        </BotaoSecundario>
      </Painel>
    );
  }

  const proxima = programa.sessoes.find((sessao) => !sessao.realizado) || null;
  const acaoProxima = proxima
    ? !proxima.treinoId
      ? 'Salvar e abrir'
      : proxima.treinoId === andamentoId
        ? 'Continuar'
        : 'Iniciar'
    : '';

  return (
    <Bloco>
      <Hero
        as={motion.section}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Olho>Próximo treino</Olho>
        {proxima ? (
          <>
            <TituloHero>{proxima.nome}</TituloHero>
            <Grupos>{(proxima.grupos || []).join(' · ') || proxima.foco}</Grupos>
            <MetaLinha>
              <span>
                <FiClock /> {proxima.duracaoEstimadaMinutos} min estimados
              </span>
              <span>{(proxima.exercicios || []).length} exercícios</span>
              <Estado $feito={proxima.realizado} $andamento={proxima.treinoId === andamentoId}>
                {estadoDa(proxima, andamentoId)}
              </Estado>
            </MetaLinha>
            <AcoesHero>
              <BotaoPrincipal type="button" disabled={salvando} onClick={() => iniciar(proxima)}>
                <FiPlay />
                {salvando ? 'Salvando...' : acaoProxima}
              </BotaoPrincipal>
              {proxima.treinoId && (
                <BotaoSecundario type="button" onClick={() => abrir(proxima)}>
                  Abrir ficha
                </BotaoSecundario>
              )}
            </AcoesHero>
          </>
        ) : (
          <Nota>
            Todas as sessões salvas desta programação já foram realizadas. A próxima só aparece depois
            de uma atualização explícita da programação.
          </Nota>
        )}
      </Hero>

      <Painel>
        <Cabecalho>
          <div>
            <Olho>Minha programação</Olho>
            <Titulo>{programa.rotulo}</Titulo>
            <Resumo>
              {programa.dias} {programa.dias === 1 ? 'sessão' : 'sessões'} · até {programa.minutos} min ·{' '}
              {ROTULOS[programa.modo] || programa.modo}
            </Resumo>
          </div>
          {!programa.salvo && (
            <BotaoPrincipal type="button" disabled={salvando} onClick={() => salvar()}>
              {salvando ? 'Salvando...' : 'Salvar programação'}
            </BotaoPrincipal>
          )}
        </Cabecalho>
        <Nota>Sequência de sessões, sem dia fixo da semana. Abrir esta tela não grava treino novo.</Nota>
        {(programa.origemDias === 'padrao' || programa.origemMinutos === 'padrao') && (
          <Nota>O perfil não informa dias ou duração. A sugestão usa 3 sessões de até 60 minutos.</Nota>
        )}
        {programa.dias <= 3 && (
          <Nota>Nas sessões de corpo inteiro, deixe um intervalo entre um treino e outro.</Nota>
        )}
        {erro && <Erro role="alert">{erro}</Erro>}
        <Lista>
          {programa.sessoes.map((sessao) => (
            <Cartao key={sessao.codigo} type="button" onClick={() => abrir(sessao)}>
              <Ordem>Sessão {sessao.ordem}</Ordem>
              <NomeCartao>{sessao.nome}</NomeCartao>
              <Grupos>{(sessao.grupos || []).join(' · ') || sessao.foco}</Grupos>
              <MetaLinha>
                <span>{sessao.duracaoEstimadaMinutos} min</span>
                <span>{(sessao.exercicios || []).length} exercícios</span>
              </MetaLinha>
              <Estado $feito={sessao.realizado} $andamento={sessao.treinoId === andamentoId}>
                {estadoDa(sessao, andamentoId)}
              </Estado>
            </Cartao>
          ))}
        </Lista>
      </Painel>
    </Bloco>
  );
};

const Bloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const superficie = `
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
`;

const Painel = styled.section`
  ${superficie}
  padding: 1.15rem 1.2rem 1.25rem;
`;

const Hero = styled.section`
  ${superficie}
  padding: 1.2rem 1.25rem 1.25rem;
  border-color: rgba(198, 169, 100, 0.38);
`;

const Cabecalho = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
`;

const Olho = styled.p`
  margin: 0;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const Titulo = styled.h2`
  margin: 0.35rem 0 0.2rem;
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 1.2rem;
  letter-spacing: 0.02em;
  text-transform: none;
`;

const TituloHero = styled.h2`
  margin: 0.4rem 0 0.25rem;
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 1.45rem;
  line-height: 1.25;
  letter-spacing: 0.02em;
  text-transform: none;
`;

const Resumo = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
`;

const Nota = styled.p`
  margin: 0.7rem 0 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.4;
`;

const Erro = styled.p`
  color: #e8b4b4;
  margin: 0.75rem 0 0;
  line-height: 1.4;
`;

const Grupos = styled.p`
  margin: 0.2rem 0 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
`;

const MetaLinha = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  margin-top: 0.55rem;
  color: var(--text-secondary);
  font-size: 0.88rem;

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  svg {
    color: var(--accent);
  }
`;

const Estado = styled.span`
  color: ${(props) => (props.$feito ? '#7dcec6' : props.$andamento ? 'var(--accent)' : 'var(--text-secondary)')};
  font-size: 0.82rem;
`;

const AcoesHero = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
`;

const BotaoPrincipal = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 42px;
  padding: 0.55rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: #1a1a1a;
  font-family: 'Cinzel', serif;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: none;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const BotaoSecundario = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: var(--text-secondary);
  font-family: 'Cinzel', serif;
  font-size: 0.88rem;
  letter-spacing: 0.04em;
  text-transform: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const Lista = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
`;

const Cartao = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.85rem 0.9rem;
  color: inherit;
  cursor: pointer;
  letter-spacing: 0;
  text-transform: none;

  &:hover {
    border-color: rgba(198, 169, 100, 0.45);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const Ordem = styled.span`
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const NomeCartao = styled.span`
  margin-top: 0.3rem;
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 0.98rem;
  line-height: 1.3;
  text-transform: none;
`;

export default ProgramaSemanalPainel;
