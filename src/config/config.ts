import * as dotenv from 'dotenv';
import { bool, cleanEnv, port, str } from 'envalid';

dotenv.config();

const env = cleanEnv(process.env, {
  HOST: str({ default: undefined }),
  PORT: port({ default: 3001 }),
  API_URL: str({ default: '/' }),
  FRONTEND_URL: str({ default: '/' }),

  APP_VERSION: str({ default: 'v0.0.0', devDefault: 'local' }),
  //   APP_ENV: str({
  //     default: 'unknown',
  //     devDefault: 'local',
  //     choices: ['local', 'production'],
  //   }),

  INTERNAL_API_TOKEN: str({ default: undefined }),

  SWAGGER_ENABLED: bool({ default: false, devDefault: true }),
  PROD: bool({ default: false, devDefault: false }),
  CORS: bool({ default: true, devDefault: true }),

  SUPABASE_URL: str({ default: '' }),
  SUPABASE_KEY: str({ default: undefined }),
  SUPABASE_JWT_SECRET: str({ default: undefined }),

  BEDROCK_REGION: str({ default: 'us-west-2' }),
  BEDROCK_LLAMA_MODEL: str({ default: 'meta.llama3-1-70b-instruct-v1:0' }),
  BEDROCK_ACCESS_KEY_ID: str({ default: undefined }),
  BEDROCK_SECRET_ACCESS_KEY: str({ default: undefined }),

  QUIRREL_BASE_URL: str({
    default: 'http://localhost:3001',
  }),
  QUIRREL_API_URL: str({
    default: 'http://localhost:9181',
  }),
  QUIRREL_TOKEN: str({ default: undefined }),

  MESSAGE_BIRD_ENDPOINT: str({
    default:
      'https://capture.ap-south-1.nest.messagebird.com/webhooks/cdb1946c-8868-499b-8bdb-64f429709adc/380ed79d-2904-4d06-a622-4400a4fe9975',
  }),
  MESSAGE_BIRD_API_KEY: str({ default: undefined }),
  MB_WORKSPACE_ID: str({ default: 'cdb1946c-8868-499b-8bdb-64f429709adc' }),
  MB_CHANNEL_ID: str({ default: '5820ff2d-fd15-48ac-8e1e-4ea9abe843fb' }),
  MB_REMINDER_PROJECT_ID: str({
    default: '9555d5b9-d4f7-4767-a5cc-eb442f87cf38',
  }),
});

const _AppConfig = () => ({ ...env } as const);

const CONFIG = _AppConfig();
export const AppConfig = () => CONFIG;
