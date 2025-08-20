#!/bin/bash

echo "🚀 Starting SoundAlchemy WebSocket Server..."

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Check if socket.io is installed
if ! npm list socket.io > /dev/null 2>&1; then
    echo "📦 Installing Socket.IO server..."
    npm install socket.io --legacy-peer-deps
fi

# Check if the server is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Server is already running on port 3001"
    echo "🔄 Restarting server..."
    pkill -f "node.*server.js" || true
    sleep 2
fi

# Start the server
echo "🌐 Starting WebSocket server on port 3001..."
echo "📡 WebSocket URL: ws://localhost:3001"
echo "🔗 Health check: http://localhost:3001/api/health"
echo "📊 Status: http://localhost:3001/api/websocket-status"

# Start the server in the background
node server.js &

# Wait a moment for server to start
sleep 3

# Check if server started successfully
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Server started successfully!"
    echo "🎵 SoundAlchemy messaging system is ready!"
    echo ""
    echo "📱 Features available:"
    echo "   • Real-time messaging"
    echo "   • Voice and video calls"
    echo "   • Typing indicators"
    echo "   • Online status"
    echo "   • Message delivery status"
    echo ""
    echo "🔧 To stop the server, run: pkill -f 'node.*server.js'"
else
    echo "❌ Failed to start server. Check the logs above."
    exit 1
fi

# Keep the script running
wait 