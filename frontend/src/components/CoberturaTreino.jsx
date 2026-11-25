import styled from 'styled-components';
import { rotuloSeries } from '../utils/analiseFicha';

const CoberturaTreino = ({ grupos }) => {
  if (!grupos?.length) return null;

  return (
    <Resumo>
      <Titulo>Séries por grupo muscular</Titulo>
      <Grade>
        {grupos.map((grupo) => (
          <Linha key={grupo.nome}>
            <Nome>{grupo.nome}</Nome>
            <Contagem>{rotuloSeries(grupo.series)}</Contagem>
          </Linha>
        ))}
      </Grade>
    </Resumo>
  );
};

const Resumo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`;

const Titulo = styled.p`
  margin: 0;
  color: var(--white);
  font-family: 'Marcellus', serif;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  line-height: 1.3;
`;

const Grade = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.28rem 1.5rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Linha = styled.p`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0;
  min-width: 0;
  font-family: 'Marcellus', serif;
  font-size: 0.95rem;
  line-height: 1.35;
`;

const Nome = styled.span`
  color: var(--accent);
`;

const Contagem = styled.span`
  color: var(--text-secondary);
  white-space: nowrap;
`;

export default CoberturaTreino;
