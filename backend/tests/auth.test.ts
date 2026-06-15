// Unit/интеграционные заготовки для auth-флоу через supertest.
// Запуск: npm test (требует прогнанной миграции/схемы для test.db).

import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

beforeAll(async () => {
  // Чистим прикладные данные перед прогоном.
  await prisma.appointment.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Аутентификация', () => {
  const email = 'jest-user@test.local';
  const password = 'JestPass123!';

  it('регистрирует нового пациента и возвращает 201 + токен', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password, fullName: 'Jest Пациент' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe('patient');
  });

  it('не даёт зарегистрировать тот же email повторно (409)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password, fullName: 'Дубликат' });
    expect(res.status).toBe(409);
  });

  it('отклоняет невалидные данные (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('логинит и возвращает JWT (200)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('отклоняет неверный пароль (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });
});

describe('Защита маршрутов', () => {
  it('возвращает 401 без токена', async () => {
    const res = await request(app).get('/api/appointments');
    expect(res.status).toBe(401);
  });

  it('возвращает 401 с битым токеном', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', 'Bearer broken.token.here');
    expect(res.status).toBe(401);
  });
});
