// Маршруты врачей: список и свободные слоты.

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/asyncHandler';
import { slotsQuerySchema } from '../schemas';
import { getFreeSlots } from '../services/appointments.service';
import type { DoctorDTO } from '../../../shared/types';

export const doctorsRouter = Router();

// GET /api/doctors — список врачей-офтальмологов
doctorsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const doctors = await prisma.doctor.findMany({ orderBy: { fullName: 'asc' } });
    const body: DoctorDTO[] = doctors.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      specialty: d.specialty,
    }));
    res.json(body);
  })
);

// GET /api/doctors/:id/slots?date=YYYY-MM-DD — свободные интервалы на дату
doctorsRouter.get(
  '/:id/slots',
  asyncHandler(async (req, res) => {
    const { date } = slotsQuerySchema.parse(req.query);
    const slots = await getFreeSlots(req.params.id, date);
    res.json(slots);
  })
);
