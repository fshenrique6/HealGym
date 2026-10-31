export const CAMPOS = [
  {
    id: 'cintura',
    nome: 'Cintura',
    grupo: 'principais',
    min: 40,
    max: 200,
    passos: [
      'Fique em pé, com os pés juntos e os braços ao lado do corpo.',
      'Use uma fita métrica flexível, na horizontal, sem comprimir a pele.',
      'Coloque a fita no meio do caminho entre a última costela palpável e o topo do osso do quadril.',
      'Meça no fim de uma expiração normal. Repita sempre esse mesmo ponto.',
    ],
    fonte: 'Organização Mundial da Saúde. Medição da circunferência da cintura.',
  },
  {
    id: 'quadril',
    nome: 'Quadril',
    grupo: 'principais',
    min: 50,
    max: 200,
    passos: [
      'Fique em pé, com os pés juntos e o peso distribuído.',
      'Passe a fita na maior circunferência dos glúteos, paralela ao chão.',
      'A fita deve encostar sem comprimir a pele.',
      'Use roupa leve e o mesmo procedimento em todas as medições.',
    ],
    fonte: 'Organização Mundial da Saúde. Medição da circunferência do quadril.',
  },
  {
    id: 'peito',
    nome: 'Peito',
    grupo: 'adicionais',
    min: 50,
    max: 200,
    passos: [
      'Fique em pé, com os braços relaxados ao lado do corpo.',
      'Passe a fita na horizontal, na altura do mamilo.',
      'Meça no fim de uma expiração normal, sem comprimir a pele.',
    ],
    fonte: 'Circunferência do tórax no nível mesoesternal.',
  },
  {
    id: 'braco',
    nome: 'Braço',
    grupo: 'adicionais',
    min: 15,
    max: 70,
    passos: [
      'Deixe o braço solto e o músculo relaxado.',
      'Marque o meio entre a ponta do ombro e a ponta do cotovelo.',
      'Passe a fita perpendicular ao braço, sem comprimir a pele.',
    ],
    fonte: 'Circunferência do braço relaxado, no ponto médio.',
  },
  {
    id: 'coxa',
    nome: 'Coxa',
    grupo: 'adicionais',
    min: 25,
    max: 120,
    passos: [
      'Fique em pé, com o peso distribuído.',
      'Meça o meio entre a prega da virilha e a borda superior da patela.',
      'Mantenha a fita horizontal, sem comprimir a pele.',
    ],
    fonte: 'Circunferência da coxa no ponto médio.',
  },
  {
    id: 'abdomen',
    nome: 'Abdômen',
    grupo: 'adicionais',
    min: 40,
    max: 200,
    passos: [
      'Esta medida não substitui a cintura.',
      'Fique em pé e passe a fita na horizontal, na altura do umbigo.',
      'Meça no fim de uma expiração normal, sem comprimir a pele.',
    ],
    fonte: 'Circunferência abdominal umbilical, diferente do ponto da cintura usado pela OMS.',
  },
  {
    id: 'panturrilha',
    nome: 'Panturrilha',
    grupo: 'adicionais',
    min: 15,
    max: 70,
    passos: [
      'Fique em pé, com o peso distribuído.',
      'Passe a fita na maior circunferência da panturrilha.',
      'Mantenha a fita horizontal, sem comprimir a pele.',
    ],
    fonte: 'Maior circunferência da panturrilha.',
  },
];

const DECIMAL = /^\d+([.,]\d)?$/;

export const hojeLocal = (data = new Date()) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

export const formularioVazio = (data = hojeLocal()) => {
  const form = { data };
  CAMPOS.forEach((campo) => {
    form[campo.id] = '';
  });
  return form;
};

export const formatarCm = (valor) =>
  Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export const formatarRazao = (valor) =>
  Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const partesDaData = (iso) => {
  const [ano, mes, dia] = String(iso || '').split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia);
};

