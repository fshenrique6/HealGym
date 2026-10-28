import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ConfirmDeletePage = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const { logout } = useAuth();

  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const handleConfirmDeletion = async () => {
    setIsConfirming(true);
    setMessage('');

    try {
      const response = await api.confirmAccountDeletion(token);

      setMessage(response.message || 'Conta excluída com sucesso!');
      setIsSuccess(true);
      setShowConfirmation(false);

      setTimeout(() => {
        logout();
        navigate('/', { replace: true });
      }, 3000);
    } catch (error) {
      setMessage(error.message || 'Erro ao confirmar exclusão. O link pode ter expirado.');
      setIsSuccess(false);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <Container>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <LogoTitle>HealGym</LogoTitle>
      </motion.div>
      <ContentSection>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <TitleRow>
            <WarningIcon>🚨</WarningIcon>
            <PageTitle>⚠️ Confirmação de Exclusão de Conta</PageTitle>
          </TitleRow>
          <PageSubtitle>
            <div>Esta é sua última chance de reconsiderar</div>
            <div>Esta ação é permanente e irreversível</div>
          </PageSubtitle>

          {!message && (
            <WarningContainer>
              <WarningTitle>ATENÇÃO - AÇÃO IRREVERSÍVEL</WarningTitle>
              <WarningText>
                Você está prestes a <strong>EXCLUIR PERMANENTEMENTE</strong> sua conta no HealGym.
                Esta ação resultará na perda completa de:
              </WarningText>

              <WarningList>
                <li>
                  <ItemIcon>🗑️</ItemIcon>
                  <span>Todos os seus dados pessoais e de perfil</span>
                </li>
                <li>
                  <ItemIcon>🗑️</ItemIcon>
                  <span>Histórico completo de treinos e progressos</span>
                </li>
                <li>
                  <ItemIcon>🗑️</ItemIcon>
                  <span>Configurações e preferências personalizadas</span>
                </li>
                <li>
                  <ItemIcon>🗑️</ItemIcon>
                  <span>Acesso permanente à plataforma HealGym</span>
                </li>
              </WarningList>

              <FinalConfirmText>
                <strong>Tem certeza absoluta que deseja prosseguir?</strong>
              </FinalConfirmText>

              <ButtonGroup>
                <CancelButton type="button" onClick={handleCancel}>
                  💚 Não, Manter Minha Conta
                </CancelButton>

                <ConfirmButton
                  type="button"
                  onClick={() => setShowConfirmation(true)}
                  disabled={isConfirming}
                >
                  🗑️ Sim, Excluir Permanentemente
                </ConfirmButton>
              </ButtonGroup>
            </WarningContainer>
          )}

          <AnimatePresence>
            {message && (
              <MessageContainer
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={isSuccess ? 'success' : 'error'}
              >
                {isSuccess && <SuccessIcon>✅</SuccessIcon>}
                {!isSuccess && <ErrorIcon>❌</ErrorIcon>}
                <MessageText>{message}</MessageText>
                {isSuccess && <RedirectText>Redirecionando para a página inicial...</RedirectText>}
              </MessageContainer>
            )}
          </AnimatePresence>
        </motion.div>
      </ContentSection>

      <AnimatePresence>
        {showConfirmation && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setShowConfirmation(false)}
          >
            <ModalContent
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>💀 ÚLTIMA CONFIRMAÇÃO</ModalTitle>
              </ModalHeader>

              <ModalBody>
                <FinalWarningText>
                  <strong>ESTA É SUA ÚLTIMA CHANCE!</strong>
                </FinalWarningText>
                <FinalWarningText>
                  Após clicar em "EXCLUIR AGORA", sua conta será{' '}
                  <strong>PERMANENTEMENTE REMOVIDA </strong>e você <strong>NUNCA MAIS</strong>{' '}
                  poderá recuperá-la.
                </FinalWarningText>
                <FinalConfirmQuestion>
                  Tem certeza absoluta que deseja continuar?
                </FinalConfirmQuestion>
              </ModalBody>

              <ModalFooter>
                <ModalCancelButton type="button" onClick={() => setShowConfirmation(false)}>
                  Cancelar
                </ModalCancelButton>
                <ModalDeleteButton
                  type="button"
                  onClick={handleConfirmDeletion}
                  disabled={isConfirming}
                >
                  {isConfirming ? 'Excluindo...' : '💀 EXCLUIR AGORA'}
                </ModalDeleteButton>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
  height: 100vh;
  height: 100dvh;
  margin: 0;
  padding: 24px 40px;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
  background: linear-gradient(
    135deg,
    var(--gradient-start) 0%,
    var(--gradient-mid) 50%,
    var(--gradient-end) 100%
  );
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  gap: 16px;
`;

const LogoTitle = styled.h1`
  font-size: 2.5rem;
  line-height: 1.1;
  text-decoration: underline;
  text-decoration-thickness: 0.1px;
  text-underline-offset: 5px;
  text-decoration-color: rgba(141, 140, 140, 0.2);
  color: var(--white);
  font-weight: 600;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.28em;
  padding-left: 0.28em;
  cursor: default;
  font-family: 'Cinzel', serif;
  margin: 0;
`;

const ContentSection = styled.section`
  width: min(100%, 440px);
  padding: 28px 22px 22px;
  background: linear-gradient(180deg, #161616 0%, #101010 100%);
  border-radius: 5px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(198, 169, 100, 0.28);
  flex-shrink: 0;
`;

const TitleRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`;

const PageTitle = styled.h1`
  font-size: 1.35rem;
  line-height: 1.2;
  color: #dc2626;
  margin: 0;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.08em;
  cursor: default;
  font-family: 'Cinzel', serif;
  text-wrap: balance;
`;

const PageSubtitle = styled.p`
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0 0 12px;
  text-align: center;
  font-family: 'Cormorant', 'Marcellus', serif;
  letter-spacing: 0.04em;
  cursor: default;
  line-height: 1.3;
  font-weight: 400;

  div {
    margin-bottom: 0.2rem;

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const WarningContainer = styled.div`
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
`;

const WarningIcon = styled.div`
  font-size: 1.25rem;
  line-height: 1;
  text-align: center;
`;

const WarningTitle = styled.h2`
  color: var(--white);
  font-size: 1.05rem;
  line-height: 1.2;
  font-weight: 600;
  text-align: center;
  margin: 0 0 8px;
  font-family: 'Cinzel', serif;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-wrap: balance;
`;

const WarningText = styled.p`
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 400;
  text-align: center;
  margin: 0 0 10px;
  letter-spacing: 0.04em;
  line-height: 1.3;
  font-family: 'Cormorant', 'Marcellus', serif;

  strong {
    color: #dc2626;
    font-weight: 600;
  }
`;

const WarningList = styled.ul`
  list-style: none;
  color: var(--text-secondary);
  font-family: 'Cormorant', 'Marcellus', serif;
  font-size: 0.95rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  margin: 0 0 4px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li,
  li span {
    font-family: 'Cormorant', 'Marcellus', serif;
    font-size: 1rem;
    line-height: 1.3;
    letter-spacing: 0.04em;
    font-weight: 400;
  }

  li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0;
  }
`;

const ItemIcon = styled.span`
  flex: 0 0 auto;
  width: 1.1rem;
  line-height: 1.3;
  text-align: center;
`;

const FinalConfirmText = styled.p`
  color: var(--accent);
  font-size: 1.05rem;
  line-height: 1.35;
  letter-spacing: 0.03em;
  font-weight: 600;
  text-align: center;
  margin: 8px 0 16px;
  font-family: 'Cormorant', 'Marcellus', serif;
  text-wrap: balance;

  strong {
    font-weight: 600;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 0;
`;

const CancelButton = styled.button`
  box-sizing: border-box;
  font-family: 'Poppins', sans-serif;
  min-height: 48px;
  padding: 14px 20px;
  font-size: 0.9rem;
  line-height: 1.2;
  background: #121212;
  color: var(--text-secondary);
  border: 1px solid rgba(198, 169, 100, 0.35);
  border-radius: 5px;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1),
    color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  width: 100%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: #1a1814;
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
  }

  &:active {
    transform: translateY(-2px) scale(0.99);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover,
    &:active {
      transform: none;
    }
  }
`;

const ConfirmButton = styled.button`
  box-sizing: border-box;
  font-family: 'Poppins', sans-serif;
  min-height: 48px;
  padding: 14px 20px;
  font-size: 0.9rem;
  line-height: 1.2;
  background: linear-gradient(180deg, #c53838 0%, #9d1c1c 100%);
  color: #fff;
  border: none;
  border-radius: 5px;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  width: 100%;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(157, 28, 28, 0.28);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-wrap: balance;

  &:hover:not(:disabled) {
    filter: brightness(1.06);
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(157, 28, 28, 0.38);
  }

  &:active:not(:disabled) {
    transform: translateY(-2px) scale(0.99);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid #e07a7a;
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover:not(:disabled),
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const MessageContainer = styled(motion.div)`
  padding: 12px;
  border-radius: 5px;
  text-align: center;
  margin-top: 12px;

  &.success {
    background: rgba(76, 175, 80, 0.1);
    border: 1px solid rgba(76, 175, 80, 0.3);
    color: #4caf50;
  }

  &.error {
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
  }
`;

const SuccessIcon = styled.div`
  font-size: 1.35rem;
  line-height: 1;
  margin-bottom: 8px;
  animation: bounce 1s infinite;

  @keyframes bounce {
    0%,
    20%,
    50%,
    80%,
    100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-4px);
    }
    60% {
      transform: translateY(-2px);
    }
  }
`;

const ErrorIcon = styled.div`
  font-size: 1.35rem;
  line-height: 1;
  margin-bottom: 8px;
  animation: shake 0.5s infinite;

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
  }
`;

const MessageText = styled.p`
  font-size: 1rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  font-weight: 600;
  margin: 0 0 6px;
  font-family: 'Cormorant', 'Marcellus', serif;
`;

const RedirectText = styled.p`
  font-size: 0.95rem;
  line-height: 1.3;
  font-style: italic;
  margin: 0;
  font-family: 'Cormorant', 'Marcellus', serif;
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px 18px;
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(180deg, #161616 0%, #101010 100%);
  border-radius: 5px;
  width: min(100%, 440px);
  border: 1px solid rgba(198, 169, 100, 0.28);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
  padding: 28px 22px 22px;
`;

const ModalHeader = styled.div`
  padding: 0;
  text-align: center;
  margin-bottom: 12px;
`;

const ModalTitle = styled.h2`
  color: #dc2626;
  font-size: 1.35rem;
  line-height: 1.2;
  font-weight: 600;
  margin: 0;
  font-family: 'Cinzel', serif;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
  text-wrap: balance;
`;

const ModalBody = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FinalWarningText = styled.p`
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 400;
  margin: 0;
  text-align: center;
  line-height: 1.3;
  letter-spacing: 0.04em;
  font-family: 'Cormorant', 'Marcellus', serif;

  strong {
    color: #dc2626;
    font-weight: 600;
  }
`;

const FinalConfirmQuestion = styled.p`
  color: var(--accent);
  font-size: 1.05rem;
  line-height: 1.35;
  letter-spacing: 0.03em;
  font-weight: 600;
  text-align: center;
  margin: 4px 0 0;
  font-family: 'Cormorant', 'Marcellus', serif;
  text-wrap: balance;
`;

const ModalFooter = styled.div`
  padding: 18px 0 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ModalCancelButton = styled.button`
  box-sizing: border-box;
  font-family: 'Poppins', sans-serif;
  min-height: 48px;
  padding: 14px 20px;
  font-size: 0.9rem;
  line-height: 1.2;
  letter-spacing: 0.1em;
  background: #121212;
  color: var(--text-secondary);
  border: 1px solid rgba(198, 169, 100, 0.35);
  border-radius: 5px;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1),
    color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
  cursor: pointer;
  text-transform: uppercase;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: #1a1814;
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
  }

  &:active {
    transform: translateY(-2px) scale(0.99);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover,
    &:active {
      transform: none;
    }
  }
`;

const ModalDeleteButton = styled.button`
  box-sizing: border-box;
  font-family: 'Poppins', sans-serif;
  min-height: 48px;
  padding: 14px 20px;
  font-size: 0.9rem;
  line-height: 1.2;
  letter-spacing: 0.08em;
  background: linear-gradient(180deg, #c53838 0%, #9d1c1c 100%);
  color: #fff;
  border: none;
  border-radius: 5px;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(157, 28, 28, 0.28);
  text-transform: uppercase;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-wrap: balance;

  &:hover:not(:disabled) {
    filter: brightness(1.06);
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(157, 28, 28, 0.38);
  }

  &:active:not(:disabled) {
    transform: translateY(-2px) scale(0.99);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid #e07a7a;
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover:not(:disabled),
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

export default ConfirmDeletePage;
