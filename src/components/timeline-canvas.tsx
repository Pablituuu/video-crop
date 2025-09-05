import { useEffect, useRef } from "react";
import { Rect, Line } from "fabric";
import { VideoThumbnailRect } from "./video-thumbnail-rect";
import { VideoCropRect } from "./video-crop-rect";
import { CanvasVideoCrop } from "./canvas-video-crop";
import { usePlayerStore } from "@/store/use-store";

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
  } = usePlayerStore();

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

          canvas.add(videoCropRect);

          canvas.renderAll();
        })
        .catch((_) => {});
    }

    // Create playhead (red line)
    const playhead = new Line([0, 0, 0, 80], {
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });

    canvas.add(playhead);

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

      canvas.renderAll();
    };

    window.addEventListener("resize", handleResize);

    // Handle mouse clicks on timeline
    canvas.on("mouse:down", (event) => {
      if (event.target === timelineObject) {
        const pointer = canvas.getPointer(event.e);
        // Move playhead
        playhead.set("x1", pointer.x);
        playhead.set("x2", pointer.x);
        canvas.renderAll();
      }
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
    };
  }, [videoFile, playerRef, loadVideo]);

  if (!playerRef) {
    return <div>No player ref</div>;
  }

  return (
    <div className="w-full bg-gray-800 p-2" id="canvas-container">
      <canvas ref={canvasRef} className="w-full" style={{ height: "80px" }} />
    </div>
  );
}
