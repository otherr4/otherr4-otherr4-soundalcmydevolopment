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
import { getFirestore, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import os from 'os';
import nodemailer from 'nodemailer';

// --- GOOGLE DRIVE OAUTH2 SETUP ---
import readline from 'readline';

const OAUTH2_CREDENTIALS_PATH = path.join(process.cwd(), 'client_secret_131623461658-2kpsj1ohr90tlqh2rcn2a6ghu043l3r5.apps.googleusercontent.com.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

let driveClient = null;

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const PARENT_FOLDER_ID = '18oFPN0F1wk764z3-6sc6dH1qgSXdnCtP'; // Your Google Drive folder ID

// Set your redirect URI to match what is in Google Cloud Console
const REDIRECT_URI = 'http://localhost:3001'; // <-- Make sure this is in your Google Console

async function getOAuth2Client() {
  // Load client secrets
  const credentials = JSON.parse(fs.readFileSync(OAUTH2_CREDENTIALS_PATH, 'utf8'));
  const credBlock = credentials.web || credentials.installed;
  if (!credBlock) {
    throw new Error('Invalid OAuth2 credentials file: missing web or installed key.');
  }
  const { client_secret, client_id } = credBlock;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

  // Try to load token
  let token;
  if (process.env.GOOGLE_TOKEN_JSON) {
    // On Vercel, load from environment variable
    token = JSON.parse(process.env.GOOGLE_TOKEN_JSON);
  } else if (fs.existsSync(TOKEN_PATH)) {
    // Local development
    token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  }

  if (token) {
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  // No token, prompt user (only in local dev, not on Vercel)
  if (process.env.VERCEL) {
    throw new Error('Google OAuth token not found in environment variable.');
  }

  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, redirect_uri: REDIRECT_URI });
  console.log('\n==== GOOGLE DRIVE AUTHORIZATION REQUIRED ====');
  console.log('1. Open the following URL in your browser:');
  console.log(authUrl);
  console.log('2. Authorize the app. You will be redirected to a URL like:');
  console.log('   http://localhost:3001/?code=YOUR_CODE');
  console.log('   (You do NOT need anything running on localhost:3000. If you see an error page, that is normal.)');
  console.log('3. Copy the code value from the browser address bar (after code=) and paste it here.');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise(resolve => rl.question('Enter the code from that page here: ', resolve));
  rl.close();
  const { tokens } = await oAuth2Client.getToken({ code, redirect_uri: REDIRECT_URI });
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('Token stored to', TOKEN_PATH);
  // Notify the user that Google Drive is now connected
  console.log('✅ Google Drive client initialized with OAuth2! You can now upload files.');
  return oAuth2Client;
}

async function initializeGoogleDrive() {
  try {
    const auth = await getOAuth2Client();
    driveClient = google.drive({ version: 'v3', auth });
    console.log('Google Drive client initialized with OAuth2');
  } catch (error) {
    console.error('Error initializing Google Drive:', error);
    throw error;
  }
}

// Initialize Google Drive on server start
initializeGoogleDrive().catch(console.error);

const app = express();
const port = process.env.PORT || 3001;

// Create HTTP server for Socket.IO
const httpServer = createServer(app);

// Initialize Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://www.soundalcmy.com',
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static('public'));

