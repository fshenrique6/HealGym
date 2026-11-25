import styled from 'styled-components';
import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiSearch, FiX } from 'react-icons/fi';
import { filtrarExercicios } from '../../utils/rotina';
import { BotaoTexto, Chip, GrupoChips } from './ui';
import { CURVA } from './movimento';

const passo = (reduzir) => (reduzir ? { duration: 0 } : { duration: 0.22, ease: CURVA });

export function Seletor({
  rotulo,
  valor,
  texto,
  vazio = false,
  opcoes,
  aberto,
  onAbrir,
  onFechar,
  onChange,
}) {
  const reduzir = useReducedMotion();
  const listaId = useId();
  const raiz = useRef(null);
  const gatilho = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (evento) => {
      if (!raiz.current?.contains(evento.target)) onFechar();
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto, onFechar]);

  useEffect(() => {
    if (!aberto) return;
    const selecionada = raiz.current?.querySelector('[aria-selected="true"]');
    const primeira = raiz.current?.querySelector('[role="option"]');
    (selecionada || primeira)?.focus();
  }, [aberto]);

  const teclas = (evento) => {
    const itens = [...(raiz.current?.querySelectorAll('[role="option"]') || [])];
    const indice = itens.indexOf(document.activeElement);
    if (evento.key === 'Escape') {
      evento.preventDefault();
      onFechar();
      gatilho.current?.focus();
    } else if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      itens[Math.min(indice + 1, itens.length - 1)]?.focus();
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      itens[Math.max(indice - 1, 0)]?.focus();
    } else if (evento.key === 'Home') {
      evento.preventDefault();
      itens[0]?.focus();
    } else if (evento.key === 'End') {
      evento.preventDefault();
      itens[itens.length - 1]?.focus();
    }
  };

  return (
    <Linha ref={raiz}>
      <Rotulo>{rotulo}</Rotulo>
      <Valor $vazio={vazio}>
        <TextoValor
          key={texto}
          initial={reduzir ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={passo(reduzir)}
        >
          {texto}
        </TextoValor>
        <BotaoTexto
          ref={gatilho}
          type="button"
          aria-expanded={aberto}
          aria-controls={listaId}
          onClick={() => (aberto ? onFechar() : onAbrir())}
        >
          Alterar
        </BotaoTexto>
      </Valor>
      <AnimatePresence initial={false}>
        {aberto && (
          <Lista
            id={listaId}
            role="listbox"
            aria-label={rotulo}
            tabIndex={-1}
            onKeyDown={teclas}
            initial={reduzir ? false : { height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0, transition: passo(reduzir) }}
            transition={passo(reduzir)}
            style={{ overflow: 'hidden' }}
          >
            <Rolagem>
            {opcoes.map((opcao) => {
              const ativa = String(opcao.value) === String(valor || '');
              return (
                <Opcao
                  key={opcao.value}
                  type="button"
                  role="option"
                  aria-selected={ativa}
                  $ativa={ativa}
                  onClick={() => {
                    onChange(opcao.value);
                    gatilho.current?.focus();
                  }}
                >
                  {opcao.label}
                </Opcao>
              );
            })}
            </Rolagem>
          </Lista>
        )}
      </AnimatePresence>
    </Linha>
  );
}

