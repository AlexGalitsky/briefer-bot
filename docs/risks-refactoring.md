# Риски, рефакторинг, технический долг

**Обновлено:** 27 июня 2026

## Критические риски

| Риск | Влияние | Митигация |
|------|---------|-----------|
| **Хрупкие CSS Telemost** | Бот перестаёт join/захватывать спикеров после обновления UI | `telemost.selectors.ts` ✅, мониторинг, e2e на реальном созвоне |
| **`DB_SYNCHRONIZE=true` в prod** | Потеря/искажение схемы | Migrations ✅ — включить `DB_SYNCHRONIZE=false` на staging/prod |
| **Нет тестов** | Регрессии при рефакторинге | Smoke e2e + unit на VAD/фильтр |
| **Puppeteer в prod** | Память, crashes, anti-bot | Отдельный worker-хост, headless tuning, retry join |
| **Модель Whisper 1.6 GB в RAM** | OOM на слабом сервере | `ggml-base` для dev; мониторинг памяти audioray |
| **Ollama timeout / OOM** | Выжимка зависает в `processing` | `OLLAMA_TIMEOUT_MS`, меньшая модель, retry в BullMQ |
| **Redis недоступен** | Очередь не работает | `REDIS_ENABLED=false` → in-process fallback |
| **Internal token в .env** | Утечка = полный доступ к internal API | Rotate, IP allowlist, mTLS в prod |

## Средние риски

| Риск | Где | Рекомендация |
|------|-----|--------------|
| Пустой `text` при ошибке | audioray | Различать VAD skip vs error в ответе или логах |
| Multer in-memory | audioray | Лимит размера файла |
| Синхронный FS | audioray transcripts | async `fs/promises` |
| `--mute-audio` / block media | aura base-bot | Проверить на реальных созвонах |
| OTP в dev response | backend | Выключить `AUTH_DEV_EXPOSE_OTP` в prod |
| CORS single origin | backend | Настроить prod domain |
| PDF кириллица | backend export | Roboto в pdfmake ✅ — проверить на prod |

## Где нужен рефакторинг

### Backend (P1)

| Область | Проблема | Действие |
|---------|----------|----------|
| Migrations | Скелет есть ✅ | CI: `migration:run` на deploy |
| Config | Разброс env | Централизовать validation (class-validator) |
| AuraClient | Нет retry/backoff | Добавить при transient errors |
| SSE | Долгие соединения | Тест за proxy (nginx buffering) |
| Summary retry | Failed job | Dead-letter + manual regenerate |

### Aura (P1)

| Область | Проблема | Действие |
|---------|----------|----------|
| `telemost.bot.ts` | Большой файл | Селекторы вынесены ✅; дальше — unit-тесты |
| `base-bot.ts` | mute-audio, media block | Документировать / флаги env |
| Google Meet | Заглушка | Удалить или реализовать |
| Тесты | DI падает в spec | Моки AudiorayClient, BackendClient |

### Audioray (P2)

| Область | Проблема | Действие |
|---------|----------|----------|
| `whisper-node` vendor | Только бинарник | `scripts/build-whisper.sh` ✅ |
| API validation | Слабая | DTO + ValidationPipe |
| Error responses | Всё → `text: ""` | Коды/поля `skippedReason` |
| Health | Нет метрик очереди | `queueDepth` в `/health` |
| Summary prompt | Хрупкий парсинг JSON | Structured output / JSON mode Ollama |

### Frontend (P2)

| Область | Проблема | Действие |
|---------|----------|----------|
| SSE reconnect | ✅ exponential backoff | — |
| Auth token | sessionStorage | Refresh strategy если добавится refresh token |
| Summary polling | Интервал фиксированный | Backoff при `processing` |
| routeTree.gen.ts | Ручной патч security route | Перегенерировать через TanStack Router CLI |

## Технический долг (сводка)

| Приоритет | Область | Статус |
|-----------|---------|--------|
| P0 | Migrations для prod | 🟡 файлы есть, prod не включено |
| P0 | E2E тесты | 🔴 |
| P1 | Google Meet или удаление заглушки | 🔴 |
| P1 | Prod SMS | 🔴 |
| P2 | Silero VAD | 🔴 |
| P2 | OpenAPI docs | 🔴 |
| P2 | Docker Compose | 🔴 |

## Снятые риски (2026)

- ~~Один бот на инстанс Aura~~ → multi-bot с `BOT_MAX_CONCURRENT`
- ~~Нет TOTP UI~~ → `/settings/security`
- ~~Нет SSE fallback~~ → reconnect + polling
- ~~Нет выжимок~~ → Ollama + BullMQ + UI
