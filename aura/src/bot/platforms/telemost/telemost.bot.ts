import { Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { AppConfigService } from 'src/config/app-config.service';
import { AudiorayClient } from 'src/transcription/audioray.client';
import { BaseBot } from '../../base-bot';
import { TELEMOST_SELECTORS } from './telemost.selectors';

export class YandexTelemostBot extends BaseBot {
  protected readonly logger = new Logger(YandexTelemostBot.name);
  public readonly platformName = 'yandex-telemost';

  constructor(
    audiorayClient: AudiorayClient,
    private readonly config: AppConfigService,
  ) {
    super(audiorayClient);
  }

  protected async handleMeetingFlow(
    page: Page,
    url: string,
    botName: string,
  ): Promise<void> {
    const { selectorTimeoutMs, joinWaitMs, chunkIntervalMs } =
      this.config.values.bot;

    await page.goto(url, { waitUntil: 'networkidle2' });

    try {
      await page.waitForSelector(TELEMOST_SELECTORS.continueBtn, {
        timeout: selectorTimeoutMs,
      });
      await page.click(TELEMOST_SELECTORS.continueBtn);
    } catch {
      this.logger.warn('Кнопка "Продолжить в браузере" пропущена.');
    }

    await page.waitForSelector(TELEMOST_SELECTORS.nameInput, {
      timeout: selectorTimeoutMs,
    });
    await page.$eval(
      TELEMOST_SELECTORS.nameInput,
      (el: HTMLInputElement) => (el.value = ''),
    );
    await page.type(TELEMOST_SELECTORS.nameInput, botName, { delay: 50 });

    await page.waitForSelector(TELEMOST_SELECTORS.joinBtn, {
      timeout: selectorTimeoutMs,
    });
    await page.click(TELEMOST_SELECTORS.joinBtn);

    await page.evaluate(
      (waitMs) => new Promise((res) => setTimeout(res, waitMs)),
      joinWaitMs,
    );
    this.logger.log('Успешный вход в Телемост. Скрипты обсервера активны.');
    this.logger.log('Настраиваем стриминг аудио для Whisper...');

    await page.exposeFunction(
      'onAudioChunkAvailable',
      async (base64Audio: string, currentSpeakers: string[]) => {
        if (currentSpeakers.length === 0) return;

        const buffer = Buffer.from(base64Audio, 'base64');
        const speakerLabel = currentSpeakers.join(', ');

        this.logger.log(`Получен чанк звука для: [${speakerLabel}]`);

        try {
          await this.audiorayClient.transcribeChunk(buffer, speakerLabel);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Не удалось отправить чанк в Audioray: ${message}`,
          );
        }
      },
    );

    await page.evaluate(
      (selectors, intervalMs) => {
        let activeSpeakersInCurrentChunk = new Set<string>();
        let recorderInitialized = false;

        const initAudioRecorder = (audioElement: HTMLAudioElement) => {
          if (recorderInitialized) return;
          recorderInitialized = true;

          const stream = (audioElement as any).captureStream
            ? (audioElement as any).captureStream()
            : (audioElement as any).mozCaptureStream();

          const recordNextChunk = () => {
            const mediaRecorder = new MediaRecorder(stream, {
              mimeType: 'audio/webm;codecs=opus',
            });
            let chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) chunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
              const completeBlob = new Blob(chunks, {
                type: 'audio/webm;codecs=opus',
              });

              const reader = new FileReader();
              reader.readAsDataURL(completeBlob);
              reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                if (base64String) {
                  (window as any).onAudioChunkAvailable(
                    base64String,
                    Array.from(activeSpeakersInCurrentChunk),
                  );
                  activeSpeakersInCurrentChunk.clear();
                }
              };

              recordNextChunk();
            };

            mediaRecorder.start();
            setTimeout(() => {
              if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            }, intervalMs);
          };

          recordNextChunk();
        };

        const observer = new MutationObserver(() => {
          const liveAudio = document.querySelector(
            selectors.liveAudio,
          ) as HTMLAudioElement;
          if (liveAudio && !recorderInitialized) {
            initAudioRecorder(liveAudio);
          }

          document.querySelectorAll(selectors.participantCard).forEach((card) => {
            const rootBlock = card.querySelector(selectors.cardRoot);
            const hasSpeakingStroke = rootBlock?.classList.contains(
              selectors.speakingStrokeClass,
            );

            if (hasSpeakingStroke) {
              const nameSpan = card.querySelector(
                selectors.speakerName,
              ) as HTMLElement;
              const speakerName =
                nameSpan?.getAttribute('title') || nameSpan?.innerText;
              if (speakerName) {
                activeSpeakersInCurrentChunk.add(speakerName);
              }
            }
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'data-g_track_muted'],
        });
      },
      TELEMOST_SELECTORS,
      chunkIntervalMs,
    );
  }
}
