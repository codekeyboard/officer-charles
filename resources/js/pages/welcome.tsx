import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowUp,
    BadgeCheck,
    GraduationCap,
    Keyboard,
    Loader2,
    MessageSquareText,
    Mic,
    Moon,
    PhoneOff,
    Radio,
    RotateCcw,
    Sun,
    User,
} from 'lucide-react';
import type { FormEvent, KeyboardEvent, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type MessageRole = 'user' | 'assistant';
type InterviewMode = 'training' | 'interview';
type VisaType = 'f1' | 'b1_b2';
type ExperienceMode = 'chat' | 'live';
type ThemeMode = 'dark' | 'light';
type LiveSessionKey = `${InterviewMode}:${VisaType}`;

interface ServerMessage {
    id: number;
    role: MessageRole;
    content: string;
    created_at: string;
    mode?: InterviewMode | null;
    visa_type?: VisaType | null;
}

interface ChatMessage extends ServerMessage {
    localId?: string;
    status?: 'pending' | 'failed';
}

interface StoreMessageResponse {
    user: ServerMessage;
    assistant: ServerMessage;
    session_completed?: boolean;
    session_reset?: boolean;
    session_state?: InterviewSessionState | null;
}

interface MessagesResponse {
    messages: ServerMessage[];
    session_state?: InterviewSessionState | null;
}

interface InterviewSessionState {
    experience: ExperienceMode;
    phase: 'mode_selection' | 'visa_selection' | 'training' | 'interview' | 'evaluation' | 'completed';
    selected_mode: InterviewMode | null;
    selected_visa_type: VisaType | null;
    interview_status: string;
    current_question: string | null;
    current_question_index: number;
    total_questions: number;
    answered_questions: string[];
    last_answer_quality: string | null;
    evaluation_ready: boolean;
    completed: boolean;
}

const emptyLiveMessages: ChatMessage[] = [];
const DEFAULT_MODE: InterviewMode = 'training';
const DEFAULT_VISA_TYPE: VisaType = 'f1';
const defaultChatSessionState: InterviewSessionState = {
    experience: 'chat',
    phase: 'mode_selection',
    selected_mode: null,
    selected_visa_type: null,
    interview_status: 'setup',
    current_question: null,
    current_question_index: 0,
    total_questions: 0,
    answered_questions: [],
    last_answer_quality: null,
    evaluation_ready: false,
    completed: false,
};
const defaultLiveSessionState: InterviewSessionState = {
    ...defaultChatSessionState,
    experience: 'live',
};

export interface Props {
    messages: ServerMessage[];
}

const experienceContent = {
    chat: {
        label: 'Chat Interview',
        shortLabel: 'Chat',
        status: 'Text interview',
    },
    live: {
        label: 'Live Interview',
        shortLabel: 'Live',
        status: 'Voice interview',
    },
} satisfies Record<ExperienceMode, Record<string, string>>;

const starterPrompts = [
    'Start my visa interview practice.',
    'Begin a guided interview.',
    'Help me practice with Officer Charles.',
];

function formatTime(value: string) {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isFinalReport(content: string) {
    return content.includes('FINAL REPORT') || content.includes('Performance Report');
}

function textPreview(content?: string) {
    if (!content) {
        return 'No officer response yet.';
    }

    return content.replace(/\s+/g, ' ').trim().slice(0, 140);
}

function formatPhase(value?: InterviewSessionState['phase']) {
    const labels: Record<InterviewSessionState['phase'], string> = {
        mode_selection: 'Choosing practice mode',
        visa_selection: 'Choosing visa type',
        training: 'Training session',
        interview: 'Interview questions',
        evaluation: 'Evaluation',
        completed: 'Completed',
    };

    return value ? labels[value] : 'Waiting to begin';
}

function formatSelectedMode(value?: InterviewMode | null) {
    if (value === 'training') {
        return 'Training Session';
    }

    if (value === 'interview') {
        return 'Real Interview Simulation';
    }

    return 'Not selected yet';
}

function formatVisaType(value?: VisaType | null) {
    if (value === 'f1') {
        return 'F-1 Student Visa';
    }

    if (value === 'b1_b2') {
        return 'B1/B2 Visitor Visa';
    }

    return 'Not selected yet';
}

function getInitialTheme(): ThemeMode {
    if (typeof window === 'undefined') {
        return 'dark';
    }

    return window.localStorage.getItem('officer-charles-theme') === 'light' ? 'light' : 'dark';
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

function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number) {
    if (outputSampleRate === inputSampleRate) {
        return buffer;
    }

    const ratio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);

    for (let offset = 0; offset < result.length; offset += 1) {
        const start = Math.floor(offset * ratio);
        const end = Math.min(Math.floor((offset + 1) * ratio), buffer.length);
        let sum = 0;

        for (let index = start; index < end; index += 1) {
            sum += buffer[index];
        }

        result[offset] = sum / Math.max(end - start, 1);
    }

    return result;
}

function floatToPcm16Base64(input: Float32Array, inputSampleRate: number, outputSampleRate = 24000) {
    const samples = downsampleBuffer(input, inputSampleRate, outputSampleRate);
    const pcm = new Int16Array(samples.length);

    for (let index = 0; index < samples.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, samples[index]));
        pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    return arrayBufferToBase64(pcm.buffer);
}

