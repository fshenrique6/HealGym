import styled from 'styled-components';
import { useState } from 'react';
import {
  DIAS,
  DURACOES,
  EXPERIENCIAS,
  FREQUENCIAS,
  OBJETIVOS,
  rotulo,
  validarCampoTreino,
} from '../../../utils/perfilTreino';
import { Seletor } from '../controles';
import { Acoes, Aviso, BotaoPrimario, Texto, TituloCartao } from '../ui';

const CAMPOS = [
  { campo: 'trainingGoal', rotulo: 'Objetivo', opcoes: OBJETIVOS },
  { campo: 'trainingExperience', rotulo: 'Experiência', opcoes: EXPERIENCIAS },
  { campo: 'recentFrequency', rotulo: 'Frequência recente', opcoes: FREQUENCIAS },
  {
    campo: 'availableDays',
    rotulo: 'Disponibilidade',
    opcoes: DIAS.map((d) => ({ value: String(d), label: `${d} dias` })),
  },
  {
    campo: 'preferredSessionMinutes',
    rotulo: 'Duração',
    opcoes: DURACOES.map((m) => ({ value: String(m), label: `${m} minutos` })),
  },
];

const exibir = (campo, perfil) => {
  const valor = perfil[campo.campo];
  if (campo.campo === 'availableDays' && valor) return `${valor} dias`;
  if (campo.campo === 'preferredSessionMinutes' && valor) return `${valor} minutos`;
  return rotulo(campo.opcoes, valor);
};

const EtapaPerfil = ({ perfil, onAlterar, onContinuar }) => {
  const [campoAberto, setCampoAberto] = useState(null);
  const faltando = CAMPOS.filter((item) => validarCampoTreino(item.campo, perfil[item.campo]));
  const completo = faltando.length === 0;

  return (
    <Bloco>
      <TituloCartao>Meu perfil</TituloCartao>
      <Texto>Usaremos estas informações para montar sua rotina.</Texto>

      <Lista>
        {CAMPOS.map((item) => {
          const invalido = Boolean(validarCampoTreino(item.campo, perfil[item.campo]));
          return (
            <Seletor
              key={item.campo}
              rotulo={item.rotulo}
              valor={perfil[item.campo] || ''}
              texto={invalido ? 'Não informado' : exibir(item, perfil)}
              vazio={invalido}
              opcoes={item.opcoes}
              aberto={campoAberto === item.campo}
              onAbrir={() => setCampoAberto(item.campo)}
              onFechar={() => setCampoAberto((atual) => (atual === item.campo ? null : atual))}
              onChange={(valor) => {
                onAlterar(item.campo, valor);
                setCampoAberto(null);
              }}
            />
          );
        })}
      </Lista>

      {!completo && (
        <Aviso $tipo="atencao">
          <p>Falta informar: {faltando.map((item) => item.rotulo.toLowerCase()).join(', ')}.</p>
        </Aviso>
      )}

      <Acoes>
        <BotaoPrimario type="button" disabled={!completo} onClick={onContinuar}>
          Continuar
        </BotaoPrimario>
      </Acoes>
    </Bloco>
  );
};

const Bloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
`;

export default EtapaPerfil;
