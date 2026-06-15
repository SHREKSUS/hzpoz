// Общий каркас страниц: шапка с навигацией и кнопкой выхода.

import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="brand" data-testid="nav-brand">
          👁 ОфтальмоЦентр
        </Link>
        <nav className="nav">
          {user?.role === 'patient' && (
            <>
              <Link to="/" data-testid="nav-booking">
                Записаться
              </Link>
              <Link to="/dashboard" data-testid="nav-dashboard">
                Мои записи
              </Link>
            </>
          )}
          {user?.role === 'registrar' && (
            <Link to="/admin" data-testid="nav-admin">
              Регистратура
            </Link>
          )}
          {user && (
            <>
              <span className="user-name" data-testid="current-user">
                {user.fullName}
              </span>
              <button
                onClick={handleLogout}
                data-testid="logout-button"
                className="btn-link"
              >
                Выйти
              </button>
            </>
          )}
        </nav>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
