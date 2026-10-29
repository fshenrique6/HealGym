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
  gap: 1rem;
  margin-top: 1.5rem;
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
  gap: 1rem;
  background: ${(props) => (props.completo ? 'rgba(78, 205, 196, 0.1)' : 'rgba(255, 255, 255, 0.03)')};
  border: 1px solid ${(props) => (props.completo ? '#4ecdc4' : 'rgba(198, 169, 100, 0.1)')};
  border-left: 4px solid
    ${(props) => (props.completo ? '#4ecdc4' : props.emDescanso ? '#ffd93d' : 'var(--accent)')};
  border-radius: 8px;
  padding: 1.1rem;
  transition: all 0.3s ease;
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
    background: ${(props) => (props.completo ? 'rgba(78, 205, 196, 0.15)' : 'rgba(255, 255, 255, 0.05)')};
    transform: translateX(5px);
  }
`;

export const ExercicioNumero = styled.div`
  background: ${(props) =>
    props.completo
      ? 'linear-gradient(135deg, #4ecdc4 0%, #44a3a0 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  color: white;
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
  background: rgba(198, 169, 100, 0.1);
  border: 1px solid rgba(198, 169, 100, 0.2);
  border-radius: 8px;
  padding: 2rem;
  margin-top: 2rem;
`;

export const ResumoTitulo = styled.h3`
  color: var(--accent);
  font-size: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
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



export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  cursor: default;
`;

export const ModalContainer = styled.div`
  background: linear-gradient(135deg, rgba(26, 26, 26, 0.98) 0%, rgba(10, 10, 10, 0.98) 100%);
  border: 2px solid var(--accent);
  border-radius: 16px;
  max-width: min(92vw, 960px);
  width: max-content;
  box-shadow: 0 20px 60px rgba(198, 169, 100, 0.3);
  overflow: hidden;
  cursor: default;
`;

export const ModalHeader = styled.div`
  background: rgba(198, 169, 100, 0.1);
  border-bottom: 1px solid var(--accent);
  padding: 1.5rem 2rem;
  cursor: default;
`;

export const ModalTitulo = styled.h2`
  color: var(--white);
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  cursor: default;
`;

export const ModalBody = styled.div`
  padding: 2rem;
  width: 110%;
  cursor: default;
`;

export const ModalMensagem = styled.p`
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 0;
  cursor: default;
  white-space: normal;
  overflow-wrap: break-word;
  max-width: 62ch;
`;

export const ModalFooter = styled.div`
  padding: 1.5rem 2rem;
  border-top: 1px solid rgba(198, 169, 100, 0.2);
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  cursor: default;
`;

export const ModalButton = styled(motion.button)`
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${(props) => props.color};
  color: ${(props) => (props.color === '#6c757d' ? 'white' : 'var(--background)')};
  min-width: 120px;

  &:hover {
    filter: brightness(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

