# История: исправленные проблемы

> Зафиксировано при аудите 27.06.2026. Большинство закрыто в фазах 0–4.  
> Актуальные риски — [risks-refactoring.md](risks-refactoring.md).

## P0 — Блокировали E2E (исправлено ✅)

| # | Проблема | Решение |
|---|----------|---------|
| 1 | Aura слала `prompt`, Audioray ждал `speaker` → HTTP 400 | `formData.append('speaker', ...)` |
| 2 | Placeholder URL `whisper-server-ip:8000` | `AUDIORAY_URL` env |
| 3 | Несовпадение портов (8000 vs 3000) | Env + документация |
| 4 | Ошибки старта бота проглатывались | Логирование + `{ success: false }` |
| 5 | Google Meet: `://google.com` не матчил `meet.google.com` | `url.includes('meet.google.com')` |

## P1 — Качество и надёжность (исправлено ✅)

| # | Проблема | Решение |
|---|----------|---------|
| 6 | Перезагрузка модели на каждый чанк | whisper.cpp server worker |
| 7 | Чанки «Тишина» в Whisper | Skip в aura + VAD |
| 8 | `onModuleInit` не вызывался | `implements OnModuleInit` |
| 9 | `sendAudioToAudioray` не awaited | `await` в telemost bot |
| 10 | Текст не накапливался для стенограммы | BackendClient → PostgreSQL |

## Aura — исторические замечания

- Хардкод `AUDIORAY_URL` → env ✅
- Нет `GET /bot/status` → добавлен ✅
- `TranscriptAggregator` в aura → перенесён в backend ✅
- Публичные `GET /meetings/*` → удалены ✅

## Audioray — исторические замечания

- Нет health check → `GET /health` ✅
- Нет очереди → concurrency 1 ✅
- Монолитный `whisper.service.ts` → разбит на модули ✅

## Архитектурный сдвиг (фаза 4)

**Было:** стенограмма в Aura (jsonl + in-memory)  
**Стало:** single source of truth в PostgreSQL (backend)

Aura только пушит сегменты через internal API.

## Чеклист интеграции (справочно)

```typescript
// aura/.env
AUDIORAY_URL=http://localhost:3000/api/whisper/transcribe
BACKEND_URL=http://localhost:5000
INTERNAL_API_TOKEN=dev-internal-token

// backend/.env
INTERNAL_API_TOKEN=dev-internal-token  // тот же token
AURA_URL=http://localhost:4000

// FormData
formData.append('file', blob, 'chunk.webm');
formData.append('speaker', speakerName);
```

---

*Не обновляйте этот файл при новых багах — используйте issues и [risks-refactoring.md](risks-refactoring.md).*
