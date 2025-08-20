"use strict";
const express = require('express');
const cors = require('cors');
const path = require('path');
const uploadProfileImage = require('./api/upload-profile-image');
const app = express();
const PORT = process.env.PORT || 3001;
// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the public directory
app.use('/usersproflesphotos', express.static(path.join(process.cwd(), 'public', 'usersproflesphotos')));
// API routes
app.use('/api/upload-profile-image', uploadProfileImage);
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
