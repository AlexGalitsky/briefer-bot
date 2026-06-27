# Аудит проектов Briefer Bot

**Дата:** 27 июня 2026  
**Область:** `aura` (бот для видеосозвонов) + `audioray` (локальный Whisper-сервис)  
**Цель продукта:** подключение к созвонам, ведение стенограммы, дальнейшая выжимка и постановка задач (Trello и др.)

**Приоритеты заказчика сейчас:**
1. Качество распознавания речи
2. Удобство расширения функционала
3. Позже — админка, БД, авторизация (после стабилизации ядра)

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
9. [Подготовка к БД, админке и авторизации](#9-подготовка-к-бд-админке-и-авторизации)

---

## 1. Краткое резюме

| Область | Оценка | Комментарий |
|---------|--------|-------------|
| Идея и разделение сервисов | ✅ Хорошо | Бот и распознавание разделены — правильно для масштабирования |
| Yandex Telemost | 🟡 Рабочий прототип | Вход в созвон, захват аудио, трекинг спикеров |
| Google Meet | 🔴 Заглушка | Только `goto`, без join и аудио |
| Интеграция Aura ↔ Audioray | 🔴 Сломана | Несовпадение полей API, URL, портов |
| Качество STT | 🟡 Среднее | После фиксов whisper.cpp стало лучше; остаются галлюцинации и чанки по 4 с |
| Тесты | 🔴 Почти нет | Только boilerplate NestJS |
| Конфигурация | 🔴 Хардкод | URL, порты, модель, селекторы |
| Расширяемость | 🟡 Заложена | Strategy-паттерн для ботов, но без модулей/DTO/очередей |

**Главный вывод:** ядро (Telemost + Whisper) доказало работоспособность, но интеграционный слой и эксплуатационная обвязка требуют системной доработки до того, как подключать БД и админку.

---

## 2. Архитектура системы

```
┌─────────────────────────────────────────────────────────────────┐
│                         Видеосозвон                              │
│              (Yandex Telemost / Google Meet)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ DOM: <audio> + MediaRecorder
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  AURA (порт 4000)                                                │
│  ┌──────────────┐   ┌─────────────┐   ┌──────────────────────┐  │
│  │ BotController│ → │  BotService │ → │ YandexTelemostBot    │  │
│  │ POST /start  │   │  (strategy) │   │ GoogleMeetBot (stub) │  │
│  └──────────────┘   └─────────────┘   └──────────┬───────────┘  │
│                                                    │              │
│                           ┌────────────────────────┘              │
│                           ▼                                       │
│                  ┌─────────────────┐                              │
│                  │ AudiorayService │ → recordings/*.webm (локально)│
│                  └────────┬────────┘                              │
└───────────────────────────┼──────────────────────────────────────┘
                            │ HTTP multipart: file + speaker
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  AUDIORAY (порт 3000)                                            │
│  ┌──────────────────┐   ┌─────────────────────────────────────┐   │
│  │ WhisperController│ → │ WhisperService                      │   │
│  │ POST /transcribe │   │ WebM → FFmpeg → VAD → whisper.cpp  │   │
│  └──────────────────┘   │ → фильтр галлюцинаций → transcripts/│   │
│                          └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ (планируется)
              ┌─────────────────────────────┐
              │ БД, WebSocket, админка,      │
              │ выжимка, Trello              │
              └─────────────────────────────┘
```

### Поток данных одного чанка

1. Браузер в Telemost пишет 4 с WebM/Opus через `MediaRecorder`
2. Base64 передаётся в NestJS через `page.exposeFunction`
3. Aura сохраняет `.webm` в `recordings/` и шлёт POST на Audioray
4. Audioray конвертирует в WAV 16 kHz mono, проверяет громкость, запускает whisper.cpp
5. Результат фильтруется, пишется в `transcripts/`, возвращается JSON

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

### Фаза 4 — БД, админка, auth (после стабилизации ядра)

См. [раздел 9](#9-подготовка-к-бд-админке-и-авторизации).

---

## 8. Дорожная карта

```
Сейчас          Фаза 0           Фаза 1           Фаза 2           Фаза 4
  │               │                │                │                │
  ▼               ▼                ▼                ▼                ▼
Прототип  →  Связка работает → Качество STT →  Стенограмма  →  БД + админка
Telemost     env, API fix       worker, VAD     API, WS live     auth, Trello
```

| Этап | Результат | Критерий готовности |
|------|-----------|---------------------|
| **0** | E2E без 400 ошибок | Бот в Telemost → текст в transcripts |
| **1** | Стабильное RT распознавание | Нет отставания > 1 чанка, нет галлюцинаций на тишине |
| **2** | Стенограмма как API | Можно получить полный текст встречи по ID |
| **3** | Чистая архитектура | Новая платформа = новый bot + selectors |
| **4** | Продукт | Админка, пользователи, история встреч |

---

## 9. Подготовка к БД, админке и авторизации

### 9.1 Схема данных (черновик)

```sql
-- users (фаза 4)
users (id, email, password_hash, role, created_at)

-- meetings
meetings (id, platform, url, bot_name, status, started_at, ended_at, created_by)

-- transcript_segments
transcript_segments (id, meeting_id, speaker, text, timestamp, duration_sec, created_at)

-- summaries (будущее)
summaries (id, meeting_id, content, model, created_at)

-- tasks (Trello, будущее)
tasks (id, meeting_id, title, description, trello_card_id, created_at)
```

JSONL из `transcripts/` уже соответствует `transcript_segments` — миграция тривиальна.

### 9.2 Точки расширения (уже есть в коде)

| Место | Файл | Что добавить |
|-------|------|--------------|
| После транскрибации | `whisper.controller.ts:35` | `TranscriptStore.save(segment)` |
| После ответа Audioray | `audioray.service.ts:55` | `TranscriptAggregator.add(segment)` |
| Старт встречи | `bot.controller.ts:10` | `MeetingsService.create()` → `meetingId` |
| Сохранение транскриптов | `whisper.service.ts:186` | Интерфейс `TranscriptStore` |

### 9.3 Рекомендуемый стек (фаза 4)

| Компонент | Выбор | Почему |
|-----------|-------|--------|
| ORM | Prisma | Быстрый старт, миграции, TypeScript |
| Auth | `@nestjs/passport` + JWT | Стандарт для NestJS admin API |
| Admin UI | Отдельный Next.js или NestJS + React | Не смешивать с bot process |
| Очередь | BullMQ + Redis | Транскрибация, summarization, Trello |
| WebSocket | `@nestjs/websockets` | Live-стенограмма |

### 9.4 Что НЕ делать сейчас

- Не внедрять БД до фикса Фазы 0–1 — иначе в БД попадёт мусор из галлюцинаций
- Не строить админку до появления `meetingId` и статусов сессии
- Не добавлять auth на whisper endpoint до появления reverse proxy / internal network

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
| P0 | `aura/src/services/audioray.service.ts` | Сломана интеграция |
| P0 | `aura/src/bot/bot.controller.ts` | Проглатывание ошибок |
| P0 | `aura/src/bot/bot.service.ts` | Google Meet URL |
| P1 | `audioray/src/whisper/whisper.service.ts` | Производительность, VAD |
| P1 | `aura/src/bot/bots/yandex-telemost.bot.ts` | Чанки, спикеры |
| P1 | `aura/src/bot/bots/base-bot.ts` | mute-audio, media block |
| P2 | `audioray/src/whisper/whisper.controller.ts` | Валидация API |
| P2 | оба `main.ts` | ConfigModule, ValidationPipe |

---

*Документ сгенерирован по результатам статического анализа кодовой базы. Рекомендуется обновлять после завершения каждой фазы рефакторинга.*
