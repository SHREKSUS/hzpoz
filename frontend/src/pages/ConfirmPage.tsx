// Страница подтверждения записи. Показывает выбранные врача/дату/время
// и создаёт запись по кнопке. При успехе ведёт в личный кабинет.

import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { appointmentsApi, extractError } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';

interface BookingSelection {
  doctorId: string;
  doctorName: string;
  date: string;
  timeSlot: string;
}

export function ConfirmPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const selection = location.state as BookingSelection | null;

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Если зашли напрямую без выбора — возвращаем на страницу записи.
  if (!selection || !selection.doctorId) {
    return <Navigate to="/" replace />;
  }

  const handleConfirm = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await appointmentsApi.create({
        doctorId: selection.doctorId,
        date: selection.date,
        timeSlot: selection.timeSlot,
      });
      navigate('/dashboard', { replace: true, state: { justBooked: true } });
    } catch (err) {
      // Например, слот уже заняли (409) — показываем понятное сообщение.
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="confirm-page" data-testid="confirm-page">
      <h1>Подтверждение записи</h1>

      <ErrorBanner message={error} testId="confirm-error" />

      <dl className="summary">
        <dt>Врач</dt>
        <dd data-testid="confirm-doctor">{selection.doctorName}</dd>
        <dt>Дата</dt>
        <dd data-testid="confirm-date">{selection.date}</dd>
        <dt>Время</dt>
        <dd data-testid="confirm-time">{selection.timeSlot}</dd>
      </dl>

      <div className="actions">
        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
          data-testid="confirm-back"
        >
          Назад
        </button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          data-testid="confirm-button"
        >
          {submitting ? 'Записываем…' : 'Подтвердить запись'}
        </button>
      </div>
    </div>
  );
}
