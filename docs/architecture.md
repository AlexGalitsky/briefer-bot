# Архитектура

## Обзор

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React 19, Vite)                                       │
│  UI: встречи, live-стенограмма, выжимки (ф.5), задачи (ф.5)      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS REST + SSE, Bearer JWT
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — публичный API (порт 5000)                              │
│  NestJS + TypeORM + PostgreSQL                                   │
│  Auth (OTP+TOTP), Meetings, Transcripts, AuraClient              │
└────────────────────────────┬────────────────────────────────────┘
                             │ internal REST (X-Internal-Token)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  AURA — worker (порт 4000)                                       │
│  Puppeteer-бот, захват аудио, прокси в Audioray                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP multipart: file + speaker
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  AUDIORAY — STT (порт 3000, whisper server 8081)                 │
│  WebM → FFmpeg → VAD → whisper.cpp → фильтр                      │
└─────────────────────────────────────────────────────────────────┘
```

## Роли сервисов

| Сервис | Кто вызывает | Ответственность |
|--------|--------------|-----------------|
| **frontend** | Пользователь | React UI |
| **backend** | Frontend, внешние интеграции | Публичный API, auth, БД, оркестрация |
| **aura** | Только backend | Puppeteer-бот, захват аудио |
| **audioray** | Только aura | Whisper STT, очередь, health |

## Поток данных (один чанк)

1. Пользователь создаёт встречу через `POST /meetings` (backend)
2. Backend сохраняет `Meeting` в PostgreSQL → `AuraClient.startBot(meetingId, url)`
3. Aura открывает Telemost в Puppeteer, пишет WebM чанки (~6 с)
4. Aura отправляет чанк на Audioray (`POST /api/whisper/transcribe`)
5. Audioray: FFmpeg → VAD → whisper.cpp worker → фильтр галлюцинаций
6. Aura получает текст → `BackendClient.pushSegment()` → PostgreSQL
7. Frontend подписан на SSE `GET /meetings/:id/transcript/stream`

## Схема данных (TypeORM)

```typescript
User          { id, phone, totpSecret?, role, createdAt }
Meeting       { id, platform, url, botName, status, startedAt?, endedAt?, userId }
TranscriptSegment { id, meetingId, speaker, text, startedAt, durationSec, source }
OtpChallenge  { id, phone, code, purpose, expiresAt }
```

Статусы встречи: `pending` | `active` | `ended` | `failed`

## Контракт Backend ↔ Aura

```http
# Backend → Aura
POST /bot/start   { meetingId, url, botName }
POST /bot/stop
GET  /bot/status

# Aura → Backend
POST /internal/transcript-segments  { meetingId, speaker, text, ... }
PATCH /internal/meetings/:id/status { status }
```

Заголовок: `X-Internal-Token` (одинаковый в `backend/.env` и `aura/.env`).

## Границы ответственности

| Данные | Где живёт |
|--------|-----------|
| Пользователи, JWT | backend (PostgreSQL) |
| Встречи, стенограмма | backend (PostgreSQL) |
| Статус бота (runtime) | aura (in-memory) |
| Захват аудио | aura |
| Whisper inference | audioray |
| UI | frontend |

**Single source of truth** для стенограммы — PostgreSQL в backend. Файлы в `audioray/transcripts/` — только debug.

## Что не делать

- Не открывать Aura/Audioray в публичный интернет
- Не дублировать meetings/transcripts в Aura
- Не ставить TypeORM в aura/audioray
- Frontend не вызывает Aura/Audioray напрямую

## Развёртывание (целевое)

| Сервис | Хост | Зависимости |
|--------|------|-------------|
| backend | app-server | PostgreSQL |
| aura | bot-worker | Puppeteer, Chromium |
| audioray | bot-worker* | whisper.cpp, ffmpeg, модель |
| frontend | CDN / static | `VITE_API_URL` → backend |

\* audioray может жить на том же хосте, что aura (низкая latency для STT)
