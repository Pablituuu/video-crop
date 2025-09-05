import { Control, Rect } from 'fabric';
import { createMediaControls } from './controls/controls';
import type { CanvasVideoCrop } from './canvas-video-crop';

export interface VideoCropRectOptions {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    selectable?: boolean;
    evented?: boolean;
    maxDurationMs?: number;
    initialDurationMs?: number;
}

export class VideoCropRect extends Rect {
    public initialWidth: number = 0;
    public initialDurationMs: number = 0;
    public maxDurationMs: number = 0;
    public maxWidth: number = 0;
    constructor(options: VideoCropRectOptions = {}) {
        super({
            left: options.left || 0,
            top: options.top || 0,
            width: options.width || 200,
            height: options.height || 100,
            fill: 'rgba(255, 255, 255, 0)', // Fondo semi-transparente
            lockMovementY: true,  // Bloquear movimiento vertical
            lockRotation: true,   // Bloquear rotación
        });
        this.initialWidth = options.width || 200;
        this.initialDurationMs = options.initialDurationMs || 0;
        this.maxDurationMs = options.maxDurationMs || 0;
        this.on("moving", (e) => {
            const target = e.transform.target as VideoCropRect;
            if (target.left <= 0) {
                target.left = 0;
            }
            if (target.width >= this.initialWidth && target.left >= 0) {
                target.left = 0
            }
            if (target.left + target.width >= this.initialWidth) {
                target.left = target.initialWidth - target.width
            }
        })
        this.on("moving", (e) => {
            const target = e.transform.target as VideoCropRect;
            const canvas = target.canvas as CanvasVideoCrop;
            const totalWidth = target.initialWidth
            const factorWidth = target.left / totalWidth
            canvas.setCropTimeMs(canvas.totalDurationMs * factorWidth)
        })
        this.on("modified", (e) => {
            if (this.left < 0) {
                this.set("left", 0)
            }
            if (e.action !== "drag") {
                const maxWidth = this.initialWidth
                const factorWidth = this.width / maxWidth
                const canvas = this.canvas as CanvasVideoCrop
                canvas.setDurationMs(canvas.totalDurationMs * factorWidth)
                canvas.set({ durationMs: canvas.totalDurationMs * factorWidth })
            }
        })
    }

    static createControls(): { controls: Record<string, Control> } {
        return { controls: createMediaControls() };
    }

    public syncWithVideoThumbnailRect(videoRect: any): void {
        this.set({
            left: videoRect.left,
            top: videoRect.top,
            width: videoRect.width,
            height: videoRect.height
        });

        this.initialWidth = videoRect.width;
        if (this.maxDurationMs) {
            const totalDurationMs = this.initialDurationMs
            const factorDuration = this.maxDurationMs / totalDurationMs
            this.set({
                width: this.initialWidth * factorDuration,
                maxWidth: this.initialWidth * factorDuration
            })
        }
    }

    /**
     * Obtiene el porcentaje de posición horizontal (0-100)
     */
    public getHorizontalPercentage(canvasWidth: number): number {
        const percentage = ((this.left || 0) / canvasWidth) * 100;
        return Math.max(0, Math.min(100, percentage));
    }

    /**
     * Obtiene el porcentaje de ancho (0-100)
     */
    public getWidthPercentage(canvasWidth: number): number {
        const percentage = ((this.width || 0) / canvasWidth) * 100;
        return Math.max(0, Math.min(100, percentage));
    }

    /**
     * Establece la posición horizontal por porcentaje (0-100)
     */
    public setHorizontalPercentage(percentage: number, canvasWidth: number): void {
        const clampedPercentage = Math.max(0, Math.min(100, percentage));
        const newLeft = (clampedPercentage / 100) * canvasWidth;
        this.set('left', newLeft);
    }

    /**
     * Establece el ancho por porcentaje (0-100)
     */
    public setWidthPercentage(percentage: number, canvasWidth: number): void {
        const clampedPercentage = Math.max(0, Math.min(100, percentage));
        const newWidth = (clampedPercentage / 100) * canvasWidth;
        this.set('width', newWidth);

        console.log('📏 VideoCropRect width set:', {
            percentage: clampedPercentage,
            width: newWidth,
            canvasWidth
        });
    }

    /**
     * Asegura que el rectángulo no se salga de los límites del canvas
     */
    public constrainToCanvas(canvasWidth: number): void {
        const currentLeft = this.left || 0;
        const currentWidth = this.width || 0;

        // Asegurar que no se salga por la izquierda
        const minLeft = 0;
        const maxLeft = canvasWidth - currentWidth;

        const constrainedLeft = Math.max(minLeft, Math.min(maxLeft, currentLeft));

        if (constrainedLeft !== currentLeft) {
            this.set('left', constrainedLeft);
            console.log('🔒 VideoCropRect constrained horizontally:', {
                oldLeft: currentLeft,
                newLeft: constrainedLeft,
                canvasWidth
            });
        }
    }
}
