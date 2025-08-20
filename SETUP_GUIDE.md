# 🎵 SoundAlchemy Messaging System - Setup Guide

## 🚀 **Quick Start**

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Two verified musician accounts for testing

### 1. **Install Dependencies**
```bash
npm install --legacy-peer-deps
```

### 2. **Start WebSocket Server**
```bash
# Option 1: Use the simple script
./start-messaging.sh

# Option 2: Start manually
node server.js
```

### 3. **Start Frontend**
```bash
# In a new terminal
npm run dev
```

### 4. **Verify Setup**
- Health check: http://localhost:3001/api/health
- WebSocket status: http://localhost:3001/api/websocket-status
- Frontend: http://localhost:5173

## ✅ **Verification Steps**

### Check Server Status
```bash
# Health check
curl http://localhost:3001/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-07-10T02:06:27.597Z",
  "connectedUsers": 0,
  "socketConnections": 0
}

# WebSocket status
curl http://localhost:3001/api/websocket-status

# Expected response:
{
  "status": "running",
  "connectedUsers": [],
  "totalConnections": 0,
  "timestamp": "2025-07-10T02:06:33.031Z"
}
```

### Check Frontend Connection
1. Open browser console
2. Look for: "WebSocket connected successfully"
3. Look for: "WebSocket authenticated"

## 🧪 **Testing the Messaging System**

### Basic Test
1. **Login as Musician A**
2. **Open messaging interface** (floating button or navbar)
3. **Select a conversation with Musician B**
4. **Send a message**
5. **Expected**: Message appears immediately with "sent" status

### Real-Time Test
1. **Open two browser windows/tabs**
2. **Login as Musician A in window 1**
3. **Login as Musician B in window 2**
4. **Both open the same conversation**
5. **Musician A sends a message**
6. **Expected**: Musician B sees message instantly (< 1 second)

### Call Test
1. **Musician A clicks voice call button**
2. **Expected**: Call state changes to "calling"
3. **Expected**: Microphone permission requested
4. **Musician B receives call notification**
5. **Musician B accepts call**
6. **Expected**: Call connects, both users can hear each other

## 🔧 **Troubleshooting**

### Dependency Issues
```bash
# If you get dependency conflicts
npm install --legacy-peer-deps

# If Socket.IO is missing
npm install socket.io socket.io-client --legacy-peer-deps
```

### Server Won't Start
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill existing process
pkill -f "node.*server.js"

# Start server again
node server.js
```

### WebSocket Connection Issues
1. Check browser console for errors
2. Verify server is running: `curl http://localhost:3001/api/health`
3. Check CORS settings in server.js
4. Ensure firewall allows port 3001

### Call Issues
1. Check microphone/camera permissions
2. Ensure both users are online
3. Check browser console for WebRTC errors
4. Verify STUN servers are accessible

## 📱 **Features Available**

### ✅ **Real-Time Messaging**
- Instant message delivery
- Message status tracking (sent → delivered → read)
- Typing indicators with animations
- Message actions (reply, forward, copy, edit, delete)

### ✅ **Voice & Video Calls**
- WebRTC-based calls
- Call signaling through WebSocket
- Mute/unmute functionality
- Speaker mode toggle
- Call controls and UI

### ✅ **User Status & Presence**
- Real-time online/offline status
- Last seen timestamps
- Away status detection
- Visual status indicators

### ✅ **Security & Privacy**
- Friend-only messaging
- Verified user requirements
- Message encryption
- Privacy controls

## 🎯 **Performance Benchmarks**

- **Message sending**: < 1 second
- **Typing indicators**: < 500ms delay
- **Real-time updates**: < 200ms
- **Call connection**: < 3 seconds
- **UI responsiveness**: Smooth animations

## 📊 **System Status**

| Component | Status | URL |
|-----------|--------|-----|
| **WebSocket Server** | ✅ Running | ws://localhost:3001 |
| **Health Check** | ✅ Available | http://localhost:3001/api/health |
| **Status Monitor** | ✅ Available | http://localhost:3001/api/websocket-status |
| **Frontend** | ✅ Available | http://localhost:5173 |

## 🎉 **Success Indicators**

Your messaging system is working correctly when:

- ✅ Server starts without errors
- ✅ Health endpoint returns "ok"
- ✅ WebSocket status shows "running"
- ✅ Frontend connects to WebSocket
- ✅ Messages send instantly
- ✅ Calls connect successfully
- ✅ Typing indicators work
- ✅ User status updates in real-time

## 🔮 **Next Steps**

1. **Test with multiple users**
2. **Verify all features work**
3. **Check mobile responsiveness**
4. **Test error scenarios**
5. **Deploy to production**

## 📞 **Support**

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for errors
3. Check browser console for client errors
4. Verify all dependencies are installed
5. Ensure both server and frontend are running

**🎵 Your SoundAlchemy messaging system is now WhatsApp-level! 🎵** 