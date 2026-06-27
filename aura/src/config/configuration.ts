export default () => ({
  port: Number(process.env.PORT ?? 4000),
  audioray: {
    url:
      process.env.AUDIORAY_URL ??
      'http://localhost:3000/api/whisper/transcribe',
  },
  backend: {
    url: process.env.BACKEND_URL ?? 'http://localhost:5000',
  },
  internal: {
    apiToken: process.env.INTERNAL_API_TOKEN ?? 'dev-internal-token',
  },
  bot: {
    defaultName: process.env.BOT_DEFAULT_NAME ?? 'Аура',
    chunkIntervalMs: Number(process.env.BOT_CHUNK_INTERVAL_MS ?? 6000),
    joinWaitMs: Number(process.env.BOT_JOIN_WAIT_MS ?? 5000),
    selectorTimeoutMs: Number(process.env.BOT_SELECTOR_TIMEOUT_MS ?? 5000),
    maxConcurrent: Number(process.env.BOT_MAX_CONCURRENT ?? 5),
  },
  paths: {
    recordings: process.env.RECORDINGS_PATH ?? 'recordings',
  },
});
