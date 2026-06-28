
1. backend (NestJS + TypeORM + PostgreSQL + Redis/BullMQ). Хранит таблицы User, Meeting, TranscriptSegment, MeetingSummary, MeetingTask.
2. aura (NestJS + Puppeteer). Подключается к созвонам, захватывает аудио и шлет 6-секундные WebM чанки в audioray. Получает текст и шлет его в backend через POST /internal/transcript-segments.
3. audioray (NestJS + Python/C++ биндинги). Принимает чанки (POST /api/whisper/transcribe), крутит FFmpeg, Whisper.cpp и Ollama для саммари (POST /api/summary/generate).
4. ollama — LLM инференс.

Текущая проблема: 6-секундная жесткая нарезка чанков в aura режет слова. Я хочу внедрить симулятор для регрессионного тестирования, а также добавить Silero-VAD, нормализацию звука и умную склейку текста.

Помоги мне составить подробный пошаговый технический план улучшений на русском языке, распределив задачи строго по моим сервисам:

Этап 1. Создание Тестового Симулятора (внутри backend или отдельным CLI-модулем)
- Как спроектировать тестовый симулятор, который будет брать из PostgreSQL реальную историю созвона (массив TranscriptSegment и оригинальные аудио-чанки, если они сохранены, или имитировать их генерацию)?
- Как сделать "конфиг теста" (JSON/YAML), чтобы при прогоне симулятора мы могли передавать в audioray разные параметры (чувствительность VAD, температуру Ollama, промпты) и сохранять результаты (WER и оценки саммари) в тестовые таблицы в PostgreSQL для сравнения прогонов?

Этап 2. Перенос логики нарезки и внедрение Silero-VAD в сервис `audioray`
- Сейчас aura шлет жесткие 6-сек чанки. Как изменить архитектуру, чтобы aura стримила сырой поток (или очень короткие чанки по 1 сек), а сервис audioray с помощью Silero-VAD (через @ricky0123/vad или onnxruntime) сам определял границы речи (threshold, minSilenceDurationMs, speechPadMs) и формировал динамические чанки для Whisper.cpp?
- Как заложить предохранитель (максимум 30 сек на чанк), если спикер говорит без пауз.

Этап 3. Препроцессинг и Постпроцессинг (внутри `audioray` и `backend`)
- Аудио (в audioray): Как перед Whisper применить фильтр `loudnorm` через fluent-ffmpeg для выравнивания громкости тихих и громких спикеров.
- Текст (в backend или audioray): Как реализовать алгоритм умной склейки текста (Overlap Stitching) на стыках сегментов, если слово все-таки разрезалось, используя поиск дубликатов фраз.

Этап 4. Автоматизация метрик качества на тестовом контуре
- Как встроить расчет WER (Word Error Rate) для Whisper, сравнивая результат с эталонным текстом (который мы добавим в тестовую бд).
- Как реализовать подход LLM-as-a-Judge для оценки выжимок (какой системный промпт передавать в Ollama или внешнюю сильную модель-судью, чтобы получать JSON с оценками от 1 до 5 за полноту, отсутствие галлюцинаций и точность исполнителей задач).

Покажи структуру необходимых NestJS модулей, контроллеров, DTO и предложений по npm-пакетам для реализации этого плана. Код писать не нужно, сфокусируйся на архитектурных изменениях в рамках моих сервисов (backend, aura, audioray). Сохрани всё в файл MD.


Вот оптимальная структура JSON-конфигурации для вашего тестового стенда.

Этот конфиг передается в **Тестовый Симулятор**, который на его основе настраивает `audioray`, `ollama` и логику сравнения результатов. Структура разделена на логические блоки, соответствующие этапам обработки.

