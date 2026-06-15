// Служебные эндпоинты для автотестов. Монтируются ТОЛЬКО при NODE_ENV=test
// (см. app.ts). Позволяют подготовить и очистить данные под конкретный тест.
//
// ВНИМАНИЕ: в production/development этот роутер не подключается — это важно
// с точки зрения безопасности (никакого служебного доступа в боевой среде).

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/asyncHandler';
import { testSeedSlotSchema } from '../schemas';
import { z } from 'zod';

export const testRouter = Router();

// POST /api/test/reset — полная очистка прикладных данных.
testRouter.post(
  '/reset',
  asyncHandler(async (_req, res) => {
    // Порядок важен из-за внешних ключей.
    await prisma.appointment.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.doctor.deleteMany();
    await prisma.user.deleteMany();
    res.json({ ok: true });
  })
);

// POST /api/test/patient — создать (или вернуть существующего) тестового пациента.
const testPatientSchema = z.object({
  email: z.string().email().default('e2e-patient@test.local'),
  password: z.string().min(6).default('E2ePass123!'),
  fullName: z.string().default('E2E Пациент'),
});

testRouter.post(
  '/patient',
  asyncHandler(async (req, res) => {
    const { email, password, fullName } = testPatientSchema.parse(req.body ?? {});
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, fullName },
      create: { email, passwordHash, fullName, role: 'patient' },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      password, // отдаём явно, чтобы тест мог залогиниться
      fullName: user.fullName,
      role: user.role,
    });
  })
);

// POST /api/test/slot — гарантированно создать свободный слот.
// Если doctorId не передан — создаётся тестовый врач.
testRouter.post(
  '/slot',
  asyncHandler(async (req, res) => {
    const input = testSeedSlotSchema.parse(req.body ?? {});

    let doctorId = input.doctorId;
    if (!doctorId) {
      const doctor = await prisma.doctor.create({
        data: { fullName: 'E2E Врач', specialty: 'Офтальмолог' },
      });
      doctorId = doctor.id;
    }

    const date = input.date ?? new Date().toISOString().slice(0, 10);
    const timeSlot = input.timeSlot ?? '09:00';

    const slot = await prisma.schedule.upsert({
      where: { doctorId_date_timeSlot: { doctorId, date, timeSlot } },
      update: { isBooked: false },
      create: { doctorId, date, timeSlot, isBooked: false },
    });

    res.status(201).json(slot);
  })
);

// DELETE /api/test/patient/:email — удалить тестового пациента и его записи.
testRouter.delete(
  '/patient/:email',
  asyncHandler(async (req, res) => {
    const email = req.params.email;
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.appointment.deleteMany({ where: { patientId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    res.json({ ok: true });
  })
);
