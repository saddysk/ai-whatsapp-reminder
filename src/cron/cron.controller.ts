import { Controller, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MessageScheduleService } from './message-schedule.service';
import { SuccessDto } from 'libs/dtos';
import { Request } from 'express';
import { PostRoute } from 'libs/decorators/route.decorators';

@ApiTags('Cron')
@Controller('api/cron')
export class CronController {
  constructor(
    private readonly messageScheduleService: MessageScheduleService,
  ) {}

  @PostRoute('/schedule/message')
  async reminderMessage(@Req() req: Request) {
    await this.messageScheduleService.handle(req);
    return new SuccessDto();
  }
}
