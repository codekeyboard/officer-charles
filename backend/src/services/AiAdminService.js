const config = require('@src/config/env.config');
const { AzureKeyCredential } = require('@azure/core-auth');
const { DefaultAzureCredential } = require('@azure/identity');
const { VoiceLiveClient: AzureVoiceLiveClient } = require('@azure/ai-voicelive');
const AppErrorModule = require('@src/utils/classes/AppError');
const FoundryResponsesClientModule = require('@src/utils/classes/FoundryResponsesClient');
const VoiceLiveClientModule = require('@src/utils/classes/VoiceLiveClient');
const RealtimeWebRTCSessionModule = require('@src/utils/classes/RealtimeWebRTCSession');
const azureEndpointService = require('@src/services/AzureEndpointService');
const avatarSynthesisService = require('@src/services/AvatarSynthesisService');

const FoundryResponsesClient = FoundryResponsesClientModule.default || FoundryResponsesClientModule.FoundryResponsesClient;
const VoiceLiveClient = VoiceLiveClientModule.default || VoiceLiveClientModule.VoiceLiveClient;
const RealtimeWebRTCSession = RealtimeWebRTCSessionModule.default || RealtimeWebRTCSessionModule.RealtimeWebRTCSession;
const AppError = AppErrorModule.default || AppErrorModule.AppError;

class AiAdminService {
  async testChat(message = 'Ask me one F1 visa question.') {
    if (process.env.NODE_ENV === 'test' && !process.env.AZURE_AI_AUTH_TOKEN) {
      throw new AppError({
        statusCode: 504,
        publicMessage: 'AI response timed out.',
        internalMessage: 'AI admin test skipped external Foundry call in test mode.',
        errorCode: 'AI_PROVIDER_ERROR'
      });
    }
    const client = new FoundryResponsesClient();
    const response = await client.createJsonResponse(message, { metadata: { interviewId: `admin_test_${Date.now()}` } });
    return {
      provider: response.provider,
      model: response.model,
      outputText: response.outputText,
      usage: response.usage,
      raw: response.raw
    };
  }

  async testFoundryAgent(message = 'Ask one visa interview question.') {
    return this.testChat(message);
  }

  getVoiceLiveTestConfig() {
    const client = new VoiceLiveClient();
    const sessionConfig = client.createSessionConfig({ id: 'admin-test', name: 'Admin Test' }, {
      visaType: 'F1',
      mode: 'SIMULATION'
    });
    return {
      configured: Boolean(config.azure.voiceLive.endpoint && config.azure.voiceLive.model),
      endpointHost: config.azure.voiceLive.endpoint ? new URL(config.azure.voiceLive.endpoint).host : null,
      apiVersion: config.azure.voiceLive.apiVersion,
      model: config.azure.voiceLive.model,
      endpoints: azureEndpointService.getVoiceLiveEndpointMetadata(),
      sessionConfig
    };
  }

  async testVoiceLiveConnection() {
    if (!config.azure.voiceLive.endpoint) {
      throw new AppError({
        statusCode: 500,
        publicMessage: 'Live voice endpoint is not configured.',
        internalMessage: 'Missing AZURE_VOICE_LIVE_ENDPOINT or AZURE_VOICELIVE_ENDPOINT.',
        errorCode: 'AI_CONFIG_ERROR'
      });
    }
    const model = config.azure.voiceLive.model || 'gpt-realtime';
    const credential = config.azure.voiceLive.apiKey
      ? new AzureKeyCredential(config.azure.voiceLive.apiKey)
      : new DefaultAzureCredential();
    const client = new AzureVoiceLiveClient(config.azure.voiceLive.endpoint, credential, {
      apiVersion: config.azure.voiceLive.apiVersion || '2025-10-01'
    });
    const session = client.createSession({ model }, {
      apiVersion: config.azure.voiceLive.apiVersion || '2025-10-01',
      connectionTimeoutInMs: 20000
    });

    try {
      await session.connect({ timeoutInMs: 20000 });
      const sessionConfig = new VoiceLiveClient().createSessionConfig({ id: 'admin-test', name: 'Admin Test' }, {
        visaType: 'F1',
        mode: 'SIMULATION',
        instructions: 'Connectivity test only. Do not start a long conversation.',
        model
      });
      await session.updateSession(sessionConfig, { timeoutInMs: 10000 });
      return {
        connected: true,
        endpointHost: new URL(config.azure.voiceLive.endpoint).host,
        apiVersion: config.azure.voiceLive.apiVersion || '2025-10-01',
        model,
        authMode: config.azure.voiceLive.apiKey ? 'apiKey' : 'defaultAzureCredential'
      };
    } catch (error) {
      throw new AppError({
        statusCode: 502,
        publicMessage: 'Live voice connection test failed.',
        internalMessage: sanitizeAzureError(error),
        errorCode: 'VOICE_LIVE_TEST_FAILED'
      });
    } finally {
      await session.disconnect().catch(() => {});
      await session.dispose().catch(() => {});
    }
  }

  getRealtimeTestConfig() {
    const realtime = new RealtimeWebRTCSession();
    const sessionConfig = realtime.buildSessionConfig({ id: 'admin-test', name: 'Admin Test' }, {
      visaType: 'F1',
      mode: 'SIMULATION',
      instructions: 'Conduct a live visa interview.'
    });
    return {
      configured: Boolean(config.azure.openAi.endpoint && config.azure.openAi.realtimeModelDeployment),
      endpoint: config.azure.openAi.endpoint,
      realtimeDeployment: config.azure.openAi.realtimeModelDeployment,
      endpoints: azureEndpointService.getRealtimeEndpointMetadata(),
      callsPath: azureEndpointService.buildRealtimeCallsUrl(),
      clientSecretsPath: azureEndpointService.buildRealtimeClientSecretsUrl(),
      sessionConfig
    };
  }

  getEndpointCatalog() {
    return azureEndpointService.getCatalog();
  }

  getAvatarConfig() {
    return avatarSynthesisService.getConfig();
  }

  async testAvatarConnection() {
    return avatarSynthesisService.testConnection();
  }

  async submitAvatarBatch(input = {}) {
    return avatarSynthesisService.submitBatch({ text: input.text });
  }

  async getAvatarBatch(jobId) {
    return avatarSynthesisService.getBatch(jobId);
  }
}

function sanitizeAzureError(error) {
  return String(error?.message || error || 'Live voice test failed.')
    .replace(/Azure/gi, 'AI service')
    .replace(/Foundry/gi, 'AI service')
    .replace(/Voice Live/gi, 'live voice')
    .replace(/api-key=[^&\s]+/gi, 'api-key=[REDACTED]')
    .replace(/client_secret=[^&\s]+/gi, 'client_secret=[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/g, 'Bearer [REDACTED]');
}

module.exports = new AiAdminService();
module.exports.AiAdminService = AiAdminService;
