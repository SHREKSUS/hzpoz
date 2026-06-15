# --- Backend образ ---
FROM node:20-alpine AS base
WORKDIR /app

# Устанавливаем зависимости отдельно для кэширования слоёв.
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

# Копируем исходники backend и общие типы.
WORKDIR /app
COPY backend ./backend
COPY shared ./shared

WORKDIR /app/backend

# В Docker используем PostgreSQL — переключаем datasource-провайдер.
RUN npm run use:postgres && npx prisma generate

# Точка входа: применяем схему к БД, сидируем и запускаем dev-сервер.
# (db push + seed на старте удобны для учебного/тестового окружения.)
ENV NODE_ENV=development
EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run seed && npm run dev"]
