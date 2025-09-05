import { RemotionPlayer } from "./remotion-player";

interface VideoDisplayProps {
  videoFile: File | null;
}

export function VideoDisplay({ videoFile }: VideoDisplayProps) {
  return <RemotionPlayer videoFile={videoFile} />;
}
