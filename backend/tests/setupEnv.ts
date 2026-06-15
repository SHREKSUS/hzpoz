// Гарантируем тестовое окружение до загрузки конфигурации приложения.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-32-characters-long-xxx';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';
