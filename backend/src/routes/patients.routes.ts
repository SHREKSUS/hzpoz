// Маршрут данных текущего пациента.

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/asyncHandler';
import { authRequired } from '../middleware/auth';
import { HttpError } from '../lib/httpError';
import type { UserDTO } from '../../../shared/types';

export const patientsRouter = Router();

// GET /api/patients/me — данные текущего пользователя
patientsRouter.get(
  '/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw HttpError.notFound('Пользователь не найден', 'USER_NOT_FOUND');

    const body: UserDTO = {
      id: user.id,
      email: user.email,
      role: user.role as UserDTO['role'],
      fullName: user.fullName,
    };
    res.json(body);
  })
);
