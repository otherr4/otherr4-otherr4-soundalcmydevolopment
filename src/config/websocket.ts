import { io, Socket } from 'socket.io-client';

// WebSocket server URL - change this for production
const WEBSOCKET_URL = process.env.NODE_ENV === 'production' 
  ? 'https://3001-cs-2ed35aed-393c-43ea-b4b9-609063d003c2.cs-asia-southeast1-ajrg.cloudshell.dev/?authuser=0' 
  : 'http://localhost:3001';

// Singleton socket instance
let globalSocket: Socket | null = null;

export const createWebSocketConnection = (userId: string): Socket => {
  // If we already have a connected socket, return it
  if (globalSocket?.connected) {
    return globalSocket;
  }

  // Create new socket connection
  const socket = io(WEBSOCKET_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('WebSocket connected successfully');
    
    // Authenticate with the server
    socket.emit('authenticate', { userId });
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  socket.on('authenticated', (data) => {
    console.log('WebSocket authenticated:', data);
  });

  socket.on('auth_error', (error) => {
    console.error('WebSocket authentication error:', error);
  });

  // Store the global socket
  globalSocket = socket;
  
  return socket;
};

export const getWebSocketConnection = (): Socket | null => {
  return globalSocket;
};

export const disconnectWebSocket = () => {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
};

export const isWebSocketConnected = (): boolean => {
  return globalSocket?.connected || false;
}; 