import { Test, TestingModule } from '@nestjs/testing';
import { TelemostBotService } from './telemost-bot.service';

describe('TelemostBotService', () => {
  let service: TelemostBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelemostBotService],
    }).compile();

    service = module.get<TelemostBotService>(TelemostBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
