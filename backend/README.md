# Backend (Briefer)

Публичный API: auth, встречи, стенограммы. TypeORM + PostgreSQL.

## Запуск

```bash
cp .env.example .env
# Поднимите PostgreSQL и создайте БД briefer
npm install
npm run start:dev
```

При `DB_SYNCHRONIZE=true` схема создаётся автоматически (только dev).

## Auth: телефон + OTP + TOTP

### Регистрация

```http
POST /auth/otp/send
{ "phone": "+79991234567", "purpose": "register" }

POST /auth/otp/verify
{ "phone": "+79991234567", "code": "123456", "purpose": "register" }
```

В dev (`AUTH_DEV_EXPOSE_OTP=true`) код OTP возвращается в ответе `send` и пишется в лог SMS-шлюза.

### Вход

```http
POST /auth/otp/send
{ "phone": "+79991234567", "purpose": "login" }

POST /auth/otp/verify
{ "phone": "+79991234567", "code": "123456", "purpose": "login" }
```

Если у пользователя включён TOTP (authenticator app), ответ `verify` без `totpCode`:

```json
{ "requiresTotp": true, "phone": "+79991234567" }
```

Повторите с `totpCode`:

```json
{ "phone": "+79991234567", "code": "123456", "purpose": "login", "totpCode": "654321" }
```

### Настройка TOTP (Google Authenticator)

```http
POST /auth/totp/setup
Authorization: Bearer <token>
→ { "otpauthUrl": "otpauth://totp/..." }

POST /auth/totp/confirm
{ "code": "123456" }

DELETE /auth/totp
```

### Архитектура SMS

- `SmsGateway` — интерфейс (`auth/sms/sms-gateway.interface.ts`)
- `ConsoleSmsGateway` — dev-реализация (лог в консоль)
- Prod: подключите провайдера (Twilio, SMS.ru) через DI в `AuthModule`

## Meetings (требуется JWT)

```http
POST /meetings
Authorization: Bearer <token>
{ "url": "https://telemost.yandex.ru/j/...", "botName": "Аура" }

POST /meetings/:id/stop

GET /meetings
GET /meetings/:id/transcript
GET /meetings/:id/transcript/stream   # SSE
```

## Internal API (Aura → Backend)

Заголовок: `X-Internal-Token: <INTERNAL_API_TOKEN>`

```http
POST /internal/transcript-segments
PATCH /internal/meetings/:id/status
```

## Health

```http
GET /health
```
