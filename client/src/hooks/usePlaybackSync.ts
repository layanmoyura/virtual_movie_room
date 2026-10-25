import { useEffect, useRef, useState, useCallback } from "react";
import { PlaybackState, ClientEvent, PlaybackMode } from "@virtual-movie-room/shared";
import {
  DRIFT_JITTER_THRESHOLD_S,
  DRIFT_SEEK_THRESHOLD_S,
  HEARTBEAT_INTERVAL_MS
} from "@virtual-movie-room/shared";

interface UsePlaybackSyncProps {
  playbackState?: PlaybackState;
  isHost: boolean;
  canControl: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  send: (event: ClientEvent) => void;
}

export function usePlaybackSync({
  playbackState,
  isHost,
  canControl,
  videoRef,
  send
}: UsePlaybackSyncProps) {
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [driftSeconds, setDriftSeconds] = useState(0);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedRevisionRef = useRef<number>(-1);

  // Drift compensation effect for participants / followers
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackState) return;

    // Avoid reacting if this is our own state and we are host
    if (isHost && playbackState.revision === lastProcessedRevisionRef.current) {
      return;
    }
    lastProcessedRevisionRef.current = playbackState.revision;

    if (playbackState.status === "paused") {
      if (!video.paused) {
        video.pause();
      }
      if (Math.abs(video.currentTime - playbackState.positionSeconds) > DRIFT_JITTER_THRESHOLD_S) {
        video.currentTime = playbackState.positionSeconds;
      }
      video.playbackRate = 1.0;
      return;
    }

    if (playbackState.status === "playing") {
      const elapsedSinceUpdate = (Date.now() - playbackState.updatedAt) / 1000;
      const targetTime = playbackState.positionSeconds + Math.max(0, elapsedSinceUpdate);
      const currentDrift = video.currentTime - targetTime;
      const absDrift = Math.abs(currentDrift);
      setDriftSeconds(absDrift);

      if (absDrift < DRIFT_JITTER_THRESHOLD_S) {
        // Within normal jitter tolerance
        video.playbackRate = 1.0;
      } else if (absDrift <= DRIFT_SEEK_THRESHOLD_S) {
        // Smooth rate adjustment
        if (currentDrift < 0) {
          video.playbackRate = 1.06; // Slightly faster to catch up
        } else {
          video.playbackRate = 0.94; // Slightly slower
        }
      } else {
        // Hard seek if drift is greater than 2 seconds
        video.currentTime = Math.max(0, targetTime);
        video.playbackRate = 1.0;
      }

      if (video.paused) {
        video.play().catch(() => {
          setAutoplayBlocked(true);
        });
      }
    }
  }, [playbackState, isHost, videoRef]);

  // Host heartbeat timer to broadcast authoritative timestamp
  useEffect(() => {
    if (!isHost) {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }

    heartbeatTimerRef.current = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && playbackState?.status === "playing") {
        send({
          type: "playback:heartbeat",
          payload: { positionSeconds: video.currentTime }
        });
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
    };
  }, [isHost, playbackState?.status, send, videoRef]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video || !canControl) return;

    video.play().then(() => {
      setAutoplayBlocked(false);
      send({
        type: "playback:play",
        payload: { positionSeconds: video.currentTime }
      });
    }).catch(() => {
      setAutoplayBlocked(true);
    });
  }, [canControl, send, videoRef]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video || !canControl) return;

    video.pause();
    send({
      type: "playback:pause",
      payload: { positionSeconds: video.currentTime }
    });
  }, [canControl, send, videoRef]);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !canControl) return;

    video.currentTime = Math.max(0, time);
    send({
      type: "playback:seek",
      payload: { positionSeconds: Math.max(0, time) }
    });
  }, [canControl, send, videoRef]);

  const resync = useCallback(() => {
    const video = videoRef.current;
    if (!video || !playbackState) return;

    let targetTime = playbackState.positionSeconds;
    if (playbackState.status === "playing") {
      const elapsed = (Date.now() - playbackState.updatedAt) / 1000;
      targetTime += elapsed;
    }

    video.currentTime = Math.max(0, targetTime);
    video.playbackRate = 1.0;
    if (playbackState.status === "playing" && video.paused) {
      video.play().then(() => setAutoplayBlocked(false)).catch(() => setAutoplayBlocked(true));
    }
  }, [playbackState, videoRef]);

  const setSource = useCallback((sourceUrl: string, mode: PlaybackMode) => {
    if (!canControl) return;
    send({
      type: "media:set-source",
      payload: { sourceUrl, mode }
    });
  }, [canControl, send]);

  const clearAutoplayBanner = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.play().then(() => setAutoplayBlocked(false)).catch(console.error);
    } else {
      setAutoplayBlocked(false);
    }
  }, [videoRef]);

  return {
    play,
    pause,
    seek,
    resync,
    setSource,
    driftSeconds,
    autoplayBlocked,
    clearAutoplayBanner
  };
}
