require('../../core/util/register-aliases');

describe('Azure endpoint catalog', () => {
  test('builds Foundry, Voice Live, and Realtime endpoint URLs', () => {
    const service = require('@src/services/AzureEndpointService');
    const catalog = service.getCatalog();

    expect(catalog.foundry.endpoint).toContain('/api/projects/officer-charles');
    expect(catalog.voiceLive.websocketModel).toContain('/voice-live/realtime?');
    expect(catalog.voiceLive.websocketAgent).toContain('agent_id=');
    expect(catalog.voiceLive.webRtc).toContain('/voice-live/realtime/calls?');
    expect(catalog.voiceLive.webRtc).toContain('api-version=2026-01-01-preview');
    expect(catalog.realtime.clientSecrets === null || catalog.realtime.clientSecrets.endsWith('/openai/v1/realtime/client_secrets')).toBe(true);
    expect(catalog.realtime.calls === null || catalog.realtime.calls.endsWith('/openai/v1/realtime/calls')).toBe(true);
  });
});
