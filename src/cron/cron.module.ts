import { Module } from '@nestjs/common';
import { CronController } from './cron.controller';
import { MessageScheduleService } from './message-schedule.service';
import { TaskModule } from 'src/task/task.module';

@Module({
  imports: [TaskModule],
  controllers: [CronController],
  providers: [MessageScheduleService],
  exports: [MessageScheduleService],
})
export class CronModule {}
