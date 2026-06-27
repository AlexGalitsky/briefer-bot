import { Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { BaseBot } from './base-bot';

export class YandexTelemostBot extends BaseBot {
  protected readonly logger = new Logger(YandexTelemostBot.name);
  public readonly platformName = 'yandex-telemost';

  protected async handleMeetingFlow(
    page: Page,
    url: string,
    botName: string,
  ): Promise<void> {
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Клик по "Продолжить в браузере"
    const continueBtn = 'button.continueInBrowserButton_-wewF, button[data-testid="orb-button"]';
    try {
      await page.waitForSelector(continueBtn, { timeout: 5000 });
      await page.click(continueBtn);
    } catch {
      this.logger.warn('Кнопка "Продолжить в браузере" пропущена.');
    }

    // Ввод имени
    const inputSelector = 'input[data-testid="orb-textinput-input"]';
    await page.waitForSelector(inputSelector, { timeout: 5000 });
    await page.$eval(inputSelector, (el: HTMLInputElement) => el.value = '');
    await page.type(inputSelector, botName, { delay: 50 });

    // Клик "Подключиться"
    const joinBtn = 'button[data-testid="enter-conference-button"]';
    await page.waitForSelector(joinBtn, { timeout: 5000 });
    await page.click(joinBtn);

    // Ожидание и запуск MutationObserver
    await page.evaluate(() => new Promise((res) => setTimeout(res, 5000)));
    this.logger.log('Успешный вход в Телемост. Скрипты обсервера активны.');

    this.logger.log('Бот вошел. Настраиваем стриминг аудио для Whisper...');

    // 1. Создаем мост для передачи аудио-байтов наружу в NestJS
    await page.exposeFunction(
      'onAudioChunkAvailable',
      async (base64Audio: string, currentSpeakers: string[]) => {
        if (currentSpeakers.length === 0) {
          return;
        }

        const buffer = Buffer.from(base64Audio, 'base64');
        const speakerLabel = currentSpeakers.join(', ');

        this.logger.log(`Получен чанк звука для: [${speakerLabel}]`);

        try {
          await this.audiorayService.sendAudioToAudioray(buffer, speakerLabel);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Не удалось отправить чанк в Audioray: ${message}`,
          );
        }
      },
    );

    // 2. Внедряем JS-скрипт внутрь страницы Телемоста для нарезки аудио
    await page.evaluate(() => {
      const CHUNK_INTERVAL = 4000; // Нарезаем аудио каждые 4 секунды

      // Сет для хранения имен тех, кто проявил активность за текущие 4 секунды
      let activeSpeakersInCurrentChunk = new Set<string>();
      let recorderInitialized = false;

      // Функция запуска записи конкретного HTML5 Аудио тега участника
      const initAudioRecorder = (audioElement: HTMLAudioElement) => {
        if (recorderInitialized) return;
        recorderInitialized = true;

        const stream = (audioElement as any).captureStream
          ? (audioElement as any).captureStream()
          : (audioElement as any).mozCaptureStream();

        // Функция, которая создает и запускает короткую запись на 4 секунды
        const recordNextChunk = () => {
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus',
          });
          let chunks: Blob[] = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            // Создаем полноценный Blob, который ВСЕГДА содержит заголовки
            const completeBlob = new Blob(chunks, {
              type: 'audio/webm;codecs=opus',
            });

            const reader = new FileReader();
            reader.readAsDataURL(completeBlob);
            reader.onloadend = () => {
              const resultString = reader.result as string;
              const base64String = resultString.split(',')[1];

              if (base64String) {
                (window as any).onAudioChunkAvailable(
                  base64String,
                  Array.from(activeSpeakersInCurrentChunk),
                );
                activeSpeakersInCurrentChunk.clear();
              }
            };

            // Как только этот рекордер остановился — мгновенно запускаем следующий цикл
            recordNextChunk();
          };

          // Запускаем запись и ровно через 4 секунды принудительно останавливаем её
          mediaRecorder.start();
          setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, CHUNK_INTERVAL);
        };

        // Запускаем первый цикл записи
        recordNextChunk();
        console.log(
          '[Bot-DOM] Запущен циклический аудио-мост (каждый файл будет со звуком).',
        );
      };

      // MutationObserver выполняет двойную работу:
      // 1. Ищет тег аудио с data-g_track_muted="false"
      // 2. Ловит появление класса рамки "rootStroke_Kb2PJ" на карточках
      const observer = new MutationObserver(() => {
        // Часть 1: Инициализация записи звука
        const liveAudio = document.querySelector(
          'audio.goloom_mid_audio[data-g_track_muted="false"]',
        ) as HTMLAudioElement;
        if (liveAudio && !recorderInitialized) {
          initAudioRecorder(liveAudio);
        }

        // Часть 2: Трекинг говорящих в этот момент времени
        const activeCards = document.querySelectorAll('.item_NZ2DW');
        activeCards.forEach((card) => {
          const rootBlock = card.querySelector('.root_ypmDo');
          const hasSpeakingStroke = rootBlock
            ? rootBlock.classList.contains('rootStroke_Kb2PJ')
            : false;

          if (hasSpeakingStroke) {
            const nameSpan = card.querySelector(
              '.TextName_BOaIg',
            ) as HTMLElement;
            if (nameSpan) {
              const speakerName = nameSpan.getAttribute('title') || nameSpan.innerText;
              if (speakerName) {
                // Добавляем спикера в список активных для текущего аудио-фрагмента
                activeSpeakersInCurrentChunk.add(speakerName);
              }
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
    });
  }
}
