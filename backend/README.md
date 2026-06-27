# Backend (Briefer)

Публичный API: аутентификация, встречи, стенограммы. NestJS + TypeORM + PostgreSQL.

Единственная точка входа для Frontend и внешних клиентов.

## Требования

- Node.js 20+
- PostgreSQL 14+

## Установка и запуск

```bash
npm install
cp .env.example .env
# Создайте БД: createdb briefer
npm run start:dev
```

Порт по умолчанию: **5000**.

При `DB_SYNCHRONIZE=true` схема создаётся автоматически (**только dev**).

## Конфигурация (`.env`)

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=briefer
DB_SYNCHRONIZE=true

JWT_SECRET=change-me
AUTH_DEV_EXPOSE_OTP=true

AURA_URL=http://localhost:4000
INTERNAL_API_TOKEN=dev-internal-token
CORS_ORIGIN=http://localhost:5173
```

## Auth: телефон + OTP + TOTP

### Регистрация

```http
POST /auth/otp/send
{ "phone": "+79991234567", "purpose": "register" }

POST /auth/otp/verify
{ "phone": "+79991234567", "code": "123456", "purpose": "register" }
```

В dev (`AUTH_DEV_EXPOSE_OTP=true`) код OTP возвращается в ответе.

### Вход с TOTP

Если включён authenticator, `verify` без `totpCode` вернёт `{ "requiresTotp": true }`.

### Настройка TOTP

```http
POST /auth/totp/setup    # Bearer → otpauthUrl
POST /auth/totp/confirm  # { code }
DELETE /auth/totp
```

SMS: `ConsoleSmsGateway` в dev; prod — Twilio/SMS.ru через DI.

## Meetings (JWT)

```http
POST /meetings
{ "url": "https://telemost.yandex.ru/j/...", "botName": "Аура" }

POST /meetings/:id/stop
GET  /meetings
GET  /meetings/:id/transcript
GET  /meetings/:id/transcript/stream   # SSE
GET  /meetings/:id/summary             # выжимка (Ollama через Audioray)
POST /meetings/:id/summary/regenerate
GET  /meetings/:id/tasks
PATCH /meetings/:id/tasks/:taskId      # { completed: true/false }
```

## Internal API (Aura → Backend)

`X-Internal-Token: <INTERNAL_API_TOKEN>`

```http
POST /internal/transcript-segments
PATCH /internal/meetings/:id/status
```

## Health

```http
GET /health
```

## Структура

```
src/
├── auth/
├── users/
├── meetings/
├── transcripts/
├── aura-client/
├── internal/
└── config/
```

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run start:dev` | Dev |
| `npm run build` | Сборка |
| `npm run migration:run` | Применить миграции |
| `npm run migration:revert` | Откатить последнюю миграцию |
| `npm run migration:show` | Статус миграций |

## Миграции

```bash
# Новая БД (prod/staging)
DB_SYNCHRONIZE=false DB_MIGRATE=true npm run start:prod

# Или вручную
npm run migration:run
```

Файлы: `src/migrations/`, CLI: `src/data-source.ts`

## См. также

- [QUICK_START.md](../QUICK_START.md)
- [docs/architecture.md](../docs/architecture.md)
- [frontend/README.md](../frontend/README.md)
