const isDevelopment = import.meta.env.DEV;
const defaultApiPort = '5000';
const defaultWebsocketPort = '5000';

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'https://sound-alchemy-finished-backend.vercel.app/api',
  wsUrl: import.meta.env.VITE_WS_URL || `ws://localhost:${defaultWebsocketPort}`,
  environment: import.meta.env.MODE || 'development',
  isDevelopment,
  isProduction: import.meta.env.PROD,
  appName: import.meta.env.VITE_APP_NAME || 'SoundAlchemy',
  apiTimeout: 30000, // 30 seconds
  wsReconnectInterval: 3000, // 3 seconds
  wsMaxReconnectAttempts: 5
};

export default config; 