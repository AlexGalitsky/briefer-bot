# Риски, рефакторинг, технический долг

## Критические риски

| Риск | Влияние | Митигация |
|------|---------|-----------|
| **Хрупкие CSS Telemost** | Бот перестаёт join/захватывать спикеров после обновления UI | Вынести селекторы, мониторинг, e2e на реальном созвоне |
| **`DB_SYNCHRONIZE=true`** | Потеря/искажение схемы в prod | Migrations до деплоя |
| **Нет тестов** | Регрессии при рефакторинге | Smoke e2e + unit на VAD/фильтр |
| **Один бот на инстанс Aura** | Нельзя параллельно несколько встреч | Документировать; очередь встреч или горизонтальное масштабирование |
| **Puppeteer в prod** | Память, crashes, anti-bot | Отдельный worker-хост, headless tuning, retry join |
| **Модель 1.6 GB в RAM** | OOM на слабом сервере | `ggml-base` для dev; мониторинг памяти audioray |
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

## Где нужен рефакторинг

### Backend (P1)

| Область | Проблема | Действие |
|---------|----------|----------|
| Migrations | `synchronize: true` только для dev | `typeorm migration:generate` |
| Config | Разброс env | Централизовать validation (class-validator) |
| AuraClient | Нет retry/backoff | Добавить при transient errors |
| SSE | Долгие соединения | Тест за proxy (nginx buffering) |

### Aura (P1)

| Область | Проблема | Действие |
|---------|----------|----------|
| `telemost.bot.ts` | Большой файл, хрупкие селекторы | `telemost.selectors.ts` + тесты селекторов |
| `base-bot.ts` | mute-audio, media block | Документировать / флаги env |
| Google Meet | Заглушка | Удалить или реализовать |
| Тесты | DI падает в spec | Моки AudiorayClient, BackendClient |

### Audioray (P2)

| Область | Проблема | Действие |
|---------|----------|----------|
| `whisper-node` vendor | Только бинарник | `scripts/build-whisper.sh` ✅, опционально свой fork |
| API validation | Слабая | DTO + ValidationPipe |
| Error responses | Всё → `text: ""` | Коды/поля `skippedReason` |
| Health | Нет метрик очереди | `queueDepth` в `/health` |

### Frontend (P2)

| Область | Проблема | Действие |
|---------|----------|----------|
| SSE reconnect | Нет auto-reconnect | exponential backoff в `useTranscriptStream` |
| Auth token | sessionStorage | Refresh strategy если добавится refresh token |
| Error boundaries | Нет | Обёртка на routes |
| `/settings/security` | Не реализовано | QR + confirm flow |

## Что улучшить без большого рефакторинга

1. **Документация** — QUICK_START, docs/ ✅
2. **build-whisper.sh** — явная сборка под Metal/CUDA ✅
3. **`.env.example`** — синхронизировать `INTERNAL_API_TOKEN` между сервисами
4. **Логирование** — structured JSON в prod (pino)
5. **Chunk interval** — env `BOT_CHUNK_INTERVAL_MS` (уже есть, документировать)

## Антипаттерны (не делать)

- Дублировать transcript в Aura после фазы 4
- Открывать internal API без token
- Коммитить модели `.bin` и recordings
- Использовать `synchronize: true` в production

## Файлы для ревью в первую очередь

| Приоритет | Файл | Причина |
|-----------|------|---------|
| P0 | `backend/src/meetings/` | Публичный API встреч |
| P0 | `aura/src/transcription/audioray.client.ts` | STT + push в backend |
| P0 | `aura/src/bot/platforms/telemost/telemost.bot.ts` | Захват аудио, спикеры |
| P1 | `audioray/src/whisper/whisper-process.service.ts` | Worker, очередь |
| P1 | `frontend/src/features/meetings/hooks/` | SSE stream |
| P2 | `backend/src/auth/` | OTP/TOTP security |
