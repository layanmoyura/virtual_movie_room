import { ChatMessage, MAX_CHAT_LENGTH, RATE_LIMIT_CHAT_PER_3S, sanitizeText } from "@virtual-movie-room/shared";
import { randomBytes } from "crypto";

export class ChatManager {
  private chatHistory: Map<string, ChatMessage[]> = new Map(); // roomId -> ChatMessage[]
  private rateLimits: Map<string, number[]> = new Map(); // participantId -> timestamps[]

  /**
   * Adds a message to room chat history after validation, rate-limiting, and sanitization.
   */
  public addMessage(
    roomId: string,
    participantId: string,
    displayName: string,
    rawText: string
  ): ChatMessage | { error: string } {
    if (!rawText || typeof rawText !== "string") {
      return { error: "Message text cannot be empty." };
    }

    const trimmed = rawText.trim();
    if (trimmed.length === 0) {
      return { error: "Message text cannot be empty." };
    }

    if (trimmed.length > MAX_CHAT_LENGTH) {
      return { error: `Message exceeds maximum limit of ${MAX_CHAT_LENGTH} characters.` };
    }

    // Rate limiting check
    const now = Date.now();
    const timestamps = this.rateLimits.get(participantId) || [];
    const validTimestamps = timestamps.filter((t) => now - t < 3000);

    if (validTimestamps.length >= RATE_LIMIT_CHAT_PER_3S) {
      return { error: "You are sending messages too quickly. Please wait a moment." };
    }

    validTimestamps.push(now);
    this.rateLimits.set(participantId, validTimestamps);

    // Sanitize message content against XSS
    const sanitized = sanitizeText(trimmed);

    const message: ChatMessage = {
      id: `msg-${randomBytes(6).toString("hex")}`,
      participantId,
      displayName: sanitizeText(displayName),
      text: sanitized,
      timestamp: now
    };

    if (!this.chatHistory.has(roomId)) {
      this.chatHistory.set(roomId, []);
    }

    const history = this.chatHistory.get(roomId)!;
    history.push(message);

    // Keep ring buffer to last 50 messages per room
    if (history.length > 50) {
      history.shift();
    }

    return message;
  }

  public getHistory(roomId: string): ChatMessage[] {
    return this.chatHistory.get(roomId) || [];
  }

  public deleteRoomChat(roomId: string): void {
    this.chatHistory.delete(roomId);
  }
}
