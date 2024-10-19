import { Injectable } from '@nestjs/common';
import { format, parse } from 'date-fns';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { ITaskDetails } from 'src/task/interfaces/task.interface';
import { TaskService } from 'src/task/services/task.service';

@Injectable()
export class GoogleCalendarService {
  constructor(private readonly taskService: TaskService) {}

  async syncGoogleCalendarEvents(userId: string, authClient: OAuth2Client) {
    const calendar = google.calendar({
      version: 'v3',
      auth: authClient,
    });
    const now = new Date();
    const oneMonthLater = new Date(
      now.getFullYear(),
      now.getMonth() + 3,
      now.getDate(),
    );

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: oneMonthLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items;

    if (events && events.length > 0) {
      const processedEvents = this.processEvents(events);
      await Promise.all(
        processedEvents.map((event) => {
          // Format date time into a single string
          const parsedDate = parse(
            `${event.date} ${event.time}`,
            'yyyy-MM-dd HH:mm',
            new Date(),
          );
          const startDateTime = format(
            parsedDate,
            "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
          );

          this.taskService.save(userId, {
            reminder_msg: event.task,
            start_date: new Date(startDateTime),
            end_date: new Date(event.end),
            frequency: event.frequency,
            confirmation_msg: event.confirmation,
          });
        }),
      );
    }
  }

  private processEvents(events: any[]): ITaskDetails[] {
    const recurringEvents = new Map();

    events.forEach((event) => {
      const eventId = event.recurringEventId || event.id;
      if (!recurringEvents.has(eventId)) {
        recurringEvents.set(eventId, []);
      }
      recurringEvents.get(eventId).push(event);
    });

    const processedEvents = [];

    recurringEvents.forEach((eventGroup) => {
      const firstEvent = eventGroup[0];
      const startDateTime = new Date(
        firstEvent.start.dateTime || firstEvent.start.date,
      );

      let frequency = 0;
      let end = null;

      if (eventGroup.length > 1) {
        eventGroup.sort(
          (a, b) =>
            new Date(a.start.dateTime || a.start.date).getTime() -
            new Date(b.start.dateTime || b.start.date).getTime(),
        );

        const timeDiffs = [];
        for (let i = 1; i < eventGroup.length; i++) {
          const prevDate = new Date(
            eventGroup[i - 1].start.dateTime || eventGroup[i - 1].start.date,
          );
          const currDate = new Date(
            eventGroup[i].start.dateTime || eventGroup[i].start.date,
          );
          timeDiffs.push(currDate.getTime() - prevDate.getTime());
        }

        const frequencyMap = new Map();
        timeDiffs.forEach((diff) => {
          frequencyMap.set(diff, (frequencyMap.get(diff) || 0) + 1);
        });
        frequency = [...frequencyMap.entries()].reduce((a, b) =>
          a[1] > b[1] ? a : b,
        )[0];

        const lastEvent = eventGroup[eventGroup.length - 1];
        end = new Date(lastEvent.start.dateTime || lastEvent.start.date)
          .toISOString()
          .split('T')[0];
      }

      processedEvents.push({
        task: `Attend ${firstEvent.summary}`,
        date: startDateTime.toISOString().split('T')[0],
        time: startDateTime.toTimeString().split(' ')[0].slice(0, 5),
        frequency: frequency,
        end: end,
        confirmation: `Your task '${
          firstEvent.summary
        }' has been scheduled starting from ${startDateTime.toDateString()} at ${startDateTime
          .toTimeString()
          .split(' ')[0]
          .slice(0, 5)}. ${
          frequency
            ? `This is a recurring event with a frequency of ${frequency} milliseconds.`
            : 'This is a one-time event.'
        } ${end ? `The last occurrence is on ${end}.` : ''}`,
      });
    });

    return processedEvents;
  }
}
