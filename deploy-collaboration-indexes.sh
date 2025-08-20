#!/bin/bash

# Script to deploy Firestore indexes for collaborations

echo "Deploying Firestore indexes for collaborations..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI is not installed. Please install it using 'npm install -g firebase-tools'"
    exit 1
fi

# Check if user is logged in to Firebase
firebase projects:list &> /dev/null
if [ $? -ne 0 ]; then
    echo "You are not logged in to Firebase. Please run 'firebase login' first."
    exit 1
fi

# Deploy the indexes
firebase deploy --only firestore:indexes

echo "Firestore indexes deployment initiated."
echo "Note: It may take a few minutes for the indexes to be fully built."
echo "You can check the status in the Firebase Console under Firestore → Indexes."