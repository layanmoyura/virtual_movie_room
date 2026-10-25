import { useState, useRef, useCallback, useEffect } from "react";
import { ClientEvent, ServerEvent } from "@virtual-movie-room/shared";

interface UseScreenShareProps {
  selfParticipantId: string;
  activeSharingParticipantId?: string;
  send: (event: ClientEvent) => void;
  subscribe: (handler: (event: ServerEvent) => void) => () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

export function useScreenShare({
  selfParticipantId,
  activeSharingParticipantId,
  send,
  subscribe
}: UseScreenShareProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map()); // participantId -> RTCPeerConnection

  const isSelfSharing = isSharing && activeSharingParticipantId === selfParticipantId;

  // Cleanup helper
  const stopSharing = useCallback(() => {
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
      localStreamRef.current = null;
    }

    for (const pc of peerConnectionsRef.current.values()) {
      pc.close();
    }
    peerConnectionsRef.current.clear();

    setIsSharing(false);
    send({ type: "sharing:stop" });
  }, [send]);

  const startSharing = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert("Screen sharing is not supported by your browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      setIsSharing(true);

      // Listen for browser native "Stop Sharing" button
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopSharing();
        };
      }

      send({ type: "sharing:start" });
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        console.error("Screen share permission error:", err);
      }
    }
  }, [send, stopSharing]);

  // Handle incoming signaling messages
  useEffect(() => {
    const unsubscribe = subscribe(async (event: ServerEvent) => {
      switch (event.type) {
        case "sharing:started": {
          // If another user started sharing, prepare to receive
          if (event.payload.participantId !== selfParticipantId) {
            // Wait for offer from sharer
          }
          break;
        }

        case "sharing:stopped": {
          if (remoteStream) {
            for (const track of remoteStream.getTracks()) {
              track.stop();
            }
            setRemoteStream(null);
          }
          if (event.payload.participantId === selfParticipantId) {
            setIsSharing(false);
          }
          break;
        }

        case "participant:joined": {
          // If we are sharing, create WebRTC offer for the new participant
          if (localStreamRef.current && isSharing) {
            const targetId = event.payload.participant.participantId;
            const pc = new RTCPeerConnection(RTC_CONFIG);
            peerConnectionsRef.current.set(targetId, pc);

            localStreamRef.current.getTracks().forEach((track) => {
              pc.addTrack(track, localStreamRef.current!);
            });

            pc.onicecandidate = (iceEvent) => {
              if (iceEvent.candidate) {
                send({
                  type: "webrtc:ice-candidate",
                  payload: { targetParticipantId: targetId, candidate: iceEvent.candidate }
                });
              }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            send({
              type: "webrtc:offer",
              payload: { targetParticipantId: targetId, sdp: offer }
            });
          }
          break;
        }

        case "webrtc:offer": {
          const fromId = event.payload.fromParticipantId;
          const pc = new RTCPeerConnection(RTC_CONFIG);
          peerConnectionsRef.current.set(fromId, pc);

          pc.ontrack = (trackEvent) => {
            if (trackEvent.streams && trackEvent.streams[0]) {
              setRemoteStream(trackEvent.streams[0]);
            }
          };

          pc.onicecandidate = (iceEvent) => {
            if (iceEvent.candidate) {
              send({
                type: "webrtc:ice-candidate",
                payload: { targetParticipantId: fromId, candidate: iceEvent.candidate }
              });
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(event.payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          send({
            type: "webrtc:answer",
            payload: { targetParticipantId: fromId, sdp: answer }
          });
          break;
        }

        case "webrtc:answer": {
          const pc = peerConnectionsRef.current.get(event.payload.fromParticipantId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(event.payload.sdp));
          }
          break;
        }

        case "webrtc:ice-candidate": {
          const pc = peerConnectionsRef.current.get(event.payload.fromParticipantId);
          if (pc && event.payload.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(event.payload.candidate));
            } catch (err) {
              console.error("Failed to add ICE candidate:", err);
            }
          }
          break;
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selfParticipantId, isSharing, remoteStream, send, subscribe]);

  return {
    isSharing,
    isSelfSharing,
    remoteStream,
    localStream: localStreamRef.current,
    startSharing,
    stopSharing
  };
}
