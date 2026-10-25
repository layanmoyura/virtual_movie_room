import React, { useState, useEffect } from "react";
import { ExternalLink, ScreenShare, Play, ShieldAlert, Timer } from "lucide-react";

interface BlockedSiteFallbackProps {
  sourceUrl: string;
  canControl: boolean;
  onStartShare: () => void;
  onManualPlayTrigger?: () => void;
}

export const BlockedSiteFallback: React.FC<BlockedSiteFallbackProps> = ({
  sourceUrl,
  canControl,
  onStartShare,
  onManualPlayTrigger
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  const startCountdown = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown reached 0
      onManualPlayTrigger?.();
      const resetTimer = setTimeout(() => setCountdown(null), 3000);
      return () => clearTimeout(resetTimer);
    }
  }, [countdown, onManualPlayTrigger]);

  return (
    <div className="w-full h-full min-h-[420px] bg-cinema-card border border-cinema-border rounded-xl p-8 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-full bg-cinema-amber/10 border border-cinema-amber/30 text-cinema-amber flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 h-7" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">Direct Embedding Restricted</h3>
      <p className="text-sm text-gray-400 max-w-lg mb-6 leading-relaxed">
        This website sends security headers (<code className="text-xs bg-black/40 px-1.5 py-0.5 rounded text-cinema-neon font-mono">X-Frame-Options</code> or Content Security Policy) that prevent it from being loaded inside an embedded frame.
      </p>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-6">
        {/* Option 1: Open in new tab */}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 rounded-xl bg-cinema-surface hover:bg-cinema-border border border-cinema-border transition text-left flex flex-col justify-between group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-cinema-accent/20 text-cinema-accent flex items-center justify-center mb-3">
              <ExternalLink className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-white text-sm mb-1 group-hover:text-cinema-accent transition">Open in New Tab</h4>
            <p className="text-xs text-gray-400">Launch the media in your own browser tab directly.</p>
          </div>
          <span className="text-[11px] text-cinema-accent font-medium mt-3 inline-flex items-center gap-1">
            Open URL &rarr;
          </span>
        </a>

        {/* Option 2: Share Browser Tab */}
        <button
          onClick={onStartShare}
          className="p-4 rounded-xl bg-cinema-surface hover:bg-cinema-border border border-cinema-border transition text-left flex flex-col justify-between group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-cinema-neon/20 text-cinema-neon flex items-center justify-center mb-3">
              <ScreenShare className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-white text-sm mb-1 group-hover:text-cinema-neon transition">Share Browser Tab</h4>
            <p className="text-xs text-gray-400">Capture the tab using explicit browser WebRTC permission.</p>
          </div>
          <span className="text-[11px] text-cinema-neon font-medium mt-3 inline-flex items-center gap-1">
            Start Stream &rarr;
          </span>
        </button>

        {/* Option 3: Manual Sync Cue */}
        <div className="p-4 rounded-xl bg-cinema-surface border border-cinema-border text-left flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-cinema-amber/20 text-cinema-amber flex items-center justify-center mb-3">
              <Timer className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-white text-sm mb-1">Manual Sync Cue</h4>
            <p className="text-xs text-gray-400">Countdown timer so everyone presses play together.</p>
          </div>
          {countdown !== null ? (
            <div className="mt-3 py-1.5 px-3 rounded-lg bg-cinema-amber text-black font-bold text-center text-sm animate-pulse">
              {countdown === 0 ? "PLAY NOW!" : `Playing in ${countdown}...`}
            </div>
          ) : (
            <button
              onClick={startCountdown}
              disabled={!canControl}
              className="mt-3 py-1 px-3 rounded-lg bg-cinema-border hover:bg-gray-700 text-xs text-white font-medium transition disabled:opacity-50"
            >
              Start Countdown
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
