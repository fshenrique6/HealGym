import { useId, useState } from 'react';
import AjudaPopover from './AjudaPopover';

const TEXTOS = {
  tmb: {
    titulo: 'Taxa Metabólica Basal',
    unidade: 'kcal/dia',
    texto: 'Estimativa de calorias que seu corpo utiliza em repouso para manter funções vitais.',
    complemento: 'Não inclui atividades do dia.',
  },
  imc: {
    titulo: 'Índice de Massa Corporal',
    texto: 'Relaciona peso e altura como uma referência inicial.',
    complemento: 'Não avalia sozinho saúde nem composição corporal.',
  },
};

const formatarNumero = (valor, casas) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
};

const IndicadorAjuda = ({ tipo, resultado }) => {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const conteudo = TEXTOS[tipo] || TEXTOS.imc;
  const tmb = tipo === 'tmb';
  const numero = tmb ? formatarNumero(resultado, 0) : formatarNumero(resultado, 1);
  const valor = numero == null ? null : tmb ? `${numero} kcal/dia` : numero;

  return (
    <AjudaPopover
      id={id}
      aberto={aberto}
      onToggle={() => setAberto((atual) => !atual)}
      onFechar={() => setAberto(false)}
      rotulo={`Saiba mais sobre ${conteudo.titulo}`}
      titulo={conteudo.titulo}
      valor={valor}
      texto={conteudo.texto}
      complemento={conteudo.complemento}
    />
  );
};

export default IndicadorAjuda;
