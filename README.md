# Офтальмологический центр — веб-сервис электронной записи

Учебный full-stack проект: запись пациентов на приём к офтальмологу.
Спроектирован удобным для автоматизированного тестирования (Selenium,
Postman/Newman, JMeter, OWASP ZAP).

## Стек

- **Backend:** Node.js + TypeScript + Express, REST API
- **БД:** Prisma ORM. По умолчанию — SQLite (без внешней БД). В Docker — PostgreSQL.
- **Frontend:** React + TypeScript + Vite, маршрутизация react-router
- **Auth:** JWT (`Authorization: Bearer <token>`)
- **Валидация:** zod
- **Тесты:** Jest (+ supertest) — заготовки

## Структура репозитория

```
backend/    REST API, Prisma-схема, сидинг, тесты
frontend/   React-приложение (Vite)
shared/     Общие TypeScript-типы (контракт API)
openapi.yaml             Спецификация API (для ZAP/документации)
postman_collection.json  Коллекция запросов (для Newman)
docker-compose.yml       Поднятие всего стека одной командой
```

## Роли

| Роль | Возможности |
|------|-------------|
| **Пациент** | регистрация, вход, запись на приём, просмотр и отмена своих записей |
| **Регистратор** | все записи с фильтрами, отмена записей, управление расписанием врачей |

Тестовые учётные данные (создаются сидингом, задаются в `.env`):

- Пациент: `patient@test.local` / `Patient123!`
- Регистратор: `registrar@test.local` / `Registrar123!`

---

## Вариант A. Запуск через Docker Compose (PostgreSQL)

Поднимает БД, backend и frontend одной командой. Backend на старте применяет
схему и запускает сидинг.

```bash
docker compose up --build
```

После запуска:

- **Фронтенд:** http://localhost:5173
- **API:** http://localhost:4000/api
- **PostgreSQL:** localhost:5432 (`clinic` / `clinic`)

Остановить: `docker compose down` (с очисткой БД: `docker compose down -v`).

---

## Вариант B. Локальный запуск (SQLite, без Docker)

Требуется Node.js 20+.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env          # при необходимости отредактируйте
npm run db:push               # применить схему к SQLite (dev.db)
npm run seed                  # наполнить БД синтетическими данными
npm run dev                   # API на http://localhost:4000
```

### 2. Frontend (в отдельном терминале)

```bash
cd frontend
npm install
cp .env.example .env          # опционально
npm run dev                   # фронтенд на http://localhost:5173
```

Фронтенд проксирует `/api` на backend (см. `frontend/vite.config.ts`).

---

## Переменные окружения

### backend/.env

| Переменная | Назначение | Пример |
|-----------|-----------|--------|
| `NODE_ENV` | окружение | `development` / `test` / `production` |
| `PORT` | порт API | `4000` |
| `DATABASE_URL` | строка подключения БД | `file:./dev.db` или `postgresql://...` |
| `JWT_SECRET` | секрет подписи токенов (≥ 8 симв.) | — |
| `JWT_EXPIRES_IN` | срок жизни токена | `2h` |
| `CORS_ORIGIN` | разрешённый origin фронтенда | `http://localhost:5173` |
| `SEED_PATIENT_EMAIL` / `_PASSWORD` | тестовый пациент | — |
| `SEED_REGISTRAR_EMAIL` / `_PASSWORD` | тестовый регистратор | — |

### frontend/.env

| Переменная | Назначение | По умолчанию |
|-----------|-----------|--------------|
| `VITE_API_BASE` | базовый путь API | `/api` |
| `VITE_API_PROXY` | адрес backend для dev-прокси | `http://localhost:4000` |

Ничего не захардкожено — всё конфигурируется через `.env`.

---

## Команды backend

| Команда | Действие |
|---------|----------|
| `npm run dev` | запуск API в режиме разработки |
| `npm run build` / `npm start` | сборка и запуск production-сборки |
| `npm run db:push` | применить Prisma-схему к БД |
| `npm run seed` | наполнить БД синтетическими данными |
| `npm test` | прогон Jest-тестов (см. ниже) |
| `npm run use:sqlite` / `use:postgres` | переключить провайдер БД |

---

## API (основные эндпоинты)

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| POST | `/api/auth/register` | — | регистрация пациента |
| POST | `/api/auth/login` | — | вход, выдача JWT |
| GET | `/api/doctors` | — | список врачей |
| GET | `/api/doctors/:id/slots?date=` | — | свободные слоты на дату |
| POST | `/api/appointments` | токен | создать запись |
| GET | `/api/appointments` | токен | свои записи |
| PUT | `/api/appointments/:id` | токен | перенос записи |
| DELETE | `/api/appointments/:id` | токен | отмена записи |
| GET | `/api/patients/me` | токен | профиль пользователя |
| GET | `/api/admin/appointments` | регистратор | все записи с фильтрами |
| GET/POST/DELETE | `/api/admin/schedule` | регистратор | управление расписанием |

Коды ответов: `200/201` — успех, `400` — валидация, `401` — нет/битый токен,
`403` — нет прав, `404` — не найдено, `409` — слот занят.

Полная спецификация — в [openapi.yaml](openapi.yaml).

---

## Тестируемость

### data-testid

