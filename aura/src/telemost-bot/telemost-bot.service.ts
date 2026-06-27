import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class TelemostBotService {
  private readonly logger = new Logger(TelemostBotService.name);

  async startBot(telemostUrl: string, botName: string = 'Бот-Стенографист') {
    this.logger.log(`Запуск бота для встречи: ${telemostUrl}`);

    // 1. Запуск оптимизированного браузера
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--headless=new',
        '--use-fake-ui-for-media-stream',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--mute-audio',
        '--disable-extensions'
      ],
    });

    try {
      const page = await browser.newPage();

      // Оптимизация: Отключаем загрузку картинок и шрифтов для экономии трафика и RAM
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (resourceType === 'image' || resourceType === 'font' || resourceType === 'stylesheet') {
          // Стили (.css) можно оставить, если без них ломается логика DOM, но обычно для Observer они не нужны
          req.abort();
        } else {
          req.continue();
        }
      });

      // 2. Переходим по ссылке Телемоста
      await page.goto(telemostUrl, { waitUntil: 'networkidle2' });

      // 3. Процесс авторизации/входа в комнату
      // Ожидаем появление инпута для ввода имени (селекторы Яндекса могут меняться, их нужно уточнить на живом сайте)
      const inputSelector = 'input[placeholder*="Ваше имя"], .NameInput-control input'; 
      await page.waitForSelector(inputSelector, { timeout: 15000 });
      
      // Вводим имя бота
      await page.type(inputSelector, botName);

      // Ищем и кликаем кнопку "Войти" / "Подключиться"
      const joinButtonSelector = 'button[type="submit"], .JoinButton';
      await page.click(joinButtonSelector);

      this.logger.log('Бот успешно зашел в комнату созвона.');

      // 4. Внедряем скрипт мониторинга активности спикеров (MutationObserver)
      await page.evaluate(() => {
        console.log('[Bot-Injected] Мониторинг спикеров запущен внутри Chromium.');

        const observer = new MutationObserver((mutations) => {
          // Ищем карточки, у которых есть признак активности (класс или дата-атрибут)
          // Селекторы .VideoCard--speaking нужно будет отладить на реальном интерфейсе Телемоста
          const activeSpeakers = document.querySelectorAll('.VideoCard--speaking, [data-speaking="true"]');

          activeSpeakers.forEach((speakerElement) => {
            const nameElement = speakerElement.querySelector('.VideoCard-name, .Participant-name');
            const speakerName = nameElement ? (nameElement as HTMLElement).innerText : 'Неизвестный спикер';

            // Передаем событие из контекста браузера наружу в Node.js через специальный коллбэк
            (window as any).onSpeakerTalked(speakerName);
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'data-speaking']
        });
      });

      // 5. Регистрируем функцию обратной связи, которую мы вызвали выше внутри страницы
      await page.exposeFunction('onSpeakerTalked', (speakerName: string) => {
        this.logger.log(`[DOM Сигнал] Сейчас говорит: ${speakerName}`);
        
        // ТОЧКА ИНТЕГРАЦИИ: Здесь ваш NestJS сервис фиксирует временную метку спикера
        // и отправляет команду на нарезку/обработку аудиопотока для Whisper
      });

      // Возвращаем объект браузера, чтобы в будущем мы могли закрыть созвон: await browser.close();
      return browser;

    } catch (error) {
      this.logger.error(`Ошибка работы бота: ${error.message}`);
      await browser.close();
      throw error;
    }
  }
}
