import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DIAS,
  DURACOES,
  EXPERIENCIAS,
  FREQUENCIAS,
  OBJETIVOS,
} from '../utils/perfilTreino';

const CamposPerfilTreino = ({ parte, valores, erros, mostrarErros, onChange }) => {
  const erro = (nome) => (mostrarErros?.[nome] && erros?.[nome] ? erros[nome] : '');

  return (
    <Grupo>
      {(parte === 'objetivo' || parte === 'tudo') && (
        <>
          <Campo
            nome="trainingGoal"
            legenda="Objetivo principal"
            dica="Objetivo do treino de musculação. Não muda peso, IMC nem biotipo."
            valor={valores.trainingGoal}
            opcoes={OBJETIVOS}
            placeholder="Selecione o objetivo"
            erro={erro('trainingGoal')}
            onChange={onChange}
          />
          <Campo
            nome="trainingExperience"
            legenda="Experiência em musculação"
            dica="O tempo de prática não define sozinho o seu nível."
            valor={valores.trainingExperience}
            opcoes={EXPERIENCIAS}
            placeholder="Selecione a experiência"
            erro={erro('trainingExperience')}
            onChange={onChange}
          />
        </>
      )}

      {(parte === 'rotina' || parte === 'tudo') && (
        <>
          <Campo
            nome="recentFrequency"
            legenda="Com que frequência você tem treinado nos últimos 3 meses?"
            valor={valores.recentFrequency}
            opcoes={FREQUENCIAS}
            placeholder="Selecione a frequência"
            erro={erro('recentFrequency')}
            onChange={onChange}
          />

          <Bloco>
            <Legenda>Dias disponíveis</Legenda>
            <Dica>Quantos dias por semana você pode treinar daqui para frente.</Dica>
            <Opcoes role="radiogroup" aria-label="Dias disponíveis por semana">
              {DIAS.map((dia) => (
                <Opcao
                  key={dia}
                  type="button"
                  aria-pressed={Number(valores.availableDays) === dia}
                  $ativa={Number(valores.availableDays) === dia}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onChange('availableDays', String(dia))}
                >
                  {dia}
                </Opcao>
              ))}
            </Opcoes>
            <Mensagem texto={erro('availableDays')} />
          </Bloco>

          <Bloco>
            <Legenda>Duração preferida da sessão</Legenda>
            <Dica>Preferência inicial. Você ainda pode mudar o tempo na tela de treino.</Dica>
            <Opcoes role="radiogroup" aria-label="Duração preferida da sessão">
              {DURACOES.map((minutos) => (
                <Opcao
                  key={minutos}
                  type="button"
                  aria-pressed={Number(valores.preferredSessionMinutes) === minutos}
                  $ativa={Number(valores.preferredSessionMinutes) === minutos}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onChange('preferredSessionMinutes', String(minutos))}
                >
                  {minutos} min
                </Opcao>
              ))}
            </Opcoes>
            <Mensagem texto={erro('preferredSessionMinutes')} />
          </Bloco>
        </>
      )}
    </Grupo>
  );
};

const Campo = ({ nome, legenda, dica, valor, opcoes, placeholder, erro, onChange }) => (
  <Bloco>
    <Legenda>{legenda}</Legenda>
    {dica && <Dica>{dica}</Dica>}
    <Select value={valor} onChange={(event) => onChange(nome, event.target.value)} $erro={Boolean(erro)}>
      <option value="">{placeholder}</option>
      {opcoes.map((opcao) => (
        <option key={opcao.value} value={opcao.value}>
          {opcao.label}
        </option>
      ))}
    </Select>
    <Mensagem texto={erro} />
  </Bloco>
);

const Mensagem = ({ texto }) => (
  <AnimatePresence>
    {texto && (
      <Erro
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {texto}
      </Erro>
    )}
  </AnimatePresence>
);

const Grupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Bloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
`;

const Legenda = styled.span`
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 1.02rem;
  line-height: 1.25;
  letter-spacing: 0;
  text-transform: none;
`;

const Dica = styled.span`
  color: rgba(255, 255, 255, 0.55);
  font-family: 'Cormorant', serif;
  font-size: 0.86rem;
  font-style: italic;
  line-height: 1.3;
  letter-spacing: 0;
  text-transform: none;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 36px 12px 12px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid
    ${(props) => (props.$erro ? 'var(--error, #ff6b6b)' : 'rgba(198, 169, 100, 0.28)')};
  border-radius: 4px;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, #c6a964 50%),
    linear-gradient(135deg, #c6a964 50%, transparent 50%);
  background-position:
    calc(100% - 16px) 18px,
    calc(100% - 11px) 18px;
  background-size:
    5px 5px,
    5px 5px;
  background-repeat: no-repeat;

  &:focus {
    outline: none;
    border-color: ${(props) => (props.$erro ? 'var(--error, #ff6b6b)' : 'var(--accent)')};
  }

  option {
    background: var(--secondary);
    color: var(--white);
  }
`;

const Opcoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
`;

const Opcao = styled(motion.button)`
  min-width: 46px;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid
    ${(props) => (props.$ativa ? 'var(--accent)' : 'rgba(198, 169, 100, 0.28)')};
  background: ${(props) => (props.$ativa ? 'rgba(198, 169, 100, 0.18)' : 'rgba(0, 0, 0, 0.25)')};
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 0.98rem;
  letter-spacing: 0;
  text-transform: none;
  transition: border-color 0.2s ease, background 0.2s ease;
`;

const Erro = styled(motion.span)`
  color: var(--error, #ff6b6b);
  font-size: 0.78rem;
  line-height: 1.3;
  font-family: 'Cormorant', serif;
  font-style: italic;
`;

export default CamposPerfilTreino;
