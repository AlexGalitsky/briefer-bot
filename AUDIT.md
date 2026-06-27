# Аудит проектов Briefer Bot

**Дата:** 27 июня 2026 (обновлено)  
**Область:** `backend` (публичный API, БД) + `aura` (бот для видеосозвонов) + `audioray` (локальный Whisper) + `frontend` (React, фаза 6)  
**Цель продукта:** подключение к созвонам, ведение стенограммы, дальнейшая выжимка и постановка задач (Trello и др.)

**Приоритеты заказчика сейчас:**
1. Качество распознавания речи
2. Удобство расширения функционала
3. Backend на отдельном сервере (TypeORM) — единая точка входа для клиентов
4. Aura — внутренний worker, вызывается только через Backend REST API
5. React-фронтенд — фаза 6

---

## Содержание

1. [Краткое резюме](#1-краткое-резюме)
2. [Архитектура системы](#2-архитектура-системы)
3. [Критические баги](#3-критические-баги)
4. [Аудит Aura](#4-аудит-aura)
5. [Аудит Audioray](#5-аудит-audioray)
6. [Качество распознавания](#6-качество-распознавания)
7. [План рефакторинга](#7-план-рефакторинга)
8. [Дорожная карта](#8-дорожная-карта)
9. [Backend, TypeORM и роли сервисов](#9-backend-typeorm-и-роли-сервисов)

---

## 1. Краткое резюме

| Область | Оценка | Комментарий |
|---------|--------|-------------|
| Идея и разделение сервисов | ✅ Хорошо | Бот, STT и публичный API разделены — backend (ф.4), aura, audioray |
| **backend** | 🟡 Scaffold | NestJS starter; TypeORM и AuraClient — фаза 4 |
| Yandex Telemost | 🟡 Рабочий прототип | Вход в созвон, захват аудио, трекинг спикеров |
| Google Meet | 🔴 Заглушка | Только `goto`, без join и аудио |
| Интеграция Aura ↔ Audioray | ✅ Работает | Фаза 0 закрыта |
| Качество STT | 🟡 Среднее | Worker, VAD, контекстный prompt; фаза 1 закрыта |
| Стенограмма API | ✅ В Aura | Фаза 2; миграция в backend — фаза 4 |
| Архитектура кода | ✅ Рефакторинг | Фаза 3 закрыта |
| Тесты | 🔴 Почти нет | Только boilerplate NestJS |
| Конфигурация | 🟡 Env | AppConfigService в aura/audioray; backend — TBD |
| Расширяемость | ✅ Заложена | Strategy для ботов; backend как единая точка входа |

**Главный вывод:** ядро (Telemost + Whisper) доказало работоспособность; фазы 0–3 закрыты. Следующий шаг — **backend** на отдельном сервере (TypeORM), Aura как internal worker, React — в фазе 6.

---

## 2. Архитектура системы

### Целевая (после фазы 4)

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (фаза 6, React)                                        │
│  UI: встречи, live-стенограмма, выжимки, задачи                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS REST (+ SSE/WebSocket)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — отдельный сервер (порт 5000*)                          │
│  NestJS + TypeORM + PostgreSQL                                   │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────────┐  │
│  │ Auth (JWT)   │  │ Meetings    │  │ TranscriptStore (БД)   │  │
│  │ Users/Roles  │  │ CRUD        │  │ Summaries, Tasks (ф.5)   │  │
│  └──────────────┘  └──────┬──────┘  └────────────────────────┘  │
│                            │                                      │
│                     ┌──────▼──────┐                               │
│                     │ AuraClient  │  internal REST                │
│                     └──────┬──────┘                               │
└────────────────────────────┼──────────────────────────────────────┘
                             │ private network
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  AURA — worker-сервер (порт 4000)                                │
│  Только бот и захват аудио; публичного API нет                     │
│  ┌──────────────┐   ┌─────────────┐   ┌──────────────────────┐  │
│  │ BotController│ → │  BotService │ → │ Telemost / Meet bots │  │
│  │ (internal)   │   │  (strategy) │   └──────────┬───────────┘  │
│  └──────────────┘   └─────────────┘              │              │
│                           ┌────────────────────────┘              │
│                           ▼                                       │
│                  ┌─────────────────┐                              │
│                  │ AudiorayClient  │ → recordings/*.webm          │
│                  └────────┬────────┘                              │
└───────────────────────────┼──────────────────────────────────────┘
                            │ HTTP multipart: file + speaker
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  AUDIORAY — STT-сервер (порт 3000), рядом с Aura или отдельно    │
│  WebM → FFmpeg → VAD → whisper.cpp → фильтр → transcripts/       │
└─────────────────────────────────────────────────────────────────┘

* порты — примеры для dev; в prod — за reverse proxy
```

### Роли сервисов

| Сервис | Сервер | Кто вызывает | Ответственность |
|--------|--------|--------------|-----------------|
| **backend** | Отдельный | Frontend, внешние интеграции | Публичный API, auth, БД (TypeORM), оркестрация |
| **aura** | Отдельный (worker) | Только backend | Puppeteer-бот, захват аудио, прокси в Audioray |
| **audioray** | Рядом с aura | Только aura | Whisper STT, очередь, health |
| **frontend** | CDN / static | Пользователь | React UI (фаза 6) |

### Поток данных одного чанка (ядро, фазы 0–3)

1. Backend вызывает `POST /bot/start` на Aura (с `meetingId` из БД)
2. Браузер в Telemost пишет 6 с WebM/Opus через `MediaRecorder`
3. Base64 передаётся в NestJS через `page.exposeFunction`
4. Aura сохраняет `.webm` в `recordings/` и шлёт POST на Audioray
5. Audioray конвертирует в WAV 16 kHz mono, VAD, whisper.cpp, фильтр
6. **Сейчас:** сегмент в Aura (`TranscriptAggregator` + jsonl)  
   **Фаза 4:** Aura пушит сегмент в Backend → TypeORM → PostgreSQL
7. Frontend (фаза 6) читает стенограмму через Backend API / SSE

---

## 3. Критические баги

### 🔴 P0 — Блокируют корректную работу связки

| # | Проблема | Где | Детали |
|---|----------|-----|--------|
| 1 | **Несовпадение полей API** | `aura/.../audioray.service.ts:37` vs `audioray/.../whisper.controller.ts:14` | Aura шлёт `prompt`, Audioray требует `speaker` → **HTTP 400** |
| 2 | **Неверный URL сервера** | `audioray.service.ts:10` | `http://whisper-server-ip:8000/...` — placeholder, не резолвится |
| 3 | **Несовпадение портов** | `aura/main.ts:11` (4000), `audioray/main.ts:6` (3000) | Aura стучится на 8000, Audioray слушает 3000 |
| 4 | **Ошибки запуска бота проглатываются** | `bot.controller.ts:12` | `.catch(() => {})` — клиент всегда получает `success: true` |
| 5 | **Google Meet не определяется** | `bot.service.ts:25` | Проверка `://google.com` не матчит `meet.google.com` |

### 🟠 P1 — Сильно влияют на качество и надёжность

| # | Проблема | Где | Детали |
|---|----------|-----|--------|
| 6 | **Перезагрузка модели на каждый чанк** | `whisper.service.ts:159-184` | Новый процесс whisper.cpp (~1.6 GB) каждые 4 с → риск отставания от реального времени |
| 7 | **Чанки «Тишина» уходят в Whisper** | `yandex-telemost.bot.ts:50` | Фоновый шум → галлюцинации («Редактор субтитров...») |
| 8 | **`onModuleInit` не вызывается** | `audioray.service.ts:12` | Класс не implements `OnModuleInit` — папка `recordings/` может не создаться |
| 9 | **`sendAudioToAudioray` не awaited** | `yandex-telemost.bot.ts:53` | Fire-and-forget: нет backpressure, ошибки теряются |
| 10 | **Результат транскрипции не используется** | `audioray.service.ts:55-56` | Текст логируется, но не накапливается для стенограммы |

---

## 4. Аудит Aura

### 4.1 Структура

```
aura/src/
├── main.ts
├── app.module.ts
├── services/
│   └── audioray.service.ts      # HTTP-клиент к Audioray
└── bot/
    ├── bot.module.ts
    ├── bot.controller.ts          # POST /bot/start, /bot/stop
    ├── bot.service.ts           # Фабрика стратегий
    ├── interfaces/
    │   └── meeting-bot.interface.ts
    └── bots/
        ├── base-bot.ts            # Puppeteer lifecycle
        ├── yandex-telemost.bot.ts # ✅ Реализован
        └── google-meet.bot.ts     # ❌ Заглушка
```

### 4.2 Что сделано хорошо

- **Strategy pattern** для платформ (`IMeetingBot`, `getBotStrategy`) — удобно добавлять Zoom, Teams и т.д.
- **Graceful shutdown** — `OnApplicationShutdown` в `BotService` закрывает браузер
- **Асинхронный старт** — HTTP не блокируется на всю длительность созвона
- **Локальный бэкап аудио** — `recordings/` для отладки
- **Трекинг спикеров** через CSS-класс активной рамки в Telemost
- **Циклический MediaRecorder** — каждый чанк — валидный WebM с заголовками

### 4.3 Баги и проблемы

#### Интеграция с Audioray

```typescript
// aura/src/services/audioray.service.ts — СЕЙЧАС (неверно)
formData.append('file', blob, 'chunk.webm');
formData.append('model', 'whisper-1');           // игнорируется Audioray
formData.append('prompt', `Говорит: ${speakerName}`); // ❌ нужно speaker

// audioray ожидает:
formData.append('speaker', speakerName);
```

Дополнительно: префикс `Говорит:` попадает в транскрипты (`"speaker":"Говорит: Тишина"` в `transcripts/2026-06-27.jsonl`).

#### Puppeteer / захват аудио

| Проблема | Файл | Риск |
|----------|------|------|
| `--mute-audio` | `base-bot.ts:33` | Может мешать воспроизведению/захвату |
| Блокировка `media` запросов | `base-bot.ts:44-45` | Может блокировать аудиопотоки Telemost |
| Один `audio` элемент навсегда | `yandex-telemost.bot.ts:67-68` | Нет переподключения при смене источника |
| Хрупкие CSS-классы с хешами | `yandex-telemost.bot.ts:17,134,145` | Сломается при обновлении UI Telemost |
| Фиксированное ожидание 5 с после join | `yandex-telemost.bot.ts:37` | Нет проверки, что бот реально в конференции |

#### API и валидация

- Нет DTO, `ValidationPipe`, проверки `url`
- Нет статуса сессии (running / failed / joined)
- Нет `GET /bot/status`
- Один активный бот на инстанс — нет `meetingId`

#### Конфигурация

| Параметр | Сейчас | Нужно |
|----------|--------|-------|
| Audioray URL | хардкод | `AUDIORAY_URL` env |
| Порт Aura | `PORT` (default 4000) | ✅ |
| Имя бота | `'Аура'` | env или body |
| Интервал чанка | 4000 ms в page script | env / config |
| Headless | всегда `true` | env для отладки |
| Путь recordings | `process.cwd()` | абсолютный путь от корня проекта |

#### Тесты

- `bot.service.spec.ts` — нет мока `AudiorayService` → DI падает
- Импорт `describe` из `node:test` вместо Jest
- Нет тестов ботов, `AudiorayService`, интеграции

#### Мёртвый код

- `import { File } from 'node:buffer'` — не используется (`audioray.service.ts:4`)
- `import { BotService }` в `main.ts:3` — не используется

---

## 5. Аудит Audioray

### 5.1 Структура

```
audioray/src/
├── main.ts
├── app.module.ts
├── app.controller.ts            # boilerplate GET /
└── whisper/
    ├── whisper.module.ts
    ├── whisper.controller.ts    # POST /api/whisper/transcribe
    └── whisper.service.ts       # весь пайплайн (~280 строк)
```

### 5.2 Что сделано хорошо

- Прямой вызов whisper.cpp (обход бага парсера `whisper-node`)
- Путь к модели через `__dirname` — работает из любой cwd
- FFmpeg-конвертация под требования whisper (16 kHz, mono, PCM)
- Трёхуровневая защита от галлюцинаций (VAD + пороги + regex)
- Логи и файлы транскриптов (`.txt` + `.jsonl`)
- README с описанием API и troubleshooting

### 5.3 Баги и проблемы

#### Производительность

```
Каждый чанк (4 с):
  spawn whisper.cpp → загрузка модели 1.6 GB → inference → exit
```

При интервале 4 с и времени inference 1.7–13 с (зависит от CPU/GPU) система **не успевает** при параллельных запросах. Нет очереди, нет лимита concurrency.

#### Обработка ошибок

| Сценарий | Поведение | Проблема |
|----------|-----------|----------|
| Модель не найдена | Лог при старте, сервер работает | Запросы возвращают `text: ""` |
| FFmpeg упал | catch → `""` | Клиент не знает причину |
| VAD отфильтровал | `""` | Не пишется в transcripts |
| Галлюцинация | `""` | Только console.warn |
| whisper binary missing | catch → `""` | Нет health check |

Все ошибки выглядят одинаково: `200 OK` + пустой `text`.

#### API

- Нет лимита размера файла (Multer in-memory → OOM риск)
- Нет проверки MIME
- `speaker: "   "` проходит валидацию
- `processingTimeSec` в ответе (controller) ≠ `processingTimeSec` в transcripts (service)
- Поля `model`, `prompt` молча игрутся

#### Файловая система

- Синхронные `writeFileSync`, `readFileSync`, `appendFileSync` — блокируют event loop
- При ошибке FFmpeg `.wav` может не удалиться (`convertWebmToWav16k`, error handler)
- В репозитории лежит `temp_audio/*.wav` — следы незавершённых запросов

#### Тесты

- Ноль тестов whisper pipeline, VAD, фильтра галлюцинаций, multipart API

#### Зависимости

- `whisper-node` используется только как vendor бинарника — можно заменить на свой build step
- `fluent-ffmpeg` требует системный `ffmpeg` — нет проверки при старте

---

## 6. Качество распознавания

### 6.1 Уже исправлено в ходе разработки

| Проблема | Решение |
|----------|---------|
| `whisper-node` возвращал `[]` на коротких чанках | Прямой вызов whisper.cpp |
| Неверный путь к модели (`process.cwd()`) | `__dirname`-relative path |
| Опция `model` вместо `modelPath` | Исправлено, затем переход на exec |
| `word_timestamps: true` → `-ml 1` ломал текст | Отключено через прямой вызов |

### 6.2 Текущие ограничения

| Фактор | Влияние | Рекомендация |
|--------|---------|--------------|
| Чанки 4 с | Обрезает фразы, нет контекста | Увеличить до 6–10 с или скользящее окно |
| Один `<audio>` на всех | Микшированный поток, спикер по UI | Per-participant audio (сложнее) |
| Принудительный `-l ru` | Плохо для англ. вставок | `auto` или per-meeting config |
| `large-v3-turbo` | Качество ↑, скорость ↓ | Для prod: очередь + worker; для dev: `base` |
| Галлюцинации на тишине | Мусор в стенограмме | Не слать «Тишина» + усилить VAD |
| Нет `initial_prompt` с контекстом | Потеря связности между чанками | Передавать последние N слов как `--prompt` |

### 6.3 Рекомендации по качеству (приоритет)

#### Быстрые победы (1–2 дня)

1. **Не отправлять чанки без активного спикера** (Aura)
2. **Исправить поле `speaker`** в FormData
3. **Передавать контекст** в whisper: `--prompt` с последними 20–30 словами стенограммы
4. **Увеличить чанк до 6–8 с** — меньше обрезанных фраз

#### Средний срок (1–2 недели)

5. **Persistent whisper worker** — один процесс, модель в памяти, stdin/stdout или whisper server mode
6. **Очередь задач** (BullMQ / in-memory queue) — один consumer, без гонок
7. **Silero VAD** или `@web-apps/audio-vad` перед Whisper — точнее energy-based порога
8. **Склейка чанков одного спикера** — если два чанка подряд от одного спикера, объединять перед STT

#### Долгосрочно

9. **Diarization** (pyannote / whisperX) — если per-participant audio недоступен
10. **Постобработка LLM** — вычистка стенограммы, не дублируя STT

---

## 7. План рефакторинга

### Фаза 0 — Починить связку (1–2 дня)

> Без этого остальное бессмысленно тестировать end-to-end.

- [x] `audioray.service.ts`: `formData.append('speaker', speakerName)`
- [x] Убрать `model`, `prompt` или документировать как deprecated
- [x] URL из env: `AUDIORAY_URL=http://localhost:3000/api/whisper/transcribe`
- [x] `AudiorayService implements OnModuleInit`
- [x] `await sendAudioToAudioray(...)` в боте
- [x] `bot.controller.ts`: логировать ошибки, возвращать `{ success: false, error }` при fail
- [x] Google Meet: `url.includes('meet.google.com')`
- [x] `.env.example` в обоих проектах

### Фаза 1 — Качество STT (3–5 дней)

- [x] Пропуск чанков с `speaker === 'Тишина'` (или пустым массивом спикеров)
- [x] Whisper worker process (модель грузится один раз)
- [x] Очередь транскрибации (concurrency = 1)
- [x] Контекстный `--prompt` из накопленной стенограммы
- [x] Health check: `GET /health` (model, ffmpeg, whisper binary)
- [x] Startup validation с `fail-fast` если модель/ffmpeg отсутствуют

### Фаза 2 — Стенограмма как сущность (1 неделя)

- [x] `TranscriptAggregatorService` в Aura — накапливает чанки в памяти/файл
- [x] Единый формат записи `TranscriptSegment`
- [x] `GET /meetings/:id/transcript` — отдача накопленного текста
- [x] SSE `GET /meetings/:id/transcript/stream` для live-стенограммы

### Фаза 3 — Структура кода (1–2 недели)

- [x] Aura: `config/` с `AppConfigService` (env без `@nestjs/config`)
- [x] Aura: `transcription/audioray.client.ts` вместо `services/audioray.service.ts`
- [x] Aura: `transcription/transcript-aggregator.service.ts` (вынесен из `meetings/`)
- [x] Aura: `bot/platforms/telemost/` и `google-meet/` + `bot.factory.ts`
- [x] Aura: удалены `bot/bots/*`, `services/audioray.service.ts`
- [x] Audioray: `config/` с `AppConfigService`
- [x] Audioray: `audio-converter`, `vad`, `hallucination-filter` — отдельные сервисы
- [x] Audioray: `whisper-process.service.ts` (бывш. `whisper-worker.service.ts`)
- [x] Audioray: `whisper.service.ts` — только оркестрация
- [x] Audioray: `transcription/` с `TranscriptStore` + `FileTranscriptStore`
- [x] Оба проекта: `npm run build` проходит

#### Aura

```
src/
├── config/
│   └── configuration.ts          # @nestjs/config
├── meetings/
│   ├── meetings.module.ts
│   ├── meetings.controller.ts
│   ├── meetings.service.ts       # сессии, статус, transcript
│   └── entities/
├── transcription/
│   ├── transcription.module.ts
│   ├── audioray.client.ts        # HTTP client (бывш. AudiorayService)
│   └── transcript-aggregator.ts
└── bot/
    ├── bot.factory.ts            # Nest provider вместо new
    └── platforms/
        ├── telemost/
        │   ├── telemost.bot.ts
        │   └── telemost.selectors.ts  # вынести CSS
        └── google-meet/
```

#### Audioray

```
src/
├── config/
├── health/
│   └── health.controller.ts
├── whisper/
│   ├── whisper.controller.ts
│   ├── whisper.service.ts        # оркестрация
│   ├── audio-converter.service.ts
│   ├── vad.service.ts
│   ├── hallucination-filter.service.ts
│   └── whisper-process.service.ts # worker
└── transcription/
    ├── transcription.module.ts
    └── transcript-store.interface.ts  # FileStore → DbStore
```

### Фаза 4 — Backend + TypeORM (2–3 недели)

> Публичный API и персистентность — на **отдельном сервере**. Aura остаётся internal worker.

#### Backend (`backend/`)

- [x] NestJS scaffold → модули: `config`, `auth`, `users`, `meetings`, `transcripts`, `aura-client`
- [x] **TypeORM** + PostgreSQL: entities, `DB_SYNCHRONIZE` для dev (миграции — перед prod)
- [x] Entities: `User`, `Meeting`, `TranscriptSegment`, `OtpChallenge`
- [x] `AuraClient` — HTTP-клиент к internal REST Aura (`AURA_URL` env)
- [x] Публичные эндпоинты:
  - `POST /meetings` → создать встречу в БД → `AuraClient.startBot(meetingId, url)`
  - `POST /meetings/:id/stop` → `AuraClient.stopBot()`
  - `GET /meetings/:id/transcript` — из БД
  - `GET /meetings/:id/transcript/stream` — SSE из БД
- [x] Auth: телефон + SMS OTP (`SmsGateway`), JWT, TOTP authenticator (setup/confirm)
- [x] `.env.example`: DB, JWT, AURA_URL, INTERNAL_API_TOKEN
- [x] Health: `GET /health` (db + aura reachability)
- [x] Internal API: `POST /internal/transcript-segments`, `PATCH /internal/meetings/:id/status`

#### Aura (рефакторинг под internal worker)

- [x] `InternalApiGuard` + `X-Internal-Token` на всех эндпоинтах (кроме `GET /`)
- [x] `POST /bot/start` принимает `meetingId` от backend
- [x] `BackendClient` — пуш сегментов и статусов в backend
- [x] `GET /bot/status` для health-check backend
- [x] Удалены `GET /meetings/*` и `TranscriptAggregatorService` — стенограмма только в backend

#### Audioray

- [x] Без изменений в публичном API; остаётся internal для Aura

#### Критерий готовности

Клиент (curl/Postman) бьётся в **backend** → бот стартует на aura-сервере → сегменты появляются в PostgreSQL.

```
backend/
src/
├── config/
├── auth/
├── users/
│   └── entities/user.entity.ts
├── meetings/
│   ├── entities/meeting.entity.ts
│   ├── meetings.controller.ts    # публичный API
│   └── meetings.service.ts
├── transcripts/
│   ├── entities/transcript-segment.entity.ts
│   └── transcripts.service.ts
└── aura-client/
    └── aura.client.ts            # REST → aura:4000
```

### Фаза 5 — Резерв (TBD)

> Зарезервирована. Возможное наполнение — уточнить перед стартом.

- [ ] Выжимка встречи (LLM) → `Summary` entity
- [ ] Задачи / интеграция Trello → `Task` entity
- [ ] BullMQ + Redis для фоновых джоб (summarization, export)
- [ ] Webhook-и, уведомления, экспорт (PDF, Notion)
- [ ] Google Meet — полная реализация бота

### Фаза 6 — React Frontend

- [ ] Отдельный проект `frontend/` (Vite + React + TypeScript)
- [ ] Только **backend** как API base URL — прямых вызовов Aura/Audioray нет
- [ ] Экраны: login, список встреч, старт/стоп, live-стенограмма (SSE)
- [ ] Фаза 5+: просмотр выжимок и задач
- [ ] Auth: JWT в httpOnly cookie или Bearer (согласовать с backend)

---

## 8. Дорожная карта

```
Фазы 0–3 ✅     Фаза 4              Фаза 5         Фаза 6
    │              │                   │              │
    ▼              ▼                   ▼              ▼
Ядро STT    →  Backend+TypeORM  →  TBD (резерв) →  React UI
Telemost       Aura internal        LLM/Trello?     только → backend
```

| Этап | Результат | Критерий готовности |
|------|-----------|---------------------|
| **0** | E2E без 400 ошибок | Бот в Telemost → текст в transcripts ✅ |
| **1** | Стабильное RT распознавание | Нет отставания > 1 чанка, нет галлюцинаций на тишине ✅ |
| **2** | Стенограмма как API | Можно получить полный текст встречи по ID ✅ |
| **3** | Чистая архитектура | Новая платформа = новый bot + selectors ✅ |
| **4** | Backend + БД | Публичный API на backend; Aura — internal worker; TypeORM ✅ |
| **5** | Резерв | TBD |
| **6** | UI | React-фронтенд через backend REST |

### Развёртывание (целевое)

| Сервис | Хост | Порт (dev) | БД / зависимости |
|--------|------|------------|------------------|
| backend | app-server | 5000 | PostgreSQL |
| aura | bot-worker | 4000 | Puppeteer, Chromium |
| audioray | bot-worker* | 3000 | whisper.cpp, ffmpeg, модель |
| frontend | static/CDN | 5173 | — |

\* audioray может жить на том же хосте, что aura (низкая latency для STT)

---

## 9. Backend, TypeORM и роли сервисов

### 9.1 Схема данных (TypeORM entities)

```typescript
// users
@Entity('users')
class User {
  id: uuid
  email: string
  passwordHash: string
  role: 'admin' | 'user'
  createdAt: Date
}

// meetings
@Entity('meetings')
class Meeting {
  id: uuid
  platform: 'yandex-telemost' | 'google-meet'
  url: string
  botName: string
  status: 'pending' | 'active' | 'ended' | 'failed'
  startedAt?: Date
  endedAt?: Date
  createdBy: User
  createdAt: Date
}

// transcript_segments
@Entity('transcript_segments')
class TranscriptSegment {
  id: uuid
  meeting: Meeting
  speaker: string
  text: string
  startedAt: Date
  durationSec: number
  source: 'audioray'
  createdAt: Date
}

// summaries, tasks — фаза 5 (резерв)
```

JSONL из `aura/transcripts/` и `audioray/transcripts/` — источник для одноразовой миграции в PostgreSQL.

### 9.2 Границы ответственности

| Данные / действие | Где живёт | Примечание |
|-------------------|-----------|------------|
| Пользователи, JWT | **backend** | TypeORM |
| Встречи (CRUD, история) | **backend** | TypeORM |
| Сегменты стенограммы | **backend** | TypeORM; Aura пушит после STT |
| Статус бота (runtime) | **aura** | In-memory + health |
| Захват аудио, Puppeteer | **aura** | Не экспонировать наружу |
| Whisper inference | **audioray** | Только для aura |
| UI | **frontend** (ф.6) | Только backend API |

### 9.3 Контракт Backend ↔ Aura (черновик)

```http
# Backend → Aura (internal)
POST /bot/start
  { meetingId, url, botName }
  → { success, platform }

POST /bot/stop
  → { success, meetingId }

GET /bot/status
  → { active, platform, meetingId? }

# Aura → Backend (internal)
POST /internal/transcript-segments
  { meetingId, speaker, text, startedAt, durationSec }
  → 201
```

### 9.4 Рекомендуемый стек

| Компонент | Выбор | Почему |
|-----------|-------|--------|
| ORM | **TypeORM** | Требование; нативная интеграция с NestJS |
| БД | PostgreSQL | JSON, надёжность, миграции TypeORM |
| Auth | `@nestjs/passport` + JWT | Стандарт для NestJS API |
| Frontend | React + Vite (ф.6) | Отдельный проект |
| Очередь (ф.5) | BullMQ + Redis | Summarization, Trello |
| Live-стенограмма | SSE или WebSocket на **backend** | Frontend не знает про Aura |

### 9.5 Точки расширения (текущий код → фаза 4)

| Место | Файл | Что добавить |
|-------|------|--------------|
| После транскрибации | `aura/.../audioray.client.ts` | Пуш сегмента в backend |
| Старт встречи | `backend/.../meetings.service.ts` | Создать Meeting в БД → `AuraClient.start` |
| Публичный transcript | `backend/.../transcripts.controller.ts` | Читать из TypeORM |
| Сохранение в audioray | `audioray/.../file-transcript.store.ts` | Оставить как debug-лог |

### 9.6 Что НЕ делать

- Не открывать Aura/Audioray в публичный интернет — только backend и private network
- Не дублировать meetings/transcripts в Aura после фазы 4 — single source of truth в PostgreSQL
- Не ставить TypeORM в aura/audioray — ORM только в backend
- Не начинать фронтенд до стабильного backend API (фаза 4)

---

## Приложение A — Чеклист исправления интеграции

```typescript
// 1. aura/.env
AUDIORAY_URL=http://localhost:3000/api/whisper/transcribe
PORT=4000

// 2. audioray/.env
PORT=3000

// 3. audioray.service.ts
formData.append('file', blob, 'chunk.webm');
formData.append('speaker', speakerName); // без префикса «Говорит:»

// 4. yandex-telemost.bot.ts
if (currentSpeakers.length === 0) return; // не слать тишину
await this.audiorayService.sendAudioToAudioray(buffer, speakerLabel);

// 5. bot.controller.ts
this.botService.startBot(body.url, body.name).catch((err) => {
  this.logger.error('Bot start failed', err);
});
```

## Приложение B — Метрики для мониторинга качества

| Метрика | Как считать | Цель |
|---------|-------------|------|
| Empty rate | % чанков с `text: ""` | < 40% (тишина ожидаема) |
| Hallucination rate | % отфильтрованных галлюцинаций | → 0 после VAD skip |
| Latency p95 | время от чанка до ответа | < 4 с |
| Queue depth | чанков в очереди | ≤ 2 |
| WER | ручная разметка тестовых записей | < 15% для русского |

## Приложение C — Файлы для ревью в первую очередь

| Приоритет | Файл | Причина |
|-----------|------|---------|
| P0 | `backend/src/` (новый) | Старт фазы 4: TypeORM, AuraClient |
| P0 | `aura/src/transcription/audioray.client.ts` | Интеграция STT + пуш в backend (ф.4) |
| P0 | `aura/src/bot/bot.controller.ts` | Internal API для backend |
| P1 | `audioray/src/whisper/whisper.service.ts` | Производительность, VAD |
| P1 | `aura/src/bot/platforms/telemost/telemost.bot.ts` | Чанки, спикеры |
| P1 | `aura/src/bot/base-bot.ts` | mute-audio, media block |
| P2 | `audioray/src/whisper/whisper.controller.ts` | Валидация API |
| P2 | все `main.ts` | ConfigModule, ValidationPipe |

---

*Документ сгенерирован по результатам статического анализа кодовой базы. Рекомендуется обновлять после завершения каждой фазы рефакторинга.*
