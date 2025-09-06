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
    private videoAspectRatio: number = 16 / 9; // Video aspect ratio
    private videoWidth: number = 0;
    private videoHeight: number = 0;
    private blackThumbnail: HTMLCanvasElement | null = null;

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
     * Static method to create and generate thumbnails asynchronously
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
     * Calculates the video aspect ratio
     */
    private async calculateVideoAspectRatio(): Promise<void> {
        if (!this.videoFile) return;

        try {
            const source = this.videoFile instanceof File
                ? new BlobSource(this.videoFile)
                : new UrlSource(this.videoFile as string);

            const input = new Input({
                source: source!,
                formats: ALL_FORMATS,
            });

            const videoTrack = await input.getPrimaryVideoTrack();
            if (videoTrack) {
                this.videoWidth = videoTrack.displayWidth;
                this.videoHeight = videoTrack.displayHeight;
                this.videoAspectRatio = this.videoWidth / this.videoHeight;
            }
        } catch (error) {
            console.warn('⚠️ Could not calculate video aspect ratio, using default 16:9:', error);
            this.videoAspectRatio = 16 / 9;
        }
    }

    /**
     * Calculates the optimal number of thumbnails based on rectangle width
     */
    private calculateOptimalThumbnailCount(): number {
        const rectWidth = this.width || 0;
        const rectHeight = this.height || 0;

        if (rectWidth === 0 || rectHeight === 0) {
            return 16; // Default value
        }

        // Calculate the width each thumbnail should have maintaining aspect ratio
        const thumbnailHeight = rectHeight;
        const thumbnailWidth = thumbnailHeight * this.videoAspectRatio;

        // Calculate how many thumbnails fit in the available width
        const optimalCount = Math.floor(rectWidth / thumbnailWidth);

        // Ensure minimum of 1 and reasonable maximum
        const minThumbnails = 1;
        const maxThumbnails = Math.floor(rectWidth / 20); // Minimum 20px per thumbnail

        const finalCount = Math.max(minThumbnails, Math.min(optimalCount, maxThumbnails));

        return finalCount;
    }

    /**
     * Creates a black thumbnail to use when a complete thumbnail doesn't fit
     */
    private createBlackThumbnail(width: number, height: number): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        // Fill with solid black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Add subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);

        // Add indicator that it's an area without content
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('...', width / 2, height / 2);
        ctx.textAlign = 'left';

        console.log('🖤 Black thumbnail created:', { width, height });
        return canvas;
    }

    /**
     * Creates a black thumbnail if needed to fill remaining space
     */
    private createBlackThumbnailIfNeeded(): void {
        const layout = this.getThumbnailLayout();
        const { hasPartialThumbnail, remainingWidth, thumbHeight } = layout;

        if (hasPartialThumbnail && remainingWidth > 0) {
            // Create black thumbnail with remaining width
            this.blackThumbnail = this.createBlackThumbnail(
                Math.floor(remainingWidth * window.devicePixelRatio),
                Math.floor(thumbHeight * window.devicePixelRatio)
            );

            console.log('🖤 Black thumbnail added for remaining space:', {
                remainingWidth,
                thumbHeight,
                hasPartialThumbnail
            });
        } else {
            // Clear black thumbnail if not needed
            this.blackThumbnail = null;
        }
    }

    /**
     * Generates video thumbnails and stores them in the thumbnails array
 */
    async generateThumbnails(): Promise<void> {
        if (!this.videoFile) {
            console.warn('No video file provided for thumbnail generation');
            return;
        }

        // If already generating, wait for it to finish
        if (this.isGenerating && this.generationPromise) {
            return this.generationPromise;
        }

        // Calculate video aspect ratio first
        await this.calculateVideoAspectRatio();

        // Calculate optimal number of thumbnails based on current width
        this.thumbnailCount = this.calculateOptimalThumbnailCount();

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

            // Calculate thumbnail dimensions maintaining video aspect ratio
            const rectHeight = this.height || 80;
            const thumbnailHeight = rectHeight;
            const thumbnailWidth = thumbnailHeight * this.videoAspectRatio;

            // Use calculated dimensions for CanvasSink
            const width = Math.floor(thumbnailWidth * window.devicePixelRatio);
            const height = Math.floor(thumbnailHeight * window.devicePixelRatio);

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

            // Create black thumbnail if needed
            this.createBlackThumbnailIfNeeded();

            // Force object re-render to show thumbnails
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
     * Gets the generated thumbnails
 */
    getThumbnails(): HTMLCanvasElement[] {
        return this.thumbnails;
    }

    /**
     * Gets thumbnails as base64
     */
    getThumbnailsAsBase64(): string[] {
        return this.thumbnails.map(canvas => canvas.toDataURL('image/png', 0.8));
    }

    /**
     * Gets thumbnails with detailed information
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
     * Sets the video file
     */
    setVideoFile(videoFile: File | string): void {
        this.videoFile = videoFile;
    }

    /**
     * Gets the current video file
     */
    getVideoFile(): File | string | null {
        return this.videoFile;
    }

    /**
     * Sets the number of thumbnails to generate
     */
    setThumbnailCount(count: number): void {
        this.thumbnailCount = count;
    }

    /**
     * Sets the thumbnail size
     */
    setThumbnailSize(size: number): void {
        this.thumbnailSize = size;
    }

    /**
     * Clears generated thumbnails
     */
    clearThumbnails(): void {
        this.thumbnails = [];
        this.blackThumbnail = null;
    }

    /**
     * Forces thumbnail regeneration with new size
     */
    public regenerateThumbnails(): void {
        console.log('🔄 Forcing thumbnail regeneration...');
        this.thumbnails = [];
        this.generateThumbnails();
    }

    /**
     * Checks if there's a black area at the end of the timeline
     */
    public hasBlackAreaAtEnd(): boolean {
        const layout = this.getThumbnailLayout();
        return layout.hasPartialThumbnail;
    }

    /**
     * Gets the width of the black area at the end
     */
    public getBlackAreaWidth(): number {
        const layout = this.getThumbnailLayout();
        return layout.remainingWidth;
    }

    /**
     * Updates thumbnail layout without regenerating from video
     * Useful when canvas is resized
     */
    updateThumbnailLayout(): void {
        if (this.thumbnails.length === 0) {
            return;
        }

        // Recalculate optimal number of thumbnails for new size
        const newOptimalCount = this.calculateOptimalThumbnailCount();

        // If optimal number changed significantly, regenerate thumbnails
        if (Math.abs(newOptimalCount - this.thumbnailCount) > 2) {
            console.log('🔄 Thumbnail count changed significantly, regenerating...', {
                oldCount: this.thumbnailCount,
                newCount: newOptimalCount
            });

            // Clear existing thumbnails and regenerate
            this.thumbnails = [];
            this.blackThumbnail = null;
            this.thumbnailCount = newOptimalCount;
            this.generateThumbnails();
            return;
        }

        // Update black thumbnail if needed
        this.createBlackThumbnailIfNeeded();

        // Mark as dirty to force re-render
        this.set('dirty', true);

        // Request canvas re-render
        if (this.canvas) {
            this.canvas.requestRenderAll();
        }
    }

    /**
     * Gets information about currently visible thumbnails
     */
    getVisibleThumbnailsInfo(): {
        totalGenerated: number;
        currentlyVisible: number;
        thumbnailWidth: number;
        canvasWidth: number;
        hasBlackArea: boolean;
        blackAreaWidth: number;
    } {
        const layout = this.getThumbnailLayout();
        return {
            totalGenerated: this.thumbnails.length,
            currentlyVisible: layout.cols,
            thumbnailWidth: layout.thumbWidth,
            canvasWidth: this.width || 0,
            hasBlackArea: layout.hasPartialThumbnail,
            blackAreaWidth: layout.remainingWidth
        };
    }

    /**
     * Configures thumbnail layout
     */
    private getThumbnailLayout() {
        const totalThumbnails = this.thumbnails.length;
        if (totalThumbnails === 0) return { rows: 0, cols: 0, thumbWidth: 0, thumbHeight: 0, hasPartialThumbnail: false, remainingWidth: 0 };

        const canvasWidth = this.width || 0;
        const canvasHeight = this.height || 0;

        if (canvasWidth === 0 || canvasHeight === 0) {
            return { rows: 0, cols: 0, thumbWidth: 0, thumbHeight: 0, hasPartialThumbnail: false, remainingWidth: 0 };
        }

        // Calculate width each thumbnail should have maintaining aspect ratio
        const thumbnailHeight = canvasHeight;
        const thumbnailWidth = thumbnailHeight * this.videoAspectRatio;

        // Calculate how many thumbnails fit completely in available width
        const maxThumbnails = Math.floor(canvasWidth / thumbnailWidth);
        const cols = Math.min(totalThumbnails, maxThumbnails);
        const rows = 1; // Single row

        // Calculate remaining width after placing complete thumbnails
        const usedWidth = cols * thumbnailWidth;
        const remainingWidth = canvasWidth - usedWidth;

        // Detect if there's remaining area where a complete thumbnail doesn't fit
        // Only consider black area if:
        // 1. There's remaining space
        // 2. Space is less than complete thumbnail width
        // 3. There are more available thumbnails that can't be shown
        const hasPartialThumbnail = remainingWidth > 0 &&
            remainingWidth < thumbnailWidth &&
            cols < totalThumbnails &&
            remainingWidth >= 10; // Minimum 10px to consider black area

        // Use calculated width to maintain aspect ratio
        const finalThumbWidth = thumbnailWidth;
        const finalThumbHeight = thumbnailHeight;

        return {
            rows,
            cols,
            thumbWidth: finalThumbWidth,
            thumbHeight: finalThumbHeight,
            hasPartialThumbnail,
            remainingWidth
        };
    }

    /**
     * Overrides _render method to draw thumbnails inside the object
     */
    public _render(ctx: CanvasRenderingContext2D): void {
        // If no thumbnails, only draw base rectangle
        if (this.thumbnails.length === 0) {
            super._render(ctx);
            return;
        }

        // Save context state
        ctx.save();

        // Get absolute coordinates of object in canvas
        const left = -this.width / 2; // top-left corner
        const top = -this.height / 2;  // top-left corner
        const width = this.width || 0;
        const height = this.height || 0;

        // Create clipping area
        ctx.beginPath();
        ctx.rect(left, top, width, height);
        ctx.clip();

        // Get thumbnail layout
        const layout = this.getThumbnailLayout();
        const { cols, thumbWidth, thumbHeight, hasPartialThumbnail, remainingWidth } = layout;

        // Draw base rectangle background first
        ctx.fillStyle = (this.fill as string) || 'rgba(55, 65, 81, 0.3)';
        ctx.fillRect(left, top, width, height);

        // Draw rectangle border
        if (this.stroke) {
            ctx.strokeStyle = this.stroke as string;
            ctx.lineWidth = this.strokeWidth || 1;
            ctx.strokeRect(left, top, width, height);
        }

        // Draw only thumbnails that fit completely in available width
        for (let i = 0; i < cols; i++) {
            const canvas = this.thumbnails[i];
            if (!canvas) continue;

            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = left + (col * thumbWidth);
            const y = top + (row * thumbHeight);

            // Draw thumbnail maintaining aspect ratio
            ctx.drawImage(
                canvas,
                x,
                y,
                thumbWidth,
                thumbHeight
            );

            // Draw subtle border around each thumbnail
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'; // blue-500 with more opacity
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, thumbWidth, thumbHeight);

            // Draw thumbnail number in corner
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(x + 2, y + 2, 20, 16);

            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.fillText(`${i + 1}`, x + 6, y + 12);
        }

        // If there's a black thumbnail, draw it at the end
        if (this.blackThumbnail && hasPartialThumbnail && remainingWidth > 0) {
            const usedWidth = cols * thumbWidth;
            const blackAreaX = left + usedWidth;
            const blackAreaY = top;
            const blackAreaWidth = remainingWidth;
            const blackAreaHeight = thumbHeight;

            console.log('🖤 Drawing black thumbnail:', {
                blackAreaX,
                blackAreaY,
                blackAreaWidth,
                blackAreaHeight,
                remainingWidth,
                cols,
                thumbWidth
            });

            // Draw black thumbnail
            ctx.drawImage(
                this.blackThumbnail,
                blackAreaX,
                blackAreaY,
                blackAreaWidth,
                blackAreaHeight
            );

            // Draw border to maintain visual consistency
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(blackAreaX, blackAreaY, blackAreaWidth, blackAreaHeight);

            // Draw thumbnail number in corner (use "..." to indicate it's special)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(blackAreaX + 2, blackAreaY + 2, 20, 16);

            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.fillText('...', blackAreaX + 6, blackAreaY + 12);
        }

        // Restore context state
        ctx.restore();
    }
}
