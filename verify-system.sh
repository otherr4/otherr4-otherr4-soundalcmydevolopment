#!/bin/bash

echo "🎵 SoundAlchemy Messaging System - Verification Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Checking $name... "
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ RUNNING${NC}"
        return 0
    else
        echo -e "${RED}❌ NOT RUNNING${NC}"
        return 1
    fi
}

# Function to check health endpoint
check_health() {
    local url=$1
    local response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | grep -q '"status":"ok"'; then
        echo -e "${GREEN}✅ HEALTHY${NC}"
        return 0
    else
        echo -e "${RED}❌ UNHEALTHY${NC}"
        return 1
    fi
}

echo ""
echo "🔧 Checking Dependencies..."
echo "------------------------"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules directory exists${NC}"
else
    echo -e "${RED}❌ node_modules directory missing${NC}"
    echo "Run: npm install --legacy-peer-deps"
    exit 1
fi

# Check if Socket.IO is installed
if npm list socket.io > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Socket.IO server installed${NC}"
else
    echo -e "${RED}❌ Socket.IO server missing${NC}"
fi

# Check if Socket.IO client is installed
if npm list socket.io-client > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Socket.IO client installed${NC}"
else
    echo -e "${RED}❌ Socket.IO client missing${NC}"
fi

# Check if emoji-mart is installed
if npm list emoji-mart > /dev/null 2>&1; then
    echo -e "${GREEN}✅ emoji-mart installed${NC}"
else
    echo -e "${RED}❌ emoji-mart missing${NC}"
fi

echo ""
echo "🌐 Checking WebSocket Server..."
echo "----------------------------"

# Check if server is running on port 3001
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✅ WebSocket server running on port 3001${NC}"
else
    echo -e "${RED}❌ WebSocket server not running on port 3001${NC}"
    echo "Start with: node server.js"
fi

# Check health endpoint
echo -n "Health check... "
check_health "http://localhost:3001/api/health"

# Check WebSocket status endpoint
echo -n "WebSocket status... "
check_health "http://localhost:3001/api/websocket-status"

echo ""
echo "📱 Checking Frontend..."
echo "---------------------"

# Check if frontend is running on port 5173
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✅ Frontend running on port 5173${NC}"
else
    echo -e "${RED}❌ Frontend not running on port 5173${NC}"
    echo "Start with: npm run dev"
fi

# Check frontend accessibility
echo -n "Frontend accessibility... "
check_service "Frontend" "http://localhost:5173" "200"

echo ""
echo "🔗 Checking URLs..."
echo "-----------------"

echo "WebSocket Server: ${YELLOW}ws://localhost:3001${NC}"
echo "Health Check: ${YELLOW}http://localhost:3001/api/health${NC}"
echo "Status Monitor: ${YELLOW}http://localhost:3001/api/websocket-status${NC}"
echo "Frontend: ${YELLOW}http://localhost:5173${NC}"

echo ""
echo "📊 System Status Summary"
echo "======================="

# Count running services
running_services=0
total_services=4

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    ((running_services++))
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    ((running_services++))
fi

if curl -s "http://localhost:3001/api/health" | grep -q '"status":"ok"'; then
    ((running_services++))
fi

if curl -s "http://localhost:5173" > /dev/null 2>&1; then
    ((running_services++))
fi

echo "Running services: ${running_services}/${total_services}"

if [ $running_services -eq $total_services ]; then
    echo -e "${GREEN}🎉 ALL SYSTEMS OPERATIONAL!${NC}"
    echo -e "${GREEN}🎵 Your SoundAlchemy messaging system is ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open http://localhost:5173 in your browser"
    echo "2. Login with verified musician accounts"
    echo "3. Test the messaging features"
    echo "4. Try voice and video calls"
else
    echo -e "${YELLOW}⚠️  Some services need attention${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Start WebSocket server: node server.js"
    echo "2. Start frontend: npm run dev"
    echo "3. Check for dependency issues: npm install --legacy-peer-deps"
fi

echo ""
echo "🧪 Testing Instructions"
echo "======================"
echo "1. Open two browser windows"
echo "2. Login with different verified musician accounts"
echo "3. Open messaging interface"
echo "4. Send messages and test real-time features"
echo "5. Try voice and video calls"
echo "6. Check typing indicators and status updates"

echo ""
echo "📞 Support"
echo "========="
echo "If you encounter issues:"
echo "- Check the troubleshooting section in SETUP_GUIDE.md"
echo "- Review server logs for errors"
echo "- Verify all dependencies are installed"
echo "- Ensure both server and frontend are running" 