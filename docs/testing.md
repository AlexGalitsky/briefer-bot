# Тестирование

## Чеклист перед релизом

### Инфраструктура

- [ ] PostgreSQL доступен, БД `briefer` создана
- [ ] `INTERNAL_API_TOKEN` совпадает в backend и aura
- [ ] `AURA_URL`, `AUDIORAY_URL`, `VITE_API_URL` корректны
- [ ] `npm run whisper:build` выполнен (audioray health: whisperServer true)
- [ ] Модель в `audioray/models/`
- [ ] `ffmpeg -version` работает

### Auth (backend + frontend)

- [ ] `POST /auth/otp/send` register — OTP в dev
- [ ] `POST /auth/otp/verify` register — JWT
- [ ] Login существующего пользователя
- [ ] Login с TOTP (если включён) — `requiresTotp: true` → verify с `totpCode`
- [ ] Защищённые роуты без token → 401
- [ ] Logout / истечение сессии

### Meetings

- [ ] `POST /meetings` с валидным Telemost URL
- [ ] Невалидный URL → 400
- [ ] `GET /meetings` — список только своих встреч
- [ ] `POST /meetings/:id/stop` — статус `ended`
- [ ] Повторный start при активном боте — ожидаемое поведение

### E2E: бот + стенограмма

- [ ] Бот входит в Telemost (логи aura: joined)
- [ ] При разговоре — сегменты в PostgreSQL
- [ ] `GET /meetings/:id/transcript` возвращает сегменты
- [ ] SSE в UI обновляется без перезагрузки
- [ ] После stop — новые сегменты не появляются
- [ ] Статус встречи: pending → active → ended

### Audioray (изолированно)

```bash
curl -X POST http://localhost:3000/api/whisper/transcribe \
  -F "file=@test.webm" -F "speaker=Test"
```

- [ ] Валидный WebM с речью → непустой `text`
- [ ] Тишина → пустой `text` (VAD)
- [ ] Без `speaker` → 400
- [ ] `GET /health` — все checks true

### Aura (изолированно)

```bash
curl -H "X-Internal-Token: dev-internal-token" \
  -X POST http://localhost:4000/bot/start \
  -H 'Content-Type: application/json' \
  -d '{"meetingId":"test-id","url":"https://telemost.yandex.ru/j/...","botName":"Test"}'
```

- [ ] Без token → 401
- [ ] Ошибка join → `success: false` (не молчаливый success)

### Frontend UI

- [ ] Register → redirect `/meetings`
- [ ] Создание встречи из формы
- [ ] Страница встречи: список сегментов растёт
- [ ] Light/dark theme переключается
- [ ] Ошибки API показываются пользователю (toast/alert)
- [ ] Mobile viewport читаем

### Негативные сценарии

- [ ] Backend down — frontend показывает ошибку
- [ ] Aura down — create meeting → failed/pending с сообщением
- [ ] Audioray down — бот работает, сегментов нет (проверить логи aura)
- [ ] Обрыв SSE — переподключение или polling (когда реализовано)

## На что обратить внимание

### Качество STT

- Галлюцинации на тишине («Редактор субтитров…»)
- Обрезанные фразы на границах чанков
- Неверный спикер при быстрой смене
- Задержка > 10 с между речью и появлением в UI

### Puppeteer / Telemost

- Бот не в конференции (только waiting room)
- Смена UI Яндекса — селекторы спикеров
- Долгие созвоны (>1 ч) — утечки памяти
- Несколько участников — микшированный аудиопоток

### Безопасность

- `AUTH_DEV_EXPOSE_OTP=false` в staging/prod
- JWT secret не дефолтный
- Internal endpoints недоступны снаружи
- CORS только нужные origins

## Метрики качества (мониторинг)

| Метрика | Как считать | Цель |
|---------|-------------|------|
| Empty rate | % чанков с `text: ""` | < 40% |
| Hallucination rate | % отфильтрованных | → 0 после VAD |
| Latency p95 | чанк → сегмент в БД | < 8 с |
| Queue depth | чанков в очереди audioray | ≤ 2 |
| Bot join success | % успешных start | > 95% |
| SSE disconnect rate | обрывы на встречу | < 5% |

## Рекомендуемый набор автотестов (TODO)

| Уровень | Что тестировать |
|---------|-----------------|
| Unit | `hallucination-filter`, `vad`, Zod schemas |
| Integration | `POST /auth/otp/*`, `POST /meetings` с мок Aura |
| E2E | Playwright: login → create meeting (mock aura) |
| Manual | Реальный Telemost 5–10 мин с 2+ спикерами |
