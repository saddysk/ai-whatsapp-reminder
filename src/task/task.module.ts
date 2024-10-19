import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { TaskController } from './controllers/task.controller';
import { TaskService } from './services/task.service';
import { MessageScheduleService } from 'src/cron/message-schedule.service';
import { TaskBySourceService } from './services/task-by-source.service';
import { TaskBySourceController } from './controllers/task-by-source.controller';
import { MessageBirdService } from 'src/message-bird/message-bird.service';
import { LlamaModule } from 'src/llama/llama.module';

@Module({
  imports: [SupabaseModule, LlamaModule],
  controllers: [TaskController, TaskBySourceController],
  providers: [
    TaskService,
    TaskBySourceService,
    MessageScheduleService,
    MessageBirdService,
  ],
  exports: [TaskService],
})
export class TaskModule {}
