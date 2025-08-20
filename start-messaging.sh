#!/bin/bash

echo "🎵 Starting SoundAlchemy Messaging System..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Check if socket.io is installed
if ! npm list socket.io > /dev/null 2>&1; then
    echo "📦 Installing Socket.IO..."
    npm install socket.io socket.io-client --legacy-peer-deps
fi

# Check if server is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Server is already running on port 3001"
    echo "🔄 Restarting server..."
    pkill -f "node.*server.js" || true
    sleep 2
fi

echo "🌐 Starting WebSocket server on port 3001..."
echo "📡 WebSocket URL: ws://localhost:3001"
echo "🔗 Health check: http://localhost:3001/api/health"
echo "📊 Status: http://localhost:3001/api/websocket-status"

# Start the server
node server.js 