import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export enum AuthGuarOption {
  JWT = 'jwt',
  RESTRICTED = 'restricted',
}

export function UseAuthGuard(option: AuthGuarOption): MethodDecorator {
  return UseGuards(AuthGuard(option));
}
