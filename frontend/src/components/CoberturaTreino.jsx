import { useState } from 'react';
import { FiLayers } from 'react-icons/fi';
import api from '../services/api';
import { ResumoSection, ResumoTitulo } from './treinoEstilos';
import {
  CoberturaGrade,
  CoberturaCartao,
  CoberturaFoco,
  CoberturaItem,
  StatusChip,
  CoberturaNota,
  BotaoDiscreto,
  CicloTabela,
} from './treinoFichaEstilos';

const ROTULO_STATUS = {
  direta: 'Trabalhado diretamente',
  indireta: 'Estímulo indireto',
  nao_priorizada: 'Não priorizado nesta sessão',
};

const formatarSeries = (valor) => String(valor ?? 0).replace('.', ',');

const CoberturaTreino = ({ treino }) => {
  const [ciclo, setCiclo] = useState(null);
  const [carregandoCiclo, setCarregandoCiclo] = useState(false);
  const [erroCiclo, setErroCiclo] = useState('');
  const cobertura = treino.cobertura;
  const temCiclo = treino.tipoDivisao === 'ABC' || treino.tipoDivisao === 'ABCD';

  const alternarCiclo = async () => {
    if (ciclo) {
      setCiclo(null);
      return;
    }
    setCarregandoCiclo(true);
    setErroCiclo('');
    try {
      const resposta = await api.getWorkoutCycle(treino._id);
      if (resposta?.success && resposta.data) {
        setCiclo(resposta.data);
      }
    } catch {
      setErroCiclo('Não foi possível montar a visão do ciclo agora.');
    } finally {
      setCarregandoCiclo(false);
    }
  };

  const secoes = Array.isArray(cobertura?.secoes) ? cobertura.secoes : [];
  const outros = Array.isArray(cobertura?.outrosMusculos) ? cobertura.outrosMusculos : [];
  const padroes = Array.isArray(cobertura?.padroes) ? cobertura.padroes : [];
  const musculosCiclo = Array.isArray(ciclo?.musculos)
    ? ciclo.musculos.filter((m) => Number(m.total) > 0)
    : [];

  return (
    <ResumoSection>
      <ResumoTitulo>Cobertura do Treino</ResumoTitulo>
      <CoberturaNota>
        {cobertura.totalExercicios} exercícios · {cobertura.totalSeries} séries de trabalho ·
        estimativa de {treino.duracaoEstimadaMinutos} min
      </CoberturaNota>

      <CoberturaGrade>
        {secoes.map((secao) => (
          <CoberturaCartao key={secao.foco}>
            <CoberturaFoco>
              {secao.foco}
              <span>{formatarSeries(secao.seriesDiretas)} séries diretas</span>
            </CoberturaFoco>
            {(secao.musculos || []).map((musculo) => (
              <CoberturaItem key={musculo.codigo}>
                <span>
                  {musculo.rotulo}
                  {Number(musculo.seriesIndiretas) > 0
                    ? ` · ≈ ${formatarSeries(musculo.seriesIndiretas)} indiretas`
                    : ''}
                </span>
                <StatusChip status={musculo.status}>{ROTULO_STATUS[musculo.status]}</StatusChip>
              </CoberturaItem>
            ))}
            {(secao.regioes || []).map((regiao) => (
              <CoberturaItem key={regiao.codigo} title={(regiao.exercicios || []).join(', ')}>
                <span>{regiao.rotulo}</span>
                <StatusChip status={regiao.status}>{ROTULO_STATUS[regiao.status]}</StatusChip>
              </CoberturaItem>
            ))}
          </CoberturaCartao>
        ))}
      </CoberturaGrade>

      {outros.length > 0 && (
        <CoberturaNota>
          <strong>Estímulos secundários: </strong>
          {outros
            .map((m) =>
              Number(m.seriesDiretas) > 0
                ? `${m.rotulo} (${formatarSeries(m.seriesDiretas)} diretas)`
                : `${m.rotulo} (≈ ${formatarSeries(m.seriesIndiretas)} indiretas)`,
            )
            .join(' · ')}
        </CoberturaNota>
      )}

      {padroes.length > 0 && (
        <CoberturaNota>
          <strong>Padrões de movimento: </strong>
          {padroes.map((p) => p.rotulo).join(' · ')}
        </CoberturaNota>
      )}

      <CoberturaNota>{cobertura.criterio}</CoberturaNota>

      {temCiclo && (
        <div style={{ marginTop: '1rem' }}>
          <BotaoDiscreto type="button" onClick={alternarCiclo} disabled={carregandoCiclo}>
            <FiLayers />
            {ciclo ? 'Ocultar visão do ciclo' : carregandoCiclo ? 'Montando…' : `Ver ciclo ${treino.tipoDivisao}`}
          </BotaoDiscreto>
          {erroCiclo && <CoberturaNota>{erroCiclo}</CoberturaNota>}
          {ciclo && (
            <CicloTabela>
              <table>
                <thead>
                  <tr>
                    <th>Músculo</th>
                    {ciclo.sessoes.map((sessao) => (
                      <th key={sessao.letra} className={sessao.atual ? 'atual' : ''} title={sessao.titulo}>
                        {sessao.letra}
                      </th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {musculosCiclo.map((musculo) => (
                    <tr key={musculo.codigo}>
                      <td>{musculo.rotulo}</td>
                      {ciclo.sessoes.map((sessao) => (
                        <td key={sessao.letra} className={sessao.atual ? 'atual' : ''}>
                          {Number(sessao.seriesDiretas?.[musculo.codigo]) > 0
                            ? formatarSeries(sessao.seriesDiretas[musculo.codigo])
                            : '–'}
                        </td>
                      ))}
                      <td>{formatarSeries(musculo.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <CoberturaNota>{ciclo.observacao}</CoberturaNota>
            </CicloTabela>
          )}
        </div>
      )}
    </ResumoSection>
  );
};

export default CoberturaTreino;
