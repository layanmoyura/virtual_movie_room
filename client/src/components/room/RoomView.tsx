import React, { useState, useRef } from "react";
import { Room, ChatMessage, PlaybackMode } from "@virtual-movie-room/shared";
import { RoomHeader } from "./RoomHeader.js";
import { PlaybackControlBar } from "./PlaybackControlBar.js";
import { ChatPanel } from "./ChatPanel.js";
import { ParticipantsList } from "./ParticipantsList.js";
import { RoomSettingsModal } from "./RoomSettingsModal.js";
import { DirectVideoPlayer } from "../player/DirectVideoPlayer.js";
import { GenericEmbedPlayer } from "../player/GenericEmbedPlayer.js";
import { BlockedSiteFallback } from "../player/BlockedSiteFallback.js";
import { ScreenSharePlayer } from "../player/ScreenSharePlayer.js";
import { usePlaybackSync } from "../../hooks/usePlaybackSync.js";
import { useScreenShare } from "../../hooks/useScreenShare.js";
import { MessageSquare, Users } from "lucide-react";

interface RoomViewProps {
  room: Room;
  selfParticipantId: string;
  chatMessages: ChatMessage[];
  send: (event: any) => void;
  subscribe: (handler: (event: any) => void) => () => void;
}

export const RoomView: React.FC<RoomViewProps> = ({
  room,
  selfParticipantId,
  chatMessages,
  send,
  subscribe
}) => {
  const [activeTab, setActiveTab] = useState<"chat" | "participants">("chat");
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isHost = room.hostParticipantId === selfParticipantId;
  const canControl = isHost || room.settings.allowGuestControl;

  // Synchronization hook
  const {
    play,
    pause,
    seek,
    resync,
    setSource,
    driftSeconds,
    autoplayBlocked,
    clearAutoplayBanner
  } = usePlaybackSync({
    playbackState: room.playbackState,
    isHost,
    canControl,
    videoRef,
    send
  });

  // WebRTC Screen sharing hook
  const {
    isSharing,
    isSelfSharing,
    remoteStream,
    localStream,
    startSharing,
    stopSharing
  } = useScreenShare({
    selfParticipantId,
    activeSharingParticipantId: room.activeSharingParticipantId,
    send,
    subscribe
  });

  const toggleMuteUser = (participantId: string) => {
    setMutedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

  const activeSharer = room.participants.find(
    (p) => p.participantId === room.activeSharingParticipantId
  );

  return (
    <div className="min-h-screen bg-cinema-bg flex flex-col text-gray-200">
      {/* Top Header */}
      <RoomHeader
        room={room}
        selfParticipantId={selfParticipantId}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Cinema Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row p-3 sm:p-4 gap-4 max-w-[1700px] w-full mx-auto">
        {/* Left: Theater Stage & Controls */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Media Viewport */}
          <div className="w-full flex-1 min-h-[420px] rounded-xl overflow-hidden bg-black flex items-center justify-center">
            {room.activeSharingParticipantId ? (
              <ScreenSharePlayer
                stream={isSelfSharing ? localStream : remoteStream}
                isSelfSharing={isSelfSharing}
                sharerDisplayName={activeSharer?.displayName}
                onStopSharing={stopSharing}
              />
            ) : room.playbackState.mode === "direct-video" ? (
              <DirectVideoPlayer
                sourceUrl={room.playbackState.sourceUrl}
                videoRef={videoRef}
                canControl={canControl}
                isPlaying={room.playbackState.status === "playing"}
                driftSeconds={driftSeconds}
                autoplayBlocked={autoplayBlocked}
                onPlay={play}
                onPause={pause}
                onSeek={seek}
                onResync={resync}
                onClearAutoplay={clearAutoplayBanner}
              />
            ) : room.playbackState.mode === "official-embed" ? (
              <GenericEmbedPlayer
                sourceUrl={room.playbackState.sourceUrl || ""}
                canControl={canControl}
                onStartShare={startSharing}
              />
            ) : (
              <BlockedSiteFallback
                sourceUrl={room.playbackState.sourceUrl || ""}
                canControl={canControl}
                onStartShare={startSharing}
                onManualPlayTrigger={play}
              />
            )}
          </div>

          {/* Control Bar */}
          <PlaybackControlBar
            currentUrl={room.playbackState.sourceUrl}
            canControl={canControl}
            isSharing={isSharing}
            onSetSource={setSource}
            onStartShare={startSharing}
            onResync={resync}
          />
        </div>

        {/* Right: Collapsible Sidebar (Chat & Participants) */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col h-[500px] lg:h-auto shrink-0 space-y-2">
          {/* Tabs header */}
          <div className="flex rounded-xl bg-cinema-card p-1 border border-cinema-border">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "chat"
                  ? "bg-cinema-surface text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setActiveTab("participants")}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "participants"
                  ? "bg-cinema-surface text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>People ({room.participants.length})</span>
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "chat" ? (
              <ChatPanel
                messages={chatMessages}
                selfParticipantId={selfParticipantId}
                mutedUserIds={mutedUserIds}
                onSendMessage={(text) => send({ type: "chat:message", payload: { text } })}
              />
            ) : (
              <ParticipantsList
                participants={room.participants}
                selfParticipantId={selfParticipantId}
                mutedUserIds={mutedUserIds}
                onUpdateName={(displayName) => send({ type: "participant:update-name", payload: { displayName } })}
                onToggleMute={toggleMuteUser}
              />
            )}
          </div>
        </div>
      </div>

      {/* Host Settings Modal */}
      {isHost && (
        <RoomSettingsModal
          isOpen={isSettingsOpen}
          settings={room.settings}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateSettings={(newSettings) => send({ type: "room:update-settings", payload: newSettings })}
          onEndRoom={() => send({ type: "room:end" })}
        />
      )}
    </div>
  );
};
