import styled, { css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { FiAlertTriangle, FiCheck, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const linkInvalido = (texto) => /inválid|expirad/i.test(texto || '');

const ConfirmDeletePage = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const { logout } = useAuth();
  const reduzirMovimento = useReducedMotion();
  const confirmandoRef = useRef(false);
  const redirecionarRef = useRef(null);

  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState(token ? '' : 'Token de confirmação inválido ou expirado');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (redirecionarRef.current) clearTimeout(redirecionarRef.current);
    };
  }, []);

  const handleConfirmDeletion = async () => {
    if (confirmandoRef.current || isSuccess || linkInvalido(message)) return;
    confirmandoRef.current = true;
    setIsConfirming(true);
    setMessage('');

    try {
      const response = await api.confirmAccountDeletion(token);
      setMessage(response.message || 'Conta excluída com sucesso!');
      setIsSuccess(true);
      redirecionarRef.current = setTimeout(() => {
        logout();
        navigate('/', { replace: true });
      }, 3000);
    } catch (error) {
      setMessage(error.message || 'Erro ao confirmar exclusão. O link pode ter expirado.');
      setIsSuccess(false);
    } finally {
      confirmandoRef.current = false;
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard', { replace: true });
  };

  const invalido = !isSuccess && linkInvalido(message);
  const erroServidor = !isSuccess && message && !invalido;

  return (
    <Pagina>
      <LogoTitle onClick={() => navigate('/')}>HealGym</LogoTitle>
      <Painel
        initial={reduzirMovimento ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduzirMovimento ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        aria-labelledby="confirmar-exclusao-titulo"
      >
        {isSuccess && (
          <>
            <Identificacao>
              <Selo $tom="neutro" aria-hidden="true">
                <FiCheck />
              </Selo>
              <Titulo id="confirmar-exclusao-titulo">Conta excluída</Titulo>
              <Subtitulo>A exclusão foi concluída.</Subtitulo>
            </Identificacao>
            <Aviso>
              <AvisoTexto>{message}</AvisoTexto>
              <AvisoTexto>Você será levado à página inicial.</AvisoTexto>
            </Aviso>
          </>
        )}

        {invalido && (
          <>
            <Identificacao>
              <Selo aria-hidden="true">
                <FiAlertTriangle />
              </Selo>
              <Titulo id="confirmar-exclusao-titulo">Link inválido ou expirado</Titulo>
              <Subtitulo>Este link não pode mais ser usado para excluir a conta.</Subtitulo>
            </Identificacao>
            <Aviso>
              <AvisoTexto>{message}</AvisoTexto>
            </Aviso>
            <Decisao>
              <BotaoNeutro type="button" onClick={() => navigate('/', { replace: true })}>
                Voltar ao início
              </BotaoNeutro>
            </Decisao>
          </>
        )}

        {!isSuccess && !invalido && (
          <>
            <Identificacao>
              <Selo aria-hidden="true">
                <FiAlertTriangle />
              </Selo>
              <Titulo id="confirmar-exclusao-titulo">Excluir sua conta?</Titulo>
              <Subtitulo>Você está prestes a confirmar a exclusão definitiva da sua conta.</Subtitulo>
            </Identificacao>
            <Aviso>
              <AvisoTitulo>Esta ação não poderá ser desfeita</AvisoTitulo>
              <AvisoTexto>
                Após confirmar, sua conta será excluída e você perderá o acesso aos dados associados a ela.
              </AvisoTexto>
              <Consequencias>
                <li>Perfil e dados pessoais.</li>
                <li>Acesso a esta conta.</li>
                <li>Acesso aos treinos, dietas e histórico feitos nela.</li>
              </Consequencias>
            </Aviso>
            {erroServidor && <MensagemErro role="alert">{message}</MensagemErro>}
            <Decisao>
              <BotaoNeutro type="button" onClick={handleCancel} disabled={isConfirming}>
                Manter minha conta
              </BotaoNeutro>
              <BotaoExcluir
                type="button"
                onClick={handleConfirmDeletion}
                disabled={isConfirming}
                aria-busy={isConfirming}
              >
                <FiTrash2 aria-hidden="true" />
                {isConfirming ? 'Excluindo...' : 'Excluir minha conta'}
              </BotaoExcluir>
            </Decisao>
          </>
        )}
      </Painel>
    </Pagina>
  );
};

const Pagina = styled.div`
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0;
  padding: 2.25rem 1.25rem;
  box-sizing: border-box;
  overflow-x: hidden;
  background: var(--background);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.6rem;
`;

const LogoTitle = styled.h1`
  margin: 0;
  font-size: 2.5rem;
  line-height: 1.1;
  text-decoration: underline;
  text-decoration-thickness: 0.1px;
  text-underline-offset: 5px;
  text-decoration-color: rgba(141, 140, 140, 0.2);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.28em;
  padding-left: 0.28em;
  cursor: pointer;
  transition: transform 0.3s ease;
  flex-shrink: 0;

  &:hover {
    transform: scale(1.05);
  }
`;

const Painel = styled(motion.section)`
  width: min(100%, 640px);
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.45);
`;

const Identificacao = styled.header`
  padding: 1.7rem 1.6rem 0;

  @media (max-width: 640px) {
    padding: 1.35rem 1.15rem 0;
  }
`;

const Selo = styled.span`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: ${(props) => (props.$tom === 'neutro' ? 'var(--accent)' : '#d7a3a3')};
  background: ${(props) => (props.$tom === 'neutro' ? 'rgba(198, 169, 100, 0.1)' : 'rgba(120, 42, 42, 0.45)')};

  svg {
    font-size: 1.05rem;
  }
`;

const Titulo = styled.h2`
  margin: 0.9rem 0 0;
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 1.7rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.01em;
  text-transform: none;

  @media (max-width: 640px) {
    font-size: 1.45rem;
  }
`;

const Subtitulo = styled.p`
  margin: 0.45rem 0 0;
  max-width: 34rem;
  color: #bdbdbd;
  font-family: 'Marcellus', serif;
  font-size: 1.02rem;
  line-height: 1.45;
  letter-spacing: 0.01em;
`;

const Aviso = styled.section`
  margin: 1.35rem 1.6rem 0;
  padding: 1rem 1rem 0.95rem 0.95rem;
  border-radius: 12px;
  background: rgba(92, 36, 36, 0.28);
  box-shadow: inset 2px 0 0 #8a4040;

  @media (max-width: 640px) {
    margin: 1.15rem 1.15rem 0;
  }
`;

const AvisoTitulo = styled.h2`
  margin: 0;
  color: #f3e4e4;
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0.01em;
  text-transform: none;
`;

const AvisoTexto = styled.p`
  margin: 0.4rem 0 0;
  color: #d5d5d5;
  font-family: 'Marcellus', serif;
  font-size: 0.98rem;
  line-height: 1.45;
  letter-spacing: 0.01em;

  & + & {
    margin-top: 0.35rem;
  }
`;

const Consequencias = styled.ul`
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  li {
    position: relative;
    padding-left: 0.9rem;
    color: #cfcfcf;
    font-family: 'Marcellus', serif;
    font-size: 0.95rem;
    line-height: 1.4;
  }

  li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55em;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #a15a5a;
  }
`;

const MensagemErro = styled.p`
  margin: 0.9rem 1.6rem 0;
  color: #e3b4b4;
  font-family: 'Marcellus', serif;
  font-size: 0.95rem;
  line-height: 1.4;

  @media (max-width: 640px) {
    margin-right: 1.15rem;
    margin-left: 1.15rem;
  }
`;

const Decisao = styled.div`
  display: flex;
  gap: 0.7rem;
  margin-top: 1.25rem;
  padding: 1.15rem 1.6rem 1.45rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  @media (max-width: 640px) {
    flex-direction: column;
    padding: 1rem 1.15rem 1.2rem;
  }
`;

const botaoBase = css`
  flex: 1;
  min-height: 46px;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  font-family: 'Cinzel', serif;
  font-style: normal;
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: none;
  cursor: pointer;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    color 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;

  svg {
    font-size: 0.95rem;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(-2px) scale(0.99);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover:not(:disabled),
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const BotaoNeutro = styled.button`
  ${botaoBase}
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: #ececec;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.28);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const BotaoExcluir = styled.button`
  ${botaoBase}
  border: 1px solid #7d3838;
  background: #7d3838;
  color: var(--white);

  &:hover:not(:disabled) {
    background: #8d4444;
    border-color: #8d4444;
  }

  &:focus-visible {
    outline: 2px solid #e7b1b1;
    outline-offset: 2px;
  }
`;

export default ConfirmDeletePage;
