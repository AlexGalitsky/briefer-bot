import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuraClient } from 'src/aura-client/aura.client';
import { SummaryQueueService } from 'src/summaries/summary-queue.service';
import { User } from 'src/users/entities/user.entity';
import {
  Meeting,
  MeetingPlatform,
  MeetingStatus,
} from './entities/meeting.entity';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingsRepository: Repository<Meeting>,
    private readonly auraClient: AuraClient,
    private readonly summaryQueueService: SummaryQueueService,
  ) {}

  detectPlatform(url: string): MeetingPlatform {
    if (url.includes('telemost.yandex')) return 'yandex-telemost';
    if (url.includes('meet.google.com')) return 'google-meet';
    throw new BadRequestException('Платформа не поддерживается');
  }

  async createAndStart(
    user: User,
    url: string,
    botName: string,
  ): Promise<Meeting> {
    const platform = this.detectPlatform(url);

    let meeting = this.meetingsRepository.create({
      url,
      platform,
      botName,
      status: 'pending',
      createdById: user.id,
      startedAt: new Date(),
    });
    meeting = await this.meetingsRepository.save(meeting);

    try {
      await this.auraClient.startBot({
        meetingId: meeting.id,
        url,
        botName,
      });
      meeting.status = 'starting';
      await this.meetingsRepository.save(meeting);
    } catch (error) {
      meeting.status = 'failed';
      meeting.endedAt = new Date();
      await this.meetingsRepository.save(meeting);
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Не удалось запустить бота: ${message}`);
      throw new BadRequestException('Не удалось запустить бота на Aura');
    }

    return meeting;
  }

  async stopMeeting(meetingId: string, userId: string): Promise<Meeting> {
    const meeting = await this.findOwnedMeeting(meetingId, userId);

    if (meeting.status === 'ended' || meeting.status === 'failed') {
      return meeting;
    }

    try {
      await this.auraClient.stopBot(meetingId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Aura stop warning: ${message}`);
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();
    const saved = await this.meetingsRepository.save(meeting);
    void this.summaryQueueService.enqueueGenerate(meetingId);
    return saved;
  }

  findByUser(userId: string): Promise<Meeting[]> {
    return this.meetingsRepository.find({
      where: { createdById: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOwnedMeeting(meetingId: string, userId: string): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('Встреча не найдена');
    }

    if (meeting.createdById !== userId) {
      throw new ForbiddenException('Нет доступа к этой встрече');
    }

    return meeting;
  }

  async updateStatus(meetingId: string, status: MeetingStatus): Promise<void> {
    const meeting = await this.meetingsRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('Встреча не найдена');
    }

    meeting.status = status;
    if (status === 'active' && !meeting.startedAt) {
      meeting.startedAt = new Date();
    }
    if (status === 'ended' || status === 'failed') {
      meeting.endedAt = new Date();
    }

    await this.meetingsRepository.save(meeting);

    if (status === 'ended') {
      void this.summaryQueueService.enqueueGenerate(meetingId);
    }
  }
}
