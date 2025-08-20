# Collaboration Index Fix

## 🔥 Firebase Index Error Resolution

The collaboration system requires specific Firestore indexes to function properly. The error you're seeing is because the required index for user collaborations hasn't been created yet.

## 📋 Required Index

The following composite index is needed for the collaboration system:

### Collaborations Collection
- **Index**: `creatorId` (ascending) + `createdAt` (descending)

## 🚀 Quick Setup

### Option 1: Automatic Deployment (Recommended)
```bash
# Make sure you're logged into Firebase
firebase login

# Run the deployment script
./deploy-collaboration-indexes.sh
```

### Option 2: Manual Deployment
```bash
# Deploy indexes manually
firebase deploy --only firestore:indexes
```

### Option 3: Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `soundalchemy-577b4`
3. Go to Firestore Database → Indexes
4. Click "Add Index" and create the index manually:
   - Collection: `collaborations`
   - Fields: 
     - `creatorId` (Ascending)
     - `createdAt` (Descending)

## ⏱️ Index Build Time

- **Small datasets**: 1-5 minutes
- **Large datasets**: 10-30 minutes

You can monitor the build progress in the Firebase Console under Firestore → Indexes.

## 🔍 Error Message

The error message you're seeing is:
```
Error getting user collaborations: FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/soundalchemy-577b4/firesto…2luZGV4ZXMvXxABGg0KCWNyZWF0b3JJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI
```

This indicates that Firebase needs an index for the query in `getUserCollaborations` function that uses:
- `where('creatorId', '==', userId)` and 
- `orderBy('createdAt', 'desc')`

## 🛠️ Troubleshooting

### Index Build Fails
1. Check if you have the correct permissions
2. Verify the collection name matches exactly (`collaborations`)
3. Ensure field names are correct (case-sensitive)

### Still Getting Errors After Index Creation
1. Wait for indexes to finish building
2. Check the Firebase Console for build status
3. Restart your development server
4. Clear browser cache

## ✅ Verification

Once the index is built, you should see:
- No more index errors in the console
- Collaborations loading properly on musician profiles
- Projects tab displaying correctly

## 📞 Support

If you continue to have issues after setting up the index:
1. Check the Firebase Console for any error messages
2. Verify your Firebase project configuration
3. Ensure you have the correct permissions for the project