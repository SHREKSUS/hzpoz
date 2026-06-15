// Маршруты записей пациента (все требуют валидный токен).

import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { authRequired } from '../middleware/auth';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from '../schemas';
import {
  createAppointment,
  listPatientAppointments,
  cancelAppointment,
  rescheduleAppointment,
} from '../services/appointments.service';

export const appointmentsRouter = Router();

// Все маршруты ниже защищены.
appointmentsRouter.use(authRequired);

// POST /api/appointments — создать запись
appointmentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { doctorId, date, timeSlot } = createAppointmentSchema.parse(req.body);
    const appt = await createAppointment(req.user!.sub, doctorId, date, timeSlot);
    res.status(201).json(appt);
  })
);

// GET /api/appointments — записи текущего пациента
appointmentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await listPatientAppointments(req.user!.sub);
    res.json(items);
  })
);

// PUT /api/appointments/:id — перенос/изменение записи
appointmentsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { doctorId, date, timeSlot } = updateAppointmentSchema.parse(req.body);
    const isAdmin = req.user!.role === 'registrar';
    const appt = await rescheduleAppointment(
      req.params.id,
      req.user!.sub,
      isAdmin,
      date!,
      timeSlot!,
      doctorId
    );
    res.json(appt);
  })
);

// DELETE /api/appointments/:id — отмена записи
appointmentsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const isAdmin = req.user!.role === 'registrar';
    const appt = await cancelAppointment(req.params.id, req.user!.sub, isAdmin);
    res.json(appt);
  })
);
