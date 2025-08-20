# Firestore Indexes Setup

## 🔥 Firebase Index Error Resolution

The messaging system requires specific Firestore indexes to function properly. The errors you're seeing are because these indexes haven't been created yet.

## 📋 Required Indexes

The following composite indexes are needed for the messaging system:

### 1. Messages Collection
- **Index 1**: `conversationId` (ascending) + `timestamp` (ascending)
- **Index 2**: `conversationId` (ascending) + `receiverId` (ascending) + `read` (ascending)

### 2. Conversations Collection
- **Index 3**: `participants` (array-contains) + `updatedAt` (descending)

### 3. Notifications Collection
- **Index 4**: `userId` (ascending) + `timestamp` (descending)
- **Index 5**: `userId` (ascending) + `read` (ascending) + `timestamp` (descending)

## 🚀 Quick Setup

### Option 1: Automatic Deployment (Recommended)
```bash
# Make sure you're logged into Firebase
firebase login

# Run the deployment script
./deploy-indexes.sh
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
4. Click "Add Index" and create each index manually

## ⏱️ Index Build Time

- **Small datasets**: 1-5 minutes
- **Large datasets**: 10-30 minutes
- **Very large datasets**: Up to 1 hour

You can monitor the build progress in the Firebase Console under Firestore → Indexes.

## 🔍 Error Messages

The system now provides helpful error messages when indexes are missing:

```
Firestore index required. Please create the index for messages collection with fields: conversationId (ascending), timestamp (ascending)
```

## 🛠️ Troubleshooting

### Index Build Fails
1. Check if you have the correct permissions
2. Verify the collection names match exactly
3. Ensure field names are correct (case-sensitive)

### Still Getting Errors After Index Creation
1. Wait for indexes to finish building
2. Check the Firebase Console for build status
3. Restart your development server
4. Clear browser cache

### Manual Index Creation
If automatic deployment doesn't work, you can create indexes manually in the Firebase Console:

1. **Messages Index 1**:
   - Collection: `messages`
   - Fields: `conversationId` (Ascending), `timestamp` (Ascending)

2. **Messages Index 2**:
   - Collection: `messages`
   - Fields: `conversationId` (Ascending), `receiverId` (Ascending), `read` (Ascending)

3. **Conversations Index**:
   - Collection: `conversations`
   - Fields: `participants` (Array contains), `updatedAt` (Descending)

4. **Notifications Index 1**:
   - Collection: `notifications`
   - Fields: `userId` (Ascending), `timestamp` (Descending)

5. **Notifications Index 2**:
   - Collection: `notifications`
   - Fields: `userId` (Ascending), `read` (Ascending), `timestamp` (Descending)

## ✅ Verification

Once indexes are built, you should see:
- No more "failed-precondition" errors in the console
- Real-time messaging working properly
- Conversations loading without errors
- Notifications working correctly

## 📞 Support

If you continue to have issues after setting up the indexes:
1. Check the Firebase Console for any error messages
2. Verify your Firebase project configuration
3. Ensure you have the correct permissions for the project 