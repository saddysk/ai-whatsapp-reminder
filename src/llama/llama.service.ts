import { Injectable } from '@nestjs/common';
import { AppConfig } from 'src/config/config';
import { Bedrock } from '@llamaindex/community';
import { LLMAgent } from 'llamaindex';
import { utcToZonedTime } from 'date-fns-tz';
import taskDetailsTool from './function-tools';
import { ITaskDetails } from 'src/task/interfaces/task.interface';

const CONFIG = AppConfig();

const bedrock = new Bedrock({
  model: CONFIG.BEDROCK_LLAMA_MODEL,
  region: CONFIG.BEDROCK_REGION,
  credentials: {
    accessKeyId: CONFIG.BEDROCK_ACCESS_KEY_ID,
    secretAccessKey: CONFIG.BEDROCK_SECRET_ACCESS_KEY,
  },
});

@Injectable()
export class LlamaService {
  private readonly agent: LLMAgent;

  constructor() {
    this.agent = new LLMAgent({
      llm: bedrock,
      tools: [taskDetailsTool],
    });
  }

  async functionCall(
    taskMessage: string,
    userTimezone = 'Asia/Kolkata',
  ): Promise<ITaskDetails> {
    const newDate = utcToZonedTime(new Date(), userTimezone);

    const response = await this.agent.chat({
      message: `You are a WhatsApp reminder bot message extraction server. User is sending a message from WhatsApp and you're analyzing that to extract Reminder, date or dates of the reminder, frequency of the reminder and end date. try to do the time calculations practically and logically. Do not make silly mistakes, the error will cost me a million dollars. today's date is ${newDate} Give in proper JSON format.
      Task: ${taskMessage}`,
      chatHistory: [],
    });

    const content = JSON.parse(response.message.content as string).parameters;

    return {
      ...content,
      frequency: Number(content.frequency),
      date: content.date == 'null' ? null : content.date,
      end: content.end == 'null' ? null : content.end,
    };
  }
}
