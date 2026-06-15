// zod-схемы валидации входных данных API.

import { z } from 'zod';

// "YYYY-MM-DD"
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD');

// "HH:mm"
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время должно быть в формате HH:mm');

export const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z
    .string()
    .min(6, 'Пароль должен быть не короче 6 символов')
    .max(128, 'Пароль слишком длинный'),
  fullName: z.string().min(1, 'Укажите ФИО').max(120),
});

export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

export const createAppointmentSchema = z.object({
  doctorId: z.string().min(1, 'Не выбран врач'),
  date: dateString,
  timeSlot: timeString,
});

export const updateAppointmentSchema = z
  .object({
    doctorId: z.string().min(1).optional(),
    date: dateString.optional(),
    timeSlot: timeString.optional(),
  })
  .refine((v) => v.date !== undefined && v.timeSlot !== undefined, {
    message: 'Для переноса укажите дату и время',
  });

export const slotsQuerySchema = z.object({
  date: dateString,
});

export const adminFilterSchema = z.object({
  doctorId: z.string().optional(),
  date: dateString.optional(),
  status: z.enum(['active', 'cancelled', 'completed']).optional(),
});

// Служебный тест-эндпоинт
export const testSeedSlotSchema = z.object({
  doctorId: z.string().optional(),
  date: dateString.optional(),
  timeSlot: timeString.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