export function SeletorCampo({ id, rotulo, valor, opcoes, onChange }) {
  const [aberto, setAberto] = useState(false);
  const reduzir = useReducedMotion();
  const listaId = useId();
  const raiz = useRef(null);
  const atual = opcoes.find((opcao) => opcao.value === valor) || opcoes[0];

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (evento) => {
      if (!raiz.current?.contains(evento.target)) setAberto(false);
    };
    const tecla = (evento) => {
      if (evento.key === 'Escape') setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  return (
    <Campo ref={raiz}>
      <RotuloCampo id={`${id}-rotulo`}>{rotulo}</RotuloCampo>
      <GatilhoCampo
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={listaId}
        onClick={() => setAberto((atualAberto) => !atualAberto)}
      >
        {atual?.label || 'Selecione'}
      </GatilhoCampo>
      <AnimatePresence initial={false}>
        {aberto && (
          <ListaCampo
            id={listaId}
            role="listbox"
            aria-labelledby={`${id}-rotulo`}
            initial={reduzir ? false : { height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0, transition: passo(reduzir) }}
            transition={passo(reduzir)}
            style={{ overflow: 'hidden' }}
          >
            <Rolagem>
              {opcoes.map((opcao) => (
                <Opcao
                  key={opcao.value}
                  type="button"
                  role="option"
                  aria-selected={opcao.value === valor}
                  $ativa={opcao.value === valor}
                  onClick={() => {
                    onChange(opcao.value);
                    setAberto(false);
                  }}
                >
                  {opcao.label}
                </Opcao>
              ))}
            </Rolagem>
          </ListaCampo>
        )}
      </AnimatePresence>
    </Campo>
  );
}

export function Caixa({ checked, onChange, children, detalhe }) {
  return (
    <RotuloCaixa>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>
        {children}
        {detalhe ? <small>{detalhe}</small> : null}
      </span>
    </RotuloCaixa>
  );
}

export function BuscaExercicios({ exercicios, selecionados, limite, onChange }) {
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState('');
  const reduzir = useReducedMotion();
  const listaId = useId();
  const raiz = useRef(null);
  const resultados = filtrarExercicios(exercicios, termo, selecionados, 8);
  const nomes = new Map((exercicios || []).map((item) => [item.id, item.nome]));

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (evento) => {
      if (!raiz.current?.contains(evento.target)) setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  const escolher = (item) => {
    if (selecionados.includes(item.id)) return;
    if (selecionados.length >= limite) {
      setAviso(`Você pode evitar até ${limite} exercícios.`);
      return;
    }
    onChange([...selecionados, item.id]);
    setAviso(`${item.nome} adicionado.`);
    setTermo('');
    setAberto(false);
  };

  const remover = (id) => {
    onChange(selecionados.filter((item) => item !== id));
    setAviso(`${nomes.get(id) || 'Exercício'} removido.`);
  };

  const teclas = (evento) => {
    if (evento.key === 'Escape') {
      setAberto(false);
      return;
    }
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      raiz.current?.querySelector('[data-resultado]')?.focus();
    }
    if (evento.key === 'Enter' && resultados[0]) {
      evento.preventDefault();
      escolher(resultados[0]);
    }
  };

  return (
    <Busca ref={raiz}>
      <RotuloCampo htmlFor="evitar-exercicio">Exercícios que prefere evitar</RotuloCampo>
      <CampoBusca>
        <FiSearch aria-hidden="true" />
        <input
          id="evitar-exercicio"
          type="search"
          value={termo}
          placeholder="Buscar pelo nome"
          aria-expanded={aberto}
          aria-controls={listaId}
          autoComplete="off"
          onFocus={() => setAberto(true)}
          onChange={(evento) => {
            setTermo(evento.target.value);
            setAberto(true);
          }}
          onKeyDown={teclas}
        />
      </CampoBusca>
      <AnimatePresence initial={false}>
        {aberto && (
          <Resultados
            id={listaId}
            role="listbox"
            aria-label="Resultados da busca"
            initial={reduzir ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduzir ? { opacity: 1 } : { opacity: 0, y: 4 }}
            transition={passo(reduzir)}
          >
            {termo.trim().length < 2 && <Dica>Digite pelo menos duas letras.</Dica>}
            {termo.trim().length >= 2 && resultados.length === 0 && <Dica>Nenhum exercício com esse nome.</Dica>}
            {resultados.map((item) => (
              <Opcao
                key={item.id}
                type="button"
                role="option"
                data-resultado="true"
                onClick={() => escolher(item)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Escape') setAberto(false);
                }}
              >
                <strong>{item.nome}</strong>
                {item.grupoRotulo ? <em>{item.grupoRotulo}</em> : null}
              </Opcao>
            ))}
          </Resultados>
        )}
      </AnimatePresence>
      {selecionados.length > 0 && (
        <GrupoChips>
          {selecionados.map((id) => (
            <Chip key={id} type="button" onClick={() => remover(id)} aria-label={`Remover ${nomes.get(id) || 'exercício'}`}>
              {nomes.get(id) || 'Exercício removido do catálogo'}
              <FiX aria-hidden="true" />
            </Chip>
          ))}
        </GrupoChips>
      )}
      <AvisoBusca role="status">{aviso}</AvisoBusca>
    </Busca>
  );
}

const Linha = styled.div`
  display: grid;
  grid-template-columns: minmax(7.5rem, 38%) 1fr;
  gap: 0.35rem 0.75rem;
  align-items: center;
  padding: 0.7rem 0;
  border-top: 1px solid rgba(198, 169, 100, 0.12);

  &:first-child {
    border-top: none;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Rotulo = styled.span`
  color: rgba(224, 224, 224, 0.7);
  font-family: 'Marcellus', serif;
  font-size: 0.9rem;
