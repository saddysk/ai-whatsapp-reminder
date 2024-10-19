import { PickType } from '@nestjs/swagger';
import {
  DateField,
  DateFieldOptional,
  EnumField,
  NumberField,
  NumberFieldOptional,
  ObjectField,
  StringField,
  StringFieldOptional,
  UUIDField,
  UUIDFieldOptional,
} from 'libs/decorators';
import { TypeTask } from 'types';

export enum TaskStatusType {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  SNOOZED = 'snoozed',
  UPDATED = 'updated',
  COMPLETED = 'completed',
}

export class TaskDto {
  @UUIDField()
  id: string;

  @UUIDFieldOptional()
  previous_id?: string;

  @DateField()
  created_at: Date;

  @StringFieldOptional()
  user_phone?: string;

  @UUIDField()
  user_id: string;

  @StringField()
  task: string;

  @NumberField()
  frequency: number;

  @NumberField()
  no_of_times: number;

  @StringField()
  reminder_msg: string;

  @StringFieldOptional()
  confirmation_msg: string;

  @DateField()
  start_date: Date;

  @DateFieldOptional()
  end_date?: Date;

  @EnumField(() => TaskStatusType)
  status: TaskStatusType;

  constructor(task: TypeTask) {
    this.id = task.id;
    this.previous_id = task.previous_id;
    this.created_at = new Date(task.created_at);
    this.user_id = task.user_id;
    this.task = task.task;
    this.frequency = task.frequency;
    this.reminder_msg = task.reminder_msg;
    this.confirmation_msg = task.confirmation_msg;
    this.start_date = new Date(task.start_date);
    this.status = task.status as TaskStatusType;
    if (task.end_date) {
      this.end_date = new Date(task.end_date);
    }
  }
}

export class CreateTaskDto extends PickType(TaskDto, ['user_phone', 'task']) {
  @StringFieldOptional()
  conversation_id?: string;

  @StringFieldOptional()
  participant_id?: string;
}

export class DetailedTaskDto extends PickType(TaskDto, [
  'task',
  'frequency',
  'no_of_times',
  'reminder_msg',
  'confirmation_msg',
  'start_date',
  'end_date',
]) {}

export class AdminEditTaskDto extends PickType(TaskDto, [
  'id',
  'reminder_msg',
  'start_date',
  'end_date',
  'frequency',
]) {}

export class CreateNewTaskDto extends PickType(TaskDto, [
  'previous_id',
  'reminder_msg',
  'start_date',
  'end_date',
  'frequency',
]) {
  @StringFieldOptional()
  task?: string;

  @StringFieldOptional()
  confirmation_msg?: string;

  @NumberFieldOptional()
  no_of_times?: number;
}

export class CancelByIdCommandTaskDto extends PickType(TaskDto, [
  'user_phone',
]) {
  @StringField()
  id: string;
}
export class CancelByCommandTaskDto extends PickType(TaskDto, ['user_phone']) {}
export class CancelByCommandResponseTasksDto extends PickType(TaskDto, [
  'id',
  'task',
]) {}
export class CancelByCommandResponseDto {
  @ObjectField(() => CancelByCommandResponseTasksDto)
  tasks: CancelByCommandResponseTasksDto[];
}
export class SnoozeByCommandTaskDto extends PickType(TaskDto, ['user_phone']) {
  @NumberField()
  noOfDays: number;
}

export class SnoozeTaskDto extends PickType(TaskDto, ['id', 'start_date']) {
  @NumberField()
  noOfDays: number;
}
export class SnoozeAllTasksDto extends PickType(SnoozeTaskDto, [
  'start_date',
  'noOfDays',
]) {}
