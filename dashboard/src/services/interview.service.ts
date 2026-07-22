import api, { unwrap } from "./api";
import type { InterviewMessage, InterviewSummary, Paginated } from "./types";

export interface ChatStartResponse {
  interviewId: string;
  interviewType: "CHAT";
  visaType: string;
  mode: string;
  message: string;
  currentQuestion: string;
}

export interface ChatMessageResponse {
  interviewId?: string;
  assistantMessage: string;
  answerAccepted?: boolean;
  score?: number;
  feedback?: unknown;
  shouldRepeatQuestion?: boolean;
  nextQuestion?: string;
  scoreVisible?: boolean;
  status?: "ACTIVE" | "COMPLETED" | string;
  nextAction?: "ASK_NEXT_QUESTION" | "REPEAT_QUESTION" | "COMPLETE_INTERVIEW" | string;
  finalEvaluation?: unknown;
}

export interface EvaluationResponse {
  finalScore: number;
  result?: string;
  status?: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  finalFeedback?: string;
  finalEvaluation?: FinalEvaluation | null;
}

export interface FinalEvaluation {
  rubricVersion?: string;
  scoringAuthority?: string;
  totalScore?: number;
  label?: string;
  categoryScores?: Record<string, {
    label?: string;
    score?: number;
    max?: number;
    evidence?: string[];
  }>;
  questionReviews?: Array<{
    question?: string;
    answerSummary?: string;
    score?: number;
    evidence?: string[];
    strengths?: string[];
    weaknesses?: string[];
    recommendation?: string;
  }>;
  ruleHits?: string[];
  redFlags?: string[];
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  disclaimer?: string;
  message?: string;
}

export const interviewService = {
  startChatInterview: (data: { visaType: string; mode: string }) =>
    api.post("/interviews/chat/start", data).then(unwrap<ChatStartResponse>),
  sendChatMessage: (interviewId: string, message: string) =>
    api.post(`/interviews/chat/${interviewId}/message`, { message }).then(unwrap<ChatMessageResponse>),
  completeChatInterview: (interviewId: string) =>
    api.post(`/interviews/chat/${interviewId}/complete`).then(unwrap<EvaluationResponse>),
  getInterview: (interviewId: string) => api.get(`/interviews/${interviewId}`).then(unwrap<InterviewSummary>),
  getInterviewMessages: (interviewId: string) =>
    api.get(`/interviews/${interviewId}/messages`).then(unwrap<{ messages: InterviewMessage[] }>),
  getEvaluation: (interviewId: string) =>
    api.get(`/interviews/${interviewId}/evaluation`).then(unwrap<EvaluationResponse>),
  listInterviews: (params?: Record<string, unknown>) =>
    api.get("/interviews", { params }).then(unwrap<Paginated<InterviewSummary>>),
};

export const liveInterviewService = {
  startLiveInterview: (data: { visaType: string; mode: string; provider?: string; enableAvatar?: boolean; voice?: string }) =>
    api.post("/live-interviews/start", data).then(unwrap<any>),
  getLiveToken: (sessionId: string, provider: string) =>
    api.post(`/live-interviews/${sessionId}/token`, { provider }).then(unwrap<any>),
  getLiveConfig: (sessionId: string) => api.post(`/live-interviews/${sessionId}/config`).then(unwrap<any>),
  sendTranscript: (sessionId: string, data: unknown) =>
    api.post(`/live-interviews/${sessionId}/transcript`, data).then(unwrap<any>),
  sendLiveEvent: (sessionId: string, data: unknown) =>
    api.post(`/live-interviews/${sessionId}/event`, data).then(unwrap<any>),
  completeLiveInterview: (sessionId: string) =>
    api.post(`/live-interviews/${sessionId}/complete`).then(unwrap<any>),
  abandonLiveInterview: (sessionId: string) =>
    api.post(`/live-interviews/${sessionId}/abandon`).then(unwrap<any>),
  getLiveStatus: (sessionId: string) => api.get(`/live-interviews/${sessionId}/status`).then(unwrap<any>),
};

export async function requestMicrophonePermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) return false;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export interface VoiceTranscriptEvent {
  speaker: "user" | "assistant";
  text: string;
  delta?: string;
  isFinal: boolean;
}

