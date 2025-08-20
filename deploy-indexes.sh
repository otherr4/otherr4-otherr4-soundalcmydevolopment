#!/bin/bash

echo "Deploying Firestore indexes..."

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "Please login to Firebase first:"
    echo "firebase login"
    exit 1
fi

# Deploy indexes
echo "Deploying indexes to Firestore..."
firebase deploy --only firestore:indexes

echo "Indexes deployed successfully!"
echo ""
echo "Note: It may take a few minutes for the indexes to be fully created."
echo "You can monitor the progress in the Firebase Console:"
echo "https://console.firebase.google.com/project/soundalchemy-577b4/firestore/indexes" 