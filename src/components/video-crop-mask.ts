import { Rect } from 'fabric';

interface VideoCropMaskProps {
    maskColor: string;
}

export class VideoCropMask extends Rect {
    private cropLeft: number = 0;
    private cropTop: number = 0;
    private cropWidth: number = 0;
    private cropHeight: number = 0;
    private maskColor: string = 'rgba(0, 0, 0, 0.7)';
    constructor(props: VideoCropMaskProps) {
        super({
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            fill: "transparent",
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false,
        });
        this.maskColor = props.maskColor;
    }

    /**
     * Actualiza la posición y tamaño del área de crop
     */
    public updateCropArea(cropLeft: number, cropTop: number, cropWidth: number, cropHeight: number): void {
        this.cropLeft = cropLeft;
        this.cropTop = cropTop;
        this.cropWidth = cropWidth;
        this.cropHeight = cropHeight;
        this.set('dirty', true);
        if (this.canvas) {
            this.canvas.requestRenderAll();
        }
    }

    /**
     * Dibuja la máscara con el hueco
     */
    public _render(ctx: CanvasRenderingContext2D): void {
        const left = -this.width / 2;
        const top = -this.height / 2;
        const width = this.width || 0;
        const height = this.height || 0;

        // Guardar el estado del contexto
        ctx.save();

        // Crear el hueco transparente en el área del crop
        const cropLeftRelative = this.cropLeft - (this.left || 0);
        const cropTopRelative = this.cropTop - (this.top || 0);

        // Dibujar la máscara en 4 rectángulos alrededor del área del crop
        const cropX = left + cropLeftRelative;
        const cropY = top + cropTopRelative;
        const cropW = this.cropWidth;
        const cropH = this.cropHeight;

        ctx.fillStyle = this.maskColor;

        // Rectángulo superior
        if (cropY > top) {
            ctx.fillRect(left, top, width, cropY - top);
        }

        // Rectángulo inferior
        if (cropY + cropH < top + height) {
            ctx.fillRect(left, cropY + cropH, width, (top + height) - (cropY + cropH));
        }

        // Rectángulo izquierdo
        if (cropX > left) {
            ctx.fillRect(left, cropY, cropX - left, cropH);
        }

        // Rectángulo derecho
        if (cropX + cropW < left + width) {
            ctx.fillRect(cropX + cropW, cropY, (left + width) - (cropX + cropW), cropH);
        }

        // Restaurar el estado del contexto
        ctx.restore();
    }
}