export interface VoiceSessionHandlers {
  onStatus?: (status: string) => void;
  onSpeaking?: (speaking: "idle" | "user" | "assistant" | "processing") => void;
  onTranscript?: (event: VoiceTranscriptEvent) => void;
  onError?: (message: string) => void;
  avatarEnabled?: boolean;
  avatarVideoElement?: HTMLVideoElement | null;
}

export interface VoiceSessionConnection {
  disconnect: () => void;
  sendResponseCreate: () => void;
}

export async function connectVoiceSession(sessionId: string, handlers: VoiceSessionHandlers = {}): Promise<VoiceSessionConnection> {
  if (typeof window === "undefined" || typeof WebSocket === "undefined") {
    throw new Error("Voice sessions require a browser.");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not available in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  const audioContext = new AudioContext();
  if (audioContext.state === "suspended") await audioContext.resume();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(1024, 1, 1);
  const socket = new WebSocket(buildVoiceRelayUrl(sessionId));
  socket.binaryType = "arraybuffer";

  let playbackTime = audioContext.currentTime;
  let suppressInputUntil = 0;
  let closed = false;
  let peerConnection: RTCPeerConnection | null = null;
  let avatarConnecting = false;
  let avatarConnected = false;
  let avatarFallback = false;
  let avatarIceFallbackTimer: number | undefined;
  let avatarRecoveryTimer: number | undefined;
  let lastAvatarIceServers: RTCIceServer[] | undefined;
  let avatarReconnectAttempts = 0;
  let mediaReady = !handlers.avatarEnabled;
  let avatarReadySent = false;
  let avatarVideoReadyCleanup: (() => void) | undefined;

  processor.onaudioprocess = (event) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (!mediaReady) return;
    if (audioContext.currentTime < suppressInputUntil) return;
    const input = event.inputBuffer.getChannelData(0);
    socket.send(floatTo16BitPcm(downsample(input, audioContext.sampleRate, 24000)));
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  socket.onopen = () => {
    handlers.onStatus?.("connected");
    if (handlers.avatarEnabled) {
      avatarIceFallbackTimer = window.setTimeout(() => {
        if (!avatarConnecting && !avatarConnected && !avatarFallback) {
          void setupAvatarConnection();
        }
      }, 7000);
    }
  };
  socket.onerror = () => handlers.onError?.("Voice relay connection failed.");
  socket.onclose = () => {
    if (!closed) handlers.onStatus?.("disconnected");
    stop();
  };
  socket.onmessage = (event) => {
    if (typeof event.data !== "string") return;
    const message = JSON.parse(event.data);
    if (message.type === "status") handlers.onStatus?.(message.status || "connected");
    if (message.type === "speech") handlers.onSpeaking?.(message.speaking || "idle");
    if (message.type === "error") {
      const errorMessage = message.message || "Live voice error.";
      if (handlers.avatarEnabled && typeof message.code === "string" && message.code.startsWith("VOICE_LIVE_AVATAR")) {
        markAvatarFallback(new Error(errorMessage));
      } else {
        handlers.onError?.(errorMessage);
      }
    }
    if (message.type === "avatar.ice_servers") {
      window.clearTimeout(avatarIceFallbackTimer);
      void setupAvatarConnection(Array.isArray(message.iceServers) ? message.iceServers : undefined);
    }
    if (message.type === "avatar.answer" && message.sdp) {
      void applyAvatarAnswer(message.sdp);
    }
    if (message.type === "audio" && message.delta) {
      if (avatarConnected) return;
      try {
        handlers.onSpeaking?.("assistant");
        playbackTime = playPcm16(audioContext, String(message.delta), playbackTime, Number(message.sampleRate || 24000));
        suppressInputUntil = Math.max(suppressInputUntil, playbackTime + 0.15);
      } catch {
        handlers.onError?.("Voice audio arrived but could not be played.");
      }
    }
    if (message.type === "transcript" && message.text) {
      handlers.onTranscript?.({
        speaker: message.speaker === "assistant" ? "assistant" : "user",
        text: String(message.text),
        delta: message.delta ? String(message.delta) : undefined,
        isFinal: Boolean(message.isFinal),
      });
    }
  };

  function stop() {
    if (closed) return;
    closed = true;
    window.clearTimeout(avatarIceFallbackTimer);
    window.clearTimeout(avatarRecoveryTimer);
    avatarVideoReadyCleanup?.();
    avatarVideoReadyCleanup = undefined;
    cleanupPeerConnection(true);
    if (handlers.avatarVideoElement) handlers.avatarVideoElement.srcObject = null;
    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    void audioContext.close();
  }

  async function setupAvatarConnection(iceServers?: RTCIceServer[]) {
    if (!handlers.avatarEnabled || !handlers.avatarVideoElement || avatarConnecting || avatarConnected || avatarFallback) return;
    avatarConnecting = true;
    window.clearTimeout(avatarIceFallbackTimer);
    lastAvatarIceServers = iceServers || lastAvatarIceServers;
    handlers.onStatus?.("connecting-avatar");

    try {
      cleanupPeerConnection(false);
      const connection = new RTCPeerConnection({ iceServers: lastAvatarIceServers });
      peerConnection = connection;
      const remoteStream = new MediaStream();
      handlers.avatarVideoElement.srcObject = remoteStream;
      handlers.avatarVideoElement.muted = false;
      handlers.avatarVideoElement.autoplay = true;
      handlers.avatarVideoElement.playsInline = true;
      avatarVideoReadyCleanup?.();
      avatarVideoReadyCleanup = registerAvatarVideoReadyHandlers(handlers.avatarVideoElement, markAvatarReady);

      connection.ontrack = (trackEvent) => {
        trackEvent.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
        if (!trackEvent.streams[0]) remoteStream.addTrack(trackEvent.track);
        void handlers.avatarVideoElement?.play().catch(() => {});
      };
      connection.onconnectionstatechange = () => {
        handleAvatarConnectionState(connection.connectionState);
      };
      connection.oniceconnectionstatechange = () => {
        handleAvatarIceState(connection.iceConnectionState);
      };
      connection.addTransceiver("video", { direction: "sendrecv" });
      connection.addTransceiver("audio", { direction: "sendrecv" });
      connection.createDataChannel("eventChannel");

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await waitForIceGathering(connection, 2500);
      const localDescription = connection.localDescription;
      if (!localDescription) throw new Error("Browser did not create avatar SDP.");
      if (socket.readyState !== WebSocket.OPEN) throw new Error("Voice relay is not connected.");
      socket.send(JSON.stringify({ type: "avatar.connect", sdp: { type: localDescription.type, sdp: localDescription.sdp } }));
    } catch (error) {
      markAvatarFallback(error);
    }
  }

  async function applyAvatarAnswer(sdp: RTCSessionDescriptionInit) {
    if (!peerConnection || avatarConnected) return;
    try {
      await peerConnection.setRemoteDescription(sdp);
      avatarConnected = true;
      avatarConnecting = false;
      avatarFallback = false;
      avatarReconnectAttempts = 0;
      window.clearTimeout(avatarRecoveryTimer);
      handlers.onStatus?.("connecting-avatar");
    } catch (error) {
      markAvatarFallback(error);
    }
  }

  function handleAvatarConnectionState(state: RTCPeerConnectionState) {
    if (closed || avatarFallback) return;
    if (state === "connected") {
      avatarConnected = true;
      avatarReconnectAttempts = 0;
      window.clearTimeout(avatarRecoveryTimer);
      if (!avatarReadySent) handlers.onStatus?.("connecting-avatar");
      return;
    }
    if (state === "failed") {
      scheduleAvatarRecovery(500);
      return;
    }
    if (state === "disconnected") {
      scheduleAvatarRecovery(8000);
    }
  }

  function handleAvatarIceState(state: RTCIceConnectionState) {
    if (closed || avatarFallback) return;
    if (state === "connected" || state === "completed") {
      avatarConnected = true;
      avatarReconnectAttempts = 0;
      window.clearTimeout(avatarRecoveryTimer);
      if (!avatarReadySent) handlers.onStatus?.("connecting-avatar");
      return;
    }
    if (state === "failed") {
      scheduleAvatarRecovery(500);
      return;
    }
    if (state === "disconnected") {
      scheduleAvatarRecovery(8000);
    }
  }

  function scheduleAvatarRecovery(delayMs: number) {
    if (avatarRecoveryTimer || avatarConnecting || closed) return;
    avatarRecoveryTimer = window.setTimeout(() => {
      avatarRecoveryTimer = undefined;
      if (closed || avatarFallback || avatarConnecting) return;
      const connectionState = peerConnection?.connectionState;
      const iceState = peerConnection?.iceConnectionState;
      if (connectionState === "connected" || iceState === "connected" || iceState === "completed") return;

      avatarConnected = false;
      if (avatarReconnectAttempts >= 2) {
        markAvatarFallback(new Error("Avatar video connection was interrupted."));
        return;
      }
      avatarReconnectAttempts += 1;
      handlers.onStatus?.("connecting-avatar");
      void setupAvatarConnection(lastAvatarIceServers);
    }, delayMs);
  }

  function markAvatarFallback(error?: unknown) {
    avatarFallback = true;
    avatarConnecting = false;
    avatarConnected = false;
    mediaReady = true;
    window.clearTimeout(avatarRecoveryTimer);
    avatarVideoReadyCleanup?.();
    avatarVideoReadyCleanup = undefined;
    cleanupPeerConnection(true);
    if (handlers.avatarVideoElement) handlers.avatarVideoElement.srcObject = null;
    handlers.onStatus?.("avatar-unavailable-voice-only");
    notifyAvatarUnavailable();
    if (error) {
      handlers.onError?.(`Avatar video unavailable. Continuing with voice only. ${errorMessageFromUnknown(error)}`);
    }
  }

  function markAvatarReady() {
    if (closed || avatarFallback || avatarReadySent) return;
    avatarReadySent = true;
    avatarConnected = true;
    mediaReady = true;
    handlers.onStatus?.("avatar-connected");
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "avatar.ready" }));
  }

  function notifyAvatarUnavailable() {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "avatar.unavailable" }));
  }

  function cleanupPeerConnection(stopTracks: boolean) {
    if (!peerConnection) return;
    if (stopTracks) {
      peerConnection.getSenders().forEach((sender) => sender.track?.stop());
      peerConnection.getReceivers().forEach((receiver) => receiver.track?.stop());
    }
    peerConnection.ontrack = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.close();
    peerConnection = null;
  }

  return {
    disconnect: () => {
      stop();
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
    },
    sendResponseCreate: () => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "response.create" }));
    },
  };
}