`;

const Valor = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: ${({ $vazio }) => ($vazio ? 'var(--accent)' : 'var(--white)')};
  font-family: 'Marcellus', serif;
  font-size: 0.98rem;
`;

const TextoValor = styled(motion.span)`
  min-width: 0;
`;

const Lista = styled(motion.div)`
  grid-column: 1 / -1;
  overflow: hidden;
  border: 1px solid rgba(198, 169, 100, 0.28);
  border-radius: 8px;
  background: #14120e;
`;

const Rolagem = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 240px;
  overflow-y: auto;
`;

const Campo = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const RotuloCampo = styled.label`
  color: rgba(224, 224, 224, 0.7);
  font-family: 'Marcellus', serif;
  font-size: 0.85rem;
`;

const GatilhoCampo = styled.button`
  min-height: 44px;
  padding: 0.45rem 0.7rem;
  text-align: left;
  border-radius: 4px;
  border: 1px solid rgba(198, 169, 100, 0.28);
  background: rgba(0, 0, 0, 0.35);
  color: var(--white);
  font-family: 'Marcellus', serif;
  font-size: 0.95rem;
  letter-spacing: 0.01em;
  text-transform: none;
  cursor: pointer;
  transition: border-color 180ms ease;

  &:hover {
    border-color: var(--accent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const ListaCampo = styled(Lista)`
  position: static;
  grid-column: auto;
`;

const Opcao = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  width: 100%;
  min-height: 40px;
  padding: 0.55rem 0.75rem;
  text-align: left;
  background: ${({ $ativa }) => ($ativa ? 'rgba(198, 169, 100, 0.16)' : 'transparent')};
  color: var(--white);
  font-family: 'Marcellus', serif;
  font-size: 0.92rem;
  letter-spacing: 0.01em;
  text-transform: none;
  cursor: pointer;
  transition: background-color 160ms ease, color 160ms ease;

  strong {
    font-weight: 400;
  }

  em {
    color: rgba(224, 224, 224, 0.62);
    font-style: normal;
    font-size: 0.78rem;
  }

  &:hover,
  &:focus-visible {
    background: rgba(198, 169, 100, 0.12);
    outline: none;
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 1px var(--accent);
  }
`;

const RotuloCaixa = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  min-height: 32px;
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.9rem;
  line-height: 1.35;
  cursor: pointer;
  transition: color 160ms ease;

  &:hover {
    color: var(--white);
  }

  small {
    display: block;
    margin-top: 0.15rem;
    color: rgba(224, 224, 224, 0.6);
    font-size: 0.8rem;
  }

  input {
    appearance: none;
    width: 18px;
    height: 18px;
    margin: 0.15rem 0 0;
    flex-shrink: 0;
    border-radius: 3px;
    border: 1px solid rgba(198, 169, 100, 0.55);
    background: rgba(0, 0, 0, 0.45);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
  }

  input:checked {
    background: var(--accent);
    border-color: var(--accent);
  }

  input:checked::after {
    content: '';
    width: 4px;
    height: 8px;
    border: solid #1a1408;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) translate(-1px, -1px);
  }

  input:active {
    transform: scale(0.96);
  }

  input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    input {
      transition: none;
    }

    input:active {
      transform: none;
    }
  }
`;

const Busca = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const CampoBusca = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0 0.7rem;
  border-radius: 4px;
  border: 1px solid rgba(198, 169, 100, 0.28);
  background: rgba(0, 0, 0, 0.35);
  color: var(--accent);
  transition: border-color 180ms ease;

  &:focus-within {
    border-color: var(--accent);
  }

  svg {
    flex-shrink: 0;
  }

  input {
    width: 100%;
    min-height: 40px;
    border: 0;
    background: transparent;
    color: var(--white);
    font-family: 'Marcellus', serif;
    font-size: 0.95rem;
  }

  input:focus {
    outline: none;
  }

  input::-webkit-search-cancel-button {
    display: none;
  }
`;

const Resultados = styled(motion.div)`
  display: flex;
  flex-direction: column;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid rgba(198, 169, 100, 0.28);
  border-radius: 8px;
  background: #14120e;
`;

const Dica = styled.p`
  margin: 0;
  padding: 0.7rem 0.75rem;
  color: rgba(224, 224, 224, 0.7);
  font-family: 'Marcellus', serif;
  font-size: 0.88rem;
`;

const AvisoBusca = styled.p`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;
