import styled from 'styled-components';
import { resumirExplicacoes } from '../../utils/rotina';
import Revelavel from './Revelavel';

const PorQueRotina = ({ explicacao }) => {
  const itens = resumirExplicacoes(explicacao);
  if (!itens.length) return null;

  return (
    <Revelavel rotulo="Por que esta rotina?" largo>
      <Lista>
        {itens.map((item) => (
          <li key={`${item.tipo}-${item.rotulo}`}>
            <Rotulo>{item.rotulo}</Rotulo>
            {item.linhas.map((linha) => (
              <Frase key={linha}>{linha}</Frase>
            ))}
          </li>
        ))}
      </Lista>
    </Revelavel>
  );
};

const Lista = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0.15rem 0 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`;

const Rotulo = styled.p`
  margin: 0;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Frase = styled.p`
  margin: 0.15rem 0 0;
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.9rem;
  line-height: 1.45;
`;

export default PorQueRotina;
