const { URL } = require('node:url');
const { WebSocket, WebSocketServer } = require('ws');
const { AzureKeyCredential } = require('@azure/core-auth');
const { DefaultAzureCredential } = require('@azure/identity');
const { VoiceLiveClient: AzureVoiceLiveClient } = require('@azure/ai-voicelive');
const config = require('@src/config/env.config');
const { ACCESS_COOKIE, verifyAccessToken } = require('@src/services/AuthTokenService');
const { createInterviewRepository } = require('@src/services/InterviewRepository');
const VoiceLiveClientModule = require('@src/utils/classes/VoiceLiveClient');

const VoiceLiveClient = VoiceLiveClientModule.default || VoiceLiveClientModule.VoiceLiveClient;
const DEVELOPMENT_USER_ID = process.env.DEV_USER_ID || '99999999-9999-4999-8999-999999999999';

class VoiceLiveRelayService {
  constructor({ repository = createInterviewRepository(), voiceClient = new VoiceLiveClient() } = {}) {
    this.repository = repository;
    this.voiceClient = voiceClient;
    this.wss = new WebSocketServer({ noServer: true });
  }

  attach(server) {
    server.on('upgrade', async (request, socket, head) => {
      const match = this.matchRelayRequest(request);
      if (!match) return;

      try {
        const user = this.authenticate(request);
        const session = await this.requireSession(user, match.sessionId);
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.handleConnection(ws, { user, session }).catch((error) => {
            this.sendJson(ws, { type: 'error', message: this.publicError(error), code: error.code || 'VOICE_LIVE_RELAY_ERROR' });
            ws.close(1011, 'Live voice connection failed');
          });
        });
      } catch (error) {
        socket.write([
          'HTTP/1.1 401 Unauthorized',
          'Connection: close',
          'Content-Type: text/plain',
          '',
          this.publicError(error)
        ].join('\r\n'));
        socket.destroy();
      }
    });
  }

  matchRelayRequest(request) {
    const url = new URL(request.url || '/', 'http://localhost');
    const match = url.pathname.match(/^\/api\/v1\/live-interviews\/([^/]+)\/relay$/);
    return match ? { sessionId: decodeURIComponent(match[1]) } : null;
  }

  authenticate(request) {
    const url = new URL(request.url || '/', 'http://localhost');
    const header = request.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const token = bearer || url.searchParams.get('access_token') || this.parseCookies(request.headers.cookie || '')[ACCESS_COOKIE];

    if (token) {
      const payload = verifyAccessToken(token);
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role || 'user'
      };
    }

    if (process.env.NODE_ENV !== 'production') {
      return {
        id: DEVELOPMENT_USER_ID,
        name: 'Development User',
        role: 'development'
      };
    }

    const error = new Error('Authentication is required.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  parseCookies(header) {
    return String(header || '').split(';').reduce((cookies, pair) => {
      const index = pair.indexOf('=');
      if (index === -1) return cookies;
      const key = decodeURIComponent(pair.slice(0, index).trim());
      cookies[key] = decodeURIComponent(pair.slice(index + 1).trim());
      return cookies;
    }, {});
  }

  async requireSession(user, sessionId) {
    const session = await this.repository.findLiveSession(sessionId);
    if (!session) {
      const error = new Error('Live interview session not found.');
      error.code = 'LIVE_SESSION_NOT_FOUND';
      throw error;
    }
    if (session.userId !== user.id && !['admin', 'development'].includes(user.role)) {
      const error = new Error('You do not have access to this live session.');
      error.code = 'LIVE_SESSION_FORBIDDEN';
      throw error;
    }
    if (session.provider !== 'VOICE_LIVE') {
      const error = new Error('This session is not a live voice session.');
      error.code = 'INVALID_LIVE_PROVIDER';
      throw error;
    }
    return session;
  }

  async handleConnection(ws, { user, session }) {
    let azureSession = null;
    let subscription = null;
    let assistantTranscript = '';
    let audioSendErrorReported = false;
    let avatarAnswerWaiter = null;
    let avatarConnectState = 'idle';
    let greetingSent = false;
    const avatarRequested = Boolean(session.enableAvatar);

    const sendGreetingOnce = async () => {
      if (greetingSent || !azureSession?.isConnected) return;
      greetingSent = true;
      await this.sendGreeting(azureSession, session);
    };

    const cleanup = async () => {
      await this.closeIncompleteSession(session).catch(() => {});
      if (subscription) await subscription.close().catch(() => {});
      if (azureSession) {
        await azureSession.disconnect().catch(() => {});
        await azureSession.dispose().catch(() => {});
      }
    };

    ws.on('close', () => {
      cleanup().catch(() => {});
    });

    ws.on('error', () => {
      cleanup().catch(() => {});
    });

    const endpoint = config.azure.voiceLive.endpoint;
    const model = session.sessionConfig?.model || config.azure.voiceLive.model || 'gpt-realtime';
    if (!endpoint) {
      const error = new Error('Live voice endpoint is not configured.');
      error.code = 'VOICE_LIVE_ENDPOINT_MISSING';
      throw error;
    }

    const client = new AzureVoiceLiveClient(endpoint, this.createCredential(), {
      apiVersion: config.azure.voiceLive.apiVersion || '2025-10-01'
    });

    azureSession = client.createSession({ model }, {
      apiVersion: config.azure.voiceLive.apiVersion || '2025-10-01',
      connectionTimeoutInMs: 20000
    });

    subscription = azureSession.subscribe({
      onConnected: async () => this.sendJson(ws, { type: 'status', status: 'connected' }),
      onDisconnected: async (event) => this.sendJson(ws, { type: 'status', status: 'disconnected', code: event.code, reason: event.reason }),
      onError: async (event) => this.sendJson(ws, { type: 'error', message: this.publicError(event.error), code: 'VOICE_LIVE_CONNECTION_ERROR' }),
      onServerError: async (event) => this.sendJson(ws, { type: 'error', message: sanitizePublicProviderText(event.error?.message || 'Live voice server error.'), code: event.error?.code || 'VOICE_LIVE_SERVER_ERROR' }),
      onSessionUpdated: async (event) => {
        this.sendJson(ws, { type: 'status', status: 'ready' });
        const iceServers = this.extractAvatarIceServers(event);
        if (iceServers) {
          this.sendJson(ws, { type: 'avatar.ice_servers', iceServers });
        }
      },
      onSessionAvatarConnecting: async (event) => {
        const sdp = this.decodeSdp(event?.serverSdp || event?.server_sdp);
        if (sdp) {
          this.sendJson(ws, { type: 'avatar.answer', sdp });
          if (avatarAnswerWaiter) {
            avatarAnswerWaiter.resolve(sdp);
            avatarAnswerWaiter = null;
          }
        } else {
          const error = new Error('Avatar video connection could not be created.');
          if (avatarAnswerWaiter) {
            avatarAnswerWaiter.reject(error);
            avatarAnswerWaiter = null;
          }
          this.sendJson(ws, { type: 'error', message: this.publicError(error), code: 'VOICE_LIVE_AVATAR_SDP_MISSING' });
        }
      },
      onInputAudioBufferSpeechStarted: async () => this.sendJson(ws, { type: 'speech', speaking: 'user' }),
      onInputAudioBufferSpeechStopped: async () => this.sendJson(ws, { type: 'speech', speaking: 'processing' }),
      onConversationItemInputAudioTranscriptionCompleted: async (event) => {
        if (event.transcript) {
          this.sendJson(ws, { type: 'transcript', speaker: 'user', text: event.transcript, isFinal: true });
        }
      },
      onConversationItemInputAudioTranscriptionDelta: async (event) => {
        if (event.delta) this.sendJson(ws, { type: 'transcript', speaker: 'user', text: event.delta, isFinal: false });
      },
      onResponseAudioDelta: async (event) => {
        const delta = audioDeltaToBase64(event.delta);
        if (delta) this.sendJson(ws, { type: 'audio', delta, encoding: 'base64', format: 'pcm16', sampleRate: 24000 });
      },
      onResponseAudioTranscriptDelta: async (event) => {
        if (!event.delta) return;
        assistantTranscript += event.delta;
        this.sendJson(ws, { type: 'transcript', speaker: 'assistant', text: assistantTranscript, delta: event.delta, isFinal: false });
      },
      onResponseAudioTranscriptDone: async (event) => {
        const text = event.transcript || assistantTranscript;
        assistantTranscript = '';
        if (text) this.sendJson(ws, { type: 'transcript', speaker: 'assistant', text, isFinal: true });
      },
      onResponseTextDelta: async (event) => {
        if (event.delta) this.sendJson(ws, { type: 'text', delta: event.delta });
      },
      onResponseDone: async () => this.sendJson(ws, { type: 'speech', speaking: 'idle' }),
      onResponseAudioDone: async () => this.sendJson(ws, { type: 'speech', speaking: 'idle' })
    });

    ws.on('message', async (message, isBinary) => {
      if (!azureSession?.isConnected) return;
      let event = null;
      try {
        if (isBinary) {
          void azureSession.sendAudio(new Uint8Array(message)).catch((error) => {
            if (audioSendErrorReported) return;
            audioSendErrorReported = true;
            this.sendJson(ws, { type: 'error', message: this.publicError(error), code: 'VOICE_LIVE_AUDIO_SEND_ERROR' });
          });
          return;
        }
        event = JSON.parse(message.toString('utf8'));
        if (event.type === 'response.create') {
          await azureSession.sendEvent({ type: 'response.create' });
        } else if (event.type === 'avatar.connect') {
          if (avatarConnectState !== 'idle') {
            this.sendJson(ws, {
              type: 'status',
              status: avatarConnectState === 'connected' ? 'avatar-connected' : 'connecting-avatar'
            });
            return;
          }
          avatarConnectState = 'connecting';
          await this.connectAvatar(azureSession, event.sdp, ws, (waiter) => {
            avatarAnswerWaiter = waiter;
          });
          avatarConnectState = 'connected';
        } else if (event.type === 'avatar.ready') {
          await sendGreetingOnce();
        } else if (event.type === 'avatar.unavailable') {
          await sendGreetingOnce();
        }
      } catch (error) {
        if (event?.type === 'avatar.connect') avatarConnectState = 'failed';
        this.sendJson(ws, { type: 'error', message: this.publicError(error), code: 'VOICE_LIVE_SEND_ERROR' });
      }
    });

    await this.repository.updateLiveSession(session.id, { connectionStatus: 'connecting' }).catch(() => {});
    this.sendJson(ws, { type: 'status', status: 'connecting', model, endpointHost: new URL(endpoint).host });
    await azureSession.connect({ timeoutInMs: 20000 });
    await azureSession.updateSession(this.normalizeSessionConfig(session.sessionConfig, user, session), { timeoutInMs: 10000 });
    await this.repository.updateLiveSession(session.id, { connectionStatus: 'connected' }).catch(() => {});
    if (!avatarRequested) await sendGreetingOnce();
  }

  createCredential() {
    const apiKey = config.azure.voiceLive.apiKey;
    if (apiKey) return new AzureKeyCredential(apiKey);
    return new DefaultAzureCredential();
  }

  normalizeSessionConfig(sessionConfig = {}, user, session) {
    return this.voiceClient.createSessionConfig(user, {
      ...sessionConfig,
      interviewId: session.interviewId,
      model: sessionConfig.model || config.azure.voiceLive.model || 'gpt-realtime',
      voice: sessionConfig.voice,
      avatar: this.resolveAvatarConfig(sessionConfig, session),
      instructions: sessionConfig.instructions || 'Conduct a live visa interview. Ask one varied topical question at a time, complete about 10 to 12 applicant-answer questions before ending, and let the Foundry agent decide when the interview is complete.'
    });
  }

  resolveAvatarConfig(sessionConfig = {}, session) {
    if (!session.enableAvatar && !sessionConfig.avatar) return { enabled: false };
    const avatarType = sessionConfig.avatar?.type || config.azure.voiceLive.avatar?.type;
    const isPhotoAvatar = avatarType === 'photo-avatar';
    return {
      ...(sessionConfig.avatar || {}),
      enabled: true,
      outputProtocol: 'webrtc',
      type: isPhotoAvatar ? 'photo-avatar' : undefined,
      model: isPhotoAvatar ? 'vasa-1' : undefined,
      character: config.azure.voiceLive.avatar?.character || 'Max',
      style: isPhotoAvatar ? undefined : config.azure.voiceLive.avatar?.style || 'business',
      customized: undefined,
      video: {
        codec: 'h264',
        resolution: {
          width: 1920,
          height: 1080
        },
        crop: {
          topLeft: [560, 0],
          bottomRight: [1360, 1080]
        },
        bitrate: 1000000
      }
    };
  }

  async connectAvatar(azureSession, sdp, ws, setWaiter) {
    if (!sdp?.type || !sdp?.sdp) {
      const error = new Error('Avatar SDP offer is invalid.');
      error.code = 'VOICE_LIVE_AVATAR_SDP_INVALID';
      throw error;
    }

    const waiter = this.createAvatarAnswerWaiter();
    setWaiter(waiter);
    this.sendJson(ws, { type: 'status', status: 'connecting-avatar' });
    try {
      await azureSession.sendEvent({
        type: 'session.avatar.connect',
        clientSdp: Buffer.from(JSON.stringify(sdp), 'utf8').toString('base64')
      });
      await waiter.promise;
      this.sendJson(ws, { type: 'status', status: 'avatar-connected' });
    } catch (error) {
      this.sendJson(ws, { type: 'error', message: this.publicError(error), code: 'VOICE_LIVE_AVATAR_CONNECT_FAILED' });
      throw error;
    } finally {
      setWaiter(null);
    }
  }

  createAvatarAnswerWaiter() {
    let timeoutId;
    let resolve;
    let reject;
    const promise = new Promise((promiseResolve, promiseReject) => {
      resolve = (value) => {
        clearTimeout(timeoutId);
        promiseResolve(value);
      };
      reject = (error) => {
        clearTimeout(timeoutId);
        promiseReject(error);
      };
      timeoutId = setTimeout(() => reject(new Error('Avatar connection timed out.')), 30000);
    });
    return { promise, resolve, reject };
  }

  extractAvatarIceServers(event) {
    const avatar = event?.session?.avatar || event?.avatar;
    const iceServers = avatar?.iceServers || avatar?.ice_servers;
    return Array.isArray(iceServers) && iceServers.length ? iceServers : null;
  }

  decodeSdp(value) {
    if (!value) return null;
    try {
      const decoded = Buffer.from(String(value), 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (parsed?.type && parsed?.sdp) return parsed;
    } catch {
      // Some SDK versions may surface the SDP object directly or as raw JSON.
    }
    if (value?.type && value?.sdp) return value;
    try {
      const parsed = JSON.parse(String(value));
      if (parsed?.type && parsed?.sdp) return parsed;
    } catch {
      return null;
    }
    return null;
  }

  async closeIncompleteSession(session) {
    const latest = await this.repository.findLiveSession(session.id).catch(() => null);
    const current = latest || session;
    if (current.status === 'completed' || current.endedAt) return;

    const endedAt = new Date();
    await this.repository.updateLiveSession(session.id, {
      status: 'ended',
      connectionStatus: 'closed',
      endedAt
    });
    await this.repository.updateInterview(session.interviewId, {
      status: 'ABANDONED',
      endedAt
    });
  }

  async sendGreeting(azureSession, session = {}) {
    await azureSession.addConversationItem({
      type: 'message',
      role: 'system',
      content: [
        {
          type: 'input_text',
          text: `Welcome the applicant and ask a varied first visa interview question. Use session ${session.interviewId || session.id || 'live-session'} as the variation seed. Continue toward 10 to 12 applicant-answer questions before completing.`
        }
      ]
    }).catch(() => {});
    await azureSession.sendEvent({ type: 'response.create' }).catch(() => {});
  }

  sendJson(ws, payload) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  publicError(error) {
    return sanitizePublicProviderText(error?.publicMessage || error?.message || error || 'Live voice connection error.')
      .replace(/api-key=[^&\s]+/gi, 'api-key=[REDACTED]')
      .replace(/client_secret=[^&\s]+/gi, 'client_secret=[REDACTED]')
      .replace(/Bearer\s+[A-Za-z0-9._~-]+/g, 'Bearer [REDACTED]');
  }
}

function sanitizePublicProviderText(value) {
  return String(value || '')
    .replace(/Azure/gi, 'AI service')
    .replace(/Foundry/gi, 'AI service')
    .replace(/Voice Live/gi, 'live voice');
}

function audioDeltaToBase64(delta) {
  if (!delta) return '';
  if (typeof delta === 'string') return delta;
  if (Buffer.isBuffer(delta)) return delta.toString('base64');
  if (delta instanceof Uint8Array) {
    return Buffer.from(delta.buffer, delta.byteOffset, delta.byteLength).toString('base64');
  }
  if (delta instanceof ArrayBuffer) {
    return Buffer.from(delta).toString('base64');
  }
  if (Array.isArray(delta)) {
    return Buffer.from(delta).toString('base64');
  }
  if (Array.isArray(delta.data)) {
    return Buffer.from(delta.data).toString('base64');
  }
  return '';
}

module.exports = new VoiceLiveRelayService();
module.exports.VoiceLiveRelayService = VoiceLiveRelayService;
