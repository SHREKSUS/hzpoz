// Общие типы, используемые backend и frontend.
// Держим их в одном месте, чтобы контракт API был единым источником правды.

export type Role = 'patient' | 'registrar';

export type AppointmentStatus = 'active' | 'cancelled' | 'completed';

export interface UserDTO {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}

export interface DoctorDTO {
  id: string;
  fullName: string;
  specialty: string;
}

export interface SlotDTO {
  /** ISO-дата приёма, например "2026-06-15" */
  date: string;
  /** Интервал времени, например "10:00" */
  timeSlot: string;
}

export interface AppointmentDTO {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  date: string;
  timeSlot: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserDTO;
}

export interface ApiError {
  /** Машиночитаемый код ошибки */
  error: string;
  /** Человекочитаемое сообщение без раскрытия внутренностей системы */
  message: string;
}
