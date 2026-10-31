import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { FiEdit2 } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CamposPerfilTreino from './CamposPerfilTreino';
import {
  dadosTreinoDoPerfil,
  DURACOES,
  EXPERIENCIAS,
  FREQUENCIAS,
  OBJETIVOS,
  payloadTreino,
  rotulo,
  validarCampoTreino,
  confirmarTreinoSalvo,
} from '../utils/perfilTreino';

const CAMPOS = [
  'trainingGoal',
  'trainingExperience',
  'recentFrequency',
  'availableDays',
  'preferredSessionMinutes',
];

const PerfilTreinoCard = () => {
  const { user, updateUser } = useAuth();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(() => dadosTreinoDoPerfil(user?.profile));
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const enviando = useRef(false);

  const perfil = user?.profile || {};
  const minutos = DURACOES.includes(Number(perfil.preferredSessionMinutes))
    ? `${perfil.preferredSessionMinutes} min`
    : 'Não informado';

  const abrir = () => {
    setForm(dadosTreinoDoPerfil(user?.profile));
    setErros({});
    setMensagem('');
    setEditando(true);
  };

  const alterar = (nome, valor) => {
    setForm((atual) => ({ ...atual, [nome]: valor }));
    setErros((atual) => ({ ...atual, [nome]: validarCampoTreino(nome, valor) }));
  };

  const salvar = async () => {
    if (enviando.current) {
      return;
    }

    const novos = {};
    CAMPOS.forEach((campo) => {
      const erro = validarCampoTreino(campo, form[campo]);
      if (erro) novos[campo] = erro;
    });
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      return;
    }

    const enviado = payloadTreino(form);
    enviando.current = true;
    setSalvando(true);
    setMensagem('');
    try {
      const response = await api.updateProfile(enviado);
      const divergencia = confirmarTreinoSalvo(enviado, response.user);
      if (divergencia) {
        throw new Error(divergencia);
      }
      updateUser(response.user);
      setEditando(false);
      setMensagem('Treino atualizado.');
    } catch (error) {
      setMensagem(error.message || 'Não foi possível salvar os dados de treino.');
    } finally {
      enviando.current = false;
      setSalvando(false);
    }
  };

  return (
    <Card>
      <Cabecalho>
        <Titulo>Treino</Titulo>
        {!editando && (
          <Editar type="button" onClick={abrir} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <FiEdit2 aria-hidden="true" />
            Editar
          </Editar>
        )}
      </Cabecalho>

      {!editando && (
        <Resumo>
          <Item>
            <Chave>Objetivo</Chave>
            <Valor>{rotulo(OBJETIVOS, perfil.trainingGoal)}</Valor>
          </Item>
          <Item>
            <Chave>Experiência</Chave>
            <Valor>{rotulo(EXPERIENCIAS, perfil.trainingExperience)}</Valor>
          </Item>
          <Item>
            <Chave>Frequência recente</Chave>
            <Valor>{rotulo(FREQUENCIAS, perfil.recentFrequency)}</Valor>
          </Item>
          <Item>
            <Chave>Dias disponíveis</Chave>
            <Valor>{perfil.availableDays ? `${perfil.availableDays} por semana` : 'Não informado'}</Valor>
          </Item>
          <Item>
            <Chave>Duração</Chave>
            <Valor>{minutos}</Valor>
          </Item>
        </Resumo>
      )}

      <AnimatePresence>
        {editando && (
          <Editor
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
          >
            <CamposPerfilTreino
              parte="tudo"
              valores={form}
              erros={erros}
              mostrarErros={erros}
              onChange={alterar}
            />
            <Acoes>
              <Cancelar type="button" onClick={() => setEditando(false)} disabled={salvando}>
                Cancelar
              </Cancelar>
              <Salvar type="button" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar treino'}
              </Salvar>
            </Acoes>
          </Editor>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mensagem && (
          <Aviso
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            $ok={mensagem === 'Treino atualizado.'}
          >
            {mensagem}
          </Aviso>
        )}
      </AnimatePresence>
    </Card>
  );
};

const Card = styled.section`
  margin-top: 1.25rem;
  padding: 0.9rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(198, 169, 100, 0.16);
  border-radius: 6px;
`;

const Cabecalho = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 0.75rem;
`;

const Titulo = styled.h3`
  margin: 0;
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 1.05rem;
  letter-spacing: 0.08em;
`;

const Editar = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  color: var(--accent);
  border: 1px solid rgba(198, 169, 100, 0.4);
  border-radius: 4px;
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  letter-spacing: 0;
  text-transform: none;
`;

const Resumo = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Item = styled.div`
  text-align: left;
`;

const Chave = styled.span`
  display: block;
  color: rgba(255, 255, 255, 0.55);
  font-family: 'Cormorant', serif;
  font-size: 0.82rem;
`;

const Valor = styled.span`
  display: block;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  line-height: 1.3;
`;

const Editor = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Acoes = styled.div`
  display: flex;
  gap: 10px;
`;

const Cancelar = styled.button`
  flex: 1;
  padding: 10px;
  background: transparent;
  color: var(--white);
  border: 1px solid rgba(198, 169, 100, 0.35);
  border-radius: 4px;
  font-family: 'Cormorant', serif;
  letter-spacing: 0;
  text-transform: none;

  &:disabled {
    opacity: 0.6;
  }
`;

const Salvar = styled.button`
  flex: 1.4;
  padding: 10px;
  background: var(--gold-gradient);
  color: var(--background);
  border-radius: 4px;
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  letter-spacing: 0;
  text-transform: none;

  &:disabled {
    opacity: 0.7;
  }
`;

const Aviso = styled(motion.p)`
  margin: 10px 0 0;
  text-align: center;
  font-family: 'Cormorant', serif;
  font-size: 0.92rem;
  color: ${(props) => (props.$ok ? '#c6a964' : 'var(--error, #ff6b6b)')};
`;

export default PerfilTreinoCard;
