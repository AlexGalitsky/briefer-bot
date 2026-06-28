# Audioray

Локальный сервис распознавания речи (STT) и генерации выжимок (LLM) для **briefer-bot**.

**Internal only** — STT вызывается из Aura, summary — из Backend.

## Требования

| Компонент | Примечание |
|-----------|------------|
| Node.js 20+ | |
| FFmpeg | в `PATH` |
| cmake или make | для сборки whisper.cpp |
| Ollama | для `/api/summary/generate` (порт 11434) |
| Модель Whisper | `models/ggml-large-v3-turbo.bin` (~1.6 GB) |

## Установка

```bash
npm install
cp .env.example .env
```

### Сборка whisper.cpp

```bash
# Автовыбор (Metal на Apple Silicon, иначе CPU)
npm run whisper:build

# Явный backend:
npm run whisper:build:metal
npm run whisper:build:cuda
npm run whisper:build:vulkan
npm run whisper:build:cpu
```

Скрипт: `scripts/build-whisper.sh`

Бинарник: `node_modules/whisper-node/lib/whisper.cpp/server`  
Whisper HTTP worker слушает порт **8081** (внутренний).

### Модель

```bash
mkdir -p models
curl -L -o models/ggml-large-v3-turbo.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
```

Для быстрых тестов: `ggml-base.bin` + `WHISPER_MODEL=ggml-base.bin` в `.env`.

## Запуск

```bash
npm run start:dev    # порт 3000
npm run build && npm run start:prod
```

Проверка:
```bash
curl http://localhost:3000/health
```

## API

### `POST /api/whisper/transcribe`

`multipart/form-data`:

| Поле | Обязательное | Описание |
|------|--------------|----------|
| `file` | да | WebM/Opus |
| `speaker` | да | Имя говорящего |

```bash
curl -X POST http://localhost:3000/api/whisper/transcribe \
  -F "file=@chunk.webm" -F "speaker=Александр"
```

Ответ: `{ speaker, text, processingTimeSec, timestamp }`. Пустой `text` — тишина, VAD или галлюцинация.

### `GET /health`

Проверяет модель, ffmpeg, whisper server, очередь.

## Пайплайн

```
WebM → FFmpeg (16kHz mono) → VAD → whisper.cpp worker → hallucination filter → JSON
```

Защита от галлюцинаций: VAD + пороги whisper (`-et`, `-lpt`) + regex-фильтр.

## Структура

```
audioray/
├── models/              # .gitignore
├── scripts/
│   └── build-whisper.sh
├── src/
│   ├── config/
│   ├── health/
│   ├── whisper/
│   │   ├── whisper.controller.ts
│   │   ├── whisper.service.ts
│   │   ├── whisper-process.service.ts
│   │   ├── vad.service.ts
│   │   └── hallucination-filter.service.ts
│   ├── summary/
│   │   ├── summary.controller.ts
│   │   └── summary.service.ts   # Ollama
│   └── transcription/
└── transcripts/         # debug-логи, .gitignore
```

## Скрипты npm

| Команда | Описание |
|---------|----------|
| `npm run start:dev` | Dev с hot reload |
| `npm run whisper:build` | Сборка whisper.cpp (auto) |
| `npm run whisper:build:metal` | Metal (macOS ARM) |
| `npm run whisper:build:cuda` | CUDA |
| `npm run build` | Сборка TypeScript |

## API: выжимка (Ollama)

### `POST /api/summary/generate`

```json
{ "transcript": "полный текст стенограммы..." }
```

Ответ: `{ summaryMarkdown, tasks[], model, processingTimeSec }`

Env: `OLLAMA_URL`, `OLLAMA_MODEL` (default `deepseek-r1:14b`), `OLLAMA_TIMEOUT_MS`.

```bash
ollama pull deepseek-r1:14b
```

## Интеграция с Aura

В `aura/.env`:
```env
AUDIORAY_URL=http://localhost:3000/api/whisper/transcribe
```

Поле **обязательно** `speaker`, не `prompt`. Чанки «Тишина» не отправляются.

Интервал чанков: `BOT_CHUNK_INTERVAL_MS` (по умолчанию 6000 мс).

## Устранение неполадок

| Проблема | Решение |
|----------|---------|
| Модель не найдена | `models/ggml-large-v3-turbo.bin` |
| whisperServer: false | `npm run whisper:build` |
| Медленно | Metal/CUDA build или `ggml-base.bin` |
| Пустой text при речи | Понизить порог VAD, проверить FFmpeg |

Подробнее: [docs/quality-stt.md](../docs/quality-stt.md)

## См. также

- [QUICK_START.md](../QUICK_START.md)
- [aura/README.md](../aura/README.md)
