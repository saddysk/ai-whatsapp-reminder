import { Body, Controller, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GetRoute } from 'libs/decorators/route.decorators';
import { SuccessDto } from 'libs/dtos';
import { AuthGuarOption, UseAuthGuard } from 'libs/guards/auth.guard';
import { GAuthDto } from './auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GetRoute('google')
  @UseAuthGuard(AuthGuarOption.RESTRICTED)
  async getAuthUrl(@Body() data: GAuthDto) {
    await this.authService.getAuthUrl(data);
    return new SuccessDto();
  }

  @GetRoute('google/callback')
  async handleCallback(@Query('code') code: string) {
    await this.authService.authCallback(code);
    return new SuccessDto();
  }
}
