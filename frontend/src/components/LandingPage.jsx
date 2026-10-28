import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FiActivity, FiTarget, FiUser } from 'react-icons/fi';
import { GiMuscleUp } from 'react-icons/gi';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container className="custom-scroll">
      <Hero>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <HeroTitle>HealGym</HeroTitle>
          <HeroSubtitle>Seu treino personalizado está a um clique de distância</HeroSubtitle>
          <StartButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/register')}
          >
            Comece Agora
          </StartButton>
        </motion.div>
      </Hero>

      <Features>
        <FeatureTitle>Por que escolher o HealGym?</FeatureTitle>
        <FeatureGrid>
          <FeatureCard whileHover={{ y: -10 }} transition={{ type: 'spring', stiffness: 300 }}>
            <FiTarget size="min(5vw, 40px)" color="var(--accent)" />
            <FeatureCardTitle>Treino Personalizado</FeatureCardTitle>
            <FeatureCardText>
              Treinos sob medida para seus objetivos.
            </FeatureCardText>
          </FeatureCard>

          <FeatureCard whileHover={{ y: -10 }} transition={{ type: 'spring', stiffness: 300 }}>
            <GiMuscleUp size="min(5vw, 40px)" color="var(--accent)" />
            <FeatureCardTitle>Acompanhamento</FeatureCardTitle>
            <FeatureCardText>
              Acompanhe sua evolução com ajustes em tempo real.
            </FeatureCardText>
          </FeatureCard>

          <FeatureCard whileHover={{ y: -10 }} transition={{ type: 'spring', stiffness: 300 }}>
            <FiActivity size="min(5vw, 40px)" color="var(--accent)" />
            <FeatureCardTitle>Dieta Especializada</FeatureCardTitle>
            <FeatureCardText>
              Planos alimentares personalizados para potencializar seus resultados.
            </FeatureCardText>
          </FeatureCard>

          <FeatureCard whileHover={{ y: -10 }} transition={{ type: 'spring', stiffness: 300 }}>
            <FiUser size="min(5vw, 40px)" color="var(--accent)" />
            <FeatureCardTitle>Perfil Individual</FeatureCardTitle>
            <FeatureCardText>
              Sua jornada fitness, adaptada ao seu estilo de vida.
            </FeatureCardText>
          </FeatureCard>
        </FeatureGrid>
      </Features>
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;
`;

const Hero = styled.section`
  height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: linear-gradient(
    135deg,
    var(--gradient-start) 0%,
    var(--gradient-mid) 50%,
    var(--gradient-end) 100%
  );
  padding: 0;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, transparent 0%, var(--background) 100%);
    opacity: 0.7;
  }
`;

const HeroTitle = styled.h1`
  font-size: min(8vw, 6rem);
  color: var(--white);
  margin-bottom: min(3vh, 20px);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
  z-index: 1;
  letter-spacing: 0.3vw;
  width: 100%;
  max-width: 90vw;
  cursor: default;
`;

const HeroSubtitle = styled.p`
  font-size: min(2.5vw, 1.5rem);
  color: white;
  margin-bottom: min(5vh, 40px);
  max-width: min(90vw, 40vw);
  line-height: 1.8;
  font-family: 'Cormorant', serif;
  font-weight: 400;
  letter-spacing: 0.1vw;
  margin-left: auto;
  margin-right: auto;
`;

const StartButton = styled(motion.button)`
  font-family: 'Poppins', sans-serif;
  padding: min(2.5vh, 20px) min(6vw, 50px);
  font-size: min(2vw, 1.1rem);
  background: var(--gold-gradient);
  color: var(--background);
  border-radius: 2px;
  transition: all 0.4s ease;
  text-transform: uppercase;
  letter-spacing: 0.2vw;
  position: relative;
  z-index: 1;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid transparent;
  width: min(90vw, 300px);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
  }
`;

const Features = styled.section`
  padding: min(5vh, 100px) 0;
  background: linear-gradient(to bottom, var(--gradient-start) 0%, var(--gradient-mid) 100%);
  position: relative;
  width: 101%;
  display: flex;
  flex-direction: column;
  align-items: center;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, var(--accent), transparent);
  }
`;

const FeatureTitle = styled.h2`
  text-align: center;
  font-size: min(5vw, 2.8rem);
  color: var(--accent-light);
  margin-bottom: min(10vh, 80px);
  position: relative;
  width: 100%;
  cursor: default;

  &::after {
    content: '';
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 2px;
    background: var(--gold-gradient);
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: min(4vw, 30px);
  width: 95%;
  margin: 0;
  padding: 0;
  cursor: default;
`;

const FeatureCard = styled(motion.div)`
  background: var(--card-bg);
  padding: min(5vh, 40px) min(3vw, 30px);
  border-radius: 2px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(198, 169, 100, 0.1);
  backdrop-filter: blur(10px);
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  &:hover {
    border-color: var(--accent);
    box-shadow: 0 8px 25px rgba(255, 215, 0, 0.15);
  }
`;

const FeatureCardTitle = styled.h3`
  font-size: min(2.5vw, 1.8rem);
  color: var(--accent);
  margin: min(2vh, 20px) 0;
  letter-spacing: min(0.2vw, 1px);
  width: 100%;
`;

const FeatureCardText = styled.p`
  font-size: min(1.8vw, 1.1rem);
  color: var(--text-secondary);
  line-height: 1.6;
  font-weight: 300;
  width: 100%;
  text-align: center;
  text-wrap: balance;
`;

export default LandingPage;
