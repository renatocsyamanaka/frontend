import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { canAccess } from './access';

type RequireAccessProps = {
  children: React.ReactNode;
  permission?: string | string[];
};

export function RequireAccess({ children, permission }: RequireAccessProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!canAccess(user, permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}