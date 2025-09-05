import { Rect } from 'fabric';
import { Input, ALL_FORMATS, BlobSource, UrlSource, CanvasSink } from 'mediabunny';

export interface VideoThumbnailRectOptions {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    selectable?: boolean;
    evented?: boolean;
    videoFile?: File | string;
    thumbnailCount?: number;
    thumbnailSize?: number;
}

export class VideoThumbnailRect extends Rect {
    private videoFile: File | string | null = null;
    private thumbnailCount: number = 16;
    private thumbnailSize: number = 200;
    private thumbnails: HTMLCanvasElement[] = [];
    private isGenerating: boolean = false;
    private generationPromise: Promise<void> | null = null;

    constructor(options: VideoThumbnailRectOptions = {}) {
        super({
            left: options.left || 0,
            top: options.top || 0,
            width: options.width || 200,
            height: options.height || 100,
            fill: options.fill || '#374151',
            stroke: options.stroke || '#6b7280',
            strokeWidth: options.strokeWidth || 1,
            selectable: options.selectable !== false,
            evented: options.evented !== false,
            lockMovementX: true,
            lockMovementY: true,
            lockRotation: true,
            lockScalingX: true,
            lockScalingY: true,
            lockSkewingX: true,
            lockSkewingY: true,
            hasControls: false,
            hasBorders: false,
        });
        this.selectable = false;
        this.evented = false;
        this.videoFile = options.videoFile || null;
        this.thumbnailCount = options.thumbnailCount || 16;
        this.thumbnailSize = options.thumbnailSize || 200;
    }

    /**
     * Método estático para crear y generar miniaturas de forma asíncrona
     */
    static async createWithThumbnails(
        options: VideoThumbnailRectOptions
    ): Promise<VideoThumbnailRect> {
        const videoRect = new VideoThumbnailRect(options);

        if (options.videoFile) {
            await videoRect.generateThumbnails();
        }

        return videoRect;
    }

    /**
 * Genera las miniaturas del video y las almacena en el array thumbnails
 */
    async generateThumbnails(): Promise<void> {
        if (!this.videoFile) {
            console.warn('No video file provided for thumbnail generation');
            return;
        }

        // Si ya está generando, esperar a que termine
        if (this.isGenerating && this.generationPromise) {
            return this.generationPromise;
        }

        // Si ya tiene miniaturas, no regenerar
        if (this.thumbnails.length > 0) {
            return;
        }

        this.isGenerating = true;
        this.generationPromise = this._doGenerateThumbnails();

        try {
            await this.generationPromise;
        } finally {
            this.isGenerating = false;
            this.generationPromise = null;
        }
    }

    private async _doGenerateThumbnails(): Promise<void> {
        try {
            // Create a new input from the resource
            const source = this.videoFile instanceof File
                ? new BlobSource(this.videoFile)
                : new UrlSource(this.videoFile as string);

            const input = new Input({
                source: source!,
                formats: ALL_FORMATS, // Accept all formats
            });

            const videoTrack = await input.getPrimaryVideoTrack();
            if (!videoTrack) {
                throw new Error('File has no video track.');
            }

            if (videoTrack.codec === null) {
                throw new Error('Unsupported video codec.');
            }

            if (!(await videoTrack.canDecode())) {
                throw new Error('Unable to decode the video track.');
            }

            // Compute width and height of the thumbnails such that the larger dimension is equal to THUMBNAIL_SIZE
            const width = videoTrack.displayWidth > videoTrack.displayHeight
                ? this.thumbnailSize
                : Math.floor(this.thumbnailSize * videoTrack.displayWidth / videoTrack.displayHeight);
            const height = videoTrack.displayHeight > videoTrack.displayWidth
                ? this.thumbnailSize
                : Math.floor(this.thumbnailSize * videoTrack.displayHeight / videoTrack.displayWidth);

            // Prepare the timestamps for the thumbnails, equally spaced between the first and last timestamp of the video
            const firstTimestamp = await videoTrack.getFirstTimestamp();
            const lastTimestamp = await videoTrack.computeDuration();
            const timestamps = Array.from(
                { length: this.thumbnailCount },
                (_, i) => firstTimestamp + i * (lastTimestamp - firstTimestamp) / this.thumbnailCount,
            );

            // Create a CanvasSink for extracting resized frames from the video track
            const sink = new CanvasSink(videoTrack, {
                width: Math.floor(width * window.devicePixelRatio),
                height: Math.floor(height * window.devicePixelRatio),
                fit: 'fill',
            });

            // Clear previous thumbnails
            this.thumbnails = [];

            // Iterate over all thumbnail canvases
            let i = 0;
            for await (const wrappedCanvas of sink.canvasesAtTimestamps(timestamps)) {
                if (wrappedCanvas) {
                    const canvasElement = wrappedCanvas.canvas as HTMLCanvasElement;
                    // Store the canvas element
                    this.thumbnails.push(canvasElement);
                } else {
                    console.warn(`Failed to generate thumbnail ${i + 1}/${this.thumbnailCount}`);
                }
                i++;
            }

            // Forzar el re-render del objeto para mostrar las miniaturas
            this.set('dirty', true);
            if (this.canvas) {
                this.canvas.requestRenderAll();
            }

        } catch (error) {
            console.error('❌ Error generating thumbnails:', error);
            throw error;
        }
    }

