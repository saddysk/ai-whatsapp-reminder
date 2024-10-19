import { Module } from '@nestjs/common';
import { MessageBirdService } from './message-bird.service';
import { SupabaseService } from 'src/supabase/supabase.service';

@Module({
  providers: [MessageBirdService, SupabaseService],
  exports: [MessageBirdService],
})
export class MessageBirdModule {}
