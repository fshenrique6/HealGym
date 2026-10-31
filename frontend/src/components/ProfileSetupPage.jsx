import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { validatePhysicalProfileField } from '../utils/profileValidation';
import { BODY_TYPE_OPTIONS, GENDER_OPTIONS } from '../utils/profileOptions';
import CamposPerfilTreino from './CamposPerfilTreino';
import { payloadTreino, validarCampoTreino, confirmarTreinoSalvo } from '../utils/perfilTreino';

const CAMPOS_ETAPA = [
  ['gender', 'height', 'weight', 'bodyType', 'age'],
  ['trainingGoal', 'trainingExperience'],
  ['recentFrequency', 'availableDays', 'preferredSessionMinutes'],
];

const LEGENDAS_ETAPA = [
  'Dados pessoais',
  'Objetivo e experiência',
  'Rotina de treinamento',
];

const variantesEtapa = {
  enter: (direcao) => ({ opacity: 0, x: direcao * 36 }),
  center: { opacity: 1, x: 0 },
  exit: (direcao) => ({ opacity: 0, x: direcao * -36 }),
};

const transicaoEtapa = { type: 'spring', duration: 0.4, bounce: 0 };

const ProfileSetupPage = () => {
  const navigate = useNavigate();
  const { updateUser, logout } = useAuth();

  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState(1);
  const [formData, setFormData] = useState({
    gender: '',
    height: '',
    weight: '',
    bodyType: '',
    age: '',
    trainingGoal: '',
    trainingExperience: '',
    recentFrequency: '',
    availableDays: '',
    preferredSessionMinutes: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const enviando = useRef(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const submitMessageRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (submitMessage && submitMessageRef.current) {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';

      setTimeout(() => {
        submitMessageRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }, 300);
    }
  }, [submitMessage]);

  const validateField = (name, value) =>
    CAMPOS_ETAPA[0].includes(name)
      ? validatePhysicalProfileField(name, value)
      : validarCampoTreino(name, value);

  const validarEtapa = (indice) => {
    const novos = {};
    CAMPOS_ETAPA[indice].forEach((campo) => {
      const erro = validateField(campo, formData[campo]);
      if (erro) novos[campo] = erro;
    });
    setTouched((atual) => ({
      ...atual,
      ...Object.fromEntries(CAMPOS_ETAPA[indice].map((campo) => [campo, true])),
    }));
    setErrors((atual) => {
      const seguinte = { ...atual };
      CAMPOS_ETAPA[indice].forEach((campo) => {
        if (novos[campo]) seguinte[campo] = novos[campo];
        else delete seguinte[campo];
      });
      return seguinte;
    });
    return Object.keys(novos).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const newError = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: newError }));
    }
  };

  const alterarTreino = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const newError = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: newError }));
  };

  const avancar = () => {
    if (validarEtapa(etapa)) {
      setDirecao(1);
      setEtapa((atual) => Math.min(atual + 1, CAMPOS_ETAPA.length - 1));
    }
  };

  const voltar = () => {
    setSubmitMessage('');
    setDirecao(-1);
    setEtapa((atual) => Math.max(atual - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (etapa < CAMPOS_ETAPA.length - 1) {
      avancar();
      return;
    }

    let primeiroInvalido = -1;
    CAMPOS_ETAPA.forEach((_, indice) => {
      if (!validarEtapa(indice) && primeiroInvalido < 0) {
        primeiroInvalido = indice;
      }
    });
    if (primeiroInvalido >= 0) {
      setDirecao(primeiroInvalido > etapa ? 1 : -1);
      setEtapa(primeiroInvalido);
      return;
    }

    if (enviando.current) {
      return;
    }

    setIsSubmitting(true);
    enviando.current = true;
    setSubmitMessage('');

    const enviado = {
      gender: formData.gender,
      height: parseFloat(formData.height),
      weight: parseFloat(formData.weight),
      bodyType: formData.bodyType,
      age: parseInt(formData.age, 10),
      ...payloadTreino(formData),
    };

    try {
      const response = await api.setupProfile(enviado);
      const divergencia = confirmarTreinoSalvo(enviado, response.user);
      if (divergencia) {
        throw new Error(divergencia);
      }
      updateUser(response.user);
      navigate('/dashboard');
    } catch (error) {
      setSubmitMessage(error.message || 'Erro ao salvar informações. Tente novamente.');
    } finally {
      enviando.current = false;
      setIsSubmitting(false);
    }
  };

  const handleLogoClick = () => {
    logout();
    navigate('/');
  };

  return (
    <Container className="custom-scroll">
      <LogoTitle
        onClick={handleLogoClick}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        HealGym
      </LogoTitle>
      <FormSection
        className="custom-scroll"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
          <FormTitle>Complete seu Perfil</FormTitle>
          <Passos>
            {LEGENDAS_ETAPA.map((legenda, indice) => (
              <Passo key={legenda} $ativa={indice === etapa} $feita={indice < etapa} />
            ))}
          </Passos>

          <FormContainer onSubmit={handleSubmit} noValidate>
            <AnimatePresence mode="wait" custom={direcao} initial={false}>
              <EtapaConteudo
                key={etapa}
                custom={direcao}
                variants={variantesEtapa}
                initial="enter"
                animate="center"
                exit="exit"
                transition={transicaoEtapa}
              >
            <FormSubtitle>
              <div>
                Etapa {etapa + 1} de {CAMPOS_ETAPA.length}
              </div>
              <div>{LEGENDAS_ETAPA[etapa]}</div>
            </FormSubtitle>
            {etapa === 0 && (
              <>
            <InputGroup>
              <SelectWrapper>
                <Select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.gender && errors.gender}
                >
                  <option value="">Selecione seu gênero</option>
                  {GENDER_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </SelectWrapper>
              <AnimatePresence>
                {touched.gender && errors.gender && (
                  <ErrorMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {errors.gender}
                  </ErrorMessage>
                )}
              </AnimatePresence>
            </InputGroup>

            <TripleInputRow>
              <InputGroup>
                <Input
                  type="number"
                  name="height"
                  placeholder="Altura (cm)"
                  value={formData.height}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.height && errors.height}
                  min="100"
                  max="250"
                />
                <AnimatePresence>
                  {touched.height && errors.height && (
                    <ErrorMessage
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {errors.height}
                    </ErrorMessage>
                  )}
                </AnimatePresence>
              </InputGroup>

              <InputGroup>
                <Input
                  type="number"
                  name="weight"
                  placeholder="Peso (kg)"
                  value={formData.weight}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.weight && errors.weight}
                  min="30"
                  max="300"
                  step="0.1"
                />
                <AnimatePresence>
                  {touched.weight && errors.weight && (
                    <ErrorMessage
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {errors.weight}
                    </ErrorMessage>
                  )}
                </AnimatePresence>
              </InputGroup>

              <InputGroup>
                <Input
                  type="number"
                  name="age"
                  placeholder="Idade (anos)"
                  value={formData.age}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.age && errors.age}
                  min="13"
                  max="120"
                />
                <AnimatePresence>
                  {touched.age && errors.age && (
                    <ErrorMessage
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {errors.age}
                    </ErrorMessage>
                  )}
                </AnimatePresence>
              </InputGroup>
            </TripleInputRow>

            <InputGroup>
              <SelectWrapper>
                <Select
                  name="bodyType"
                  value={formData.bodyType}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.bodyType && errors.bodyType}
                >
                  <option value="">Selecione seu biotipo</option>
                  {BODY_TYPE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </SelectWrapper>
              <AnimatePresence>
                {touched.bodyType && errors.bodyType && (
                  <ErrorMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {errors.bodyType}
                  </ErrorMessage>
                )}
              </AnimatePresence>
            </InputGroup>
              </>
            )}

            {etapa > 0 && (
              <CamposPerfilTreino
                parte={etapa === 1 ? 'objetivo' : 'rotina'}
                valores={formData}
                erros={errors}
                mostrarErros={touched}
                onChange={alterarTreino}
              />
            )}
              </EtapaConteudo>
            </AnimatePresence>

            <ButtonGroup>
              <AnimatePresence initial={false}>
                {etapa > 0 && (
                  <BackButton
                    key="voltar"
                    type="button"
                    onClick={voltar}
                    disabled={isSubmitting}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Voltar
                  </BackButton>
                )}
              </AnimatePresence>
              <SubmitButton
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? 'Salvando...' : etapa < 2 ? 'Continuar' : 'Salvar perfil'}
              </SubmitButton>
            </ButtonGroup>

            <AnimatePresence>
              {submitMessage && (
                <SubmitMessage
                  ref={submitMessageRef}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={submitMessage.includes('sucesso') ? 'success' : 'error'}
                >
                  {submitMessage}
                </SubmitMessage>
              )}
            </AnimatePresence>
          </FormContainer>
      </FormSection>
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: min(15vh, 120px) 0;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    var(--gradient-start) 0%,
    var(--gradient-mid) 50%,
    var(--gradient-end) 100%
  );
  display: flex;
  align-items: flex-start;
  justify-content: center;
  position: relative;
