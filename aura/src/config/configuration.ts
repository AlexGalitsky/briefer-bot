export default () => ({
  port: Number(process.env.PORT ?? 4000),
  audioray: {
    url:
      process.env.AUDIORAY_URL ??
      'http://localhost:3000/api/whisper/transcribe',
  },
  bot: {
    defaultName: process.env.BOT_DEFAULT_NAME ?? 'Аура',
    chunkIntervalMs: Number(process.env.BOT_CHUNK_INTERVAL_MS ?? 6000),
    joinWaitMs: Number(process.env.BOT_JOIN_WAIT_MS ?? 5000),
    selectorTimeoutMs: Number(process.env.BOT_SELECTOR_TIMEOUT_MS ?? 5000),
  },
  paths: {
    recordings: process.env.RECORDINGS_PATH ?? 'recordings',
    transcripts: process.env.TRANSCRIPTS_PATH ?? 'transcripts',
  },
});
