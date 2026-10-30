import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProfileSetupGuard = ({ children }) => {
  const { loading, isAuthenticated, needsProfileSetup } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (needsProfileSetup()) {
    return <Navigate to="/profile-setup" replace />;
  }

  return children;
};

export default ProfileSetupGuard;
