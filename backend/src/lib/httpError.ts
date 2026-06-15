// Класс прикладной ошибки с HTTP-статусом и безопасным сообщением.
// Используется во всех роутах вместо «голых» throw, чтобы errorHandler
// мог вернуть корректный код и не раскрыть внутренности системы.

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'HttpError';
  }

  static badRequest(message: string, code = 'BAD_REQUEST') {
    return new HttpError(400, code, message);
  }
  static unauthorized(message = 'Требуется авторизация', code = 'UNAUTHORIZED') {
    return new HttpError(401, code, message);
  }
  static forbidden(message = 'Недостаточно прав', code = 'FORBIDDEN') {
    return new HttpError(403, code, message);
  }
  static notFound(message = 'Ресурс не найден', code = 'NOT_FOUND') {
    return new HttpError(404, code, message);
  }
  static conflict(message: string, code = 'CONFLICT') {
    return new HttpError(409, code, message);
  }
}
