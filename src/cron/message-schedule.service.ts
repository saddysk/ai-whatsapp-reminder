import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { QuirrelClient } from 'quirrel';
import { AppConfig } from 'src/config/config';
import superjson from 'superjson';
import { IScheduledMessage } from './message-schedule.interface';
import { TaskService } from 'src/task/services/task.service';
import { utcToZonedTime } from 'date-fns-tz';

const CONFIG = AppConfig();

@Injectable()
export class MessageScheduleService {
  private readonly client: QuirrelClient<IScheduledMessage>;

  constructor(private readonly taskService: TaskService) {
    this.client = new QuirrelClient({
      route: '/api/cron/schedule/message',
      handler: async (m: any) => {
        const message = superjson.parse<IScheduledMessage>(m);
        Logger.log(
          `Processing scheduled message -  ${message.eventId} at ${message.scheduleAt}. Task: ${message.data.taskId}`,
        );
        await this.handleMessageEvents(message);
      },
      options: {},
      config: {
        quirrelBaseUrl: CONFIG.QUIRREL_API_URL,
        applicationBaseUrl: CONFIG.QUIRREL_BASE_URL,
        token: CONFIG.QUIRREL_TOKEN,
      },
    });
  }

  handle(request: Request) {
    return this.client.respondTo(JSON.stringify(request.body), {
      ...request.headers,
    });
  }

  async enqueue(message: IScheduledMessage) {
    const options = {
      id: message.eventId,
      runAt: CONFIG.PROD
        ? utcToZonedTime(message.scheduleAt, 'GMT0')
        : message.scheduleAt,
    };
    if (message.every && message.times) {
      options['repeat'] = {
        every: message.every,
        times: message.times,
      };
    }
    const response = await this.client.enqueue(message, options);
    return this.taskService.updateSchedulerId(response.id, message.data.taskId);
  }

  delete(eventId: string) {
    return this.client.delete(eventId);
  }

  private async handleMessageEvents(message: IScheduledMessage) {
    const { eventId, data: event } = message;

    switch (event.action) {
      case 'snooze':
        await this.taskService.snoozeTask(event.taskId);
        break;
      case 'activate':
        await this.taskService.activateSnoozedTask(event.taskId);
        break;
      default:
        await this.taskService.triggerReminder(eventId, event.taskId);
        break;
    }
  }
}
