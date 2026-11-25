import styled from 'styled-components';
import { useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';
import { CURVA, useRevelar } from './movimento';

const Revelavel = ({ rotulo, rotuloAberto, inicial = false, largo = false, children }) => {
  const revelar = useRevelar(inicial);
  const id = useId();

  return (
    <div>
      <Gatilho
        type="button"
        aria-expanded={revelar.aberto}
        aria-controls={id}
        $largo={largo}
        onClick={revelar.alternar}
      >
        <span>{revelar.aberto && rotuloAberto ? rotuloAberto : rotulo}</span>
        <Seta
          aria-hidden="true"
          animate={{ rotate: revelar.aberto ? 180 : 0 }}
          transition={{ duration: revelar.reduzir ? 0 : 0.22, ease: CURVA }}
        >
          <FiChevronDown />
        </Seta>
      </Gatilho>
      <AnimatePresence initial={false}>
        {revelar.aberto && (
          <Painel
            id={id}
            key="painel"
            initial={revelar.reduzir ? false : { height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0, transition: { duration: revelar.reduzir ? 0 : 0.22, ease: CURVA } }}
            transition={{ duration: revelar.reduzir ? 0 : 0.22, ease: CURVA }}
            style={{ overflow: revelar.livre ? 'visible' : 'hidden' }}
            onAnimationComplete={revelar.concluir}
          >
            <Interno
              initial={revelar.reduzir ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: revelar.reduzir ? 0 : 0.18, delay: revelar.reduzir ? 0 : 0.04, ease: CURVA }}
            >
              {children}
            </Interno>
          </Painel>
        )}
      </AnimatePresence>
    </div>
  );
};

const Gatilho = styled.button`
  display: ${({ $largo }) => ($largo ? 'flex' : 'inline-flex')};
  align-items: center;
  justify-content: ${({ $largo }) => ($largo ? 'space-between' : 'flex-start')};
  width: ${({ $largo }) => ($largo ? '100%' : 'auto')};
  gap: 0.4rem;
  min-height: 44px;
  padding: 0.35rem 0.1rem;
  border: none;
  background: transparent;
  color: ${({ $largo }) => ($largo ? 'var(--white)' : 'var(--accent)')};
  font-family: ${({ $largo }) => ($largo ? "'Cinzel', serif" : "'Marcellus', serif")};
  font-size: ${({ $largo }) => ($largo ? '0.95rem' : '0.95rem')};
  font-weight: 600;
  letter-spacing: ${({ $largo }) => ($largo ? '0.1em' : '0.02em')};
  text-transform: ${({ $largo }) => ($largo ? 'uppercase' : 'none')};
  text-align: left;
  cursor: pointer;
  transition: color 180ms ease;

  &:hover {
    color: var(--accent-light);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 6px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Seta = styled(motion.span)`
  display: inline-flex;
  flex-shrink: 0;
`;

const Painel = styled(motion.div)``;

const Interno = styled(motion.div)`
  padding-top: 0.6rem;
`;

export default Revelavel;
