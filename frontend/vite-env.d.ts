/// <reference types="vite/client" />

// 1. Регистрация типов для TanStack Router (чтобы Link to="..." видел все ваши страницы)
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof import('./src/main').router
  }
}

// 2. Опционально: Строгая типизация для ваших .env переменных
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // readonly VITE_SOME_OTHER_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
