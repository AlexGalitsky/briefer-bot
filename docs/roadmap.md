# Дорожная карта

**Обновлено:** 27 июня 2026

```
Фазы 0–4 ✅     Фаза 6 ✅         Фаза 5 🟡
    │              │                  │
    ▼              ▼                  ▼
Ядро+Backend →  React UI        LLM/задачи/экспорт
```

| Этап | Результат | Статус |
|------|-----------|--------|
| **0** | E2E без 400 ошибок | ✅ |
| **1** | Стабильное RT распознавание | ✅ |
| **2** | Стенограмма как API | ✅ (перенесено в backend) |
| **3** | Чистая архитектура кода | ✅ |
| **4** | Backend + TypeORM + internal Aura | ✅ |
| **5** | LLM, задачи, экспорт | 🟡 Частично |
| **6** | React UI | ✅ |

---

## Фаза 0 — Связка Aura ↔ Audioray ✅

- [x] Поле `speaker` в FormData (не `prompt`)
- [x] URL из env `AUDIORAY_URL`
- [x] `OnModuleInit`, await отправки чанков
- [x] Ошибки старта бота не проглатываются
- [x] Google Meet URL detection (`meet.google.com`)
- [x] `.env.example`

## Фаза 1 — Качество STT ✅

- [x] Пропуск чанков «Тишина»
- [x] Whisper worker (модель в памяти, HTTP :8081)
- [x] Очередь транскрибации (concurrency = 1)
- [x] Контекстный `--prompt`
- [x] `GET /health`, fail-fast при старте

## Фаза 2 — Стенограмма как API ✅

> Реализовано сначала в Aura, затем перенесено в backend (фаза 4).

- [x] `TranscriptSegment`, GET transcript, SSE stream

## Фаза 3 — Структура кода ✅

- [x] Aura: `config/`, `transcription/`, `bot/platforms/`
- [x] Audioray: `config/`, `vad`, `hallucination-filter`, `whisper-process`
- [x] `npm run build` в aura и audioray

## Фаза 4 — Backend + TypeORM ✅

### Backend

- [x] NestJS: auth, users, meetings, transcripts, aura-client
- [x] TypeORM + PostgreSQL
- [x] OTP + TOTP + JWT
- [x] Internal API для Aura
- [x] SSE стенограммы из БД

### Aura (internal worker)

- [x] `InternalApiGuard`, `BackendClient`
- [x] `meetingId` от backend
- [x] Удалены публичные `GET /meetings/*`

## Фаза 5 — LLM и продукт 🟡

### Сделано

- [x] Выжимка встречи (Ollama через Audioray) → `MeetingSummary`
- [x] Извлечение задач → `MeetingTask`
- [x] Автозапуск после `meeting.status = ended`
- [x] BullMQ + Redis для фоновых джоб (fallback in-process при `REDIS_ENABLED=false`)
- [x] Экспорт выжимки: Markdown, PDF
- [x] UI: вкладки Summary / Tasks, скачивание MD/PDF
- [x] TypeORM migrations (2 миграции: initial + summary/tasks)

### Осталось

- [ ] Trello / внешние таск-трекеры
- [ ] Webhooks при завершении встречи
- [ ] Экспорт в Notion
- [ ] Google Meet — полная реализация бота
- [ ] Реальный SMS-провайдер (Twilio, SMS.ru)

## Фаза 6 — React Frontend ✅

Детали: [frontend/PLAN.md](../frontend/PLAN.md)

- [x] Scaffold (Vite, React 19, TanStack, shadcn)
- [x] **6.0** api-client, Zod, AppLayout, route guards
- [x] **6.1** Auth: register/login, OTP, TOTP step
- [x] **6.2** Meetings: список, старт/стоп
- [x] **6.3** Live-стенограмма: SSE + TranscriptView
- [x] **6.4** Темы light/dark, mobile layout
- [x] **6.5** `/settings/security` — TOTP setup с QR
- [x] **6.6** SSE reconnect + polling fallback
- [x] **6.7** Вкладки Summary / Tasks, экспорт MD/PDF

### Критерий готовности фазы 6

Пользователь регистрируется → создаёт встречу → видит live-стенограмму в браузере → после stop видит выжимку и задачи.

---

## Следующие приоритеты

1. E2E smoke-тесты (Playwright или supertest)
2. `DB_SYNCHRONIZE=false` + migrations на staging/prod
3. Google Meet bot (если нужна вторая платформа)
4. Trello / webhooks по запросу
5. Silero VAD, метрики STT