// Serve dashboard at root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Enable CORS for the frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://www.soundalcmy.com',
    'https://soundalcmy.com',
    'https://compleated-sound-alchemy-platform.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Multer disk storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Always use system temp directory for Vercel compatibility
    const tempDir = os.tmpdir();
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
app.get('/api/health', async (req, res) => {
  // Server status
  const serverStatus = {
    status: 'online',
    uptime: process.uptime(),
    port: port
  };

  // Firebase status
  let firebaseStatus = {
    status: 'unknown',
    config: firebaseConfig,
    database: firebaseConfig.databaseURL,
    error: null
  };
  try {
    // Try a real Firestore operation (get a doc that may not exist)
    const testDoc = doc(db, 'healthCheck', 'test');
    await setDoc(testDoc, { checkedAt: serverTimestamp() }, { merge: true });
    firebaseStatus.status = 'online';
  } catch (err) {
    firebaseStatus.status = 'offline';
    firebaseStatus.error = err.message;
  }

  // Google Drive status
  let googleDriveStatus = {
    status: 'offline',
    api: 'v3',
    parentFolderId: PARENT_FOLDER_ID,
    error: null,
    lastChecked: new Date().toISOString(),
    humanStatus: '' // new field for user-friendly status
  };
  try {
    if (driveClient) {
      // Try listing files in the parent folder
      await driveClient.files.list({
        q: `'${PARENT_FOLDER_ID}' in parents and trashed=false`,
        pageSize: 1
      });
      googleDriveStatus.status = 'online';
      googleDriveStatus.error = null;
      googleDriveStatus.humanStatus = '🟢 Google Drive: Connected and Ready';
    } else {
      googleDriveStatus.status = 'offline';
      googleDriveStatus.error = 'Drive client not initialized. Complete OAuth2 flow in terminal.';
      googleDriveStatus.humanStatus = '🔴 Google Drive: Not Connected (Complete OAuth2 flow in terminal)';
    }
  } catch (err) {
    googleDriveStatus.status = 'error';
    googleDriveStatus.error = err.message;
    googleDriveStatus.humanStatus = `🔴 Google Drive: Error - ${err.message}`;
  }

  // WebSocket status
  const websocketStatus = {
    connectedUsers: Array.from(connectedUsers.keys()),
    totalConnections: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  };

  res.json({
    server: serverStatus,
    firebase: firebaseStatus,
    googleDrive: googleDriveStatus,
    websocket: websocketStatus
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

    // Check if user folder exists
    const folderResponse = await driveClient.files.list({
      q: `name='${userFolderName}' and mimeType='application/vnd.google-apps.folder' and '${PARENT_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
    });

    if (folderResponse.data.files.length === 0) {
      // Create user folder
      const folderMetadata = {
        name: userFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [PARENT_FOLDER_ID],
      };

      const folder = await driveClient.files.create({
        resource: folderMetadata,
        fields: 'id',
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
      });

      // Make file public
      await driveClient.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
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

    // Check if messages folder exists
    const messagesFolderResponse = await driveClient.files.list({
      q: `name='${messagesFolderName}' and mimeType='application/vnd.google-apps.folder' and '${PARENT_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
    });

    if (messagesFolderResponse.data.files.length === 0) {
      // Create messages folder
      const messagesFolderMetadata = {
        name: messagesFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [PARENT_FOLDER_ID],
      };

      const messagesFolder = await driveClient.files.create({
        resource: messagesFolderMetadata,
        fields: 'id',
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
    });

    if (conversationFolderResponse.data.files.length === 0) {
      // Create conversation folder
      const conversationFolderMetadata = {
        name: conversationFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [messagesFolderId],
      };

      const conversationFolder = await driveClient.files.create({
        resource: conversationFolderMetadata,
        fields: 'id',
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
    });

    if (typeFolderResponse.data.files.length === 0) {
      // Create type folder
      const typeFolderMetadata = {
        name: typeFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [conversationFolderId],
      };

      const typeFolder = await driveClient.files.create({
        resource: typeFolderMetadata,
        fields: 'id',
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
      });

      // Make file public
      await driveClient.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
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
// Support email endpoint
app.post('/api/send-support-email', async (req, res) => {
  console.log('Received support email request:', req.body); // Debug log
  const { name, email, reason, message } = req.body;
  if (!name || !email || !reason || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  // Setup nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'sound7alchemy@gmail.com',
      pass: 'bybd ylnr cfhk lmzi',
    },
  });
  // Admin email
  const adminHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #18181b 60%, #8b5cf6 100%); border-radius: 24px; box-shadow: 0 8px 32px #0004; overflow: hidden; animation: fadeIn 1.2s;">
      <div style="background: #23232b; padding: 36px 32px 24px 32px; text-align: center; border-top-left-radius: 24px; border-top-right-radius: 24px; border-bottom: 2px solid #8b5cf6;">
        <img src='https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png' alt='SoundAlchemy Logo' style='width: 70px; height: 70px; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 2px 12px #8b5cf6aa;' />
        <h2 style="color: #8b5cf6; font-size: 2.1rem; margin: 0 0 10px 0; font-weight: 800; letter-spacing: 1px;">New Musician Support Request</h2>
      </div>
      <div style="background: #18181b; padding: 32px 24px 24px 24px; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px;">
        <div style="margin-bottom: 18px;">
          <div style="color: #a3a3a3; font-size: 1.05rem; margin-bottom: 2px;">Name</div>
          <div style="color: #fff; font-size: 1.15rem; font-weight: 600;">${name}</div>
        </div>
        <div style="margin-bottom: 18px;">
          <div style="color: #a3a3a3; font-size: 1.05rem; margin-bottom: 2px;">Email</div>
          <div style="color: #8b5cf6; font-size: 1.12rem; font-weight: 600;"><a href='mailto:${email}' style='color:#8b5cf6; text-decoration:underline;'>${email}</a></div>
        </div>
        <div style="margin-bottom: 22px;">
          <div style="color: #a3a3a3; font-size: 1.05rem; margin-bottom: 2px;">Reason</div>
          <div style="color: #fff; font-size: 1.12rem; font-weight: 600;">${reason}</div>
        </div>
        <div style="background: linear-gradient(90deg, #23232b 80%, #8b5cf6 100%); border-radius: 12px; padding: 18px 16px; margin-bottom: 18px; color: #fff; box-shadow: 0 2px 8px #0002;">
          <div style='color:#8b5cf6; font-weight:700; font-size:1.08rem; margin-bottom: 6px;'>Message</div>
          <div style="margin-top: 2px; color: #e0e0e0; font-size: 1.08rem;">${message}</div>
        </div>
        <div style="margin-top: 28px; text-align: center;">
          <span style="font-size: 1rem; color: #a3a3a3;">Sent via <span style='color:#8b5cf6; font-weight:600;'>SoundAlchemy Support Platform</span></span>
        </div>
      </div>
      <style>@keyframes fadeIn { from { opacity: 0; transform: translateY(40px);} to { opacity: 1; transform: none; } }</style>
    </div>
  `;

  // User thank you email
  const userHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #18181b 60%, #8b5cf6 100%); border-radius: 24px; box-shadow: 0 8px 32px #0004; overflow: hidden; animation: fadeIn 1.2s;">
      <div style="background: #23232b; padding: 36px 32px 24px 32px; text-align: center; border-top-left-radius: 24px; border-top-right-radius: 24px; border-bottom: 2px solid #8b5cf6;">
        <img src='https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png' alt='SoundAlchemy Logo' style='width: 70px; height: 70px; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 2px 12px #8b5cf6aa;' />
        <h1 style="color: #8b5cf6; font-size: 2.1rem; margin: 0 0 10px 0; font-weight: 800; letter-spacing: 1px;">Thank You for Contacting<br/>SoundAlchemy Support</h1>
      </div>
      <div style="background: #18181b; padding: 32px 24px 24px 24px; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px;">
        <div style="margin-bottom: 18px;">
          <div style="color: #a3a3a3; font-size: 1.05rem; margin-bottom: 2px;">Dear</div>
          <div style="color: #fff; font-size: 1.15rem; font-weight: 600;">${name || 'Musician'}</div>
        </div>
        <div style="margin-bottom: 22px;">
          <div style="color: #a3a3a3; font-size: 1.05rem; margin-bottom: 2px;">Message Received</div>
          <div style="color: #e0e0e0; font-size: 1.08rem;">We have received your message and our dedicated team will review it as soon as possible. You can expect a reply from us shortly.<br/><span style='color:#8b5cf6; font-weight:600;'>Your trust in SoundAlchemy means a lot to us.</span></div>
        </div>
        <div style="background: linear-gradient(90deg, #23232b 80%, #8b5cf6 100%); border-radius: 12px; padding: 18px 16px; margin-bottom: 18px; color: #fff; box-shadow: 0 2px 8px #0002;">
          <div style='color:#8b5cf6; font-weight:700; font-size:1.08rem; margin-bottom: 6px;'>Your Message</div>
          <div style="margin-top: 2px; color: #e0e0e0; font-size: 1.08rem;">${message}</div>
        </div>
        <div style="margin: 32px 0; text-align: center;">
          <img src='https://soundalcmy.com/public/Logos/SoundAlcmyMainLogo.png' alt='SoundAlchemy' style='width: 120px; margin: 0 auto; display: block; border-radius: 12px; box-shadow: 0 2px 12px #8b5cf655;' />
        </div>
        <div style="margin-top: 18px; text-align: center;">
          <span style="font-size: 1.05rem; color: #a3a3a3;">Thank you for being part of the SoundAlchemy community.<br/><span style='color:#8b5cf6; font-weight:600;'>— The SoundAlchemy Team</span></span>
        </div>
      </div>
      <style>@keyframes fadeIn { from { opacity: 0; transform: translateY(40px);} to { opacity: 1; transform: none; } }</style>
    </div>
  `;
  try {
    // Send to admin
    await transporter.sendMail({
      from: 'sound7alchemy@gmail.com',
      to: 'sound7alchemy@gmail.com',
      subject: `Support Request: ${reason}`,
      html: adminHtml,
    });
    // Send thank you to user
    await transporter.sendMail({
      from: 'sound7alchemy@gmail.com',
      to: email,
      subject: 'Thank You for Contacting SoundAlchemy Support',
      html: userHtml,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Support email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send support email', details: error.message });
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