const config = require('@src/config/env.config');

const DEFAULT_VOICE_LIVE_API_VERSION = '2026-04-10';
const DEFAULT_VOICE_LIVE_WEBRTC_API_VERSION = '2026-01-01-preview';

class AzureEndpointService {
  getCatalog() {
    return {
      foundry: this.getFoundryProjectEndpoint(),
      voiceLive: {
        websocketModel: this.buildVoiceLiveWebSocketUrl({ mode: 'model' }),
        websocketAgent: this.buildVoiceLiveWebSocketUrl({ mode: 'agent' }),
        webRtc: this.buildVoiceLiveWebRtcUrl()
      },
      realtime: {
        clientSecrets: this.buildRealtimeClientSecretsUrl(),
        calls: this.buildRealtimeCallsUrl()
      }
    };
  }

  getFoundryProjectEndpoint() {
    return {
      endpoint: this.trimTrailingSlash(config.azure.foundry.projectEndpoint),
      agentId: config.azure.foundry.agentId,
      agentName: config.azure.foundry.agentName,
      projectName: config.azure.foundry.projectName,
      usedBy: ['AzureFoundryClient', 'FoundryAgentClient', 'FoundryResponsesClient']
    };
  }

  buildVoiceLiveWebSocketUrl({ mode = 'model' } = {}) {
    const base = this.toWssBase(config.azure.voiceLive.endpoint || config.azure.foundry.projectEndpoint);
    if (!base) return null;
    const url = new URL(`${base}/voice-live/realtime`);
    url.searchParams.set('api-version', config.azure.voiceLive.apiVersion || DEFAULT_VOICE_LIVE_API_VERSION);

    if (mode === 'agent') {
      url.searchParams.set('agent_id', config.azure.foundry.agentId || '');
      url.searchParams.set('project_id', config.azure.foundry.projectName || '');
    } else {
      url.searchParams.set('model', config.azure.voiceLive.model || config.ai.defaultRealtimeModel || 'gpt-realtime');
    }

    return this.cleanUrl(url);
  }

  buildVoiceLiveWebRtcUrl() {
    const base = this.toWssBase(config.azure.voiceLive.endpoint || config.azure.foundry.projectEndpoint);
    if (!base) return null;
    const url = new URL(`${base}/voice-live/realtime/calls`);
    url.searchParams.set('api-version', process.env.AZURE_VOICE_LIVE_WEBRTC_API_VERSION || DEFAULT_VOICE_LIVE_WEBRTC_API_VERSION);
    url.searchParams.set('model', config.azure.voiceLive.model || config.ai.defaultRealtimeModel || 'gpt-realtime');
    return this.cleanUrl(url);
  }

  buildRealtimeClientSecretsUrl() {
    const base = this.trimTrailingSlash(config.azure.openAi.endpoint);
    return base ? `${base}/openai/v1/realtime/client_secrets` : null;
  }

  buildRealtimeCallsUrl() {
    const base = this.trimTrailingSlash(config.azure.openAi.endpoint);
    return base ? `${base}/openai/v1/realtime/calls` : null;
  }

  getVoiceLiveEndpointMetadata() {
    return {
      websocketModelUrl: this.buildVoiceLiveWebSocketUrl({ mode: 'model' }),
      websocketAgentUrl: this.buildVoiceLiveWebSocketUrl({ mode: 'agent' }),
      webRtcUrl: this.buildVoiceLiveWebRtcUrl(),
      normalWebSocketPath: '/voice-live/realtime',
      webRtcPath: '/voice-live/realtime/calls',
      apiVersion: config.azure.voiceLive.apiVersion || DEFAULT_VOICE_LIVE_API_VERSION,
      webRtcApiVersion: process.env.AZURE_VOICE_LIVE_WEBRTC_API_VERSION || DEFAULT_VOICE_LIVE_WEBRTC_API_VERSION
    };
  }

  getRealtimeEndpointMetadata() {
    return {
      clientSecretsUrl: this.buildRealtimeClientSecretsUrl(),
      callsUrl: this.buildRealtimeCallsUrl(),
      clientSecretsPath: '/openai/v1/realtime/client_secrets',
      callsPath: '/openai/v1/realtime/calls',
      apiVersion: config.azure.openAi.apiVersion
    };
  }

  toWssBase(endpoint) {
    const base = this.trimTrailingSlash(endpoint);
    if (!base) return '';
    const url = new URL(base);
    url.protocol = 'wss:';
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return this.trimTrailingSlash(url.toString());
  }

  trimTrailingSlash(value) {
    return String(value || '').replace(/\/+$/, '');
  }

  cleanUrl(url) {
    for (const [key, value] of [...url.searchParams.entries()]) {
      if (value === '') url.searchParams.delete(key);
    }
    return url.toString();
  }
}

module.exports = new AzureEndpointService();
module.exports.AzureEndpointService = AzureEndpointService;
