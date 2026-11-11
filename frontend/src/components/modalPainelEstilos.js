import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

export const cascaDialogo = css`
  max-height: min(78vh, 680px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--gradient-end);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);

  @media (max-width: 640px) {
    width: 100%;
    max-height: calc(100dvh - 1.5rem);
    border-radius: 16px 16px 12px 12px;
  }
`;

export const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;

  @media (max-width: 640px) {
    padding: 0.75rem;
  }
`;

export const Cabecalho = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.1rem 1rem 0.9rem 1.15rem;
  background: var(--gradient-end);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

export const Identidade = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  min-width: 0;
`;

export const Marca = styled.span`
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  border-radius: 8px;
  background: rgba(198, 169, 100, 0.08);

  svg {
    font-size: 0.95rem;
  }
`;

export const IdentidadeTexto = styled.div`
  min-width: 0;
`;

export const Titulo = styled.h2`
  margin: 0;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
  text-transform: none;
`;

export const Subtitulo = styled.p`
  margin: 0.15rem 0 0;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.92rem;
  line-height: 1.3;
`;

export const Fechar = styled.button`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  text-transform: none;
  letter-spacing: 0;
  padding: 0;

  svg {
    font-size: 1.05rem;
  }

  &:hover {
    color: var(--white);
    background: rgba(255, 255, 255, 0.06);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

export const Corpo = styled.div`
  overflow-y: auto;
  padding: 1rem 1.15rem 1.15rem;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(198, 169, 100, 0.45);
    border-radius: 99px;
  }

  @media (max-width: 640px) {
    padding: 0.9rem 1rem 1rem;
  }
`;

export const Bloco = styled.section`
  padding-top: 0.95rem;
`;

export const Rotulo = styled.h3`
  margin: 0 0 0.35rem;
  color: var(--accent);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.3;
  text-transform: none;
`;

export const Texto = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.98rem;
  line-height: 1.4;
`;

export const Nota = styled.p`
  margin: 1rem 0 0;
  color: rgba(224, 224, 224, 0.62);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.86rem;
  line-height: 1.35;
`;

export const Acoes = styled.div`
  display: flex;
  gap: 0.6rem;
  margin-top: 0.95rem;

  @media (max-width: 420px) {
    flex-direction: column;
  }
`;

const botaoModal = css`
  flex: 1;
  min-height: 40px;
  padding: 0.55rem 0.85rem;
  border-radius: 8px;
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
    color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 220ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    filter: brightness(1.06);
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

export const BotaoCancelar = styled.button`
  ${botaoModal}
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: var(--text-secondary);

  &:hover:not(:disabled) {
    color: var(--white);
    background: rgba(255, 255, 255, 0.06);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

export const BotaoPrimario = styled.button`
  ${botaoModal}
  border: 1px solid var(--accent);
  background: var(--accent);
  color: #1a1a1a;

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

export const BotaoDestrutivo = styled.button`
  ${botaoModal}
  border: 1px solid #8d3a3a;
  background: #8d3a3a;
  color: var(--white);

  &:hover:not(:disabled) {
    background: #9a4545;
    border-color: #9a4545;
  }

  &:focus-visible {
    outline: 2px solid #e7b1b1;
    outline-offset: 2px;
  }
`;
