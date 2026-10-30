export const validatePhysicalProfileField = (name, value) => {
  switch (name) {
    case 'gender':
      return value ? '' : 'Gênero é obrigatório';
    case 'height':
      if (!value) return 'Altura é obrigatória';
      return Number.isNaN(Number(value)) || value < 100 || value > 250
        ? 'Altura deve estar entre 100 e 250 cm'
        : '';
    case 'weight':
      if (!value) return 'Peso é obrigatório';
      return Number.isNaN(Number(value)) || value < 30 || value > 300
        ? 'Peso deve estar entre 30 e 300 kg'
        : '';
    case 'bodyType':
      return value ? '' : 'Biotipo é obrigatório';
    case 'age':
      if (!value) return 'Idade é obrigatória';
      return Number.isNaN(Number(value)) || value < 13 || value > 120
        ? 'Idade deve estar entre 13 e 120 anos'
        : '';
    default:
      return '';
  }
};
