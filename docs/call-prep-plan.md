# План: созвон завтра + сбор датасета для тестов

**Дата плана:** 27 июня 2026  
**Связано с:** [tech_spec.md](../tech_spec.md) (симулятор, VAD, метрики), [QUICK_START.md](../QUICK_START.md)

**Цель завтра:** бот подключается к реальному Telemost, стенограмма идёт в UI, после stop — выжимка и задачи.

**Цель сегодня (п. 0):** система проверена end-to-end, завтра только повторяем сценарий и **сохраняем всё** как эталонный датасет для симулятора и WER.

---

## Пункт 0 — Сегодня: подготовить систему и контур сохранения данных

> Без этого завтра рискуете потерять единственный шанс собрать «золотой» созвон: аудио-чанки, сегменты в БД и эталонный текст.

### 0.1. Поднять весь стек и пройти dry-run (обязательно)

Порядок: PostgreSQL → Redis (или `REDIS_ENABLED=false`) → Ollama → audioray → aura → backend → frontend.

| Проверка | Команда / действие | Ожидание |
|----------|-------------------|----------|
| PostgreSQL | `psql -d briefer -c "SELECT 1"` | OK |
| Audioray | `curl localhost:3000/health` | `whisperServer: true`, `model: true` |
| Ollama | `curl localhost:11434/api/tags` | модель из `audioray/.env` в списке |
| Aura | `curl -H "X-Internal-Token: ..." localhost:4000/bot/status` | 200 |
| Backend | `curl localhost:5000/health` | OK |
| Frontend | http://localhost:5173 | открывается |

**Мини-E2E сегодня (15–20 мин):**

1. Регистрация / вход в UI.
2. Создать встречу с **тестовым** Telemost URL (короткий созвон с коллегой или второй вкладкой).
3. Убедиться: сегменты в UI, логи aura «joined», логи audioray с текстом.
4. Stop → статус `ended` → вкладки Summary / Tasks заполняются (или `regenerate`).
5. Скачать MD/PDF выжимки — проверить, что экспорт работает.

Если dry-run падает — **не откладывать на завтра**. Типичные блокеры: whisper server не собран, токены не совпадают, Telemost не пускает headless-бота.

### 0.2. Зафиксировать конфиг «как на проде завтра»

Сохранить копии (не в git) или снимок значений:

| Файл | Что проверить |
|------|----------------|
| `backend/.env` | `INTERNAL_API_TOKEN`, `AURA_URL`, `AUDIORAY_URL`, `REDIS_*` |
| `aura/.env` | тот же token, `BOT_CHUNK_INTERVAL_MS` (сейчас 6000), `BOT_MAX_CONCURRENT` |
| `audioray/.env` | `WHISPER_MODEL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_MS` |

Рекомендация на первый реальный созвон:

- `BOT_CHUNK_INTERVAL_MS=8000` — меньше обрезанных слов (компромисс: выше latency).
- `REDIS_ENABLED=false` — проще отладка, выжимка in-process (если Redis не нужен).
- Ollama: модель уже скачана (`ollama pull ...`), `OLLAMA_TIMEOUT_MS=300000`.

### 0.3. Подготовить папку датасета (сделать сегодня)

```text
datasets/
└── golden/
    └── _template/          # скопировать после завтрашнего созвона
        ├── manifest.json   # метаданные прогона
        ├── ground_truth.md # эталонный текст (ручной, см. п. 4)
        ├── transcript_api.json   # экспорт GET /transcript
        ├── summary.md
        ├── tasks.json
        ├── audio_chunks/     # копия aura/recordings для meetingId
        └── logs/             # снимки терминалов (опционально)
```

`manifest.json` (заполнить завтра сразу после созвона):

```json
{
  "meetingId": "<uuid из UI или БД>",
  "recordedAt": "2026-06-28T...",
  "platform": "yandex-telemost",
  "telemostUrl": "https://telemost.yandex.ru/j/...",
  "botChunkIntervalMs": 8000,
  "whisperModel": "ggml-large-v3-turbo.bin",
  "ollamaModel": "deepseek-r1:14b",
  "participants": ["Имя1", "Имя2"],
  "durationMin": 25,
  "notes": "Первый золотой датасет для симулятора"
}
```

### 0.4. Скрипт/шпаргалка бэкапа (сегодня — набросать команды)

