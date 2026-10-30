import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { isStrongPassword, validateEmail } from '../utils/authValidation';

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [newEmail, setNewEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailStep, setEmailStep] = useState('idle');
  const [emailError, setEmailError] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const deleteMessageRef = useRef(null);
  const submitMessageRef = useRef(null);
  const emailInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsLoadingUser(false);
    }
  }, [user]);

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);
  useEffect(() => {
    if (submitMessage && submitMessageRef.current) {
      setTimeout(() => {
        submitMessageRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }, 300);
    }
  }, [submitMessage]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Nome é obrigatório';
        else if (value.trim().length < 2) error = 'Nome deve ter pelo menos 2 caracteres';
        else if (/\d/.test(value)) error = 'O nome não deve conter números';
        else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s]*$/.test(value)) error = 'O nome deve conter apenas letras';
        break;
      case 'newPassword':
        if (value && value.length < 6) {
          error = 'Nova senha deve ter pelo menos 6 caracteres';
        } else if (value && !isStrongPassword(value)) {
          error =
            'Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número';
        }
        break;
      case 'confirmPassword':
        if (value && value !== formData.newPassword) {
          error = 'Confirmação de senha não confere';
        }
        break;
      default:
        return '';
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    setTouched({
      name: true,
      newPassword: true,
      confirmPassword: true,
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const profileData = {
        name: formData.name.trim(),
      };

      if (formData.newPassword) {
        profileData.newPassword = formData.newPassword;
      }

      const response = await api.updateProfile(profileData);

      updateUser(response.user);

      setSubmitMessage('Perfil atualizado com sucesso! Redirecionando...');

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setSubmitMessage(error.message || 'Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteMessage('');

    try {
      const response = await api.requestAccountDeletion();

      setDeleteMessage(
        response.message || 'E-mail de confirmação enviado! Verifique sua caixa de entrada.',
      );
      setShowDeleteConfirmation(false);

      if (response.devMode) {
        setDeleteMessage(response.message + ' (Modo desenvolvimento)');
      }

      setTimeout(() => {
        if (deleteMessageRef.current) {
          deleteMessageRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        }
      }, 300);
    } catch (error) {
      setDeleteMessage(error.message || 'Erro ao solicitar exclusão. Tente novamente.');

      setTimeout(() => {
        if (deleteMessageRef.current) {
          deleteMessageRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        }
      }, 300);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (emailStep !== 'edit') return;
    const field = emailInputRef.current;
    if (!field) return;
    field.focus();
    const end = field.value.length;
    try {
      field.setSelectionRange(end, end);
    } catch {
      field.focus();
    }
  }, [emailStep]);

  const openEmailEdit = () => {
    setNewEmail(user?.email || '');
    setEmailError('');
    setEmailMessage('');
    setEmailStep('edit');
  };

  const dismissEmailEdit = () => {
    setEmailStep('idle');
    setNewEmail('');
    setEmailError('');
    setEmailMessage('');
  };

  const requestEmailChange = async () => {
    const validationError = validateEmail(newEmail);
    if (validationError) {
      setEmailError(validationError);
      setEmailMessage('');
      return;
    }
    if (newEmail.trim().toLowerCase() === (user?.email || '').toLowerCase()) {
      setEmailError('Informe um e-mail diferente do atual.');
      setEmailMessage('');
      return;
    }

    setEmailBusy(true);
    setEmailError('');
    setEmailMessage('');
    try {
      const response = await api.requestEmailChange(newEmail.trim());
      setEmailStep('code');
      setVerificationCode('');
      setResendIn(60);
      setEmailMessage(response.message || 'Enviamos um código de verificação para o seu e-mail atual.');
    } catch (error) {
      setEmailError(error.message || 'Não foi possível solicitar a alteração.');
    } finally {
      setEmailBusy(false);
    }
  };

  const confirmEmailChange = async () => {
    if (!/^\d{6}$/.test(verificationCode)) {
      setEmailError('Código inválido');
      setEmailMessage('');
      return;
    }

    setEmailBusy(true);
    setEmailError('');
    setEmailMessage('');
    try {
      const response = await api.confirmEmailChange(verificationCode);
      if (response.user) {
        updateUser(response.user);
      }
      setEmailStep('idle');
      setNewEmail('');
      setVerificationCode('');
      setResendIn(0);
      setEmailMessage('E-mail alterado com sucesso!');
    } catch (error) {
      setEmailError(error.message || 'Não foi possível confirmar a alteração.');
    } finally {
      setEmailBusy(false);
    }
  };

  const resendEmailCode = async () => {
    if (resendIn > 0 || emailBusy) return;
    setEmailBusy(true);
    setEmailError('');
    setEmailMessage('');
    try {
      const response = await api.resendEmailChange();
      setResendIn(60);
      setEmailMessage(response.message || 'Enviamos um novo código para o seu e-mail atual.');
    } catch (error) {
      setEmailError(error.message || 'Não foi possível reenviar o código.');
    } finally {
      setEmailBusy(false);
    }
  };

  const cancelEmailChange = async () => {
    setEmailBusy(true);
    setEmailError('');
    try {
      await api.cancelEmailChange();
      setEmailStep('idle');
      setNewEmail('');
      setVerificationCode('');
      setResendIn(0);
      setEmailMessage('Alteração de e-mail cancelada.');
    } catch (error) {
      setEmailError(error.message || 'Não foi possível cancelar a alteração.');
    } finally {
      setEmailBusy(false);
    }
  };

  if (isLoadingUser) {
    return (
      <Container className="custom-scroll">
        <TopBar>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <LogoTitle onClick={() => navigate('/dashboard')}>HealGym</LogoTitle>
          </motion.div>
        </TopBar>
        <PageBody>
          <FormSection
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--white)' }}>
              Carregando dados do perfil...
            </div>
          </FormSection>
        </PageBody>
      </Container>
    );
  }

  return (
    <Container className="custom-scroll">
      <TopBar>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <LogoTitle onClick={() => navigate('/dashboard')}>HealGym</LogoTitle>
        </motion.div>
      </TopBar>
      <PageBody>
      <FormSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
          <FormTitle>Editar Perfil</FormTitle>
          <FormSubtitle>
            <div>Atualize suas informações pessoais</div>
            <div>Mantenha seu perfil sempre atualizado</div>
          </FormSubtitle>

          <FormContainer onSubmit={handleSubmit} noValidate>
            <InputGroup>
              <Input
                type="text"
                name="name"
                placeholder="Nome completo"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
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
                type="password"
                name="newPassword"
                placeholder="Nova senha (deixe em branco para não alterar)"
                value={formData.newPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.newPassword && errors.newPassword}
              />
              <AnimatePresence>
                {touched.newPassword && errors.newPassword && (
                  <ErrorMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {errors.newPassword}
                  </ErrorMessage>
                )}
              </AnimatePresence>
            </InputGroup>

            <InputGroup>
              <Input
                type="password"
                name="confirmPassword"
                placeholder="Confirme a nova senha"
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

            <AccountEmail>
              <AccountEmailInfo>
                E-mail atual
                <AccountEmailValue>{user?.email}</AccountEmailValue>
              </AccountEmailInfo>
              {emailStep === 'idle' && (
                <AccountEmailActions>
                  <EmailAsideButton type="button" onClick={openEmailEdit}>
                    Solicitar Alteração
                  </EmailAsideButton>
                  <QuietLink type="button" onClick={() => setEmailStep('support')}>
                    Não tenho acesso ao meu e-mail antigo
                  </QuietLink>
                </AccountEmailActions>
              )}
            </AccountEmail>

            <AnimatePresence mode="wait" initial={false}>
              {emailStep === 'idle' ? null : emailStep === 'support' ? (
                <SupportNotice
                  key="support"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  Por segurança, a alteração de e-mail exige a confirmação pelo endereço atualmente
                  cadastrado. Caso não tenha mais acesso a ele, entre em contato com o suporte do
                  HealGym.
                  <QuietLink type="button" onClick={() => setEmailStep('idle')}>
                    Voltar
                  </QuietLink>
                </SupportNotice>
              ) : (
                <EmailStepPanel
                  key="email-fields"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {emailStep === 'code' ? (
              <>
                <InputGroup>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Código de 6 dígitos"
                    value={verificationCode}
                    onChange={(event) => {
                      setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                      setEmailError('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        confirmEmailChange();
                      }
                    }}
                    error={Boolean(emailError)}
                    aria-label="Código de verificação"
                  />
                  <AnimatePresence>
                    {emailError && (
                      <ErrorMessage
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {emailError}
                      </ErrorMessage>
                    )}
                  </AnimatePresence>
                </InputGroup>
                <ButtonGroup>
                  <SubmitButton
                    type="button"
                    disabled={emailBusy}
                    onClick={confirmEmailChange}
                  >
                    {emailBusy ? 'Confirmando...' : 'Confirmar Alteração'}
                  </SubmitButton>
                  <CancelButton
                    type="button"
                    disabled={emailBusy || resendIn > 0}
                    onClick={resendEmailCode}
                  >
                    {resendIn > 0 ? `Reenviar Código (${resendIn}s)` : 'Reenviar Código'}
                  </CancelButton>
                </ButtonGroup>
                <QuietLinkRow>
                  <QuietLink type="button" disabled={emailBusy} onClick={cancelEmailChange}>
                    Cancelar alteração
                  </QuietLink>
                </QuietLinkRow>
              </>
            ) : emailStep === 'edit' ? (
              <EmailStepBody
                key="email-edit"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <InputGroup>
                  <Input
                    ref={emailInputRef}
                    type="email"
                    placeholder="Novo e-mail"
                    value={newEmail}
                    onChange={(event) => {
                      setNewEmail(event.target.value);
                      setEmailError('');
                      setEmailMessage('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        requestEmailChange();
                      }
                    }}
                    error={Boolean(emailError)}
                    aria-label="Novo e-mail"
                  />
                  <AnimatePresence>
                    {emailError && (
                      <ErrorMessage
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {emailError}
                      </ErrorMessage>
                    )}
                  </AnimatePresence>
                </InputGroup>
                <CancelButton
                  type="button"
                  disabled={emailBusy}
                  onClick={requestEmailChange}
                >
                  {emailBusy ? 'Enviando...' : 'Confirmar Novo E-mail'}
                </CancelButton>
                <QuietLinkRow>
                  <QuietLink type="button" disabled={emailBusy} onClick={dismissEmailEdit}>
                    Cancelar
                  </QuietLink>
                </QuietLinkRow>
              </EmailStepBody>
            ) : null}
                </EmailStepPanel>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {emailMessage && (
                <SubmitMessage
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="success"
                >
                  {emailMessage}
                </SubmitMessage>
              )}
            </AnimatePresence>

            <ButtonGroup>
              <SubmitButton
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Atualizando...' : 'Salvar Alterações'}
              </SubmitButton>

              <CancelButton
                type="button"
                onClick={() => navigate('/dashboard')}
              >
                Cancelar
              </CancelButton>
            </ButtonGroup>

            <DeleteButton
              type="button"
              onClick={() => setShowDeleteConfirmation(true)}
              disabled={isDeleting}
            >
              🗑️ Excluir Conta Permanentemente
            </DeleteButton>

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

            <AnimatePresence>
              {deleteMessage && (
                <SubmitMessage
                  ref={deleteMessageRef}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={
                    deleteMessage.includes('enviado') || deleteMessage.includes('sucesso')
                      ? 'success'
                      : 'error'
                  }
                >
                  {deleteMessage}
                </SubmitMessage>
              )}
            </AnimatePresence>
          </FormContainer>
      </FormSection>
      </PageBody>

      <AnimatePresence>
        {showDeleteConfirmation && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setShowDeleteConfirmation(false)}
          >
            <ModalContent
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>Confirmar Exclusão de Conta</ModalTitle>
              </ModalHeader>

              <ModalBody>
                <WarningText>
                  <strong>Esta ação é IRREVERSÍVEL!</strong>
                </WarningText>
                <WarningText>Ao confirmar, você:</WarningText>
                <WarningList>
                  <li>
                    <ItemIcon>🗑️</ItemIcon>
                    <span>Perderá todos os seus dados permanentemente</span>
                  </li>
                  <li>
                    <ItemIcon>🗑️</ItemIcon>
                    <span>Não poderá recuperar sua conta</span>
                  </li>
                  <li>
                    <ItemIcon>🗑️</ItemIcon>
                    <span>Precisará criar uma nova conta para usar o HealGym novamente</span>
                  </li>
                  <li>
                    <ItemIcon>📧</ItemIcon>
                    <span>Receberá um email de confirmação final</span>
                  </li>
                </WarningList>
                <ConfirmText>Tem certeza absoluta que deseja excluir sua conta?</ConfirmText>
              </ModalBody>

              <ModalFooter>
                <ModalCancelButton
                  type="button"
                  onClick={() => setShowDeleteConfirmation(false)}
                >
                  Cancelar
                </ModalCancelButton>
                <ModalDeleteButton
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Enviando...' : '🗑️ Sim, Excluir Minha Conta'}
                </ModalDeleteButton>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
  height: 100vh;
  height: 100dvh;
  margin: 0;
  padding: 0;
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
  align-items: stretch;
  box-sizing: border-box;
`;

const TopBar = styled.header`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(198, 169, 100, 0.2);
  width: 100%;
  flex-shrink: 0;
`;

const PageBody = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 5rem 1rem 24px;
  box-sizing: border-box;
`;

const LogoTitle = styled.h1`
  font-family: 'Cinzel', serif;
  font-size: 2rem;
  line-height: 1.1;
  letter-spacing: 0.14em;
  padding-left: 0.14em;
  width: fit-content;
  text-decoration: underline;
  text-decoration-thickness: 0.1px;
  text-underline-offset: 5px;
  text-decoration-color: rgba(141, 140, 140, 0.2);
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  cursor: pointer;
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;

  &:hover {
    transform: translateY(-2px);
  }
`;

const FormSection = styled(motion.section)`
  width: min(100%, 650px);
  padding: 18px 18px 12px;
  background: var(--card-bg);
  border-radius: 5px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(198, 169, 100, 0.1);
  backdrop-filter: blur(10px);
  flex-shrink: 0;

  @media (max-height: 800px) {
    margin: 0;
    padding: 14px 18px 10px;
  }

  @media (max-height: 600px) {
    margin: 0;
    padding: 12px 18px 8px;
  }
`;

const FormTitle = styled.h1`
  font-size: 2rem;
  line-height: 1.15;
  color: var(--white);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
  letter-spacing: 0.14em;
  padding-left: 0.14em;
  cursor: default;
  margin-bottom: 4px;

  @media (max-height: 600px) {
    font-size: min(4vw, 1.5rem);
    margin-bottom: min(0.5vh, 5px);
  }
`;

const FormSubtitle = styled.p`
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-align: center;
  font-family: 'Cormorant', serif;
  letter-spacing: 0.04em;
  cursor: default;
  line-height: 1.3;

  div {
    margin-bottom: 0.2rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  @media (max-height: 600px) {
    font-size: min(2vw, 0.9rem);
    margin-bottom: min(1vh, 10px);
  }
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-height: 600px) {
    gap: min(1vh, 8px);
  }
`;

const InputGroup = styled.div`
  width: 100%;
`;

const AccountEmail = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 3px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(198, 169, 100, 0.2);
  border-radius: 2px;
`;

const AccountEmailInfo = styled.div`
  min-width: 0;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.82rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
`;

const AccountEmailActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex: 0 1 auto;
  max-width: 58%;
`;

const AccountEmailValue = styled.span`
  display: block;
  margin-top: 2px;
  color: var(--white);
  font-size: 0.95rem;
  line-height: 1.25;
  letter-spacing: 0.5px;
`;

const EmailStepPanel = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;

  @media (max-height: 600px) {
    gap: min(1vh, 8px);
  }
`;

const EmailStepBody = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;

  @media (max-height: 600px) {
    gap: min(1vh, 8px);
  }
`;

const SupportNotice = styled(motion.p)`
  margin: 0;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const QuietLinkRow = styled.p`
  margin: 0;
  text-align: center;
  font-size: 0.82rem;
  line-height: 1.3;
`;

const QuietLink = styled.button`
  padding: 0;
  border: none;
  background: none;
  color: var(--accent);
  font-family: 'Marcellus', serif;
  font-size: 0.82rem;
  font-weight: 400;
  line-height: 1.3;
  letter-spacing: 0.3px;
  text-transform: none;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    color: var(--accent-light);
    text-decoration: underline;
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
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
  flex-direction: column;
  gap: 12px;
  margin-top: 0;

  @media (max-height: 600px) {
    gap: min(0.8vh, 8px);
    margin-top: min(1vh, 8px);
  }
`;

const SubmitButton = styled(motion.button)`
  font-family: 'Poppins', sans-serif;
  padding: 14px 20px;
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
    opacity: 0.7;
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

const CancelButton = styled(motion.button)`
  font-family: 'Poppins', sans-serif;
  padding: 14px 20px;
  font-size: 0.9rem;
  line-height: 0.8;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid rgba(198, 169, 100, 0.3);
  border-radius: 5px;
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms cubic-bezier(0.22, 1, 0.36, 1), color 220ms cubic-bezier(0.22, 1, 0.36, 1), border-color 220ms cubic-bezier(0.22, 1, 0.36, 1), background-color 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  width: 100%;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
    background: rgba(198, 169, 100, 0.1);
    transform: translateY(-2px);
    filter: brightness(1.06);
  }

  &:active:not(:disabled) {
    transform: translateY(-2px) scale(0.99);
  }

  &:disabled {
    opacity: 0.7;
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

const EmailAsideButton = styled(CancelButton)`
  width: auto;
  padding: 8px 50px;
  font-size: 0.68rem;
  white-space: nowrap;
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

const DeleteButton = styled(motion.button)`
  font-family: 'Poppins', sans-serif;
  padding: 14px 20px;
  font-size: 0.9rem;
  line-height: 0.8;
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 50%, #7f1d1d 100%);
  color: white;
  border: none;
  border-radius: 5px;
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  width: 100%;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    filter: brightness(1.06);
    box-shadow: 0 8px 18px rgba(220, 38, 38, 0.35);
  }

  &:active:not(:disabled) {
    transform: translateY(-2px) scale(0.99);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid #e07a7a;
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

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px 18px;
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(180deg, #161616 0%, #101010 100%);
  border-radius: 5px;
  width: min(100%, 560px);
  border: 1px solid rgba(198, 169, 100, 0.28);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
  padding: 28px 22px 22px;
`;

const ModalHeader = styled.div`
  padding: 0;
  margin-bottom: 10px;
`;

const ModalTitle = styled.h2`
  color: #dc2626;
  font-size: 1.35rem;
  line-height: 1.2;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin: 0;
  text-align: center;
  font-family: 'Cinzel', serif;
  text-wrap: balance;
`;

const ModalBody = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const WarningText = styled.p`
  color: var(--text-secondary);
  font-family: 'Cormorant', 'Marcellus', serif;
  font-size: 1rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  font-weight: 400;
  margin: 0;
  text-align: center;

  strong {
    color: #dc2626;
    font-family: inherit;
    font-weight: 600;
  }
`;

const WarningList = styled.ul`
  list-style: none;
  color: var(--text-secondary);
  font-family: 'Cormorant', 'Marcellus', serif;
  font-size: 1rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  margin: 2px 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li,
  li span {
    font-family: 'Cormorant', 'Marcellus', serif;
    font-size: 1rem;
    line-height: 1.3;
    letter-spacing: 0.04em;
    font-weight: 400;
  }

  li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0;
  }
`;

const ItemIcon = styled.span`
  flex: 0 0 auto;
  width: 1.1rem;
  line-height: 1.3;
  text-align: center;
`;

const ConfirmText = styled.p`
  color: var(--accent);
  font-size: 1rem;
  line-height: 1.3;
  letter-spacing: 0.01em;
  font-weight: 600;
  text-align: center;
  margin: 4px 0 0;
  font-family: 'Cormorant', 'Marcellus', serif;
  white-space: nowrap;
`;

const ModalFooter = styled.div`
  padding: 18px 0 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ModalCancelButton = styled.button`
  box-sizing: border-box;
  font-family: 'Poppins', sans-serif;
  min-height: 48px;
  padding: 14px 20px;
  font-size: 0.9rem;
  line-height: 1.2;
  letter-spacing: 0.1em;
  background: #121212;
  color: var(--text-secondary);
  border: 1px solid rgba(198, 169, 100, 0.35);
  border-radius: 5px;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 220ms cubic-bezier(0.22, 1, 0.36, 1),
    color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
  cursor: pointer;
  text-transform: uppercase;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: #1a1814;
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
  }

  &:active {
    transform: translateY(-2px) scale(0.99);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover,
    &:active {
      transform: none;
    }
  }
`;

const ModalDeleteButton = styled.button`
  box-sizing: border-box;
  font-family: 'Poppins', sans-serif;
  min-height: 48px;
  padding: 14px 20px;
  font-size: 0.9rem;
  line-height: 1.2;
  letter-spacing: 0.08em;
  background: linear-gradient(180deg, #c53838 0%, #9d1c1c 100%);
  color: #fff;
  border: none;
  border-radius: 5px;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(157, 28, 28, 0.28);
  text-transform: uppercase;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-wrap: balance;

  &:hover:not(:disabled) {
    filter: brightness(1.06);
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(157, 28, 28, 0.38);
  }

  &:active:not(:disabled) {
    transform: translateY(-2px) scale(0.99);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid #e07a7a;
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

export default EditProfilePage;
