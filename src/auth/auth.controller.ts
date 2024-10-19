import { Body, Controller, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GetRoute, PostRoute } from 'libs/decorators/route.decorators';
import { SuccessDto } from 'libs/dtos';
import { AuthGuarOption, UseAuthGuard } from 'libs/guards/auth.guard';
import { StandardMsgBirdRequestDto } from 'libs/dtos/message-bird.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @PostRoute('google')
  @UseAuthGuard(AuthGuarOption.RESTRICTED)
  async fetchAuthUrl(@Body() data: StandardMsgBirdRequestDto) {
    await this.authService.fetchAuthUrl(data);
    return new SuccessDto();
  }

  @GetRoute('google/callback')
  async handleCallback(@Query('code') code: string) {
    await this.authService.authCallback(code);
    return new SuccessDto();
  }
}
