import { Body, Controller, Param, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuarOption, UseAuthGuard } from 'libs/guards/auth.guard';
import {
  AdminEditTaskDto,
  CreateNewTaskDto,
  SnoozeAllTasksDto,
  SnoozeTaskDto,
  TaskDto,
} from '../task.dto';
import { TaskService } from '../services/task.service';
import {
  DeleteRoute,
  GetRoute,
  PostRoute,
  PutRoute,
} from 'libs/decorators/route.decorators';
import { SuccessDto } from 'libs/dtos';

@ApiTags('Task')
@Controller('api/task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @PostRoute('', {
    Ok: TaskDto,
  })
  @UseAuthGuard(AuthGuarOption.JWT)
  async create(
    @Request() req: any,
    @Body() data: CreateNewTaskDto,
  ): Promise<TaskDto> {
    const newTask = await this.taskService.save(req.user.id, data);
    return new TaskDto(newTask);
  }

  @GetRoute('', {
    Ok: { dtoType: 'ArrayDto', type: TaskDto },
  })
  @UseAuthGuard(AuthGuarOption.JWT)
  async getAll(@Request() req: any): Promise<TaskDto[]> {
    const tasks = await this.taskService.get(req.user.id);
    return tasks.map((task) => new TaskDto(task));
  }

  @PutRoute('snooze', {
    Ok: SuccessDto,
  })
  @UseAuthGuard(AuthGuarOption.JWT)
  async snooze(
    @Request() req: any,
    @Body() data: SnoozeTaskDto,
  ): Promise<SuccessDto> {
    await this.taskService.snooze(req.user.id, data);
    return new SuccessDto();
  }

  @PutRoute('snooze/all', {
    Ok: SuccessDto,
  })
  @UseAuthGuard(AuthGuarOption.JWT)
  async snoozeAll(
    @Request() req: any,
    @Body() data: SnoozeAllTasksDto,
  ): Promise<SuccessDto> {
    await this.taskService.snoozeAll(req.user.id, data);
    return new SuccessDto();
  }

  @PutRoute('/admin', {
    Ok: TaskDto,
  })
  @UseAuthGuard(AuthGuarOption.RESTRICTED)
  async adminEdit(@Body() data: AdminEditTaskDto): Promise<TaskDto> {
    const task = await this.taskService.editByAdmin(data);
    return new TaskDto(task);
  }

  @PutRoute(':id', {
    Ok: TaskDto,
  })
  @UseAuthGuard(AuthGuarOption.JWT)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: CreateNewTaskDto,
  ): Promise<TaskDto> {
    const task = await this.taskService.update(req.user.id, id, data);
    return new TaskDto(task);
  }

  @DeleteRoute(':id', {
    Ok: TaskDto,
  })
  @UseAuthGuard(AuthGuarOption.JWT)
  async cancel(@Request() req: any, @Param('id') id: string): Promise<TaskDto> {
    const task = await this.taskService.updateTaskStatus(req.user.id, id);
    return new TaskDto(task);
  }
}
