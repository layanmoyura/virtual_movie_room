import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";
import {
  ClientEvent,
  ServerEvent,
  Room,
  validateAndClassifyUrl
} from "@virtual-movie-room/shared";
import { RoomManager } from "./room-manager.js";
import { PlaybackSyncManager } from "./playback-sync.js";
import { ChatManager } from "./chat-manager.js";
import { WebRtcBroker } from "./webrtc-broker.js";

const PORT = parseInt(process.env.PORT || "7860", 10);
const CLIENT_DIST_PATH = join(process.cwd(), "client", "dist");

interface SocketSession {
  ws: WebSocket;
  roomId?: string;
  participantId?: string;
  isAlive: boolean;
}

const sessions = new Map<WebSocket, SocketSession>();
const roomManager = new RoomManager();
const playbackSync = new PlaybackSyncManager();
const chatManager = new ChatManager();
const webrtcBroker = new WebRtcBroker();

function sendEvent(ws: WebSocket, event: ServerEvent): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

function broadcastToRoom(
  roomId: string,
  event: ServerEvent,
  excludeParticipantId?: string
): void {
  for (const session of sessions.values()) {
    if (
      session.roomId === roomId &&
      session.participantId !== excludeParticipantId &&
      session.ws.readyState === WebSocket.OPEN
    ) {
      session.ws.send(JSON.stringify(event));
    }
  }
}

function findSocketByParticipantId(
  roomId: string,
  participantId: string
): WebSocket | undefined {
  for (const session of sessions.values()) {
    if (session.roomId === roomId && session.participantId === participantId) {
      return session.ws;
    }
  }
  return undefined;
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

// HTTP Server
const startTime = Date.now();
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  // CORS Headers for API & development
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  // Health endpoint
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        activeRooms: roomManager.getActiveRoomCount(),
        timestamp: Date.now()
      })
    );
    return;
  }

  // Room status info
  if (url.pathname.startsWith("/api/rooms/") && url.pathname.endsWith("/info")) {
    const parts = url.pathname.split("/");
    const roomIdOrCode = parts[3];
    const room = roomManager.getRoom(roomIdOrCode);

    if (!room) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Room not found" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        exists: true,
        roomCode: room.roomCode,
        locked: room.settings.locked,
        participantCount: room.participants.length
      })
    );
    return;
  }

  // Serve static client assets in production if client/dist exists
  if (existsSync(CLIENT_DIST_PATH)) {
    let filePath = join(CLIENT_DIST_PATH, url.pathname === "/" ? "index.html" : url.pathname);

    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(CLIENT_DIST_PATH, "index.html");
    }

    if (existsSync(filePath) && !statSync(filePath).isDirectory()) {
      const ext = extname(filePath);
      const mime = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime });
      res.end(readFileSync(filePath));
      return;
    }
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Virtual Movie Room WebSocket Server running.");
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
  const session: SocketSession = { ws, isAlive: true };
  sessions.set(ws, session);

  ws.on("pong", () => {
    session.isAlive = true;
  });

  ws.on("message", (raw: string) => {
    let event: ClientEvent;
    try {
      if (typeof raw !== "string" && !Buffer.isBuffer(raw)) return;
      event = JSON.parse(raw.toString());
    } catch {
      sendEvent(ws, {
        type: "error",
        payload: { code: "INVALID_JSON", message: "Malformed JSON payload." }
      });
      return;
    }

    handleClientEvent(session, event);
  });

  ws.on("close", () => {
    handleDisconnect(session);
    sessions.delete(ws);
  });

  ws.on("error", () => {
    handleDisconnect(session);
    sessions.delete(ws);
  });
});