    /**
 * Obtiene las miniaturas generadas
 */
    getThumbnails(): HTMLCanvasElement[] {
        return this.thumbnails;
    }

    /**
     * Obtiene las miniaturas como base64
     */
    getThumbnailsAsBase64(): string[] {
        return this.thumbnails.map(canvas => canvas.toDataURL('image/png', 0.8));
    }

    /**
     * Obtiene las miniaturas con información detallada
     */
    getThumbnailsWithInfo(): Array<{
        canvas: HTMLCanvasElement;
        base64: string;
        width: number;
        height: number;
        index: number;
    }> {
        return this.thumbnails.map((canvas, index) => ({
            canvas,
            base64: canvas.toDataURL('image/png', 0.8),
            width: canvas.width,
            height: canvas.height,
            index: index + 1
        }));
    }

    /**
     * Establece el archivo de video
     */
    setVideoFile(videoFile: File | string): void {
        this.videoFile = videoFile;
    }

    /**
     * Obtiene el archivo de video actual
     */
    getVideoFile(): File | string | null {
        return this.videoFile;
    }

    /**
     * Establece el número de miniaturas a generar
     */
    setThumbnailCount(count: number): void {
        this.thumbnailCount = count;
    }

    /**
     * Establece el tamaño de las miniaturas
     */
    setThumbnailSize(size: number): void {
        this.thumbnailSize = size;
    }

    /**
     * Limpia las miniaturas generadas
     */
    clearThumbnails(): void {
        this.thumbnails = [];
    }

    /**
     * Actualiza el layout de las miniaturas sin regenerarlas desde el video
     * Útil cuando se redimensiona el canvas
     */
    updateThumbnailLayout(): void {
        if (this.thumbnails.length === 0) {
            return;
        }

        // Marcar como sucio para forzar el re-render
        this.set('dirty', true);

        // Solicitar re-render del canvas
        if (this.canvas) {
            this.canvas.requestRenderAll();
        }
    }

    /**
     * Obtiene información sobre las miniaturas actualmente visibles
     */
    getVisibleThumbnailsInfo(): {
        totalGenerated: number;
        currentlyVisible: number;
        thumbnailWidth: number;
        canvasWidth: number;
    } {
        const layout = this.getThumbnailLayout();
        return {
            totalGenerated: this.thumbnails.length,
            currentlyVisible: layout.cols,
            thumbnailWidth: layout.thumbWidth,
            canvasWidth: this.width || 0
        };
    }

    /**
     * Configura el layout de las miniaturas
     */
    private getThumbnailLayout() {
        const totalThumbnails = this.thumbnails.length;
        if (totalThumbnails === 0) return { rows: 0, cols: 0, thumbWidth: 0, thumbHeight: 0 };

        const canvasWidth = this.width || 0;
        const minThumbnailWidth = 20; // Ancho mínimo para cada miniatura

        // Calcular cuántas miniaturas podemos mostrar basado en el ancho disponible
        const maxThumbnails = Math.floor(canvasWidth / minThumbnailWidth);
        console.log({ maxThumbnails });
        const cols = Math.min(totalThumbnails, maxThumbnails);
        const rows = 1; // Una sola fila

        const thumbWidth = canvasWidth / cols; // Dividir el ancho entre el número de miniaturas a mostrar
        const thumbHeight = this.height || 0; // Usar toda la altura

        return { rows, cols, thumbWidth, thumbHeight };
    }

    /**
     * Sobrescribe el método _render para dibujar las miniaturas dentro del objeto
     */
    public _render(ctx: CanvasRenderingContext2D): void {
        // Llamar al método _render del padre para dibujar el rectángulo base
        super._render(ctx);

        // Si no hay miniaturas, no dibujar nada más
        if (this.thumbnails.length === 0) {
            return;
        }

        // Guardar el estado del contexto
        ctx.save();

        // Obtener las coordenadas absolutas del objeto en el canvas
        const left = -this.width / 2; // top-left corner
        const top = -this.height / 2;  // top-left corner
        const width = this.width || 0;
        const height = this.height || 0;

        // Crear un área de recorte
        ctx.beginPath();
        ctx.rect(left, top, width, height);
        ctx.clip();

        // Obtener el layout de las miniaturas
        const layout = this.getThumbnailLayout();
        const { cols, thumbWidth, thumbHeight } = layout;

        // Dibujar solo las miniaturas que caben en el ancho disponible
        for (let i = 0; i < cols; i++) {
            const canvas = this.thumbnails[i];
            if (!canvas) continue;

            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = left + (col * thumbWidth);
            const y = top + (row * thumbHeight);

            // Dibujar la miniatura
            ctx.drawImage(
                canvas,
                x,
                y,
                thumbWidth,
                thumbHeight
            );

            // Dibujar un borde sutil alrededor de cada miniatura
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'; // blue-500 con más opacidad
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, thumbWidth, thumbHeight);

            // Dibujar el número de miniatura en la esquina
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(x + 2, y + 2, 20, 16);

            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.fillText(`${i + 1}`, x + 6, y + 12);
        }

        // Restaurar el estado del contexto
        ctx.restore();
    }
}
