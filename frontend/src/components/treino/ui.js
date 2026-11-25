import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { BaseBotao } from './movimento';

export { Surge } from './movimento';

const foco = css`
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const semMovimento = css`
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
  }
`;

export const Pagina = styled.div`
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    var(--gradient-start) 0%,
    var(--gradient-mid) 50%,
    var(--gradient-end) 100%
  );
  color: var(--text);
  overflow-x: hidden;
`;

export const Topo = styled.header`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(198, 169, 100, 0.16);

  > :first-child {
    justify-self: start;
  }

  > :last-child {
    justify-self: end;
  }

  @media (min-width: 720px) {
    padding: 1.25rem 2rem;
  }
`;

export const Marca = styled.span`
  font-family: 'Cinzel', serif;
  font-size: 1.35rem;
  line-height: 1.1;
  letter-spacing: 0.14em;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (min-width: 720px) {
    font-size: 1.7rem;
  }
`;

export const Conteudo = styled.main`
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: 1.25rem 1rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (min-width: 720px) {
    padding: 2rem 1.5rem 4rem;
    gap: 2rem;
  }
`;

export const TituloPagina = styled.h1`
  margin: 0;
  font-family: 'Cinzel', serif;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
  width: 100%;
  padding-left: 0.12em;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const Secao = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const CabecalhoSecao = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

export const TituloSecao = styled.h2`
  margin: 0;
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

export const Olho = styled.p`
  margin: 0;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

export const Cartao = styled(motion.div)`
  background: var(--card-bg);
  border: 1px solid rgba(198, 169, 100, 0.1);
  border-radius: 12px;
  padding: 1.15rem 1.1rem;

  @media (min-width: 720px) {
    padding: 1.35rem 1.5rem;
  }
`;

export const CartaoDestaque = styled(Cartao)`
  border-color: rgba(198, 169, 100, 0.28);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.35rem 1.2rem;
  cursor: default;
  transition:
    transform 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(198, 169, 100, 0.45);
    box-shadow: 0 4px 15px rgba(198, 169, 100, 0.18);
  }

  @media (min-width: 720px) {
    padding: 1.7rem 2rem;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

export const TituloCartao = styled.h3`
  margin: 0;
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const Texto = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.98rem;
  line-height: 1.55;
  letter-spacing: 0.02em;
`;

export const Nota = styled.p`
  margin: 0;
  color: rgba(224, 224, 224, 0.72);
  font-family: 'Marcellus', serif;
  font-size: 0.9rem;
  line-height: 1.45;
`;

export const Meta = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.92rem;

  li {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  svg {
    color: var(--accent);
    flex-shrink: 0;
  }
`;

export const Acoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const botao = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 12px 18px;
  border-radius: 5px;
  font-family: 'Marcellus', serif;
  font-size: 0.82rem;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease;

  svg {
    flex-shrink: 0;
    font-size: 1rem;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  ${foco}
  ${semMovimento}
`;

export const BotaoPrimario = styled(BaseBotao)`
  ${botao}
  border: none;
  background: var(--gold-gradient);
  color: var(--background);

  &:hover:not(:disabled) {
    box-shadow: 0 4px 15px rgba(198, 169, 100, 0.28);
  }
`;

export const BotaoSecundario = styled(BaseBotao)`
  ${botao}
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);

  &:hover:not(:disabled) {
    background: var(--accent);
    color: var(--background);
  }
`;

export const BotaoRetorno = styled(BaseBotao)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 38px;
  padding: 0.35rem 0.95rem 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(198, 169, 100, 0.72);
  background: rgba(198, 169, 100, 0.08);
  box-shadow: inset 0 0 0 1px rgba(198, 169, 100, 0.12);
  color: var(--accent);
  font-family: 'Marcellus', serif;
  font-size: 0.84rem;
  line-height: 1;
  letter-spacing: 0.06em;
  text-transform: none;
  text-decoration: none;
  cursor: pointer;

  svg {
    flex-shrink: 0;
    font-size: 0.95rem;
  }

  &:hover:not(:disabled) {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--background);
    box-shadow: 0 0 0 1px rgba(198, 169, 100, 0.35);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  ${foco}
  ${semMovimento}
`;

