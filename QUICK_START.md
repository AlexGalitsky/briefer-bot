# Briefer Bot — быстрый старт

Полная инструкция по локальному запуску всего стека: PostgreSQL → Redis → Ollama → Audioray → Aura → Backend → Frontend.

---

## Содержание

1. [Что это](#1-что-это)
2. [Требования](#2-требования)
3. [Клонирование и структура](#3-клонирование-и-структура)
4. [PostgreSQL](#4-postgresql)
5. [Redis (очередь выжимок)](#5-redis-очередь-выжимок)
6. [Ollama (LLM)](#6-ollama-llm)
7. [Audioray — Whisper STT + summary](#7-audioray--whisper-stt--summary)
8. [Aura — бот видеосозвонов](#8-aura--бот-видеосозвонов)
9. [Backend — API и БД](#9-backend--api-и-бд)
10. [Frontend — UI](#10-frontend--ui)
11. [Проверка E2E](#11-проверка-e2e)
12. [Порядок запуска](#12-порядок-запуска)
13. [Типичные проблемы](#13-typичные-проблемы)

Дополнительно: [docs/](docs/README.md) — архитектура, план, риски, тестирование.

---

## 1. Что это

**Briefer Bot** — система для подключения бота к видеосозвонам, live-стенограммы, AI-выжимок и задач после встречи.

```
Frontend (5173)  →  Backend (5000)  →  Aura (4000)  →  Audioray (3000)
                         ↓                              ↑
                    PostgreSQL                    Ollama (:11434)
                         ↑
                  BullMQ ← Redis (6379)
```

| Сервис | Порт | Роль |
|--------|------|------|
| **frontend** | 5173 | React UI (стенограмма, выжимка, задачи) |
| **backend** | 5000 | Публичный API, auth, БД, очередь выжимок |
| **aura** | 4000 | Puppeteer-бот, multi-bot (internal) |
| **audioray** | 3000 + 8081 | Whisper STT + Ollama summary (internal) |
| **redis** | 6379 | BullMQ (опционально) |
| **ollama** | 11434 | LLM для выжимок |

---

## 2. Требования

### Общее

| Компонент | Версия |
|-----------|--------|
| Node.js | 20+ |
| npm | 9+ (backend, aura, audioray) |
| pnpm | 9+ (frontend) |
| PostgreSQL | 14+ |
| Redis | 7+ (или Docker; опционально `REDIS_ENABLED=false`) |
| Ollama | для AI-выжимок |
| FFmpeg | в `PATH` (`ffmpeg -version`) |
| Chromium | ставится с Puppeteer (aura) |

### Сборка whisper.cpp (audioray)

| Платформа | Инструменты |
|-----------|-------------|
| macOS (Apple Silicon) | Xcode CLI tools, `cmake` или `make` |
| macOS (Intel) | `cmake` / `make` |
| Linux CPU | `build-essential`, `cmake` |
| Linux NVIDIA | CUDA toolkit + `cmake` |
| Linux AMD/Intel GPU | Vulkan SDK (опционально) |

### Диск

- Модель `ggml-large-v3-turbo.bin` — ~1.6 GB
- Модель `ggml-base.bin` — ~150 MB (для быстрых тестов)

---

## 3. Клонирование и структура

```bash
git clone <repo-url> briefer-bot
cd briefer-bot
```

```
briefer-bot/
├── frontend/     # React 19 UI
├── backend/      # NestJS + TypeORM + PostgreSQL
├── aura/         # Puppeteer worker
├── audioray/     # Whisper STT
├── docs/         # Архитектура, план, риски
└── QUICK_START.md
```

**Не коммитить:** `node_modules/`, `.pnpm-store/`, `models/*.bin`, `.env`, `recordings/`, `transcripts/`.

---

## 4. PostgreSQL

### macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
createdb briefer
```

### Linux

```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb briefer
```

### Проверка

```bash
psql -d briefer -c "SELECT 1"
```

---

## 5. Redis (очередь выжимок)

Backend использует BullMQ для фоновой генерации выжимок после `meeting.status = ended`.

### Запуск через Docker

```bash
docker run -d --name briefer-redis -p 6379:6379 redis:7-alpine
```

### Без Redis (dev)

В `backend/.env` можно отключить очередь:

```env
REDIS_ENABLED=false
```

Генерация выжимки выполнится in-process в том же процессе backend.

---

## 6. Ollama (LLM)

Выжимки и задачи генерируются через Ollama в audioray.

### Установка

```bash
# macOS
brew install ollama
ollama serve   # или как сервис

# Linux — см. https://ollama.com/download
```

### Модель

```bash
ollama pull deepseek-r1:14b
```

В `audioray/.env`:

```env
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=deepseek-r1:14b
OLLAMA_TIMEOUT_MS=300000
```

Проверка:

```bash
curl http://127.0.0.1:11434/api/tags
```

---

## 7. Audioray — Whisper STT + summary

### 7.1 Установка

```bash
cd audioray
npm install
cp .env.example .env
```

### 7.2 Сборка whisper.cpp server

Бинарник `server` нужен для режима worker (модель в памяти, HTTP на порту 8081).

```bash
# Автовыбор: Metal на Apple Silicon, CUDA если есть nvidia-smi, иначе CPU
npm run whisper:build

# Явный выбор backend:
npm run whisper:build:metal    # macOS Apple Silicon (GPU)
npm run whisper:build:cuda     # NVIDIA
npm run whisper:build:vulkan   # Vulkan
npm run whisper:build:cpu      # только CPU
```

Скрипт: `audioray/scripts/build-whisper.sh`

| Backend | Когда использовать |
|---------|-------------------|
| `metal` | Mac M1/M2/M3 — **рекомендуется** |
| `cuda` | Linux/Windows с NVIDIA GPU |
| `vulkan` | AMD/Intel GPU без CUDA |
| `cpu` | Универсально, медленнее |
| `openblas` | CPU с ускорением BLAS |

Путь к whisper.cpp по умолчанию:
```
audioray/node_modules/whisper-node/lib/whisper.cpp
```

Переопределение:
```bash
WHISPER_CPP_DIR=/path/to/whisper.cpp npm run whisper:build
```

**Ручная сборка (если скрипт не сработал):**

```bash
cd node_modules/whisper-node/lib/whisper.cpp

# CMake (новые версии whisper.cpp)
cmake -B build -DWHISPER_BUILD_SERVER=ON -DWHISPER_METAL=ON   # macOS ARM
cmake --build build --config Release
cp build/bin/server ./server   # путь может отличаться

# Makefile (старые версии)
make server WHISPER_METAL=1
```

### 7.3 Модель Whisper

```bash
mkdir -p models
curl -L -o models/ggml-large-v3-turbo.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
```

Для быстрых тестов:
```bash
curl -L -o models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

В `.env`: `WHISPER_MODEL=ggml-base.bin`

### 7.4 Запуск

```bash
npm run start:dev
```

Проверка:
```bash
curl http://localhost:3000/health
# → {"status":"ok","checks":{"model":true,"ffmpeg":true,"whisperServer":true,...}}
```

API: `POST /api/whisper/transcribe` (multipart: `file`, `speaker`)

Подробнее: [audioray/README.md](audioray/README.md)

---

## 8. Aura — бот видеосозвонов

### 8.1 Установка

```bash
cd aura
npm install
cp .env.example .env
```

### 8.2 Конфигурация `.env`

```env
PORT=4000
BACKEND_URL=http://localhost:5000
INTERNAL_API_TOKEN=dev-internal-token
AUDIORAY_URL=http://localhost:3000/api/whisper/transcribe
BOT_CHUNK_INTERVAL_MS=6000
BOT_MAX_CONCURRENT=3
```

`INTERNAL_API_TOKEN` **должен совпадать** с backend.

### 8.3 Запуск

```bash
npm run start:dev
```

Проверка (нужен internal token):
```bash
curl -H "X-Internal-Token: dev-internal-token" http://localhost:4000/bot/status
```

Подробнее: [aura/README.md](aura/README.md)

---

## 9. Backend — API и БД

### 9.1 Установка

```bash
cd backend
npm install
cp .env.example .env
```

### 9.2 Конфигурация `.env`

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=briefer
DB_SYNCHRONIZE=true          # только dev! prod → false + migrations

JWT_SECRET=dev-jwt-secret-change-in-production
AUTH_DEV_EXPOSE_OTP=true     # OTP в ответе API (dev)

AURA_URL=http://localhost:4000
AUDIORAY_URL=http://localhost:3000
INTERNAL_API_TOKEN=dev-internal-token
CORS_ORIGIN=http://localhost:5173

REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 9.3 Миграции (staging/prod)

```bash
# Применить миграции вручную
npm run migration:run

# Или при старте prod
DB_SYNCHRONIZE=false DB_MIGRATE=true npm run start:prod
```

### 9.4 Запуск

```bash
npm run start:dev
```

Проверка:
```bash
curl http://localhost:5000/health
```

Подробнее: [backend/README.md](backend/README.md)

---

## 10. Frontend — UI

### 10.1 Установка

```bash
cd frontend
pnpm install
cp .env.example .env
```

### 10.2 Конфигурация `.env`

```env
VITE_API_URL=http://localhost:5000
```

### 10.3 Запуск

```bash
pnpm dev
```

Откройте http://localhost:5173

Подробнее: [frontend/README.md](frontend/README.md), [frontend/PLAN.md](frontend/PLAN.md)

---

## 11. Проверка E2E

### 11.1 Регистрация

1. Откройте http://localhost:5173/register
2. Телефон: `+79991234567`
3. В dev код OTP показывается в UI (`devCode`) и в логах backend
4. После входа — редирект на `/meetings`

### 11.2 Встреча и стенограмма

1. Вставьте URL Yandex Telemost
2. Нажмите «Подключить бота»
3. Откройте встречу → страница стенограммы
4. Говорите в созвон — сегменты появляются в UI (SSE, с fallback на polling)

### 11.3 Выжимка и задачи

1. Остановите встречу — статус `ended`
2. Подождите генерацию (логи backend / audioray)
3. Откройте вкладки **Summary** и **Tasks**
4. Скачайте Markdown или PDF

### 11.4 TOTP (опционально)

1. `/settings/security` → Setup TOTP
2. Отсканируйте QR в Google Authenticator
3. Подтвердите код → при следующем login потребуется TOTP

### 11.5 curl (без UI)

```bash
# OTP
curl -X POST http://localhost:5000/auth/otp/send \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+79991234567","purpose":"register"}'

curl -X POST http://localhost:5000/auth/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+79991234567","code":"123456","purpose":"register"}'
# → accessToken

# Встреча
curl -X POST http://localhost:5000/meetings \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://telemost.yandex.ru/j/...","botName":"Аура"}'

# После stop — выжимка
curl http://localhost:5000/meetings/<id>/summary \
  -H "Authorization: Bearer <token>"
```

Чеклист тестирования: [docs/testing.md](docs/testing.md)

---

## 12. Порядок запуска

Запускайте **в отдельных терминалах** в таком порядке:

| # | Сервис | Команда | Порт |
|---|--------|---------|------|
| 1 | PostgreSQL | `brew services start postgresql@16` | 5432 |
| 2 | Redis | `docker start briefer-redis` (или см. §5) | 6379 |
| 3 | Ollama | `ollama serve` + модель pulled | 11434 |
| 4 | Audioray | `cd audioray && npm run start:dev` | 3000, 8081 |
| 5 | Aura | `cd aura && npm run start:dev` | 4000 |
| 6 | Backend | `cd backend && npm run start:dev` | 5000 |
| 7 | Frontend | `cd frontend && pnpm dev` | 5173 |

Остановка: `Ctrl+C` в обратном порядке.

`REDIS_ENABLED=false` — шаг 2 можно пропустить.

---

## 13. Типичные проблемы

### Audioray: «бинарник whisper server не найден»

```bash
cd audioray && npm run whisper:build
```

### Audioray: «модель не найдена»

Проверьте `audioray/models/ggml-large-v3-turbo.bin` и `WHISPER_MODEL` в `.env`.

### Backend: ошибка подключения к PostgreSQL

```bash
pg_isready
psql -d briefer -c "SELECT 1"
```

Проверьте `DB_*` в `backend/.env`.

### Aura: 401 Unauthorized

Заголовок `X-Internal-Token` должен совпадать в `aura/.env` и `backend/.env`.

### Frontend: CORS error

Убедитесь, что backend запущен с `CORS_ORIGIN=http://localhost:5173` и перезапущен после изменения `.env`.

### Frontend: пустая стенограмма

1. `curl http://localhost:3000/health` — whisperServer: true?
2. Aura запущена, бот в статусе `active`?
3. В логах aura — ошибки push в backend?

### Puppeteer / Chromium на Linux

```bash
# Debian/Ubuntu — зависимости для headless Chrome
sudo apt install -y chromium-browser fonts-liberation libasound2 \
  libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2
```

### Медленное распознавание

- Используйте `npm run whisper:build:metal` (Mac) или `:cuda` (NVIDIA)
- Для тестов: модель `ggml-base.bin`
- Увеличьте `BOT_CHUNK_INTERVAL_MS` до 8000

### Выжимка зависла в `processing`

1. Ollama запущен? `curl http://127.0.0.1:11434/api/tags`
2. Модель скачана? `ollama list`
3. Логи audioray — timeout?
4. `POST /meetings/:id/summary/regenerate` для повтора

### Redis connection refused

```bash
docker ps | grep redis
# или REDIS_ENABLED=false в backend/.env
```

### PDF без кириллицы

Обновите backend до версии с Roboto в pdfmake; пересоберите `npm run build`.

---

## Дальше

- [docs/roadmap.md](docs/roadmap.md) — план и фазы
- [docs/backlog.md](docs/backlog.md) — новые фичи
- [docs/risks-refactoring.md](docs/risks-refactoring.md) — риски и рефакторинг
- [docs/testing.md](docs/testing.md) — что и как тестировать