```
{
  "testRunId": "run_2026-06-28_v3-test",
  "description": "Тестирование Silero-VAD с низким порогом и Ollama с температурой 0.2",

  "dataset": {
    "sourceMeetingId": "4a7b1c3d-8e9f-4b2a-a1b2-c3d4e5f6a7b8",
    "useSavedAudioChunks": true,
    "playbackSpeed": 1.0
  },

  "audioPreprocessing": {
    "normalization": {
      "enabled": true,
      "type": "loudnorm",
      "targetIntegratedLoudness": -16.0,
      "truePeak": -1.5,
      "loudnessRange": 11.0
    },
    "noiseReduction": {
      "enabled": false,
      "type": "afftdn"
    }
  },

  "vad": {
    "enabled": true,
    "model": "silero_v4",
    "threshold": 0.45,
    "minSilenceDurationMs": 800,
    "speechPadMs": 150,
    "maxChunkDurationSec": 30
  },

  "whisper": {
    "modelSize": "large-v3-turbo",
    "language": "ru",
    "temperature": 0.0,
    "beamSize": 5,
    "overlapStitching": {
      "enabled": true,
      "maxOverlapWords": 3
    }
  },

  "ollama": {
    "model": "qwen2.5-7b-instruct",
    "temperature": 0.2,
    "timeoutMs": 60000,
    "systemPromptVersion": "v2.4-strict-tasks",
    "customSystemPrompt": "Ты — ИИ-ассистент. Выдели из транскрипта ТОЛЬКО конкретные задачи. Формат: Исполнитель | Задача | Дедлайн. Если исполнитель неясен, пиши 'Не назначен'."
  },

  "metricsEvaluation": {
    "calculateWer": true,
    "llmJudge": {
      "enabled": true,
      "judgeModel": "qwen2.5-72b-instruct",
      "criteria": [
        "completeness",
        "hallucinations",
        "assignee_accuracy"
      ]
    }
  }
}
```

Разбор ключевых блоков для вашего бэкенда:

1. **`dataset`**: Указывает, какой именно созвон из PostgreSQL мы берем за эталон. `playbackSpeed: 1.0` означает симуляцию в реальном времени, но для быстрых тестов можно поставить `2.0` или `0.0` (прогнать файлы моментально без пауз).
2. **`audioPreprocessing`**: Параметры для `fluent-ffmpeg` внутри `audioray`. Вы сможете отключать нормализацию (`enabled: false`) и смотреть, насколько падает точность Whisper у тихих спикеров.
3. **`vad`**: Настройки для `audioray`. Вы будете искать баланс: если `minSilenceDurationMs` сделать слишком маленьким, чанки будут крошечными (по 1-2 слова). Если слишком большим — бот будет долго ждать перед отправкой текста.
4. **`whisper.overlapStitching`**: Конфиг для алгоритма склейки текста на стыках чанков.
5. **`ollama`**: Самый важный блок для тюнинга выжимок. Вы можете менять `systemPromptVersion` или вставлять промпт прямо в `customSystemPrompt`, снижать температуру и оценивать качество задач.
6. **`metricsEvaluation`**: Включает автоматический расчет WER и запускает «ИИ-Судью» (`llmJudge`), который выставит финальные оценки.

---

Как это будет работать в базе данных `backend`:

Результаты каждого такого прогона NestJS будет записывать в новую таблицу (например, `TestRunResult`):

<table><tbody><tr><th colspan="undefined">id</th><th colspan="undefined">testRunId</th><th colspan="undefined">averageWer</th><th colspan="undefined">judgeCompletenessScore</th><th colspan="undefined">judgeHallucinationsScore</th><th colspan="undefined">durationSec</th></tr><tr><td colspan="undefined">1</td><td colspan="undefined">run_v1_baseline</td><td colspan="undefined">18.4%</td><td colspan="undefined">3.8 / 5</td><td colspan="undefined">4.2 / 5</td><td colspan="undefined">120 сек</td></tr><tr><td colspan="undefined">2</td><td colspan="undefined">run_v2_with_vad</td><td colspan="undefined"><strong>11.2%</strong></td><td colspan="undefined">4.1 / 5</td><td colspan="undefined">4.5 / 5</td><td colspan="undefined">95 сек</td></tr><tr><td colspan="undefined">3</td><td colspan="undefined">run_v3_low_temp</td><td colspan="undefined">11.5%</td><td colspan="undefined"><strong>4.8 / 5</strong></td><td colspan="undefined"><strong>4.9 / 5</strong></td><td colspan="undefined">90 сек</td></tr></tbody></table>

Вы наглядно увидите, что в третьем прогоне (где вы снизили температуру Ollama и настроили VAD) метрики стали идеальными.
