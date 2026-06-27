# Frontend (Briefer Bot)

React 19 SPA: регистрация/вход, управление встречами, live-стенограмма.

**API:** только [backend](../backend/) (`VITE_API_URL`). Прямых вызовов Aura/Audioray нет.

## Требования

- Node.js 20+
- pnpm 9+
- Запущенный backend (порт 5000)

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
| Live transcript | SSE (`@microsoft/fetch-event-source`) |
| Темы | next-themes (light/dark) |

## Маршруты

| Путь | Описание |
|------|----------|
| `/login` | Вход (OTP) |
| `/register` | Регистрация |
| `/meetings` | Список встреч |
| `/meetings/:id` | Детали + live-стенограмма |
| `/settings/security` | TOTP setup (TODO) |

## Структура

```
src/
├── lib/           # api-client, parse-api, auth-session
├── features/
│   ├── auth/
│   └── meetings/
├── components/
│   ├── ui/        # shadcn
│   └── shared/    # AppLayout, ThemeToggle
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