export const formatarData = (iso) => {
  const data = partesDaData(iso);
  if (!data) return '';
  return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const formatarDataCurta = (iso) => {
  const data = partesDaData(iso);
  if (!data) return '';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const formatarHora = (iso) => {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export const validarMedicao = (form) => {
  const erros = {};
  const payload = {};
  const data = String(form.data || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    erros.data = 'Informe a data da medição.';
  } else if (data < '1900-01-01') {
    erros.data = 'A data da medição é antiga demais.';
  } else if (data > hojeLocal()) {
    erros.data = 'A data da medição não pode ser futura.';
  } else {
    payload.data = data;
  }

  let preenchidas = 0;
  CAMPOS.forEach((campo) => {
    const texto = String(form[campo.id] ?? '').trim();
    if (!texto) return;
    const normal = texto.replace(',', '.');
    const valor = Number(normal);
    if (!DECIMAL.test(texto) || !(valor > 0)) {
      erros[campo.id] = 'Informe um número positivo com no máximo uma casa decimal.';
      return;
    }
    if (valor < campo.min || valor > campo.max) {
      erros[campo.id] = `Use um valor entre ${formatarCm(campo.min)} e ${formatarCm(campo.max)} cm.`;
      return;
    }
    payload[campo.id] = valor;
    preenchidas += 1;
  });

  if (preenchidas === 0 && !CAMPOS.some((campo) => erros[campo.id])) {
    erros.geral = 'Informe ao menos uma medida.';
  }

  return { erros, payload };
};

export const ordenarMedicoes = (lista) =>
  [...lista].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    const criadaA = a.createdAt || '';
    const criadaB = b.createdAt || '';
    if (criadaA !== criadaB) return criadaA < criadaB ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  });

export const relacaoCinturaAltura = (cintura, alturaCm) => {
  const cinturaNumero = Number(cintura);
  const alturaNumero = Number(alturaCm);
  if (!(cinturaNumero > 0) || !(alturaNumero > 0)) return null;
  return cinturaNumero / alturaNumero;
};

export const faixaCinturaAltura = (valor) => {
  if (valor == null || !Number.isFinite(valor)) return null;
  if (valor < 0.4) {
    return {
      nome: 'Abaixo de 0,40',
      texto:
        'Fica abaixo da faixa que a diretriz NICE descreve como saudável para adultos. Isso não é um diagnóstico.',
    };
  }
  if (valor < 0.5) {
    return {
      nome: '0,40 a 0,49',
      texto:
        'Faixa que a diretriz NICE descreve como saudável para adultos, com a cintura menor que a metade da altura.',
    };
  }
  if (valor < 0.6) {
    return {
      nome: '0,50 a 0,59',
      texto: 'A diretriz NICE descreve essa faixa, em adultos, como adiposidade central aumentada.',
    };
  }
  return {
    nome: '0,60 ou mais',
    texto: 'A diretriz NICE descreve essa faixa, em adultos, como adiposidade central alta.',
  };
};

const RESUMO_CINTURA_ALTURA = {
  'Abaixo de 0,40': {
    titulo: 'Cintura baixa em relação à altura',
    frase: 'Sua cintura está abaixo da faixa descrita como habitual para adultos.',
  },
  '0,40 a 0,49': {
    titulo: 'Proporção equilibrada',
    frase: 'Sua cintura está menor que a metade da sua altura.',
  },
  '0,50 a 0,59': {
    titulo: 'Cintura elevada em relação à altura',
    frase: 'Essa proporção pode indicar maior acúmulo de gordura na região abdominal.',
  },
  '0,60 ou mais': {
    titulo: 'Cintura alta em relação à altura',
    frase: 'Essa proporção pode indicar maior acúmulo de gordura na região abdominal.',
  },
};

export const resumoCinturaAltura = (valor) => {
  const faixa = faixaCinturaAltura(valor);
  if (!faixa) return null;
  return (
    RESUMO_CINTURA_ALTURA[faixa.nome] || {
      titulo: null,
      frase: 'O valor compara a cintura com a altura.',
    }
  );
};

export const relacaoCinturaQuadril = (cintura, quadril) => {
  const cinturaNumero = Number(cintura);
  const quadrilNumero = Number(quadril);
  if (!(cinturaNumero > 0) || !(quadrilNumero > 0)) return null;
  return cinturaNumero / quadrilNumero;
};

export const leituraCinturaQuadril = (valor, sexo) => {
  if (valor == null || !Number.isFinite(valor)) return null;
  if (sexo !== 'masculino' && sexo !== 'feminino') {
    return 'A OMS usa, em adultos, 0,90 para homens e 0,85 para mulheres como ponto de corte de risco metabólico substancialmente aumentado. Sem o sexo no perfil, nenhum dos pontos é aplicado.';
  }
  const corte = sexo === 'masculino' ? 0.9 : 0.85;
  const quem = sexo === 'masculino' ? 'homens' : 'mulheres';
  const corteTexto = formatarRazao(corte);
  if (valor >= corte) {
    return `Está no ponto de corte da OMS ou acima dele para ${quem} adultos (${corteTexto}). O ponto marca risco substancialmente aumentado e não é um diagnóstico.`;
  }
  return `Está abaixo do ponto de corte da OMS para ${quem} adultos (${corteTexto}). O valor isolado não afasta risco nem confirma saúde.`;
};

export const resumoCinturaQuadril = (valor, sexo) => {
  if (valor == null || !Number.isFinite(valor)) return null;
  if (sexo !== 'masculino' && sexo !== 'feminino') {
    return {
      titulo: null,
      frase: 'A leitura dessa proporção depende do sexo informado no perfil.',
    };
  }
  const corte = sexo === 'masculino' ? 0.9 : 0.85;
  if (valor >= corte) {
    return {
      titulo: 'Proporção elevada',
      frase: 'Sua cintura está relativamente maior que seu quadril, o que pode indicar maior risco à saúde.',
    };
  }
  return {
    titulo: 'Abaixo do ponto de referência',
    frase: 'Sua cintura está menor que o ponto de referência do seu perfil. Isso não confirma saúde nem afasta risco.',
  };
};

export const compararMedicoes = (atual, anterior) => {
  if (!atual) return [];
  return CAMPOS.map((campo) => {
    const agora = atual[campo.id];
    if (agora == null || agora === '') return null;
    if (!anterior) {
      return { id: campo.id, nome: campo.nome, atual: agora, semAnterior: true };
    }
    const antes = anterior[campo.id];
    if (antes == null || antes === '') {
      return { id: campo.id, nome: campo.nome, atual: agora, semPar: true };
    }
    const delta = Math.round((Number(agora) - Number(antes)) * 10) / 10;
    const direcao = delta > 0 ? 'aumento' : delta < 0 ? 'reducao' : 'estavel';
    return { id: campo.id, nome: campo.nome, atual: agora, delta, direcao };
  }).filter(Boolean);
};

export const pontosDaMedida = (registros, id) =>
  registros
    .filter((item) => item[id] != null && item[id] !== '')
    .map((item) => ({
      id: item.id,
      data: item.data,
      valor: Number(item[id]),
      createdAt: item.createdAt,
    }));