После созвона выполнить **в течение 30 минут** (пока свежая память):

```bash
MEETING_ID="<uuid>"
DATASET_DIR="datasets/golden/2026-06-28_first-call"
mkdir -p "$DATASET_DIR/audio_chunks"

# 1. Аудио-чанки (aura пишет автоматически в aura/recordings/)
cp aura/recordings/*_${MEETING_ID:0:8}_* "$DATASET_DIR/audio_chunks/" 2>/dev/null || \
  cp aura/recordings/* "$DATASET_DIR/audio_chunks/"

# 2. Стенограмма из API (нужен JWT)
curl -s "http://localhost:5000/meetings/$MEETING_ID/transcript" \
  -H "Authorization: Bearer $TOKEN" > "$DATASET_DIR/transcript_api.json"

# 3. Выжимка и задачи
curl -s "http://localhost:5000/meetings/$MEETING_ID/summary" \
  -H "Authorization: Bearer $TOKEN" > "$DATASET_DIR/summary.json"
curl -s "http://localhost:5000/meetings/$MEETING_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" > "$DATASET_DIR/tasks.json"
curl -s "http://localhost:5000/meetings/$MEETING_ID/summary/export/markdown" \
  -H "Authorization: Bearer $TOKEN" -o "$DATASET_DIR/summary.md"

# 4. Снимок из PostgreSQL (опционально, надёжнее)
pg_dump -d briefer -t transcript_segments -t meetings -t meeting_summaries -t meeting_tasks \
  --data-only --column-inserts > "$DATASET_DIR/pg_dump.sql"
```

**Важно:** `ground_truth.md` пишется **вручную** в тот же день (см. раздел 4) — без него симулятор и WER из [tech_spec.md](../tech_spec.md) не заработают.

### 0.5. Технические риски — закрыть сегодня

| Риск | Что сделать сегодня |
|------|---------------------|
| Бот не входит в Telemost | Прогнать join на реальной ссылке; при fail — временно `headless: false` в `aura/src/bot/base-bot.ts` для отладки |
| Нет места на диске | ~50–200 MB на 30 мин созвона в `recordings/` + модели |
| Ноутбук уснёт | Отключить sleep, питание от сети |
| Сеть | Проводной Wi‑Fi / ethernet; VPN может ломать Puppeteer |
| Права в Telemost | Ссылка без лобби / бот допущен модератором |

### 0.6. Чеклист «готов к завтра»

- [ ] Dry-run E2E пройден сегодня
- [ ] Все health-check зелёные
- [ ] Папка `datasets/golden/` создана, шаблон manifest есть
- [ ] Команды бэкапа сохранены (или alias в shell)
- [ ] Ollama модель скачана, whisper server собран
- [ ] Известно, кто даст URL Telemost и допустит бота
- [ ] Запланирован сценарий разговора (раздел 2) — согласован с участниками

---

## Пункт 1 — Завтра до созвона (T−30 … T−5 мин)

| Время | Действие |
|-------|----------|
| T−30 | Запустить стек (7 терминалов или tmux). Дождаться `health` везде. |
| T−20 | Войти в UI, проверить JWT / сессию. |
| T−15 | **Короткий smoke:** создать тестовую встречу → 1–2 фразы → stop → убедиться, что pipeline жив. |
| T−10 | Получить финальный URL Telemost. Имя бота: `Аура` или нейтральное («Стенограмма»). |
| T−5 | Создать **боевую** встречу в UI, бот join **до** основных участников. |
| T−0 | Участники заходят, модератор **разрешает** бота в зал (если лобби). |

**Мониторинг во время созвона:**

- Терминал **aura** — `joined`, имена спикеров, `[Диск] Чанк сохранен`.
- Терминал **audioray** — очередь, latency, непустой `text`.
- UI — вкладка Transcript растёт (SSE или polling).

---

## Пункт 2 — Сценарий разговора (для качественного датасета)

Структурируйте 20–40 минут так, чтобы потом тестировать и STT, и summary:

1. **Калибровка (2 мин):** каждый представится по имени чётко.
2. **Повестка (3 мин):** 3–4 темы вслух.
3. **Обсуждение (15–25 мин):** диалог, перебивания, тишина — как в жизни.
4. **Задачи (5 мин):** явно проговорить 3–5 action items с исполнителем и сроком  
   *«Иван, подготовь отчёт до пятницы»* — это эталон для LLM-judge позже.
