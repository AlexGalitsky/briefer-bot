# Briefer Bot

Система для подключения бота к видеосозвонам, live-стенограммы, AI-выжимок и задач после встречи.

## Быстрый старт

→ **[QUICK_START.md](QUICK_START.md)** — полная инструкция: PostgreSQL, Redis, Ollama, все сервисы, сборка whisper.cpp.

## Архитектура

```
Frontend (5173) → Backend (5000) → Aura (4000) → Audioray (3000, Ollama :11434)
                      ↓                              ↑
                 PostgreSQL                    BullMQ ← Redis
                      ↑
              meeting_summaries, meeting_tasks
```

| Сервис | Назначение | Документация |
|--------|------------|--------------|
| [frontend/](frontend/) | React UI (стенограмма, выжимка, задачи) | [README](frontend/README.md) |
| [backend/](backend/) | Публичный API, auth, БД, очередь выжимок | [README](backend/README.md) |
| [aura/](aura/) | Puppeteer-бот, multi-bot (internal) | [README](aura/README.md) |
| [audioray/](audioray/) | Whisper STT + Ollama summary (internal) | [README](audioray/README.md) |

## Документация

- [docs/](docs/README.md) — архитектура, план, риски, тестирование
- [frontend/PLAN.md](frontend/PLAN.md) — план фронтенда (фаза 6)
- [AUDIT.md](AUDIT.md) — редирект на docs/

## Локальный запуск (кратко)

```bash
# 1. PostgreSQL
createdb briefer

# 2. Redis (для очереди выжимок; опционально REDIS_ENABLED=false)
docker run -d -p 6379:6379 redis:7-alpine

# 3. Ollama + модель (для выжимок)
ollama pull deepseek-r1:14b

# 4. Audioray
cd audioray && npm install && npm run whisper:build && npm run start:dev

# 5. Aura
cd aura && npm install && cp .env.example .env && npm run start:dev

# 6. Backend
cd backend && npm install && cp .env.example .env && npm run start:dev

# 7. Frontend
cd frontend && pnpm install && cp .env.example .env && pnpm dev
```

`INTERNAL_API_TOKEN` должен совпадать в `backend/.env` и `aura/.env`.

## Статус

| Фаза | Описание | Статус |
|------|----------|--------|
| 0–3 | Ядро, STT, рефакторинг | ✅ |
| 4 | Backend + TypeORM | ✅ |
| 6 | React frontend | ✅ |
| 5 | LLM-выжимка, задачи, экспорт | 🟡 (без Trello / Google Meet) |

Подробнее: [docs/roadmap.md](docs/roadmap.md)

## Лицензия

Private / UNLICENSED.
