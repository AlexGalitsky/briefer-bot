# Frontend (Briefer Bot)

React 19 SPA: регистрация/вход, управление встречами, live-стенограмма, выжимка и задачи.

**API:** только [backend](../backend/) (`VITE_API_URL`). Прямых вызовов Aura/Audioray/Ollama нет.

## Требования

- Node.js 20+
- pnpm 9+
- Запущенный backend (порт 5000)
- Для выжимок: Ollama + audioray (backend триггерит после `ended`)

## Установка и запуск

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Откройте http://localhost:5173

## Конфигурация (`.env`)

```env
VITE_API_URL=http://localhost:5000
```

## Стек

| Слой | Технология |
|------|------------|
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Сборка | Vite 8, pnpm |
| Роутинг | TanStack Router (file-based) |
| Серверный стейт | TanStack Query + Axios |
| Формы | React Hook Form + Zod |
| Live transcript | SSE + polling fallback |
| Темы | next-themes (light/dark) |
| QR для TOTP | qrcode.react |

## Маршруты

| Путь | Описание |
|------|----------|
| `/login` | Вход (OTP + TOTP step) |
| `/register` | Регистрация |
| `/meetings` | Список встреч |
| `/meetings/:id` | Стенограмма + вкладки Summary / Tasks |
| `/settings/security` | TOTP setup с QR-кодом |

## Страница встречи

- **Transcript** — live SSE с auto-reconnect; при ошибке SSE — polling `GET /transcript`
- **Summary** — markdown-выжимка; кнопки «Скачать MD» / «Скачать PDF»; regenerate
- **Tasks** — чеклист задач, toggle `completed`

## Структура

```
src/
├── lib/           # api-client, parse-api, auth-session
├── features/
│   ├── auth/
│   ├── meetings/
│   └── summary/   # use-summary, summary.api, schemas
├── components/
│   ├── ui/        # shadcn
│   └── shared/    # AppLayout (mobile sheet), ThemeToggle
└── routes/
```

## Скрипты

| Команда | Описание |
|---------|----------|
| `pnpm dev` | Dev-сервер :5173 |
| `pnpm build` | Production build |
| `pnpm preview` | Preview build |

## Разработка

- План и чеклисты: [PLAN.md](PLAN.md)
- Гайдлайны: [.cursorrules](.cursorrules)
- Архитектура: [docs/architecture.md](../docs/architecture.md)

## См. также

- [QUICK_START.md](../QUICK_START.md)
- [backend/README.md](../backend/README.md)
