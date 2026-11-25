import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiClock, FiPlay } from 'react-icons/fi';
import { ORDEM_ESTADOS, ROTULO_ESTADO, separarFichas } from '../../utils/fichasTreino';
import { estadoOrigem } from '../../utils/navegacaoTreino';
import Revelavel from './Revelavel';
import { BotaoTexto, Nota, Texto } from './ui';

const icone = {
  em_andamento: FiPlay,
  nao_iniciado: FiClock,
  concluido: FiCheck,
};

const HistoricoSecao = ({ historico, carregando, proxima, recolhido = false, forcarAberto = false }) => {
  const navigate = useNavigate();
  const grupos = separarFichas(historico);
  const total = (historico || []).length;

  return (
    <Revelavel
      rotulo="Histórico"
      largo
      inicial={forcarAberto || (!recolhido && total > 0 && grupos.em_andamento.length > 0)}
    >
      {carregando && <Nota>Carregando fichas…</Nota>}
      {!carregando && total === 0 && <Texto>Nenhum treino registrado ainda.</Texto>}
      {!carregando &&
        ORDEM_ESTADOS.map((estado) => {
          const itens = grupos[estado] || [];
          if (!itens.length) return null;
          const Icone = icone[estado];
          return (
            <Grupo key={estado}>
              <RotuloGrupo>
                <Icone aria-hidden="true" />
                {ROTULO_ESTADO[estado]} ({itens.length})
              </RotuloGrupo>
              <Lista>
                {itens.map((treino) => {
                  const espera =
                    !treino.realizado && treino.execucaoPermitida === false
                      ? treino.bloqueioMensagem ||
                        'Conclua o treino anterior para liberar este treino.'
                      : treino.rotinaCodigo &&
                          proxima &&
                          treino.rotinaCodigo !== proxima &&
                          !treino.realizado &&
                          treino.estadoExecucao !== 'em_andamento'
                        ? 'aguarda o treino atual'
                        : '';
                  return (
                  <Linha key={treino._id}>
                    <div>
                      <Nome>{treino.titulo || 'Treino'}</Nome>
                      <Nota>
                        {treino.duracaoEstimadaMinutos
                          ? `${treino.duracaoEstimadaMinutos} min`
                          : treino.tempoDisponivel
                            ? `${treino.tempoDisponivel} min`
                            : 'Duração não informada'}
                        {treino.rotinaCodigo ? ` · treino ${treino.rotinaCodigo}` : ''}
                        {espera ? ` · ${espera}` : ''}
                      </Nota>
                    </div>
                    <BotaoTexto
                      type="button"
                      onClick={() => navigate(`/treino/${treino._id}`, { state: estadoOrigem('historico') })}
                    >
                      Abrir
                    </BotaoTexto>
                  </Linha>
                  );
                })}
              </Lista>
            </Grupo>
          );
        })}
    </Revelavel>
  );
};

const Grupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const RotuloGrupo = styled.p`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
`;

const Lista = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`;

const Linha = styled.li`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(198, 169, 100, 0.1);
  background: rgba(255, 255, 255, 0.02);
`;

const Nome = styled.p`
  margin: 0;
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
`;

export default HistoricoSecao;
