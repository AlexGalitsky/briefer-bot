# Тестирование

**Обновлено:** 27 июня 2026

## Чеклист перед релизом

### Инфраструктура

- [ ] PostgreSQL доступен, БД `briefer` создана
- [ ] `INTERNAL_API_TOKEN` совпадает в backend и aura
- [ ] `AURA_URL`, `AUDIORAY_URL`, `VITE_API_URL` корректны
- [ ] `npm run whisper:build` выполнен (audioray health: whisperServer true)
- [ ] Модель Whisper в `audioray/models/`
- [ ] Ollama запущен, модель скачана (`ollama pull deepseek-r1:14b`)
- [ ] Redis доступен (если `REDIS_ENABLED=true`)
- [ ] `ffmpeg -version` работает

### Auth (backend + frontend)

- [ ] `POST /auth/otp/send` register — OTP в dev
- [ ] `POST /auth/otp/verify` register — JWT
- [ ] Login существующего пользователя
- [ ] Login с TOTP (если включён) — `requiresTotp: true` → verify с `totpCode`
- [ ] `/settings/security` — setup TOTP, QR сканируется, confirm работает
- [ ] Защищённые роуты без token → 401
- [ ] Logout / истечение сессии

### Meetings

- [ ] `POST /meetings` с валидным Telemost URL
- [ ] Невалидный URL → 400
- [ ] `GET /meetings` — список только своих встреч
- [ ] `POST /meetings/:id/stop` — статус `ended`
- [ ] Повторный start при активном боте — ожидаемое поведение
- [ ] Две параллельные встречи (если `BOT_MAX_CONCURRENT >= 2`)

### E2E: бот + стенограмма

- [ ] Бот входит в Telemost (логи aura: joined)
- [ ] При разговоре — сегменты в PostgreSQL
- [ ] `GET /meetings/:id/transcript` возвращает сегменты
- [ ] SSE в UI обновляется без перезагрузки
- [ ] Обрыв SSE → reconnect или polling fallback
- [ ] После stop — новые сегменты не появляются
- [ ] Статус встречи: pending → active → ended

### E2E: выжимка и задачи

- [ ] После `ended` — summary job в очереди (логи backend) или in-process
- [ ] `GET /meetings/:id/summary` → `status: completed`, markdown не пустой
- [ ] `GET /meetings/:id/tasks` → список задач
- [ ] UI: вкладки Summary / Tasks показывают данные
- [ ] `POST /meetings/:id/summary/regenerate` — повторная генерация
- [ ] `GET .../summary/export/markdown` — скачивается `.md`
- [ ] `GET .../summary/export/pdf` — скачивается `.pdf` с кириллицей
- [ ] `PATCH /meetings/:id/tasks/:taskId` — toggle `completed` в UI

### Audioray (изолированно)

```bash
curl -X POST http://localhost:3000/api/whisper/transcribe \
  -F "file=@test.webm" -F "speaker=Test"
```

- [ ] Валидный WebM с речью → непустой `text`
- [ ] Тишина → пустой `text` (VAD)
- [ ] Без `speaker` → 400
- [ ] `GET /health` — все checks true

```bash
curl -X POST http://localhost:3000/api/summary/generate \
  -H 'Content-Type: application/json' \
  -d '{"transcript":"Иван: Договорились сделать отчёт до пятницы."}'
```

- [ ] Ответ с `summaryMarkdown` и `tasks[]`
- [ ] Ollama недоступен → понятная ошибка / timeout

### Aura (изолированно)

```bash
curl -H "X-Internal-Token: dev-internal-token" \
  -X POST http://localhost:4000/bot/start \
  -H 'Content-Type: application/json' \
  -d '{"meetingId":"test-id","url":"https://telemost.yandex.ru/j/...","botName":"Test"}'
```

- [ ] Без token → 401
- [ ] Ошибка join → `success: false` (не молчаливый success)
- [ ] `GET /bot/status` — список активных ботов
- [ ] `POST /bot/stop` с `meetingId` — останавливает только одну встречу

### Frontend UI

- [ ] Register → redirect `/meetings`
- [ ] Создание встречи из формы
- [ ] Страница встречи: список сегментов растёт
- [ ] Light/dark theme переключается
- [ ] Mobile viewport: sidebar → sheet, читаемый layout
- [ ] Ошибки API показываются пользователю (toast/alert)
- [ ] Кнопки экспорта MD/PDF работают

### Негативные сценарии

- [ ] Backend down — frontend показывает ошибку
- [ ] Aura down — create meeting → failed/pending с сообщением
- [ ] Audioray down — бот работает, сегментов нет (проверить логи aura)
- [ ] Ollama down — summary `failed`, UI показывает ошибку
- [ ] Redis down при `REDIS_ENABLED=true` — fallback или явная ошибка
- [ ] Обрыв SSE — переподключение или polling ✅

## На что обратить внимание

| Область | Что проверять |
|---------|---------------|
| Latency STT | Время от чанка до сегмента в UI (< 15 с на Metal) |
| Empty rate | Доля пустых ответов при реальной речи |
| Summary quality | Задачи соответствуют стенограмме, нет выдумок |
| PDF export | Кириллица, переносы строк, заголовок встречи |
| Multi-bot | Нет cross-talk между meetingId |
| Memory | audioray + ollama на одном хосте — следить за RAM |

## Метрики (целевые)

| Метрика | Target |
|---------|--------|
| STT latency p95 | < 12 с (large-v3-turbo, Metal) |
| Empty chunk rate | < 30% при активной речи |
| Summary generation | < 120 с для 30 мин встречи |
| SSE reconnect | < 5 с до восстановления потока |
| Uptime bot join | > 95% на Telemost |

## Автотесты (TODO)

| Тип | Инструмент | Покрытие |
|-----|------------|----------|
| Unit | Jest | VAD, hallucination-filter, summary parser |
| API | supertest | auth, meetings, summary export |
| E2E | Playwright | register → meeting → transcript → summary |
