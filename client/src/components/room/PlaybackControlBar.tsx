import React, { useState, useEffect } from "react";
import { Play, ScreenShare, RotateCcw, Link2, Sparkles } from "lucide-react";
import { validateAndClassifyUrl } from "@virtual-movie-room/shared";
import { PlaybackMode } from "@virtual-movie-room/shared";

interface PlaybackControlBarProps {
  currentUrl?: string;
  canControl: boolean;
  isSharing: boolean;
  onSetSource: (url: string, mode: PlaybackMode) => void;
  onStartShare: () => void;
  onResync: () => void;
}

export const PlaybackControlBar: React.FC<PlaybackControlBarProps> = ({
  currentUrl,
  canControl,
  isSharing,
  onSetSource,
  onStartShare,
  onResync
}) => {
  const [inputUrl, setInputUrl] = useState(currentUrl || "");
  const [detectedMode, setDetectedMode] = useState<PlaybackMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUrl) {
      setInputUrl(currentUrl);
    }
  }, [currentUrl]);

  // Real-time format classification
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputUrl(val);
    setError(null);

    if (val.trim().length > 3) {
      const res = validateAndClassifyUrl(val);
      if (res.valid && res.mode) {
        setDetectedMode(res.mode);
      } else {
        setDetectedMode(null);
      }
    } else {
      setDetectedMode(null);
    }
  };

  const handlePlaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canControl) return;

    const res = validateAndClassifyUrl(inputUrl);
    if (!res.valid || !res.normalizedUrl || !res.mode) {
      setError(res.error || "Please enter a valid HTTPS URL.");
      return;
    }

    setError(null);
    onSetSource(res.normalizedUrl, res.mode);
  };

  return (
    <div className="w-full flex flex-col gap-2 p-3 sm:p-4 bg-cinema-card border border-cinema-border rounded-xl">
      <form onSubmit={handlePlaySubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
        <div className="relative flex-1 flex items-center">
          <Link2 className="absolute left-3.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={inputUrl}
            disabled={!canControl}
            onChange={handleInputChange}
            placeholder={
              canControl
                ? "Paste a media (.mp4, .webm) or website link..."
                : "Host has locked playback controls"
            }
            className="w-full pl-10 pr-24 py-2.5 bg-cinema-surface border border-cinema-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cinema-accent disabled:opacity-50 transition"
          />

          {/* Mode Pill Badge inside input */}
          {detectedMode && (
            <div className="absolute right-3 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-cinema-card border border-cinema-border text-cinema-neon uppercase tracking-wider">
              <Sparkles className="w-2.5 h-2.5" />
              <span>{detectedMode.replace("-", " ")}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Play / Load Button */}
          <button
            type="submit"
            disabled={!canControl || !inputUrl.trim()}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-cinema-accent hover:bg-blue-600 disabled:opacity-50 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <Play className="w-4 h-4 ml-0.5" />
            <span>Play</span>
          </button>

          {/* Resync Button */}
          <button
            type="button"
            onClick={onResync}
            className="p-2.5 rounded-lg bg-cinema-surface hover:bg-cinema-border border border-cinema-border text-gray-300 hover:text-white transition"
            title="Manual clock resync"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Share Tab Button */}
          <button
            type="button"
            onClick={onStartShare}
            disabled={isSharing}
            className="px-3.5 py-2.5 rounded-lg bg-cinema-surface hover:bg-cinema-border border border-cinema-border text-gray-200 font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            title="Share browser tab or desktop screen"
          >
            <ScreenShare className="w-4 h-4 text-cinema-neon" />
            <span className="hidden sm:inline">Share Tab</span>
          </button>
        </div>
      </form>

      {error && <span className="text-xs text-cinema-red font-medium">{error}</span>}
    </div>
  );
};
