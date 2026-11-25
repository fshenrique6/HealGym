import styled from 'styled-components';
import { FiClock, FiPlay, FiActivity } from 'react-icons/fi';
import { proximaSessao, ROTULO_STATUS, aparenciaDaSessao } from '../../utils/rotina';
import {
  Acoes,
  BotaoPrimario,
  CartaoDestaque,
  Meta,
  Nota,
  Olho,
  Selo,
  Texto,
  TituloCartao,
} from './ui';

const Destaque = styled(CartaoDestaque)`
  text-align: center;

  ${Olho} {
    padding-left: 0.12em;
  }

  ${TituloCartao} {
    padding-left: 0.08em;
  }

  ${Meta} {
    justify-content: center;
  }

  ${Acoes} {
    justify-content: center;
  }

  @media (max-width: 480px) {
    ${Acoes} {
      align-items: center;
    }
  }
`;

const ProximoTreino = ({ rotina, estado, onIniciar, onAbrir, iniciando }) => {
  const proxima = proximaSessao(rotina, estado);
  if (!proxima?.sessao) {
    return (
      <Destaque>
        <Olho>Meu próximo treino</Olho>
        <TituloCartao>Ciclo concluído</TituloCartao>
        <Texto>
          Você concluiu todos os treinos deste ciclo. O próximo começa automaticamente quando
          você iniciar o primeiro de novo.
        </Texto>
      </Destaque>
    );
  }

  const { sessao, treinoAbertoId, execucaoIniciada } = proxima;
  const exercicios = Array.isArray(sessao.exercicios) ? sessao.exercicios.length : 0;
  const minutos = sessao.duracaoEstimadaMinutos || sessao.minutos;
  const grupos = Array.isArray(sessao.grupos) ? sessao.grupos.join(', ') : sessao.focoRotulo;
  const visual = aparenciaDaSessao(
    { ...proxima, codigo: sessao.codigo, status: proxima.status },
    estado?.proxima,
  );
  const continuar = Boolean(execucaoIniciada && treinoAbertoId);
  const rotulo = continuar ? 'Continuar treino' : 'Iniciar treino';
  const acao = () => {
    if (treinoAbertoId) onAbrir(treinoAbertoId);
    else onIniciar(sessao.codigo);
  };

  return (
    <Destaque>
      <Olho>Meu próximo treino</Olho>
      <div>
        <TituloCartao>
          {sessao.nome}
          {sessao.focoRotulo ? ` — ${sessao.focoRotulo}` : ''}
        </TituloCartao>
        {grupos && <Texto>{grupos}</Texto>}
      </div>

      <Meta>
        <li>
          <FiActivity aria-hidden="true" />
          {exercicios} {exercicios === 1 ? 'exercício' : 'exercícios'}
        </li>
        <li>
          <FiClock aria-hidden="true" />
          {minutos} min estimados
        </li>
        <li>
          <Selo $status={visual.status}>{visual.rotulo || ROTULO_STATUS[visual.status]}</Selo>
        </li>
      </Meta>

      <Acoes>
        <BotaoPrimario type="button" onClick={acao} disabled={iniciando || (continuar && !treinoAbertoId)}>
          <FiPlay aria-hidden="true" />
          {iniciando ? 'Abrindo…' : rotulo}
        </BotaoPrimario>
      </Acoes>
      <Nota>A duração real depende do seu ritmo entre as séries.</Nota>
    </Destaque>
  );
};

export default ProximoTreino;
