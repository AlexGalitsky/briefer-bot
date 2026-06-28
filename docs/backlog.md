# Бэклог: фичи и улучшения

**Обновлено:** 27 июня 2026

## Высокий приоритет

| Фича | Описание | Сервис | Статус |
|------|----------|--------|--------|
| E2E smoke tests | Регистрация → встреча → сегмент → выжимка в UI | все | ⏳ |
| Prod SMS gateway | Twilio / SMS.ru вместо `ConsoleSmsGateway` | backend | ⏳ |
| Staging migrations | `DB_SYNCHRONIZE=false` + `migration:run` на staging | backend | ⏳ |

## Сделано недавно ✅

| Фича | Сервис |
|------|--------|
| TOTP settings page `/settings/security` с QR | frontend |
| TypeORM migrations (initial + summary/tasks) | backend |
| SSE reconnect + polling fallback | frontend |
| LLM summary + tasks (Ollama) | audioray + backend |
| BullMQ + Redis для выжимок | backend |
| Экспорт Markdown / PDF | backend + frontend |
| Multi-bot (`BOT_MAX_CONCURRENT`) | aura |
| Telemost selectors в отдельном файле | aura |
| Mobile layout (sidebar → sheet) | frontend |
| UI вкладки Summary / Tasks | frontend |

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
| Устойчивые селекторы Telemost | Мониторинг при смене UI Яндекса | aura |

## Фаза 5 — Продукт (остаток)

| Фича | Описание | Статус |
|------|----------|--------|
| LLM summary | Выжимка после `ended` | ✅ |
| Task extraction | Задачи из стенограммы | ✅ (в БД, без Trello) |
| Export PDF / Markdown | Скачивание выжимки | ✅ |
| Trello sync | Отправка задач во внешний трекер | ⏳ |
| Webhooks | Уведомление при завершении встречи | ⏳ |
| Export Notion | Интеграция с Notion API | ⏳ |
| История встреч | Поиск, фильтры, архив | ⏳ |

## DevOps / Infra

| Фича | Описание |
|------|----------|
| Docker Compose | postgres + redis + ollama + backend + aura + audioray + frontend |
| CI | lint + build на PR |
| Health dashboards | Prometheus metrics на `/health` расширениях |
| Secrets management | Vault / env в CI, не в репо |

## UX

| Фича | Описание | Статус |
|------|----------|--------|
| Статус бота в UI | pending / active / failed с причиной | ⏳ |
| Редактирование сегментов | Post-correction стенограммы | ⏳ |
| Speaker colors | Цветовая кодировка спикеров | ⏳ |
| Mobile layout | Адаптив для планшетов | ✅ |
| i18n | RU/EN интерфейс | ⏳ |
| Прогресс генерации выжимки | Spinner / статус `processing` | 🟡 частично |

## API

| Фича | Описание |
|------|----------|
| Rate limiting | На auth и create meeting |
| Pagination | `GET /meetings?page=` |
| OpenAPI / Swagger | `@nestjs/swagger` на backend |
| WebSocket | Альтернатива SSE для transcript |
