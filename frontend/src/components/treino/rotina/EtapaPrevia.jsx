import styled from 'styled-components';
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiAlertCircle } from 'react-icons/fi';
import { oQueVaiMudar, separarMensagens, resumoDaProgramacao } from '../../../utils/rotina';
import { OBJETIVOS, rotulo } from '../../../utils/perfilTreino';
import SessaoDetalhe from '../SessaoDetalhe';
import Revelavel from '../Revelavel';
import { Acoes, Aviso, BotaoPrimario, BotaoSecundario, BotaoTexto, Nota, TituloCartao } from '../ui';
import { CURVA } from '../movimento';

const EtapaPrevia = ({
  proposta,
  perfil,
  rotinaAtual,
  gerando,
  salvando,
  erro,
  onAjustar,
  onSalvar,
  onTrocar,
}) => {
  const [aberta, setAberta] = useState(null);
  const reduzir = useReducedMotion();
  if (!proposta) return null;

  const objetivo = rotulo(OBJETIVOS, perfil?.trainingGoal);
  const descobertos = Array.isArray(proposta.gruposDescobertos) ? proposta.gruposDescobertos : [];
  const incompleta = descobertos.length > 0;
  const resumo = resumoDaProgramacao(proposta, objetivo);
  const passo = reduzir ? { duration: 0 } : { duration: 0.22, ease: CURVA };
  const minutos = (proposta.sessoes || [])
    .map((sessao) => Number(sessao.duracaoEstimadaMinutos))
    .filter((valor) => Number.isFinite(valor) && valor > 0);
  const duracoesIguais = minutos.length > 0 && minutos.every((valor) => valor === minutos[0]);
  const alterando = Boolean(rotinaAtual);
  const mudancas = alterando ? oQueVaiMudar(rotinaAtual, proposta, perfil) : [];
  const { importantes, observacoes } = separarMensagens(proposta);
  const ajustarDuracao = () => onAjustar?.('duracao');
  const ajustarPreferencias = () => onAjustar?.('preferencias');
  const acaoDaMensagem = (item) => {
    if (item.acao === 'duracao') {
      return (
        <BotaoTexto type="button" onClick={ajustarDuracao}>
          Ajustar duração
        </BotaoTexto>
      );
    }
    if (item.acao === 'preferencias') {
      return (
        <BotaoTexto type="button" onClick={ajustarPreferencias}>
          Ajustar preferências
        </BotaoTexto>
      );
    }
    if (item.acao === 'experiencia') {
      return (
        <BotaoTexto type="button" onClick={() => onAjustar?.('experiencia')}>
          Atualizar experiência
        </BotaoTexto>
      );
    }
    return null;
  };

  return (
    <Bloco>
      <TituloCartao>{alterando ? 'Sua nova programação' : 'Sua programação'}</TituloCartao>
      {mudancas.length > 0 && (
        <Mudancas>
          <Chave>O que vai mudar</Chave>
          <ul>
            {mudancas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Mudancas>
      )}
      {resumo.titulo && <Resumo>{resumo.titulo}</Resumo>}
      {resumo.divisao && (
        <Linha>
          <Chave>Divisão</Chave>
          <Valor>{resumo.divisao}</Valor>
        </Linha>
      )}
      <Linha>
        <Chave>Organização</Chave>
        <Valor>{resumo.organizacao}</Valor>
      </Linha>

      {importantes.map((item) => (
        <Aviso
          key={`${item.codigo}-${item.resumo}`}
          $tipo={item.nivel === 'bloqueio' ? 'erro' : 'atencao'}
          role={item.nivel === 'bloqueio' ? 'alert' : 'status'}
        >
          <FiAlertCircle aria-hidden="true" />
          <Mensagem>
            <p>{item.resumo}</p>
            {acaoDaMensagem(item)}
          </Mensagem>
        </Aviso>
      ))}
      {observacoes.length > 0 && (
        <Revelavel rotulo="Observações da programação">
          <ListaObs>
            {observacoes.map((item) => (
              <li key={`${item.codigo}-${item.resumo}`}>{item.resumo}</li>
            ))}
          </ListaObs>
          {observacoes.some((item) => item.acao === 'duracao') && (
            <BotaoTexto type="button" onClick={ajustarDuracao}>
              Ajustar duração
            </BotaoTexto>
          )}
          {observacoes.some((item) => item.acao === 'experiencia') && (
            <BotaoTexto type="button" onClick={() => onAjustar?.('experiencia')}>
              Atualizar experiência
            </BotaoTexto>
          )}
        </Revelavel>
      )}

      <Sessoes>
        {(proposta.sessoes || []).map((sessao) => {
          const aberto = aberta === sessao.codigo;
          const qtd = (sessao.exercicios || []).length;
          const minutosSessao = Number(sessao.duracaoEstimadaMinutos);
          return (
            <article key={sessao.codigo}>
              <Cabeca>
                <div>
                  <Nome>
                    {sessao.nome}
                    {sessao.focoRotulo ? ` — ${sessao.focoRotulo}` : ''}
                  </Nome>
                  <Nota>
                    {qtd} {qtd === 1 ? 'exercício' : 'exercícios'}
                    {!duracoesIguais && minutosSessao ? ` · ${minutosSessao} min` : ''}
                  </Nota>
                </div>
                <BotaoSecundario type="button" onClick={() => setAberta(aberto ? null : sessao.codigo)}>
                  {aberto ? 'Ocultar' : 'Ver exercícios'}
                </BotaoSecundario>
              </Cabeca>
              <AnimatePresence initial={false}>
                {aberto && (
                  <Detalhe
                    key="exercicios"
                    initial={reduzir ? false : { height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0, transition: passo }}
                    transition={passo}
                    style={{ overflow: 'hidden' }}
                  >
                    <SessaoDetalhe
                      sessao={sessao}
                      mostrarAvisos={false}
                      onTrocar={(exercicio, posicao) =>
                        onTrocar({ sessao: sessao.codigo, posicao, nome: exercicio.nome })
                      }
                      trocando={gerando}
                      trocados={(proposta.ajustes || [])
                        .filter((ajuste) => ajuste.sessao === sessao.codigo)
                        .map((ajuste) => Number(ajuste.posicao))}
                    />
                  </Detalhe>
                )}
              </AnimatePresence>
            </article>
          );
        })}
      </Sessoes>

      {erro && (
        <Aviso $tipo="erro">
          <p>{erro}</p>
        </Aviso>
      )}

      <Acoes>
        <BotaoSecundario type="button" onClick={() => onAjustar?.()} disabled={gerando || salvando}>
          Voltar e ajustar
        </BotaoSecundario>
        <BotaoPrimario type="button" onClick={onSalvar} disabled={gerando || salvando || incompleta}>
          {salvando
            ? 'Salvando…'
            : incompleta
              ? 'Ajuste as preferências para salvar'
              : alterando
                ? 'Salvar alterações'
                : 'Salvar programação'}
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

const Mudancas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  ul {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--text);
    font-family: 'Marcellus', serif;
    font-size: 0.98rem;
    line-height: 1.45;
  }
`;

const Mensagem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  min-width: 0;
`;

const ListaObs = styled.ul`
  margin: 0;
  padding: 0 0 0.15rem 1.05rem;
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.92rem;
  line-height: 1.45;

  li + li {
    margin-top: 0.35rem;
  }
`;

const Resumo = styled.p`
  margin: 0;
  color: var(--accent);
  font-family: 'Marcellus', serif;
  font-size: 1rem;
  line-height: 1.45;
`;

const Linha = styled.p`
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.6rem;
  align-items: baseline;
`;

const Chave = styled.span`
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Valor = styled.span`
  color: var(--text);
  font-family: 'Marcellus', serif;
  font-size: 0.98rem;
`;

const Sessoes = styled.div`
  display: flex;
  flex-direction: column;

  article {
    padding: 0.85rem 0;
    border-top: 1px solid rgba(198, 169, 100, 0.12);
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
`;

const Cabeca = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;

  @media (max-width: 520px) {
    flex-direction: column;
  }
`;

const Nome = styled.h3`
  margin: 0 0 0.15rem;
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const Detalhe = styled(motion.div)`
  overflow: hidden;
`;

export default EtapaPrevia;
