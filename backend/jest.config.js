/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // Тесты гоняем в окружении test, чтобы подключился служебный роутер.
  setupFiles: ['<rootDir>/tests/setupEnv.ts'],
};
