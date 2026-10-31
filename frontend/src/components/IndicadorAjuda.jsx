import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiHeart, FiTarget, FiX } from 'react-icons/fi';
import {
  Bloco,
  Cabecalho,
  cascaDialogo,
  Corpo,
  Fechar,
  Identidade,
  IdentidadeTexto,
  Marca,
  Nota,
  Overlay,
  Rotulo,
  Subtitulo,
  Texto,
  Titulo,
} from './modalPainelEstilos';

const formatar = (valor) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return numero.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
};

const sexoLegivel = (sexo) => {
  if (sexo === 'masculino') return 'Masculino';
  if (sexo === 'feminino') return 'Feminino';
  return null;
};

const FAIXAS_IMC = [
  { faixa: 'Abaixo de 18,5', nome: 'Abaixo do peso', ativa: (valor) => valor < 18.5 },
  { faixa: '18,5 – 24,9', nome: 'Peso normal', ativa: (valor) => valor >= 18.5 && valor < 25 },
  { faixa: '25,0 – 29,9', nome: 'Sobrepeso', ativa: (valor) => valor >= 25 && valor < 30 },
  { faixa: '30,0 – 34,9', nome: 'Obesidade grau I', ativa: (valor) => valor >= 30 && valor < 35 },
  { faixa: '35,0 – 39,9', nome: 'Obesidade grau II', ativa: (valor) => valor >= 35 && valor < 40 },
  { faixa: '40,0 ou mais', nome: 'Obesidade grau III', ativa: (valor) => valor >= 40 },
];

const detalheTmb = ({ peso, altura, idade, sexo }) => {
  const faltando = [!peso && 'peso', !altura && 'altura', !idade && 'idade', !sexo && 'sexo'].filter(Boolean);
  if (faltando.length > 0) return { faltando };

  const termoPeso = 10 * Number(peso);
  const termoAltura = 6.25 * Number(altura);
  const termoIdade = 5 * Number(idade);
  const ajuste = sexo === 'masculino' ? 5 : -161;
  const bruto = termoPeso + termoAltura - termoIdade + ajuste;

  return {
    faltando,
    ajuste,
    bruto,
    arredondado: Math.round(bruto),
    formula:
      sexo === 'masculino'
        ? '10 × peso + 6,25 × altura − 5 × idade + 5'
        : '10 × peso + 6,25 × altura − 5 × idade − 161',
  };
};

const detalheImc = ({ peso, altura, resultado }) => {
  if (!peso || !altura || resultado === null || resultado === undefined || resultado === '') {
    return { faltando: [!peso && 'peso', !altura && 'altura'].filter(Boolean) };
  }

  const metros = Number(altura) / 100;
  const quadrado = metros ** 2;
  const bruto = Number(peso) / quadrado;

  return {
    faltando: [],
    metros,
    quadrado,
    bruto,
    exibido: Number(bruto).toFixed(1),
  };
};

