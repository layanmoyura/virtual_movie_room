import {
  Room,
  Participant,
  PlaybackState,
  RoomSettings
} from "@virtual-movie-room/shared";
import {
  ROOM_EXPIRATION_MS,
  MAX_PARTICIPANTS_PER_ROOM,
  generateRandomGuestName
} from "@virtual-movie-room/shared";
import { randomBytes } from "crypto";

// Code dictionary without ambiguous characters (0, O, 1, I)
const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateSecureId(length = 10): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CODE_CHARS[bytes[i] % CODE_CHARS.length].toLowerCase();
  }
  return result;
}

function generateRoomCode(): string {
  const bytes = randomBytes(4);
  let code = "MV-";
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return code;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map(); // roomId -> Room
  private codeToRoomId: Map<string, string> = new Map(); // roomCode -> roomId
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start background inactivity sweep every 60 seconds
    this.cleanupInterval = setInterval(() => this.sweepExpiredRooms(), 60 * 1000);
  }

  public createRoom(hostDisplayName?: string): { room: Room; hostParticipantId: string } {
    const roomId = generateSecureId(10);
    let roomCode = generateRoomCode();
    while (this.codeToRoomId.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const hostParticipantId = `p-${generateSecureId(8)}`;
    const now = Date.now();

    const hostParticipant: Participant = {
      participantId: hostParticipantId,
      displayName: hostDisplayName?.trim() || generateRandomGuestName(),
      role: "host",
      joinedAt: now,
      connectionState: "connected"
    };

    const initialPlaybackState: PlaybackState = {
      mode: "direct-video",
      sourceUrl: undefined,
      status: "paused",
      positionSeconds: 0,
      updatedAt: now,
      revision: 1
    };

    const settings: RoomSettings = {
      allowGuestControl: false, // Default: Host-only control
      locked: false,
      maxParticipants: MAX_PARTICIPANTS_PER_ROOM
    };

    const room: Room = {
      roomId,
      roomCode,
      hostParticipantId,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + ROOM_EXPIRATION_MS,
      settings,
      participants: [hostParticipant],
      playbackState: initialPlaybackState,
      activeSharingParticipantId: undefined
    };

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(roomCode, roomId);

    return { room, hostParticipantId };
  }

  public getRoom(roomIdOrCode: string): Room | undefined {
    const normalized = roomIdOrCode.trim();
    if (this.rooms.has(normalized)) {
      return this.rooms.get(normalized);
    }
    const mappedId = this.codeToRoomId.get(normalized.toUpperCase());
    if (mappedId && this.rooms.has(mappedId)) {
      return this.rooms.get(mappedId);
    }
    return undefined;
  }

  public joinRoom(
    roomIdOrCode: string,
    guestDisplayName?: string
  ): { room: Room; participant: Participant } | { error: string } {
    const room = this.getRoom(roomIdOrCode);
    if (!room) {
      return { error: "Room not found or has expired." };
    }

    if (room.settings.locked) {
      return { error: "This room has been locked by the host." };
    }

    if (room.participants.length >= room.settings.maxParticipants) {
      return { error: "This room is at maximum capacity." };
    }

    const participantId = `p-${generateSecureId(8)}`;
    const now = Date.now();
    const participant: Participant = {
      participantId,
      displayName: guestDisplayName?.trim() || generateRandomGuestName(),
      role: "guest",
      joinedAt: now,
      connectionState: "connected"
    };

    room.participants.push(participant);
    this.touchActivity(room);

    return { room, participant };
  }

  public leaveRoom(
    roomId: string,
    participantId: string
  ): { room?: Room; newHostId?: string; roomEnded?: boolean } {
    const room = this.rooms.get(roomId);
    if (!room) return {};

    const index = room.participants.findIndex((p) => p.participantId === participantId);
    if (index === -1) return { room };

    room.participants.splice(index, 1);
    this.touchActivity(room);

    // If sharing screen, stop sharing
    if (room.activeSharingParticipantId === participantId) {
      room.activeSharingParticipantId = undefined;
    }

    // If room is empty, delete it
    if (room.participants.length === 0) {
      this.deleteRoom(roomId);
      return { roomEnded: true };
    }

    // Host succession: if host left, assign earliest participant as new host
    let newHostId: string | undefined;
    if (room.hostParticipantId === participantId) {
      const newHost = room.participants[0];
      newHost.role = "host";
      room.hostParticipantId = newHost.participantId;
      newHostId = newHost.participantId;
    }

    return { room, newHostId };
  }

  public updateDisplayName(
    roomId: string,
    participantId: string,
    newName: string
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const participant = room.participants.find((p) => p.participantId === participantId);
    if (!participant) return false;

    participant.displayName = newName.trim().slice(0, 32) || generateRandomGuestName();
    this.touchActivity(room);
    return true;
  }

  public updateSettings(
    roomId: string,
    participantId: string,
    newSettings: Partial<RoomSettings>
  ): RoomSettings | null {
    const room = this.rooms.get(roomId);
    if (!room || room.hostParticipantId !== participantId) {
      return null; // Only host can update room settings
    }

    if (typeof newSettings.allowGuestControl === "boolean") {
      room.settings.allowGuestControl = newSettings.allowGuestControl;
    }
    if (typeof newSettings.locked === "boolean") {
      room.settings.locked = newSettings.locked;
    }

    this.touchActivity(room);
    return room.settings;
  }

  public touchActivity(room: Room): void {
    const now = Date.now();
    room.lastActivityAt = now;
    room.expiresAt = now + ROOM_EXPIRATION_MS;
  }

  public deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.codeToRoomId.delete(room.roomCode);
      this.rooms.delete(roomId);
    }
  }

  public sweepExpiredRooms(): string[] {
    const now = Date.now();
    const expiredRoomIds: string[] = [];

    for (const [roomId, room] of this.rooms.entries()) {
      if (now > room.expiresAt) {
        expiredRoomIds.push(roomId);
        this.deleteRoom(roomId);
      }
    }

    return expiredRoomIds;
  }

  public getActiveRoomCount(): number {
    return this.rooms.size;
  }

  public close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
