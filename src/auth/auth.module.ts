import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RestrictedStrategy } from './strategies/restricted.strategy';
import { JwtStrategy } from './strategies/jwt.startegy';

@Module({
  imports: [PassportModule],
  providers: [RestrictedStrategy, JwtStrategy],
})
export class AuthModule {}
