declare module 'wavtools' {
    export class WavRecorder {
        constructor(options?: { sampleRate?: number });
        begin(): Promise<void>;
        record(callback: (data: { mono: ArrayBuffer }) => void): Promise<void>;
        pause(): Promise<void>;
        end?(): Promise<void>;
    }

    export class WavStreamPlayer {
        constructor(options?: { sampleRate?: number });
        connect(context?: AudioContext): Promise<void>;
        add16BitPCM(data: Int16Array, trackId?: string): void;
        interrupt(): void;
        getFrequencies?(): { values: number[] };
    }
}
