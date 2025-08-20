"use strict";
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'public', 'usersproflesphotos');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}_${uniqueId}${ext}`);
    }
});
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});
// Handle file upload
router.post('/', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        // Return the relative path that can be used in the frontend
        const relativePath = `/usersproflesphotos/${req.file.filename}`;
        res.status(200).json({
            success: true,
            path: relativePath
        });
    }
    catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({
            success: false,
            error: 'Error uploading file'
        });
    }
});
module.exports = router;
