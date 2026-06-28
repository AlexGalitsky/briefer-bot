# Архитектура

**Обновлено:** 27 июня 2026

## Обзор

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React 19, Vite)                                       │
│  UI: встречи, live-стенограмма, выжимка, задачи, экспорт         │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS REST + SSE, Bearer JWT
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — публичный API (порт 5000)                              │
│  NestJS + TypeORM + PostgreSQL + BullMQ                          │
│  Auth, Meetings, Transcripts, Summaries, AuraClient              │
└────────────┬───────────────────────────────┬────────────────────┘
             │ internal REST                  │ BullMQ jobs
             ▼                                ▼
┌────────────────────────────┐    ┌───────────────────────────────┐
│  AURA — worker (4000)       │    │  REDIS (6379)                  │
│  Puppeteer, multi-bot       │    │  очередь generate-summary      │
└────────────┬───────────────┘    └───────────────────────────────┘
             │ HTTP multipart
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  AUDIORAY — STT + LLM (3000, whisper server 8081)                │
│  WebM → FFmpeg → VAD → whisper.cpp → фильтр                      │
│  POST /api/summary/generate → Ollama (:11434)                    │
└─────────────────────────────────────────────────────────────────┘
```

## Роли сервисов

| Сервис | Кто вызывает | Ответственность |
|--------|--------------|-----------------|
| **frontend** | Пользователь | React UI |
| **backend** | Frontend, внешние интеграции | Публичный API, auth, БД, оркестрация, очередь выжимок |
| **aura** | Только backend | Puppeteer-бот (до N параллельных встреч), захват аудио |
| **audioray** | Aura, backend | Whisper STT, генерация выжимки через Ollama |
| **redis** | Backend | Очередь BullMQ для фоновой генерации выжимок |
| **ollama** | Audioray | LLM inference для summary/tasks |

## Поток данных: стенограмма (один чанк)

1. Пользователь создаёт встречу через `POST /meetings` (backend)
2. Backend сохраняет `Meeting` в PostgreSQL → `AuraClient.startBot(meetingId, url)`
3. Aura открывает Telemost в Puppeteer, пишет WebM чанки (~6 с)
4. Aura отправляет чанк на Audioray (`POST /api/whisper/transcribe`)
5. Audioray: FFmpeg → VAD → whisper.cpp worker → фильтр галлюцинаций
6. Aura получает текст → `BackendClient.pushSegment()` → PostgreSQL
7. Frontend подписан на SSE `GET /meetings/:id/transcript/stream` (с reconnect + polling fallback)

## Поток данных: выжимка после встречи

1. Пользователь или система останавливает встречу → `Meeting.status = ended`
2. Backend ставит job в BullMQ (`generate-summary`) или запускает in-process
3. `SummaryProcessor` загружает сегменты стенограммы из PostgreSQL
4. Backend вызывает Audioray `POST /api/summary/generate` с полным текстом
5. Audioray отправляет prompt в Ollama → парсит markdown + список задач
6. Backend сохраняет `MeetingSummary` + `MeetingTask[]` в PostgreSQL
7. Frontend polling `GET /meetings/:id/summary` и `GET /meetings/:id/tasks`
8. Экспорт: `GET .../summary/export/markdown` или `.../pdf`

## Схема данных (TypeORM)

```typescript
User              { id, phone, totpSecret?, role, createdAt }
Meeting           { id, platform, url, botName, status, startedAt?, endedAt?, userId }
TranscriptSegment { id, meetingId, speaker, text, startedAt, durationSec, source }
MeetingSummary    { id, meetingId, contentMarkdown, model, status, error?, createdAt }
MeetingTask       { id, meetingId, summaryId?, title, assignee?, dueDate?, completed, createdAt }
OtpChallenge      { id, phone, code, purpose, expiresAt }
```

Статусы встречи: `pending` | `active` | `ended` | `failed`

Статусы выжимки: `pending` | `processing` | `completed` | `failed`

## Контракт Backend ↔ Aura

```http
# Backend → Aura
POST /bot/start   { meetingId, url, botName }
POST /bot/stop    { meetingId? }   # без meetingId — остановить все
GET  /bot/status  → { active, bots: [{ meetingId, platform }] }

# Aura → Backend
POST /internal/transcript-segments  { meetingId, speaker, text, ... }
PATCH /internal/meetings/:id/status { status }
```

Заголовок: `X-Internal-Token` (одинаковый в `backend/.env` и `aura/.env`).

## Контракт Backend ↔ Audioray (summary)

```http
POST /api/summary/generate
{ "transcript": "полный текст стенограммы..." }

→ { summaryMarkdown, tasks: [{ title, assignee?, dueDate? }], model, processingTimeSec }
```

Env audioray: `OLLAMA_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_MS`.

## Границы ответственности

| Данные | Где живёт |
|--------|-----------|
| Пользователи, JWT | backend (PostgreSQL) |
| Встречи, стенограмма, выжимки, задачи | backend (PostgreSQL) |
| Статус ботов (runtime) | aura (in-memory Map по meetingId) |
| Захват аудио | aura |
| Whisper inference | audioray |
| LLM inference | Ollama (вызывается из audioray) |
| Очередь выжимок | Redis + BullMQ (backend) |
| UI | frontend |

**Single source of truth** для стенограммы и выжимок — PostgreSQL в backend. Файлы в `audioray/transcripts/` — только debug.

## Что не делать

- Не открывать Aura/Audioray в публичный интернет
- Не дублировать meetings/transcripts в Aura
- Не ставить TypeORM в aura/audioray
- Frontend не вызывает Aura/Audioray/Ollama напрямую

## Развёртывание (целевое)

| Сервис | Хост | Зависимости |
|--------|------|-------------|
| backend | app-server | PostgreSQL, Redis |
| aura | bot-worker | Puppeteer, Chromium |
| audioray | bot-worker* | whisper.cpp, ffmpeg, модель, Ollama |
| ollama | gpu-server или bot-worker | GPU желателен для 14B моделей |
| redis | app-server или managed | BullMQ |
| frontend | CDN / static | `VITE_API_URL` → backend |

\* audioray может жить на том же хосте, что aura (низкая latency для STT)
