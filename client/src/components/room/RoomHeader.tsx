import React, { useState } from "react";
import { Copy, Check, Users, Crown, Settings, Film } from "lucide-react";
import { Room } from "@virtual-movie-room/shared";

interface RoomHeaderProps {
  room: Room;
  selfParticipantId: string;
  onOpenSettings: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  room,
  selfParticipantId,
  onOpenSettings
}) => {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostParticipantId === selfParticipantId;

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/room/${room.roomCode}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(console.error);
  };

  return (
    <header className="w-full flex items-center justify-between px-4 sm:px-6 py-3 bg-cinema-card/80 backdrop-blur-md border-b border-cinema-border sticky top-0 z-40">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-cinema-accent flex items-center justify-center text-white shadow-md shadow-cinema-accent/30 group-hover:scale-105 transition">
            <Film className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-sm sm:text-base tracking-tight hidden sm:inline">
            Virtual Movie Room
          </span>
        </a>

        {/* Room Code Pill with 1-click Copy */}
        <button
          onClick={copyInviteLink}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cinema-surface hover:bg-cinema-border border border-cinema-border text-xs transition group"
          title="Click to copy invite link"
        >
          <span className="text-gray-400 font-mono">Code:</span>
          <span className="text-cinema-neon font-mono font-bold tracking-wider">{room.roomCode}</span>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-cinema-green ml-1" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-white ml-1 transition" />
          )}
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Host badge */}
        {isHost ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cinema-amber/10 border border-cinema-amber/30 text-cinema-amber text-xs font-semibold">
            <Crown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Host</span>
          </div>
        ) : (
          <div className="px-2.5 py-1 rounded-full bg-cinema-surface border border-cinema-border text-gray-300 text-xs font-medium">
            Guest
          </div>
        )}

        {/* Participant counter */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cinema-surface border border-cinema-border text-xs text-gray-300">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span>{room.participants.length}</span>
        </div>

        {/* Room Settings (Host only) */}
        {isHost && (
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-cinema-surface hover:bg-cinema-border border border-cinema-border text-gray-300 hover:text-white transition"
            title="Room Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
