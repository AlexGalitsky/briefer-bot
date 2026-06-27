import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateMeetingDto {
  @IsUrl({}, { message: 'url must be a valid meeting URL' })
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  botName?: string;
}
