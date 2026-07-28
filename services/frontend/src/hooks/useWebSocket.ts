import { useCallback, useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: string) => void;
  reconnectIntervalMs?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket({
  url,
  onMessage,
  reconnectIntervalMs = 2000,
  maxReconnectAttempts = 5,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectCountRef.current = 0;

        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (onMessage) {
          onMessage(event.data);
        }
      };

      ws.onerror = () => {
        setError('WebSocket encountered a network disruption');
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        if (reconnectCountRef.current < maxReconnectAttempts) {

          const timeout = reconnectIntervalMs * Math.pow(1.5, reconnectCountRef.current);
          reconnectCountRef.current += 1;
          setTimeout(() => {
            connect();
          }, timeout);
        } else {
          setError('Max reconnection attempts reached');
        }
      };
    } catch (err) {
      setError(`WebSocket initialization failed: ${String(err)}`);
    }
  }, [url, onMessage, reconnectIntervalMs, maxReconnectAttempts]);

  useEffect(() => {
    connect();
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  return { isConnected, error, sendMessage };
}
