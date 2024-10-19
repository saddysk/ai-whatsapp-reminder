import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RestrictedStrategy } from './strategies/restricted.strategy';
import { JwtStrategy } from './strategies/jwt.startegy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { SupabaseService } from 'src/supabase/supabase.service';

@Module({
  imports: [PassportModule, HttpModule],
  controllers: [AuthController],
  providers: [RestrictedStrategy, JwtStrategy, AuthService, SupabaseService],
})
export class AuthModule {}
