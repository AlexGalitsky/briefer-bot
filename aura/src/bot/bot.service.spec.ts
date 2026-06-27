import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsService } from 'src/meetings/meetings.service';
import { AudiorayService } from 'src/services/audioray.service';
import { BotService } from './bot.service';

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
        {
          provide: MeetingsService,
          useValue: {
            detectPlatform: jest.fn(),
            createMeeting: jest.fn(),
            setStatus: jest.fn(),
            endActiveMeeting: jest.fn(),
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
