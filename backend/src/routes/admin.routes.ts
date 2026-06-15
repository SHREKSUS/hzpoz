// Маршруты регистратора (роль registrar): все записи с фильтрами,
// управление расписанием врачей.

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/asyncHandler';
import { authRequired, requireRole } from '../middleware/auth';
import { adminFilterSchema } from '../schemas';
import { toAppointmentDTO } from '../services/appointments.service';
import { z } from 'zod';
import { HttpError } from '../lib/httpError';

export const adminRouter = Router();

// Все маршруты требуют роль регистратора.
adminRouter.use(authRequired, requireRole('registrar'));

// GET /api/admin/appointments — все записи с фильтрами по врачу/дате/статусу
adminRouter.get(
  '/appointments',
  asyncHandler(async (req, res) => {
    const { doctorId, date, status } = adminFilterSchema.parse(req.query);
    const items = await prisma.appointment.findMany({
      where: {
        ...(doctorId ? { doctorId } : {}),
        ...(date ? { date } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
      include: { doctor: true, patient: true },
    });
    res.json(items.map(toAppointmentDTO));
  })
);

// GET /api/admin/schedule?doctorId=&date= — расписание врача (все слоты)
const scheduleQuery = z.object({
  doctorId: z.string().min(1, 'Укажите врача'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате YYYY-MM-DD').optional(),
});

adminRouter.get(
  '/schedule',
  asyncHandler(async (req, res) => {
    const { doctorId, date } = scheduleQuery.parse(req.query);
    const slots = await prisma.schedule.findMany({
      where: { doctorId, ...(date ? { date } : {}) },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });
    res.json(slots);
  })
);

// POST /api/admin/schedule — добавить слот в расписание врача
const addSlotSchema = z.object({
  doctorId: z.string().min(1, 'Укажите врача'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате YYYY-MM-DD'),
  timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время в формате HH:mm'),
});

adminRouter.post(
  '/schedule',
  asyncHandler(async (req, res) => {
    const { doctorId, date, timeSlot } = addSlotSchema.parse(req.body);

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw HttpError.notFound('Врач не найден', 'DOCTOR_NOT_FOUND');

    const existing = await prisma.schedule.findUnique({
      where: { doctorId_date_timeSlot: { doctorId, date, timeSlot } },
    });
    if (existing) {
      throw HttpError.conflict('Такой слот уже есть в расписании', 'SLOT_EXISTS');
    }

    const slot = await prisma.schedule.create({
      data: { doctorId, date, timeSlot, isBooked: false },
    });
    res.status(201).json(slot);
  })
);

// DELETE /api/admin/schedule/:id — удалить свободный слот
adminRouter.delete(
  '/schedule/:id',
  asyncHandler(async (req, res) => {
    const slot = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!slot) throw HttpError.notFound('Слот не найден', 'SLOT_NOT_FOUND');
    if (slot.isBooked) {
      throw HttpError.badRequest('Нельзя удалить занятый слот', 'SLOT_BOOKED');
    }
    await prisma.schedule.delete({ where: { id: req.params.id } });
    res.status(200).json({ ok: true });
  })
);
