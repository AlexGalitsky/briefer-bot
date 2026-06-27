# Aura

Internal worker: Puppeteer-бот для видеосозвонов. Захватывает аудио, отправляет в Audioray, пушит сегменты стенограммы в Backend.

**Не имеет публичного API** — вызывается только из Backend с заголовком `X-Internal-Token`.

## Требования

- Node.js 20+
- Chromium (устанавливается с Puppeteer)
- Запущенные Audioray и Backend

## Установка и запуск

```bash
npm install
cp .env.example .env
npm run start:dev
```

Порт по умолчанию: **4000**.

## Конфигурация (`.env`)

```env
PORT=4000
BACKEND_URL=http://localhost:5000
INTERNAL_API_TOKEN=dev-internal-token
AUDIORAY_URL=http://localhost:3000/api/whisper/transcribe
BOT_CHUNK_INTERVAL_MS=6000
```

`INTERNAL_API_TOKEN` должен совпадать с `backend/.env`.

## API (internal only)

Заголовок: `X-Internal-Token: <token>`

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/bot/start` | `{ meetingId, url, botName }` |
| POST | `/bot/stop` | Остановить бота |
| GET | `/bot/status` | `{ active, platform, meetingId? }` |

## Платформы

| Платформа | Статус |
|-----------|--------|
| Yandex Telemost | ✅ Реализован |
| Google Meet | 🔴 Заглушка |

Новая платформа: `src/bot/platforms/<name>/` + регистрация в `bot.factory.ts`.

## Структура

```
src/
├── config/
├── bot/
│   ├── bot.controller.ts
│   ├── bot.service.ts
│   ├── bot.factory.ts
│   └── platforms/
│       ├── telemost/
│       └── google-meet/
├── transcription/
│   ├── audioray.client.ts
│   └── backend.client.ts
└── internal/
    └── internal-api.guard.ts
```

## Поток данных

1. Backend вызывает `POST /bot/start`
2. Бот входит в Telemost, пишет WebM чанки
3. Чанки → Audioray → текст
4. Текст → Backend (`POST /internal/transcript-segments`)

## Отладка

- `recordings/` — локальные WebM чанки
- Headless: по умолчанию `true`; для отладки UI — env в `base-bot.ts`
- Логи join/speaker/chunk в консоли

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run start:dev` | Dev с hot reload |
| `npm run build` | Сборка |
| `npm run start:prod` | Продакшн |

## См. также

- [QUICK_START.md](../QUICK_START.md)
- [docs/architecture.md](../docs/architecture.md)
- [audioray/README.md](../audioray/README.md)
