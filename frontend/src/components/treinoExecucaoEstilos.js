import styled from 'styled-components';
import { motion } from 'framer-motion';

export const ExecucaoTopo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-bottom: 1.25rem;
`;

export const ExecucaoFaixa = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

export const Relogio = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--white);
  font-family: 'Courier New', monospace;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.08em;

  span {
    color: var(--text-secondary);
    font-family: 'Poppins', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
`;

export const ProgressoBloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

export const ProgressoTexto = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: var(--text-secondary);
  font-size: 0.88rem;

  strong {
    color: var(--white);
    font-weight: 600;
  }
`;

export const ProgressoTrilha = styled.div`
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
`;

export const ProgressoBarra = styled.div`
  height: 100%;
  width: ${(props) => props.valor}%;
  background: var(--gold-gradient);
  border-radius: 999px;
  transition: width 0.5s ease;
`;

export const MissaoCard = styled(motion.section)`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(198, 169, 100, 0.22);
  border-radius: 14px;
  padding: 1.15rem 1.1rem 1.05rem;
  transition: background 0.3s ease, border-color 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(198, 169, 100, 0.45);
  }
`;

export const ExercicioEtapa = styled.div`
  color: var(--accent);
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 0.45rem;
`;

export const NomeExercicio = styled.h2`
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.25;
  margin: 0 0 0.35rem;
`;

export const SerieAtual = styled.div`
  color: var(--white);
  font-size: 1rem;
  font-weight: 650;
  margin: 0.85rem 0 0.35rem;
`;

export const MetaExercicio = styled.p`
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0.15rem 0;
`;

export const Campos = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
  margin: 1.2rem 0 0.4rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const CampoBloco = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  color: var(--text-secondary);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const CampoGrande = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${(props) => (props.erro ? '#ff6b6b' : 'rgba(198, 169, 100, 0.35)')};
  border-radius: 10px;
  color: var(--white);
  font-family: inherit;
  font-size: 1.15rem;
  font-weight: 650;
  padding: 0.55rem 0.75rem;
  outline: none;
  transition: border-color 0.3s ease, background 0.3s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.28);
    font-weight: 500;
  }

  &:focus {
    border-color: var(--accent);
    background: rgba(255, 255, 255, 0.06);
  }

  &:disabled {
    opacity: 0.7;
  }
`;

export const BotaoConcluir = styled(motion.button)`
  width: 100%;
  margin-top: 1rem;
  background: var(--gold-gradient);
  color: var(--background);
  border: none;
  border-radius: 12px;
  padding: 0.85rem 1.1rem;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 750;
  letter-spacing: 0.12em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(198, 169, 100, 0.3);

  &:hover:not(:disabled) {
    box-shadow: 0 12px 32px rgba(198, 169, 100, 0.5);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

export const ProximoDiscreto = styled.p`
  color: var(--text-secondary);
  font-size: 0.88rem;
  margin: 1rem 0 0;
`;

export const AcoesExecucao = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1rem;
`;

export const ListaSeries = styled.ul`
  list-style: none;
  margin: 0.8rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

export const ItemSerie = styled.li`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  padding: 0.4rem 0;
  border-top: 1px solid rgba(198, 169, 100, 0.12);

`;

export const BotaoTexto = styled(motion.button)`
  background: none;
  border: none;
  color: var(--accent);
  font-family: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0;
  transition: color 0.3s ease;

  &:hover {
    color: var(--white);
  }
`;

export const DescansoTela = styled.div`
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.7rem;
  padding: 1.2rem 0.4rem 0.4rem;
`;

export const Anel = styled.div`
  position: relative;
  width: 168px;
  height: 168px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    position: absolute;
    inset: 0;
  }
`;

export const DescansoNumero = styled.div`
  color: var(--white);
  font-family: 'Courier New', monospace;
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  z-index: 1;
`;

export const DescansoTitulo = styled.div`
  color: var(--accent);
  font-family: 'Cinzel', serif;
  letter-spacing: 0.22em;
  font-size: 0.95rem;
`;

export const BotaoPular = styled(motion.button)`
  margin-top: 0.4rem;
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  font-family: inherit;
  letter-spacing: 0.1em;
  font-size: 0.85rem;
  padding: 0.7rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: var(--accent);
    color: var(--background);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const BotaoAcao = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  font-family: inherit;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: var(--accent);
    color: var(--background);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ResumoLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 1rem;
`;

export const ResumoLinha = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
  padding-bottom: 0.45rem;
  border-bottom: 1px solid rgba(198, 169, 100, 0.12);

  strong {
    color: var(--white);
    font-weight: 600;
  }
`;

export const AvisoExecucao = styled.p`
  color: #ffb4b4;
  font-size: 0.9rem;
  line-height: 1.45;
  margin: 0.8rem 0 0;
`;

export const Referencia = styled.p`
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.45;
  margin: 0.8rem 0 0;
  padding-left: 0.7rem;
  border-left: 2px solid rgba(198, 169, 100, 0.45);
`;
