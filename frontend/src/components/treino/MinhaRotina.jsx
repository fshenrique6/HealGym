import styled from 'styled-components';
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiClock, FiActivity } from 'react-icons/fi';
import {
  listaDeDias,
  ROTULO_STATUS,
  sequenciaFlexivel,
  semanaCalendario,
  estadoDaSessao,
  aparenciaDaSessao,
  avisoBloqueio,
  sessaoLiberada,
} from '../../utils/rotina';
import SessaoDetalhe from './SessaoDetalhe';
import Revelavel from './Revelavel';
import {
  Acoes,
  BotaoSecundario,
  Cartao,
  Meta,
  Nota,
  Selo,
  Texto,
} from './ui';
import { CURVA } from './movimento';

const CartaoSessao = ({
  sessao,
  situacao,
  proxima,
  destacada,
  aberta,
  onToggle,
  onAbrir,
  bloqueio,
}) => {
  const exercicios = Array.isArray(sessao.exercicios) ? sessao.exercicios.length : 0;
  const minutos = sessao.duracaoEstimadaMinutos || sessao.minutos;
  const grupos = Array.isArray(sessao.grupos) ? sessao.grupos.join(', ') : sessao.focoRotulo;
  const base = situacao || { codigo: sessao.codigo, status: 'planejada' };
  const visual = aparenciaDaSessao(base, proxima);
  const liberada = sessaoLiberada({ proxima }, sessao.codigo);
  const concluida = base.status === 'concluida';
  const fichaId = base.treinoAbertoId || base.ultimoConcluidoId || null;
  const reduzir = useReducedMotion();
  const verExercicios = () => {
    if (fichaId) onAbrir(fichaId);
    else onToggle(sessao.codigo);
  };

  return (
    <Item $destaque={destacada}>
      <CabecalhoItem>
        <div>
          <NomeSessao>
            {sessao.nome}
            {sessao.focoRotulo ? ` — ${sessao.focoRotulo}` : ''}
          </NomeSessao>
          {grupos && <Texto>{grupos}</Texto>}
        </div>
        <Selo $status={visual.status}>{visual.rotulo}</Selo>
      </CabecalhoItem>
      <Meta>
        <li>
          <FiClock aria-hidden="true" />
          {minutos} min
        </li>
        <li>
          <FiActivity aria-hidden="true" />
          {exercicios} {exercicios === 1 ? 'exercício' : 'exercícios'}
        </li>
      </Meta>
      <Acoes>
        <BotaoSecundario type="button" onClick={verExercicios}>
          {aberta && !fichaId ? 'Ocultar' : 'Ver exercícios'}
        </BotaoSecundario>
      </Acoes>
      <AnimatePresence initial={false}>
        {aberta && (
          <DetalheWrap
            key="detalhe"
            initial={reduzir ? false : { height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0, transition: { duration: reduzir ? 0 : 0.22, ease: CURVA } }}
            transition={{ duration: reduzir ? 0 : 0.22, ease: CURVA }}
            style={{ overflow: 'hidden' }}
          >
            <DetalheInterno>
              {!liberada && !concluida && <Nota>{bloqueio}</Nota>}
              <SessaoDetalhe sessao={sessao} />
            </DetalheInterno>
          </DetalheWrap>
        )}
      </AnimatePresence>
    </Item>
  );
};

const MinhaRotina = ({ rotina, estado, onAbrir }) => {
  const [aberta, setAberta] = useState(null);
  if (!rotina) return null;

  const sessoes = Array.isArray(rotina.sessoes) ? rotina.sessoes : [];
  const calendario = rotina.agenda?.modo === 'calendario';
  const titulo = `Minha rotina — ${sessoes.length} ${sessoes.length === 1 ? 'dia' : 'dias'} por semana`;
  const estrategia = rotina.estrategia?.rotulo || rotina.estrategia?.codigo;
  const toggle = (codigo) => setAberta((atual) => (atual === codigo ? null : codigo));
  const bloqueio = avisoBloqueio(rotina, estado);
  const acoes = { onAbrir, bloqueio, proxima: estado?.proxima };

  return (
    <Revelavel rotulo={titulo} largo>
      <Corpo>
      {estrategia && <Nota>{estrategia}</Nota>}

      {calendario ? (
        <>
          <Nota>
            Dias fixos: {listaDeDias(rotina.agenda?.dias, false) || 'não definidos'}
          </Nota>
          <GradeCalendario>
            {semanaCalendario(rotina, estado).map((dia) => (
              <Dia key={dia.dia} $hoje={dia.hoje} $status={dia.status}>
                <strong>{dia.curto}</strong>
                {dia.sessao ? (
                  <>
                    <span>{dia.sessao.nome}</span>
                    <Selo $status={dia.status}>{ROTULO_STATUS[dia.status]}</Selo>
                  </>
                ) : (
                  <span>Descanso</span>
                )}
              </Dia>
            ))}
          </GradeCalendario>
          <Lista>
            {sessoes.map((sessao) => {
              const situacao = estadoDaSessao(estado, sessao.codigo);
              return (
                <CartaoSessao
                  key={sessao.codigo}
                  sessao={sessao}
                  situacao={situacao}
                  destacada={estado?.proxima === sessao.codigo}
                  aberta={aberta === sessao.codigo}
                  onToggle={toggle}
                  {...acoes}
                />
              );
            })}
          </Lista>
        </>
      ) : (
        <Lista>
          {sequenciaFlexivel(rotina, estado).map((passo, indice) => {
            if (passo.tipo === 'descanso') {
              return (
                <Descanso key={`descanso-${indice}`}>
                  Descanso recomendado
                </Descanso>
              );
            }
            return (
              <CartaoSessao
                key={passo.sessao.codigo}
                sessao={passo.sessao}
                situacao={estadoDaSessao(estado, passo.sessao.codigo)}
                destacada={passo.proxima}
                aberta={aberta === passo.sessao.codigo}
                onToggle={toggle}
                {...acoes}
              />
            );
          })}
        </Lista>
      )}
      </Corpo>
    </Revelavel>
  );
};

const Corpo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 0.35rem;
`;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`;

const Item = styled(Cartao)`
  border-color: ${({ $destaque }) =>
    $destaque ? 'rgba(198, 169, 100, 0.35)' : 'rgba(198, 169, 100, 0.12)'};
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`;

const CabecalhoItem = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
`;

const NomeSessao = styled.h3`
  margin: 0 0 0.15rem;
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
`;

const DetalheWrap = styled(motion.div)`
  overflow: hidden;
`;

const DetalheInterno = styled.div`
  border-top: 1px solid rgba(198, 169, 100, 0.12);
  padding-top: 0.75rem;
`;

const Descanso = styled.div`
  padding: 0.55rem 0.85rem;
  border-radius: 10px;
  border: 1px dashed rgba(198, 169, 100, 0.22);
  color: rgba(224, 224, 224, 0.65);
  font-family: 'Marcellus', serif;
  font-size: 0.98rem;
  text-align: center;
`;

const GradeCalendario = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.35rem;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Dia = styled.div`
  min-height: 76px;
  padding: 0.45rem;
  border-radius: 10px;
  border: 1px solid
    ${({ $hoje }) => ($hoje ? 'rgba(198, 169, 100, 0.45)' : 'rgba(198, 169, 100, 0.12)')};
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: 'Marcellus', serif;
  font-size: 0.92rem;
  color: var(--text-secondary);

  strong {
    color: var(--accent);
    font-family: 'Cinzel', serif;
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    font-weight: 600;
  }
`;

export default MinhaRotina;
