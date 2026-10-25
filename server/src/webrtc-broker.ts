import { Room } from "@virtual-movie-room/shared";

export class WebRtcBroker {
  /**
   * Validates if a participant can initiate screen sharing.
   */
  public startSharing(room: Room, participantId: string): boolean {
    // If someone is already sharing, don't allow collision
    if (room.activeSharingParticipantId && room.activeSharingParticipantId !== participantId) {
      return false;
    }
    room.activeSharingParticipantId = participantId;
    return true;
  }

  /**
   * Stops screen sharing.
   */
  public stopSharing(room: Room, participantId: string): boolean {
    if (room.activeSharingParticipantId === participantId) {
      room.activeSharingParticipantId = undefined;
      return true;
    }
    return false;
  }

  public getActiveSharer(room: Room): string | undefined {
    return room.activeSharingParticipantId;
  }
}
