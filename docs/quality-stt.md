# Качество распознавания речи

## Текущий пайплайн

```
WebM (6s) → FFmpeg (16kHz mono) → VAD → whisper.cpp worker → hallucination filter → backend
```

## Что уже сделано (фазы 0–1)

| Проблема | Решение |
|----------|---------|
| `whisper-node` возвращал `[]` | Прямой вызов whisper.cpp |
| Перезагрузка модели на каждый чанк | Persistent worker (:8081) |
| Галлюцинации на тишине | VAD + skip «Тишина» в aura |
| Нет контекста между чанками | `--prompt` с последними словами |
| Неверный API field | `speaker` вместо `prompt` |

## Ограничения

| Фактор | Влияние | Рекомендация |
|--------|---------|--------------|
| Чанки ~6 с | Обрезает фразы | Склейка чанков одного спикера |
| Один `<audio>` | Микш, спикер по UI Telemost | Per-participant audio (сложно) |
| `-l ru` | Плохо для англ. вставок | `auto` или per-meeting |
| `large-v3-turbo` | Качество ↑, скорость ↓ | Metal/CUDA build |
| Хрупкие селекторы спикеров | Неверный speaker label | Обновлять selectors |

## Сборка whisper.cpp

```bash
cd audioray
npm run whisper:build        # auto
npm run whisper:build:metal  # macOS ARM
npm run whisper:build:cuda   # NVIDIA
```

См. [QUICK_START.md](../QUICK_START.md#52-сборка-whispercpp-server).

## Быстрые улучшения

1. Не слать чанки без активного спикера ✅
2. Контекстный prompt ✅
3. Увеличить интервал до 8 с (`BOT_CHUNK_INTERVAL_MS`) при отставании очереди
4. Для тестов: `ggml-base.bin` + `WHISPER_MODEL=ggml-base.bin`

## Средний срок

- Silero VAD вместо energy threshold
- Склейка соседних чанков одного спикера
- Метрики: empty rate, latency в `/health`

## Долгосрочно

- Diarization (pyannote / whisperX)
- LLM постобработка стенограммы (не замена STT)
- Per-meeting language config

## Типичные галлюцинации (фильтруются)

- «Редактор субтитров А.Семкин Корректор А.Егорова»
- «Продолжение следует»
- «Спасибо за просмотр»

Добавление паттернов: `audioray/src/whisper/hallucination-filter.service.ts`

## Настройка VAD

Пороги в `vad.service.ts`. При слишком агрессивном VAD — пропускается реальная речь. При слабом — галлюцинации.

## Тестирование качества

1. Запись 2–3 мин реального созвона в `aura/recordings/`
2. Прогон через `curl` на audioray
3. Ручной подсчёт WER на выборке фраз
4. Цель: WER < 15% для русского на чистом аудио
