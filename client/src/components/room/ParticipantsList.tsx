import React, { useState } from "react";
import { Users, Crown, Edit2, Check, VolumeX, Volume2 } from "lucide-react";
import { Participant } from "@virtual-movie-room/shared";

interface ParticipantsListProps {
  participants: Participant[];
  selfParticipantId: string;
  mutedUserIds: Set<string>;
  onUpdateName: (newName: string) => void;
  onToggleMute: (participantId: string) => void;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  selfParticipantId,
  mutedUserIds,
  onUpdateName,
  onToggleMute
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");

  const selfParticipant = participants.find((p) => p.participantId === selfParticipantId);

  const startEdit = () => {
    setEditedName(selfParticipant?.displayName || "");
    setIsEditing(true);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedName.trim()) {
      onUpdateName(editedName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full bg-cinema-card rounded-xl border border-cinema-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-cinema-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cinema-accent" />
          <span className="font-semibold text-white text-xs sm:text-sm">Participants</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-cinema-surface border border-cinema-border text-gray-400 font-mono">
          {participants.length}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {participants.map((p) => {
          const isSelf = p.participantId === selfParticipantId;
          const isHost = p.role === "host";
          const isMuted = mutedUserIds.has(p.participantId);

          return (
            <div
              key={p.participantId}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition ${
                isSelf
                  ? "bg-cinema-surface/80 border-cinema-accent/30"
                  : "bg-cinema-surface/40 border-cinema-border"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isHost && (
                  <span title="Room Host">
                    <Crown className="w-3.5 h-3.5 text-cinema-amber shrink-0" />
                  </span>
                )}

                {isSelf && isEditing ? (
                  <form onSubmit={saveEdit} className="flex items-center gap-1">
                    <input
                      type="text"
                      maxLength={32}
                      value={editedName}
                      autoFocus
                      onChange={(e) => setEditedName(e.target.value)}
                      className="px-2 py-0.5 bg-black/60 border border-cinema-accent rounded text-xs text-white focus:outline-none"
                    />
                    <button type="submit" className="text-cinema-green p-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-medium text-white truncate">{p.displayName}</span>
                    {isSelf && <span className="text-[10px] text-gray-400">(You)</span>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                {isSelf && !isEditing && (
                  <button
                    onClick={startEdit}
                    className="p-1 text-gray-400 hover:text-white transition"
                    title="Change display name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {!isSelf && (
                  <button
                    onClick={() => onToggleMute(p.participantId)}
                    className={`p-1 rounded transition ${
                      isMuted ? "text-cinema-red hover:text-red-400" : "text-gray-400 hover:text-white"
                    }`}
                    title={isMuted ? "Unmute user" : "Mute user locally"}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
