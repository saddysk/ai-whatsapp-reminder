import { BadRequestException } from '@nestjs/common';
import {
  addDays,
  addMilliseconds,
  differenceInMilliseconds,
  getHours,
  isBefore,
  format,
  parseISO,
} from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { customAlphabet } from 'nanoid';

export function formatDateTime(
  time: string,
  date: string,
  userTimezone = 'Asia/Kolkata',
): Date {
  let timeString = time;
  const dateString = date ?? new Date().toISOString().split('T')[0];
  const currentTimeInZone = utcToZonedTime(new Date(), userTimezone);

  if (time == null) {
    const hours = getHours(currentTimeInZone);
    timeString = hours < 12 ? '09:00' : '18:00';
  }

  const utcDate = zonedTimeToUtc(`${dateString}T${timeString}`, userTimezone);
  const zonedDateTime = utcToZonedTime(utcDate, userTimezone);

  // Check if the time is before the current time, if so, add a day
  if (isBefore(zonedDateTime, currentTimeInZone)) {
    return zonedTimeToUtc(addDays(zonedDateTime, 1), userTimezone);
  }

  return zonedTimeToUtc(zonedDateTime, userTimezone);
}

export function getScheduleCount(
  frequency: number,
  startDate: Date,
  endDate: Date,
): number {
  let noOfTimes;

  if (frequency <= 0) {
    noOfTimes = 1;
  } else if (endDate == null) {
    noOfTimes = 365;
  } else if (endDate != null) {
    const diffTime = differenceInMilliseconds(endDate, startDate);

    noOfTimes = diffTime >= frequency ? Math.ceil(diffTime / frequency) : 1;
  }

  return noOfTimes;
}

export function validateEndDateAndFrequency(endDate: Date, frequency: number) {
  if (endDate != null && frequency == 0) {
    throw new BadRequestException(
      'Repetation cannot be never when end date is selected.',
    );
  }
  if (endDate == null && frequency !== 0) {
    throw new BadRequestException(
      'End date is required when repetation is selected.',
    );
  }
}

export function validateReminderTime(startDate: Date) {
  if (isBefore(startDate, new Date())) {
    throw new BadRequestException('Reminder time must not be in the past.');
  }
}

export function randomNumericString(length: number): string {
  return customAlphabet('0123456789', length)();
}

export function getDateRangeAfterSnooze(
  taskStart: string,
  taskEnd: string,
  frequency: number,
): Date[] {
  const start = new Date(taskStart);
  const end = new Date(taskEnd);
  let current = start;
  const dates = [];

  while (current <= end) {
    dates.push(new Date(current));
    current = addMilliseconds(current, frequency);
  }

  return dates;
}

export function formatReminder(task_id: string, timestamp: string): string {
  const taskIdString = String(task_id).padStart(4, '0');
  const formattedDate = format(parseISO(timestamp), 'MMM dd');
  const idString = `Reminder #${taskIdString} ${formattedDate}`;

  return idString;
}

export function extractTaskId(messageString: string): string | null {
  const regex = /Reminder\s*#(\d+)/;
  const match = messageString.match(regex);

  if (match) {
    return parseInt(match[1], 10).toString();
  }
  return null;
}
