import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from 'src/supabase/supabase.service';
import { TypeTask } from 'types';
import {
  CreateNewTaskDto,
  TaskStatusType,
  SnoozeTaskDto,
  SnoozeAllTasksDto,
  TaskDto,
  AdminEditTaskDto,
} from '../task.dto';
import { MessageScheduleService } from 'src/cron/message-schedule.service';
import { toEvent } from 'src/cron/message-schedule.interface';
import {
  getDateRangeAfterSnooze,
  getScheduleCount,
  validateEndDateAndFrequency,
  validateReminderTime,
} from 'libs/helpers';
import {
  add,
  endOfDay,
  getHours,
  getMinutes,
  isAfter,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns';
import { MessageBirdService } from 'src/message-bird/message-bird.service';
import { validate as uuidValidate } from 'uuid';
import { utcToZonedTime } from 'date-fns-tz';

@Injectable()
export class TaskService {
  private readonly client: SupabaseClient;

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(forwardRef(() => MessageScheduleService))
    private readonly messageScheduleService: MessageScheduleService,
    private readonly messageBirdService: MessageBirdService,
  ) {
    this.client = this.supabaseService.getClient();
  }

  async save(userId: string, data: CreateNewTaskDto): Promise<TypeTask> {
    validateReminderTime(data.start_date);

    if (data.no_of_times == null) {
      validateEndDateAndFrequency(data.end_date, data.frequency);

      data['no_of_times'] = getScheduleCount(
        data.frequency,
        data.start_date,
        data.end_date,
      );
    }
    if (data.task == null) {
      data['task'] = data.reminder_msg;
    }

    data['user_id'] = userId;

    const reminderMsg = data['reminder_msg'];
    data['reminder_msg'] =
      reminderMsg.charAt(0).toUpperCase() + reminderMsg.slice(1);
    const { data: task, error } = await this.client
      .from('tasks')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    await this.scheduleTask(task);

    return task;
  }

  async get(userId: string): Promise<TypeTask[]> {
    const { data: tasks, error } = await this.client
      .from('tasks')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      throw new BadRequestException(error.message);
    }
    return tasks;
  }

  async getActiveTask(id: string, userId: string): Promise<TypeTask> {
    const { data, error } = await this.client
      .from('tasks')
      .select()
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', TaskStatusType.ACTIVE)
      .single();

    if (error || !data) {
      throw new BadRequestException(
        `Any active reminder not found for id: ${id}`,
      );
    }
    return data;
  }

  async triggerReminder(eventId: string, taskId: string) {
    // check if task id is a valid active task
    const { data: task, error } = await this.client
      .from('tasks')
      .select(`*, users (phone)`)
      .eq('id', taskId)
      .eq('status', TaskStatusType.ACTIVE)
      .single();

    if (error) {
      throw error;
    }

    if (!task) {
      // delete event if the task is not active anymore
      await this.messageScheduleService.delete(eventId);
      throw new BadRequestException(`No active task exists with id: ${taskId}`);
    }

    // send reminder to user
    const reminderMsg = task.reminder_msg;
    await this.messageBirdService.sendReminder(
      reminderMsg.charAt(0).toUpperCase() + reminderMsg.slice(1),
      task.users.phone,
    );

    // update task with status and trigger count
    task.trigger_count++;
    if (task.trigger_count === task.no_of_times) {
      task.status = TaskStatusType.COMPLETED;
    }
    await this.client
      .from('tasks')
      .update({
        trigger_count: task.trigger_count,
        status: task.status,
      })
      .eq('id', task.id);
  }

  async update(
    userId: string,
    taskId: string,
    data: CreateNewTaskDto,
  ): Promise<TypeTask> {
    validateReminderTime(data.start_date);
    validateEndDateAndFrequency(data.end_date, data.frequency);

    const task = await this.getActiveTask(taskId, userId);

    await this.updateTaskStatus(userId, task.id, TaskStatusType.UPDATED);

    let endDate = data.end_date;
    if (endDate == null) {
      endDate = task.end_date ? new Date(task.end_date) : null;
    }
    const newTask = await this.save(userId, {
      previous_id: task.id,
      reminder_msg: data.reminder_msg ?? task.reminder_msg,
      start_date: data.start_date ?? new Date(task.start_date),
      end_date: endDate,
      frequency: data.frequency ?? task.frequency,
      task: task.task,
      confirmation_msg: task.confirmation_msg,
    });

    return newTask;
  }

  async editByAdmin(data: AdminEditTaskDto): Promise<TypeTask> {
    validateReminderTime(data.start_date);
    validateEndDateAndFrequency(data.end_date, data.frequency);

    const { data: reminder, error } = await this.client
      .from('tasks')
      .select()
      .eq('id', data.id)
      .single();

    if (error) {
      throw new BadRequestException(error);
    }

    const updateData = {};
    if (data.reminder_msg != reminder.reminder_msg) {
      const reminderMsg = data.reminder_msg;
      updateData['reminder_msg'] =
        reminderMsg.charAt(0).toUpperCase() + reminderMsg.slice(1);
    }

    if (
      reminder.start_date != data.start_date ||
      reminder.end_date != data.end_date ||
      reminder.frequency != data.frequency
    ) {
      updateData['start_date'] = data.start_date;
      updateData['end_date'] = data.end_date;
      updateData['frequency'] = data.frequency;
      updateData['no_of_times'] = getScheduleCount(
        data.frequency,
        data.start_date,
        data.end_date,
      );
      const deleteScheduledQyery$ = this.messageScheduleService.delete(
        reminder.scheduler_id,
      );
      const scheduleNewQuery$ = this.scheduleTask({
        ...updateData,
        id: data.id,
      });
      await Promise.all([deleteScheduledQyery$, scheduleNewQuery$]);
    }

    if (Object.keys(updateData).length === 0) {
      return reminder;
    }

    const { data: updatedTask } = await this.client
      .from('tasks')
      .update(updateData)
      .eq('id', reminder.id)
      .select()
      .single();

    return updatedTask;
  }

  async updateTaskStatus(
    userId: string,
    taskId: string,
    status = TaskStatusType.CANCELLED,
    extraOptions?: Partial<CreateNewTaskDto>,
  ): Promise<TypeTask> {
    const taskQuery$ = this.client
      .from('tasks')
      .select(`id, scheduler_id`)
      .eq('user_id', userId);

    if (uuidValidate(taskId)) {
      taskQuery$.eq('id', taskId);
    } else {
      taskQuery$.eq('task_id', taskId);
    }

    const { data: task, error } = await taskQuery$.single();

    if (!task || error) {
      throw new BadRequestException(
        `Task not found for user: ${userId}, task with id: ${taskId}`,
      );
    }

    await this.messageScheduleService.delete(task.scheduler_id);

    const { data: deletedTask, error: deleteError } = await this.client
      .from('tasks')
      .update({ status, ...extraOptions })
      .eq('id', task.id)
      .select()
      .single();

    if (deleteError) {
      throw new BadRequestException(deleteError.message);
    }
    return deletedTask;
  }

  async scheduleTask(data: Partial<TypeTask>) {
    const { id, frequency, no_of_times, start_date } = data;

    // schedule task
    const event = toEvent({
      every: frequency,
      times: no_of_times,
      scheduleAt: new Date(start_date),
      data: {
        taskId: id,
      },
    });
    await this.messageScheduleService.enqueue(event);
  }

  async snoozeAll(userId: string, data: SnoozeAllTasksDto) {
    const taskQuery$ = this.client
      .from('tasks')
      .select()
      .eq('user_id', userId)
      .eq('status', TaskStatusType.ACTIVE)
      .or(`end_date.gte.${data.start_date.toISOString()},end_date.is.null`);
    const userQuery$ = this.client
      .from('users')
      .select('id, timezone')
      .eq('id', userId)
      .single();
    const [{ data: reminders, error }, { data: user }] = await Promise.all([
      taskQuery$,
      userQuery$,
    ]);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const snoozeStart = startOfDay(
      utcToZonedTime(data.start_date, user.timezone),
    );
    const snoozeEnd = endOfDay(add(data.start_date, { days: data.noOfDays }));
    const filteredReminders = this.filterTasksToSnooze(
      reminders,
      snoozeStart,
      snoozeEnd,
    );

    await Promise.all(
      filteredReminders.map((reminder) => {
        const {
          id,
          start_date,
          end_date,
          frequency,
          snoozeStart,
          snoozeEnd,
          scheduler_id,
        } = reminder;

        if (end_date == null || frequency == 0) {
          return this.client
            .from('tasks')
            .update({ status: 'snoozed' })
            .eq('id', id)
            .then(() => this.messageScheduleService.delete(scheduler_id));
        } else {
          return this.snoozeTaskFn(
            {
              id,
              start_date: new Date(start_date).toISOString(),
              end_date: new Date(end_date).toISOString(),
              frequency,
            },
            snoozeStart,
            snoozeEnd,
          );
        }
      }),
    );
  }

  async snooze(userId: string, data: SnoozeTaskDto) {
    const snoozeStart = startOfDay(new Date(data.start_date));
    const snoozeEnd = endOfDay(add(data.start_date, { days: data.noOfDays }));

    const activeTask = await this.getActiveTask(data.id, userId);

    if (activeTask.end_date == null || activeTask.frequency == 0) {
      await this.client
        .from('tasks')
        .update({ status: 'snoozed' })
        .eq('id', data.id);
      await this.messageScheduleService.delete(activeTask.scheduler_id);
      return;
    }

    const { id, start_date, end_date, frequency } = activeTask;
    await this.snoozeTaskFn(
      { id, start_date, end_date, frequency },
      snoozeStart,
      snoozeEnd,
    );
  }

  async snoozeTask(taskId: string) {
    const { data, error } = await this.client
      .from('tasks')
      .update({ status: 'snoozed' })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      Logger.error(error);
    }

    // delete existing reminder
    await this.messageScheduleService.delete(data.scheduler_id);

    // schedule to activate from snooze
    const addTime = {
      hours: getHours(new Date()),
      minutes: getMinutes(new Date()),
    };
    const scheduleAt = isSameDay(parseISO(data.snooze_end_at), new Date())
      ? add(data.snooze_end_at, addTime)
      : parseISO(data.snooze_end_at);
    const event = toEvent({
      scheduleAt,
      data: {
        taskId: data.id,
        action: 'activate',
      },
    });
    await this.messageScheduleService.enqueue(event);
  }

  async activateSnoozedTask(taskId: string) {
    const { data: reminder } = await this.client
      .from('tasks')
      .select()
      .eq('id', taskId)
      .single();

    // includes the dates or times at which the reminder will run
    const reminderDatesArr = getDateRangeAfterSnooze(
      reminder.start_date,
      reminder.end_date,
      reminder.frequency,
    );

    if (reminderDatesArr.length === 0) {
      await this.client
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId);
      return;
    }

    const { data, error } = await this.client
      .from('tasks')
      .update({ status: 'active' })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      Logger.error(error);
    }

    // find the first reminder date after the snooze ends
    const restartIndex = reminderDatesArr.findIndex((date) =>
      isAfter(date, parseISO(data.snooze_end_at)),
    );
    const reminderRestart = reminderDatesArr[restartIndex];
    // number of times the reminder will run after the snooze ends
    const noOfTimes = getScheduleCount(
      data.frequency,
      reminderRestart,
      parseISO(data.end_date),
    );
    // schedule task to restart the reminders
    await this.scheduleTask({
      id: data.id,
      frequency: data.frequency,
      no_of_times: noOfTimes,
      start_date: reminderRestart.toISOString(),
    });
  }

  updateSchedulerId(schedulerId: string, taskId: string) {
    return this.client
      .from('tasks')
      .update({ scheduler_id: schedulerId })
      .eq('id', taskId)
      .select()
      .single();
  }

  private async snoozeTaskFn(
    task: Partial<TypeTask>,
    snoozeStart: Date,
    snoozeEnd: Date,
  ) {
    const reminderDatesArr = getDateRangeAfterSnooze(
      task.start_date,
      task.end_date,
      task.frequency,
    );
    const interval = { start: snoozeStart, end: snoozeEnd };
    const rescheduleRequired = reminderDatesArr.some((date) =>
      isWithinInterval(date, interval),
    );

    if (!rescheduleRequired) {
      Logger.log('Reschedule not required.');
      return;
    }

    await this.client
      .from('tasks')
      .update({
        snooze_start_at: snoozeStart,
        snooze_end_at: snoozeEnd,
      })
      .eq('id', task.id);

    if (isSameDay(snoozeStart, parseISO(task.start_date))) {
      await this.snoozeTask(task.id);
    } else {
      const event = toEvent({
        scheduleAt: snoozeStart,
        data: {
          taskId: task.id,
          action: 'snooze',
        },
      });
      await this.messageScheduleService.enqueue(event);
    }
  }

  private filterTasksToSnooze(
    tasks: TaskDto[],
    snoozeStart: Date,
    snoozeEnd: Date,
  ) {
    return tasks.reduce((filteredTasks, task) => {
      // Assuming start_date and end_date are already Date objects; otherwise, convert them first
      const start_date = new Date(task.start_date);
      const end_date = task.end_date ? new Date(task.end_date) : null;

      // Check if the task's start or end date falls within the given range or spans it
      const isStartWithin = isWithinInterval(start_date, {
        start: snoozeStart,
        end: snoozeEnd,
      });
      const isEndWithin = end_date
        ? isWithinInterval(end_date, { start: snoozeStart, end: snoozeEnd })
        : false;
      const spansInterval =
        start_date < snoozeStart && end_date && end_date > snoozeEnd;

      if (isStartWithin || isEndWithin || spansInterval) {
        // Adjust start and end dates based on snooze range
        const adjustedStartDate =
          start_date >= snoozeStart ? start_date : snoozeStart;
        const adjustedEndDate =
          end_date == null || end_date <= snoozeEnd ? end_date : snoozeEnd;

        filteredTasks.push({
          ...task,
          snoozeStart: adjustedStartDate,
          snoozeEnd: adjustedEndDate,
        });
      }

      return filteredTasks;
    }, []);
  }
}
