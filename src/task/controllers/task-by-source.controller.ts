import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuarOption, UseAuthGuard } from 'libs/guards/auth.guard';
import {
  CancelByCommandResponseDto,
  CancelByCommandTaskDto,
  CancelByIdCommandTaskDto,
  CreateTaskDto,
  SnoozeByCommandTaskDto,
} from '../task.dto';
import { PostRoute, PutRoute } from 'libs/decorators/route.decorators';
import { SuccessDto } from 'libs/dtos';
import { TaskBySourceService } from '../services/task-by-source.service';

@ApiTags('Task')
@Controller('api/task/source')
export class TaskBySourceController {
  constructor(private readonly taskService: TaskBySourceService) {}

  @PostRoute('', {
    Ok: SuccessDto,
  })
  @UseAuthGuard(AuthGuarOption.RESTRICTED)
  async create(@Body() data: CreateTaskDto): Promise<SuccessDto> {
    await this.taskService.create(data);
    return new SuccessDto();
  }

  @PutRoute('snooze', {
    Ok: SuccessDto,
  })
  @UseAuthGuard(AuthGuarOption.RESTRICTED)
  async snooze(@Body() data: SnoozeByCommandTaskDto): Promise<SuccessDto> {
    await this.taskService.snooze(data);
    return new SuccessDto();
  }

  @PutRoute('/cancel')
  @UseAuthGuard(AuthGuarOption.RESTRICTED)
  async cancel(
    @Body() data: CancelByCommandTaskDto,
  ): Promise<CancelByCommandResponseDto | SuccessDto> {
    const response = await this.taskService.cancel(data);
    if (response) {
      return response;
    } else {
      return new SuccessDto();
    }
  }

  @PutRoute('/cancel/id', {
    Ok: SuccessDto,
  })
  @UseAuthGuard(AuthGuarOption.RESTRICTED)
  async cancelById(
    @Body() data: CancelByIdCommandTaskDto,
  ): Promise<SuccessDto> {
    await this.taskService.cancelById(data);
    return new SuccessDto();
  }
}
