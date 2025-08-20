import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketIOOptions {
  onConnect?: () => void;
  onError?: (error: Error) => void;
  onDisconnect?: (reason: string) => void;
  onMessage?: (data: any) => void;
  auth?: { 
    token: string;
    adminToken?: string;
  };
  namespace?: string;
}

// Singleton socket instance
let globalSocket: Socket | null = null;
let connectionCount = 0;

export function useSocketIO(url: string, options: SocketIOOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    console.log('Initializing Socket.IO connection to:', url);
    console.log('Auth token:', options.auth?.token ? 'Present' : 'Missing');
    
    // Use global socket if it exists and is connected
    if (globalSocket?.connected) {
      console.log('Using existing global socket connection');
      socketRef.current = globalSocket;
      setIsConnected(true);
      connectionCount++;
      return cleanup;
    }

    // Clean up any existing socket
    cleanup();

    // Create new socket connection
    const socket = io(url, {
      auth: {
        token: options.auth?.token,
        adminToken: options.auth?.adminToken
      },
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      forceNew: true,
      autoConnect: true
    });

    socketRef.current = socket;
    globalSocket = socket;
    connectionCount++;

    // Connection event
    socket.on('connect', () => {
      console.log('Socket.IO connected successfully');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      options.onConnect?.();
    });

    // Disconnection event
    socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      setIsConnected(false);
      options.onDisconnect?.(reason);

      // Handle specific disconnect reasons
      if (reason === 'io server disconnect' || reason === 'transport close') {
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`Scheduling reconnection attempt ${reconnectAttempts.current} in ${backoffTime}ms`);
          reconnectTimeoutRef.current = setTimeout(() => {
            socket.connect();
          }, backoffTime);
        }
      }
    });

    // Connection error event
    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      setIsConnected(false);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        options.onError?.(error);
      } else {
        console.log(`Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
        // Try to reconnect with polling if websocket fails
        if (socket.io?.engine?.transport?.name === 'websocket') {
          console.log('Falling back to polling transport');
          // Don't try to modify the transport name directly as it's read-only
          // Instead, let the socket handle reconnection automatically
        }
      }
    });

    // Message event
    socket.on('message', (data) => {
      console.log('Socket.IO message received:', data);
      setLastMessage(data);
      options.onMessage?.(data);
    });

    // Error event
    socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
      options.onError?.(error);
    });

    // Attempt to connect
    if (!socket.connected) {
      console.log('Attempting to connect to Socket.IO server');
      socket.connect();
    }

    return () => {
      connectionCount--;
      if (connectionCount === 0) {
        console.log('Cleaning up global socket connection');
        cleanup();
        globalSocket = null;
      }
    };
  }, [url, options.auth?.token, options.namespace, cleanup]);

  const sendMessage = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      console.log('Sending Socket.IO message:', { event, data });
      socketRef.current.emit(event, data);
    } else {
      console.warn('Cannot send message: Socket not connected');
      options.onError?.(new Error('Socket not connected'));
    }
  }, [options.onError]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    socket: socketRef.current
  };
} 