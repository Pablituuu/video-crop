import { useState } from "react";
import { VideoUpload } from "./components/video-upload";
import { VideoDisplay } from "./components/video-display";
import { TimelineCanvas } from "./components/timeline-canvas";
import "./App.css";
import { usePlayerStore } from "./store/use-store";

function App() {
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const { playerRef } = usePlayerStore();

  const handleVideoSelect = (file: File | null) => {
    setSelectedVideo(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Video Crop Tool
          </h1>
          <p className="text-gray-600">
            Sube un video y visualízalo con controles personalizados
          </p>
        </div>

        <div className="space-y-8">
          {/* Video Upload Component */}
          <div className="flex justify-center">
            <VideoUpload
              onVideoSelect={handleVideoSelect}
              selectedFile={selectedVideo}
            />
          </div>

          {/* Video Display Component */}
          <div className="flex justify-center">
            <VideoDisplay videoFile={selectedVideo} />
          </div>

          {/* Timeline Canvas */}
          {selectedVideo && playerRef && (
            <div className="w-full">
              <TimelineCanvas videoFile={selectedVideo} maxDurationMs={0} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
