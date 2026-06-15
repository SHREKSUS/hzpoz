// Точка входа: поднимает HTTP-сервер.

import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API запущен на http://localhost:${env.PORT} (env: ${env.NODE_ENV})`);
});
