// Axios-клиент. Прокидывает Bearer-токен и аккуратно обрабатывает 401.

import axios, { AxiosError } from 'axios';
import type {
  ApiError,
  AuthResponse,
  DoctorDTO,
  SlotDTO,
  AppointmentDTO,
  UserDTO,
} from '../../../shared/types';

const baseURL = import.meta.env.VITE_API_BASE || '/api';

export const api = axios.create({ baseURL });

const TOKEN_KEY = 'eyeclinic_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Подставляем токен в каждый запрос.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Колбэк, вызываемый при истёкшей сессии (401). Назначается из AuthContext.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

/** Достаёт человекочитаемое сообщение об ошибке из ответа API. */
export function extractError(err: unknown): string {
  const ax = err as AxiosError<ApiError>;
  if (ax.response?.data?.message) return ax.response.data.message;
  if (ax.message) return ax.message;
  return 'Произошла ошибка. Попробуйте ещё раз.';
}

// --- Типизированные вызовы API ---

export const authApi = {
  register: (data: { email: string; password: string; fullName: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
};

export const doctorsApi = {
  list: () => api.get<DoctorDTO[]>('/doctors').then((r) => r.data),
  slots: (doctorId: string, date: string) =>
    api
      .get<SlotDTO[]>(`/doctors/${doctorId}/slots`, { params: { date } })
      .then((r) => r.data),
};

export const appointmentsApi = {
  list: () => api.get<AppointmentDTO[]>('/appointments').then((r) => r.data),
  create: (data: { doctorId: string; date: string; timeSlot: string }) =>
    api.post<AppointmentDTO>('/appointments', data).then((r) => r.data),
  cancel: (id: string) =>
    api.delete<AppointmentDTO>(`/appointments/${id}`).then((r) => r.data),
  reschedule: (id: string, data: { doctorId?: string; date: string; timeSlot: string }) =>
    api.put<AppointmentDTO>(`/appointments/${id}`, data).then((r) => r.data),
};

export const patientsApi = {
  me: () => api.get<UserDTO>('/patients/me').then((r) => r.data),
};

export const adminApi = {
  appointments: (filters: { doctorId?: string; date?: string; status?: string }) =>
    api
      .get<AppointmentDTO[]>('/admin/appointments', { params: filters })
      .then((r) => r.data),
  schedule: (doctorId: string, date?: string) =>
    api
      .get('/admin/schedule', { params: { doctorId, date } })
      .then((r) => r.data),
  addSlot: (data: { doctorId: string; date: string; timeSlot: string }) =>
    api.post('/admin/schedule', data).then((r) => r.data),
  deleteSlot: (id: string) =>
    api.delete(`/admin/schedule/${id}`).then((r) => r.data),
};
