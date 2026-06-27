# План разработки Frontend (Фаза 6)

**Проект:** Briefer Bot — UI для встреч и live-стенограммы  
**Дата:** 27 июня 2026  
**Связанные документы:** [docs/roadmap.md](../docs/roadmap.md), [docs/testing.md](../docs/testing.md), [.cursorrules](./.cursorrules)

---

## Цель

SPA на React 19: регистрация/вход по телефону, управление встречами, просмотр стенограммы в реальном времени. **Единственный backend API** — `backend` (порт 5000). Прямых вызовов Aura/Audioray нет.

---

## Стек (зафиксирован в `.cursorrules`)

| Слой | Технология |
|------|------------|
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Сборка | Vite 8, pnpm |
| Роутинг | TanStack Router (file-based, `src/routes/`) |
| Серверный стейт | TanStack Query v5 + Axios |
| Клиентский UI-стейт | Zustand (модалки, sidebar, тема) |
| Формы + API | React Hook Form + **Zod** (формы и контракты запросов/ответов) |
| Линтер | oxlint |

---

## Текущее состояние

- [x] Scaffold: Vite 8, React 19, TanStack Router + Query
- [x] shadcn/ui: полный набор компонентов в `src/components/ui/`
- [x] Tailwind v4 через `src/index.css`
- [x] Алиас `@/` → `src/`
- [x] Интеграция с backend API (`api-client`, Zod parse)
- [x] Auth flow (OTP + TOTP step в форме)
- [x] Экраны встреч и live-стенограммы (SSE)
- [x] Темы light/dark
- [x] `.env.example`
- [ ] `/settings/security` — TOTP setup с QR
- [ ] Polling fallback при недоступности SSE

---

## Архитектура

```
frontend (5173)
    │  HTTPS / Bearer JWT
    ▼
backend (5000)  ← единственная точка входа
    │
    ├── aura (internal)
    └── audioray (internal)
```

### Целевая структура `src/`

```
src/
├── lib/
│   ├── api-client.ts      # axios instance, interceptors, Bearer
│   └── utils.ts           # cn() — уже есть
├── features/
│   ├── auth/
│   │   ├── api/           # useSendOtp, useVerifyOtp + zod parse
│   │   ├── components/    # PhoneForm, OtpForm, TotpSetup
│   │   ├── schemas/       # sendOtpBodySchema, authResponseSchema
│   │   └── store/         # auth token (или sessionStorage)
│   ├── meetings/
│   │   ├── api/           # useMeetings, useCreateMeeting, useStopMeeting
│   │   ├── components/    # MeetingCard, StartMeetingForm
│   │   └── hooks/         # useTranscriptStream (SSE)
│   └── transcript/
│       └── components/    # TranscriptView, SegmentList
├── components/
│   ├── ui/                # shadcn — не трогать без нужды
│   └── shared/            # AppLayout, ProtectedRoute, PageHeader
└── routes/
    ├── __root.tsx
    ├── index.tsx          # redirect → /meetings или /login
    ├── login.tsx
    ├── register.tsx
    ├── meetings/
    │   ├── index.tsx      # список встреч
    │   └── $meetingId.tsx # детали + live transcript
    └── settings/
        └── security.tsx   # TOTP setup
```

---

## Контракт с Backend

Base URL: `VITE_API_URL` (default `http://localhost:5000`)

### Auth

| Метод | Путь | Назначение |
|-------|------|------------|
| POST | `/auth/otp/send` | `{ phone, purpose: "register" \| "login" }` |
| POST | `/auth/otp/verify` | `{ phone, code, purpose, totpCode? }` → JWT или `{ requiresTotp: true }` |
| POST | `/auth/totp/setup` | Bearer → `{ otpauthUrl }` |
| POST | `/auth/totp/confirm` | Bearer → `{ code }` |
| DELETE | `/auth/totp` | Отключить TOTP |

**JWT:** Bearer в заголовке `Authorization`. Хранение: `sessionStorage` (MVP) или httpOnly cookie (позже, нужна доработка backend).

