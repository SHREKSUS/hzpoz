// Корневой компонент: маршрутизация react-router + общий каркас.

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { BookingPage } from './pages/BookingPage';
import { ConfirmPage } from './pages/ConfirmPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';

// Баннер истёкшей сессии — показывается, если API вернул 401.
function SessionExpiredBanner() {
  const { sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionExpired) {
      navigate('/login', { replace: true });
    }
  }, [sessionExpired, navigate]);

  if (!sessionExpired) return null;
  return (
    <div className="session-expired" data-testid="session-expired" role="alert">
      Сессия истекла. Войдите снова.
      <button onClick={clearSessionExpired} data-testid="session-expired-dismiss">
        ОК
      </button>
    </div>
  );
}

export function App() {
  return (
    <Layout>
      <SessionExpiredBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute role="patient">
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/confirm"
          element={
            <ProtectedRoute role="patient">
              <ConfirmPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="patient">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="registrar">
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
