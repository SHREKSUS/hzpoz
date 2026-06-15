# --- Frontend образ ---
FROM node:20-alpine
WORKDIR /app

# Зависимости отдельно для кэша.
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install

# Исходники фронтенда и общие типы.
WORKDIR /app
COPY frontend ./frontend
COPY shared ./shared

WORKDIR /app/frontend
RUN npm run build

# vite preview раздаёт собранный билд и проксирует /api на backend
# (адрес backend задаётся переменной VITE_API_PROXY в docker-compose).
EXPOSE 5173
CMD ["npm", "run", "preview"]
