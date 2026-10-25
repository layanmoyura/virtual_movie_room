import React, { useEffect, useRef } from "react";
import { ScreenShare, StopCircle, Maximize } from "lucide-react";

interface ScreenSharePlayerProps {
  stream: MediaStream | null;
  isSelfSharing: boolean;
  sharerDisplayName?: string;
  onStopSharing: () => void;
}

export const ScreenSharePlayer: React.FC<ScreenSharePlayerProps> = ({
  stream,
  isSelfSharing,
  sharerDisplayName,
  onStopSharing
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    } else {
      videoRef.current.requestFullscreen().catch(console.error);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[420px] bg-black rounded-xl overflow-hidden border border-cinema-border flex flex-col items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelfSharing} // Mute self to avoid local audio feedback loop
        className="w-full h-full object-contain max-h-[75vh]"
      />

      {/* Top Banner Indicator */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-cinema-border text-xs pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-medium text-white">
            {isSelfSharing ? "You are sharing your screen" : `Viewing ${sharerDisplayName || "User"}'s screen`}
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {isSelfSharing && (
            <button
              onClick={onStopSharing}
              className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg transition"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>Stop Sharing</span>
            </button>
          )}

          <button
            onClick={handleFullscreen}
            className="p-1.5 rounded-full bg-black/70 hover:bg-cinema-surface border border-cinema-border text-white transition"
            title="Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
