import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();

  // Check explicitly for authenticated session flag
  const isAuthenticated =
    typeof window !== 'undefined' &&
    localStorage.getItem('medimentor_is_authenticated') === 'true';

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/auth?mode=signin&redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
