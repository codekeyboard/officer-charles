const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function readString(key, fallback = '') {
  const value = process.env[key];
  return value === undefined ? fallback : String(value).trim();
}

function readAny(keys, fallback = '') {
  for (const key of keys) {
    const value = readString(key, '');
    if (value) return value;
  }
  return fallback;
}

function readBool(key, fallback = false) {
  const value = readString(key, '');
  if (!value) return fallback;
  const normalized = value.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function readNumber(key, fallback) {
  const raw = readString(key, '');
  if (raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const rawEnv = {
  NODE_ENV: readString('NODE_ENV', 'development'),
  SERVER_HOST: readString('SERVER_HOST', '127.0.0.1'),
  SERVER_PORT: readString('SERVER_PORT', readString('PORT', '4000')),
  PORT: readString('PORT', ''),
  CORS_ORIGINS: readString('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000,http://localhost:3001,http://localhost:8080,http://localhost:8081'),
  DATABASE_URL: readString('DATABASE_URL', ''),
  DB_DIALECT: readString('DB_DIALECT', 'postgres'),
  DB_HOST: readString('DB_HOST', '127.0.0.1'),
  DB_PORT: readString('DB_PORT', '5432'),
  DB_USER: readString('DB_USER', ''),
  DB_PASS: readString('DB_PASS', ''),
  DB_NAME: readString('DB_NAME', ''),
  DB_LOGGING: readString('DB_LOGGING', 'false'),
  JWT_ACCESS_SECRET: readString('JWT_ACCESS_SECRET', ''),
  JWT_REFRESH_SECRET: readString('JWT_REFRESH_SECRET', ''),
  FRONTEND_URL: readString('FRONTEND_URL', readString('AUTH_SUCCESS_REDIRECT_URL', 'http://localhost:8081')),
  STRIPE_SECRET_KEY: readString('STRIPE_SECRET_KEY', ''),
  STRIPE_PUBLISHABLE_KEY: readString('STRIPE_PUBLISHABLE_KEY', ''),
  STRIPE_WEBHOOK_SECRET: readString('STRIPE_WEBHOOK_SECRET', ''),
  STRIPE_PRICE_STARTER: readString('STRIPE_PRICE_STARTER', ''),
  STRIPE_PRICE_PRO: readString('STRIPE_PRICE_PRO', ''),
  STRIPE_PRICE_PREMIUM: readString('STRIPE_PRICE_PREMIUM', ''),
  PAYSTACK_SECRET_KEY: readString('PAYSTACK_SECRET_KEY', ''),
  PAYSTACK_PUBLIC_KEY: readString('PAYSTACK_PUBLIC_KEY', ''),
  PAYSTACK_CURRENCY: readString('PAYSTACK_CURRENCY', ''),
  PAYSTACK_PRICE_STARTER_CENTS: readString('PAYSTACK_PRICE_STARTER_CENTS', ''),
  PAYSTACK_PRICE_PRO_CENTS: readString('PAYSTACK_PRICE_PRO_CENTS', ''),
  PAYSTACK_PRICE_PREMIUM_CENTS: readString('PAYSTACK_PRICE_PREMIUM_CENTS', ''),
  PAYSTACK_TIMEOUT_MS: readString('PAYSTACK_TIMEOUT_MS', '15000'),
  SMTP_HOST: readString('SMTP_HOST', ''),
  SMTP_PORT: readString('SMTP_PORT', '587'),
  SMTP_SECURE: readString('SMTP_SECURE', 'false'),
  SMTP_USER: readString('SMTP_USER', ''),
  SMTP_PASS: readString('SMTP_PASS', ''),
  SMTP_FROM: readString('SMTP_FROM', ''),
  EMAIL_VERIFICATION_EXPIRES_MINUTES: readString('EMAIL_VERIFICATION_EXPIRES_MINUTES', '10'),
  EMAIL_VERIFICATION_EXPOSE_CODE: readString('EMAIL_VERIFICATION_EXPOSE_CODE', 'false'),
  AZURE_AI_AUTH_TOKEN: readString('AZURE_AI_AUTH_TOKEN', ''),
  AZURE_FOUNDRY_PROJECT_ENDPOINT: readAny(['AZURE_FOUNDRY_PROJECT_ENDPOINT', 'AZURE_EXISTING_AIPROJECT_ENDPOINT'], ''),
  AZURE_FOUNDRY_AGENT_NAME: readString('AZURE_FOUNDRY_AGENT_NAME', ''),
  AZURE_FOUNDRY_AGENT_ID: readAny(['AZURE_FOUNDRY_AGENT_ID', 'AZURE_VOICELIVE_AGENT_ID'], ''),
  AZURE_FOUNDRY_AGENT_VERSION: readString('AZURE_FOUNDRY_AGENT_VERSION', ''),
  AZURE_FOUNDRY_RESOURCE_NAME: readString('AZURE_FOUNDRY_RESOURCE_NAME', ''),
  AZURE_FOUNDRY_PROJECT_NAME: readAny(['AZURE_FOUNDRY_PROJECT_NAME', 'AZURE_VOICELIVE_PROJECT_NAME'], ''),
  AZURE_CHAT_MODEL_DEPLOYMENT: readAny(['AZURE_CHAT_MODEL_DEPLOYMENT', 'AZURE_VOICELIVE_MODEL'], ''),
  AZURE_REALTIME_MODEL_DEPLOYMENT: readString('AZURE_REALTIME_MODEL_DEPLOYMENT', ''),
  AZURE_OPENAI_ENDPOINT: readString('AZURE_OPENAI_ENDPOINT', ''),
  AZURE_OPENAI_API_KEY: readString('AZURE_OPENAI_API_KEY', ''),
  AZURE_OPENAI_API_VERSION: readString('AZURE_OPENAI_API_VERSION', ''),
  AZURE_VOICE_LIVE_ENDPOINT: readAny(['AZURE_VOICE_LIVE_ENDPOINT', 'AZURE_VOICELIVE_ENDPOINT'], ''),
  AZURE_VOICE_LIVE_API_KEY: readAny(['AZURE_VOICE_LIVE_API_KEY', 'AZURE_VOICELIVE_API_KEY'], ''),
  AZURE_VOICE_LIVE_API_VERSION: readAny(['AZURE_VOICE_LIVE_API_VERSION', 'AZURE_VOICELIVE_API_VERSION'], ''),
  AZURE_VOICE_LIVE_MODEL: readAny(['AZURE_VOICE_LIVE_MODEL', 'AZURE_VOICELIVE_MODEL'], ''),
  AZURE_VOICE_LIVE_AVATAR_TYPE: readAny(['AZURE_VOICE_LIVE_AVATAR_TYPE', 'AZURE_VOICELIVE_AVATAR_TYPE'], ''),
  AZURE_VOICE_LIVE_AVATAR_CHARACTER: readAny(['AZURE_VOICE_LIVE_AVATAR_CHARACTER', 'AZURE_VOICELIVE_AVATAR_CHARACTER'], ''),
  AZURE_VOICE_LIVE_AVATAR_STYLE: readAny(['AZURE_VOICE_LIVE_AVATAR_STYLE', 'AZURE_VOICELIVE_AVATAR_STYLE'], ''),
  AZURE_VOICE_LIVE_AVATAR_CUSTOMIZED: readAny(['AZURE_VOICE_LIVE_AVATAR_CUSTOMIZED', 'AZURE_VOICELIVE_AVATAR_CUSTOMIZED'], ''),
  SPEECH_ENDPOINT: readAny(['SPEECH_ENDPOINT', 'AZURE_SPEECH_ENDPOINT', 'AZURE_VOICE_LIVE_ENDPOINT', 'AZURE_VOICELIVE_ENDPOINT'], ''),
  SPEECH_KEY: readAny(['SPEECH_KEY', 'AZURE_SPEECH_KEY', 'AZURE_VOICE_LIVE_API_KEY', 'AZURE_VOICELIVE_API_KEY'], ''),
  SPEECH_AVATAR_API_VERSION: readString('SPEECH_AVATAR_API_VERSION', '2024-08-01'),
  SPEECH_AVATAR_VOICE: readString('SPEECH_AVATAR_VOICE', 'en-US-Andrew:DragonHDLatestNeural'),
  SPEECH_AVATAR_CHARACTER: readString('SPEECH_AVATAR_CHARACTER', 'Malik'),
  SPEECH_AVATAR_STYLE: readString('SPEECH_AVATAR_STYLE', ''),
  SPEECH_AVATAR_CUSTOMIZED: readString('SPEECH_AVATAR_CUSTOMIZED', 'false'),
  SPEECH_AVATAR_VIDEO_FORMAT: readString('SPEECH_AVATAR_VIDEO_FORMAT', 'mp4'),
  SPEECH_AVATAR_VIDEO_CODEC: readString('SPEECH_AVATAR_VIDEO_CODEC', 'h264'),
  AZURE_TENANT_ID: readString('AZURE_TENANT_ID', ''),
  AZURE_CLIENT_ID: readString('AZURE_CLIENT_ID', ''),
  AZURE_CLIENT_SECRET: readString('AZURE_CLIENT_SECRET', ''),
  AI_PROVIDER: readString('AI_PROVIDER', 'azure'),
  ENABLE_VOICE_LIVE: readString('ENABLE_VOICE_LIVE', 'false'),
  ENABLE_REALTIME_WEBRTC: readString('ENABLE_REALTIME_WEBRTC', 'false'),
  ENABLE_AGENT_JSON_MODE: readString('ENABLE_AGENT_JSON_MODE', 'true'),
  DEFAULT_CHAT_MODEL: readString('DEFAULT_CHAT_MODEL', ''),
  DEFAULT_REALTIME_MODEL: readString('DEFAULT_REALTIME_MODEL', ''),
  DEFAULT_VOICE_NAME: readAny(['DEFAULT_VOICE_NAME', 'AZURE_VOICELIVE_VOICE', 'AZURE_VOICE_LIVE_VOICE'], ''),
  FREE_CHAT_INTERVIEW_LIMIT: readString('FREE_CHAT_INTERVIEW_LIMIT', '100'),
  FREE_LIVE_INTERVIEW_LIMIT: readString('FREE_LIVE_INTERVIEW_LIMIT', '25'),
  TRAINING_MAX_RETRIES_PER_QUESTION: readString('TRAINING_MAX_RETRIES_PER_QUESTION', '3'),
  TRAINING_MAX_QUESTIONS: readString('TRAINING_MAX_QUESTIONS', '8'),
  SIMULATION_MAX_QUESTIONS: readString('SIMULATION_MAX_QUESTIONS', '10'),
  FOUNDRY_RESPONSE_TIMEOUT_MS: readString('FOUNDRY_RESPONSE_TIMEOUT_MS', '9000')
};

const hasServicePrincipal =
  Boolean(rawEnv.AZURE_TENANT_ID) && Boolean(rawEnv.AZURE_CLIENT_ID) && Boolean(rawEnv.AZURE_CLIENT_SECRET);

const authMode = hasServicePrincipal
  ? 'servicePrincipal'
  : rawEnv.AZURE_OPENAI_API_KEY
    ? 'apiKey'
    : 'managedIdentity';

const corsOrigins = rawEnv.CORS_ORIGINS
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const config = {
  rawEnv,
  app: {
    nodeEnv: rawEnv.NODE_ENV,
    host: rawEnv.SERVER_HOST,
    port: readNumber('SERVER_PORT', readNumber('PORT', 4000)),
    corsOrigins
  },
  database: {
    url: rawEnv.DATABASE_URL,
    dialect: rawEnv.DB_DIALECT,
    host: rawEnv.DB_HOST,
    port: readNumber('DB_PORT', 5432),
    username: rawEnv.DB_USER,
    password: rawEnv.DB_PASS,
    database: rawEnv.DB_NAME,
    logging: readBool('DB_LOGGING', false)
  },
  jwt: {
    accessSecret: rawEnv.JWT_ACCESS_SECRET,
    refreshSecret: rawEnv.JWT_REFRESH_SECRET
  },
  billing: {
    frontendUrl: rawEnv.FRONTEND_URL,
    stripe: {
      secretKey: rawEnv.STRIPE_SECRET_KEY,
      publishableKey: rawEnv.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: rawEnv.STRIPE_WEBHOOK_SECRET,
      priceStarter: rawEnv.STRIPE_PRICE_STARTER,
      pricePro: rawEnv.STRIPE_PRICE_PRO,
      pricePremium: rawEnv.STRIPE_PRICE_PREMIUM
    },
    paystack: {
      secretKey: rawEnv.PAYSTACK_SECRET_KEY,
      publicKey: rawEnv.PAYSTACK_PUBLIC_KEY,
      currency: rawEnv.PAYSTACK_CURRENCY,
      priceStarterCents: rawEnv.PAYSTACK_PRICE_STARTER_CENTS,
      priceProCents: rawEnv.PAYSTACK_PRICE_PRO_CENTS,
      pricePremiumCents: rawEnv.PAYSTACK_PRICE_PREMIUM_CENTS,
      timeoutMs: readNumber('PAYSTACK_TIMEOUT_MS', 15000)
    }
  },
  mail: {
    smtpHost: rawEnv.SMTP_HOST,
    smtpPort: readNumber('SMTP_PORT', 587),
    smtpSecure: readBool('SMTP_SECURE', false),
    smtpUser: rawEnv.SMTP_USER,
    smtpFrom: rawEnv.SMTP_FROM,
    verificationExpiresMinutes: readNumber('EMAIL_VERIFICATION_EXPIRES_MINUTES', 10)
  },
  ai: {
    provider: rawEnv.AI_PROVIDER,
    authMode,
    enableVoiceLive: readBool('ENABLE_VOICE_LIVE', false),
    enableRealtimeWebRtc: readBool('ENABLE_REALTIME_WEBRTC', false),
    enableAgentJsonMode: readBool('ENABLE_AGENT_JSON_MODE', true),
    defaultChatModel: rawEnv.DEFAULT_CHAT_MODEL,
    defaultRealtimeModel: rawEnv.DEFAULT_REALTIME_MODEL,
    defaultVoiceName: rawEnv.DEFAULT_VOICE_NAME
  },
  azure: {
    foundry: {
      projectEndpoint: rawEnv.AZURE_FOUNDRY_PROJECT_ENDPOINT,
      agentName: rawEnv.AZURE_FOUNDRY_AGENT_NAME,
      agentId: rawEnv.AZURE_FOUNDRY_AGENT_ID,
      agentVersion: rawEnv.AZURE_FOUNDRY_AGENT_VERSION,
      resourceName: rawEnv.AZURE_FOUNDRY_RESOURCE_NAME,
      projectName: rawEnv.AZURE_FOUNDRY_PROJECT_NAME,
      chatModelDeployment: rawEnv.AZURE_CHAT_MODEL_DEPLOYMENT
    },
    openAi: {
      endpoint: rawEnv.AZURE_OPENAI_ENDPOINT,
      apiKey: rawEnv.AZURE_OPENAI_API_KEY,
      apiVersion: rawEnv.AZURE_OPENAI_API_VERSION,
      chatModelDeployment: rawEnv.AZURE_CHAT_MODEL_DEPLOYMENT,
      realtimeModelDeployment: rawEnv.AZURE_REALTIME_MODEL_DEPLOYMENT
    },
    voiceLive: {
      endpoint: rawEnv.AZURE_VOICE_LIVE_ENDPOINT,
      apiKey: rawEnv.AZURE_VOICE_LIVE_API_KEY,
      apiVersion: rawEnv.AZURE_VOICE_LIVE_API_VERSION,
      model: rawEnv.AZURE_VOICE_LIVE_MODEL,
      avatar: {
        type: rawEnv.AZURE_VOICE_LIVE_AVATAR_TYPE || 'video-avatar',
        character: rawEnv.AZURE_VOICE_LIVE_AVATAR_CHARACTER || rawEnv.SPEECH_AVATAR_CHARACTER || 'Malik',
        style: rawEnv.AZURE_VOICE_LIVE_AVATAR_STYLE || rawEnv.SPEECH_AVATAR_STYLE || '',
        customized: rawEnv.AZURE_VOICE_LIVE_AVATAR_CUSTOMIZED
          ? readBool('AZURE_VOICE_LIVE_AVATAR_CUSTOMIZED', false)
          : readBool('SPEECH_AVATAR_CUSTOMIZED', false)
      }
    },
    speech: {
      endpoint: rawEnv.SPEECH_ENDPOINT,
      key: rawEnv.SPEECH_KEY,
      avatarApiVersion: rawEnv.SPEECH_AVATAR_API_VERSION,
      avatarVoice: rawEnv.SPEECH_AVATAR_VOICE,
      avatarCharacter: rawEnv.SPEECH_AVATAR_CHARACTER,
      avatarStyle: rawEnv.SPEECH_AVATAR_STYLE,
      avatarCustomized: readBool('SPEECH_AVATAR_CUSTOMIZED', false),
      avatarVideoFormat: rawEnv.SPEECH_AVATAR_VIDEO_FORMAT,
      avatarVideoCodec: rawEnv.SPEECH_AVATAR_VIDEO_CODEC
    },
    identity: {
      tenantId: rawEnv.AZURE_TENANT_ID,
      clientId: rawEnv.AZURE_CLIENT_ID,
      clientSecret: rawEnv.AZURE_CLIENT_SECRET
    }
  },
  limits: {
    freeChatInterviewLimit: readNumber('FREE_CHAT_INTERVIEW_LIMIT', 100),
    freeLiveInterviewLimit: readNumber('FREE_LIVE_INTERVIEW_LIMIT', 25),
    trainingMaxRetriesPerQuestion: readNumber('TRAINING_MAX_RETRIES_PER_QUESTION', 3),
    trainingMaxQuestions: readNumber('TRAINING_MAX_QUESTIONS', 8),
    simulationMaxQuestions: readNumber('SIMULATION_MAX_QUESTIONS', 10)
  }
};

function validateRequiredEnv() {
  const requiredKeys = [
    'NODE_ENV',
    'AZURE_FOUNDRY_PROJECT_ENDPOINT',
    'AZURE_FOUNDRY_AGENT_NAME',
    'AZURE_FOUNDRY_AGENT_ID',
    'AI_PROVIDER'
  ];

  if (config.ai.enableRealtimeWebRtc) {
    requiredKeys.push(
      'AZURE_OPENAI_ENDPOINT',
      'AZURE_OPENAI_API_VERSION',
      'AZURE_REALTIME_MODEL_DEPLOYMENT',
      'DEFAULT_REALTIME_MODEL'
    );
  }

  if (config.ai.enableVoiceLive) {
    requiredKeys.push(
      'AZURE_VOICE_LIVE_ENDPOINT',
      'AZURE_VOICE_LIVE_API_VERSION',
      'AZURE_VOICE_LIVE_MODEL',
      'DEFAULT_VOICE_NAME'
    );
  }

  const missingKeys = requiredKeys.filter((key) => !rawEnv[key]);

  if (config.ai.enableRealtimeWebRtc && !rawEnv.AZURE_OPENAI_API_KEY && !hasServicePrincipal) {
    missingKeys.push('AZURE_OPENAI_API_KEY or AZURE_TENANT_ID/AZURE_CLIENT_ID/AZURE_CLIENT_SECRET');
  }

  if (config.ai.enableVoiceLive && !rawEnv.AZURE_VOICE_LIVE_API_KEY && !hasServicePrincipal) {
    missingKeys.push('AZURE_VOICE_LIVE_API_KEY or AZURE_TENANT_ID/AZURE_CLIENT_ID/AZURE_CLIENT_SECRET');
  }

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment configuration: ${missingKeys.join(', ')}`);
  }
}

validateRequiredEnv();

module.exports = config;
module.exports.config = config;
module.exports.default = config;
