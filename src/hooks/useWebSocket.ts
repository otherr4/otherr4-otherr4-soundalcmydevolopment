import { useEffect, useRef, useState } from 'react';

interface WebSocketOptions {
  onOpen?: () => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
  onMessage?: (event: MessageEvent) => void;
}

export const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        return;
      }

      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setIsConnected(true);
        options.onOpen?.();
      };

      ws.current.onerror = (error) => {
        setIsConnected(false);
        options.onError?.(error);
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        options.onClose?.();
        
        // Attempt to reconnect after 5 seconds
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
        reconnectTimeout.current = setTimeout(connect, 3001);
      };

      ws.current.onmessage = (event) => {
        setLastMessage(event.data);
        options.onMessage?.(event);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      options.onError?.(error as Event);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [url]);

  const sendMessage = (message: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    } else {
      console.error('WebSocket is not connected');
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
    ws: ws.current
  };
}; 