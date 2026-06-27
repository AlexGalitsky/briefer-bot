import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from './bot.service';
import { AudiorayService } from 'src/services/audioray.service';

describe('BotService', () => {
  let service: BotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        {
          provide: AudiorayService,
          useValue: {
            sendAudioToAudioray: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BotService>(BotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
