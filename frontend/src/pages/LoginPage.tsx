// Страница входа и регистрации пациента (переключение режима на одной форме).

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { extractError } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user =
        mode === 'login'
          ? await login(email, password)
          : await register(email, password, fullName);
      // Перенаправляем по роли.
      navigate(user.role === 'registrar' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card" data-testid="auth-page">
      <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>

      <div className="tabs">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
          data-testid="tab-login"
        >
          Вход
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
          data-testid="tab-register"
        >
          Регистрация
        </button>
      </div>

      <ErrorBanner message={error} testId="auth-error" />

      <form onSubmit={handleSubmit} data-testid="auth-form">
        {mode === 'register' && (
          <label>
            ФИО
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              data-testid="fullname-input"
              required
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="email-input"
            required
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="password-input"
            required
          />
        </label>
        <button type="submit" disabled={submitting} data-testid="submit-button">
          {submitting
            ? 'Подождите…'
            : mode === 'login'
              ? 'Войти'
              : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  );
}