export function ChatExperience({ messages }: Props) {
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(messages);
    const [experienceMode, setExperienceMode] = useState<ExperienceMode>('chat');
    const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
    const [draft, setDraft] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(messages.length === 0);
    const [syncingMessages, setSyncingMessages] = useState(false);
    const [restartingSession, setRestartingSession] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [completedSessionMode, setCompletedSessionMode] = useState<InterviewMode | null>(null);
    const [liveMessagesBySession, setLiveMessagesBySession] = useState<Partial<Record<LiveSessionKey, ChatMessage[]>>>({});
    const [liveConnecting, setLiveConnecting] = useState(false);
    const [liveConnected, setLiveConnected] = useState(false);
    const [liveRecording, setLiveRecording] = useState(false);
    const [liveSpeaking, setLiveSpeaking] = useState(false);
    const [liveError, setLiveError] = useState<string | null>(null);
    const [chatSessionState, setChatSessionState] = useState<InterviewSessionState | null>(null);
    const [liveSessionState, setLiveSessionState] = useState<InterviewSessionState | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const liveMessagesEndRef = useRef<HTMLDivElement>(null);
    const mobileLiveMessagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const liveRecordingRef = useRef(false);
    const liveAssistantIdRef = useRef<number | null>(null);
    const liveAudioPlayingRef = useRef(0);

    const mode = DEFAULT_MODE;
    const visaType = DEFAULT_VISA_TYPE;
    const activeSessionMessages = useMemo(
        () => chatMessages.filter((message) => message.mode === mode && (message.visa_type ?? 'f1') === visaType),
        [chatMessages, mode, visaType],
    );
    const liveSessionKey = `${mode}:${visaType}` as LiveSessionKey;
    const activeLiveMessages = liveMessagesBySession[liveSessionKey] ?? emptyLiveMessages;
    const activeSessionState = experienceMode === 'live' ? liveSessionState : chatSessionState;
    const activeSidebarMessages = experienceMode === 'live' ? activeLiveMessages : activeSessionMessages;
    const activeSidebarUserCount = activeSidebarMessages.filter((message) => message.role === 'user').length;
    const activeSidebarAssistant = activeSidebarMessages.filter((message) => message.role === 'assistant' && message.status !== 'pending').at(-1);

    const loadMessages = useCallback(async (silent = false) => {
        if (silent) {
            setSyncingMessages(true);
        } else {
            setLoadingMessages(true);
        }

        try {
            const response = await fetch('/api/ai/messages', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Could not load chat messages from the backend API.');
            }

            const payload = (await response.json()) as ServerMessage[] | MessagesResponse;
            const nextMessages = Array.isArray(payload) ? payload : payload.messages;

            setChatMessages(nextMessages);
            setChatSessionState(Array.isArray(payload) ? null : (payload.session_state ?? null));
            setCompletedSessionMode(null);
            setError(null);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Could not connect to the backend API.');
        } finally {
            setLoadingMessages(false);
            setSyncingMessages(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadMessages(messages.length > 0);
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadMessages, messages.length]);

    useEffect(() => {
        window.localStorage.setItem('officer-charles-theme', theme);
        document.documentElement.dataset.ocTheme = theme;
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [chatMessages, submitting]);

    useEffect(() => {
        liveMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        mobileLiveMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [activeLiveMessages]);

    useEffect(() => {
        liveRecordingRef.current = liveRecording;
    }, [liveRecording]);

    useEffect(() => {
        if (!textareaRef.current) {
return;
}

        textareaRef.current.style.height = '0px';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 156)}px`;
    }, [draft]);

    const submitMessage = async (messageContent: string) => {
        const content = messageContent.trim();

        if (!content || submitting) {
return;
}

        const optimisticId = `optimistic-${Date.now()}`;
        const createdAt = new Date().toISOString();

        const optimisticMessage: ChatMessage = {
            id: Date.now() * -1,
            localId: optimisticId,
            role: 'user',
            content,
            created_at: createdAt,
            mode,
            visa_type: visaType,
            status: 'pending',
        };

        setError(null);
        setDraft('');
        setSubmitting(true);
        setCompletedSessionMode(null);
        setChatMessages((currentMessages) => [
            ...(completedSessionMode === mode
                ? currentMessages.filter((message) => message.mode !== mode || (message.visa_type ?? 'f1') !== visaType)
                : currentMessages),
            optimisticMessage,
        ]);

        try {
            const response = await fetch('/api/ai/messages', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content, mode, visa_type: visaType }),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                const contentError = payload?.errors?.content?.[0];

                throw new Error(contentError || payload?.message || 'Officer Charles could not process that message. Please try again.');
            }

            const data = payload as StoreMessageResponse;
            const shouldClearActiveSession = data.session_completed || data.session_reset || completedSessionMode === mode;

            setChatMessages((currentMessages) => [
                ...(shouldClearActiveSession
                    ? currentMessages.filter((message) => message.mode !== mode || (message.visa_type ?? 'f1') !== visaType)
                    : currentMessages.filter((message) => message.localId !== optimisticId)),
                data.user,
                data.assistant,
            ]);
            setChatSessionState(data.session_state ?? null);
            setCompletedSessionMode(data.session_completed ? mode : null);
        } catch (requestError) {
            setDraft(content);
            setError(requestError instanceof Error ? requestError.message : 'Something went wrong. Please try again.');
            setChatMessages((currentMessages) =>
                currentMessages.map((message) =>
                    message.localId === optimisticId ? { ...message, status: 'failed' } : message,
                ),
            );
        } finally {
            setSubmitting(false);
            textareaRef.current?.focus();
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void submitMessage(draft);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void submitMessage(draft);
        }
    };

    const restartInterview = async () => {
        if (submitting || restartingSession) {
            return;
        }

        setRestartingSession(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/restart', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ mode, visa_type: visaType }),
            });

            if (!response.ok) {
                throw new Error('Could not restart this interview session. Please try again.');
            }

            setChatMessages((currentMessages) => currentMessages.filter((message) => message.mode !== mode || (message.visa_type ?? 'f1') !== visaType));
            setChatSessionState(defaultChatSessionState);
            setCompletedSessionMode(null);
            setDraft('');
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Could not restart this interview session.');
        } finally {
            setRestartingSession(false);
            textareaRef.current?.focus();
        }
    };

    const restartLiveInterview = () => {
        if (liveConnecting) {
            return;
        }

        stopLiveInterview();
        setLiveError(null);
        setLiveSessionState(defaultLiveSessionState);
        setLiveMessagesBySession((currentSessions) => ({
            ...currentSessions,
            [liveSessionKey]: [],
        }));
    };

    const restartActiveInterview = async () => {
        if (experienceMode === 'live') {
            restartLiveInterview();

            return;
        }

        await restartInterview();
    };

    const appendLiveAssistantDelta = useCallback((delta: string) => {
        if (!delta) {
return;
}

        setLiveMessagesBySession((currentSessions) => {
            const currentMessages = currentSessions[liveSessionKey] ?? [];
            const activeAssistantId = liveAssistantIdRef.current;

            if (activeAssistantId) {
                return {
                    ...currentSessions,
                    [liveSessionKey]: currentMessages.map((message) =>
                        message.id === activeAssistantId ? { ...message, content: `${message.content}${delta}` } : message,
                    ),
                };
            }

            const id = Date.now() * -1;
            liveAssistantIdRef.current = id;

            return {
                ...currentSessions,
                [liveSessionKey]: [
                    ...currentMessages,
                    {
                        id,
                        role: 'assistant',
                        content: delta,
                        created_at: new Date().toISOString(),
                        mode,
                        visa_type: visaType,
                    },
                ],
            };
        });
    }, [liveSessionKey, mode, visaType]);

    const finalizeLiveAssistant = useCallback(() => {
        liveAssistantIdRef.current = null;
    }, []);

    const addLiveUserMessage = useCallback((content: string) => {
        if (!content.trim()) {
return;
}

        setLiveMessagesBySession((currentSessions) => ({
            ...currentSessions,
            [liveSessionKey]: [
                ...(currentSessions[liveSessionKey] ?? []),
                {
                    id: Date.now() * -1,
                    role: 'user',
                    content,
                    created_at: new Date().toISOString(),
                    mode,
                    visa_type: visaType,
                },
            ],
        }));
    }, [liveSessionKey, mode, visaType]);

    const playDirectAudio = useCallback((audioBase64: string, mimeType = 'audio/mpeg') => {
        if (!audioBase64) {
return;
}

        const bytes = base64ToUint8Array(audioBase64);
        const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
        const audio = new Audio(url);

        liveAudioPlayingRef.current += 1;
        setLiveSpeaking(true);

        const finish = () => {
            URL.revokeObjectURL(url);
            liveAudioPlayingRef.current = Math.max(0, liveAudioPlayingRef.current - 1);

            if (liveAudioPlayingRef.current === 0) {
                setLiveSpeaking(false);
            }
        };

        audio.onended = finish;
        audio.onerror = finish;
        void audio.play().catch(finish);
    }, []);

    const stopLiveInterview = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;

        audioProcessorRef.current?.disconnect();
        audioSourceRef.current?.disconnect();
        audioStreamRef.current?.getTracks().forEach((track) => track.stop());

        audioProcessorRef.current = null;
        audioSourceRef.current = null;
        audioStreamRef.current = null;
        setLiveConnected(false);
        setLiveConnecting(false);
        setLiveRecording(false);
        setLiveSpeaking(false);
        liveRecordingRef.current = false;
        liveAudioPlayingRef.current = 0;
        liveAssistantIdRef.current = null;
    }, []);

    const handleLiveMessage = useCallback((event: MessageEvent<string>) => {
        const data = event.data;

        try {
            const payload = JSON.parse(data);

            if (payload.type === 'ready') {
                setLiveConnected(true);
                setLiveConnecting(false);
                setLiveError(null);

                return;
            }

            if (payload.type === 'session.state') {
                setLiveSessionState(payload.state ?? null);

                return;
            }

            if (payload.type === 'transcription') {
                addLiveUserMessage(payload.message ?? '');

                return;
            }

            if (payload.type === 'direct.reply') {
                const message = payload.message ?? '';
                appendLiveAssistantDelta(message);
                finalizeLiveAssistant();

                return;
            }

            if (payload.type === 'direct.audio') {
                playDirectAudio(payload.audio ?? '', payload.mime_type ?? 'audio/mpeg');

                return;
            }

            if (payload.type === 'error') {
                setLiveError(payload.message ?? 'Live interview error.');

                return;
            }
        } catch {
            return;
        }
    }, [addLiveUserMessage, appendLiveAssistantDelta, finalizeLiveAssistant, playDirectAudio]);

    const startAudioCapture = useCallback(async (socket: WebSocket) => {
        const audioContext = new AudioContext({ sampleRate: 24000 });
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (event) => {
            const output = event.outputBuffer.getChannelData(0);
            output.fill(0);

            if (!liveRecordingRef.current || socket.readyState !== WebSocket.OPEN) {
                return;
            }

            const input = event.inputBuffer.getChannelData(0);
            socket.send(JSON.stringify({ _bin: floatToPcm16Base64(input, audioContext.sampleRate, 24000) }));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        audioStreamRef.current = stream;
        audioSourceRef.current = source;
        audioProcessorRef.current = processor;
    }, []);

    const startLiveInterview = async () => {
        if (liveConnecting || liveConnected) {
return;
}

        setExperienceMode('live');
        setLiveConnecting(true);
        setLiveError(null);
        setLiveMessagesBySession((currentSessions) => ({
            ...currentSessions,
            [liveSessionKey]: [],
        }));
        liveAssistantIdRef.current = null;

        try {
            const response = await fetch('/api/ai/live-session', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ mode, visa_type: visaType }),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(payload?.message ?? 'Could not start live interview.');
            }

            const socket = new WebSocket(payload.ws_url);
            setLiveSessionState(payload.session_state ?? defaultLiveSessionState);
            wsRef.current = socket;
            socket.onmessage = handleLiveMessage;
            socket.onerror = () => setLiveError('Live interview websocket error.');
            socket.onclose = () => {
                setLiveConnected(false);
                setLiveRecording(false);
                liveRecordingRef.current = false;
            };

            await startAudioCapture(socket);
        } catch (requestError) {
            setLiveError(requestError instanceof Error ? requestError.message : 'Could not start live interview.');
            stopLiveInterview();
        } finally {
            setLiveConnecting(false);
        }
    };

    const toggleLiveRecording = () => {
        if (!liveConnected || !wsRef.current) {
return;
}

        if (liveRecording) {
            setLiveRecording(false);
            liveRecordingRef.current = false;
            wsRef.current.send(JSON.stringify({ type: 'command', command: 'commit' }));

            return;
        }

        setLiveRecording(true);
        liveRecordingRef.current = true;
    };

    const selectExperienceMode = (nextExperienceMode: ExperienceMode) => {
        if (nextExperienceMode === experienceMode) {
            return;
        }

        if (experienceMode === 'live') {
            stopLiveInterview();
            setLiveError(null);
        }

        setExperienceMode(nextExperienceMode);
    };

    useEffect(() => () => stopLiveInterview(), [stopLiveInterview]);

    const mobileDetailsSheet = (
        <MobileDetailsSheet
            latestAssistant={activeSidebarAssistant}
            experience={experienceMode === 'live' ? experienceContent.live : experienceContent.chat}
            sessionState={activeSessionState}
            userCount={activeSidebarUserCount}
        >
            {experienceMode === 'live' ? (
                <>
                    <SessionProgressPanel
                        latestAssistant={activeSidebarAssistant}
                        experience={experienceContent.live}
                        sessionState={activeSessionState}
                        userCount={activeSidebarUserCount}
                    />
                    <LiveMicControls
                        connected={liveConnected}
                        onEnd={stopLiveInterview}
                        onToggleRecording={toggleLiveRecording}
                        recording={liveRecording}
                    />
                    <section className="oc-chat-panel oc-live-transcript-panel oc-mobile-sheet-transcript">
                        <ChatTranscript
                            empty={<LiveTranscriptEmpty connected={liveConnected} />}
                            endRef={mobileLiveMessagesEndRef}
                            messages={activeLiveMessages}
                        />
                    </section>
                </>
            ) : (
                <>
                    <SessionProgressPanel
                        latestAssistant={activeSidebarAssistant}
                        experience={experienceContent.chat}
                        sessionState={activeSessionState}
                        userCount={activeSidebarUserCount}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void restartActiveInterview()}
                        disabled={restartingSession}
                        className="oc-restart-button w-full"
                    >
                        <RotateCcw className={cn('h-4 w-4', restartingSession && 'animate-spin')} />
                        Restart interview
                    </Button>
                </>
            )}
        </MobileDetailsSheet>
    );

    return (
        <main data-oc-theme={theme} className="oc-page h-dvh overflow-hidden font-sans">
            <div className="oc-shell flex h-full min-h-0 flex-col">
                <InterviewHeader
                    experienceMode={experienceMode}
                    loading={loadingMessages || syncingMessages}
                    mobileDetails={mobileDetailsSheet}
                    onRestart={() => void restartActiveInterview()}
                    onSelectMode={selectExperienceMode}
                    onToggleTheme={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
                    restarting={restartingSession || liveConnecting}
                    theme={theme}
                />

                <div className={cn('oc-experience-main', experienceMode === 'live' ? 'is-live' : 'is-chat')}>
                    {experienceMode === 'live' ? (
                        <div className="oc-live-layout">
                            <LiveInterviewStage
                                connected={liveConnected}
                                connecting={liveConnecting}
                                error={liveError}
                                onStart={startLiveInterview}
                                recording={liveRecording}
                                speaking={liveSpeaking}
                            />

                            <section className="oc-live-side">
                                <SessionProgressPanel
                                    latestAssistant={activeSidebarAssistant}
                                    experience={experienceContent.live}
                                    sessionState={activeSessionState}
                                    userCount={activeSidebarUserCount}
                                />
                                <section className="oc-chat-panel oc-live-transcript-panel">
                                    <ChatTranscript
                                        empty={<LiveTranscriptEmpty connected={liveConnected} />}
                                        endRef={liveMessagesEndRef}
                                        messages={activeLiveMessages}
                                    />
                                </section>
                                <LiveMicControls
                                    connected={liveConnected}
                                    onEnd={stopLiveInterview}
                                    onToggleRecording={toggleLiveRecording}
                                    recording={liveRecording}
                                />
                            </section>
                        </div>
                    ) : (
                        <div className="oc-chat-layout">
                            <section className="oc-chat-panel oc-chat-primary-panel">
                                <ChatTranscript
                                    empty={loadingMessages ? <LoadingState /> : <EmptyState onSelectPrompt={setDraft} />}
                                    endRef={messagesEndRef}
                                    messages={loadingMessages ? [] : activeSessionMessages}
                                    thinking={submitting}
                                />
                                <ChatComposer
                                    draft={draft}
                                    error={error}
                                    onChange={setDraft}
                                    onKeyDown={handleKeyDown}
                                    onSubmit={handleSubmit}
                                    submitting={submitting}
                                    textareaRef={textareaRef}
                                />
                            </section>

                            <aside className="oc-sidebar-shell">
                                <div className="oc-sidebar-stack">
                                    <SidebarCards
                                        latestAssistant={activeSidebarAssistant}
                                        onRestart={() => void restartActiveInterview()}
                                        restartingSession={restartingSession}
                                        experience={experienceContent.chat}
                                        sessionState={activeSessionState}
                                        userCount={activeSidebarUserCount}
                                    />
                                </div>
                            </aside>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function VisaAi({ messages }: Props) {
    return (
        <>
            <Head title="Officer Charles - Visa Interview Prep" />
            <ChatExperience messages={messages} />
        </>
    );
}

function InterviewHeader({
    experienceMode,
    loading,
    mobileDetails,
    onRestart,
    onSelectMode,
    onToggleTheme,
    restarting,
    theme,
}: {
    experienceMode: ExperienceMode;
    loading: boolean;
    mobileDetails: ReactNode;
    onRestart: () => void;
    onSelectMode: (mode: ExperienceMode) => void;
    onToggleTheme: () => void;
    restarting: boolean;
    theme: ThemeMode;
}) {
    return (
        <header className="oc-header sticky top-0 z-30">
            <div className="oc-header-inner">
                <div className="oc-brand-row">
                    <div className="oc-brand-mark">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="oc-heading">Officer Charles</h1>
                        <p className="oc-subtle">Visa interview practice workspace</p>
                    </div>
                </div>

                <div className="oc-header-actions">
                    <ModeToggle experienceMode={experienceMode} onSelectMode={onSelectMode} />
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onRestart}
                        disabled={loading || restarting}
                        className="oc-restart-button oc-header-restart"
                    >
                        <RotateCcw className={cn('h-4 w-4', restarting && 'animate-spin')} />
                        <span>Restart</span>
                    </Button>
                    {mobileDetails}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onToggleTheme}
                        className="oc-icon-button"
                        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    >
                        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </header>
    );
}

function ModeToggle({
    experienceMode,
    onSelectMode,
}: {
    experienceMode: ExperienceMode;
    onSelectMode: (mode: ExperienceMode) => void;
}) {
    return (
        <div className="oc-mode-control">
            {(['chat', 'live'] as ExperienceMode[]).map((option) => (
                <button
                    key={option}
                    type="button"
                    onClick={() => onSelectMode(option)}
                    aria-pressed={experienceMode === option}
                    className={cn('oc-mode-button', `is-${option}`, experienceMode === option && 'is-active')}
                >
                    {option === 'chat' ? <Keyboard className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
                    <span>{experienceContent[option].label}</span>
                </button>
            ))}
        </div>
    );
}

function SessionProgressPanel({
    latestAssistant,
    experience,
    sessionState,
    userCount,
}: {
    experience: (typeof experienceContent)[ExperienceMode];
    latestAssistant?: ChatMessage;
    sessionState: InterviewSessionState | null;
    userCount: number;
}) {
    const answeredCount = sessionState?.answered_questions.length ?? 0;
    const totalQuestions = sessionState?.total_questions ?? 0;
    const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

    return (
        <section className="oc-session-summary-panel">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="oc-kicker">Officer</p>
                    <h2 className="oc-card-title">Officer Charles</h2>
                </div>
                <Badge className="oc-mode-badge" variant="outline">
                    {experience.label}
                </Badge>
            </div>

            <div className="oc-progress-block">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="oc-subtle text-xs">{totalQuestions > 0 ? `${answeredCount} of ${totalQuestions} answered` : 'Progress starts after setup'}</span>
                    <span className="oc-progress-value">{progress}%</span>
                </div>
                <div className="oc-progress-track">
                    <div className="oc-progress-bar" style={{ width: `${progress}%` }} />
                </div>
            </div>

            <div className="oc-session-stats grid grid-cols-2 gap-2">
                <div>
                    <span>{formatSelectedMode(sessionState?.selected_mode)}</span>
                    <p>Practice mode</p>
                </div>
                <div>
                    <span>{formatVisaType(sessionState?.selected_visa_type)}</span>
                    <p>Visa type</p>
                </div>
            </div>

            <div className="oc-latest-response">
                <p className="oc-kicker">Status</p>
                <p>{formatPhase(sessionState?.phase)}</p>
            </div>
            <div className="oc-latest-response">
                <p className="oc-kicker">Latest response</p>
                <p>{textPreview(latestAssistant?.content)}</p>
            </div>
            <p className="oc-subtle text-xs">{userCount} user answers in this session</p>
        </section>
    );
}

function ChatTranscript({
    empty,
    endRef,
    messages,
    thinking = false,
}: {
    empty: ReactNode;
    endRef: RefObject<HTMLDivElement | null>;
    messages: ChatMessage[];
    thinking?: boolean;
}) {
    return (
        <div className="oc-chat-scroll">
            <div className="oc-transcript-inner">
                {messages.length === 0 ? empty : messages.map((message) => <MessageBubble key={message.localId ?? message.id} message={message} />)}
                {thinking && <ThinkingBubble />}
                <div ref={endRef} />
            </div>
        </div>
    );
}

function ChatComposer({
    draft,
    error,
    onChange,
    onKeyDown,
    onSubmit,
    submitting,
    textareaRef,
}: {
    draft: string;
    error: string | null;
    onChange: (draft: string) => void;
    onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    submitting: boolean;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
    return (
        <footer className="oc-composer-wrap">
            {error && (
                <div className="oc-error-banner">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={onSubmit} className="oc-composer">
                <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Reply to Officer Charles..."
                    rows={1}
                    disabled={submitting}
                    className="oc-textarea"
                />
                <Button
                    type="submit"
                    size="icon"
                    disabled={submitting || !draft.trim()}
                    className="oc-send-button"
                    aria-label="Send message"
                >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </Button>
            </form>
        </footer>
    );
}

function LiveTranscriptEmpty({ connected }: { connected: boolean }) {
    return (
        <div className="oc-live-empty">
            <MessageSquareText className="h-6 w-6" />
            <h3>{connected ? 'Transcript will appear here' : 'Start the live interview'}</h3>
            <p>{connected ? 'Your spoken answers and Officer Charles responses will stream into this panel.' : 'Connect first, then use the mic control to answer questions.'}</p>
        </div>
    );
}

function SidebarCards({
    latestAssistant,
    onRestart,
    restartingSession,
    experience,
    sessionState,
    userCount,
}: {
    experience: (typeof experienceContent)[ExperienceMode];
    latestAssistant?: ChatMessage;
    onRestart: () => void;
    restartingSession: boolean;
    sessionState: InterviewSessionState | null;
    userCount: number;
}) {
    const answeredCount = sessionState?.answered_questions.length ?? 0;
    const totalQuestions = sessionState?.total_questions ?? 0;
    const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : null;
    const checklistItems = [
        ...(sessionState?.answered_questions ?? []).map((question) => ({
            key: `answered-${question}`,
            label: question,
            status: 'Answered',
            active: false,
        })),
        ...(sessionState?.current_question
            ? [{
                key: `current-${sessionState.current_question}`,
                label: sessionState.current_question,
                status: 'Current question',
                active: true,
            }]
            : []),
    ].slice(-5);

    return (
        <>
            <section className="oc-sidebar-card oc-session-card oc-scroll-card">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="oc-kicker">Actual Session</p>
                        <h2 className="oc-card-title">{experience.label}</h2>
                    </div>
                    <div className="oc-card-icon">
                        {experience.shortLabel === 'Chat' ? <Keyboard className="h-5 w-5" /> : <Radio className="h-5 w-5" />}
                    </div>
                </div>
                <p className="oc-card-copy">This card shows only confirmed state from the assistant session.</p>
                <div className="oc-session-stats mt-4 grid grid-cols-2 gap-2">
                    <div>
                        <span>{formatSelectedMode(sessionState?.selected_mode)}</span>
                        <p>Practice mode</p>
                    </div>
                    <div>
                        <span>{formatVisaType(sessionState?.selected_visa_type)}</span>
                        <p>Visa type</p>
                    </div>
                </div>
                <div className="oc-latest-response mt-3">
                    <p className="oc-kicker">Status</p>
                    <p>{formatPhase(sessionState?.phase)}</p>
                </div>
                <div className="oc-latest-response mt-3">
                    <p className="oc-kicker">Latest Officer Response</p>
                    <p>{textPreview(latestAssistant?.content)}</p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                    <Badge className="oc-mode-badge" variant="outline">
                        {experience.shortLabel}
                    </Badge>
                    <span className="oc-subtle text-xs">{userCount} user answers</span>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onRestart}
                    disabled={restartingSession}
                    className="oc-restart-button mt-4 w-full"
                >
                    <RotateCcw className={cn('h-4 w-4', restartingSession && 'animate-spin')} />
                    Restart interview
                </Button>
            </section>

            <section className="oc-sidebar-card oc-scroll-card">
                <div className="mb-4 flex items-center gap-3">
                    <div className="oc-card-icon">
                        <MessageSquareText className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="oc-kicker">Real Progress</p>
                        <h3 className="oc-card-title">{progress === null ? 'Not started yet' : `${progress}% complete`}</h3>
                    </div>
                </div>
                {progress === null ? (
                    <p className="oc-card-copy mt-3">Progress begins after Officer Charles starts the interview questions.</p>
                ) : (
                    <>
                        <div className="mb-3 mt-4 flex items-center justify-between gap-3">
                            <span className="oc-subtle text-xs">{answeredCount} of {totalQuestions} answered</span>
                            <span className="oc-progress-value">{progress}%</span>
                        </div>
                        <div className="oc-progress-track">
                            <div className="oc-progress-bar" style={{ width: `${progress}%` }} />
                        </div>
                    </>
                )}
            </section>

            <section className="oc-sidebar-card oc-readiness-card oc-scroll-card">
                <div className="mb-4 flex items-center gap-3">
                    <div className="oc-card-icon">
                        <BadgeCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="oc-kicker">Answers Checklist</p>
                        <h3 className="oc-card-title">Real answered questions</h3>
                    </div>
                </div>
                {checklistItems.length > 0 ? (
                    <div className="oc-readiness-list flex flex-col gap-2">
                        {checklistItems.map((item) => (
                            <div key={item.key} className={cn('oc-check-item', item.active && 'is-active')}>
                                <BadgeCheck className={cn('mt-0.5 h-4 w-4 shrink-0', item.active ? 'text-[var(--oc-accent)]' : 'text-emerald-400')} />
                                <div>
                                    <p className="font-semibold text-[var(--oc-text)]">{item.status}</p>
                                    <p>{item.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="oc-card-copy">No interview answers yet. This checklist appears only after the assistant has real question state.</p>
                )}
            </section>
        </>
    );
}

function MobileDetailsSheet({
    children,
    experience,
    latestAssistant,
    sessionState,
    userCount,
}: {
    children: ReactNode;
    experience: (typeof experienceContent)[ExperienceMode];
    latestAssistant?: ChatMessage;
    sessionState: InterviewSessionState | null;
    userCount: number;
}) {
    const answeredCount = sessionState?.answered_questions.length ?? 0;
    const totalQuestions = sessionState?.total_questions ?? 0;
    const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : null;
    const summary = progress === null
        ? `${formatPhase(sessionState?.phase)}. ${userCount} user answers.`
        : `${progress}% complete. ${answeredCount} of ${totalQuestions} answered.`;

    return (
        <div className="oc-mobile-details">
            <Sheet>
                <SheetTrigger asChild>
                    <Button type="button" variant="ghost" className="oc-mobile-details-trigger">
                        <span className="oc-card-icon">
                            {experience.shortLabel === 'Chat' ? <Keyboard className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1 text-left">
                            <span className="oc-kicker">Current experience</span>
                            <span className="oc-card-title block truncate">{experience.label}</span>
                            <span className="oc-card-copy mt-1 block">{summary}</span>
                        </span>
                        <span className="oc-mobile-details-action">Details</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className={cn('oc-mobile-details-sheet', `is-${experience.shortLabel.toLowerCase()}`)}>
                    <SheetHeader className="oc-mobile-details-header">
                        <SheetTitle>{experience.label} details</SheetTitle>
                        <SheetDescription>{latestAssistant ? textPreview(latestAssistant.content) : summary}</SheetDescription>
                    </SheetHeader>
                    <div className="oc-mobile-details-scroll">
                        {children}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex min-h-[54vh] flex-col items-center justify-center text-center">
            <div className="oc-loading-mark">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h2 className="oc-empty-title">Loading conversation</h2>
            <p className="oc-empty-copy">Connecting the React chat frontend to the Laravel backend API.</p>
        </div>
    );
}

function EmptyState({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
    return (
        <div className="flex min-h-[54vh] flex-col items-center justify-center text-center">
            <div className="oc-empty-mark">
                <BadgeCheck className="h-7 w-7" />
            </div>
            <Badge className="oc-mode-badge mb-4" variant="outline">
                Assistant-led setup
            </Badge>
            <h2 className="oc-empty-title">Interview ready</h2>
            <p className="oc-empty-copy">
                Start in chat, then Officer Charles will guide the setup inside the conversation.
            </p>
            <div className="mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
                {starterPrompts.map((prompt, index) => (
                    <button key={prompt} type="button" onClick={() => onSelectPrompt(prompt)} className="oc-starter-card">
                        <span className="oc-starter-index">{index + 1}</span>
                        <span>{prompt}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function LiveInterviewStage({
    connected,
    connecting,
    error,
    onStart,
    recording,
    speaking,
}: {
    connected: boolean;
    connecting: boolean;
    error: string | null;
    onStart: () => void;
    recording: boolean;
    speaking: boolean;
}) {
    return (
        <section className="oc-live-stage">
            <div className="oc-live-main">
                <div className="oc-live-copy">
                    <h2 className="oc-empty-title">Live interview with Officer Charles</h2>
                </div>

                <div className={cn('oc-live-avatar-zone', !connected && 'has-stage-start')}>
                    <div className={cn('oc-live-avatar-wrap', connected && 'is-connected', recording && 'is-recording', speaking && 'is-speaking')}>
                        <div className="oc-live-avatar-stack" role="img" aria-label="Officer Charles avatar">
                            <img
                                src="/assets/images/assistant.png"
                                alt=""
                                aria-hidden="true"
                                className="oc-live-avatar oc-live-avatar-still"
                                draggable="false"
                            />
                            <img
                                src="/assets/images/assistant.gif"
                                alt=""
                                aria-hidden="true"
                                className="oc-live-avatar oc-live-avatar-speaking"
                                draggable="false"
                            />
                        </div>
                        {connecting && (
                            <div className="oc-live-avatar-loader">
                                <Loader2 className="h-9 w-9 animate-spin" />
                            </div>
                        )}
                    </div>
                    {!connected && (
                        <div className="oc-live-stage-start">
                            <LiveStartControl
                                connected={connected}
                                connecting={connecting}
                                onStart={onStart}
                            />
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="oc-error-banner mt-4">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </section>
    );
}

function LiveMicControls({
    connected,
    onEnd,
    onToggleRecording,
    recording,
}: {
    connected: boolean;
    onEnd: () => void;
    onToggleRecording: () => void;
    recording: boolean;
}) {
    if (!connected) {
        return null;
    }

    const buttonLabel = recording ? 'Send answer' : 'Start speaking';

    return (
        <footer className="oc-live-control-wrap">
            <div className="oc-live-control-panel">
                <Button
                    type="button"
                    onClick={onToggleRecording}
                    className={cn('oc-live-mic-button', recording && 'is-recording')}
                    aria-label={buttonLabel}
                >
                    <Mic className="h-6 w-6" />
                </Button>
                <span className="oc-live-mic-label">{buttonLabel}</span>
                {connected && (
                    <Button type="button" variant="ghost" onClick={onEnd} className="oc-live-end-inline">
                        <PhoneOff className="h-4 w-4" />
                        End
                    </Button>
                )}
            </div>
        </footer>
    );
}

function LiveStartControl({
    connected,
    connecting,
    onStart,
}: {
    connected: boolean;
    connecting: boolean;
    onStart: () => void;
}) {
    if (connected) {
        return null;
    }

    return (
        <footer className="oc-live-control-wrap oc-live-start-control">
            <div className="oc-live-control-panel">
                <Button
                    type="button"
                    onClick={onStart}
                    disabled={connecting}
                    className="oc-live-mic-button"
                    aria-label="Start live interview"
                >
                    {connecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5" />}
                </Button>
                <span className="oc-live-mic-label">{connecting ? 'Starting...' : 'Start live interview'}</span>
            </div>
        </footer>
    );
}

function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user';
    const failed = message.status === 'failed';
    const pending = message.status === 'pending';

    return (
        <article className={cn('flex gap-3 sm:gap-4', isUser ? 'justify-end' : 'justify-start')}>
            {!isUser && (
                <Avatar className="oc-avatar oc-avatar-assistant mt-1">
                    <AvatarFallback>OC</AvatarFallback>
                </Avatar>
            )}

            <div className={cn('flex max-w-[88%] flex-col gap-1.5 sm:max-w-[76%]', isUser ? 'items-end' : 'items-start')}>
                {isFinalReport(message.content) && !isUser ? (
                    <div className="oc-report-card">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--oc-border)] pb-3">
                            <h3 className="oc-card-title">Visa Interview Performance Report</h3>
                            <Badge className="oc-mode-badge" variant="outline">
                                Consular evaluation
                            </Badge>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                    </div>
                ) : (
                    <div className={cn(isUser ? 'oc-user-bubble' : 'oc-assistant-bubble', failed && 'is-failed', pending && 'is-pending')}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                )}

                <div className="oc-message-meta">
                    <span>{formatTime(message.created_at)}</span>
                    {pending && <span>Sending</span>}
                    {failed && <span className="text-rose-500">Not sent</span>}
                </div>
            </div>

            {isUser && (
                <Avatar className="oc-avatar oc-avatar-user mt-1">
                    <AvatarFallback>
                        <User className="h-4 w-4" />
                    </AvatarFallback>
                </Avatar>
            )}
        </article>
    );
}

function ThinkingBubble() {
    return (
        <article className="flex justify-start gap-3 sm:gap-4">
            <Avatar className="oc-avatar oc-avatar-assistant mt-1">
                <AvatarFallback>OC</AvatarFallback>
            </Avatar>
            <div className="oc-assistant-bubble">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--oc-accent)]" />
                    <span>Officer Charles is reviewing your response...</span>
                </div>
            </div>
        </article>
    );
}
