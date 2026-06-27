import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from 'src/config/app-config.service';
import { MeetingsService } from 'src/meetings/meetings.service';
import { BotFactory } from './bot.factory';
import { BotService } from './bot.service';

describe('BotService', () => {
  let service: BotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        {
          provide: BotFactory,
          useValue: { create: jest.fn() },
        },
        {
          provide: MeetingsService,
          useValue: {
            detectPlatform: jest.fn(),
            createMeeting: jest.fn(),
            setStatus: jest.fn(),
            endActiveMeeting: jest.fn(),
          },
        },
        {
          provide: AppConfigService,
          useValue: {
            values: { bot: { defaultName: 'Аура' } },
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
