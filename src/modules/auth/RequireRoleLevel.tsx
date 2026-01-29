import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

type Props = {
  minLevel: number;
  children: React.ReactNode;
};

export function RequireRoleLevel({ minLevel, children }: Props) {
  const { user, token, loading } = useAuth();
  const loc = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  // ✅ IMPORTANTE: se tenho token mas ainda não carreguei o user,
  // NÃO redireciona! Apenas aguarda.
  if (!user) {
    return null; // ou um Spinner/Loading
  }
  if (loading) return <Spinner />
  const level = user.role?.level ?? 0;

  if (level < minLevel) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
