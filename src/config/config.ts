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
      'https://capture.us-west-1.nest.messagebird.com/webhooks/ba25eea4-c3ef-495b-9422-8e2fd2222b3b/0a8769d0-7304-4c4b-88c2-5457fa848a54',
  }),
  MESSAGE_BIRD_API_KEY: str({ default: undefined }),
  MB_WORKSPACE_ID: str({ default: 'ba25eea4-c3ef-495b-9422-8e2fd2222b3b' }),
  MB_CHANNEL_ID: str({ default: '40a20f4b-a4c7-40f8-a5f0-d07d454fb8f3' }),
  MB_REMINDER_PROJECT_ID: str({
    default: '9555d5b9-d4f7-4767-a5cc-eb442f87cf38',
  }),

  GOOGLE_CLIENT_ID: str({ default: undefined }),
  GOOGLE_CLIENT_SECRET: str({ default: undefined }),
  GOOGLE_AUTH_CALLBACK: str({ default: 'auth/google/callback' }),
  GOOGLE_OAUTH_SCOPES: str({
    default:
      'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email',
  }),
  GOOGLE_USERINFO_URL: str({
    default: 'https://www.googleapis.com/oauth2/v3/userinfo',
  }),
});

const _AppConfig = () => ({ ...env } as const);

const CONFIG = _AppConfig();
export const AppConfig = () => CONFIG;
