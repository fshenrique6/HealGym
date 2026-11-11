import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiEdit2, FiX } from 'react-icons/fi';
import { LuDumbbell } from 'react-icons/lu';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  DIAS,
  DURACOES,
  EXPERIENCIAS,
  FREQUENCIAS,
  OBJETIVOS,
  rotulo,
  validarCampoTreino,
} from '../utils/perfilTreino';

const opcoesNumero = (valores, sufixo) =>
  valores.map((valor) => ({ value: String(valor), label: `${valor} ${sufixo}` }));

const PerfilTreinoCard = () => {
  const { user, updateUser } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [campoAberto, setCampoAberto] = useState(null);
  const [rascunho, setRascunho] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const enviando = useRef(false);
  const perfil = user?.profile || {};
  const reduzirMovimento =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transicao = reduzirMovimento
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] };

  const itens = [
    {
      campo: 'trainingGoal',
      rotulo: 'Objetivo',
      valor: perfil.trainingGoal || '',
      display: rotulo(OBJETIVOS, perfil.trainingGoal),
      opcoes: OBJETIVOS,
    },
    {
      campo: 'trainingExperience',
      rotulo: 'Experiência',
      valor: perfil.trainingExperience || '',
      display: rotulo(EXPERIENCIAS, perfil.trainingExperience),
      opcoes: EXPERIENCIAS,
    },
    {
      campo: 'recentFrequency',
      rotulo: 'Frequência recente',
      valor: perfil.recentFrequency || '',
      display: rotulo(FREQUENCIAS, perfil.recentFrequency),
      opcoes: FREQUENCIAS,
    },
    {
      campo: 'availableDays',
      rotulo: 'Dias disponíveis',
      valor: perfil.availableDays ? String(perfil.availableDays) : '',
      display: perfil.availableDays ? `${perfil.availableDays} por semana` : 'Não informado',
      opcoes: opcoesNumero(DIAS, 'por semana'),
    },
    {
      campo: 'preferredSessionMinutes',
      rotulo: 'Duração',
      valor: perfil.preferredSessionMinutes ? String(perfil.preferredSessionMinutes) : '',
      display: DURACOES.includes(Number(perfil.preferredSessionMinutes))
        ? `${perfil.preferredSessionMinutes} min`
        : 'Não informado',
      opcoes: opcoesNumero(DURACOES, 'min'),
    },
  ];

  useEffect(() => {
    if (!campoAberto) {
      setErro('');
    }
  }, [campoAberto, user]);

  const abrir = (item) => {
    setRascunho(item.valor);
    setErro('');
    setCampoAberto(item.campo);
  };

  const cancelar = () => {
    setErro('');
    setCampoAberto(null);
  };

  const salvar = async (item) => {
    if (enviando.current) return;

    const mensagem = validarCampoTreino(item.campo, rascunho);
    if (mensagem) {
      setErro(mensagem);
      return;
    }

    const numerico = item.campo === 'availableDays' || item.campo === 'preferredSessionMinutes';
    const enviado = numerico ? Number(rascunho) : rascunho;
    enviando.current = true;
    setSalvando(true);
    setErro('');
    try {
      const response = await api.updateProfile({ [item.campo]: enviado });
      const atual = response.user?.profile?.[item.campo];
      const confere = numerico ? Number(atual) === enviado : atual === enviado;
      if (!confere) {
        throw new Error('O servidor não confirmou os dados de treino.');
      }
      updateUser(response.user);
      setCampoAberto(null);
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar esta informação.');
    } finally {
      enviando.current = false;
      setSalvando(false);
    }
  };

  return (
    <Secao>
      <Botao
        type="button"
        $aberto={aberto}
        aria-expanded={aberto}
        aria-controls="perfil-de-treino"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setAberto((atual) => !atual)}
      >
        <LuDumbbell aria-hidden="true" />
        Perfil de treino
      </Botao>
      <AnimatePresence initial={false}>
        {aberto && (
          <Painel
            id="perfil-de-treino"
            key="perfil-de-treino"
            initial={reduzirMovimento ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={transicao}
          >
            <Grade>
      {itens.map((item) => {
        const editando = campoAberto === item.campo;
        return (
          <Item key={item.campo}>
            <Chave>{item.rotulo}</Chave>
            {editando ? (
              <Editor
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Selecao
                  value={rascunho}
                  aria-label={item.rotulo}
                  autoFocus
                  onChange={(event) => setRascunho(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    salvar(item);
                  }}
                >
                  {item.opcoes.map((opcao) => (
                    <option key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </option>
                  ))}
                </Selecao>
                <Acoes>
                  <Lapis
                    type="button"
                    onClick={() => salvar(item)}
                    disabled={salvando}
                    aria-label={`Salvar ${item.rotulo}`}
                  >
                    <FiCheck />
                  </Lapis>
                  <Lapis
                    type="button"
                    onClick={cancelar}
                    disabled={salvando}
                    aria-label={`Cancelar edição de ${item.rotulo}`}
                  >
                    <FiX />
                  </Lapis>
                </Acoes>
                {erro && <Erro>{erro}</Erro>}
              </Editor>
            ) : (
              <LinhaValor>
                <Valor>{item.display}</Valor>
                <Lapis
                  type="button"
                  aria-label={`Editar ${item.rotulo}`}
                  onClick={() => abrir(item)}
                >
                  <FiEdit2 />
                </Lapis>
              </LinhaValor>
            )}
          </Item>
        );
      })}
            </Grade>
          </Painel>
        )}
      </AnimatePresence>
    </Secao>
  );
};

const Secao = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 1.35rem;
`;

const Botao = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  background: ${(props) => (props.$aberto ? 'rgba(198, 169, 100, 0.12)' : 'transparent')};
  border: 1px solid
    ${(props) => (props.$aberto ? 'rgba(198, 169, 100, 0.7)' : 'rgba(198, 169, 100, 0.45)')};
  color: var(--accent);
  border-radius: 8px;
  padding: 0.5rem 0.95rem;
  font-family: 'Cormorant', serif;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.03em;
  text-transform: none;
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  &:hover {
    background: rgba(198, 169, 100, 0.12);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const Painel = styled(motion.div)`
  width: 100%;
  overflow: hidden;
`;

const Grade = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
`;

const Item = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(198, 169, 100, 0.1);
  border-radius: 6px;
  padding: 0.75rem;
  text-align: center;
  cursor: default;
`;

const Chave = styled.div`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.82rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  margin-bottom: 0.25rem;
  font-weight: 400;
`;

const LinhaValor = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const Valor = styled.div`
  color: var(--white);
  font-size: 0.95rem;
  line-height: 1.25;
  font-weight: 600;
`;

const Lapis = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: var(--accent);
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover:not(:disabled) {
    background: rgba(198, 169, 100, 0.14);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const Editor = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Selecao = styled.select`
  width: 100%;
  padding: 8px 10px;
  border-radius: 5px;
  border: 1px solid rgba(198, 169, 100, 0.35);
  background: #0a0a0a;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 0.9rem;
  line-height: 1.25;
`;

const Acoes = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
`;

const Erro = styled.p`
  margin: 0;
  color: #ff6b6b;
  font-family: 'Cormorant', serif;
  font-size: 0.78rem;
  font-style: italic;
  line-height: 1.3;
`;

export default PerfilTreinoCard;
