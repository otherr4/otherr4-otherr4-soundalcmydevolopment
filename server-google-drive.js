import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { initializeApp } from 'firebase/app';
import path from 'path';
import fs from 'fs';
import { getDatabase, ref, set } from 'firebase/database';
import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const app = express();
const port = process.env.PORT || 3001;

// Create HTTP server for Socket.IO
const httpServer = createServer(app);

// Initialize Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173', 
      'https://completed-sound-alechemy-official-p.vercel.app', 
      'https://compleated-sound-alchemy-platform.vercel.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD--lieggygBJNj-GSrmIwtCY0vtEmopns",
  authDomain: "soundalchemy-577b4.firebaseapp.com",
  databaseURL: "https://soundalchemy-577b4-default-rtdb.firebaseio.com",
  projectId: "soundalchemy-577b4",
  storageBucket: "soundalchemy-577b4.appspot.com",
  messagingSenderId: "772996673219",
  appId: "1:772996673219:web:c530d8e2f9f97f8f687c76",
  measurementId: "G-CGF7DJNT79"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Store connected users
const connectedUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user authentication
  socket.on('authenticate', async (data) => {
    try {
      const { userId, token } = data;
      if (userId) {
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        
        // Update user status to online
        await updateDoc(doc(db, 'userStatus', userId), {
          status: 'online',
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp(),
          socketId: socket.id
        });

        // Join user to their personal room
        socket.join(`user_${userId}`);
        
        console.log(`User ${userId} authenticated and connected`);
        socket.emit('authenticated', { success: true });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth_error', { error: 'Authentication failed' });
    }
  });

  // Handle call signaling
  socket.on('call-signal', (data) => {
    const { to, type, ...signalData } = data;
    const targetSocketId = connectedUsers.get(to);
    
    if (targetSocketId) {
      socket.to(targetSocketId).emit('call-signal', {
        ...signalData,
        type,
        from: socket.userId
      });
      console.log(`Call signal sent from ${socket.userId} to ${to}`);
    } else {
      // User is offline, store signal for later
      socket.emit('call-signal-error', { error: 'User is offline' });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { conversationId, isTyping } = data;
    socket.to(`conversation_${conversationId}`).emit('typing', {
      userId: socket.userId,
      isTyping,
      conversationId
    });
  });

  // Handle user status updates
  socket.on('status-update', async (data) => {
    const { status } = data;
    try {
      await updateDoc(doc(db, 'userStatus', socket.userId), {
        status,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Broadcast status to all connected users
      socket.broadcast.emit('user-status-changed', {
        userId: socket.userId,
        status,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Status update error:', error);
    }
  });

  // Handle message delivery confirmation
  socket.on('message-delivered', (data) => {
    const { messageId, conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('message-delivered', {
      messageId,
      deliveredBy: socket.userId,
      timestamp: new Date()
    });
  });

  // Handle message read confirmation
  socket.on('message-read', (data) => {
    const { messageId, conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('message-read', {
      messageId,
      readBy: socket.userId,
      timestamp: new Date()
    });
  });

  // Join conversation room
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User ${socket.userId} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`User ${socket.userId} left conversation ${conversationId}`);
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      
      // Update user status to offline
      try {
        await updateDoc(doc(db, 'userStatus', socket.userId), {
          status: 'offline',
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp(),
          socketId: null
        });
        
        // Broadcast offline status
        socket.broadcast.emit('user-status-changed', {
          userId: socket.userId,
          status: 'offline',
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error updating offline status:', error);
      }
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Google Drive configuration
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const PARENT_FOLDER_ID = '1cI4i1u0A-CdI6bXWWsybDANQrY-6dDAL'; // Your Google Drive folder ID
const SHARED_DRIVE_ID = '1cI4i1u0A-CdI6bXWWsybDANQrY-6dDAL'; // Shared Drive ID (same as parent folder for now)

// Initialize Google Drive client
let driveClient = null;

async function initializeGoogleDrive() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'credentialsound.json'),
      scopes: SCOPES,
    });
    
    driveClient = google.drive({ version: 'v3', auth });
    console.log('Google Drive client initialized successfully');
    
    // Test shared drive access
    try {
      await driveClient.drives.get({ driveId: SHARED_DRIVE_ID });
      console.log('Shared drive access confirmed');
    } catch (error) {
      console.warn('Shared drive access failed, falling back to My Drive:', error.message);
    }
  } catch (error) {
    console.error('Error initializing Google Drive:', error);
    throw error;
  }
}

// Initialize Google Drive on server start
initializeGoogleDrive().catch(console.error);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static('public'));

// Enable CORS for the frontend
app.use(cors({
  origin: ['http://localhost:5173', 'https://completed-sound-alechemy-official-p.vercel.app', 'https://compleated-sound-alchemy-platform.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Multer disk storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(process.cwd(), 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for message files
  fileFilter: (req, file, cb) => {
    // Allow all file types for message uploads
    cb(null, true);
  }
});

// Separate upload for profile images (images only)
const profileImageUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connectedUsers: connectedUsers.size,
    socketConnections: io.engine.clientsCount
  });
});

// WebSocket server status endpoint
app.get('/api/websocket-status', (req, res) => {
  res.json({
    status: 'running',
    connectedUsers: Array.from(connectedUsers.keys()),
    totalConnections: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// API endpoint for image upload
app.post('/api/upload-profile-image', profileImageUpload.single('image'), async (req, res) => {
  try {
    console.log('Received upload request:', req.body);
    
    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    if (!driveClient) {
      throw new Error('Google Drive client not initialized');
    }

    // Create user folder in Google Drive if it doesn't exist
    const userFolderName = `user_${userId}`;
    let userFolderId = null;

    // Check if user folder exists in shared drive
    const folderResponse = await driveClient.files.list({
      q: `name='${userFolderName}' and mimeType='application/vnd.google-apps.folder' and '${PARENT_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'drive',
      driveId: SHARED_DRIVE_ID
    });

    if (folderResponse.data.files.length === 0) {
      // Create user folder in shared drive
      const folderMetadata = {
        name: userFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [PARENT_FOLDER_ID],
      };

      const folder = await driveClient.files.create({
        resource: folderMetadata,
        fields: 'id',
        supportsAllDrives: true,
        supportsTeamDrives: true
      });
      userFolderId = folder.data.id;
    } else {
      userFolderId = folderResponse.data.files[0].id;
    }

    // Upload file to Google Drive
    const fileMetadata = {
      name: `profile_${Date.now()}${path.extname(req.file.originalname)}`,
      parents: [userFolderId],
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path)
    };

    try {
      const file = await driveClient.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true,
        supportsTeamDrives: true
      });

      // Make file public
      await driveClient.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
        supportsTeamDrives: true
      });

      // Clean up: remove temporary file
      fs.unlinkSync(req.file.path);

      // Store the Google Drive file information in Firebase
      const dbRef = ref(getDatabase(firebaseApp), `users/${userId}/profileImage`);
      await set(dbRef, {
        fileId: file.data.id,
        webViewLink: file.data.webViewLink,
        webContentLink: file.data.webContentLink,
        fileName: fileMetadata.name,
        uploadDate: new Date().toISOString()
      });

      console.log('Upload successful:', { 
        fileId: file.data.id, 
        webViewLink: file.data.webViewLink,
        webContentLink: file.data.webContentLink 
      });

      res.json({ 
        success: true, 
        fileId: file.data.id,
        imageUrl: file.data.webContentLink || file.data.webViewLink,
        path: file.data.webContentLink || file.data.webViewLink
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to upload image',
        details: error.stack
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to upload image',
      details: error.stack
    });
  }
});

// API endpoint for message file upload (photos, files, audio)
app.post('/api/upload-message-file', upload.single('file'), async (req, res) => {
  try {
    console.log('Received message file upload request:', req.body);
    
    const { userId, conversationId, type } = req.body;
    if (!userId || !conversationId || !type) {
      return res.status(400).json({ success: false, error: 'Missing required fields: userId, conversationId, type' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    if (!driveClient) {
      throw new Error('Google Drive client not initialized');
    }

    // Create messages folder structure in Google Drive
    const messagesFolderName = 'messages';
    let messagesFolderId = null;

    // Check if messages folder exists in shared drive
    const messagesFolderResponse = await driveClient.files.list({
      q: `name='${messagesFolderName}' and mimeType='application/vnd.google-apps.folder' and '${PARENT_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'drive',
      driveId: SHARED_DRIVE_ID
    });

    if (messagesFolderResponse.data.files.length === 0) {
      // Create messages folder in shared drive
      const messagesFolderMetadata = {
        name: messagesFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [PARENT_FOLDER_ID],
      };

      const messagesFolder = await driveClient.files.create({
        resource: messagesFolderMetadata,
        fields: 'id',
        supportsAllDrives: true,
        supportsTeamDrives: true
      });
      messagesFolderId = messagesFolder.data.id;
    } else {
      messagesFolderId = messagesFolderResponse.data.files[0].id;
    }

    // Create conversation folder
    const conversationFolderName = `conversation_${conversationId}`;
    let conversationFolderId = null;

    const conversationFolderResponse = await driveClient.files.list({
      q: `name='${conversationFolderName}' and mimeType='application/vnd.google-apps.folder' and '${messagesFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'drive',
      driveId: SHARED_DRIVE_ID
    });

    if (conversationFolderResponse.data.files.length === 0) {
      // Create conversation folder in shared drive
      const conversationFolderMetadata = {
        name: conversationFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [messagesFolderId],
      };

      const conversationFolder = await driveClient.files.create({
        resource: conversationFolderMetadata,
        fields: 'id',
        supportsAllDrives: true,
        supportsTeamDrives: true
      });
      conversationFolderId = conversationFolder.data.id;
    } else {
      conversationFolderId = conversationFolderResponse.data.files[0].id;
    }

    // Create type folder (photos, files, audio)
    const typeFolderName = type;
    let typeFolderId = null;

    const typeFolderResponse = await driveClient.files.list({
      q: `name='${typeFolderName}' and mimeType='application/vnd.google-apps.folder' and '${conversationFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'drive',
      driveId: SHARED_DRIVE_ID
    });

    if (typeFolderResponse.data.files.length === 0) {
      // Create type folder in shared drive
      const typeFolderMetadata = {
        name: typeFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [conversationFolderId],
      };

      const typeFolder = await driveClient.files.create({
        resource: typeFolderMetadata,
        fields: 'id',
        supportsAllDrives: true,
        supportsTeamDrives: true
      });
      typeFolderId = typeFolder.data.id;
    } else {
      typeFolderId = typeFolderResponse.data.files[0].id;
    }

    // Upload file to Google Drive
    const fileMetadata = {
      name: `${type}_${Date.now()}_${req.file.originalname}`,
      parents: [typeFolderId],
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path)
    };

    try {
      const file = await driveClient.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true,
        supportsTeamDrives: true
      });

      // Make file public
      await driveClient.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
        supportsTeamDrives: true
      });

      // Clean up: remove temporary file
      fs.unlinkSync(req.file.path);

      // Store the Google Drive file information in Firebase
      const dbRef = ref(getDatabase(firebaseApp), `messages/${conversationId}/files/${file.data.id}`);
      await set(dbRef, {
        fileId: file.data.id,
        webViewLink: file.data.webViewLink,
        webContentLink: file.data.webContentLink,
        fileName: fileMetadata.name,
        originalName: req.file.originalname,
        type: type,
        userId: userId,
        conversationId: conversationId,
        uploadDate: new Date().toISOString(),
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });

      console.log('Message file upload successful:', { 
        fileId: file.data.id, 
        webViewLink: file.data.webViewLink,
        webContentLink: file.data.webContentLink,
        type: type,
        conversationId: conversationId
      });

      // Return the URL that the frontend expects
      const fileUrl = file.data.webContentLink || file.data.webViewLink;
      res.json({ 
        success: true, 
        fileId: file.data.id,
        url: fileUrl,
        path: fileUrl
      });
    } catch (error) {
      console.error('Message file upload error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to upload message file',
        details: error.stack
      });
    }
  } catch (error) {
    console.error('Message file upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to upload message file',
      details: error.stack
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File size too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Internal server error',
    details: err.stack
  });
});

// Start server
httpServer.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🔗 Health check: http://localhost:${port}/api/health`);
  console.log(`📊 WebSocket status: http://localhost:${port}/api/websocket-status`);
});

export default app; 