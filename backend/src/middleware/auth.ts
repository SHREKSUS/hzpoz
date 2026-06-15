// Middleware аутентификации/авторизации по JWT.

import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../lib/jwt';
import { HttpError } from '../lib/httpError';
import type { Role } from '../../../shared/types';

// Расширяем Request, чтобы хранить распарсенного пользователя.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Требует валидный Bearer-токен. Иначе 401. */
export function authRequired(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(HttpError.unauthorized('Отсутствует токен доступа'));
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    // Не раскрываем, истёк токен или подделан — просто 401.
    return next(HttpError.unauthorized('Недействительный или истёкший токен'));
  }
}

/** Требует, чтобы у пользователя была одна из перечисленных ролей. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(HttpError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(HttpError.forbidden());
    }
    return next();
  };
}
