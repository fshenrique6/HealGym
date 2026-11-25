import styled from 'styled-components';
import { linhasDeDetalhe } from '../../utils/detalheExercicio';
import { rotuloEquipamento } from '../../utils/treinoExecucao';

const DetalhesExercicio = ({ exercicio }) => {
  const linhas = linhasDeDetalhe(exercicio, rotuloEquipamento(exercicio));
  if (!linhas.length) return null;
  return (
    <Lista>
      {linhas.map((linha) => (
        <Item key={linha.id}>
          <Rotulo>{linha.rotulo}:</Rotulo>
          <Valor>{linha.texto}</Valor>
        </Item>
      ))}
    </Lista>
  );
};

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-width: 0;
  margin-top: 0.15rem;
`;

const Item = styled.p`
  margin: 0;
  min-width: 0;
  font-family: 'Marcellus', serif;
  font-size: 0.88rem;
  line-height: 1.35;
`;

const Rotulo = styled.span`
  color: var(--accent);
  margin-right: 0.35rem;
`;

const Valor = styled.span`
  color: var(--text-secondary);
  overflow-wrap: anywhere;
`;

export default DetalhesExercicio;