На ключевых элементах фронтенда проставлены атрибуты `data-testid`
(`email-input`, `doctor-select`, `slot-09:00`, `cancel-button-<id>`,
`admin-appointments-table` и т.д.) — для устойчивых локаторов в Selenium.

### Selenium — автотест интерфейса (с понятным выводом)

Готовый тест проходит весь путь пациента в настоящем браузере Chrome: вход →
выбор врача и времени → запись → проверка в личном кабинете → отмена. Вывод
написан простым языком — видно, какой шаг проверяется и что пошло не так.

Перед запуском должны работать backend и frontend (см. «Локальный запуск»),
а в БД должны быть данные (`npm run seed` в backend).

```bash
cd frontend
npm install                 # один раз (ставит selenium-webdriver и драйвер)
npm run selenium:test       # откроется браузер и пройдёт все шаги
```

Чтобы браузер работал «невидимо» (без окна):

```bash
# PowerShell:
$env:HEADLESS=1; npm run selenium:test
# Bash:
HEADLESS=1 npm run selenium:test
```

В конце тест печатает итог: сколько проверок прошло и есть ли ошибки.
Файл теста: `frontend/tests/selenium/booking.test.js`.

### Служебный тест-эндпоинт (только NODE_ENV=test)

Монтируется **только** при `NODE_ENV=test`. Позволяет автотестам готовить и
очищать данные:

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/test/reset` | очистить все прикладные данные |
| POST | `/api/test/patient` | создать тестового пациента (вернёт пароль) |
| POST | `/api/test/slot` | создать гарантированно свободный слот |
| DELETE | `/api/test/patient/:email` | удалить тестового пациента |

### Запуск Jest-тестов

```bash
cd backend
# отдельная тестовая БД, окружение test
$env:DATABASE_URL="file:./test.db"; $env:NODE_ENV="test"   # PowerShell
npx prisma db push --skip-generate
npm test
```

(в bash: `DATABASE_URL="file:./test.db" NODE_ENV=test ...`)

### Newman (Postman CLI)

```bash
# при запущенном backend на :4000
npx newman run postman_collection.json
```

Коллекция сама сохраняет JWT после логина и проверяет коды ответов
(включая 401 без токена и 409 на занятый слот).

### OWASP ZAP

Импортируйте `openapi.yaml` в ZAP (Import → OpenAPI Definition) для
автоматического обхода и сканирования эндпоинтов.

### JMeter

Цель для нагрузки — `http://localhost:4000/api`. Сценарий: login →
получение слотов → создание записи. JWT берётся из ответа `/auth/login`.

---

## Непрерывная интеграция (GitHub Actions)

При каждом пуше и пул-реквесте автоматически запускается конвейер
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) из четырёх параллельных задач:

| Задача | Что делает |
|--------|-----------|
| **Сборка и проверка типов** | `tsc --noEmit` для backend, сборка frontend (`npm run build`) |
| **Юнит-тесты (Jest)** | поднимает тестовую SQLite-БД и гоняет Jest |
| **API-тесты (Newman)** | наполняет БД, запускает backend, прогоняет Postman-коллекцию |
| **E2E-тесты (Selenium)** | поднимает backend + frontend и проходит сценарий записи в Chrome (headless) |

Запуск также доступен вручную (вкладка **Actions → CI → Run workflow**).

> Бейдж статуса для README (замените `OWNER/REPO` на свой путь после загрузки на GitHub):
> `![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)`

В учебном проекте секреты (`JWT_SECRET`) заданы прямо в workflow. В реальном
проекте их следует хранить в **GitHub Secrets** и подставлять через `${{ secrets.* }}`.

### Jenkins

Те же проверки доступны как декларативный pipeline в [`Jenkinsfile`](Jenkinsfile)
(этапы: *Зависимости → Сборка и типы → Jest → Newman → Selenium*).

Настройка задачи в Jenkins:
1. **New Item → Pipeline** (или Multibranch Pipeline).
2. *Pipeline → Definition*: **Pipeline script from SCM**, укажите репозиторий;
   *Script Path*: `Jenkinsfile`.
3. На агенте должны быть **Node.js 20+**, **Google Chrome** и **curl**.
   Для Node удобно использовать плагин *NodeJS* (раскомментируйте блок `tools`
   в `Jenkinsfile`).

Серверы поднимаются и тестируются в рамках одного shell-шага (чтобы их не
завершил ProcessTreeKiller между шагами), логи backend/frontend сохраняются
как артефакты сборки.

Доступны два файла:

| Файл | Агент | Чем отличается |
|------|-------|----------------|
| [`Jenkinsfile`](Jenkinsfile) | Linux/Unix | команды через `sh`, фоновые серверы через `&` + `trap` |
| [`Jenkinsfile.windows`](Jenkinsfile.windows) | Windows | команды через `bat`, серверы через PowerShell `Start-Process` + `taskkill /T` |

Для Windows-агента в настройке задачи укажите *Script Path*: `Jenkinsfile.windows`.

## Безопасность (учебный уровень)

- Пароли хранятся как bcrypt-хэши.
- Защищённые маршруты возвращают `401` без валидного токена.
- Сообщения об ошибках не раскрывают внутренности системы (единый
  `errorHandler`); при неверном входе — общее «Неверный email или пароль».
- Служебные тест-эндпоинты недоступны вне `NODE_ENV=test`.
