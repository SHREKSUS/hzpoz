// Админ-панель регистратуры:
//  - таблица всех записей с фильтром по врачу и дате,
//  - управление расписанием врачей (добавление/удаление слотов).

import { useEffect, useState, useCallback } from 'react';
import { doctorsApi, adminApi, appointmentsApi, extractError } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import type { DoctorDTO, AppointmentDTO } from '../../../shared/types';

interface ScheduleSlot {
  id: string;
  doctorId: string;
  date: string;
  timeSlot: string;
  isBooked: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Активна',
  cancelled: 'Отменена',
  completed: 'Завершена',
};

export function AdminPage() {
  const [doctors, setDoctors] = useState<DoctorDTO[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Фильтры таблицы записей.
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Управление расписанием.
  const [schedDoctor, setSchedDoctor] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedSlots, setSchedSlots] = useState<ScheduleSlot[]>([]);
  const [newSlotTime, setNewSlotTime] = useState('09:00');

  useEffect(() => {
    doctorsApi
      .list()
      .then((list) => {
        setDoctors(list);
        if (list.length) setSchedDoctor(list[0].id);
      })
      .catch((err) => setError(extractError(err)));
  }, []);

  const loadAppointments = useCallback(() => {
    setError(null);
    adminApi
      .appointments({
        doctorId: filterDoctor || undefined,
        date: filterDate || undefined,
      })
      .then(setAppointments)
      .catch((err) => setError(extractError(err)));
  }, [filterDoctor, filterDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const loadSchedule = useCallback(() => {
    if (!schedDoctor) return;
    adminApi
      .schedule(schedDoctor, schedDate || undefined)
      .then((s) => setSchedSlots(s as ScheduleSlot[]))
      .catch((err) => setError(extractError(err)));
  }, [schedDoctor, schedDate]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleCancelAppointment = async (id: string) => {
    setError(null);
    try {
      await appointmentsApi.cancel(id);
      loadAppointments();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const handleAddSlot = async () => {
    setError(null);
    if (!schedDoctor || !schedDate) {
      setError('Выберите врача и дату для добавления слота');
      return;
    }
    try {
      await adminApi.addSlot({ doctorId: schedDoctor, date: schedDate, timeSlot: newSlotTime });
      loadSchedule();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const handleDeleteSlot = async (id: string) => {
    setError(null);
    try {
      await adminApi.deleteSlot(id);
      loadSchedule();
    } catch (err) {
      setError(extractError(err));
    }
  };

  return (
    <div className="admin-page" data-testid="admin-page">
      <h1>Регистратура</h1>

      <ErrorBanner message={error} testId="admin-error" />

      <section className="admin-section">
        <h2>Все записи</h2>
        <div className="admin-filters">
          <label>
            Врач
            <select
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              data-testid="filter-doctor"
            >
              <option value="">Все врачи</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Дата
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              data-testid="filter-date"
            />
          </label>
          <button onClick={() => { setFilterDoctor(''); setFilterDate(''); }} data-testid="filter-reset">
            Сбросить
          </button>
        </div>

        {appointments.length === 0 ? (
          <p data-testid="admin-no-appointments">Записей не найдено.</p>
        ) : (
          <table className="appointments-table" data-testid="admin-appointments-table">
            <thead>
              <tr>
                <th>Пациент</th>
                <th>Врач</th>
                <th>Дата</th>
                <th>Время</th>
                <th>Статус</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} data-testid={`admin-row-${a.id}`}>
                  <td>{a.patientName}</td>
                  <td>{a.doctorName}</td>
                  <td>{a.date}</td>
                  <td>{a.timeSlot}</td>
                  <td>{STATUS_LABEL[a.status] ?? a.status}</td>
                  <td>
                    {a.status === 'active' ? (
                      <button
                        className="btn-danger"
                        data-testid={`admin-cancel-${a.id}`}
                        onClick={() => handleCancelAppointment(a.id)}
                      >
                        Отменить
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
      </section>

      <section className="admin-section">
        <h2>Расписание врача</h2>
        <div className="admin-filters">
          <label>
            Врач
            <select
              value={schedDoctor}
              onChange={(e) => setSchedDoctor(e.target.value)}
              data-testid="schedule-doctor"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Дата
            <input
              type="date"
              value={schedDate}
              onChange={(e) => setSchedDate(e.target.value)}
              data-testid="schedule-date"
            />
          </label>
          <label>
            Новый слот
            <input
              type="time"
              value={newSlotTime}
              onChange={(e) => setNewSlotTime(e.target.value)}
              data-testid="schedule-new-time"
            />
          </label>
          <button onClick={handleAddSlot} data-testid="schedule-add">
            Добавить слот
          </button>
        </div>

        {schedSlots.length === 0 ? (
          <p data-testid="schedule-empty">Слотов нет (выберите врача и дату).</p>
        ) : (
          <table className="appointments-table" data-testid="schedule-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Время</th>
                <th>Статус</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {schedSlots.map((s) => (
                <tr key={s.id} data-testid={`schedule-row-${s.id}`}>
                  <td>{s.date}</td>
                  <td>{s.timeSlot}</td>
                  <td>{s.isBooked ? 'Занят' : 'Свободен'}</td>
                  <td>
                    {!s.isBooked && (
                      <button
                        className="btn-danger"
                        data-testid={`schedule-delete-${s.id}`}
                        onClick={() => handleDeleteSlot(s.id)}
                      >
                        Удалить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
