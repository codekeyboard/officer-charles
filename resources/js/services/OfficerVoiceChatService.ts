import { WavRecorder, WavStreamPlayer } from 'wavtools';

export type OfficerRole = 'user' | 'assistant';

export interface OfficerVoiceMessage {
    role: OfficerRole;
    content: string;
}

export interface OfficerVoiceReadyPayload {
    type: 'ready';
    sample_rate?: number;
    message_protocol?: string;
}

interface OfficerVoiceCallbacks {
    onMessage?: (message: OfficerVoiceMessage) => void;
    onAssistantDelta?: (delta: string) => void;
    onAssistantDone?: () => void;
    onSessionState?: (state: unknown) => void;
    onReady?: (payload: OfficerVoiceReadyPayload) => void;
    onError?: (message: string) => void;
    onClose?: () => void;
    onRecordingStart?: () => void;
    onRecordingStop?: () => void;
    onSpeakingStart?: () => void;
    onSpeakingEnd?: () => void;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return window.btoa(binary);
}

function base64ToUint8Array(value: string) {
    const binary = window.atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

function looksLikeBase64(value: string) {
    return /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0;
}

export class OfficerVoiceChatService {
    private readonly callbacks: OfficerVoiceCallbacks;
    private recorder: WavRecorder;
    private player: WavStreamPlayer;
    private ws: WebSocket | null = null;
    private sampleRate: number;
    private trackId = 1;
    private speaking = false;
    private recording = false;
    private audioReady = false;
    private speakingTimer: number | null = null;
    private directAudioPlaying = 0;
    private directAudioElements = new Set<HTMLAudioElement>();

    constructor(callbacks: OfficerVoiceCallbacks = {}, sampleRate = 24000) {
        this.callbacks = callbacks;
        this.sampleRate = sampleRate;
        this.recorder = new WavRecorder({ sampleRate: this.sampleRate });
        this.player = new WavStreamPlayer({ sampleRate: this.sampleRate });
    }

    async setupAudio(sampleRate = this.sampleRate) {
        if (this.audioReady && sampleRate === this.sampleRate) {
            return;
        }

        this.sampleRate = sampleRate;
        this.recorder = new WavRecorder({ sampleRate: this.sampleRate });
        this.player = new WavStreamPlayer({ sampleRate: this.sampleRate });
        await this.recorder.begin();
        await this.player.connect();
        this.audioReady = true;
        this.startSpeakingMonitor();
    }

    setupWs(sessionId: string, wsUrl: string) {
        if (!sessionId || !wsUrl) {
            this.callbacks.onError?.('Live session is missing websocket connection details.');

            return;
        }

        this.closeWs();
        this.ws = new WebSocket(wsUrl);
        this.ws.onmessage = (event) => void this.handleWsMessage(event);
        this.ws.onerror = () => this.callbacks.onError?.('Live interview websocket error.');
        this.ws.onclose = () => {
            this.recording = false;
            this.callbacks.onRecordingStop?.();
            this.callbacks.onClose?.();
        };
    }

    async startRecording() {
        if (!this.audioReady) {
            await this.setupAudio();
        }

        if (this.recording || !this.wsIsReady()) {
            return;
        }

        this.stopPlayback();
        this.recording = true;
        this.callbacks.onRecordingStart?.();

        await this.recorder.record((data) => {
            if (!this.recording || !this.wsIsReady()) {
                return;
            }

            this.wsSend({ _bin: arrayBufferToBase64(data.mono) });
        });
    }

    async stopRecording() {
        if (!this.recording) {
            return;
        }

        this.recording = false;
        this.callbacks.onRecordingStop?.();

        try {
            await this.recorder.pause();
        } finally {
            if (this.wsIsReady()) {
                this.wsSend({ type: 'command', command: 'commit' });
            }
        }
    }

    sendTextMessage(text: string) {
        const content = text.trim();

        if (!content || !this.wsIsReady()) {
            return;
        }

        this.wsSend({ type: 'command', command: 'text', payload: content });
    }

    close() {
        if (this.recording) {
            this.recording = false;
            this.callbacks.onRecordingStop?.();
        }

        void this.recorder.pause().catch(() => undefined);
        this.closeWs();
        this.stopPlayback();

        if (this.speakingTimer !== null) {
            window.clearInterval(this.speakingTimer);
            this.speakingTimer = null;
        }

        if (this.speaking) {
            this.speaking = false;
            this.callbacks.onSpeakingEnd?.();
        }

        void this.recorder.end?.();
        this.audioReady = false;
    }

    private async handleWsMessage(event: MessageEvent) {
        const data = event.data;

        if (data instanceof ArrayBuffer) {
            this.playPcm16(new Int16Array(data));

            return;
        }

        if (data instanceof Blob) {
            this.playPcm16(new Int16Array(await data.arrayBuffer()));

            return;
        }

        if (typeof data !== 'string') {
            return;
        }

        try {
            const payload = JSON.parse(data) as Record<string, unknown>;
            this.handleCoreEvent(payload);
        } catch {
            if (data === 'interrupt') {
                this.player.interrupt();

                return;
            }

            if (looksLikeBase64(data)) {
                this.playPcm16(new Int16Array(base64ToUint8Array(data).buffer));
            }
        }
    }

    private handleCoreEvent(payload: Record<string, unknown>) {
        const type = typeof payload.type === 'string' ? payload.type : '';

        if (type === 'ready') {
            this.callbacks.onReady?.(payload as unknown as OfficerVoiceReadyPayload);

            return;
        }

        if (type === 'session.state') {
            this.callbacks.onSessionState?.(payload.state);

            return;
        }

        if (type === 'transcription') {
            const message = typeof payload.message === 'string' ? payload.message.trim() : '';

            if (message) {
                this.callbacks.onMessage?.({ role: 'user', content: message });
            }

            return;
        }

        if (type === 'text.delta') {
            const delta = typeof payload.delta === 'string'
                ? payload.delta
                : typeof payload.message === 'string'
                    ? payload.message
                    : '';

            if (delta) {
                this.callbacks.onAssistantDelta?.(delta);
            }

            return;
        }

        if (type === 'text.completed') {
            this.callbacks.onAssistantDone?.();

            return;
        }

        if (type === 'direct.reply') {
            const message = typeof payload.message === 'string' ? payload.message : '';

            if (message) {
                this.callbacks.onAssistantDelta?.(message);
                this.callbacks.onAssistantDone?.();
            }

            return;
        }

        if (type === 'direct.audio') {
            const audio = typeof payload.audio === 'string' ? payload.audio : '';
            const mimeType = typeof payload.mime_type === 'string' ? payload.mime_type : 'audio/mpeg';
            this.playDirectAudio(audio, mimeType);

            return;
        }

        if (type === 'error') {
            const message = typeof payload.message === 'string' ? payload.message : 'Live interview error.';
            this.callbacks.onError?.(message);
        }
    }

    private playPcm16(audio: Int16Array) {
        if (!audio.length) {
            return;
        }

        this.player.add16BitPCM(audio, String(this.trackId));
        this.trackId += 1;
    }

    private playDirectAudio(audioBase64: string, mimeType: string) {
        if (!audioBase64) {
            return;
        }

        const bytes = base64ToUint8Array(audioBase64);
        const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
        const audio = new Audio(url);
        let finished = false;

        this.directAudioElements.add(audio);
        this.directAudioPlaying += 1;
        this.updateSpeaking(true);

        const finish = () => {
            if (finished) {
                return;
            }

            finished = true;
            URL.revokeObjectURL(url);
            this.directAudioElements.delete(audio);
            this.directAudioPlaying = Math.max(0, this.directAudioPlaying - 1);

            if (this.directAudioPlaying === 0) {
                this.updateSpeaking(false);
            }
        };

        audio.onended = finish;
        audio.onerror = finish;
        void audio.play().catch(finish);
    }

    private stopPlayback() {
        this.player.interrupt();

        for (const audio of this.directAudioElements) {
            audio.pause();
            audio.currentTime = 0;
        }

        this.directAudioElements.clear();
        this.directAudioPlaying = 0;
        this.updateSpeaking(false);
    }

    private wsIsReady() {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    private wsSend(payload: Record<string, unknown>) {
        if (this.wsIsReady()) {
            this.ws?.send(JSON.stringify(payload));
        }
    }

    private closeWs() {
        this.ws?.close();
        this.ws = null;
    }

    private startSpeakingMonitor() {
        if (this.speakingTimer !== null) {
            return;
        }

        this.speakingTimer = window.setInterval(() => {
            if (this.directAudioPlaying > 0) {
                return;
            }

            try {
                const values = this.player.getFrequencies?.().values ?? [];
                this.updateSpeaking(values.some((value) => value > 0));
            } catch {
                this.updateSpeaking(false);
            }
        }, 100);
    }

    private updateSpeaking(nextSpeaking: boolean) {
        if (nextSpeaking === this.speaking) {
            return;
        }

        this.speaking = nextSpeaking;

        if (nextSpeaking) {
            this.callbacks.onSpeakingStart?.();
        } else {
            this.callbacks.onSpeakingEnd?.();
        }
    }
}
