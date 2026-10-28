import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

const LoadingSpinner = () => {
  return (
    <LoadingContainer>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Spinner />
        <LoadingText>Carregando...</LoadingText>
      </motion.div>
    </LoadingContainer>
  );
};

const spin = keyframes`
  0% { 
    transform: rotate(0deg); 
  }
  100% { 
    transform: rotate(360deg); 
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    var(--gradient-start) 0%,
    var(--gradient-mid) 50%,
    var(--gradient-end) 100%
  );
  color: var(--text);
  text-align: center;
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 3px solid rgba(198, 169, 100, 0.2);
  border-top: 3px solid var(--accent);
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 1rem;
`;

const LoadingText = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
`;

export default LoadingSpinner;
