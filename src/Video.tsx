import React from "react";
import { AbsoluteFill, Video } from "remotion";

interface VideoProps {
  videoUrl: string;
}

export const VideoComposition: React.FC<VideoProps> = ({ videoUrl }) => {
  return (
    <AbsoluteFill>
      <Video src={videoUrl} />
    </AbsoluteFill>
  );
};
