import { create } from 'zustand';
import { type PlayerRef } from "@remotion/player";

export interface RemotionPlayerRef {
    playerRef: PlayerRef | null;
    setPlayerRef: (ref: PlayerRef | null) => void;
    durationMs: number;
    setDurationMs: (duration: number) => void;
    fps: number;
    setFps: (fps: number) => void
    loadVideo: boolean;
    setLoadVideo: (load: boolean) => void;
    cropTimeMs: number;
    setCropTimeMs: (time: number) => void;
}

interface PlayerStore {
    playerRef: PlayerRef | null;
    setPlayerRef: (ref: PlayerRef | null) => void;
    durationMs: number;
    setDurationMs: (duration: number) => void;
    fps: number;
    setFps: (fps: number) => void
    loadVideo: boolean;
    setLoadVideo: (load: boolean) => void;
    cropTimeMs: number;
    setCropTimeMs: (time: number) => void;
}

export const usePlayerStore = create<PlayerStore>((set: any) => ({
    playerRef: null,
    setPlayerRef: (ref: PlayerRef | null) => {
        set({ playerRef: ref });
    },
    durationMs: 0,
    setDurationMs: (duration: number) => {
        set({ durationMs: duration });
    },
    fps: 30,
    setFps: (fps: number) => {
        set({ fps })
    },
    loadVideo: false,
    setLoadVideo: (load: boolean) => {
        set({ loadVideo: load });
    },
    cropTimeMs: 0,
    setCropTimeMs: (time: number) => {
        set({ cropTimeMs: time });
    }
}));
