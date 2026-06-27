# Бэклог: фичи и улучшения

## Высокий приоритет

| Фича | Описание | Сервис |
|------|----------|--------|
| TOTP settings page | `/settings/security` с QR для Google Authenticator | frontend |
| TypeORM migrations | Убрать `DB_SYNCHRONIZE` в prod | backend |
| SSE fallback | Polling `GET /transcript` если EventSource падает | frontend |
| E2E smoke tests | Регистрация → встреча → сегмент в UI | все |
| Prod SMS gateway | Twilio / SMS.ru вместо `ConsoleSmsGateway` | backend |

## Качество STT

| Фича | Описание | Сервис |
|------|----------|--------|
| Silero VAD | Точнее energy-based порога | audioray |
| Склейка чанков одного спикера | Меньше обрезанных фраз | aura + audioray |
| Per-meeting язык | `ru` / `auto` / `en` в настройках встречи | backend + audioray |
| Diarization | pyannote / whisperX если нет per-participant audio | audioray |
| Метрики STT | empty rate, latency p95, queue depth | audioray |

## Платформы

| Фича | Описание | Сервис |
|------|----------|--------|
| Google Meet bot | Join, аудио, спикеры (сейчас заглушка) | aura |
| Zoom / Teams | Новая платформа = `platforms/` + selectors | aura |
| Устойчивые селекторы Telemost | Вынести CSS, fallback при смене UI | aura |

## Фаза 5 — Продукт

| Фича | Описание |
|------|----------|
| LLM summary | Выжимка встречи после `ended` |
| Task extraction | Задачи из стенограммы → Trello API |
| Export | PDF, Markdown, Notion |
| Webhooks | Уведомление при завершении встречи |
| История встреч | Поиск, фильтры, архив |

## DevOps / Infra

| Фича | Описание |
|------|----------|
| Docker Compose | postgres + backend + aura + audioray + frontend |
| CI | lint + build на PR |
| Health dashboards | Prometheus metrics на `/health` расширениях |
| Secrets management | Vault / env в CI, не в репо |

## UX

| Фича | Описание |
|------|----------|
| Статус бота в UI | pending / active / failed с причиной |
| Редактирование сегментов | Post-correction стенограммы |
| Speaker colors | Цветовая кодировка спикеров |
| Mobile layout | Адаптив для планшетов |
| i18n | RU/EN интерфейс |

## API

| Фича | Описание |
|------|----------|
| Rate limiting | На auth и create meeting |
| Pagination | `GET /meetings?page=` |
| OpenAPI / Swagger | `@nestjs/swagger` на backend |
| WebSocket | Альтернатива SSE для transcript |
