import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

const MARGEM = 10;
const HOVER = { scale: 1.02 };
const TOQUE = { scale: 0.98 };
const MOLA = { type: 'spring', duration: 0.5 };
const EVENTO = 'healgym-ajuda';

const ancoraVisivel = (elemento) => {
  const rect = elemento.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) {
    return false;
  }
  let pai = elemento.parentElement;
  while (pai && pai !== document.body) {
    const estilo = getComputedStyle(pai);
    const rola = /(auto|scroll)/.test(estilo.overflowY) || /(auto|scroll)/.test(estilo.overflow);
    if (rola) {
      const caixa = pai.getBoundingClientRect();
      const cortado =
        rect.bottom <= caixa.top + 1 ||
        rect.top >= caixa.bottom - 1 ||
        rect.right <= caixa.left + 1 ||
        rect.left >= caixa.right - 1;
      if (cortado) return false;
    }
    pai = pai.parentElement;
  }
  return true;
};

const ALTURA_ESTIMADA = 170;
const DESLOCAMENTO = 50;

const abreAcima = (ancora, altura) => {
  const a = ancora.getBoundingClientRect();
  const espacoAcima = a.top - MARGEM;
  const espacoAbaixo = window.innerHeight - a.bottom - MARGEM;
  return espacoAcima >= altura || espacoAcima >= espacoAbaixo;
};

const calcularPosicao = (ancora, painel) => {
  const a = ancora.getBoundingClientRect();
  const altura = painel.offsetHeight;
  const largura = painel.offsetWidth;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const acima = abreAcima(ancora, altura);
  let top = acima ? a.top - altura - MARGEM : a.bottom + MARGEM;
  top = Math.min(Math.max(MARGEM, top), Math.max(MARGEM, vh - altura - MARGEM));
  let left = a.left + a.width / 2 - largura / 2;
  left = Math.min(Math.max(MARGEM, left), Math.max(MARGEM, vw - largura - MARGEM));
  return { top, left, acima };
};

