// Главная страница записи: выбор врача -> дата -> свободный интервал.
// После выбора слота переходим на страницу подтверждения.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorsApi, extractError } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import type { DoctorDTO, SlotDTO } from '../../../shared/types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookingPage() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<DoctorDTO[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<SlotDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Загружаем список врачей один раз.
  useEffect(() => {
    doctorsApi
      .list()
      .then((list) => {
        setDoctors(list);
        if (list.length) setDoctorId(list[0].id);
      })
      .catch((err) => setError(extractError(err)));
  }, []);

  // Перезагружаем слоты при смене врача/даты.
  useEffect(() => {
    if (!doctorId || !date) return;
    setLoadingSlots(true);
    setError(null);
    doctorsApi
      .slots(doctorId, date)
      .then((s) => setSlots(s))
      .catch((err) => {
        setError(extractError(err));
        setSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [doctorId, date]);

  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  const handlePickSlot = (slot: SlotDTO) => {
    // Передаём выбор на страницу подтверждения через router state.
    navigate('/confirm', {
      state: {
        doctorId,
        doctorName: selectedDoctor?.fullName ?? '',
        date,
        timeSlot: slot.timeSlot,
      },
    });
  };

  return (
    <div className="booking-page" data-testid="booking-page">
      <h1>Запись на приём</h1>

      <ErrorBanner message={error} testId="booking-error" />

      <div className="booking-controls">
        <label>
          Врач
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            data-testid="doctor-select"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} — {d.specialty}
              </option>
            ))}
          </select>
        </label>

        <label>
          Дата
          <input
            type="date"
            value={date}
            min={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            data-testid="date-input"
          />
        </label>
      </div>

      <h2>Свободное время</h2>
      {loadingSlots ? (
        <p data-testid="slots-loading">Загрузка слотов…</p>
      ) : slots.length === 0 ? (
        <p data-testid="no-slots">На выбранную дату свободных интервалов нет.</p>
      ) : (
        <div className="slots-grid" data-testid="slots-grid">
          {slots.map((s) => (
            <button
              key={s.timeSlot}
              className="slot-btn"
              data-testid={`slot-${s.timeSlot}`}
              onClick={() => handlePickSlot(s)}
            >
              {s.timeSlot}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
