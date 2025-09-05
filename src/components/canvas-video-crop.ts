import { Canvas } from 'fabric';
import type { PlayerRef } from '@remotion/player';

type SetDurationMs = (durationMs: number) => void;
type SetCropTimeMs = (time: number) => void;

export interface CanvasVideoCropOptions {
    width?: number;
    height?: number;
    backgroundColor?: string;
    selection?: boolean;
    playerRef?: PlayerRef | null;
    setDurationMs?: SetDurationMs;
    durationMs?: number;
    fps?: number;
    setCropTimeMs?: SetCropTimeMs;
}

export class CanvasVideoCrop extends Canvas {
    public playerRef: PlayerRef | null = null;
    public setDurationMs: (durationMs: number) => void;
    public setCropTimeMs: (time: number) => void;
    public durationMs: number;
    public totalDurationMs: number;
    public fps: number;
    constructor(element: HTMLCanvasElement, options: CanvasVideoCropOptions = {}) {
        // Llamar al constructor padre con las opciones estándar de Canvas
        super(element, {
            width: options.width,
            height: options.height,
            backgroundColor: options.backgroundColor,
            selection: options.selection,
        });

        // Asignar el playerRef
        this.playerRef = options.playerRef || null;
        this.setDurationMs = options.setDurationMs || (() => { });
        this.setCropTimeMs = options.setCropTimeMs || (() => { });
        this.durationMs = options.durationMs || 0;
        this.totalDurationMs = options.durationMs || 0;
        this.fps = options.fps || 30;
    }
}