function waitForIceGathering(peerConnection: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (peerConnection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = window.setTimeout(done, timeoutMs);
    function done() {
      window.clearTimeout(timeout);
      peerConnection.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    }
    function onChange() {
      if (peerConnection.iceGatheringState === "complete") done();
    }
    peerConnection.addEventListener("icegatheringstatechange", onChange);
  });
}

function registerAvatarVideoReadyHandlers(video: HTMLVideoElement, onReady: () => void): () => void {
  const handleReady = () => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) onReady();
  };
  video.addEventListener("loadeddata", handleReady);
  video.addEventListener("playing", handleReady);
  video.addEventListener("canplay", handleReady);
  handleReady();
  return () => {
    video.removeEventListener("loadeddata", handleReady);
    video.removeEventListener("playing", handleReady);
    video.removeEventListener("canplay", handleReady);
  };
}

function errorMessageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "");
}

function buildVoiceRelayUrl(sessionId: string): string {
  const configuredBase = String(api.defaults.baseURL || "/api/v1");
  const isAbsolute = /^https?:\/\//i.test(configuredBase);
  const devBackendOrigin = window.location.hostname === "localhost" && ["5173", "8080", "8081"].includes(window.location.port)
    ? "http://localhost:4000"
    : window.location.origin;
  const base = new URL(configuredBase, isAbsolute ? undefined : devBackendOrigin);
  const protocol = base.protocol === "https:" ? "wss:" : "ws:";
  const apiPath = base.pathname.replace(/\/+$/, "");
  return `${protocol}//${base.host}${apiPath}/live-interviews/${encodeURIComponent(sessionId)}/relay`;
}

function downsample(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (outputRate === inputRate) return input;
  const ratio = inputRate / outputRate;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end && j < input.length; j += 1) {
      sum += input[j];
      count += 1;
    }
    output[i] = count ? sum / count : 0;
  }
  return output;
}

function floatTo16BitPcm(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return buffer;
}

function playPcm16(audioContext: AudioContext, base64: string, playbackTime: number, sampleRate = 24000): number {
  if (audioContext.state === "suspended") void audioContext.resume();
  const bytes = base64ToUint8Array(base64);
  const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const audioBuffer = audioContext.createBuffer(1, samples.length, sampleRate);
  const channel = audioBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i += 1) channel[i] = samples[i] / 0x8000;
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  const startAt = Math.max(audioContext.currentTime + 0.02, playbackTime);
  source.start(startAt);
  return startAt + audioBuffer.duration;
}

function base64ToUint8Array(value: string): Uint8Array {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
