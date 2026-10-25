import { Room, PlaybackState, PlaybackMode } from "@virtual-movie-room/shared";

export class PlaybackSyncManager {
  /**
   * Checks if a participant is authorized to mutate playback controls.
   */
  public canControl(room: Room, participantId: string): boolean {
    if (room.hostParticipantId === participantId) {
      return true;
    }
    return room.settings.allowGuestControl;
  }

  /**
   * Sets new media source URL and detects/sets mode.
   */
  public setSource(
    room: Room,
    participantId: string,
    sourceUrl: string,
    mode: PlaybackMode
  ): PlaybackState | { error: string } {
    if (!this.canControl(room, participantId)) {
      return { error: "Only the host can change the media source." };
    }

    const now = Date.now();
    room.playbackState = {
      mode,
      sourceUrl,
      status: "paused",
      positionSeconds: 0,
      updatedAt: now,
      revision: room.playbackState.revision + 1
    };

    return room.playbackState;
  }

  /**
   * Updates playback status to "playing" and synchronizes timestamp.
   */
  public play(
    room: Room,
    participantId: string,
    positionSeconds: number
  ): PlaybackState | { error: string } {
    if (!this.canControl(room, participantId)) {
      return { error: "Only the host can control playback." };
    }

    const now = Date.now();
    room.playbackState = {
      ...room.playbackState,
      status: "playing",
      positionSeconds: Math.max(0, positionSeconds),
      updatedAt: now,
      revision: room.playbackState.revision + 1
    };

    return room.playbackState;
  }

  /**
   * Updates playback status to "paused" and synchronizes timestamp.
   */
  public pause(
    room: Room,
    participantId: string,
    positionSeconds: number
  ): PlaybackState | { error: string } {
    if (!this.canControl(room, participantId)) {
      return { error: "Only the host can control playback." };
    }

    const now = Date.now();
    room.playbackState = {
      ...room.playbackState,
      status: "paused",
      positionSeconds: Math.max(0, positionSeconds),
      updatedAt: now,
      revision: room.playbackState.revision + 1
    };

    return room.playbackState;
  }

  /**
   * Seeks to a new position in the media.
   */
  public seek(
    room: Room,
    participantId: string,
    positionSeconds: number
  ): PlaybackState | { error: string } {
    if (!this.canControl(room, participantId)) {
      return { error: "Only the host can seek playback." };
    }

    const now = Date.now();
    room.playbackState = {
      ...room.playbackState,
      positionSeconds: Math.max(0, positionSeconds),
      updatedAt: now,
      revision: room.playbackState.revision + 1
    };

    return room.playbackState;
  }

  /**
   * Host heartbeat update (keeps position accurate without bumping revision).
   */
  public heartbeat(
    room: Room,
    participantId: string,
    positionSeconds: number
  ): PlaybackState | null {
    // Only host emits authoritative heartbeat
    if (room.hostParticipantId !== participantId) {
      return null;
    }

    const now = Date.now();
    room.playbackState.positionSeconds = Math.max(0, positionSeconds);
    room.playbackState.updatedAt = now;

    return room.playbackState;
  }
}
