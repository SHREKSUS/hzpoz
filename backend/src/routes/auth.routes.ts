// Маршруты аутентификации: регистрация и вход пациента.

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { asyncHandler } from '../lib/asyncHandler';
import { HttpError } from '../lib/httpError';
import { registerSchema, loginSchema } from '../schemas';
import type { AuthResponse, UserDTO } from '../../../shared/types';

export const authRouter = Router();

function toUserDTO(u: {
  id: string;
  email: string;
  role: string;
  fullName: string;
}): UserDTO {
  return {
    id: u.id,
    email: u.email,
    role: u.role as UserDTO['role'],
    fullName: u.fullName,
  };
}

// POST /api/auth/register — регистрация пациента
authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, fullName } = registerSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      // Намеренно общее сообщение, без указания, что именно email занят? —
      // в учебном проекте удобнее явное, но безопасное сообщение.
      throw HttpError.conflict('Пользователь с таким email уже существует', 'EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName, role: 'patient' },
    });

    const token = signToken({ sub: user.id, role: 'patient', email: user.email });
    const body: AuthResponse = { token, user: toUserDTO(user) };
    res.status(201).json(body);
  })
);

// POST /api/auth/login — авторизация, возвращает JWT
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    // Одинаковое сообщение при неверном email и пароле — не раскрываем,
    // существует ли пользователь.
    if (!user) {
      throw HttpError.unauthorized('Неверный email или пароль', 'INVALID_CREDENTIALS');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw HttpError.unauthorized('Неверный email или пароль', 'INVALID_CREDENTIALS');
    }

    const token = signToken({
      sub: user.id,
      role: user.role as UserDTO['role'],
      email: user.email,
    });
    const body: AuthResponse = { token, user: toUserDTO(user) };
    res.status(200).json(body);
  })
);
