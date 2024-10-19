import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from 'src/supabase/supabase.service';
import {
  CancelByCommandResponseDto,
  CancelByCommandTaskDto,
  CancelByIdCommandTaskDto,
  CreateTaskDto,
  DetailedTaskDto,
  SnoozeByCommandTaskDto,
  TaskStatusType,
} from '../task.dto';
import { TaskService } from './task.service';
import { ITaskDetails } from '../interfaces/task.interface';
import {
  extractTaskId,
  formatDateTime,
  formatReminder,
  getScheduleCount,
} from 'libs/helpers';
import { MessageBirdService } from 'src/message-bird/message-bird.service';
import { utcToZonedTime } from 'date-fns-tz';
import { LlamaService } from 'src/llama/llama.service';
import { StandardMsgBirdRequestDto } from 'libs/dtos/message-bird.dto';

@Injectable()
export class TaskBySourceService {
  private readonly client: SupabaseClient;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly taskService: TaskService,
    private readonly llamaService: LlamaService,
    private readonly messageBirdService: MessageBirdService,
  ) {
    this.client = this.supabaseService.getClient();
  }

  async create(taskData: CreateTaskDto) {
    Logger.log(
      `Schedule task: "${taskData.task}", for: ${taskData.user_phone}`,
    );

    const { data: user, error: userError } = await this.client
      .from('users')
      .select('id, timezone')
      .eq('phone', taskData.user_phone)
      .single();

    const { conversation_id, participant_id } = taskData;
    if (!user || userError) {
      const phone = taskData.user_phone;
      await this.messageBirdService.sendMessage({
        user_phone: phone,
        message: `No user found for ${phone}`,
        msgBirdIds: { conversation_id, participant_id },
      });
      throw new BadRequestException(`No valid user found for phone: ${phone}`);
    }

    await this.client
      .from('users')
      .update({ conversation_id, participant_id })
      .eq('id', user.id);

    this.getTaskDetailsAndSchedule(user.id, taskData, user.timezone);
  }

  async getAll(request: StandardMsgBirdRequestDto) {
    const { user_phone, conversation_id, participant_id } = request;

    const { data: user, error: userError } = await this.client
      .from('users')
      .select('id')
      .eq('phone', user_phone)
      .single();

    if (!user) {
      console.error(`Failed to fetch user. [ERROR] - ${userError}`);
      throw new BadRequestException(
        `No valid user found for phone: ${user_phone}`,
      );
    }

    const { data: tasks } = await this.client
      .from('tasks')
      .select('task')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const allActiveTask = tasks
      .map((t, idx) => `${idx + 1}. ${t.task}`)
      .join(', ');

    await this.messageBirdService.sendMessage({
      user_phone,
      message: `Here is the list of all active reminders - ${allActiveTask}`,
      msgBirdIds: { conversation_id, participant_id },
    });
  }

  async snooze(data: SnoozeByCommandTaskDto) {
    // get user from phone
    const { data: user, error: userError } = await this.client
      .from('users')
      .select()
      .eq('phone', data.user_phone)
      .single();

    if (!user || userError) {
      throw new BadRequestException(
        `No valid user found for phone: ${data.user_phone}`,
      );
    }

    await this.taskService.snoozeAll(user.id, {
      start_date: new Date(),
      noOfDays: data.noOfDays,
    });

    const { conversation_id, participant_id } = user;
    await this.messageBirdService.sendMessage({
      user_phone: user.phone,
      message:
        'All the active reminders will be snoozed for the mentioned period.',
      msgBirdIds: { conversation_id, participant_id },
    });
  }

  async cancel(
    data: CancelByCommandTaskDto,
  ): Promise<CancelByCommandResponseDto> {
    Logger.debug(`Run cancel for ${data.user_phone}`);

    const { data: user, error: userError } = await this.client
      .from('users')
      .select('id, conversation_id, participant_id')
      .eq('phone', data.user_phone)
      .single();

    if (!user || userError) {
      throw new BadRequestException(
        `No valid user found for phone: ${data.user_phone}`,
      );
    }

    const previous24Hrs = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: tasks, error: tasksError } = await this.client
      .from('tasks')
      .select('id, created_at, reminder_msg, task_id')
      .eq('user_id', user.id)
      .eq('status', TaskStatusType.ACTIVE)
      .gte('created_at', previous24Hrs);

    if (tasksError) {
      throw new BadRequestException(tasksError.message);
    }

    let message =
      'No reminders set in the last 24 hours. To delete older reminders, please go to https://reminderbot.xyz/dashboard';
    if (tasks?.length === 1) {
      await this.taskService.updateTaskStatus(user.id, tasks[0].id);
      message =
        'Your last reminder is cancelled. Please go to https://reminderbot.xyz/dashboard to cancel older reminders';
    } else if (tasks?.length > 1) {
      const trimmedTasks = tasks.map((item) => {
        const taskMsg =
          item.reminder_msg.length > 20
            ? `${item.reminder_msg.substring(0, 20).trim()}...`
            : item.reminder_msg;
        return {
          id: formatReminder(item.task_id, item.created_at),
          task: taskMsg,
        };
      });

      return { tasks: trimmedTasks };
    }

    await this.messageBirdService.sendMessage({
      user_phone: data.user_phone,
      message,
      msgBirdIds: {
        conversation_id: user.conversation_id,
        participant_id: user.participant_id,
      },
    });
  }

  async cancelById(data: CancelByIdCommandTaskDto) {
    Logger.debug(`Cancel id ${data.id} for ${data.user_phone}`);

    const { data: user, error: userError } = await this.client
      .from('users')
      .select('id, conversation_id, participant_id')
      .eq('phone', data.user_phone)
      .single();

    if (!user || userError) {
      throw new BadRequestException(
        `No valid user found for phone: ${data.user_phone}`,
      );
    }

    const taskId = extractTaskId(data.id);
    if (taskId === null) {
      throw new BadRequestException(
        `[Cancel] Task id is missing for: ${data.id}`,
      );
    }

    await this.taskService.updateTaskStatus(user.id, taskId);

    await this.messageBirdService.sendMessage({
      user_phone: data.user_phone,
      message: 'Your reminder has been cancelled.',
      msgBirdIds: {
        conversation_id: user.conversation_id,
        participant_id: user.participant_id,
      },
    });
  }

  private async getTaskDetailsAndSchedule(
    userId: string,
    taskData: CreateTaskDto,
    timezone: string,
  ) {
    const { task: taskMessage, user_phone: userPhone } = taskData;

    try {
      const response: ITaskDetails = await this.llamaService.functionCall(
        taskMessage,
        timezone,
      );
      Logger.debug(
        `User: ${userPhone}, Task details: ${JSON.stringify(response)}`,
      );

      if (!response.task || response.task.toLowerCase() === 'reminder') {
        throw new Error();
      }

      const startDateTime = formatDateTime(
        response.time,
        response.date,
        timezone,
      );
      const endDateTimeInZone = utcToZonedTime(response.end, timezone);
      const taskData = {
        task: taskMessage,
        reminder_msg: response.task,
        confirmation_msg: response.confirmation,
        frequency: response.frequency,
        no_of_times: getScheduleCount(
          response.frequency,
          startDateTime,
          endDateTimeInZone,
        ),
        start_date: startDateTime,
        end_date: response.end ? endDateTimeInZone : null,
      };

      console.log(taskData);

      await this.processTask(userId, taskData);
    } catch (error) {
      await this.handleTaskProcessingError(userId, taskMessage);
    }
  }

  private async processTask(userId: string, taskDetails: DetailedTaskDto) {
    try {
      const { data: user } = await this.client
        .from('users')
        .select()
        .eq('id', userId)
        .single();

      const { confirmation_msg: confirmMessage } = await this.taskService.save(
        user.id,
        taskDetails,
      );

      await this.messageBirdService.sendMessage({
        user_phone: user.phone,
        message: confirmMessage,
        msgBirdIds: {
          conversation_id: user.conversation_id,
          participant_id: user.participant_id,
        },
      });

      if (user.conversation_id && user.participant_id) {
        const { conversation_id, participant_id } = user;
        await this.client
          .from('users')
          .update({ conversation_id, participant_id })
          .eq('id', userId);
      }
    } catch (error) {
      Logger.error(error);
    }
  }

  private async handleTaskProcessingError(userId: string, task: string) {
    const { data: user, error: userError } = await this.client
      .from('users')
      .select()
      .eq('id', userId)
      .single();

    if (userError) {
      throw new BadRequestException(
        'Failed to get user at "handleTaskProcessingError()"',
      );
    }

    const errorMessage = `Oopsy, I am unable to decipher this reminder. Can you please try again?
    Eg. Remind me to read a book daily at 10 PM`;

    Logger.error(`${errorMessage} for user: ${user.phone}, task: ${task}`);

    await this.messageBirdService.sendMessage({
      user_phone: user.phone,
      message: errorMessage,
      msgBirdIds: {
        conversation_id: user.conversation_id,
        participant_id: user.participant_id,
      },
    });
  }
}
