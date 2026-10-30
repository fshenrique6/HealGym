import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail, validateRequiredPassword } from '../utils/authValidation';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validateRequiredPassword(value);
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
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const newError = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: newError }));
  };

  const handleSubmit = async () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    setTouched({
      email: true,
      password: true,
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const credentials = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
      };

      const response = await login(credentials);

      setSubmitMessage('Login realizado com sucesso! Redirecionando...');

      setTimeout(() => {
        if (!response.user.profileSetupCompleted) {
          navigate('/profile-setup');
        } else {
          navigate('/dashboard');
        }
      }, 2000);
    } catch (error) {
      setSubmitMessage(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <motion.div
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
          <FormTitle>Entrar</FormTitle>
          <FormSubtitle>Acesse sua conta e continue sua jornada</FormSubtitle>

          <FormContainer>
            <InputGroup>
              <Input
                type="email"
                name="email"
                placeholder="E-mail"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.email && errors.email}
              />
              <AnimatePresence>
                {touched.email && errors.email && (
                  <ErrorMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {errors.email}
                  </ErrorMessage>
                )}
              </AnimatePresence>
            </InputGroup>

            <InputGroup>
              <Input
                type="password"
                name="password"
                placeholder="Senha"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.password && errors.password}
              />
              <AnimatePresence>
                {touched.password && errors.password && (
                  <ErrorMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {errors.password}
                  </ErrorMessage>
                )}
              </AnimatePresence>
            </InputGroup>

            <LoginButton
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              disabled={isSubmitting || loading}
            >
              {isSubmitting || loading ? 'Entrando...' : 'Entrar'}
            </LoginButton>

            {submitMessage && (
              <SubmitMessage
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={submitMessage.includes('sucesso') ? 'success' : 'error'}
              >
                {submitMessage}
              </SubmitMessage>
            )}
          </FormContainer>

          <RegisterText>
            Não tem uma conta?{' '}
            <RegisterLink onClick={() => navigate('/register')}>Cadastre-se</RegisterLink>
          </RegisterText>

          <ForgotPasswordText>
            <ForgotPasswordLink onClick={() => navigate('/forgot-password')}>
              Esqueci minha senha
            </ForgotPasswordLink>
          </ForgotPasswordText>
      </FormSection>
    </Container>
  );
};

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

const FormSection = styled(motion.section)`
  width: min(100%, 440px);
  padding: 28px 18px 15px;
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

const ErrorMessage = styled(motion.span)`
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

const LoginButton = styled(motion.button)`
  font-family: 'Poppins', sans-serif;
  padding: 20px;
  font-size: 0.9rem;
  line-height: 0.8;
  background: var(--gold-gradient);
  color: var(--background);
  border-radius: 5px;
  border: none;
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
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
    transform: translateY(-2px) scale(0.99);
  }
  &:disabled {
    cursor: not-allowed;
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

const RegisterText = styled.p`
  text-align: center;
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.3;
  cursor: default;
`;

const RegisterLink = styled.span`
  color: var(--accent);
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    color: var(--accent-light);
    text-decoration: underline;
  }
`;

const ForgotPasswordText = styled.p`
  text-align: center;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.3;
  cursor: default;
`;

const ForgotPasswordLink = styled.span`
  color: var(--accent);
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    color: var(--accent-light);
    text-decoration: underline;
  }
`;

const SubmitMessage = styled(motion.div)`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-family: 'Cormorant', serif;
  font-size: 0.88rem;
  line-height: 1.3;
  text-align: center;
  &.success {
    background-color: rgba(76, 175, 80, 0.1);
    color: #4caf50;
    border: 1px solid rgba(76, 175, 80, 0.3);
  }
  &.error {
    background-color: rgba(255, 107, 107, 0.1);
    color: #ff6b6b;
    border: 1px solid rgba(255, 107, 107, 0.3);
  }
`;

export default LoginPage;