5. **Закрытие (1 мин):** резюме человеком.

Запишите **отдельно** на диктофон телефона (backup) — на случай если бот упадёт.

---

## Пункт 3 — Во время и сразу после созвона

### Во время

- Не перезапускать сервисы без необходимости.
- Если стенограмма встала — смотреть `curl localhost:3000/health` (очередь audioray).
- Если бот выпал — `POST .../stop` и новая встреча только если осталось время.

### Сразу после Stop (первые 30 мин)

1. Записать `meetingId` из URL UI: `/meetings/<uuid>`.
2. Дождаться выжимки (`summary.status === completed` или Regenerate).
3. Выполнить бэкап из п. 0.4 → `datasets/golden/2026-06-28_<slug>/`.
4. Написать `ground_truth.md` (раздел 4).
5. Скопировать `manifest.json`.
6. **Не чистить** `aura/recordings/` до проверки копии.

---

## Пункт 4 — Эталонный текст (`ground_truth.md`)

В течение 1–2 часов после созвона, пока помните:

```markdown
# Ground truth — 2026-06-28

## Участники
- ...

## Полный эталон (по памяти + запись телефона)
[Спикер]: текст...
[Спикер]: текст...

## Задачи (эталон)
| Исполнитель | Задача | Срок |
|-------------|--------|------|
| ... | ... | ... |

## Известные артефакты STT
- обрезанные слова на стыках чанков
- ...
```

Это станет `dataset.groundTruth` для WER и `llmJudge` из [tech_spec.md](../tech_spec.md).

---

## Пункт 5 — Что уже есть в системе (не писать код завтра)

| Данные | Где уже сохраняется |
|--------|---------------------|
| WebM чанки ~6–8 с | `aura/recordings/` (`{timestamp}_{meetingId}_[speaker].webm`) |
| Сегменты стенограммы | PostgreSQL `transcript_segments` |
| Встреча, статусы | PostgreSQL `meetings` |
| Выжимка, задачи | PostgreSQL `meeting_summaries`, `meeting_tasks` |
| Debug-текст audioray | `audioray/transcripts/` |

**Пробел:** нет автоматического `ground_truth` и нет привязки чанков к `segment.id` — поэтому ручной бэкап и manifest обязательны.

---

## Пункт 6 — После созвона: связь с tech_spec (следующие недели)

Когда датасет собран, по приоритету из [tech_spec.md](../tech_spec.md):

| Этап | Сервис | Задача |
|------|--------|--------|
| **1** | backend | Симулятор: `sourceMeetingId` + `audio_chunks/` + JSON-конфиг прогона → `TestRunResult` |
| **2** | aura → audioray | Короткие чанки / stream + Silero-VAD в audioray, `maxChunkDurationSec: 30` |
| **3** | audioray | `loudnorm` перед Whisper; backend/audioray — overlap stitching |
| **4** | backend | WER vs `ground_truth.md`; LLM-as-judge для summary |

Завтрашний созвон — **baseline (`run_v1_baseline`)** для сравнения с `run_v2_with_vad`.

---

## Краткий timeline

```
СЕГОДНЯ (п. 0)
  dry-run E2E → папка datasets → шпаргалка бэкапа → чеклист готовности

ЗАВТРА
  T−30  стек up
  T−15  smoke
  T−5   боевая встреча + join бота
  T+0   созвон по сценарию
  T+end stop → summary → бэкап + ground_truth

ПОТОМ
  симулятор → VAD → метрики (tech_spec)
```

---

## Если что-то пойдёт не так завтра

| Симптом | Быстрое действие |
|---------|------------------|
| Бот не join | Логи aura, selectors; headless off; ручной вход в ссылку |
| Пустая стенограмма | `audioray/health`, говорят ли участники, не «Тишина» ли спикер |
| SSE не обновляется | Обновить страницу — polling fallback |
| Summary failed | Ollama up? `regenerate`; логи backend/audioray |
| Всё упало | Диктофон + `recordings/` всё равно могут сохранить чанки до краша |

Удачи на созвоне. Главное сегодня — **п. 0**: dry-run и контур сохранения, чтобы завтра не собирать данные впервые.
