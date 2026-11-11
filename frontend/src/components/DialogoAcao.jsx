import styled from 'styled-components';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import {
  Acoes,
  BotaoCancelar,
  BotaoDestrutivo,
  BotaoPrimario,
  Cabecalho,
  cascaDialogo,
  Corpo,
  Fechar,
  Identidade,
  IdentidadeTexto,
  Marca,
  Overlay,
  Subtitulo,
  Texto,
  Titulo,
} from './modalPainelEstilos';

const FOCAVEIS =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const DialogoAcao = ({
  aberto,
  titulo,
  mensagem,
  subtitulo,
  icone,
  tipo = 'alerta',
  rotuloConfirmar = 'Confirmar',
  rotuloCancelar = 'Cancelar',
  confirmarDesabilitado = false,
  linhaUnica = false,
  onConfirmar,
  onCancelar,
  children,
}) => {
  const tituloId = useId();
  const textoId = useId();
  const dialogoRef = useRef(null);
  const fecharRef = useRef(null);
  const fecharAcaoRef = useRef(onCancelar || onConfirmar);
  fecharAcaoRef.current = onCancelar || onConfirmar;
  const reduzirMovimento =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const destrutivo = tipo === 'destrutivo';
  const soAviso = tipo === 'alerta' && !children;
  const BotaoAcao = destrutivo ? BotaoDestrutivo : BotaoPrimario;

  useEffect(() => {
    if (!aberto) return undefined;
    fecharRef.current?.focus();

    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        fecharAcaoRef.current?.();
        return;
      }
      if (evento.key !== 'Tab' || !dialogoRef.current) return;
      const focaveis = Array.from(dialogoRef.current.querySelectorAll(FOCAVEIS)).filter(
        (elemento) => !elemento.disabled,
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto]);

  return createPortal(
    <AnimatePresence>
      {aberto && (
        <Overlay
          initial={reduzirMovimento ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduzirMovimento ? 0 : 0.18 }}
          onClick={() => fecharAcaoRef.current?.()}
        >
          <Dialogo
            ref={dialogoRef}
            $linhaUnica={linhaUnica}
            role={destrutivo ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby={tituloId}
            aria-describedby={mensagem ? textoId : undefined}
            initial={reduzirMovimento ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reduzirMovimento ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(evento) => evento.stopPropagation()}
          >
            <Cabecalho>
              <Identidade>
                {icone && <Marca aria-hidden="true">{icone}</Marca>}
                <IdentidadeTexto>
                  <TituloDialogo id={tituloId}>{titulo}</TituloDialogo>
                  {subtitulo && <Subtitulo>{subtitulo}</Subtitulo>}
                </IdentidadeTexto>
              </Identidade>
              <Fechar ref={fecharRef} type="button" aria-label="Fechar" onClick={() => fecharAcaoRef.current?.()}>
                <FiX />
              </Fechar>
            </Cabecalho>
            <Corpo>
              {mensagem && (
                <Mensagem id={textoId} $linhaUnica={linhaUnica}>
                  {mensagem}
                </Mensagem>
              )}
              {children && <Conteudo>{children}</Conteudo>}
              <Acoes>
                {!soAviso && (
                  <BotaoCancelar type="button" onClick={onCancelar} disabled={confirmarDesabilitado}>
                    {rotuloCancelar}
                  </BotaoCancelar>
                )}
                {(soAviso || tipo !== 'painel') && (
                  <BotaoAcao
                    type="button"
                    onClick={onConfirmar}
                    disabled={confirmarDesabilitado}
                    aria-busy={confirmarDesabilitado}
                  >
                    {rotuloConfirmar}
                  </BotaoAcao>
                )}
              </Acoes>
            </Corpo>
          </Dialogo>
        </Overlay>
      )}
    </AnimatePresence>,
    document.body,
  );
};

const Dialogo = styled(motion.div)`
  width: ${({ $linhaUnica }) => ($linhaUnica ? 'max-content' : 'min(100%, 680px)')};
  max-width: calc(100vw - 2.5rem);
  ${cascaDialogo}
  max-height: min(86vh, 760px);

  ${Cabecalho} {
    padding: 1.35rem 1.25rem 1.1rem 1.4rem;
  }

  ${Corpo} {
    padding: 1.2rem 1.4rem 1.35rem;
  }
`;

const TituloDialogo = styled(Titulo)`
  font-size: 1.28rem;
`;

const Mensagem = styled(Texto)`
  white-space: ${({ $linhaUnica }) => ($linhaUnica ? 'nowrap' : 'normal')};

  @media (max-width: 720px) {
    white-space: normal;
  }
`;

const Conteudo = styled.div`
  margin-top: 0.85rem;
  min-width: 0;

  & > * {
    min-width: 0;
    width: 100%;
  }
`;

export default DialogoAcao;
