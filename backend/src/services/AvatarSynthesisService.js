const crypto = require('crypto');
const config = require('@src/config/env.config');
const AppErrorModule = require('@src/utils/classes/AppError');

const AppError = AppErrorModule.default || AppErrorModule.AppError;
const ERROR_CODES = AppErrorModule.ERROR_CODES;

class AvatarSynthesisService {
  getConfig() {
    return {
      configured: Boolean(config.azure.speech.endpoint && config.azure.speech.key),
      endpointHost: config.azure.speech.endpoint ? new URL(config.azure.speech.endpoint).host : null,
      apiVersion: config.azure.speech.avatarApiVersion,
      voice: config.azure.speech.avatarVoice,
      character: config.azure.speech.avatarCharacter,
      style: config.azure.speech.avatarStyle,
      customized: config.azure.speech.avatarCustomized,
      videoFormat: config.azure.speech.avatarVideoFormat,
      videoCodec: config.azure.speech.avatarVideoCodec
    };
  }

  async testConnection() {
    this.ensureConfigured();
    const data = await this.requestJson('/avatar/batchsyntheses', {
      method: 'GET',
      searchParams: { skip: '0', maxpagesize: '1' }
    });

    return {
      connected: true,
      endpointHost: new URL(config.azure.speech.endpoint).host,
      apiVersion: config.azure.speech.avatarApiVersion,
      jobCount: Array.isArray(data.values) ? data.values.length : 0
    };
  }

  async submitBatch({ text = 'Hi, I am Officer Charles. Let us begin your visa interview practice.' } = {}) {
    this.ensureConfigured();
    const content = String(text || '').trim();
    if (!content) throw this.error(400, 'Avatar text is required.', 'AVATAR_TEXT_REQUIRED');
    if (content.length > 3000) throw this.error(400, 'Avatar text must be 3000 characters or fewer.', 'AVATAR_TEXT_TOO_LONG');

    const jobId = crypto.randomUUID();
    const data = await this.requestJson(`/avatar/batchsyntheses/${jobId}`, {
      method: 'PUT',
      body: this.buildPayload(content)
    });

    return this.normalizeJob(data, jobId);
  }

  async getBatch(jobId) {
    this.ensureConfigured();
    const normalizedJobId = String(jobId || '').trim();
    if (!normalizedJobId) throw this.error(400, 'Avatar job ID is required.', 'AVATAR_JOB_ID_REQUIRED');
    const data = await this.requestJson(`/avatar/batchsyntheses/${encodeURIComponent(normalizedJobId)}`, {
      method: 'GET'
    });
    return this.normalizeJob(data, normalizedJobId);
  }

  buildPayload(content) {
    return {
      synthesisConfig: {
        voice: config.azure.speech.avatarVoice || 'en-US-Andrew:DragonHDLatestNeural'
      },
      customVoices: {},
      inputKind: 'PlainText',
      inputs: [{ content }],
      avatarConfig: {
        talkingAvatarCharacter: config.azure.speech.avatarCharacter || 'Malik',
        talkingAvatarStyle: config.azure.speech.avatarStyle || '',
        photoAvatarBaseModel: '',
        customized: Boolean(config.azure.speech.avatarCustomized),
        videoFormat: config.azure.speech.avatarVideoFormat || 'mp4',
        videoCodec: config.azure.speech.avatarVideoCodec || 'h264',
        subtitleType: 'soft_embedded',
        backgroundColor: '#FFFFFFFF',
        useBuiltInVoice: false
      }
    };
  }

  normalizeJob(data, fallbackId) {
    return {
      id: data.id || fallbackId,
      status: data.status || 'Unknown',
      createdAt: data.createdDateTime || data.createdAt || null,
      lastActionAt: data.lastActionDateTime || data.lastActionAt || null,
      resultUrl: data.outputs?.result || null,
      error: data.error ? sanitizeAzureError(data.error) : null
    };
  }

  async requestJson(path, { method, body, searchParams = {} }) {
    const url = new URL(`${this.endpointBase()}${path}`);
    url.searchParams.set('api-version', config.azure.speech.avatarApiVersion || '2024-08-01');
    Object.entries(searchParams).forEach(([key, value]) => url.searchParams.set(key, value));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': config.azure.speech.key
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      const text = await response.text();
      const data = text ? safeJson(text) : {};
      if (!response.ok) {
        throw this.error(502, 'Avatar request failed.', sanitizeAzureError(data || text));
      }
      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = error.name === 'AbortError' ? 'Avatar request timed out.' : 'Avatar request failed.';
      throw this.error(502, message, sanitizeAzureError(error));
    } finally {
      clearTimeout(timeout);
    }
  }

  endpointBase() {
    return String(config.azure.speech.endpoint || '').replace(/\/+$/, '');
  }

  ensureConfigured() {
    if (!config.azure.speech.endpoint || !config.azure.speech.key) {
      throw this.error(500, 'Speech avatar endpoint or key is not configured.', 'SPEECH_AVATAR_CONFIG_MISSING');
    }
  }

  error(statusCode, publicMessage, internalMessage = publicMessage) {
    return new AppError({
      statusCode,
      publicMessage,
      internalMessage,
      errorCode: ERROR_CODES.AI_PROVIDER_ERROR
    });
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function sanitizeAzureError(error) {
  return String(error?.message || error?.error?.message || JSON.stringify(error) || 'Avatar error.')
    .replace(/Azure/gi, 'AI service')
    .replace(/Foundry/gi, 'AI service')
    .replace(/Voice Live/gi, 'live voice')
    .replace(/Ocp-Apim-Subscription-Key["':=\s]+[^"',\s]+/gi, 'Ocp-Apim-Subscription-Key=[REDACTED]')
    .replace(/api-key=[^&\s]+/gi, 'api-key=[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/g, 'Bearer [REDACTED]');
}

module.exports = new AvatarSynthesisService();
module.exports.AvatarSynthesisService = AvatarSynthesisService;
