import styled from 'styled-components';
import { motion } from 'framer-motion';

export const FichaMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1rem;
  cursor: default;
  user-select: none;
`;

export const Observacoes = styled.ul`
  margin: -0.5rem 0 1.25rem;
  padding-left: 1.1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;

  li {
    margin-bottom: 0.25rem;
  }
`;

export const BlocoTitulo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.9rem;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin: 0.75rem 0 -0.25rem;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, rgba(198, 169, 100, 0.45), transparent);
  }
`;

export const PrescricaoLinha = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.25rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-bottom: 0.75rem;

  strong {
    color: var(--white);
    margin-right: 0.25rem;
  }
`;

export const HistoricoLinha = styled.div`
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.5;
  margin-bottom: 0.35rem;

  strong {
    color: var(--white);
    font-weight: 600;
    margin-right: 0.35rem;
  }
`;

export const SugestaoTexto = styled.div`
  color: var(--accent);
  font-size: 0.88rem;
  line-height: 1.5;
  margin: 0.25rem 0 0.75rem;
  padding: 0.5rem 0.75rem;
  border-left: 2px solid var(--accent);
  background: rgba(198, 169, 100, 0.06);
`;

export const ComparacaoLinha = styled.div`
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
`;

export const FichaBotoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin: 0.25rem 0 0.75rem;
`;

export const BotaoDiscreto = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: 1px solid rgba(198, 169, 100, 0.35);
  color: var(--accent);
  font-family: inherit;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(198, 169, 100, 0.12);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const TecnicaPainel = styled(motion.div)`
  overflow: hidden;
`;

export const SalvamentoStatus = styled.div`
  color: ${(props) => (props.erro ? '#ff6b6b' : 'var(--text-secondary)')};
  font-size: 0.82rem;
  margin-top: 0.75rem;
  min-height: 1.1rem;
`;

export const AlternativasLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: min(80vw, 520px);
`;

export const AlternativaItem = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(198, 169, 100, 0.25);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: var(--white);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;

  span {
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  &:hover:not(:disabled) {
    border-color: var(--accent);
    background: rgba(198, 169, 100, 0.08);
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

export const CoberturaGrade = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

export const CoberturaCartao = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(198, 169, 100, 0.18);
  border-radius: 8px;
  padding: 1rem 1.1rem;
`;

export const CoberturaFoco = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  color: var(--white);
  font-weight: 700;
  margin-bottom: 0.6rem;

  span {
    color: var(--accent);
    font-weight: 600;
    font-size: 0.85rem;
  }
`;

export const CoberturaItem = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.45;
  padding: 0.2rem 0;
`;

export const StatusChip = styled.span`
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  color: ${(props) =>
    props.status === 'direta' ? 'var(--background)' : props.status === 'indireta' ? 'var(--accent)' : '#8a8a8a'};
  background: ${(props) =>
    props.status === 'direta'
      ? 'var(--accent)'
      : props.status === 'indireta'
        ? 'rgba(198, 169, 100, 0.12)'
        : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid
    ${(props) => (props.status === 'nao_priorizada' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(198, 169, 100, 0.45)')};
`;

export const CoberturaNota = styled.p`
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.55;
  margin: 0.5rem 0 0;
`;

export const CicloTabela = styled.div`
  overflow-x: auto;
  margin-top: 1rem;

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
    color: var(--text-secondary);
  }

  th,
  td {
    padding: 0.45rem 0.6rem;
    border-bottom: 1px solid rgba(198, 169, 100, 0.12);
    text-align: center;
    white-space: nowrap;
  }

  th:first-child,
  td:first-child {
    text-align: left;
  }

  th {
    color: var(--accent);
    font-weight: 600;
  }

  td.atual,
  th.atual {
    background: rgba(198, 169, 100, 0.08);
  }
`;