### Meetings (JWT)

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/meetings` | Список встреч пользователя |
| POST | `/meetings` | `{ url, botName? }` — старт бота |
| POST | `/meetings/:id/stop` | Остановка |
| GET | `/meetings/:id` | Детали + segmentCount |
| GET | `/meetings/:id/transcript` | Полная стенограмма |
| GET | `/meetings/:id/transcript/stream` | SSE live-сегменты |

### Dev-особенности backend

- `AUTH_DEV_EXPOSE_OTP=true` — OTP в ответе `send` (удобно для UI без SMS)
- CORS: при необходимости добавить в `backend/src/main.ts` для `http://localhost:5173`

---

## Подфазы реализации

### 6.0 — Инфраструктура (1–2 дня)

- [x] `pnpm add zod @hookform/resolvers`
- [x] `src/lib/api-client.ts` — axios, baseURL из env, interceptor 401 → `/login`
- [x] **Zod для API:** схемы request/response в `features/*/schemas/`; в `queryFn`/`mutationFn` — `schema.parse(res.data)` (или `safeParse` + нормализованная ошибка)
- [x] Паттерн: `parseApiResponse(authResponseSchema, data)` — единая точка валидации
- [x] `.env.example`: `VITE_API_URL=http://localhost:5000`
- [ ] `vite.config.ts`: proxy `/api` → backend (опционально)
- [x] Типы API: `src/features/*/types.ts` или общий `src/types/api.ts`
- [x] `AppLayout` + навигация вместо demo `about`
- [x] Route guard: `beforeLoad` в TanStack Router — редирект без токена

### 6.1 — Auth (2–3 дня)

- [x] `/register` — телефон → OTP → JWT
- [x] `/login` — телефон → OTP → (TOTP если `requiresTotp`) → JWT
- [x] Zod-схемы: телефон E.164 / +7, код 6 цифр
- [x] `input-otp` (shadcn) для кода SMS
- [x] Zustand или context: `accessToken`, `user` (phone, totpEnabled)
- [ ] `/settings/security` — QR из `otpauthUrl`, подтверждение TOTP

### 6.2 — Встречи (2–3 дня)

- [x] `/meetings` — список (`useQuery` meetings)
- [x] Форма старта: URL Telemost/Meet + имя бота
- [x] Карточка встречи: platform, status, startedAt
- [x] Кнопка «Остановить» → `useMutation` stop
- [x] Статусы: `pending` | `starting` | `active` | `ended` | `failed` (badge)

### 6.3 — Live-стенограмма (2–3 дня)

- [x] `/meetings/$meetingId` — загрузка transcript (`transcriptResponseSchema`) + live stream
- [x] **SSE с Bearer:** не нативный `EventSource`, а `fetch` + stream (см. раздел ниже) — заголовок `Authorization` работает
- [x] `TranscriptView`: список сегментов, автоскролл (`message-scroller`)
- [ ] Polling fallback если stream упал (`refetchInterval` при `status === 'active'`)

### 6.4 — Полировка (1–2 дня)

- [x] Toast (sonner): ошибки API, успех старт/стоп
- [x] Empty states (`Empty` component)
- [x] Skeleton при загрузке
- [x] Mobile-first layout (sidebar → sheet на мобиле)
- [x] Тёмная тема (`next-themes` — уже в deps)

### 6.5 — После фазы 5 (резерв)

- [ ] Просмотр выжимок (Summary)
- [ ] Задачи / Trello
- [ ] Экспорт стенограммы

---

## Критерии готовности фазы 6

1. Пользователь регистрируется и логинится через UI (OTP в dev)
2. Создаёт встречу по URL Telemost — бот стартует через backend
3. На странице встречи видит сегменты стенограммы в реальном времени
4. Останавливает встречу из UI
5. Нет прямых запросов к aura:4000 / audioray:3000

---

## Запуск (dev)

```bash
# Терминал 1: PostgreSQL + backend + aura + audioray (см. backend/README.md)

# Терминал 2: frontend
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```

---

## Zod: формы и API

Один инструмент валидации на весь периметр данных:

