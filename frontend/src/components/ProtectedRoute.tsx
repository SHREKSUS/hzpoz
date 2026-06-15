// Защищённый маршрут: пускает только авторизованных, опционально — по роли.

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../../../shared/types';

interface Props {
  children: ReactNode;
  role?: Role;
}

export function ProtectedRoute({ children, role }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div data-testid="loading">Загрузка…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (role && user.role !== role) {
    // Не та роль — отправляем на «свою» стартовую страницу.
    return <Navigate to={user.role === 'registrar' ? '/admin' : '/'} replace />;
  }
  return <>{children}</>;
}
