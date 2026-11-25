import { forwardRef, useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const CURVA = [0.22, 1, 0.36, 1];

/** Abre na hora e só começa a recolher depois de esconder o excesso, para o fechamento não travar. */
export function useRevelar(inicial = false) {
  const reduzir = useReducedMotion();
  const [fase, setFase] = useState(inicial ? 'aberto' : 'fechado');

  useEffect(() => {
    if (fase !== 'fechando') return undefined;
    if (reduzir) {
      setFase('fechado');
      return undefined;
    }
    const id = requestAnimationFrame(() => setFase('fechado'));
    return () => cancelAnimationFrame(id);
  }, [fase, reduzir]);

  const definir = useCallback((proximo) => {
    setFase((atual) => {
      const aberto = atual !== 'fechado';
      if (proximo && !aberto) return 'abrindo';
      if (!proximo && aberto) return 'fechando';
      return atual;
    });
  }, []);

  const alternar = useCallback(() => {
    setFase((atual) => (atual === 'fechado' ? 'abrindo' : 'fechando'));
  }, []);

  const concluir = useCallback(() => {
    setFase((atual) => (atual === 'abrindo' ? 'aberto' : atual));
  }, []);

  return {
    aberto: fase !== 'fechado',
    livre: fase === 'aberto',
    alternar,
    definir,
    concluir,
    reduzir,
  };
}

export const BaseBotao = forwardRef(function BaseBotao({ disabled, ...props }, ref) {
  const reduzir = useReducedMotion();
  const parado = Boolean(disabled) || reduzir;
  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileHover={parado ? undefined : { scale: 1.02 }}
      whileTap={parado ? undefined : { scale: 0.98 }}
      transition={{ duration: reduzir ? 0 : 0.18, ease: CURVA }}
      {...props}
    />
  );
});

export const Surge = ({ ordem = 0, children }) => {
  const reduzir = useReducedMotion();
  return (
    <motion.div
      initial={reduzir ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduzir
          ? { duration: 0 }
          : { duration: 0.5, delay: ordem * 0.08, ease: CURVA }
      }
    >
      {children}
    </motion.div>
  );
};
