import React, { useEffect, useMemo, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Pause, Play } from "lucide-react";
import { Button } from "./ui/button";
import { usePlayerStore } from "@/store/use-store";
import { OffthreadVideo } from "remotion";

interface RemotionPlayerProps {
  videoFile: File | null;
}

export function RemotionPlayer({ videoFile }: RemotionPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const playerRef = useRef<PlayerRef | null>(null);
  const { setPlayerRef, setFps } = usePlayerStore();
  const videoUrl = videoFile ? URL.createObjectURL(videoFile) : null;
  const { durationMs, cropTimeMs } = usePlayerStore();

  // Remotion composition configuration
  const composition = useMemo(() => {
    if (!videoFile) return null;

    return {
      id: "video-composition",
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 300, // 10 seconds at 30fps
    };
  }, [videoFile]);

  const handlePlayPause = () => {
    if (isPlaying) {
      playerRef.current?.pause();
    } else {
      playerRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const player = playerRef.current;
    if (player) {
      setPlayerRef(player);
      setFps(composition?.fps || 30);
    }
  }, [videoFile]);

  if (!videoFile || !videoUrl) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center">
            <Play className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-500">
              No hay video seleccionado
            </p>
            <p className="text-sm text-gray-400">
              Sube un video para verlo aquí
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-black rounded-lg overflow-hidden relative">
        {/* Remotion Player */}
        <Player
          ref={playerRef}
          component={VideoComposition}
          durationInFrames={
            Math.floor((durationMs * (composition?.fps || 30)) / 1000) || 1
          }
          compositionWidth={composition?.width || 1920}
          compositionHeight={composition?.height || 1080}
          fps={composition?.fps || 30}
          controls={false}
          style={{
            width: "100%",
            height: "auto",
            aspectRatio: "16/9",
          }}
          inputProps={{
            videoUrl: videoUrl,
            isPlaying: isPlaying,
            cropTimeMs: cropTimeMs,
          }}
        />
      </div>

      {/* Play/Pause Controls - Outside the video area */}
      <div className="flex items-center justify-center mt-4 space-x-4">
        <Button
          onClick={handlePlayPause}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
        >
          {isPlaying ? (
            <>
              <Pause className="h-5 w-5 mr-2" />
              Pausar
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Reproducir
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Video Component for Remotion
const VideoComposition: React.FC<{
  videoUrl: string;
  isPlaying: boolean;
  cropTimeMs: number;
}> = ({ videoUrl, cropTimeMs }) => {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <OffthreadVideo
        src={videoUrl}
        startFrom={(cropTimeMs * 30) / 1000}
        // startFrom={0}
        // trimBefore={0}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
};
