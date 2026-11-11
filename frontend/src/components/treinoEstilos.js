import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    var(--gradient-start) 0%,
    var(--gradient-mid) 50%,
    var(--gradient-end) 100%
  );
  color: var(--text);
  overflow-y: auto;
  overflow-x: hidden;
`;

export const Header = styled.header`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(198, 169, 100, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const Logo = styled.h1`
  font-family: 'Cinzel', serif;
  font-size: 2rem;
  line-height: 1.1;
  letter-spacing: 0.14em;
  padding-left: 0.14em;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  cursor: default;
`;

export const BackButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  font-family: 'Poppins', sans-serif;
  padding: 12px 18px;
  border-radius: 5px;
  font-size: 0.9rem;
  line-height: 0.8;
  letter-spacing: 0.14em;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: var(--accent);
    color: var(--background);
  }

  svg {
    font-size: 1.2rem;
  }
`;

export const MainContent = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;


export const TreinoDisplay = styled.div`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(198, 169, 100, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

export const TreinoHeader = styled.div`
  border-bottom: 3px solid #f0f0f0;
  padding-bottom: 1.25rem;
  margin-bottom: 1.25rem;
`;

export const TreinoTitulo = styled.h2`
  color: var(--white);
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  cursor: default;
  user-select: none;
`;

export const MetaTag = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(198, 169, 100, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: default;
  user-select: none;

  svg {
    color: var(--accent);
  }
`;

export const TreinoObjetivo = styled.p`
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  cursor: default;
  user-select: none;
`;

export const ActionButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.85rem;
`;

export const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${(props) => props.color};
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }
`;

export const RealizadoBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #4ecdc4;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  margin-top: 1rem;
  width: fit-content;
  cursor: default;
  user-select: none;

  svg {
    font-size: 1.2rem;
  }
`;

export const ExerciciosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const ExercicioCard = styled.div`
  display: flex;
  gap: 0.85rem;
  background: ${(props) => (props.completo ? '#14201f' : '#1a1a1a')};
  border: 1px solid ${(props) => (props.completo ? 'rgba(125, 206, 198, 0.45)' : 'rgba(255, 255, 255, 0.08)')};
  border-left: 4px solid
    ${(props) => (props.completo ? '#7dcec6' : props.emDescanso ? '#ffd93d' : 'var(--accent)')};
  border-radius: 12px;
  padding: 0.85rem 0.9rem;
  position: relative;
  overflow: hidden;

  ${(props) =>
    props.emDescanso &&
    `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, 
        transparent 0%, 
        rgba(255, 217, 61, 0.1) 50%, 
        transparent 100%
      );
      animation: shimmer 2s infinite;
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `}

  &:hover {
    border-color: ${(props) => (props.completo ? 'rgba(125, 206, 198, 0.7)' : 'rgba(198, 169, 100, 0.4)')};
  }
`;

export const ExercicioNumero = styled.div`
  background: ${(props) => (props.completo ? '#1c3d3a' : '#141414')};
  color: ${(props) => (props.completo ? '#7dcec6' : 'var(--accent)')};
  border: 1px solid ${(props) => (props.completo ? 'rgba(125, 206, 198, 0.5)' : 'rgba(198, 169, 100, 0.45)')};
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${(props) => (props.completo ? '1.05rem' : '0.95rem')};
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.3s ease;

  ${(props) =>
    props.completo &&
    `
    animation: pulseComplete 2s infinite;
    
    @keyframes pulseComplete {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `}
`;

export const ExercicioInfo = styled.div`
  flex: 1;
`;

export const ExercicioDemo = styled.div`
  width: 168px;
  margin: 0 0 0.7rem;
`;

export const DemoVideo = styled.video`
  display: block;
  width: 168px;
  height: 96px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid rgba(198, 169, 100, 0.45);
  background: #0a0a0a;
`;

export const DemoIndisponivel = styled.div`
  width: 168px;
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.6rem;
  border-radius: 4px;
  border: 1px solid rgba(198, 169, 100, 0.35);
  background: #111111;
  color: #c6a964;
  font-family: 'Marcellus', serif;
  font-size: 0.78rem;
  line-height: 1.25;
`;

export const ExercicioNome = styled.h3`
  color: var(--white);
  font-size: 1.15rem;
  margin-bottom: 0.3rem;
  font-weight: 600;
`;

export const PorcaoMuscular = styled.div`
  color: var(--accent);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.65rem;
  text-transform: capitalize;
`;

export const Tecnica = styled.div`
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(198, 169, 100, 0.1);
  border-radius: 8px;

  strong {
    color: var(--white);
    margin-right: 0.5rem;
  }
`;

export const Equipamentos = styled.div`
  color: #999;
  font-size: 0.9rem;
  font-style: italic;

  strong {
    color: #666;
    margin-right: 0.25rem;
  }
`;

export const ResumoSection = styled.div`
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0.85rem 0 0;
  margin-top: 0.25rem;
`;

export const ResumoTitulo = styled.h3`
  color: var(--white);
  font-size: 1.05rem;
  margin-bottom: 0.65rem;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.02em;
`;

export const ResumoTexto = styled.p`
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1.8;
  white-space: pre-line;
`;


export const TimerSection = styled.div`
  margin: 1.25rem 0;
`;

export const IniciarTreinoButton = styled(motion.button)`
  width: 100%;
  background: var(--gold-gradient);
  color: var(--background);
  border: none;
  padding: 0.85rem 1.25rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(198, 169, 100, 0.3);

  svg {
    font-size: 1.1rem;
  }

  &:hover {
    box-shadow: 0 12px 32px rgba(198, 169, 100, 0.5);
  }
`;

export const ExercicioHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
`;

export const SeriesProgress = styled.div`
  margin-bottom: 1rem;
`;

export const SeriesProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

export const SeriesProgressLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
`;

export const SeriesProgressPercentual = styled.div`
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 700;
`;

export const SeriesProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
`;

export const SeriesProgressFill = styled.div`
  height: 100%;
  background: var(--gold-gradient);
  width: ${(props) => props.progresso}%;
  border-radius: 4px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(198, 169, 100, 0.5);
`;

