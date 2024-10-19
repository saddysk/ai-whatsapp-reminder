import { v4 as uuidv4 } from 'uuid';

export interface IScheduledMessage {
  readonly eventId: string;
  readonly scheduleAt: Date;
  readonly every: number | string;
  readonly times: number;
  readonly maxRetries?: number;
  readonly retryCount?: number;
  readonly data: {
    taskId: string;
    action?: 'snooze' | 'activate';
  };
}

export const toEvent = (
  baseEvent: Partial<Omit<IScheduledMessage, 'object'>> = {},
) => {
  return {
    eventId: uuidv4(),
    ...baseEvent,
  } as IScheduledMessage;
};
