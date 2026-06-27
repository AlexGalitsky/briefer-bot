# Документация Briefer Bot

**Обновлено:** 27 июня 2026

Монорепозиторий для подключения бота к видеосозвонам, live-стенограммы и (в перспективе) выжимок и задач.

## Быстрый старт

→ **[QUICK_START.md](../QUICK_START.md)** — полная инструкция по локальному запуску, включая сборку whisper.cpp.

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

## Текущий статус (кратко)

| Область | Статус |
|---------|--------|
| Ядро (Telemost + Whisper) | ✅ Работает |
| Backend + PostgreSQL | ✅ Фаза 4 |
| Frontend (auth, meetings, SSE) | ✅ Фаза 6 (кроме `/settings/security`) |
| Google Meet | 🔴 Заглушка |
| LLM / Trello (фаза 5) | ⏳ Не начато |
| Тесты | 🔴 Почти нет |

---

*Ранее весь аудит был в одном файле `AUDIT.md` — теперь разбит по разделам выше.*
