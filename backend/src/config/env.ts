// Централизованное чтение и валидация переменных окружения через zod.
// Ничего не захардкожено: всё приходит из .env (см. .env.example).

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL обязателен'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET должен быть не короче 8 символов'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  // CORS: адрес фронтенда (для dev — Vite на 5173)
  CORS_ORIGIN: z.string().default('*'),
  // Учётные данные сеяных тестовых пользователей — берём из окружения,
  // чтобы автотесты могли логиниться без хардкода в коде.
  SEED_PATIENT_EMAIL: z.string().email().default('patient@test.local'),
  SEED_PATIENT_PASSWORD: z.string().min(6).default('Patient123!'),
  SEED_REGISTRAR_EMAIL: z.string().email().default('registrar@test.local'),
  SEED_REGISTRAR_PASSWORD: z.string().min(6).default('Registrar123!'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Падаем рано и понятно, если конфигурация некорректна.
  console.error('Ошибка конфигурации окружения:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isTest = env.NODE_ENV === 'test';
export const isProd = env.NODE_ENV === 'production';