function handleClientEvent(session: SocketSession, event: ClientEvent): void {
  const { ws } = session;

  switch (event.type) {
    case "room:create": {
      const { room, hostParticipantId } = roomManager.createRoom(event.payload?.displayName);
      session.roomId = room.roomId;
      session.participantId = hostParticipantId;

      sendEvent(ws, {
        type: "room:joined",
        payload: {
          selfParticipantId: hostParticipantId,
          room,
          chatHistory: chatManager.getHistory(room.roomId)
        }
      });
      break;
    }

    case "room:join": {
      const result = roomManager.joinRoom(
        event.payload.roomIdOrCode,
        event.payload.displayName
      );

      if ("error" in result) {
        sendEvent(ws, {
          type: "error",
          payload: { code: "JOIN_FAILED", message: result.error }
        });
        return;
      }

      const { room, participant } = result;
      session.roomId = room.roomId;
      session.participantId = participant.participantId;

      // Broadcast to existing room participants
      broadcastToRoom(room.roomId, {
        type: "participant:joined",
        payload: { participant }
      }, participant.participantId);

      // Send joined room state to caller
      sendEvent(ws, {
        type: "room:joined",
        payload: {
          selfParticipantId: participant.participantId,
          room,
          chatHistory: chatManager.getHistory(room.roomId)
        }
      });
      break;
    }

    case "participant:update-name": {
      if (!session.roomId || !session.participantId) return;
      const success = roomManager.updateDisplayName(
        session.roomId,
        session.participantId,
        event.payload.displayName
      );

      if (success) {
        broadcastToRoom(session.roomId, {
          type: "participant:updated",
          payload: {
            participantId: session.participantId,
            displayName: event.payload.displayName
          }
        });
      }
      break;
    }

    case "room:update-settings": {
      if (!session.roomId || !session.participantId) return;
      const updated = roomManager.updateSettings(
        session.roomId,
        session.participantId,
        event.payload
      );

      if (!updated) {
        sendEvent(ws, {
          type: "error",
          payload: { code: "AUTH_FORBIDDEN", message: "Only the host can modify room settings." }
        });
        return;
      }

      broadcastToRoom(session.roomId, {
        type: "room:settings-updated",
        payload: updated
      });
      break;
    }

    case "media:set-source": {
      if (!session.roomId || !session.participantId) return;
      const room = roomManager.getRoom(session.roomId);
      if (!room) return;

      const validated = validateAndClassifyUrl(event.payload.sourceUrl);
      if (!validated.valid || !validated.normalizedUrl) {
        sendEvent(ws, {
          type: "error",
          payload: { code: "INVALID_URL", message: validated.error || "Invalid URL" }
        });
        return;
      }

      const updated = playbackSync.setSource(
        room,
        session.participantId,
        validated.normalizedUrl,
        event.payload.mode || validated.mode || "direct-video"
      );

      if ("error" in updated) {
        sendEvent(ws, {
          type: "error",
          payload: { code: "AUTH_FORBIDDEN", message: updated.error }
        });
        return;
      }

      roomManager.touchActivity(room);
      broadcastToRoom(session.roomId, {
        type: "playback:state",
        payload: updated
      });
      break;
    }

    case "playback:play": {
      if (!session.roomId || !session.participantId) return;
      const room = roomManager.getRoom(session.roomId);
      if (!room) return;

      const updated = playbackSync.play(room, session.participantId, event.payload.positionSeconds);
      if ("error" in updated) {
        sendEvent(ws, {
          type: "error",
          payload: { code: "AUTH_FORBIDDEN", message: updated.error }
        });
        return;
      }

      roomManager.touchActivity(room);
      broadcastToRoom(session.roomId, {
        type: "playback:state",
        payload: updated
      });
      break;
    }

    case "playback:pause": {
      if (!session.roomId || !session.participantId) return;
      const room = roomManager.getRoom(session.roomId);
      if (!room) return;

      const updated = playbackSync.pause(room, session.participantId, event.payload.positionSeconds);
      if ("error" in updated) {
        sendEvent(ws, {
          type: "error",
          payload: { code: "AUTH_FORBIDDEN", message: updated.error }
        });
        return;
      }

      roomManager.touchActivity(room);
      broadcastToRoom(session.roomId, {
        type: "playback:state",
        payload: updated
      });
      break;
    }

    case "playback:seek": {
      if (!session.roomId || !session.participantId) return;
      const room = roomManager.getRoom(session.roomId);
      if (!room) return;

      const updated = playbackSync.seek(room, session.participantId, event.payload.positionSeconds);
      if ("error" in updated) {
        sendEvent(ws, {
          type: "error",
          payload: { code: "AUTH_FORBIDDEN", message: updated.error }
        });
        return;
      }

      roomManager.touchActivity(room);
      broadcastToRoom(session.roomId, {
        type: "playback:state",
        payload: updated
      });
      break;
    }

    case "playback:heartbeat": {
      if (!session.roomId || !session.participantId) return;
      const room = roomManager.getRoom(session.roomId);
      if (!room) return;

      const updated = playbackSync.heartbeat(room, session.participantId, event.payload.positionSeconds);
      if (updated) {
        broadcastToRoom(session.roomId, {
          type: "playback:state",
          payload: updated
        }, session.participantId);
      }
      break;
    }

    case "chat:message": {
      if (!session.roomId || !session.participantId) return;
      const room = roomManager.getRoom(session.roomId);
      if (!room) return;

      const participant = room.participants.find((p) => p.participantId === session.participantId);
      if (!participant) return;

      const result = chatManager.addMessage(
        session.roomId,
        session.participantId,
        participant.displayName,
        event.payload.text
      );

      if ("error" in result) {
        sendEvent(ws, {
          type: "error",
          payload: { code: "CHAT_REJECTED", message: result.error }
        });
        return;
      }

      roomManager.touchActivity(room);
      broadcastToRoom(session.roomId, {
        type: "chat:message",
        payload: result
      });
      break;
    }

    case "sharing:start": {
      if (!session.roomId || !session.participantId) return;
      const room = roomManager.getRoom(session.roomId);
      if (!room) return;

      const allowed = webrtcBroker.startSharing(room, session.participantId);
      if (!allowed) {
        sendEvent(ws, {
          type: "error",
          payload: { code: "SHARING_COLLISION", message: "Another user is currently sharing their screen." }
        });
        return;
      }

      const participant = room.participants.find((p) => p.participantId === session.participantId);
      broadcastToRoom(session.roomId, {
        type: "sharing:started",
        payload: {
          participantId: session.participantId,
          displayName: participant?.displayName || "Participant"
        }
      });
      break;
    }

    case "sharing:stop": {
      if (!session.roomId || !session.participantId) return;
      const room = roomManager.getRoom(session.roomId);
      if (!room) return;

      const stopped = webrtcBroker.stopSharing(room, session.participantId);
      if (stopped) {
        broadcastToRoom(session.roomId, {
          type: "sharing:stopped",
          payload: { participantId: session.participantId }
        });
      }
      break;
    }

    case "webrtc:offer": {
      if (!session.roomId || !session.participantId) return;
      const targetWs = findSocketByParticipantId(session.roomId, event.payload.targetParticipantId);
      if (targetWs) {
        sendEvent(targetWs, {
          type: "webrtc:offer",
          payload: {
            fromParticipantId: session.participantId,
            sdp: event.payload.sdp
          }
        });
      }
      break;
    }

    case "webrtc:answer": {
      if (!session.roomId || !session.participantId) return;
      const targetWs = findSocketByParticipantId(session.roomId, event.payload.targetParticipantId);
      if (targetWs) {
        sendEvent(targetWs, {
          type: "webrtc:answer",
          payload: {
            fromParticipantId: session.participantId,
            sdp: event.payload.sdp
          }
        });
      }
      break;
    }

    case "webrtc:ice-candidate": {
      if (!session.roomId || !session.participantId) return;
      const targetWs = findSocketByParticipantId(session.roomId, event.payload.targetParticipantId);
      if (targetWs) {
        sendEvent(targetWs, {
          type: "webrtc:ice-candidate",
          payload: {
            fromParticipantId: session.participantId,
            candidate: event.payload.candidate
          }
        });
      }
      break;
    }

    case "room:end": {
      if (!session.roomId || !session.participantId) return;
      const room = roomManager.getRoom(session.roomId);
      if (!room || room.hostParticipantId !== session.participantId) {
        sendEvent(ws, {
          type: "error",
          payload: { code: "AUTH_FORBIDDEN", message: "Only the host can end the room." }
        });
        return;
      }

      broadcastToRoom(session.roomId, {
        type: "room:ended",
        payload: { reason: "The host has ended this watch party." }
      });
      roomManager.deleteRoom(session.roomId);
      chatManager.deleteRoomChat(session.roomId);
      break;
    }
  }
}

function handleDisconnect(session: SocketSession): void {
  if (!session.roomId || !session.participantId) return;

  const { room, newHostId, roomEnded } = roomManager.leaveRoom(
    session.roomId,
    session.participantId
  );

  if (roomEnded) {
    chatManager.deleteRoomChat(session.roomId);
    return;
  }

  if (room) {
    // If this participant was sharing screen, announce stop
    if (room.activeSharingParticipantId === session.participantId) {
      room.activeSharingParticipantId = undefined;
      broadcastToRoom(session.roomId, {
        type: "sharing:stopped",
        payload: { participantId: session.participantId }
      });
    }

    broadcastToRoom(session.roomId, {
      type: "participant:left",
      payload: {
        participantId: session.participantId,
        newHostParticipantId: newHostId
      }
    });
  }
}

// Ping-pong heartbeat to prune zombie connections every 30s
setInterval(() => {
  for (const [ws, session] of sessions.entries()) {
    if (!session.isAlive) {
      handleDisconnect(session);
      sessions.delete(ws);
      ws.terminate();
      continue;
    }
    session.isAlive = false;
    ws.ping();
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`[Virtual Movie Room Server] Listening on http://localhost:${PORT}`);
});