`;

const LogoTitle = styled(motion.h1)`
  font-size: 2.5rem;
  line-height: 1.1;
  text-decoration: underline;
  text-decoration-thickness: 0.1px;
  text-underline-offset: 5px;
  color: var(--white);
  position: absolute;
  top: min(5vh, 40px);
  left: min(5vw, 40px);
  font-weight: 600;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.28em;
  padding-left: 0.28em;
  cursor: pointer;
  font-family: 'Cinzel', serif;
  z-index: 10;

  &:hover {
    text-shadow: 2px 2px 8px rgba(198, 169, 100, 0.5);
  }
`;

const FormSection = styled(motion.section)`
  width: min(90vw, 600px);
  max-height: calc(100vh - 140px);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 28px 22px 15px;
  background: var(--card-bg);
  border-radius: 2px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(198, 169, 100, 0.1);
  backdrop-filter: blur(10px);
  margin-top: min(5vh, 40px);
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
  color: var(--text-secondary);
  margin-bottom: 20px;
  text-align: center;
  font-family: 'Cormorant', serif;
  letter-spacing: 0.04em;
  cursor: default;
  line-height: 1.3;

  div {
    margin-bottom: 0.5rem;

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  width: 100%;
`;

const TripleInputRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: min(1.5vw, 15px);

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
    gap: min(2vw, 20px);

    & > div:last-child {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: min(2vh, 15px);

    & > div:last-child {
      grid-column: auto;
    }
  }
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

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const Select = styled.select`
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
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg fill='rgba(198, 169, 100, 0.7)' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 12px center;

  &:focus {
    outline: none;
    border-color: ${(props) => (props.error ? 'var(--error, #ff6b6b)' : 'var(--accent)')};
    box-shadow: 0 0 10px
      ${(props) => (props.error ? 'rgba(255, 107, 107, 0.2)' : 'rgba(198, 169, 100, 0.2)')};
  }

  option {
    background: var(--secondary);
    color: var(--white);
    padding: 10px;
  }

  option[value=''] {
    color: rgba(255, 255, 255, 0.5);
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const EtapaConteudo = styled(motion.div)`
  width: 100%;
`;

const BackButton = styled(motion.button)`
  flex: 0.7;
  padding: 16px 12px;
  background: transparent;
  color: var(--white);
  border: 1px solid rgba(198, 169, 100, 0.45);
  border-radius: 5px;
  font-family: 'Cormorant', serif;
  font-size: 1.05rem;
  letter-spacing: 0;
  text-transform: none;
  transition: border-color 0.3s ease;

  &:hover {
    border-color: var(--accent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Passos = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: -8px 0 18px;
`;

const Passo = styled.span`
  width: 36px;
  height: 3px;
  border-radius: 2px;
  background: ${(props) =>
    props.$ativa || props.$feita ? 'var(--accent)' : 'rgba(255, 255, 255, 0.16)'};
  opacity: ${(props) => (props.$ativa ? 1 : 0.7)};
  transition: background 0.3s ease;
`;

const SubmitButton = styled(motion.button)`
  flex: 1.4;
  font-family: 'Poppins', sans-serif;
  padding: 20px;
  font-size: 0.9rem;
  line-height: 0.8;
  background: var(--gold-gradient);
  color: var(--background);
  border-radius: 5px;
  border: none;
  transition: box-shadow 0.4s ease;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);

  &:hover {
    box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
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

export default ProfileSetupPage;