| Где | Что валидируем |
|-----|----------------|
| Формы (RHF) | `zodResolver(loginSchema)` — ввод пользователя |
| Тело запроса | `createMeetingBodySchema.parse(values)` перед `axios.post` |
| Ответ API | `meetingSchema.parse(res.data)` в `queryFn` — runtime-проверка контракта |

```typescript
// features/meetings/schemas/meeting.schema.ts
export const meetingSchema = z.object({
  id: z.string().uuid(),
  platform: z.enum(['yandex-telemost', 'google-meet']),
  status: z.enum(['pending', 'starting', 'active', 'ended', 'failed']),
  // ...
})

// features/meetings/api/use-meetings.ts
queryFn: async () => {
  const { data } = await apiClient.get('/meetings')
  return z.object({ meetings: z.array(meetingSchema) }).parse(data)
}
```

Если backend вернул не то, что ожидали — падаем на parse с понятной ошибкой (лучше, чем тихий `undefined` в UI).

---

## SSE и авторизация

### В чём проблема

Сейчас backend защищён **JWT в заголовке** `Authorization: Bearer <token>` (глобальный `JwtAuthGuard`).

Обычные запросы через axios это умеют:

```typescript
apiClient.get('/meetings', {
  headers: { Authorization: `Bearer ${token}` },
})
```

А нативный **`EventSource`** в браузере принимает **только URL**:

```typescript
// ❌ Так нельзя — второго аргумента с headers в спецификации нет
new EventSource('/meetings/123/transcript/stream', {
  headers: { Authorization: 'Bearer ...' }, // не существует
})
```

Поэтому `GET /meetings/:id/transcript/stream` с `@Sse` и JWT-guard **не авторизуется**, если открыть stream через `EventSource` без доработок. Это не баг NestJS — ограничение Web API.

### Варианты решения

| Подход | Плюсы | Минусы |
|--------|-------|--------|
| **`fetch` + ReadableStream** (рекомендуем) | Bearer в заголовке, без смены auth на backend | Чуть больше кода, парсинг SSE вручную или `@microsoft/fetch-event-source` |
| **Cookie (httpOnly)** | `EventSource` шлёт cookie сам | Нужно перевести login на `Set-Cookie`, CORS `credentials: true` |
| **`?access_token=` в URL** | Просто для `EventSource` | JWT в URL: логи прокси, history, Referer — плохая практика |
| **Короткий stream-token** | Безопаснее query-параметра | Отдельный эндпоинт на backend |

**Рекомендация для проекта:** оставить Bearer в `sessionStorage` и для live-стенограммы использовать **fetch-based SSE** с заголовком `Authorization`. Backend менять не нужно.

```typescript
// Псевдокод: fetch с Bearer, парсим text/event-stream
const res = await fetch(`${API_URL}/meetings/${id}/transcript/stream`, {
  headers: { Authorization: `Bearer ${token}` },
})
const reader = res.body!.getReader()
// читаем чанки, режем по "data: {...}\n\n", transcriptSegmentSchema.parse(...)
```

Альтернатива: `pnpm add @microsoft/fetch-event-source` — тот же смысл, готовый парсер.

### Когда нужны cookie или `?token=`

- **Cookie** — если хотите именно `new EventSource(url)` без fetch-обёртки.
- **`?access_token=`** — быстрый хак для прототипа; для prod нежелательно.

---

## Риски и решения

| Риск | Решение |
|------|---------|
| SSE + Bearer | Fetch-based SSE с `Authorization` (см. выше), не нативный `EventSource` |
| CORS | `app.enableCors({ origin: 'http://localhost:5173', credentials: true })` — только если перейдёте на cookie |
| OTP в prod | UI готов; SMS приходит с бэка, devCode скрыт |
| Контракт API drift | Zod parse на каждом ответе |

---

## Чеклист соответствия `.cursorrules`

- File-based routes только через `createFileRoute`
- API только через хуки TanStack Query, не `useEffect` + fetch
- **Zod** — формы (RHF) и request/response API
- Zustand — только UI, не meetings/transcript data
- `import type` для типов
- Без `React.FC`, без лишних `useMemo`/`useCallback`
- Стили: Tailwind v4, `cn()`, mobile-first

---

*Обновлять по завершении каждой подфазы 6.x*
