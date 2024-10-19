import { Injectable } from '@nestjs/common';

import { SupabaseClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/config';

const CONFIG = AppConfig();

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor() {
    this.client = new SupabaseClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
