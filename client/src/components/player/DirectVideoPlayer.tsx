import React, { useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, AlertCircle } from "lucide-react";

interface DirectVideoPlayerProps {
  sourceUrl?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canControl: boolean;
  isPlaying: boolean;
  driftSeconds: number;
  autoplayBlocked: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onResync: () => void;
  onClearAutoplay: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export const DirectVideoPlayer: React.FC<DirectVideoPlayerProps> = ({
  sourceUrl,
  videoRef,
  canControl,
  isPlaying,
  driftSeconds,
  autoplayBlocked,
  onPlay,
  onPause,
  onSeek,
  onResync,
  onClearAutoplay
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration || 0);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [videoRef]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    } else {
      videoRef.current.requestFullscreen().catch(console.error);
    }
  };

  if (!sourceUrl) {
    return (
      <div className="w-full h-full min-h-[420px] flex flex-col items-center justify-center bg-cinema-bg border border-cinema-border rounded-xl text-center p-8">
        <div className="w-16 h-16 rounded-full bg-cinema-card border border-cinema-border flex items-center justify-center mb-4 text-cinema-accent">
          <Play className="w-8 h-8 ml-1" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Theater Stage Ready</h3>
        <p className="text-sm text-gray-400 max-w-md">
          Paste a direct video URL (.mp4, .webm) or website link in the control bar below to begin the party.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full min-h-[420px] bg-black rounded-xl overflow-hidden group border border-cinema-border flex items-center justify-center select-none"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={sourceUrl}
        playsInline
        preload="metadata"
        className="w-full h-full object-contain max-h-[75vh]"
        onClick={() => canControl && (isPlaying ? onPause() : onPlay())}
      />

      {/* Autoplay restriction warning banner */}
      {autoplayBlocked && (
        <div
          onClick={onClearAutoplay}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-cinema-amber/90 hover:bg-cinema-amber text-black font-semibold text-xs px-4 py-2 rounded-full cursor-pointer flex items-center gap-2 shadow-lg backdrop-blur-md transition-all animate-bounce"
        >
          <AlertCircle className="w-4 h-4" />
          <span>Click to enable sound and sync audio</span>
        </div>
      )}

      {/* Cinema Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 z-20 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress Bar */}
        <div className="relative mb-3 flex items-center group/slider">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            disabled={!canControl}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cinema-accent focus:outline-none hover:h-2 transition-all"
          />
        </div>

        {/* Buttons Bar */}
        <div className="flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            {canControl ? (
              <button
                onClick={isPlaying ? onPause : onPlay}
                className="p-2 rounded-lg bg-cinema-accent hover:bg-blue-600 transition text-white"
                title={isPlaying ? "Pause (Host)" : "Play (Host)"}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-lg bg-cinema-card border border-cinema-border text-xs text-gray-300 font-medium">
                {isPlaying ? "Playing (Host Sync)" : "Paused by Host"}
              </div>
            )}

            {/* Time display */}
            <span className="text-xs text-gray-300 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Volume */}
            <div className="flex items-center gap-2 ml-2">
              <button onClick={toggleMute} className="text-gray-300 hover:text-white transition">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cinema-accent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Drift indicator badge */}
            <div
              className={`text-[11px] px-2.5 py-1 rounded-md border font-mono ${
                driftSeconds < 0.5
                  ? "bg-cinema-green/10 border-cinema-green/30 text-cinema-green"
                  : "bg-cinema-amber/10 border-cinema-amber/30 text-cinema-amber"
              }`}
            >
              {driftSeconds < 0.5 ? "In Sync" : `Drift: ${driftSeconds.toFixed(1)}s`}
            </div>

            {/* Resync Button */}
            <button
              onClick={onResync}
              className="p-2 rounded-lg hover:bg-cinema-surface border border-cinema-border text-gray-300 hover:text-white transition flex items-center gap-1.5 text-xs"
              title="Force resync with host clock"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Resync</span>
            </button>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="p-2 rounded-lg hover:bg-cinema-surface border border-cinema-border text-gray-300 hover:text-white transition"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
