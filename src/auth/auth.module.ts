import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RestrictedStrategy } from './strategies/restricted.strategy';
import { JwtStrategy } from './strategies/jwt.startegy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { SupabaseService } from 'src/supabase/supabase.service';
import { GoogleCalendarModule } from 'src/google-calendar/google-calendar.module';
import { MessageBirdService } from 'src/message-bird/message-bird.service';

@Module({
  imports: [PassportModule, HttpModule, GoogleCalendarModule],
  controllers: [AuthController],
  providers: [
    RestrictedStrategy,
    JwtStrategy,
    AuthService,
    SupabaseService,
    MessageBirdService,
  ],
})
export class AuthModule {}
