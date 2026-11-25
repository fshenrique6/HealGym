import styled from 'styled-components';
import { FiCheck } from 'react-icons/fi';

export const EscolhaUnica = ({ nome, legenda, dica, opcoes, valor, onEscolher, desabilitado }) => (
  <Conjunto disabled={desabilitado}>
    <Legenda>{legenda}</Legenda>
    {dica && <Dica>{dica}</Dica>}
    <Opcoes>
      {opcoes.map((opcao) => {
        const marcado = String(valor) === String(opcao.value);
        return (
          <Rotulo key={opcao.value} $marcado={marcado}>
            <input
              type="radio"
              name={nome}
              value={opcao.value}
              checked={marcado}
              onChange={() => onEscolher(opcao.value)}
            />
            <span>{opcao.label}</span>
          </Rotulo>
        );
      })}
    </Opcoes>
  </Conjunto>
);

export const EscolhaMultipla = ({
  legenda,
  dica,
  opcoes,
  valores,
  onAlternar,
  limite = Infinity,
  minimo = 0,
  desabilitado,
  empilhado = false,
}) => {
  const lista = Array.isArray(valores) ? valores : [];
  return (
    <Conjunto disabled={desabilitado}>
      <Legenda>{legenda}</Legenda>
      {dica && <Dica>{dica}</Dica>}
      <Opcoes $empilhado={empilhado}>
        {opcoes.map((opcao) => {
          const marcado = lista.includes(opcao.value);
          const bloqueado =
            (!marcado && lista.length >= limite) || (marcado && lista.length <= minimo);
          return (
            <Rotulo key={opcao.value} $marcado={marcado} $bloqueado={bloqueado} $empilhado={empilhado}>
              <input
                type="checkbox"
                checked={marcado}
                disabled={bloqueado}
                onChange={() => onAlternar(opcao.value)}
              />
              <Marca aria-hidden="true" $marcado={marcado}>
                {marcado && <FiCheck />}
              </Marca>
              <TextoOpcao>
                <span>{opcao.label}</span>
                {opcao.detalhe && <small>{opcao.detalhe}</small>}
              </TextoOpcao>
            </Rotulo>
          );
        })}
      </Opcoes>
    </Conjunto>
  );
};

const Conjunto = styled.fieldset`
  border: none;
  margin: 0;
  padding: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Legenda = styled.legend`
  padding: 0;
  margin-bottom: 0.35rem;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.3;
`;

const Dica = styled.p`
  margin: 0 0 0.35rem;
  color: rgba(224, 224, 224, 0.62);
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  line-height: 1.35;
`;

const Opcoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex-direction: ${({ $empilhado }) => ($empilhado ? 'column' : 'row')};
  gap: 0.5rem;
`;

const Rotulo = styled.label`
  position: relative;
  display: inline-flex;
  align-items: ${({ $empilhado }) => ($empilhado ? 'flex-start' : 'center')};
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.5rem 0.9rem;
  border-radius: ${({ $empilhado }) => ($empilhado ? '10px' : '999px')};
  border: 1px solid
    ${({ $marcado }) => ($marcado ? 'var(--accent)' : 'rgba(198, 169, 100, 0.25)')};
  background: ${({ $marcado }) => ($marcado ? 'rgba(198, 169, 100, 0.14)' : 'rgba(0, 0, 0, 0.2)')};
  color: ${({ $marcado }) => ($marcado ? 'var(--white)' : 'var(--text-secondary)')};
  font-family: 'Cormorant', serif;
  font-size: 1.02rem;
  font-weight: 600;
  line-height: 1.3;
  cursor: ${({ $bloqueado }) => ($bloqueado ? 'not-allowed' : 'pointer')};
  opacity: ${({ $bloqueado, $marcado }) => ($bloqueado && !$marcado ? 0.5 : 1)};
  transition:
    border-color 160ms ease,
    background-color 160ms ease;

  input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
    margin: 0;
    pointer-events: none;
  }

  &:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  &:hover {
    border-color: ${({ $bloqueado }) => ($bloqueado ? 'rgba(198, 169, 100, 0.25)' : 'var(--accent)')};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Marca = styled.span`
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 0.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  border: 1px solid ${({ $marcado }) => ($marcado ? 'var(--accent)' : 'rgba(198, 169, 100, 0.45)')};
  background: ${({ $marcado }) => ($marcado ? 'var(--accent)' : 'transparent')};
  color: #141414;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const TextoOpcao = styled.span`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;

  small {
    color: rgba(224, 224, 224, 0.6);
    font-size: 0.9rem;
    font-weight: 500;
  }
`;
