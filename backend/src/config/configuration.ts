export default () => ({
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    name: process.env.DB_NAME ?? 'briefer',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    migrationsRun: process.env.DB_MIGRATE === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  auth: {
    otpTtlSec: Number(process.env.OTP_TTL_SEC ?? 300),
    otpLength: Number(process.env.OTP_LENGTH ?? 6),
    devExposeOtp:
      process.env.AUTH_DEV_EXPOSE_OTP === 'true' ||
      process.env.NODE_ENV !== 'production',
    encryptionKey:
      process.env.AUTH_ENCRYPTION_KEY ?? 'dev-encryption-key-32chars!!',
    totpIssuer: process.env.TOTP_ISSUER ?? 'Briefer',
  },
  aura: {
    url: process.env.AURA_URL ?? 'http://localhost:4000',
    internalToken: process.env.INTERNAL_API_TOKEN ?? 'dev-internal-token',
  },
});
