// Единый обработчик ошибок. Возвращает безопасный JSON вида { error, message }.
// Внутренние детали (stack, SQL и т.п.) НЕ уходят клиенту.

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/httpError';
import type { ApiError } from '../../../shared/types';

export function notFoundHandler(_req: Request, res: Response) {
  const body: ApiError = { error: 'NOT_FOUND', message: 'Маршрут не найден' };
  res.status(404).json(body);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  // Ошибки валидации zod -> 400 с понятным, но безопасным описанием.
  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => `${i.path.join('.') || 'поле'}: ${i.message}`)
      .join('; ');
    const body: ApiError = { error: 'VALIDATION_ERROR', message };
    return res.status(400).json(body);
  }

  if (err instanceof HttpError) {
    const body: ApiError = { error: err.code, message: err.message };
    return res.status(err.status).json(body);
  }

  // Всё остальное — внутренняя ошибка. Логируем у себя, клиенту — общий текст.
  // eslint-disable-next-line no-console
  console.error('Внутренняя ошибка:', err);
  const body: ApiError = {
    error: 'INTERNAL_ERROR',
    message: 'Внутренняя ошибка сервера',
  };
  return res.status(500).json(body);
}
