// Личный кабинет пациента: список своих записей со статусами и отменой.

import { useEffect, useState, useCallback } from 'react';
import { appointmentsApi, extractError } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import type { AppointmentDTO } from '../../../shared/types';

const STATUS_LABEL: Record<string, string> = {
  active: 'Активна',
  cancelled: 'Отменена',
  completed: 'Завершена',
};

export function DashboardPage() {
  const [items, setItems] = useState<AppointmentDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    appointmentsApi
      .list()
      .then(setItems)
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async (id: string) => {
    setError(null);
    setCancellingId(id);
    try {
      await appointmentsApi.cancel(id);
      load();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="dashboard-page" data-testid="dashboard-page">
      <h1>Мои записи</h1>

      <ErrorBanner message={error} testId="dashboard-error" />

      {loading ? (
        <p data-testid="dashboard-loading">Загрузка…</p>
      ) : items.length === 0 ? (
        <p data-testid="no-appointments">У вас пока нет записей.</p>
      ) : (
        <table className="appointments-table" data-testid="appointments-table">
          <thead>
            <tr>
              <th>Врач</th>
              <th>Дата</th>
              <th>Время</th>
              <th>Статус</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} data-testid={`appointment-row-${a.id}`}>
                <td>{a.doctorName}</td>
                <td>{a.date}</td>
                <td>{a.timeSlot}</td>
                <td data-testid={`appointment-status-${a.id}`}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </td>
                <td>
                  {a.status === 'active' ? (
                    <button
                      className="btn-danger"
                      data-testid={`cancel-button-${a.id}`}
                      disabled={cancellingId === a.id}
                      onClick={() => handleCancel(a.id)}
                    >
                      {cancellingId === a.id ? 'Отмена…' : 'Отменить'}
                    </button>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
