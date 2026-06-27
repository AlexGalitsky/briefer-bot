# Briefer Bot — быстрый старт

Полная инструкция по локальному запуску всего стека: PostgreSQL → Backend → Aura → Audioray → Frontend.

---

## Содержание

1. [Что это](#1-что-это)
2. [Требования](#2-требования)
3. [Клонирование и структура](#3-клонирование-и-структура)
4. [PostgreSQL](#4-postgresql)
5. [Audioray — Whisper STT](#5-audioray--whisper-stt)
6. [Aura — бот видеосозвонов](#6-aura--бот-видеосозвонов)
7. [Backend — API и БД](#7-backend--api-и-бд)
8. [Frontend — UI](#8-frontend--ui)
9. [Проверка E2E](#9-проверка-e2e)
10. [Порядок запуска](#10-порядок-запуска)
11. [Типичные проблемы](#11-типичные-проблемы)

Дополнительно: [docs/](docs/README.md) — архитектура, план, риски, тестирование.

---

## 1. Что это

**Briefer Bot** — система для подключения бота к видеосозвонам, ведения live-стенограммы и (в перспективе) выжимок и задач.

```
Frontend (5173)  →  Backend (5000)  →  Aura (4000)  →  Audioray (3000)
                         ↓
                    PostgreSQL
```

| Сервис | Порт | Роль |
|--------|------|------|
| **frontend** | 5173 | React UI |
| **backend** | 5000 | Публичный API, auth, БД |
| **aura** | 4000 | Puppeteer-бот (internal) |
| **audioray** | 3000 + 8081 | Whisper STT (internal) |

---

## 2. Требования

### Общее

| Компонент | Версия |
|-----------|--------|
| Node.js | 20+ |
| npm | 9+ (backend, aura, audioray) |
| pnpm | 9+ (frontend) |
| PostgreSQL | 14+ |
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

## 5. Audioray — Whisper STT

### 5.1 Установка

```bash
cd audioray
npm install
cp .env.example .env
```

### 5.2 Сборка whisper.cpp server

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

### 5.3 Модель Whisper

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

### 5.4 Запуск

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

## 6. Aura — бот видеосозвонов

### 6.1 Установка

```bash
cd aura
npm install
cp .env.example .env
```

### 6.2 Конфигурация `.env`

```env
PORT=4000
BACKEND_URL=http://localhost:5000
INTERNAL_API_TOKEN=dev-internal-token
AUDIORAY_URL=http://localhost:3000/api/whisper/transcribe
BOT_CHUNK_INTERVAL_MS=6000
```

`INTERNAL_API_TOKEN` **должен совпадать** с backend.

### 6.3 Запуск

```bash
npm run start:dev
```

Проверка (нужен internal token):
```bash
curl -H "X-Internal-Token: dev-internal-token" http://localhost:4000/bot/status
```

Подробнее: [aura/README.md](aura/README.md)

---

## 7. Backend — API и БД

### 7.1 Установка

```bash
cd backend
npm install
cp .env.example .env
```

### 7.2 Конфигурация `.env`

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=briefer
DB_SYNCHRONIZE=true          # только dev!

JWT_SECRET=dev-jwt-secret-change-in-production
AUTH_DEV_EXPOSE_OTP=true     # OTP в ответе API (dev)

AURA_URL=http://localhost:4000
INTERNAL_API_TOKEN=dev-internal-token
CORS_ORIGIN=http://localhost:5173
```

### 7.3 Запуск

```bash
npm run start:dev
```

Проверка:
```bash
curl http://localhost:5000/health
```

Подробнее: [backend/README.md](backend/README.md)

---

## 8. Frontend — UI

### 8.1 Установка

```bash
cd frontend
pnpm install
cp .env.example .env
```

### 8.2 Конфигурация `.env`

```env
VITE_API_URL=http://localhost:5000
```

### 8.3 Запуск

```bash
pnpm dev
```

Откройте http://localhost:5173

Подробнее: [frontend/README.md](frontend/README.md), [frontend/PLAN.md](frontend/PLAN.md)

---

## 9. Проверка E2E

### 9.1 Регистрация

1. Откройте http://localhost:5173/register
2. Телефон: `+79991234567`
3. В dev код OTP показывается в UI (`devCode`) и в логах backend
4. После входа — редирект на `/meetings`

### 9.2 Встреча

1. Вставьте URL Yandex Telemost
2. Нажмите «Подключить бота»
3. Откройте встречу → страница стенограммы
4. Говорите в созвон — сегменты появляются в UI (SSE)

### 9.3 curl (без UI)

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
```

Чеклист тестирования: [docs/testing.md](docs/testing.md)

---

## 10. Порядок запуска

Запускайте **в отдельных терминалах** в таком порядке:

| # | Сервис | Команда | Порт |
|---|--------|---------|------|
| 1 | PostgreSQL | `brew services start postgresql@16` | 5432 |
| 2 | Audioray | `cd audioray && npm run start:dev` | 3000, 8081 |
| 3 | Aura | `cd aura && npm run start:dev` | 4000 |
| 4 | Backend | `cd backend && npm run start:dev` | 5000 |
| 5 | Frontend | `cd frontend && pnpm dev` | 5173 |

Остановка: `Ctrl+C` в обратном порядке (frontend → backend → aura → audioray).

---

## 11. Типичные проблемы

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

---

## Дальше

- [docs/roadmap.md](docs/roadmap.md) — план и фазы
- [docs/backlog.md](docs/backlog.md) — новые фичи
- [docs/risks-refactoring.md](docs/risks-refactoring.md) — риски и рефакторинг
- [docs/testing.md](docs/testing.md) — что и как тестировать
