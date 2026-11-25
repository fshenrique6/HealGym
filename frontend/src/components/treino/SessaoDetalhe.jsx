import styled from 'styled-components';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { agruparEmBlocos, rotuloEquipamento } from '../../utils/treinoExecucao';
import { orientacaoDeCarga, textoAquecimento } from '../../utils/orientacaoFicha';
import { simplificarTexto } from '../../utils/rotina';
import { Aviso, Nota } from './ui';

const SessaoDetalhe = ({ sessao, onTrocar, trocando = false, trocados = [], mostrarAvisos = true }) => {
  const exercicios = Array.isArray(sessao?.exercicios) ? sessao.exercicios : [];
  const blocos = agruparEmBlocos(exercicios);
  const removidos = Array.isArray(sessao?.removidosPorTempo) ? sessao.removidosPorTempo : [];
  const avisos = Array.isArray(sessao?.avisos) ? sessao.avisos : [];

  return (
    <Corpo>
      {blocos.map((bloco) => (
        <div key={`${bloco.nome}-${bloco.itens[0]?.index}`}>
          <NomeBloco>{bloco.nome}</NomeBloco>
          <Lista>
            {bloco.itens.map(({ exercicio, index }) => {
              const posicao = Number(exercicio.posicao) || index + 1;
              const equipamento = rotuloEquipamento(exercicio);
              const carga = orientacaoDeCarga(exercicio.repeticoes, exercicio.rirAlvo);
              const aquecimento = textoAquecimento(exercicio, index);
              const trocado = trocados.includes(posicao);
              return (
                <Item key={exercicio.uid || `${sessao?.codigo}-${posicao}`}>
                  <Numero aria-hidden="true">{posicao}</Numero>
                  <Info>
                    <Nome>
                      {exercicio.nome}
                      {trocado && <Marcador>trocado por você</Marcador>}
                    </Nome>
                    <Prescricao>
                      <span>
                        {exercicio.series} {Number(exercicio.series) === 1 ? 'série' : 'séries'}
                        {exercicio.repeticoes ? ` × ${exercicio.repeticoes}` : ''}
                      </span>
                      {Number(exercicio.descansoSegundos) > 0 && (
                        <span>{exercicio.descansoSegundos} segundos de descanso</span>
                      )}
                    </Prescricao>
                    {carga && <Detalhe>{carga}</Detalhe>}
                    {aquecimento && <Detalhe>{aquecimento}</Detalhe>}
                    {(exercicio.padraoRotulo || equipamento) && (
                      <Detalhe>
                        {[exercicio.padraoRotulo, equipamento].filter(Boolean).join(' · ')}
                      </Detalhe>
                    )}
                  </Info>
                  {onTrocar && (
                    <Trocar
                      type="button"
                      onClick={() => onTrocar(exercicio, posicao)}
                      disabled={trocando}
                      aria-label={`Trocar ${exercicio.nome}`}
                    >
                      <FiRefreshCw aria-hidden="true" />
                      <span>Trocar</span>
                    </Trocar>
                  )}
                </Item>
              );
            })}
          </Lista>
        </div>
      ))}

      {removidos.length > 0 && (
        <NotaTempo>
          Para caber no tempo do treino, ficaram de fora: {removidos.join(', ')}. Os exercícios
          principais foram mantidos.
        </NotaTempo>
      )}
      {mostrarAvisos &&
        avisos.map((aviso) => (
          <Aviso key={aviso} $tipo="atencao">
            <FiAlertCircle aria-hidden="true" />
            <p>{simplificarTexto(aviso)}</p>
          </Aviso>
        ))}
    </Corpo>
  );
};

const NotaTempo = styled(Nota)`
  font-size: 0.82rem;
  line-height: 1.4;
`;

const Corpo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

const NomeBloco = styled.h4`
  margin: 0 0 0.4rem;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const Lista = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Item = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.04);
`;

const Numero = styled.span`
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(198, 169, 100, 0.12);
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  font-weight: 600;
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

const Nome = styled.span`
  color: var(--accent);
  font-family: 'Cormorant', serif;
  font-size: 1.08rem;
  font-weight: 600;
  line-height: 1.3;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
`;

const Marcador = styled.span`
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  font-style: italic;
`;

const Prescricao = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.75rem;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.98rem;

  abbr {
    text-decoration: underline dotted;
    cursor: help;
  }
`;

const Detalhe = styled.span`
  color: rgba(224, 224, 224, 0.55);
  font-family: 'Cormorant', serif;
  font-size: 0.9rem;
`;

const Trocar = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 40px;
  padding: 0.35rem 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(198, 169, 100, 0.3);
  background: transparent;
  color: var(--accent);
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: rgba(198, 169, 100, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  @media (max-width: 420px) {
    span {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
    }
  }
`;

export default SessaoDetalhe;
