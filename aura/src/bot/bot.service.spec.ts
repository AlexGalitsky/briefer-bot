import { Test, TestingModule } from '@nestjs/testing';
import { BackendClient } from 'src/backend/backend.client';
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
          provide: BackendClient,
          useValue: {
            updateMeetingStatus: jest.fn(),
          },
        },
        {
          provide: MeetingsService,
          useValue: {
            detectPlatform: jest.fn(),
            registerMeeting: jest.fn(),
            setStatus: jest.fn(),
            endActiveMeeting: jest.fn(),
            getActiveMeeting: jest.fn(),
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
