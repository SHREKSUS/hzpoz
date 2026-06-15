// Сборка Express-приложения. Вынесено отдельно от server.ts,
// чтобы Jest/supertest могли импортировать app без поднятия сети.

import express from 'express';
import cors from 'cors';
import { env, isTest } from './config/env';
import { authRouter } from './routes/auth.routes';
import { doctorsRouter } from './routes/doctors.routes';
import { appointmentsRouter } from './routes/appointments.routes';
import { patientsRouter } from './routes/patients.routes';
import { adminRouter } from './routes/admin.routes';
import { testRouter } from './routes/test.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    })
  );
  app.use(express.json());

  // Health-check — удобно для Docker и мониторинга тестов.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', env: env.NODE_ENV });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/doctors', doctorsRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/admin', adminRouter);

  // Служебные тест-эндпоинты доступны ТОЛЬКО в окружении test.
  if (isTest) {
    app.use('/api/test', testRouter);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
