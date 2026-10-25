import { useEffect, useRef, useState, useCallback } from "react";
import { ClientEvent, ServerEvent } from "@virtual-movie-room/shared";

type ServerEventHandler = (event: ServerEvent) => void;

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<ServerEventHandler>>(new Set());
  const pendingQueueRef = useRef<ClientEvent[]>([]);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // In dev, Vite proxies or connects to 3001
    const host = window.location.port === "5173" ? `${window.location.hostname}:3001` : window.location.host;
    const wsUrl = `${protocol}//${host}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setReconnectAttempts(0);

      // Flush any queued messages
      while (pendingQueueRef.current.length > 0) {
        const item = pendingQueueRef.current.shift();
        if (item) {
          ws.send(JSON.stringify(item));
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const parsed: ServerEvent = JSON.parse(event.data);
        for (const handler of handlersRef.current) {
          handler(parsed);
        }
      } catch (err) {
        console.error("Failed to parse incoming WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      // Exponential backoff reconnect: 1s, 2s, 4s, capped at 10s
      setReconnectAttempts((prev) => {
        const next = prev + 1;
        const delay = Math.min(1000 * Math.pow(2, prev), 10000);
        setTimeout(() => connect(), delay);
        return next;
      });
    };

    ws.onerror = (error) => {
      console.error("WebSocket encountered an error:", error);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((event: ClientEvent) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    } else {
      pendingQueueRef.current.push(event);
    }
  }, []);

  const subscribe = useCallback((handler: ServerEventHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return { isConnected, reconnectAttempts, send, subscribe };
}
