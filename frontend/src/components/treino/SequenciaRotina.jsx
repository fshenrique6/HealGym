import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { FiCheck, FiChevronLeft, FiChevronRight, FiMoon } from 'react-icons/fi';
import { CURVA } from './movimento';

const TOQUE = { duration: 0.18, ease: CURVA };

function dataCurta(data) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

const SequenciaRotina = ({ passos, onAbrir }) => {
  const reduzir = useReducedMotion();
  const trilho = useRef(null);
  const [borda, setBorda] = useState({ sobra: false, esquerda: false, direita: false });
  const sessoes = passos.filter((passo) => passo.tipo === 'sessao').length;
  const grade = sessoes <= 3;

  const medir = useCallback(() => {
    const el = trilho.current;
    if (!el || grade) {
      setBorda({ sobra: false, esquerda: false, direita: false });
      return;
    }
    const sobra = el.scrollWidth - el.clientWidth > 8;
    setBorda({
      sobra,
      esquerda: sobra && el.scrollLeft > 4,
      direita: sobra && el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, [grade]);

  useLayoutEffect(() => {
    const el = trilho.current;
    if (!el) return undefined;
    if (!grade) {
      const alvo = el.querySelector('[data-destaque="true"]');
      if (alvo) {
        const esquerda = alvo.offsetLeft - 2;
        el.scrollTo({ left: Math.max(0, esquerda), behavior: 'auto' });
      }
    }
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      el.removeEventListener('scroll', medir);
      observador.disconnect();
    };
  }, [passos, grade, medir]);

  const deslizar = (direcao) => {
    const el = trilho.current;
    if (!el) return;
    const card = el.querySelector('[data-passo="sessao"]');
    const largura = (card?.offsetWidth || el.clientWidth / 3) + 12;
    el.scrollBy({ left: direcao * largura, behavior: reduzir ? 'auto' : 'smooth' });
  };

  return (
    <Faixa
      initial={reduzir ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduzir ? 0 : 0.22, ease: CURVA }}
    >
      {borda.sobra && (
        <Seta
          type="button"
          aria-label="Ver treinos anteriores"
          disabled={!borda.esquerda}
          onClick={() => deslizar(-1)}
          whileHover={borda.esquerda && !reduzir ? { y: -1 } : undefined}
          whileTap={borda.esquerda && !reduzir ? { scale: 0.98 } : undefined}
        >
          <FiChevronLeft aria-hidden="true" />
        </Seta>
      )}
      <Trilho ref={trilho} $grade={grade} role="list" aria-label="Sequência da rotina">
        {passos.map((passo, indice) =>
          passo.tipo === 'descanso' ? (
            <Descanso key={passo.chave} role="listitem">
              <FiMoon aria-hidden="true" />
              <span>Descanso</span>
            </Descanso>
          ) : (
            <Card
              key={passo.chave}
              type="button"
              role="listitem"
              data-passo="sessao"
              data-destaque={passo.destaque ? 'true' : 'false'}
              $grade={grade}
              $destaque={passo.destaque}
              $feito={passo.rotulo === 'Concluído'}
              aria-current={passo.destaque ? 'step' : undefined}
              onClick={() => onAbrir?.(passo)}
              initial={reduzir ? false : { opacity: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduzir ? 0 : 0.22,
                delay: reduzir ? 0 : Math.min(indice, 8) * 0.03,
                ease: CURVA,
              }}
              whileHover={reduzir ? undefined : { y: -2 }}
              whileTap={reduzir ? undefined : { scale: 0.99 }}
            >
              <Nome>{passo.nome}</Nome>
              {passo.foco && <Foco>{passo.foco}</Foco>}
              <Status $destaque={passo.destaque}>
                {passo.rotulo === 'Concluído' && <FiCheck aria-hidden="true" />}
                {passo.rotulo}
              </Status>
              {passo.rotulo === 'Concluído' && dataCurta(passo.quando) && <Quando>{dataCurta(passo.quando)}</Quando>}
            </Card>
          ),
        )}
      </Trilho>
      {borda.sobra && (
        <Seta
          type="button"
          aria-label="Ver próximos treinos"
          disabled={!borda.direita}
          onClick={() => deslizar(1)}
          whileHover={borda.direita && !reduzir ? { y: -1 } : undefined}
          whileTap={borda.direita && !reduzir ? { scale: 0.98 } : undefined}
        >
          <FiChevronRight aria-hidden="true" />
        </Seta>
      )}
    </Faixa>
  );
};

const Faixa = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
`;

const Trilho = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
  padding: 0.65rem 0.1rem 0.9rem;
  overflow-x: ${({ $grade }) => ($grade ? 'visible' : 'auto')};
  overflow-y: ${({ $grade }) => ($grade ? 'visible' : 'hidden')};
  overscroll-behavior-x: contain;
  scroll-snap-type: ${({ $grade }) => ($grade ? 'none' : 'x mandatory')};
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 560px) {
    flex-direction: ${({ $grade }) => ($grade ? 'column' : 'row')};
    overflow-x: ${({ $grade }) => ($grade ? 'visible' : 'auto')};
    overflow-y: ${({ $grade }) => ($grade ? 'visible' : 'hidden')};
  }
`;

const Seta = styled(motion.button).attrs({ transition: TOQUE })`
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(198, 169, 100, 0.45);
  background: rgba(255, 255, 255, 0.03);
  color: var(--accent);
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    opacity 0.2s ease;

  svg {
    font-size: 1.05rem;
  }

  &:hover:not(:disabled) {
    background: rgba(198, 169, 100, 0.12);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;

const Card = styled(motion.button).attrs({ transition: TOQUE })`
  flex: ${({ $grade }) => ($grade ? '1 1 0' : '0 0 calc((100% - 1.5rem) / 3.25)')};
  width: auto;
  min-width: 0;
  min-height: 118px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.28rem;
  padding: 1rem 1.05rem;
  border-radius: 12px;
  border: 1px solid
    ${({ $destaque, $feito }) =>
      $destaque ? 'var(--accent)' : $feito ? 'rgba(198, 169, 100, 0.32)' : 'rgba(198, 169, 100, 0.16)'};
  background: ${({ $destaque }) => ($destaque ? 'rgba(198, 169, 100, 0.1)' : 'rgba(255, 255, 255, 0.03)')};
  box-shadow: ${({ $destaque }) => ($destaque ? '0 6px 16px rgba(198, 169, 100, 0.14)' : 'none')};
  color: var(--white);
  font-family: 'Cinzel', serif;
  text-align: left;
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: var(--accent);
    box-shadow: 0 6px 16px rgba(198, 169, 100, 0.16);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  @media (max-width: 1024px) {
    flex-basis: ${({ $grade }) => ($grade ? '0' : 'calc((100% - 0.75rem) / 2.2)')};
  }

  @media (max-width: 560px) {
    flex: ${({ $grade }) => ($grade ? 'none' : '0 0 min(78vw, 260px)')};
    width: ${({ $grade }) => ($grade ? '100%' : 'auto')};
    min-height: 104px;
  }
`;

const Nome = styled.span`
  color: var(--white);
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

const Foco = styled.span`
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.92rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
`;

const Status = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.15rem;
  color: ${({ $destaque }) => ($destaque ? 'var(--accent)' : 'var(--text-secondary)')};
  font-family: 'Marcellus', serif;
  font-size: 0.88rem;
  line-height: 1.2;

  svg {
    color: var(--accent);
    font-size: 0.85rem;
  }
`;

const Quando = styled.span`
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.78rem;
  line-height: 1.2;
`;

const Descanso = styled.div`
  flex: 0 0 auto;
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.15rem;
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.78rem;
  line-height: 1;
  white-space: nowrap;

  svg {
    color: var(--accent);
    font-size: 0.85rem;
  }
`;

export default SequenciaRotina;
