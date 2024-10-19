import { Module } from '@nestjs/common';
import { GoogleCalendarService } from 'src/google-calendar/google-calendar.service';
import { TaskModule } from 'src/task/task.module';

@Module({
  imports: [TaskModule],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
