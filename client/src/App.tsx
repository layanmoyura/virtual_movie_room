import { useState, useEffect } from "react";
import { Room, ChatMessage, ServerEvent } from "@virtual-movie-room/shared";
import { useWebSocket } from "./hooks/useWebSocket.js";
import { HomeView } from "./components/home/HomeView.js";
import { RoomView } from "./components/room/RoomView.js";

export function App() {
  const { isConnected, send, subscribe } = useWebSocket();
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [selfParticipantId, setSelfParticipantId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscribe to real-time server events
  useEffect(() => {
    const unsubscribe = subscribe((event: ServerEvent) => {
      switch (event.type) {
        case "room:joined": {
          setCurrentRoom(event.payload.room);
          setSelfParticipantId(event.payload.selfParticipantId);
          setChatMessages(event.payload.chatHistory || []);
          setErrorMessage(null);
          // Update URL in browser bar
          window.history.pushState(null, "", `/room/${event.payload.room.roomCode}`);
          break;
        }

        case "participant:joined": {
          setCurrentRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              participants: [...prev.participants, event.payload.participant]
            };
          });
          break;
        }

        case "participant:left": {
          setCurrentRoom((prev) => {
            if (!prev) return prev;
            const updatedParticipants = prev.participants.filter(
              (p) => p.participantId !== event.payload.participantId
            );
            return {
              ...prev,
              hostParticipantId: event.payload.newHostParticipantId || prev.hostParticipantId,
              participants: updatedParticipants
            };
          });
          break;
        }

        case "participant:updated": {
          setCurrentRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              participants: prev.participants.map((p) =>
                p.participantId === event.payload.participantId
                  ? { ...p, displayName: event.payload.displayName }
                  : p
              )
            };
          });
          break;
        }

        case "room:settings-updated": {
          setCurrentRoom((prev) => (prev ? { ...prev, settings: event.payload } : prev));
          break;
        }

        case "playback:state": {
          setCurrentRoom((prev) => (prev ? { ...prev, playbackState: event.payload } : prev));
          break;
        }

        case "chat:message": {
          setChatMessages((prev) => [...prev, event.payload]);
          break;
        }

        case "sharing:started": {
          setCurrentRoom((prev) =>
            prev ? { ...prev, activeSharingParticipantId: event.payload.participantId } : prev
          );
          break;
        }

        case "sharing:stopped": {
          setCurrentRoom((prev) =>
            prev ? { ...prev, activeSharingParticipantId: undefined } : prev
          );
          break;
        }

        case "room:ended": {
          alert(event.payload.reason);
          setCurrentRoom(null);
          setSelfParticipantId(null);
          window.history.pushState(null, "", "/");
          break;
        }

        case "room:expired": {
          alert("This room has expired due to 2 hours of inactivity.");
          setCurrentRoom(null);
          setSelfParticipantId(null);
          window.history.pushState(null, "", "/");
          break;
        }

        case "error": {
          setErrorMessage(event.payload.message);
          setTimeout(() => setErrorMessage(null), 4000);
          break;
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  // Handle direct URL navigation like /room/MV-XXXX on initial load
  useEffect(() => {
    if (!isConnected || currentRoom) return;

    const pathname = window.location.pathname;
    if (pathname.startsWith("/room/")) {
      const codeOrId = pathname.replace("/room/", "").trim();
      if (codeOrId) {
        send({
          type: "room:join",
          payload: { roomIdOrCode: codeOrId }
        });
      }
    }
  }, [isConnected, currentRoom, send]);

  const handleCreateRoom = (displayName?: string) => {
    send({
      type: "room:create",
      payload: { displayName }
    });
  };

  const handleJoinRoom = (roomIdOrCode: string, displayName?: string) => {
    send({
      type: "room:join",
      payload: { roomIdOrCode, displayName }
    });
  };

  if (!currentRoom || !selfParticipantId) {
    return (
      <HomeView
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        errorMessage={errorMessage}
      />
    );
  }

  return (
    <RoomView
      room={currentRoom}
      selfParticipantId={selfParticipantId}
      chatMessages={chatMessages}
      send={send}
      subscribe={subscribe}
    />
  );
}

export default App;
