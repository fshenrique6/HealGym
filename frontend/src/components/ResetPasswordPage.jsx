import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { isStrongPassword } from '../utils/authValidation';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    setTokenValid(true);
  }, [token]);
  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'password':
        if (!value) error = 'Nova senha é obrigatória';
        else if (value.length < 6) error = 'Senha deve ter pelo menos 6 caracteres';
        else if (!isStrongPassword(value))
          error = 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número';
        break;
      case 'confirmPassword':
        if (!value) error = 'Confirmação de senha é obrigatória';
        else if (value !== formData.password) error = 'Senhas não conferem';
        break;
      default:
        break;
    }
    return error;
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const newError = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: newError }));
    }
    if (name === 'password' && touched.confirmPassword) {
      const confirmError = formData.confirmPassword !== value ? 'Senhas não conferem' : '';
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  };
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const newError = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: newError }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    setTouched({ password: true, confirmPassword: true });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsSubmitting(true);
    setErrors({});

    try {
      await api.resetPassword(token, {
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      setIsSuccess(true);
    } catch (error) {
      const errorMessage = error.message || 'Erro ao redefinir senha. Tente novamente.';
      setErrors({ general: errorMessage });
      if (error.message && error.message.includes('Token')) {
        setTokenValid(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const invalidLink = tokenValid === false || !token;
  return (
    <Container>
      <motion.div
        key={invalidLink ? 'invalid-title' : 'title'}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <LogoTitle onClick={() => navigate('/')}>HealGym</LogoTitle>
      </motion.div>
      <FormSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {tokenValid === false || !token ? (
          <ErrorContainer
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <ErrorIcon>⚠️</ErrorIcon>
            <ErrorTitle>Link Inválido</ErrorTitle>
            <SuccessMessage>O link de recuperação de senha é inválido ou expirou.</SuccessMessage>
            <ErrorSubtext>
              Solicite um novo link de recuperação ou entre em contato com o suporte.
            </ErrorSubtext>
            <ActionButtons>
              <ActionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/forgot-password')}
              >
                Solicitar Novo Link
              </ActionButton>
              <ActionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                variant="secondary"
              >
                Voltar ao Login
              </ActionButton>
            </ActionButtons>
          </ErrorContainer>
        ) : !isSuccess ? (
            <>
              <FormTitle>Redefinir Senha</FormTitle>
              <FormSubtitle>Digite sua nova senha abaixo</FormSubtitle>
              {errors.general && (
                <ErrorMessage
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {errors.general}
                </ErrorMessage>
              )}
              <FormContainer onSubmit={handleSubmit} noValidate>
                <InputGroup>
                  <Input
                    type="password"
                    name="password"
                    placeholder="Nova senha"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && errors.password}
                  />
                  <AnimatePresence>
                    {touched.password && errors.password && (
                      <ErrorText
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {errors.password}
                      </ErrorText>
                    )}
                  </AnimatePresence>
                </InputGroup>
                <InputGroup>
                  <Input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirmar nova senha"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.confirmPassword && errors.confirmPassword}
                  />
                  <AnimatePresence>
                    {touched.confirmPassword && errors.confirmPassword && (
                      <ErrorText
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {errors.confirmPassword}
                      </ErrorText>
                    )}
                  </AnimatePresence>
                </InputGroup>
                <SubmitButton
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Redefinindo...' : 'Redefinir Senha'}
                </SubmitButton>
              </FormContainer>
              <BackText>
                Lembrou da senha?{' '}
                <BackLink onClick={() => navigate('/login')}>Voltar ao login</BackLink>
              </BackText>
            </>
          ) : (
            <SuccessContainer
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <SuccessTitle>Senha Redefinida!</SuccessTitle>
              <SuccessMessage>Sua senha foi redefinida com sucesso.</SuccessMessage>
              <SuccessSubtext>Agora você pode fazer login com sua nova senha.</SuccessSubtext>
              <ActionButtons>
                <ActionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/login')}
                >
                  Fazer Login
                </ActionButton>
              </ActionButtons>
            </SuccessContainer>
          )}
      </FormSection>
    </Container>
  );
};
const Container = styled.div`
  width: 100%;
  height: 100vh;
  height: 100dvh;
  margin: 0;
  padding: 50px 50px;
  overflow-x: hidden;
  overflow-y: auto;
  background: linear-gradient(
    135deg,
    var(--gradient-start) 0%,
    var(--gradient-mid) 50%,
    var(--gradient-end) 100%
  );
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  gap: 55px;
  box-sizing: border-box;
`;
const LogoTitle = styled.h1`
  font-size: 2.5rem;
  line-height: 1.1;
  text-decoration: underline;
  text-decoration-thickness: 0.1px;
  text-underline-offset: 5px;
  text-decoration-color: rgba(141, 140, 140, 0.2);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.28em;
  padding-left: 0.28em;
  cursor: pointer;
  transition: transform 0.3s ease;
  flex-shrink: 0;
  &:hover {
    transform: scale(1.05);
  }
`;
const FormSection = styled(motion.section)`
  width: min(100%, 540px);
  padding: 30px 18px 15px;
  margin-top: 1px;
  background: var(--card-bg);
  border-radius: 5px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(198, 169, 100, 0.1);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
`;
const FormTitle = styled.h1`
  font-size: 2rem;
  line-height: 1.15;
  color: var(--white);
  margin-bottom: 8px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
  letter-spacing: 0.14em;
  padding-left: 0.14em;
  cursor: default;
`;
const FormSubtitle = styled.p`
  font-size: 1rem;
  line-height: 1.3;
  color: var(--text-secondary);
  margin-bottom: 20px;
  text-align: center;
  font-family: 'Cormorant', serif;
  letter-spacing: 0.04em;
  cursor: default;
`;
const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;
const InputGroup = styled.div`
  width: 100%;
`;
const Input = styled.input`
  width: 100%;
  padding: 15px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid
    ${(props) => (props.error ? 'var(--error, #ff6b6b)' : 'rgba(198, 169, 100, 0.2)')};
  border-radius: 2px;
  color: var(--white);
  font-size: 0.95rem;
  line-height: 1.25;
  transition: all 0.3s ease;
  font-family: 'Cormorant', serif;
  letter-spacing: 0.5px;
  animation: ${(props) => (props.error ? 'shake 0.5s ease-in-out' : 'none')};
  &:focus {
    outline: none;
    border-color: ${(props) => (props.error ? 'var(--error, #ff6b6b)' : 'var(--accent)')};
    box-shadow: 0 0 10px
      ${(props) => (props.error ? 'rgba(255, 107, 107, 0.2)' : 'rgba(198, 169, 100, 0.2)')};
  }
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-text-fill-color: var(--white) !important;
    caret-color: var(--white);
    -webkit-box-shadow:
      0 0 0 1000px rgba(255, 255, 255, 0.05) inset,
      0 0 0 1000px color-mix(in srgb, var(--white) 3%, var(--background)) inset !important;
    box-shadow:
      0 0 0 1000px rgba(255, 255, 255, 0.05) inset,
      0 0 0 1000px color-mix(in srgb, var(--white) 3%, var(--background)) inset !important;
    transition:
      all 0.3s ease,
      background-color 99999s ease-out 0s,
      color 99999s ease-out 0s,
      box-shadow 0s;
  }
  &:-webkit-autofill:focus {
    -webkit-box-shadow:
      0 0 0 1000px rgba(255, 255, 255, 0.05) inset,
      0 0 0 1000px color-mix(in srgb, var(--white) 3%, var(--background)) inset,
      0 0 10px
        ${(props) => (props.error ? 'rgba(255, 107, 107, 0.2)' : 'rgba(198, 169, 100, 0.2)')} !important;
    box-shadow:
      0 0 0 1000px rgba(255, 255, 255, 0.05) inset,
      0 0 0 1000px color-mix(in srgb, var(--white) 3%, var(--background)) inset,
      0 0 10px
        ${(props) => (props.error ? 'rgba(255, 107, 107, 0.2)' : 'rgba(198, 169, 100, 0.2)')} !important;
    transition:
      all 0.3s ease,
      background-color 99999s ease-out 0s,
      color 99999s ease-out 0s;
  }
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
  }
  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    10%,
    30%,
    50%,
    70%,
    90% {
      transform: translateX(-3px);
    }
    20%,
    40%,
    60%,
    80% {
      transform: translateX(3px);
    }
  }
`;
const ErrorText = styled(motion.span)`
  color: var(--error, #ff6b6b);
  font-size: 0.78rem;
  line-height: 1.3;
  font-family: 'Cormorant', serif;
  font-style: italic;
  margin-top: 3px;
  display: block;
  text-align: left;
  padding-left: 2px;
`;
const ErrorMessage = styled(motion.div)`
  margin-bottom: 20px;
  padding: 8px 12px;
  border-radius: 8px;
  font-family: 'Cormorant', serif;
  font-size: 0.88rem;
  line-height: 1.3;
  text-align: center;
  background-color: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
  border: 1px solid rgba(255, 107, 107, 0.3);
`;
const SubmitButton = styled(motion.button)`
  font-family: 'Poppins', sans-serif;
  padding: 20px;
  font-size: 0.9rem;
  line-height: 0.8;
  background: var(--gold-gradient);
  color: var(--background);
  border-radius: 5px;
  border: none;
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), background 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-top: 2px;
  width: 100%;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    filter: brightness(1.06);
    box-shadow: 0 8px 18px rgba(198, 169, 100, 0.26);
  }
  &:active:not(:disabled) {
    transform: translateY(-1px) scale(0.6);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: rgba(198, 169, 100, 0.5);
  }
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover:not(:disabled),
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;
const BackText = styled.p`
  text-align: center;
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.3;
  cursor: default;
`;
const BackLink = styled.span`
  color: var(--accent);
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    color: var(--accent-light);
    text-decoration: underline;
  }
`;
const SuccessContainer = styled(motion.div)`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;
const ErrorContainer = styled(motion.div)`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;
const ErrorIcon = styled.div`
  font-size: 2.5rem;
  line-height: 1;
`;
const SuccessTitle = styled.h2`
  font-family: 'Cinzel', serif;
  font-style: normal;
  font-size: 2rem;
  line-height: 1.15;
  color: var(--white);
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
  letter-spacing: 0.14em;
  padding-left: 0.14em;
  cursor: default;
`;
const ErrorTitle = styled.h2`
  font-size: 2rem;
  line-height: 1.15;
  color: var(--white);
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
  letter-spacing: 0.14em;
  padding-left: 0.14em;
  cursor: default;
`;
const SuccessMessage = styled.p`
  font-size: 1rem;
  line-height: 1.3;
  color: var(--text-secondary);
  margin: 0;
  text-align: center;
  font-family: 'Cormorant', serif;
  font-style: normal;
  letter-spacing: 0.04em;
  cursor: default;
`;
const SuccessSubtext = styled.p`
  font-size: 0.88rem;
  line-height: 1.3;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-style: normal;
  margin: 0;
  cursor: default;
`;
const ErrorSubtext = styled.p`
  font-size: 0.8rem;
  line-height: 1.3;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-style: italic;
  margin: 0;
  cursor: default;
`;
const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-top: 8px;
`;
const ActionButton = styled(motion.button)`
  font-family: 'Poppins', sans-serif;
  font-style: normal;
  font-weight: 400;
  padding: 20px;
  font-size: 0.9rem;
  line-height: 0.8;
  background: ${(props) => (props.variant === 'secondary' ? 'transparent' : 'var(--gold-gradient)')};
  color: ${(props) => (props.variant === 'secondary' ? 'var(--accent)' : 'var(--background)')};
  border: ${(props) => (props.variant === 'secondary' ? '1px solid var(--accent)' : 'none')};
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  width: 100%;
  box-shadow: ${(props) =>
    props.variant === 'secondary' ? 'none' : '0 4px 15px rgba(0, 0, 0, 0.3)'};
  &:hover {
    background: ${(props) =>
      props.variant === 'secondary' ? 'rgba(198, 169, 100, 0.1)' : 'var(--gold-gradient)'};
    box-shadow: ${(props) =>
      props.variant === 'secondary'
        ? '0 4px 15px rgba(198, 169, 100, 0.2)'
        : '0 6px 20px rgba(255, 215, 0, 0.4)'};
  }
`;
export default ResetPasswordPage;
