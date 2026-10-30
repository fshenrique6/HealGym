const EMAIL_PATTERN = /\S+@\S+\.\S+/;
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export const validateEmail = (value) => {
  if (!value) return 'E-mail é obrigatório';
  return EMAIL_PATTERN.test(value) ? '' : 'E-mail inválido';
};

export const validateRequiredPassword = (value) => {
  if (!value) return 'Senha é obrigatória';
  return value.length < 6 ? 'Senha deve ter pelo menos 6 caracteres' : '';
};

export const isStrongPassword = (value) => STRONG_PASSWORD_PATTERN.test(value);
