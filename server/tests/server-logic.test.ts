import test from "node:test";
import assert from "node:assert";
import { RoomManager } from "../dist/room-manager.js";
import { PlaybackSyncManager } from "../dist/playback-sync.js";
import { ChatManager } from "../dist/chat-manager.js";

test("RoomManager - Creation and Code Generation", () => {
  const rm = new RoomManager();
  const { room, hostParticipantId } = rm.createRoom("CinemaHost");

  assert.ok(room.roomId.length >= 10);
  assert.ok(room.roomCode.startsWith("MV-"));
  assert.strictEqual(room.participants.length, 1);
  assert.strictEqual(room.participants[0].displayName, "CinemaHost");
  assert.strictEqual(room.participants[0].role, "host");
  assert.strictEqual(room.hostParticipantId, hostParticipantId);
  assert.strictEqual(room.settings.allowGuestControl, false);

  rm.close();
});

test("RoomManager - Guest Join and Display Name Update", () => {
  const rm = new RoomManager();
  const { room } = rm.createRoom("Host");

  const joinRes = rm.joinRoom(room.roomCode, "Guest1");
  assert.strictEqual("error" in joinRes, false);
  if (!("error" in joinRes)) {
    assert.strictEqual(joinRes.participant.displayName, "Guest1");
    assert.strictEqual(joinRes.participant.role, "guest");
    assert.strictEqual(joinRes.room.participants.length, 2);

    const renamed = rm.updateDisplayName(room.roomId, joinRes.participant.participantId, "RenamedGuest");
    assert.strictEqual(renamed, true);
    assert.strictEqual(room.participants[1].displayName, "RenamedGuest");
  }

  rm.close();
});

test("RoomManager - Host Succession on Leave", () => {
  const rm = new RoomManager();
  const { room, hostParticipantId } = rm.createRoom("OriginalHost");
  const joinRes = rm.joinRoom(room.roomId, "FutureHost");

  if (!("error" in joinRes)) {
    const leaveRes = rm.leaveRoom(room.roomId, hostParticipantId);
    assert.strictEqual(leaveRes.newHostId, joinRes.participant.participantId);
    assert.strictEqual(room.hostParticipantId, joinRes.participant.participantId);
    assert.strictEqual(room.participants[0].role, "host");
  }

  rm.close();
});

test("PlaybackSyncManager - Host Authority & Permissions", () => {
  const rm = new RoomManager();
  const ps = new PlaybackSyncManager();
  const { room, hostParticipantId } = rm.createRoom("Host");
  const joinRes = rm.joinRoom(room.roomId, "Guest");

  if (!("error" in joinRes)) {
    const guestId = joinRes.participant.participantId;

    // Guest should be blocked from controlling playback when allowGuestControl is false
    const guestPlay = ps.play(room, guestId, 10);
    assert.strictEqual("error" in guestPlay, true);

    // Host should be able to play
    const hostPlay = ps.play(room, hostParticipantId, 0);
    assert.strictEqual("error" in hostPlay, false);
    if (!("error" in hostPlay)) {
      assert.strictEqual(hostPlay.status, "playing");
      assert.strictEqual(hostPlay.revision, 2);
    }

    // Host allows guest control
    rm.updateSettings(room.roomId, hostParticipantId, { allowGuestControl: true });
    const guestSeek = ps.seek(room, guestId, 45);
    assert.strictEqual("error" in guestSeek, false);
    if (!("error" in guestSeek)) {
      assert.strictEqual(guestSeek.positionSeconds, 45);
      assert.strictEqual(guestSeek.revision, 3);
    }
  }

  rm.close();
});

test("ChatManager - Sanitization and Length Limits", () => {
  const cm = new ChatManager();
  const valid = cm.addMessage("room-1", "user-1", "Alice", "Hello watch party!");
  assert.strictEqual("error" in valid, false);
  if (!("error" in valid)) {
    assert.strictEqual(valid.text, "Hello watch party!");
  }

  const oversized = "x".repeat(501);
  const rejected = cm.addMessage("room-1", "user-1", "Alice", oversized);
  assert.strictEqual("error" in rejected, true);

  const xss = cm.addMessage("room-1", "user-1", "Alice", '<img src=x onerror="alert(1)">');
  assert.strictEqual("error" in xss, false);
  if (!("error" in xss)) {
    assert.strictEqual(xss.text.includes("<img"), false);
    assert.strictEqual(xss.text.includes("&lt;img"), true);
  }
});
