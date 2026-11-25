import { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { estadoOrigem } from '../utils/navegacaoTreino';
import { FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import useCentroTreino from '../hooks/useCentroTreino';
import { sessaoLiberada, sessoesDaRotina } from '../utils/rotina';
import DialogoAcao from './DialogoAcao';
import ProximoTreino from './treino/ProximoTreino';
import MinhaRotina from './treino/MinhaRotina';
import HistoricoSecao from './treino/HistoricoSecao';
import PorQueRotina from './treino/PorQueRotina';
import AssistenteRotina from './treino/rotina/AssistenteRotina';
import {
  Acoes,
  Aviso,
  BotaoPrimario,
  BotaoRetorno,
  BotaoSecundario,
  Cartao,
  Conteudo,
  Esqueleto,
  Marca,
  Pagina,
  Texto,
  TituloCartao,
  Surge,
  TituloPagina,
  Topo,
} from './treino/ui';

const TreinoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const centro = useCentroTreino();
  const veioDoHistorico = location.hash === '#historico';
  const [assistente, setAssistente] = useState(false);
  const [modal, setModal] = useState({ aberto: false, titulo: '', mensagem: '' });

  const alertar = useCallback((titulo, mensagem) => {
    setModal({ aberto: true, titulo, mensagem });
  }, []);

  const irParaTreino = useCallback(
    (id, aviso) => {
      if (!id) return;
      navigate(`/treino/${id}`, {
        state: { ...estadoOrigem('treino'), avisoRecuperacao: aviso || '' },
      });
    },
    [navigate],
  );

  useEffect(() => {
    if (!veioDoHistorico) return undefined;
    const quadro = requestAnimationFrame(() => {
      document.getElementById('historico')?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(quadro);
  }, [veioDoHistorico, centro.carregando]);

  const iniciar = async (codigo) => {
    if (!sessaoLiberada(centro.estado, codigo)) return;
    try {
      const resultado = await centro.iniciarSessao(codigo);
      if (!resultado?.id) {
        alertar('Treino', 'Não foi possível abrir a sessão.');
        return;
      }
      irParaTreino(resultado.id, resultado.avisoRecuperacao);
    } catch {
      // erro já está em centro.erro
    }
  };

  const abrir = (treinoId) => {
    irParaTreino(treinoId, false);
  };

  const temRotina = Boolean(centro.rotina) && sessoesDaRotina(centro.rotina).length > 0;
  const aguardando = centro.carregando && !temRotina && centro.historico.length === 0;

  return (
    <Pagina className="custom-scroll">
      <DialogoAcao
        aberto={modal.aberto}
        titulo={modal.titulo}
        mensagem={modal.mensagem}
        icone={<FiAlertCircle />}
        tipo="alerta"
        rotuloConfirmar="OK"
        onConfirmar={() => setModal((m) => ({ ...m, aberto: false }))}
        onCancelar={() => setModal((m) => ({ ...m, aberto: false }))}
      />

      <Topo>
        <BotaoRetorno type="button" onClick={() => navigate('/dashboard')}>
          <FiArrowLeft aria-hidden="true" />
          Dashboard
        </BotaoRetorno>
        <Marca>HealGym</Marca>
        <span aria-hidden="true" />
      </Topo>

      <Conteudo>
        {assistente ? (
          <AssistenteRotina
            rotinaAtiva={centro.rotina}
            onFechar={() => setAssistente(false)}
            onSalvo={async (dados) => {
              await centro.aoSalvarRotina(dados);
              setAssistente(false);
            }}
          />
        ) : (
          <>
            <Surge ordem={0}>
              <TituloPagina>Centro de treinamento</TituloPagina>
            </Surge>

            {aguardando && (
              <>
                <Esqueleto $altura="160px" />
                <Esqueleto $altura="120px" />
                <Esqueleto $altura="80px" />
              </>
            )}

            {!aguardando && centro.erro && (
              <Surge ordem={1}>
                <Aviso $tipo="erro">
                  <FiAlertCircle aria-hidden="true" />
                  <div>
                    <p>{centro.erro}</p>
                    <Acoes>
                      <BotaoSecundario type="button" onClick={centro.carregar}>
                        Tentar de novo
                      </BotaoSecundario>
                    </Acoes>
                  </div>
                </Aviso>
              </Surge>
            )}

            {!aguardando && !temRotina && (
              <Surge ordem={1}>
                <CartaoConvite>
                  <TituloCartao>Monte sua rotina</TituloCartao>
                  <Texto>Informe como você treina e veja a programação antes de salvar.</Texto>
                  <Acoes>
                    <BotaoPrimario type="button" onClick={() => setAssistente(true)}>
                      Criar programação
                    </BotaoPrimario>
                  </Acoes>
                </CartaoConvite>
              </Surge>
            )}

            {temRotina && (
              <>
                {centro.reavaliacao && !centro.desatualizada && (
                  <Aviso $tipo="atencao">
                    <FiAlertCircle aria-hidden="true" />
                    <div>
                      <p>{centro.reavaliacao}</p>
                    </div>
                  </Aviso>
                )}

                {centro.desatualizada && (
                  <Aviso $tipo="atencao">
                    <FiAlertCircle aria-hidden="true" />
                    <div>
                      <p>
                        Seu perfil mudou ({centro.mudancasPerfil.join(', ')}). A rotina atual
                        continua válida. Use Alterar programação quando quiser uma nova.
                      </p>
                    </div>
                  </Aviso>
                )}

                <Surge ordem={1}>
                  <ProximoTreino
                    rotina={centro.rotina}
                    estado={centro.estado}
                    onIniciar={iniciar}
                    onAbrir={abrir}
                    iniciando={centro.iniciando}
                  />
                  <AcaoProgramacao>
                    <BotaoSecundario type="button" onClick={() => setAssistente(true)}>
                      Alterar programação
                    </BotaoSecundario>
                  </AcaoProgramacao>
                </Surge>

                <Surge ordem={2}>
                  <MinhaRotina
                    rotina={centro.rotina}
                    estado={centro.estado}
                    onIniciar={iniciar}
                    onAbrir={abrir}
                  />
                </Surge>

                <Surge ordem={3}>
                  <PorQueRotina explicacao={centro.rotina.explicacao} />
                </Surge>
              </>
            )}

            {!aguardando && (
              <Surge ordem={temRotina ? 4 : 2}>
                <div id="historico">
                  <HistoricoSecao
                    historico={centro.historico}
                    proxima={centro.estado?.proxima}
                    recolhido
                    forcarAberto={veioDoHistorico}
                  />
                </div>
              </Surge>
            )}
          </>
        )}
      </Conteudo>
    </Pagina>
  );
};

const AcaoProgramacao = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-top: 18px;

  ${BotaoSecundario} {
    width: fit-content;
    max-width: 100%;
    min-height: 40px;
    padding: 8px 14px;
  }
`;

const CartaoConvite = styled(Cartao)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px;
  gap: 0;

  ${TituloCartao} {
    margin: 0;
  }

  ${Texto} {
    margin: 8px 0 0;
    max-width: 36rem;
  }

  ${Acoes} {
    margin-top: 24px;
    justify-content: center;
    align-items: center;
    width: auto;

    @media (max-width: 480px) {
      flex-direction: column;
      align-items: center;
    }
  }

  ${BotaoPrimario} {
    width: fit-content;
    max-width: 100%;
  }
`;

export default TreinoPage;