const IndicadorAjuda = ({ tipo, peso, altura, idade, sexo, resultado, classificacao }) => {
  const [aberto, setAberto] = useState(false);
  const tituloId = useId();
  const dialogRef = useRef(null);
  const fecharRef = useRef(null);
  const botaoRef = useRef(null);
  const tmb = tipo === 'tmb';
  const titulo = tmb ? 'Taxa Metabólica Basal' : 'Índice de Massa Corporal';
  const subtitulo = tmb
    ? 'Estimativa de calorias em repouso'
    : 'Relação entre peso e altura';

  useEffect(() => {
    if (!aberto) return undefined;

    fecharRef.current?.focus();

    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        setAberto(false);
        return;
      }
      if (evento.key !== 'Tab' || !dialogRef.current) return;

      const focaveis = Array.from(
        dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((elemento) => !elemento.disabled);
      if (focaveis.length === 0) return;

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      botaoRef.current?.blur();
    };
  }, [aberto]);

  const conta = tmb ? detalheTmb({ peso, altura, idade, sexo }) : detalheImc({ peso, altura, resultado });
  const valorImc = !tmb && resultado !== null && resultado !== undefined && resultado !== '' ? Number(resultado) : null;
  const valorTmb = tmb ? (resultado ?? conta.arredondado ?? null) : null;

  return (
    <>
      <BotaoAjuda
        ref={botaoRef}
        type="button"
        aria-label={`Saiba mais sobre ${titulo}`}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={() => setAberto(true)}
      >
        ?
      </BotaoAjuda>
      {createPortal(
        <AnimatePresence>
          {aberto && (
            <Overlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setAberto(false)}
            >
              <Dialogo
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={tituloId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onClick={(evento) => evento.stopPropagation()}
              >
                <Cabecalho>
                  <Identidade>
                    <Marca aria-hidden="true">{tmb ? <FiHeart /> : <FiTarget />}</Marca>
                    <IdentidadeTexto>
                      <Titulo id={tituloId}>{titulo}</Titulo>
                      <Subtitulo>{subtitulo}</Subtitulo>
                    </IdentidadeTexto>
                  </Identidade>
                  <Fechar ref={fecharRef} type="button" aria-label="Fechar" onClick={() => setAberto(false)}>
                    <FiX />
                  </Fechar>
                </Cabecalho>
                <Corpo>
                  {tmb ? (
                    <ConteudoTmb peso={peso} altura={altura} idade={idade} sexo={sexo} valor={valorTmb} conta={conta} />
                  ) : (
                    <ConteudoImc
                      peso={peso}
                      altura={altura}
                      resultado={resultado}
                      classificacao={classificacao}
                      conta={conta}
                      valorImc={Number.isFinite(valorImc) ? valorImc : null}
                    />
                  )}
                </Corpo>
              </Dialogo>
            </Overlay>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

const ConteudoTmb = ({ peso, altura, idade, sexo, valor, conta }) => (
  <>
    <Resultado>
      <ResultadoNumero>{valor === null || valor === undefined ? '—' : valor}</ResultadoNumero>
      <ResultadoUnidade>kcal/dia</ResultadoUnidade>
    </Resultado>

    <Bloco>
      <Rotulo>O que significa?</Rotulo>
      <Texto>
        É a estimativa de calorias que o corpo usa em repouso para respirar, circular o sangue e manter os órgãos funcionando.
      </Texto>
    </Bloco>

    <Bloco>
      <Rotulo>Como chegamos a esse resultado?</Rotulo>
      {conta.faltando.length > 0 ? (
        <Texto>Falta informar {conta.faltando.join(', ')} para mostrar a sua conta.</Texto>
      ) : (
        <Painel>
          <FormulaNome>Mifflin-St Jeor</FormulaNome>
          <Formula>{conta.formula}</Formula>
          <Dados>
            <Dado>{formatar(peso)} kg</Dado>
            <Dado>{formatar(altura)} cm</Dado>
            <Dado>{formatar(idade)} anos</Dado>
            <Dado>{sexoLegivel(sexo)}</Dado>
          </Dados>
          <Substituicao>
            10 × {formatar(peso)} + 6,25 × {formatar(altura)} − 5 × {formatar(idade)}{' '}
            {conta.ajuste < 0 ? '−' : '+'} {formatar(Math.abs(conta.ajuste))} = {formatar(conta.bruto)}
          </Substituicao>
          {valor !== null && valor !== conta.bruto && <Arredondado>Valor exibido: {valor} kcal/dia</Arredondado>}
        </Painel>
      )}
    </Bloco>

    <Bloco>
      <Rotulo>Como utilizar essa informação?</Rotulo>
      <Texto>
        Serve de base para estimar o gasto do dia e orientar manutenção, emagrecimento ou ganho de peso.
      </Texto>
    </Bloco>

    <Nota>
      Estimativa de repouso. Não inclui treino, deslocamento nem a digestão dos alimentos.
    </Nota>
  </>
);

const ConteudoImc = ({ peso, altura, resultado, classificacao, conta, valorImc }) => (
  <>
    <Resultado>
      <ResultadoNumero>{resultado || '—'}</ResultadoNumero>
      <ResultadoUnidade>kg/m²</ResultadoUnidade>
      {classificacao && <Classificacao>{classificacao}</Classificacao>}
    </Resultado>

    <Bloco>
      <Rotulo>O que significa?</Rotulo>
      <Texto>Relaciona peso e altura para uma leitura inicial do estado nutricional em adultos.</Texto>
    </Bloco>

    <Bloco>
      <Rotulo>Como chegamos a esse resultado?</Rotulo>
      {conta.faltando.length > 0 ? (
        <Texto>Falta informar {conta.faltando.join(', ')} para mostrar a sua conta.</Texto>
      ) : (
        <Painel>
          <Formula>peso ÷ altura²</Formula>
          <Dados>
            <Dado>{formatar(peso)} kg</Dado>
            <Dado>{formatar(altura)} cm</Dado>
            <Dado>{formatar(conta.metros)} m</Dado>
          </Dados>
          <Substituicao>
            {formatar(peso)} ÷ ({formatar(conta.metros)})² = {formatar(peso)} ÷ {formatar(conta.quadrado)} ={' '}
            {formatar(conta.bruto)}
          </Substituicao>
          <Arredondado>Valor exibido: {resultado} kg/m²</Arredondado>
        </Painel>
      )}
    </Bloco>

    {valorImc !== null && (
      <Bloco>
        <Rotulo>Faixas em adultos</Rotulo>
        <Faixas>
          {FAIXAS_IMC.map((faixa) => (
            <Faixa key={faixa.faixa} $ativa={faixa.ativa(valorImc)}>
              <FaixaIntervalo>{faixa.faixa}</FaixaIntervalo>
              <FaixaNome>{faixa.nome}</FaixaNome>
            </Faixa>
          ))}
        </Faixas>
      </Bloco>
    )}

    <Bloco>
      <Rotulo>Como utilizar essa informação?</Rotulo>
      <Texto>Ajuda a acompanhar mudanças de peso. Não separa gordura de músculo.</Texto>
    </Bloco>

    <Nota>Não é um diagnóstico. Em quem tem muita massa muscular, a faixa pode superestimar o risco.</Nota>
  </>
);

const BotaoAjuda = styled.button`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--background);
  font-family: 'Cinzel', serif;
  font-style: normal;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0;
  text-transform: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: var(--accent-light);
    border-color: var(--accent-light);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const Dialogo = styled(motion.div)`
  width: min(100%, 820px);
  ${cascaDialogo}
`;

const Resultado = styled.div`
  padding: 0.15rem 0 0.95rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const ResultadoNumero = styled.div`
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 2rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
`;

const ResultadoUnidade = styled.div`
  margin-top: 0.35rem;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.95rem;
  line-height: 1.2;
`;

const Classificacao = styled.div`
  margin-top: 0.45rem;
  color: var(--accent);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.98rem;
  line-height: 1.2;
`;

const Painel = styled.div`
  padding: 0.8rem 0.85rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const FormulaNome = styled.div`
  color: var(--accent);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.86rem;
  line-height: 1.2;
  margin-bottom: 0.2rem;
`;

const Formula = styled.p`
  margin: 0;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.98rem;
  line-height: 1.35;
`;

const Dados = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.7rem;
`;

const Dado = styled.span`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.88rem;
  line-height: 1.2;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
`;

const Substituicao = styled.p`
  margin: 0.7rem 0 0;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.95rem;
  line-height: 1.4;
`;

const Arredondado = styled.p`
  margin: 0.35rem 0 0;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.88rem;
  line-height: 1.3;
`;

const Faixas = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

const Faixa = styled.li`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.32rem 0.55rem;
  border-radius: 8px;
  background: ${(props) => (props.$ativa ? 'rgba(198, 169, 100, 0.1)' : 'transparent')};
  box-shadow: ${(props) => (props.$ativa ? 'inset 2px 0 0 var(--accent)' : 'none')};

  ${(props) =>
    props.$ativa &&
    `
    ${FaixaIntervalo} {
      color: var(--white);
    }

    ${FaixaNome} {
      color: var(--accent);
    }
  `}
`;

const FaixaIntervalo = styled.span`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.9rem;
  line-height: 1.3;
`;

const FaixaNome = styled.span`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-style: normal;
  font-size: 0.9rem;
  line-height: 1.3;
  text-align: right;
`;

export default IndicadorAjuda;
