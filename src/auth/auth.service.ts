import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from 'src/config/config';
import { GoogleCalendarService } from 'src/google-calendar/google-calendar.service';
import { SupabaseService } from 'src/supabase/supabase.service';

const CONFIG = AppConfig();

@Injectable()
export class AuthService {
  private authClient: OAuth2Client;
  private readonly client: SupabaseClient;

  constructor(
    private httpService: HttpService,
    private readonly supabaseService: SupabaseService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {
    const callbackUrl = `${CONFIG.API_URL}/${CONFIG.GOOGLE_AUTH_CALLBACK}`;
    this.authClient = new google.auth.OAuth2(
      CONFIG.GOOGLE_CLIENT_ID,
      CONFIG.GOOGLE_CLIENT_SECRET,
      callbackUrl,
    );
    this.client = this.supabaseService.getClient();
  }

  getAuthUrl() {
    return this.authClient.generateAuthUrl({
      access_type: 'offline',
      scope: CONFIG.GOOGLE_OAUTH_SCOPES,
    });
  }

  async setCredentials(code: string) {
    try {
      const { tokens } = await this.authClient.getToken(code);
      this.authClient.setCredentials(tokens);
      return tokens;
    } catch (error) {
      console.error('Error in setCredentials:', error.message);
      throw error;
    }
  }

  async authCallback(code: string) {
    const decodedCode = decodeURIComponent(code);
    const tokenData = await this.setCredentials(decodedCode);

    const response = await firstValueFrom(
      this.httpService.get(CONFIG.GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }),
    );

    const { data: user, error } = await this.client
      .from('users')
      .update({ gcal_token: tokenData.access_token })
      .eq('email', response.data.email)
      .select('id')
      .single();

    if (error) {
      console.error(
        `No valid user found for user: ${response.data.email}. [ERROR] - ${error.message}`,
      );
      throw new BadRequestException(
        `No valid user found for user: ${response.data.email}`,
      );
    }

    await this.googleCalendarService.syncGoogleCalendarEvents(
      user.id,
      this.authClient,
    );
  }
}
