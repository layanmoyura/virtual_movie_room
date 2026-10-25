import React, { useState } from "react";
import { BlockedSiteFallback } from "./BlockedSiteFallback.js";

interface GenericEmbedPlayerProps {
  sourceUrl: string;
  canControl: boolean;
  onStartShare: () => void;
}

export const GenericEmbedPlayer: React.FC<GenericEmbedPlayerProps> = ({
  sourceUrl,
  canControl,
  onStartShare
}) => {
  const [hasError, setHasError] = useState(false);

  // Normalize YouTube URLs if user entered standard watch URL
  let embedUrl = sourceUrl;
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.hostname.includes("youtube.com") && parsed.searchParams.get("v")) {
      embedUrl = `https://www.youtube-nocookie.com/embed/${parsed.searchParams.get("v")}?autoplay=1&enablejsapi=1`;
    } else if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.slice(1);
      embedUrl = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1`;
    }
  } catch {
    // Keep as is
  }

  if (hasError) {
    return (
      <BlockedSiteFallback
        sourceUrl={sourceUrl}
        canControl={canControl}
        onStartShare={onStartShare}
      />
    );
  }

  return (
    <div className="relative w-full h-full min-h-[420px] bg-black rounded-xl overflow-hidden border border-cinema-border">
      <iframe
        src={embedUrl}
        title="Embedded Video Player"
        className="w-full h-full min-h-[420px] object-contain"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups"
        onError={() => setHasError(true)}
      />
    </div>
  );
};
