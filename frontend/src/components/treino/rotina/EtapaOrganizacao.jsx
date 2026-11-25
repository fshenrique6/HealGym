import styled from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';
import { DIAS_SEMANA, alternarItem } from '../../../utils/rotina';
import { BuscaExercicios, Caixa, SeletorCampo } from '../controles';
import { Acoes, Aviso, BotaoPrimario, BotaoSecundario, BotaoTexto, Nota, Texto, TituloCartao } from '../ui';
import { CURVA, useRevelar } from '../movimento';

const EtapaOrganizacao = ({
  modo,
  onModo,
  dias,
  onDias,
  preferencias,
  onPreferencias,
  opcoes,
  carregando,
  gerando,
  erro,
  onVoltar,
  onGerar,
  alterando = false,
}) => {
  const [painel, setPainel] = useState('equipamentos');
  const [secaoDestino, setSecaoDestino] = useState('equipamentos');
  const [secaoLivre, setSecaoLivre] = useState(false);
  const painelAtual = useRef(painel);
  const fechandoSecao = useRef(false);
  painelAtual.current = painel;
  const reduzir = useReducedMotion();

  useEffect(() => {
    if (secaoDestino === painel) return undefined;
    setSecaoLivre(false);
    if (reduzir) {
      setPainel(secaoDestino);
      fechandoSecao.current = false;
      return undefined;
    }
    const quadro = requestAnimationFrame(() => {
      setPainel(secaoDestino);
      fechandoSecao.current = false;
    });
    return () => cancelAnimationFrame(quadro);
  }, [secaoDestino, painel, reduzir]);
  const diasPainel = useRevelar(false);
  const personalizacao = useRevelar(false);

  useEffect(() => {
    diasPainel.definir(modo === 'calendario');
  }, [modo, diasPainel.definir]);
  const revelar = reduzir
    ? { duration: 0 }
    : { duration: 0.22, ease: CURVA };
  const limiteEvitar = opcoes?.limites?.maxEvitar || 8;
  const temLimitacao = (preferencias.limitacoes || []).length > 0;
  const [avisoEquipamento, setAvisoEquipamento] = useState('');

  return (
    <Bloco>
      <TituloCartao>Minha rotina</TituloCartao>

      <Opcoes role="radiogroup" aria-label="Como distribuir a semana">
        <Opcao type="button" $ativa={modo === 'flexivel'} aria-pressed={modo === 'flexivel'} onClick={() => onModo('flexivel')}>
          <strong>Rotina flexível</strong>
          <span>Sem dias fixos. Você segue a sequência e descansa quando precisar.</span>
        </Opcao>
        <Opcao type="button" $ativa={modo === 'calendario'} aria-pressed={modo === 'calendario'} onClick={() => onModo('calendario')}>
          <strong>Dias definidos</strong>
          <span>Cada treino fica em um dia da semana, inclusive domingo.</span>
        </Opcao>
      </Opcoes>

      <AnimatePresence initial={false}>
        {diasPainel.aberto && (
          <Dias
            key="dias"
            initial={reduzir ? false : { height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0, transition: { duration: reduzir ? 0 : 0.22, ease: CURVA } }}
            transition={revelar}
            style={{ overflow: 'hidden' }}
            onAnimationComplete={diasPainel.concluir}
          >
            <Nota>
              Marque um dia para cada treino
              {dias.length ? ` · ${dias.length} selecionado${dias.length === 1 ? '' : 's'}` : ''}.
            </Nota>
            <Grade role="group" aria-label="Dias da semana">
              {DIAS_SEMANA.map((dia) => {
                const ativo = dias.includes(dia.dia);
                return (
                  <Dia
                    key={dia.dia}
                    type="button"
                    $ativo={ativo}
                    aria-pressed={ativo}
                    onClick={() => onDias(alternarItem(dias, dia.dia, 7))}
                  >
                    {dia.curto}
                  </Dia>
                );
              })}
            </Grade>
          </Dias>
        )}
      </AnimatePresence>

      {temLimitacao && !personalizacao.aberto && (
        <Nota>Suas limitações de movimento continuam valendo nesta rotina.</Nota>
      )}

      <BotaoTexto type="button" aria-expanded={personalizacao.aberto} onClick={personalizacao.alternar}>
        {personalizacao.aberto ? 'Ocultar personalização' : 'Personalizar minha programação'}
      </BotaoTexto>
      {!personalizacao.aberto && <Nota>Equipamentos, exercícios e limitações. Opcional.</Nota>}

      <AnimatePresence initial={false}>
        {personalizacao.aberto && (
        <Avancado
          key="personalizar"
          data-livre={personalizacao.livre ? 'true' : undefined}
          initial={reduzir ? false : { height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0, transition: { duration: reduzir ? 0 : 0.22, ease: CURVA } }}
          transition={revelar}
          style={{ overflow: personalizacao.livre ? 'visible' : 'hidden' }}
          onAnimationComplete={personalizacao.concluir}
        >
          {carregando && <Nota>Carregando opções…</Nota>}
          {!carregando &&
            [
              ['equipamentos', 'Equipamentos'],
              ['evitar', 'Exercícios a evitar'],
              ['cuidados', 'Cuidados e limitações'],
            ].map(([id, rotulo]) => (
              <Painel key={id}>
                <Gatilho
                  type="button"
                  aria-expanded={secaoDestino === id}
                  onClick={() => {
                    fechandoSecao.current = true;
                    setSecaoLivre(false);
                    setSecaoDestino((atual) => (atual === id ? '' : id));
                  }}
                >
                  <span>{rotulo}</span>
                  <Seta
                    aria-hidden="true"
                    animate={{ rotate: secaoDestino === id ? 180 : 0 }}
                    transition={{ duration: reduzir ? 0 : 0.22, ease: CURVA }}
                  >
                    <FiChevronDown />
                  </Seta>
                </Gatilho>
                <AnimatePresence initial={false}>
                  {painel === id && (
                    <Corpo
                      key={id}
                      data-livre={secaoLivre ? 'true' : undefined}
                      initial={reduzir ? false : { height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0, transition: { duration: reduzir ? 0 : 0.22, ease: CURVA } }}
                      transition={revelar}
                      style={{ overflow: secaoLivre ? 'visible' : 'hidden' }}
                      onAnimationComplete={() => {
                        if (!fechandoSecao.current && painelAtual.current === id) setSecaoLivre(true);
                      }}
                    >
                      <Miolo>
                      {id === 'equipamentos' && (
                        <>
                          <Nota>Disponíveis na academia.</Nota>
                          <Checks>
                            {(opcoes?.equipamentos || []).map((item) => (
                              <Caixa
                                key={item.id}
                                checked={(preferencias.equipamentos || []).includes(item.id)}
                                onChange={() => {
                                  const equipamentos = alternarItem(preferencias.equipamentos, item.id);
                                  if (!equipamentos.length) {
                                    setAvisoEquipamento('Mantenha ao menos um equipamento.');
                                    return;
                                  }
                                  setAvisoEquipamento('');
                                  onPreferencias({ ...preferencias, equipamentos });
                                }}
                              >
                                {item.rotulo}
                              </Caixa>
                            ))}
                          </Checks>
                          {avisoEquipamento && <Nota>{avisoEquipamento}</Nota>}
                          <SeletorCampo
                            id="pref-equipamento"
                            rotulo="Preferência"
                            valor={preferencias.preferenciaEquipamento}
                            opcoes={(opcoes?.preferenciasEquipamento || []).map((item) => ({
                              value: item.id,
                              label: item.rotulo,
                            }))}
                            onChange={(valor) =>
                              onPreferencias({ ...preferencias, preferenciaEquipamento: valor })
                            }
                          />
                        </>
                      )}
                      {id === 'evitar' && (
                        <BuscaExercicios
                          exercicios={opcoes?.exercicios || []}
                          selecionados={preferencias.evitar || []}
                          limite={limiteEvitar}
                          onChange={(evitar) => onPreferencias({ ...preferencias, evitar })}
                        />
                      )}
                      {id === 'cuidados' && (
                        <>
                          <Texto>Informe só o que você mesmo reconhece como limitação.</Texto>
                          <Checks $coluna>
                            {(opcoes?.limitacoes || []).map((item) => (
                              <Caixa
                                key={item.id}
                                checked={(preferencias.limitacoes || []).includes(item.id)}
                                detalhe={item.detalhe}
                                onChange={() =>
                                  onPreferencias({
                                    ...preferencias,
                                    limitacoes: alternarItem(preferencias.limitacoes, item.id),
                                  })
                                }
                              >
                                {item.rotulo}
                              </Caixa>
                            ))}
                          </Checks>
                        </>
                      )}
                      </Miolo>
                    </Corpo>
                  )}
                </AnimatePresence>
              </Painel>
            ))}
        </Avancado>
        )}
      </AnimatePresence>

      {erro && (
        <Aviso $tipo="erro">
          <p>{erro}</p>
        </Aviso>
      )}

      <Acoes>
        <BotaoSecundario type="button" onClick={onVoltar} disabled={gerando}>
          Voltar
        </BotaoSecundario>
        <BotaoPrimario type="button" onClick={onGerar} disabled={gerando || carregando}>
          {gerando ? 'Montando…' : alterando ? 'Ver programação' : 'Criar minha programação'}
        </BotaoPrimario>
      </Acoes>
    </Bloco>
  );
};

const Bloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const Opcoes = styled.div`
  display: grid;
  gap: 0.6rem;

  @media (min-width: 640px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Opcao = styled.button`
  text-align: left;
  min-height: 44px;
  padding: 0.85rem 0.9rem;
  border-radius: 8px;
  border: 1px solid ${({ $ativa }) => ($ativa ? 'var(--accent)' : 'rgba(198, 169, 100, 0.18)')};
  background: ${({ $ativa }) => ($ativa ? 'rgba(198, 169, 100, 0.1)' : 'rgba(255, 255, 255, 0.02)')};
  color: var(--white);
  cursor: pointer;
  text-transform: none;
  letter-spacing: 0;

  strong {
    display: block;
    font-family: 'Cinzel', serif;
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 0.3rem;
  }

  span {
    display: block;
    font-family: 'Marcellus', serif;
    font-size: 0.9rem;
    line-height: 1.4;
    color: var(--text-secondary);
    text-transform: none;
    letter-spacing: 0.01em;
  }

  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 0.3s ease;

  &:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

const Dias = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const Grade = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.35rem;

  @media (max-width: 520px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Dia = styled.button`
  min-height: 40px;
  border-radius: 4px;
  border: 1px solid ${({ $ativo }) => ($ativo ? 'var(--accent)' : 'rgba(198, 169, 100, 0.22)')};
  background: ${({ $ativo }) => ($ativo ? 'rgba(198, 169, 100, 0.16)' : 'transparent')};
  color: ${({ $ativo }) => ($ativo ? 'var(--white)' : 'var(--text-secondary)')};
  font-family: 'Marcellus', serif;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  text-transform: none;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease,
    transform 180ms ease;

  &:hover {
    border-color: var(--accent);
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:active {
      transform: none;
    }
  }
`;

const Avancado = styled(motion.div)`
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(198, 169, 100, 0.12);

  &[data-livre='true'] {
    height: auto !important;
  }
`;

const Painel = styled.div`
  flex-shrink: 0;
  border-bottom: 1px solid rgba(198, 169, 100, 0.12);
`;

const Gatilho = styled.button`
  width: 100%;
  min-height: 44px;
  padding: 0.7rem 0.1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  text-align: left;
  background: transparent;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 180ms ease;

  &:hover {
    color: var(--accent-light);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Seta = styled(motion.span)`
  display: inline-flex;
  color: var(--accent);
`;

const Corpo = styled(motion.div)`
  overflow: hidden;

  &[data-livre='true'] {
    height: auto !important;
  }
`;

const Miolo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding-bottom: 0.85rem;
`;

const Checks = styled.div`
  display: grid;
  grid-template-columns: ${({ $coluna }) => ($coluna ? '1fr' : '1fr 1fr')};
  gap: 0.35rem 0.75rem;

  label {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    min-height: 32px;
    color: var(--text-secondary);
    font-family: 'Marcellus', serif;
    font-size: 0.9rem;
    line-height: 1.35;
    border-radius: 4px;
    transition: color 160ms ease;

    &:hover {
      color: var(--white);
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  small {
    display: block;
    color: rgba(224, 224, 224, 0.6);
    font-size: 0.8rem;
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export default EtapaOrganizacao;