const AjudaPopover = ({ id, aberto, onToggle, onFechar, rotulo, titulo, valor, texto, complemento }) => {
  const tituloId = useId();
  const textoId = useId();
  const botaoRef = useRef(null);
  const painelRef = useRef(null);
  const fecharRef = useRef(onFechar);
  const alturaRef = useRef(ALTURA_ESTIMADA);
  fecharRef.current = onFechar;
  const [revisaoLado, setRevisaoLado] = useState(0);
  const reduzirMovimento =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const acima = aberto && botaoRef.current
    ? abreAcima(botaoRef.current, alturaRef.current)
    : true;
  const yOrigem = acima ? DESLOCAMENTO : -DESLOCAMENTO;
  const chavePainel = `${id}-${acima ? 'acima' : 'abaixo'}-${revisaoLado}`;

  useLayoutEffect(() => {
    if (!aberto) return undefined;

    const atualizar = () => {
      const ancora = botaoRef.current;
      const painel = painelRef.current;
      if (!ancora || !painel) return;
      if (!ancoraVisivel(ancora)) {
        painel.style.visibility = 'hidden';
        return;
      }
      const proxima = calcularPosicao(ancora, painel);
      alturaRef.current = painel.offsetHeight;
      painel.style.top = `${proxima.top}px`;
      painel.style.left = `${proxima.left}px`;
      if (proxima.acima !== acima) {
        painel.style.visibility = 'hidden';
        setRevisaoLado((valorAtual) => valorAtual + 1);
        return;
      }
      painel.style.visibility = 'visible';
    };

    atualizar();
    window.addEventListener('resize', atualizar);
    window.addEventListener('scroll', atualizar, true);
    return () => {
      window.removeEventListener('resize', atualizar);
      window.removeEventListener('scroll', atualizar, true);
    };
  }, [aberto, acima, titulo, valor, texto, complemento]);

  useEffect(() => {
    if (!aberto) return undefined;
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: id }));

    const aoOutro = (evento) => {
      if (evento.detail !== id) fecharRef.current?.();
    };
    const aoPonteiro = (evento) => {
      const alvo = evento.target;
      if (alvo instanceof Element && alvo.closest('[data-ajuda-botao], [data-ajuda-painel]')) return;
      fecharRef.current?.();
    };
    const aoTecla = (evento) => {
      if (evento.key !== 'Escape') return;
      fecharRef.current?.();
    };

    window.addEventListener(EVENTO, aoOutro);
    document.addEventListener('pointerdown', aoPonteiro);
    document.addEventListener('keydown', aoTecla);
    return () => {
      window.removeEventListener(EVENTO, aoOutro);
      document.removeEventListener('pointerdown', aoPonteiro);
      document.removeEventListener('keydown', aoTecla);
    };
  }, [aberto, id]);

  return (
    <>
      <Botao
        ref={botaoRef}
        type="button"
        data-ajuda-botao=""
        aria-label={rotulo}
        aria-expanded={aberto}
        aria-controls={id}
        whileHover={HOVER}
        whileTap={TOQUE}
        onClick={onToggle}
      >
        ?
      </Botao>
      {createPortal(
        <AnimatePresence>
          {aberto && (
            <Painel
              key={chavePainel}
              ref={painelRef}
              id={id}
              role="dialog"
              aria-modal="false"
              aria-labelledby={tituloId}
              aria-describedby={textoId}
              data-ajuda-painel=""
              style={{ transformOrigin: acima ? 'center bottom' : 'center top' }}
              initial={reduzirMovimento ? false : { opacity: 0, scale: 0.9, y: yOrigem }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: yOrigem }}
              transition={reduzirMovimento ? { duration: 0 } : MOLA}
            >
              <Cabeca>
                <Nome id={tituloId}>{titulo}</Nome>
                <Fechar
                  type="button"
                  aria-label="Fechar"
                  onClick={() => fecharRef.current?.()}
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <FiX />
                </Fechar>
              </Cabeca>
              {valor && <Valor>{valor}</Valor>}
              <BlocoTexto id={textoId}>
                <Frase>{texto}</Frase>
                {complemento && <Frase>{complemento}</Frase>}
              </BlocoTexto>
            </Painel>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

const Botao = styled(motion.button)`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--background);
  font-family: 'Cinzel', serif;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0;
  text-transform: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background-color 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.2s cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    background: var(--accent-light);
    border-color: var(--accent-light);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const Painel = styled(motion.div)`
  position: fixed;
  z-index: 10050;
  top: 0;
  left: 0;
  visibility: hidden;
  width: min(420px, calc(100vw - 16px));
  margin: 0;
  padding: 0.7rem 0.9rem 0.75rem;
  border-radius: 12px;
  background: #141414;
  border: 1px solid rgba(198, 169, 100, 0.32);
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(198, 169, 100, 0.14);
  cursor: default;
  pointer-events: auto;
`;

const Cabeca = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.45rem;
`;

const Nome = styled.p`
  margin: 0;
  min-width: 0;
  color: rgba(224, 224, 224, 0.78);
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.01em;
`;

const Fechar = styled(motion.button)`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 0.05rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(224, 224, 224, 0.45);
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;

  svg {
    width: 13px;
    height: 13px;
  }

  &:hover {
    color: var(--white);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const Valor = styled.p`
  margin: 0.22rem 0 0.3rem;
  color: var(--accent);
  font-family: 'Marcellus', serif;
  font-size: 1.45rem;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0.01em;
`;

const BlocoTexto = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
`;

const Frase = styled.p`
  margin: 0;
  color: rgba(224, 224, 224, 0.72);
  font-family: 'Cormorant', serif;
  font-size: 0.9rem;
  line-height: 1.28;
`;

export default AjudaPopover;
