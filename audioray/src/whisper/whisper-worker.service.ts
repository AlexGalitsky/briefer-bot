import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { execFile, spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

@Injectable()
export class WhisperWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhisperWorkerService.name);
  private readonly projectRoot = path.resolve(__dirname, '..', '..');
  private readonly whisperCppDir = path.join(
    this.projectRoot,
    'node_modules',
    'whisper-node',
    'lib',
    'whisper.cpp',
  );
  private readonly serverBinary = path.join(this.whisperCppDir, 'server');
  readonly modelPath = path.resolve(
    this.projectRoot,
    'models',
    process.env.WHISPER_MODEL ?? 'ggml-large-v3-turbo.bin',
  );
  private readonly serverHost = process.env.WHISPER_SERVER_HOST ?? '127.0.0.1';
  private readonly serverPort = Number(process.env.WHISPER_SERVER_PORT ?? 8081);
  private serverProcess: ChildProcess | null = null;
  private ready = false;

  getServerUrl(): string {
    return `http://${this.serverHost}:${this.serverPort}`;
  }

  isReady(): boolean {
    return this.ready && this.serverProcess !== null;
  }

  async onModuleInit(): Promise<void> {
    await this.validateDependencies();
    await this.startServer();
    await this.waitUntilReady();
    this.logger.log(
      `Whisper worker запущен: ${this.getServerUrl()} (модель в памяти)`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.serverProcess) return;

    this.serverProcess.kill('SIGTERM');
    this.serverProcess = null;
    this.ready = false;
    this.logger.log('Whisper worker остановлен');
  }

  async transcribe(wavPath: string, prompt: string): Promise<string> {
    if (!this.isReady()) {
      throw new Error('Whisper worker не готов');
    }

    const fileBuffer = fs.readFileSync(wavPath);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'audio/wav' });

    formData.append('file', blob, path.basename(wavPath));
    formData.append('prompt', prompt);
    formData.append('response-format', 'json');

    const response = await fetch(`${this.getServerUrl()}/inference`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Whisper server HTTP ${response.status}: ${body.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as { text?: string };
    return (data.text ?? '').replace(/\s+/g, ' ').trim();
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(this.getServerUrl(), {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok || response.status === 404;
    } catch {
      return false;
    }
  }

  private async validateDependencies(): Promise<void> {
    const errors: string[] = [];

    if (!fs.existsSync(this.modelPath)) {
      errors.push(`модель не найдена: ${this.modelPath}`);
    }

    if (!fs.existsSync(this.serverBinary)) {
      errors.push(`бинарник whisper server не найден: ${this.serverBinary}`);
    }

    try {
      await execFileAsync('ffmpeg', ['-version']);
    } catch {
      errors.push('ffmpeg не найден в PATH');
    }

    if (errors.length > 0) {
      const message = `Критическая ошибка запуска Audioray:\n- ${errors.join('\n- ')}`;
      this.logger.error(message);
      throw new Error(message);
    }
  }

  private async startServer(): Promise<void> {
    const args = [
      '-m',
      this.modelPath,
      '-l',
      'ru',
      '-nt',
      '-et',
      '2.8',
      '-lpt',
      '-0.5',
      '--host',
      this.serverHost,
      '--port',
      String(this.serverPort),
    ];

    this.serverProcess = spawn(this.serverBinary, args, {
      cwd: this.whisperCppDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.serverProcess.stdout?.on('data', (chunk: Buffer) => {
      this.logger.debug(chunk.toString().trim());
    });

    this.serverProcess.stderr?.on('data', (chunk: Buffer) => {
      const line = chunk.toString().trim();
      if (line) this.logger.debug(line);
    });

    this.serverProcess.on('exit', (code, signal) => {
      this.ready = false;
      this.logger.error(
        `Whisper server завершился (code=${code ?? 'null'}, signal=${signal ?? 'null'})`,
      );
    });
  }

  private async waitUntilReady(): Promise<void> {
    const timeoutMs = Number(process.env.WHISPER_SERVER_STARTUP_MS ?? 120_000);
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      if (await this.ping()) {
        this.ready = true;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(
      `Whisper server не ответил за ${timeoutMs}ms (${this.getServerUrl()})`,
    );
  }
}
