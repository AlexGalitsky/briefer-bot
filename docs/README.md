# Документация Briefer Bot

**Обновлено:** 27 июня 2026

Монорепозиторий для подключения бота к видеосозвонам, live-стенограммы, AI-выжимок и задач.

## Быстрый старт

→ **[QUICK_START.md](../QUICK_START.md)** — полная инструкция по локальному запуску, включая whisper.cpp, Redis, Ollama.

## Содержание

| Документ | Описание |
|----------|----------|
| [architecture.md](architecture.md) | Архитектура, роли сервисов, поток данных, схема БД |
| [roadmap.md](roadmap.md) | Фазы 0–6, статус, критерии готовности |
| [backlog.md](backlog.md) | Новые фичи и улучшения |
| [risks-refactoring.md](risks-refactoring.md) | Риски, рефакторинг, технический долг |
| [testing.md](testing.md) | Чеклисты тестирования, метрики качества |
| [quality-stt.md](quality-stt.md) | Качество распознавания речи |
| [history.md](history.md) | Исторические баги (исправлены в фазах 0–4) |

## Сервисы

| Сервис | README | Порт (dev) |
|--------|--------|------------|
| Frontend | [frontend/README.md](../frontend/README.md) | 5173 |
| Backend | [backend/README.md](../backend/README.md) | 5000 |
| Aura | [aura/README.md](../aura/README.md) | 4000 |
| Audioray | [audioray/README.md](../audioray/README.md) | 3000 (+ 8081 whisper server) |
| Redis | — (BullMQ) | 6379 |
| Ollama | — (LLM для выжимок) | 11434 |

## Текущий статус (кратко)

| Область | Статус |
|---------|--------|
| Ядро (Telemost + Whisper) | ✅ Работает |
| Backend + PostgreSQL + миграции | ✅ |
| Frontend (auth, meetings, SSE, TOTP) | ✅ Фаза 6 |
| LLM-выжимка + задачи (Ollama) | ✅ Фаза 5 (частично) |
| BullMQ + экспорт MD/PDF | ✅ |
| Multi-bot Aura | ✅ `BOT_MAX_CONCURRENT` |
| Google Meet | 🔴 Заглушка |
| Trello / webhooks / Notion | ⏳ Не начато |
| Тесты | 🔴 Почти нет |

---

*Ранее весь аудит был в одном файле `AUDIT.md` — теперь разбит по разделам выше.*
