import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import DialogoAcao from '../../DialogoAcao';
import { mensagemDeErro } from '../../../utils/rotina';
import { Aviso, BotaoSecundario, Esqueleto, Nota } from '../ui';

const impacto = (diferenca) => {
  const minutos = Number(diferenca) || 0;
  if (minutos === 0) return 'mesmo tempo';
  return minutos > 0 ? `+${minutos} min no treino` : `${minutos} min no treino`;
};

const TrocaExercicioDialog = ({ alvo, carregar, onEscolher, onFechar, aplicando }) => {
  const [estado, setEstado] = useState({ carregando: true, opcoes: [], erro: '' });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!alvo) return undefined;
    let ativo = true;
    setEstado({ carregando: true, opcoes: [], erro: '' });
    carregar(alvo.sessao, alvo.posicao)
      .then((resposta) => {
        if (ativo) setEstado({ carregando: false, opcoes: resposta?.data || [], erro: '' });
      })
      .catch((error) => {
        if (ativo) {
          setEstado({
            carregando: false,
            opcoes: [],
            erro: mensagemDeErro(error, 'Não foi possível buscar as alternativas.'),
          });
        }
      });
    return () => {
      ativo = false;
    };
  }, [alvo, carregar, tentativa]);

  return (
    <DialogoAcao
      aberto={Boolean(alvo)}
      tipo="painel"
      titulo={alvo ? `Trocar ${alvo.nome}` : ''}
      subtitulo={alvo ? `Treino ${alvo.sessao} · posição ${alvo.posicao}` : ''}
      icone={<FiRefreshCw />}
      rotuloCancelar="Manter o atual"
      confirmarDesabilitado={aplicando}
      onCancelar={onFechar}
    >
      <Conteudo aria-busy={estado.carregando || aplicando}>
        <Nota>
          Só aparecem exercícios do catálogo que trabalham o mesmo movimento ou a mesma função na
          treino e que respeitam seus equipamentos e limitações.
        </Nota>
        {estado.carregando && (
          <>
            <Esqueleto $altura="56px" />
            <Esqueleto $altura="56px" />
            <Esqueleto $altura="56px" />
          </>
        )}
        {!estado.carregando && estado.erro && (
          <Aviso $tipo="erro" role="alert">
            <p>{estado.erro}</p>
            <BotaoSecundario type="button" onClick={() => setTentativa((n) => n + 1)}>
              Tentar de novo
            </BotaoSecundario>
          </Aviso>
        )}
        {!estado.carregando && !estado.erro && estado.opcoes.length === 0 && (
          <Aviso $tipo="info">
            <p>
              Não há alternativa compatível para este exercício com as suas preferências. Ele
              continua no treino.
            </p>
          </Aviso>
        )}
        {!estado.carregando && estado.opcoes.length > 0 && (
          <Lista>
            {estado.opcoes.map((opcao) => (
              <li key={opcao.exercicioId}>
                <Opcao
                  type="button"
                  disabled={aplicando}
                  onClick={() => onEscolher(opcao.exercicioId)}
                >
                  <strong>{opcao.nome}</strong>
                  <span>
                    {opcao.series} × {opcao.repeticoes || '—'}
                    {opcao.equipamentoRotulo ? ` · ${opcao.equipamentoRotulo}` : ''}
                  </span>
                  <small>
                    {opcao.mesmoPadrao ? 'Mesmo movimento' : opcao.padraoRotulo || 'Movimento equivalente'}
                    {' · '}
                    {impacto(opcao.diferencaMinutos)}
                  </small>
                </Opcao>
              </li>
            ))}
          </Lista>
        )}
      </Conteudo>
    </DialogoAcao>
  );
};

const Conteudo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const Lista = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Opcao = styled.button`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  border: 1px solid rgba(198, 169, 100, 0.2);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text-secondary);
  text-align: left;
  font-family: 'Cormorant', serif;
  font-size: 0.98rem;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;

  strong {
    color: var(--white);
    font-size: 1.06rem;
  }

  small {
    color: rgba(224, 224, 224, 0.6);
    font-size: 0.9rem;
  }

  &:hover:not(:disabled) {
    border-color: var(--accent);
    background: rgba(198, 169, 100, 0.08);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

export default TrocaExercicioDialog;
