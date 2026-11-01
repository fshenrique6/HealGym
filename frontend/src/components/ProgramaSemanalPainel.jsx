import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiCheck } from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const ROTULOS = {
  hipertrofia: 'Hipertrofia',
  forca: 'Força',
  resistencia: 'Resistência muscular',
};

const ProgramaSemanalPainel = ({ onAtualizado }) => {
  const navigate = useNavigate();
  const [programa, setPrograma] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = async () => {
    setCarregando(true);
    setErro('');
    try {
      const resposta = await api.getWorkoutProgram();
      setPrograma(resposta?.data || null);
    } catch {
      setErro('Não foi possível montar a programação.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const salvar = async (codigo) => {
    if (salvando) return;
    setSalvando(true);
    setErro('');
    try {
      const resposta = await api.saveWorkoutProgram();
      const dados = resposta?.data;
      setPrograma(dados || null);
      if (onAtualizado) onAtualizado();
      if (codigo && dados?.sessoes) {
        const sessao = dados.sessoes.find((item) => item.codigo === codigo);
        if (sessao?.treinoId) {
          navigate(`/treino/${sessao.treinoId}`);
        }
      }
    } catch {
      setErro('Não foi possível salvar a programação.');
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

  if (carregando) {
    return (
      <Painel>
        <LoadingSpinner />
      </Painel>
    );
  }

  if (!programa) {
    return (
      <Painel>
        <Erro>{erro || 'Programação indisponível.'}</Erro>
      </Painel>
    );
  }

  return (
    <Painel
      as={motion.section}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <Cabecalho>
        <div>
          <Olho>Programação recomendada</Olho>
          <Titulo>{programa.rotulo}</Titulo>
          <Resumo>
            {programa.dias} {programa.dias === 1 ? 'sessão' : 'sessões'} · até {programa.minutos} min ·{' '}
            {ROTULOS[programa.modo] || programa.modo}
          </Resumo>
        </div>
        {!programa.salvo && (
          <Salvar
            type="button"
            disabled={salvando}
            onClick={() => salvar()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {salvando ? 'Salvando...' : 'Salvar programação'}
          </Salvar>
        )}
      </Cabecalho>
      <Nota>
        As sessões não estão presas a um dia da semana. Encaixe na sua agenda e deixe intervalo quando
        duas sessões de corpo inteiro se seguirem. Consultar esta tela não grava treino novo.
      </Nota>
      {programa.origemDias === 'padrao' && (
        <Nota>Sem dias no perfil, a sugestão inicial é de 3 sessões de 60 minutos.</Nota>
      )}
      {erro && <Erro>{erro}</Erro>}
      <Lista>
        {programa.sessoes.map((sessao, indice) => (
          <Cartao
            key={sessao.codigo}
            role="button"
            tabIndex={0}
            onClick={() => abrir(sessao)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                abrir(sessao);
              }
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: indice * 0.04 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <CartaoTopo>
              <Nome>{sessao.nome}</Nome>
              {sessao.realizado && (
                <Feito>
                  <FiCheck /> Realizado
                </Feito>
              )}
            </CartaoTopo>
            <Meta>
              <FiClock />
              {sessao.duracaoEstimadaMinutos} min estimados · até {sessao.tempoDisponivel} min
            </Meta>
            <Grupos>{(sessao.grupos || []).join(' · ')}</Grupos>
            <Relacao>{sessao.relacao}</Relacao>
            <Exercicios>
              {(sessao.exercicios || []).map((exercicio) => (
                <li key={exercicio.uid || exercicio.exercicioId}>
                  <strong>{exercicio.nome}</strong>
                  {' · '}
                  {exercicio.series}×{exercicio.repeticoes}
                  {exercicio.descanso ? ` · ${exercicio.descanso}` : ''}
                  {exercicio.rirAlvo ? ` · RIR ${exercicio.rirAlvo}` : ''}
                </li>
              ))}
            </Exercicios>
            <Abrir>{sessao.treinoId ? 'Abrir sessão' : 'Salvar e abrir'}</Abrir>
          </Cartao>
        ))}
      </Lista>
    </Painel>
  );
};

const Painel = styled.section`
  background: var(--card-bg);
  border: 1px solid rgba(198, 169, 100, 0.22);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
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
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Titulo = styled.h2`
  margin: 0.35rem 0 0.25rem;
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 1.45rem;
  letter-spacing: 0.04em;
  text-transform: none;
`;

const Resumo = styled.p`
  margin: 0;
  color: var(--text-secondary);
`;

const Nota = styled.p`
  margin: 0.85rem 0 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.45;
`;

const Erro = styled.p`
  color: #e8b4b4;
  margin: 0.75rem 0 0;
`;

const Salvar = styled(motion.button)`
  background: var(--accent);
  color: #1a1a1a;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0;
  text-transform: none;
`;

const Lista = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.9rem;
  margin-top: 1rem;
`;

const Cartao = styled(motion.article)`
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(198, 169, 100, 0.18);
  border-radius: 10px;
  padding: 0.9rem;
  color: inherit;
  cursor: pointer;
  letter-spacing: 0;
  text-transform: none;
`;

const CartaoTopo = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
`;

const Nome = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: var(--white);
  text-transform: none;
  letter-spacing: 0;
`;

const Feito = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--accent);
  font-size: 0.8rem;
`;

const Meta = styled.p`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.45rem 0 0;
  color: var(--text-secondary);
  font-size: 0.88rem;

  svg {
    color: var(--accent);
  }
`;

const Grupos = styled.p`
  margin: 0.35rem 0 0;
  color: var(--accent);
  font-size: 0.88rem;
`;

const Relacao = styled.p`
  margin: 0.4rem 0 0;
  color: var(--text-secondary);
  font-size: 0.84rem;
  line-height: 1.4;
`;

const Exercicios = styled.ul`
  margin: 0.55rem 0 0;
  padding-left: 1rem;
  color: var(--text);
  font-size: 0.84rem;
  line-height: 1.45;

  strong {
    font-weight: 600;
  }
`;

const Abrir = styled.span`
  display: inline-block;
  margin-top: 0.7rem;
  color: var(--accent);
  font-size: 0.86rem;
`;

export default ProgramaSemanalPainel;
