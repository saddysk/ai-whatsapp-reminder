import { Module } from '@nestjs/common';
import { CronModule } from './cron/cron.module';
import { AuthModule } from './auth/auth.module';
import { TaskModule } from './task/task.module';
import { MessageBirdModule } from './message-bird/message-bird.module';

@Module({
  imports: [AuthModule, MessageBirdModule, CronModule, TaskModule],
})
export class AppModule {}
