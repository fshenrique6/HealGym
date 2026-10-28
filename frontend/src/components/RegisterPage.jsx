import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail, validateRequiredPassword } from '../utils/authValidation';
import '../styles/RegisterPage.css';
const RegisterPage = () => {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const { register, loading, isAuthenticated } = useAuth();
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard');
      return;
    }
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTo(0, 0);
      document.body.scrollTo(0, 0);
    };
    scrollToTop();
    window.addEventListener('load', scrollToTop);
    const timeoutId = setTimeout(scrollToTop, 50);
    return () => {
      window.removeEventListener('load', scrollToTop);
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, loading, navigate]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Nome é obrigatório';
        else if (value.trim().length < 3) error = 'Nome deve ter pelo menos 3 caracteres';
        else if (/\d/.test(value)) error = 'O nome não deve conter números';
        else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s]*$/.test(value)) error = 'O nome deve conter apenas letras';
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validateRequiredPassword(value);
        break;
      case 'confirmPassword':
        if (!value) error = 'Confirmação de senha é obrigatória';
        else if (value !== formData.password) error = 'Senhas não coincidem';
        break;
      default:
        break;
    }
    return error;
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      const sanitizedValue = value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '');
      setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
      if (touched[name]) {
        const newError = validateField(name, sanitizedValue);
        setErrors((prev) => ({ ...prev, [name]: newError }));
      }
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'email') {
      setSubmitMessage((current) =>
        /e-?mail.*(em uso|cadastrad|já existe|utilizad)/i.test(current) ? '' : current
      );
    }
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
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorField = Object.keys(newErrors)[0];
      const inputElement = document.querySelector(`input[name="${firstErrorField}"]`);
      if (inputElement) {
        const viewportHeight = window.innerHeight;
        const fieldRect = inputElement.getBoundingClientRect();
        const targetScroll = fieldRect.top + window.pageYOffset - viewportHeight / 3;
        const startPosition = window.pageYOffset;
        const distance = targetScroll - startPosition;
        const duration = 400;
        let start = null;
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
        const step = (currentTime) => {
          if (!start) start = currentTime;
          const progress = Math.min((currentTime - start) / duration, 1);
          const currentPosition = startPosition + distance * easeOutCubic(progress);
          window.scrollTo(0, currentPosition);
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            inputElement.style.transition = 'box-shadow 0.2s ease-out';
            inputElement.style.boxShadow = '0 0 12px var(--error, #ff6b6b)';
            setTimeout(() => {
              inputElement.style.boxShadow = 'none';
            }, 400);
          }
        };
        requestAnimationFrame(step);
      }
      return;
    }
    setIsSubmitting(true);
    setSubmitMessage('');
    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      };
      await register(userData);
      setSubmitMessage('Cadastro realizado com sucesso! Redirecionando...');
      setTimeout(() => {
        navigate('/profile-setup');
      }, 2000);
    } catch (error) {
      const message = error.message || 'Erro ao realizar cadastro. Tente novamente.';

      setSubmitMessage(message);
    
      const emailJaExiste = /e-?mail.*(em uso|cadastrad|já existe|utilizad)/i.test(message);
    
      if (emailJaExiste) {
        setTimeout(() => {
          formRef.current?.parentElement?.scrollBy({
            top: 50,
            behavior: 'smooth'
          });
        }, 100);
      }
     } finally {
      setIsSubmitting(false);
    }
  };
  useEffect(() => {
    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors && formRef.current) {
      const yOffset = -50;
      const formElement = formRef.current;
      const y = formElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
      const smoothScroll = () => {
        const startPosition = window.pageYOffset;
        const distance = y - startPosition;
        const duration = 1200;
        let start = null;
        const easeOutQuart = (t) => 1 - --t * t * t * t;
        const step = (currentTime) => {
          if (!start) start = currentTime;
          const progress = Math.min((currentTime - start) / duration, 1);
          if (progress === 1) {
            window.scrollTo(0, y);
            return;
          }
          const currentPosition = startPosition + distance * easeOutQuart(progress);
          window.scrollTo(0, currentPosition);
          window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
      };
      smoothScroll();
    }
  }, [errors]);
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
        ref={formRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
          <FormTitle>Criar Conta</FormTitle>
          <FormSubtitle>Comece sua jornada fitness hoje</FormSubtitle>
          <FormContainer>
            <InputGroup>
              <Input
                type="text"
                name="name"
                placeholder="Nome completo"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text');
                  const sanitized = text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '');
                  document.execCommand('insertText', false, sanitized);
                }}
                error={touched.name && errors.name}
              />
              <AnimatePresence>
                {touched.name && errors.name && (
                  <ErrorMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {errors.name}
                  </ErrorMessage>
                )}
              </AnimatePresence>
            </InputGroup>
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
            <InputGroup>
              <Input
                type="password"
                name="confirmPassword"
                placeholder="Confirmar senha"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.confirmPassword && errors.confirmPassword}
              />
              <AnimatePresence>
                {touched.confirmPassword && errors.confirmPassword && (
                  <ErrorMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {errors.confirmPassword}
                  </ErrorMessage>
                )}
              </AnimatePresence>
            </InputGroup>
            <RegisterButton
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              disabled={isSubmitting || loading}
            >
              {isSubmitting || loading ? 'Cadastrando...' : 'Cadastrar'}
            </RegisterButton>
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
          <LoginText>
            Já tem uma conta? <LoginLink onClick={() => navigate('/login')}>Entrar</LoginLink>
          </LoginText>
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
const RegisterButton = styled(motion.button)`
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
  width:100%;
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
const LoginText = styled.p`
  text-align: center;
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.3;
  cursor: default;
`;
const LoginLink = styled.span`
  color: var(--accent);
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    color: var(--accent-light);
    text-decoration: underline;
  }
`;
export default RegisterPage;
