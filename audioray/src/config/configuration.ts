export default () => ({
  port: Number(process.env.PORT ?? 3000),
  whisper: {
    model: process.env.WHISPER_MODEL ?? 'ggml-large-v3-turbo.bin',
    language: process.env.WHISPER_LANGUAGE ?? 'ru',
    contextWords: Number(process.env.WHISPER_CONTEXT_WORDS ?? 30),
    serverHost: process.env.WHISPER_SERVER_HOST ?? '127.0.0.1',
    serverPort: Number(process.env.WHISPER_SERVER_PORT ?? 8081),
    startupMs: Number(process.env.WHISPER_SERVER_STARTUP_MS ?? 120_000),
    entropyThreshold: Number(process.env.WHISPER_ENTROPY_THRESHOLD ?? 2.8),
    logprobThreshold: Number(process.env.WHISPER_LOGPROB_THRESHOLD ?? -0.5),
  },
  paths: {
    tempAudio: process.env.TEMP_AUDIO_PATH ?? 'temp_audio',
    transcripts: process.env.TRANSCRIPTS_PATH ?? 'transcripts',
  },
});
