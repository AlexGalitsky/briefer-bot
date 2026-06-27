# Audioray

Локальный сервис распознавания речи для проекта **briefer-bot**. Принимает короткие аудио-чанки (WebM/Opus) от бота видеоконференций, конвертирует их в WAV и транскрибирует через [whisper.cpp](https://github.com/ggerganov/whisper.cpp).

Сервис работает как отдельное NestJS-приложение и вызывается из модуля `aura` по HTTP.

## Возможности

- Локальная транскрибация без облачных API
- Поддержка русского языка (`-l ru`)
- Конвертация WebM → WAV 16 kHz mono PCM через FFmpeg
- Фильтрация тихих чанков (VAD) и типичных галлюцинаций Whisper
- Логирование в консоль и сохранение транскриптов в файлы

## Требования

| Компонент | Версия / примечание |
|-----------|---------------------|
| Node.js   | 18+ |
| npm       | 9+ |
| FFmpeg    | должен быть доступен в `PATH` (`ffmpeg -version`) |
| Модель    | `ggml-large-v3-turbo.bin` в папке `models/` |

Пакет `whisper-node` используется как поставщик скомпилированного бинарника `whisper.cpp`. При первом `npm install` бинарник собирается автоматически (нужен `make`).

На Apple Silicon whisper.cpp использует Metal (GPU). На других платформах — CPU.

## Установка

```bash
cd audioray
npm install
```

### Модель Whisper

Скачайте модель и положите в `audioray/models/`:

```bash
# Пример: large-v3-turbo (~1.6 GB)
curl -L -o models/ggml-large-v3-turbo.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
```

По умолчанию сервис ищет файл:

```
audioray/models/ggml-large-v3-turbo.bin
```

Путь считается относительно корня проекта `audioray` (через `__dirname`), а не от текущей рабочей директории — запускать можно из любого каталога.

## Запуск

```bash
# Разработка (hot reload)
npm run start:dev

# Продакшн
npm run build
npm run start:prod
```

Порт по умолчанию: **3000**. Переопределяется через переменную окружения:

```bash
PORT=8000 npm run start:dev
```

## API

### `POST /api/whisper/transcribe`

Транскрибирует один аудио-чанк.

**Content-Type:** `multipart/form-data`

| Поле     | Тип    | Обязательное | Описание |
|----------|--------|--------------|----------|
| `file`   | file   | да           | Аудиофайл в формате WebM/Opus |
| `speaker`| string | да           | Имя говорящего (для логов и транскриптов) |

**Пример запроса (curl):**

```bash
curl -X POST http://localhost:3000/api/whisper/transcribe \
  -F "file=@chunk.webm" \
  -F "speaker=Александр"
```

**Успешный ответ (200):**

```json
{
  "speaker": "Александр",
  "text": "Раз, два, три, четыре, пять.",
  "processingTimeSec": "2.34",
  "timestamp": "2026-06-27T13:02:41.586Z"
}
```

Если в чанке нет слышимой речи или результат отфильтрован как галлюцинация, поле `text` будет пустой строкой `""`.

**Ошибки:**

| Код | Причина |
|-----|---------|
| 400 | Не передан `file` или `speaker` |

## Пайплайн обработки

```
HTTP POST (WebM/Opus)
       │
       ▼
┌──────────────────┐
│  FFmpeg          │  → WAV 16 kHz, mono, PCM s16le
│  temp_audio/     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  VAD             │  → пропуск слишком тихих чанков
│  (анализ PCM)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  whisper.cpp     │  → русский язык, без таймстампов
│  models/*.bin    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Фильтр          │  → удаление галлюцинаций
│  галлюцинаций    │
└────────┬─────────┘
         │
         ▼
   JSON-ответ + запись в transcripts/
```

### Параметры whisper.cpp

| Флаг | Значение | Назначение |
|------|----------|------------|
| `-l ru` | русский | Язык распознавания |
| `-nt` | — | Текст без таймстампов |
| `-et 2.8` | — | Порог энтропии (меньше галлюцинаций) |
| `-lpt -0.5` | — | Порог log-probability |
| `--prompt` | «Транскрипция русской речи.» | Начальный промпт |

## Структура проекта

```
audioray/
├── models/                  # Модели Whisper (.bin), в .gitignore
├── temp_audio/              # Временные WAV/WebM, в .gitignore
├── transcripts/             # Сохранённые транскрипты, в .gitignore
├── src/
│   ├── main.ts              # Точка входа
│   ├── app.module.ts
│   └── whisper/
│       ├── whisper.module.ts
│       ├── whisper.controller.ts   # HTTP API
│       └── whisper.service.ts      # Конвертация, Whisper, логи
└── package.json
```

## Логи и транскрипты

При каждом успешном распознавании результат сохраняется в `transcripts/`:

| Файл | Формат |
|------|--------|
| `YYYY-MM-DD.txt` | Человекочитаемый лог |
| `YYYY-MM-DD.jsonl` | JSON Lines для парсинга |

**Пример `.txt`:**

```
[2026-06-27T13:02:41.586Z] Александр: Раз, два, три, четыре, пять.
```

**Пример `.jsonl`:**

```json
{"timestamp":"2026-06-27T13:02:41.586Z","speaker":"Александр","text":"Раз, два, три, четыре, пять.","processingTimeSec":"2.34"}
```

В консоль пишутся этапы: начало транскрибации, конвертация, время Whisper, итоговый текст, предупреждения о галлюцинациях.

## Интеграция с Aura

Бот в `aura` нарезает аудио из видеоконференции на чанки по **4 секунды** и отправляет их на Audioray.

Настройте URL в `aura/src/services/audioray.service.ts`:

```typescript
private readonly audiorayServerUrl = 'http://localhost:3000/api/whisper/transcribe';
```

Запрос должен содержать поля `file` и `speaker`:

```typescript
formData.append('file', blob, 'chunk.webm');
formData.append('speaker', speakerName);
```

> **Важно:** поле должно называться именно `speaker`, не `prompt`.

Рекомендуется не отправлять чанки, где никто не говорит (метка «Тишина» в боте), — это снижает количество пустых запросов и галлюцинаций.

## Галлюцинации Whisper

На тишине и фоновом шуме Whisper может «придумывать» типичные фразы из обучающих субтитров:

- «Редактор субтитров А.Семкин Корректор А.Егорова»
- «Продолжение следует»

Сервис борется с этим на трёх уровнях:

1. **VAD** — чанки с низкой громкостью не отправляются в Whisper
2. **Пороги whisper.cpp** — `-et`, `-lpt`
3. **Пост-фильтр** — известные фразы отбрасываются или вырезаются из текста

Если галлюцинации всё ещё проскакивают, можно:
- поднять пороги VAD в `hasAudibleSpeech()` (`whisper.service.ts`)
- добавить фразы в `hallucinationPatterns` / `hallucinationOnlyPhrases`
- не слать тихие чанки на уровне бота

## Устранение неполадок

### «КРИТИЧЕСКАЯ ОШИБКА: Модель не найдена»

Убедитесь, что файл лежит по пути:

```
audioray/models/ggml-large-v3-turbo.bin
```

### Пустой `text` при явной речи

1. Проверьте, что FFmpeg установлен: `ffmpeg -version`
2. Посмотрите логи — возможно, сработал VAD («Чанк слишком тихий»)
3. Временно понизьте пороги в `hasAudibleSpeech()`

### Ошибка FFmpeg при конвертации

Входной файл должен быть валидным WebM/Opus. Бот записывает чанки через `MediaRecorder` с `mimeType: 'audio/webm;codecs=opus'`.

### Медленная обработка

Модель `large-v3-turbo` (~1.6 GB) даёт хорошее качество, но медленнее `base`. Для тестов можно заменить модель в `whisper.service.ts` на `ggml-base.bin`.

Первый запрос после старта дольше — загружается модель в память.

### whisper.cpp не собрался

```bash
cd node_modules/whisper-node/lib/whisper.cpp
make
```

На Windows нужен [GNU Make](https://gnuwin32.sourceforge.net/packages/make.htm).

## Скрипты npm

| Команда | Описание |
|---------|----------|
| `npm run start` | Запуск |
| `npm run start:dev` | Запуск с hot reload |
| `npm run start:prod` | Продакшн (`node dist/main`) |
| `npm run build` | Сборка TypeScript |
| `npm run lint` | ESLint |
| `npm run test` | Unit-тесты |

## Лицензия

UNLICENSED (private).
