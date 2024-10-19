import { Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import axios, { AxiosInstance } from 'axios';
import { AppConfig } from 'src/config/config';
import { SupabaseService } from 'src/supabase/supabase.service';

const CONFIG = AppConfig();

@Injectable()
export class MessageBirdService {
  private readonly axios: AxiosInstance;
  private readonly client: SupabaseClient;

  constructor(private readonly supabaseService: SupabaseService) {
    this.axios = axios.create({
      baseURL: `https://nest.messagebird.com/workspaces/${CONFIG.MB_WORKSPACE_ID}`,
      headers: {
        Authorization: `Bearer ${CONFIG.MESSAGE_BIRD_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    this.client = this.supabaseService.getClient();
  }

  async createContact(phone: string, displayName: string) {
    const data = {
      displayName,
      identifiers: [
        {
          key: 'phonenumber',
          value: phone,
        },
      ],
    };

    try {
      await this.axios.post('/contacts', data);
    } catch (error) {
      Logger.error(error.response?.data?.message);
    }
  }

  async sendReminder(reminder: string, phone: string) {
    const data = {
      receiver: {
        contacts: [{ identifierValue: phone }],
      },
      template: {
        projectId: CONFIG.MB_REMINDER_PROJECT_ID,
        version: 'latest',
        locale: 'en',
        variables: { reminder },
      },
    };

    try {
      await this.axios.post(`/channels/${CONFIG.MB_CHANNEL_ID}/messages`, data);
    } catch (error) {
      Logger.error(error.response?.data?.message);
    }
  }

  async sendMessage({ user_phone, message, msgBirdIds }) {
    const { conversation_id, participant_id } = msgBirdIds;

    axios
      .post(CONFIG.MESSAGE_BIRD_ENDPOINT, {
        user_phone,
        message,
        conversationId: conversation_id,
        participantId: participant_id,
      })
      .catch((error) => {
        Logger.debug('Failed to send message to user through msg bird');
        Logger.error(error);
      });
  }
}
