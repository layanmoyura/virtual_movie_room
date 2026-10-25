export type PlaybackMode = "direct-video" | "official-embed" | "manual-sync" | "shared-tab";
export type PlaybackStatus = "playing" | "paused" | "loading" | "error";
export type ParticipantRole = "host" | "guest";

export interface Participant {
  participantId: string;
  displayName: string;
  role: ParticipantRole;
  joinedAt: number;
  connectionState: "connected" | "reconnecting" | "disconnected";
}

export interface PlaybackState {
  mode: PlaybackMode;
  sourceUrl?: string;
  status: PlaybackStatus;
  positionSeconds: number;
  updatedAt: number;
  revision: number;
}

export interface ChatMessage {
  id: string;
  participantId: string;
  displayName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomSettings {
  allowGuestControl: boolean;
  locked: boolean;
  maxParticipants: number;
}

export interface Room {
  roomId: string;
  roomCode: string;
  hostParticipantId: string;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  settings: RoomSettings;
  participants: Participant[];
  playbackState: PlaybackState;
  activeSharingParticipantId?: string;
}

export interface UrlValidationResult {
  valid: boolean;
  mode?: PlaybackMode;
  error?: string;
  normalizedUrl?: string;
}

// ==========================================
// WebSocket Wire Protocol Events
// ==========================================

export type ClientEvent =
  | { type: "room:create"; payload: { displayName?: string } }
  | { type: "room:join"; payload: { roomIdOrCode: string; displayName?: string } }
  | { type: "room:leave"; payload?: Record<string, never> }
  | { type: "room:update-settings"; payload: { allowGuestControl?: boolean; locked?: boolean } }
  | { type: "participant:update-name"; payload: { displayName: string } }
  | { type: "media:set-source"; payload: { sourceUrl: string; mode: PlaybackMode } }
  | { type: "playback:play"; payload: { positionSeconds: number } }
  | { type: "playback:pause"; payload: { positionSeconds: number } }
  | { type: "playback:seek"; payload: { positionSeconds: number } }
  | { type: "playback:heartbeat"; payload: { positionSeconds: number } }
  | { type: "chat:message"; payload: { text: string } }
  | { type: "sharing:start"; payload?: Record<string, never> }
  | { type: "sharing:stop"; payload?: Record<string, never> }
  | { type: "webrtc:offer"; payload: { targetParticipantId: string; sdp: any } }
  | { type: "webrtc:answer"; payload: { targetParticipantId: string; sdp: any } }
  | { type: "webrtc:ice-candidate"; payload: { targetParticipantId: string; candidate: any } }
  | { type: "room:end"; payload?: Record<string, never> };

export type ServerEvent =
  | { type: "room:joined"; payload: { selfParticipantId: string; room: Room; chatHistory: ChatMessage[] } }
  | { type: "participant:joined"; payload: { participant: Participant } }
  | { type: "participant:left"; payload: { participantId: string; newHostParticipantId?: string } }
  | { type: "participant:updated"; payload: { participantId: string; displayName: string } }
  | { type: "room:settings-updated"; payload: RoomSettings }
  | { type: "playback:state"; payload: PlaybackState }
  | { type: "chat:message"; payload: ChatMessage }
  | { type: "sharing:started"; payload: { participantId: string; displayName: string } }
  | { type: "sharing:stopped"; payload: { participantId: string } }
  | { type: "webrtc:offer"; payload: { fromParticipantId: string; sdp: any } }
  | { type: "webrtc:answer"; payload: { fromParticipantId: string; sdp: any } }
  | { type: "webrtc:ice-candidate"; payload: { fromParticipantId: string; candidate: any } }
  | { type: "room:ended"; payload: { reason: string } }
  | { type: "room:expired"; payload: { reason: string } }
  | { type: "error"; payload: { code: string; message: string } };

export type WebSocketMessage = ClientEvent | ServerEvent;
