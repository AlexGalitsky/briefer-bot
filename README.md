# Briefer Bot

Система для подключения бота к видеосозвонам, ведения live-стенограммы и (в перспективе) выжимок и задач.

## Быстрый старт

→ **[QUICK_START.md](QUICK_START.md)** — полная инструкция: PostgreSQL, все сервисы, сборка whisper.cpp.

## Архитектура

```
Frontend (5173) → Backend (5000) → Aura (4000) → Audioray (3000)
                      ↓
                 PostgreSQL
```

| Сервис | Назначение | Документация |
|--------|------------|--------------|
| [frontend/](frontend/) | React UI | [README](frontend/README.md) |
| [backend/](backend/) | Публичный API, auth, БД | [README](backend/README.md) |
| [aura/](aura/) | Puppeteer-бот (internal) | [README](aura/README.md) |
| [audioray/](audioray/) | Whisper STT (internal) | [README](audioray/README.md) |

## Документация

- [docs/](docs/README.md) — архитектура, план, риски, тестирование
- [frontend/PLAN.md](frontend/PLAN.md) — план фронтенда (фаза 6)
- [AUDIT.md](AUDIT.md) — редирект на docs/

## Локальный запуск (кратко)

```bash
# 1. PostgreSQL
createdb briefer

# 2. Audioray
cd audioray && npm install && npm run whisper:build && npm run start:dev

# 3. Aura
cd aura && npm install && cp .env.example .env && npm run start:dev

# 4. Backend
cd backend && npm install && cp .env.example .env && npm run start:dev

# 5. Frontend
cd frontend && pnpm install && cp .env.example .env && pnpm dev
```

`INTERNAL_API_TOKEN` должен совпадать в `backend/.env` и `aura/.env`.

## Статус

| Фаза | Описание | Статус |
|------|----------|--------|
| 0–3 | Ядро, STT, рефакторинг | ✅ |
| 4 | Backend + TypeORM | ✅ |
| 6 | React frontend | 🟡 (осталось `/settings/security`) |
| 5 | LLM, Trello, Google Meet | ⏳ |

Подробнее: [docs/roadmap.md](docs/roadmap.md)

## Лицензия

Private / UNLICENSED.