export const BotaoTexto = styled(BaseBotao)`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 36px;
  padding: 0.45rem 0.35rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--accent);
  font-family: 'Marcellus', serif;
  font-size: 0.92rem;
  line-height: 1.4;
  letter-spacing: 0.04em;
  text-transform: none;
  cursor: pointer;
  align-self: flex-start;
  width: fit-content;
  max-width: 100%;
  text-decoration: underline;
  text-decoration-color: rgba(198, 169, 100, 0.35);
  text-underline-offset: 3px;
  transform-origin: left center;
  overflow: visible;
  transition: text-decoration-color 180ms ease;

  &:hover:not(:disabled) {
    text-decoration-color: var(--accent);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  ${foco}
  ${semMovimento}
`;

export const GrupoChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const Chip = styled(BaseBotao)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 40px;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  border: 1px solid
    ${({ $ativo }) => ($ativo ? 'var(--accent)' : 'rgba(198, 169, 100, 0.25)')};
  background: ${({ $ativo }) => ($ativo ? 'rgba(198, 169, 100, 0.16)' : 'rgba(0, 0, 0, 0.2)')};
  color: ${({ $ativo }) => ($ativo ? 'var(--white)' : 'var(--text-secondary)')};
  font-family: 'Marcellus', serif;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
  text-transform: none;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;

  &:hover:not(:disabled) {
    border-color: var(--accent);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  svg {
    color: var(--accent);
  }

  ${foco}
  ${semMovimento}
`;

const CORES_STATUS = {
  planejada: ['rgba(255, 255, 255, 0.05)', 'var(--text-secondary)'],
  disponivel: ['rgba(198, 169, 100, 0.12)', 'var(--accent)'],
  em_andamento: ['rgba(198, 169, 100, 0.16)', 'var(--accent-light)'],
  concluida: ['rgba(198, 169, 100, 0.08)', 'var(--accent)'],
  nao_realizada: ['rgba(255, 255, 255, 0.04)', 'rgba(224, 224, 224, 0.55)'],
  descanso: ['transparent', 'rgba(224, 224, 224, 0.55)'],
};

export const Selo = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: ${({ $status }) => (CORES_STATUS[$status] || CORES_STATUS.planejada)[0]};
  color: ${({ $status }) => (CORES_STATUS[$status] || CORES_STATUS.planejada)[1]};
  font-family: 'Marcellus', serif;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
`;

const CORES_AVISO = {
  info: ['rgba(198, 169, 100, 0.08)', 'rgba(198, 169, 100, 0.3)'],
  atencao: ['rgba(217, 160, 122, 0.1)', 'rgba(217, 160, 122, 0.4)'],
  sucesso: ['rgba(127, 191, 143, 0.1)', 'rgba(127, 191, 143, 0.4)'],
  erro: ['rgba(255, 107, 107, 0.08)', 'rgba(255, 107, 107, 0.45)'],
};

export const Aviso = styled.div`
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  background: ${({ $tipo }) => (CORES_AVISO[$tipo] || CORES_AVISO.info)[0]};
  border: 1px solid ${({ $tipo }) => (CORES_AVISO[$tipo] || CORES_AVISO.info)[1]};
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.92rem;
  line-height: 1.45;

  > svg {
    flex-shrink: 0;
    margin-top: 0.2rem;
    color: ${({ $tipo }) => ($tipo === 'erro' ? '#ff8a8a' : $tipo === 'sucesso' ? '#9fd3ac' : 'var(--accent)')};
  }

  p {
    margin: 0;
  }

  strong {
    color: var(--white);
  }
`;

export const ListaSimples = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const brilho = keyframes`
  from { background-position: -200px 0; }
  to { background-position: calc(200px + 100%) 0; }
`;

export const Esqueleto = styled.div`
  height: ${({ $altura }) => $altura || '1rem'};
  width: ${({ $largura }) => $largura || '100%'};
  border-radius: 8px;
  background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.03) 0,
      rgba(255, 255, 255, 0.08) 40px,
      rgba(255, 255, 255, 0.03) 80px
    )
    no-repeat,
    rgba(255, 255, 255, 0.03);
  background-size: 200px 100%;
  animation: ${brilho} 1.4s ease-in-out infinite;

  ${semMovimento}
`;

export const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export const Divisor = styled.hr`
  border: none;
  border-top: 1px solid rgba(198, 169, 100, 0.12);
  margin: 0.25rem 0;
`;
