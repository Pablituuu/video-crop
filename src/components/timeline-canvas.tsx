import { useEffect, useRef } from "react";
import { Rect } from "fabric";
import { VideoThumbnailRect } from "./video-thumbnail-rect";
import { VideoCropRect } from "./video-crop-rect";
import { VideoCropMask } from "./video-crop-mask";
import { CanvasVideoCrop } from "./canvas-video-crop";
import { usePlayerStore } from "@/store/use-store";
import { useCurrentPlayerFrame } from "@/assets/hooks/use-current-frame";

interface TimelineCanvasProps {
  videoFile: File | null;
  maxDurationMs?: number;
}

export function TimelineCanvas({
  videoFile,
  maxDurationMs,
}: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<CanvasVideoCrop | null>(null);
  const {
    playerRef,
    setDurationMs,
    durationMs,
    fps,
    loadVideo,
    setCropTimeMs,
    totalDurationMs,
    cropTimeMs,
  } = usePlayerStore();
  const currentFrame = useCurrentPlayerFrame(playerRef!);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!playerRef) return;
    if (!loadVideo) return;
    if (maxDurationMs) {
      setDurationMs(maxDurationMs);
    }
    const initialDurationMs = durationMs;
    // Get the actual container width
    const containerWidth =
      canvasRef.current.parentElement?.clientWidth || window.innerWidth;
    const canvasWidth = containerWidth - 16; // Subtract padding (8px on each side)
    // Initialize CanvasVideoCrop
    const canvas = new CanvasVideoCrop(canvasRef.current, {
      width: canvasWidth,
      height: 80,
      backgroundColor: "#1f2937", // gray-800
      selection: false,
      playerRef,
      setDurationMs,
      durationMs: initialDurationMs,
      fps,
      setCropTimeMs,
    });

    fabricCanvasRef.current = canvas;

    // Create timeline object that spans the full width
    const timelineObject = new Rect({
      left: 0,
      top: 0,
      width: canvasWidth,
      height: 80,
      fill: "#374151", // gray-700
      stroke: "#6b7280", // gray-500
      strokeWidth: 1,
      selectable: false,
      evented: false,
    });

    // Add timeline object to canvas
    canvas.add(timelineObject);

    // Example: Create a VideoThumbnailRect if videoFile is provided
    if (videoFile) {
      // Create VideoThumbnailRect and wait for thumbnails to be generated
      VideoThumbnailRect.createWithThumbnails({
        left: 0, // Comenzar desde el borde izquierdo
        top: 0, // Comenzar desde el borde superior
        width: canvasWidth, // Usar el ancho completo del canvas
        height: 80, // Usar la altura completa del canvas
        fill: "rgba(55, 65, 81, 0.3)", // Fondo semi-transparente
        stroke: "#3b82f6",
        strokeWidth: 2,
        videoFile: videoFile,
        thumbnailCount: 16, // Más miniaturas para el ancho completo
        thumbnailSize: 120,
      })
        .then((videoThumbnailRect) => {
          // Add VideoThumbnailRect to canvas (background layer)
          canvas.add(videoThumbnailRect);

          // Create VideoCropRect (foreground layer)
          const videoCropRect = new VideoCropRect({
            left: 100, // Start position
            top: 0,
            width: 200, // Initial width
            height: 80, // Same height as VideoThumbnailRect
            strokeWidth: 3,
            maxDurationMs: maxDurationMs || 0,
            initialDurationMs: initialDurationMs || 0,
          });

          // Sync with VideoThumbnailRect dimensions
          videoCropRect.syncWithVideoThumbnailRect(videoThumbnailRect);

          // Create and add mask
          const mask = new VideoCropMask({
            maskColor: "rgba(255, 0, 0, 0.7)",
          });
          mask.set({
            left: 0,
            top: 0,
            width: canvasWidth,
            height: 80,
          });
          mask.updateCropArea(
            videoCropRect.left || 0,
            videoCropRect.top || 0,
            videoCropRect.width || 0,
            videoCropRect.height || 0
          );

          canvas.add(mask);
          canvas.add(videoCropRect);

          const updateMask = () => {
            mask.updateCropArea(
              videoCropRect.left || 0,
              videoCropRect.top || 0,
              videoCropRect.width || 0,
              videoCropRect.height || 0
            );
          };

          videoCropRect.on("moving", () => {
            updateMask();
          });
          videoCropRect.on("resizing", () => {
            updateMask();
          });

          videoCropRect.on("modified", () => {
            updateMask();
          });

          canvas.renderAll();
        })
        .catch((_) => {});
    }

    // Handle canvas resize
    const handleResize = () => {
      const newContainerWidth =
        document.getElementById("canvas-container")?.clientWidth ||
        window.innerWidth;
      const newCanvasWidth = newContainerWidth - 16;

      canvas.setWidth(newCanvasWidth);
      canvas.setHeight(80);

      // Update timeline object width
      timelineObject.set("width", newCanvasWidth);

      // Update VideoThumbnailRect width and recreate thumbnails
      const videoThumbnailRect = canvas
        .getObjects()
        .find((obj) => obj instanceof VideoThumbnailRect) as VideoThumbnailRect;
      if (videoThumbnailRect) {
        // Update the width of VideoThumbnailRect
        videoThumbnailRect.set("width", newCanvasWidth);

        // Update thumbnail layout without regenerating from video
        videoThumbnailRect.updateThumbnailLayout();
      }

      // Update VideoCropRect if it exists
      const videoCropRect = canvas
        .getObjects()
        .find((obj) => obj instanceof VideoCropRect) as VideoCropRect;
      if (videoCropRect) {
        videoCropRect.syncWithVideoThumbnailRect(videoThumbnailRect);
      }

      // Update mask if it exists
      const mask = canvas
        .getObjects()
        .find((obj) => obj instanceof VideoCropMask) as VideoCropMask;
      if (mask) {
        mask.set({
          width: newCanvasWidth,
          height: 80,
        });
        if (videoCropRect) {
          mask.updateCropArea(
            videoCropRect.left || 0,
            videoCropRect.top || 0,
            videoCropRect.width || 0,
            videoCropRect.height || 0
          );
        }
      }

      canvas.renderAll();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
    };
  }, [videoFile, playerRef, loadVideo]);

  // Calculate playhead position based on current frame
  const totalFrames =
    totalDurationMs > 0 ? Math.floor((totalDurationMs * fps) / 1000) : 1;
  const playheadPosition =
    totalFrames > 0
      ? (currentFrame * (canvasRef?.current?.parentElement?.clientWidth || 0)) /
        totalFrames
      : 0;
  const factorCropFrames = (cropTimeMs * fps) / 1000;
  const playheadPositionCrop =
    (factorCropFrames * (canvasRef?.current?.parentElement?.clientWidth || 0)) /
    totalFrames;

  if (!playerRef) {
    return <div>No player ref</div>;
  }

  return (
    <div className="w-full bg-gray-800 p-2" id="canvas-container">
      <div className="relative cursor-pointer">
        <canvas ref={canvasRef} className="w-full" style={{ height: "80px" }} />

        {/* HTML Playhead */}
        <div
          className="absolute top-2 bottom-2 w-px bg-red-500 pointer-events-none z-10"
          style={{
            left: `calc(${playheadPosition + playheadPositionCrop}px + 2px)`,
            // transform: "translateX(50%)",
          }}
        >
          {/* Playhead handle */}
          <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
        </div>
      </div>
    </div>
  );
}
