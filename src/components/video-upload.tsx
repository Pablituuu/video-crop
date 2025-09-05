import React, { useRef } from "react";
import { Button } from "./ui/button";
import { Upload, X } from "lucide-react";
import { usePlayerStore } from "../store/use-store";

interface VideoUploadProps {
  onVideoSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export function VideoUpload({ onVideoSelect, selectedFile }: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setDurationMs, setLoadVideo } = usePlayerStore();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onVideoSelect(file);
    if (!file) return;

    const videoElement = document.createElement("video");
    videoElement.preload = "metadata";

    videoElement.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoElement.src); // liberar memoria
      setDurationMs(videoElement.duration * 1000); // duración en segundos
      setLoadVideo(true);
    };

    videoElement.src = URL.createObjectURL(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    onVideoSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {!selectedFile ? (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Selecciona un video
              </p>
              <p className="text-sm text-gray-500">
                Haz clic para subir o arrastra un archivo aquí
              </p>
            </div>
            <Button onClick={handleButtonClick} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Seleccionar Video
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={handleButtonClick}
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Cambiar Video
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
