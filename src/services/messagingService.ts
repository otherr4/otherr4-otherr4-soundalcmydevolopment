import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs, 
  getDoc, 
  serverTimestamp,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { rtdb } from '../config/firebase';
import { ref as dbRef, onValue } from "firebase/database";
import { 
  Message, 
  Conversation, 
  UserStatus, 
  MessageNotification,
  ConversationParticipant,
  TypingIndicator,
  MessageStats,
  CallHistory,
  CallStats
} from '../types/messaging';
import { Socket } from 'socket.io-client';

class MessagingService {
  private unsubscribeFunctions: Map<string, () => void> = new Map();
  private callSocket: Socket | null = null;
  private callUserId: string | null = null;

  initCallSignaling(socket: Socket, userId: string) {
    this.callSocket = socket;
    this.callUserId = userId;
    
    // Authenticate with the WebSocket server
    if (socket && userId) {
      socket.emit('authenticate', { userId });
      
      // Listen for authentication response
      socket.on('authenticated', (data) => {
        console.log('WebSocket authenticated:', data);
      });
      
      socket.on('auth_error', (error) => {
        console.error('WebSocket authentication error:', error);
      });
    }
  }

  sendCallSignal(type: string, data: any) {
    if (!this.callSocket || !this.callUserId) {
      console.error('Call socket not initialized');
      return;
    }
    
    try {
      this.callSocket.emit('call-signal', { 
        type, 
        ...data, 
        from: this.callUserId,
        timestamp: new Date().toISOString()
      });
      console.log('Call signal sent:', { type, ...data });
    } catch (error) {
      console.error('Error sending call signal:', error);
    }
  }

  onCallSignal(callback: (type: string, data: any) => void) {
    if (!this.callSocket) {
      console.error('Call socket not initialized');
      return;
    }
    
    this.callSocket.on('call-signal', (payload: any) => {
      console.log('Call signal received:', payload);
      if (payload && payload.type && (!payload.to || payload.to === this.callUserId)) {
        callback(payload.type, payload);
      }
    });
    
    this.callSocket.on('call-signal-error', (error: any) => {
      console.error('Call signal error:', error);
    });
  }

  // Initialize messaging service and ensure required collections exist
  async initialize(userId: string): Promise<void> {
    try {
      // Ensure userStatus document exists
      const statusRef = doc(db, 'userStatus', userId);
      const statusDoc = await getDoc(statusRef);
      
      if (!statusDoc.exists()) {
        await setDoc(statusRef, {
          userId,
          status: 'online',
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isTyping: false
        });
      }

      // Start cleanup interval for typing indicators
      setInterval(() => {
        this.cleanupTypingIndicators();
      }, 30000); // Clean up every 30 seconds

      console.log('Messaging service initialized successfully');
    } catch (error) {
      console.error('Error initializing messaging service:', error);
    }
  }

  // Check if user is verified
  private async isUserVerified(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.isVerified === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking user verification:', error);
      return false;
    }
  }

  // Check if two users are friends
  private async areUsersFriends(userId1: string, userId2: string): Promise<boolean> {
    try {
      const [user1Doc, user2Doc] = await Promise.all([
        getDoc(doc(db, 'users', userId1)),
        getDoc(doc(db, 'users', userId2))
      ]);

      if (!user1Doc.exists() || !user2Doc.exists()) {
        return false;
      }

      const user1Data = user1Doc.data();
      const user2Data = user2Doc.data();

      const user1Friends = user1Data.friends || [];
      const user2Friends = user2Data.friends || [];

      return user1Friends.includes(userId2) && user2Friends.includes(userId1);
    } catch (error) {
      console.error('Error checking friendship status:', error);
      return false;
    }
  }

  // Get verified friends for messaging
  async getVerifiedFriends(currentUserId: string): Promise<ConversationParticipant[]> {
    try {
      // Get current user's friends
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      if (!userDoc.exists()) {
        return [];
      }

      const userData = userDoc.data();
      const friendUids = userData.friends || [];

      if (friendUids.length === 0) {
        return [];
      }

      // Get friends' data
      const friendDocs = await Promise.all(
        friendUids.map((uid: string) => getDoc(doc(db, 'users', uid)))
      );

      const friends: ConversationParticipant[] = [];

      friendDocs.forEach((doc) => {
        if (doc.exists()) {
          const data = doc.data();
          // Only include verified friends
          if (data.isVerified === true) {
            friends.push({
              userId: doc.id,
              fullName: data.fullName || 'Unknown Musician',
              profileImagePath: data.profileImagePath,
              isVerified: data.isVerified,
              instrumentType: data.instrumentType,
              musicCulture: data.musicCulture,
              status: 'offline',
              lastSeen: new Date(),
              email: data.email,
              phoneNumber: data.phoneNumber,
              country: data.country,
              bio: data.bio || data.aboutMe,
            });
          }
        }
      });

      return friends;
    } catch (error) {
      console.error('Error fetching verified friends:', error);
      throw error;
    }
  }

  // Get verified musicians for messaging (legacy - now only returns friends)
  async getVerifiedMusicians(currentUserId: string): Promise<ConversationParticipant[]> {
    return this.getVerifiedFriends(currentUserId);
  }

  // Create or get conversation between two users (only if they are friends)
  async getOrCreateConversation(userId1: string, userId2: string): Promise<Conversation> {
    // Verify both users are verified
    const [user1Verified, user2Verified] = await Promise.all([
      this.isUserVerified(userId1),
      this.isUserVerified(userId2)
    ]);

    if (!user1Verified || !user2Verified) {
      throw new Error('Both users must be verified to start a conversation');
    }

    // Check if users are friends
    const areFriends = await this.areUsersFriends(userId1, userId2);
    if (!areFriends) {
      throw new Error('You can only message your friends. Send a friend request first.');
    }

    const conversationId = [userId1, userId2].sort().join('_');
    
    try {
      // Check if conversation exists
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (conversationDoc.exists()) {
        const data = conversationDoc.data();
        return {
          id: conversationDoc.id,
          participants: data.participants || [userId1, userId2],
          lastMessage: data.lastMessage ? {
            content: data.lastMessage.content || '',
            timestamp: data.lastMessage.timestamp?.toDate?.() || new Date(),
            senderId: data.lastMessage.senderId || '',
            type: data.lastMessage.type || 'text',
            senderName: data.lastMessage.senderName || undefined
          } : undefined,
          unreadCount: data.unreadCount || {},
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          isGroup: data.isGroup || false,
          groupName: data.groupName || undefined,
          groupDescription: data.groupDescription || undefined,
          groupAvatar: data.groupAvatar || undefined,
          groupAdmin: data.groupAdmin || undefined,
          archived: data.archived || undefined,
          muted: data.muted || undefined,
          pinned: data.pinned || undefined,
          settings: data.settings || undefined,
          metadata: data.metadata || undefined,
          encryptionKey: data.encryptionKey || undefined,
          messageRetention: data.messageRetention || undefined
        } as Conversation;
      } else {
        // Create new conversation with proper ID
        const newConversationData = {
          participants: [userId1, userId2],
          unreadCount: {},
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          isGroup: false
        };

        await setDoc(conversationRef, newConversationData);

        return {
          id: conversationId,
          participants: [userId1, userId2],
          unreadCount: {},
          updatedAt: new Date(),
          createdAt: new Date(),
          isGroup: false
        } as Conversation;
      }
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      throw error;
    }
  }

  // Send message with proper field handling (like WhatsApp/Messenger)
  async sendMessage(
    conversationId: string, 
    senderId: string, 
    receiverId: string, 
    content: string, 
    type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'contact' | 'sticker' = 'text',
    fileUrl?: string,
    fileName?: string,
    fileSize?: number,
    replyTo?: string,
    metadata?: {
      location?: { lat: number; lng: number; address?: string };
      contact?: { name: string; phone: string; email?: string };
      audioDuration?: number;
      videoDuration?: number;
      imageDimensions?: { width: number; height: number };
      stickerId?: string;
      stickerUrl?: string;
    }
  ): Promise<Message> {
    // Verify sender is verified
    const isVerified = await this.isUserVerified(senderId);
    if (!isVerified) {
      throw new Error('Only verified musicians can send messages');
    }

    // Check if users are friends
    const areFriends = await this.areUsersFriends(senderId, receiverId);
    if (!areFriends) {
      throw new Error('You can only message your friends');
    }

    // Validate content based on message type
    if (type === 'text' && (!content || content.trim().length === 0)) {
      throw new Error('Text messages cannot be empty');
    }

    if (type === 'image' || type === 'file' || type === 'audio' || type === 'video') {
      if (!fileUrl) {
        throw new Error(`${type} messages require a file URL`);
      }
    }

    try {
      // Build message data object, only including defined fields
      const messageData: any = {
        conversationId,
        senderId,
        receiverId,
        content: content.trim(),
        type,
        timestamp: serverTimestamp(),
        read: false,
        status: 'sending', // Will be updated to 'sent' after successful save
        edited: false,
        deliveredAt: null,
        readAt: null
      };

      // Only add optional fields if they have values
      if (fileUrl) {
        messageData.fileUrl = fileUrl;
      }
      if (fileName) {
        messageData.fileName = fileName;
      }
      if (fileSize && fileSize > 0) {
        messageData.fileSize = fileSize;
      }
      if (replyTo) {
        messageData.replyTo = replyTo;
      }
      if (metadata) {
        messageData.metadata = metadata;
      }

      // Add message to Firestore
      const messageRef = await addDoc(collection(db, 'messages'), messageData);
      
      // Update message status to 'sent'
      await updateDoc(messageRef, {
        status: 'sent'
      });

      // Update conversation with last message
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (conversationDoc.exists()) {
        const currentUnreadCount = conversationDoc.data()?.unreadCount?.[receiverId] || 0;
        
        await updateDoc(conversationRef, {
          lastMessage: {
            content: content.length > 100 ? content.substring(0, 100) + '...' : content,
            timestamp: serverTimestamp(),
            senderId,
            type
          },
          updatedAt: serverTimestamp(),
          [`unreadCount.${receiverId}`]: currentUnreadCount + 1
        });
      } else {
        // If conversation doesn't exist, create it
        await setDoc(conversationRef, {
          participants: [senderId, receiverId],
          lastMessage: {
            content: content.length > 100 ? content.substring(0, 100) + '...' : content,
            timestamp: serverTimestamp(),
            type
          },
          unreadCount: { [receiverId]: 1 },
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          isGroup: false
        });
      }

      // Always create notification for receiver for any message type
      await this.createMessageNotification(receiverId, senderId, conversationId, content);

      // Update user's last activity
      // await this.updateUserStatus(senderId, 'online'); // Removed Firestore update

      // Build and return the message object
      const message: Message = {
        id: messageRef.id,
        conversationId,
        senderId,
        receiverId,
        content: content.trim(),
        timestamp: new Date(),
        type,
        read: false,
        status: 'sent',
        edited: false,
        deliveredAt: undefined,
        readAt: undefined
      };

      // Add optional fields to the returned message
      if (fileUrl) {
        message.fileUrl = fileUrl;
      }
      if (fileName) {
        message.fileName = fileName;
      }
      if (fileSize && fileSize > 0) {
        message.fileSize = fileSize;
      }
      if (replyTo) {
        message.replyTo = replyTo;
      }
      if (metadata) {
        message.metadata = metadata;
      }

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          throw new Error('You do not have permission to send messages in this conversation');
        } else if (error.message.includes('not-found')) {
          throw new Error('Conversation not found');
        } else if (error.message.includes('unavailable')) {
          throw new Error('Network error. Please check your connection and try again');
        }
      }
      
      throw new Error('Failed to send message. Please try again.');
    }
  }

  // Subscribe to messages with fallback for missing indexes
  subscribeToMessages(
    conversationId: string, 
    callback: (messages: Message[]) => void
  ): () => void {
    try {
      // Try the optimized query first (requires index)
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Add null checks for all timestamp fields
          const timestamp = data.timestamp?.toDate?.() || new Date();
          const editedAt = data.editedAt?.toDate?.() || undefined;
          
          messages.push({
            id: doc.id,
            conversationId: data.conversationId || '',
            senderId: data.senderId || '',
            receiverId: data.receiverId || '',
            content: data.content || '',
            timestamp: timestamp,
            type: data.type || 'text',
            fileUrl: data.fileUrl || undefined,
            fileName: data.fileName || undefined,
            fileSize: data.fileSize || undefined,
            read: data.read || false,
            status: data.status || 'sent',
            edited: data.edited || false,
            editedAt: editedAt,
            replyTo: data.replyTo || undefined,
            deliveredAt: data.deliveredAt?.toDate?.() || undefined,
            readAt: data.readAt?.toDate?.() || undefined,
            metadata: data.metadata || undefined,
            reactions: data.reactions || undefined,
            mentions: data.mentions || undefined,
            isEdited: data.isEdited || false,
            editHistory: data.editHistory || undefined,
            encryptionLevel: data.encryptionLevel || 'none',
            messageHash: data.messageHash || undefined
          });
        });
        callback(messages);
      }, (error) => {
        console.error('Error subscribing to messages:', error);
        // If it's an index error, try fallback query
        if (error.code === 'failed-precondition') {
          console.warn('Firestore index required. Using fallback query. Please create the index for messages collection with fields: conversationId (ascending), timestamp (ascending)');
          this.subscribeToMessagesFallback(conversationId, callback);
        } else {
          // Return empty array on other errors
          callback([]);
        }
      });

      this.unsubscribeFunctions.set(conversationId, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up message subscription:', error);
      // Return a no-op function
      return () => {};
    }
  }

  // Fallback method for messages (no composite index required)
  private subscribeToMessagesFallback(
    conversationId: string, 
    callback: (messages: Message[]) => void
  ): () => void {
    try {
      // Simple query without orderBy (no index required)
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Add null checks for all timestamp fields
          const timestamp = data.timestamp?.toDate?.() || new Date();
          const editedAt = data.editedAt?.toDate?.() || undefined;
          
          messages.push({
            id: doc.id,
            conversationId: data.conversationId || '',
            senderId: data.senderId || '',
            receiverId: data.receiverId || '',
            content: data.content || '',
            timestamp: timestamp,
            type: data.type || 'text',
            fileUrl: data.fileUrl || undefined,
            fileName: data.fileName || undefined,
            fileSize: data.fileSize || undefined,
            read: data.read || false,
            status: data.status || 'sent',
            edited: data.edited || false,
            editedAt: editedAt,
            replyTo: data.replyTo || undefined,
            deliveredAt: data.deliveredAt?.toDate?.() || undefined,
            readAt: data.readAt?.toDate?.() || undefined,
            metadata: data.metadata || undefined,
            reactions: data.reactions || undefined,
            mentions: data.mentions || undefined,
            isEdited: data.isEdited || false,
            editHistory: data.editHistory || undefined,
            encryptionLevel: data.encryptionLevel || 'none',
            messageHash: data.messageHash || undefined
          });
        });
        
        // Sort messages client-side since we can't orderBy in the query
        messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        callback(messages);
      }, (error) => {
        console.error('Error in fallback message subscription:', error);
        callback([]);
      });

      this.unsubscribeFunctions.set(`fallback_${conversationId}`, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up fallback message subscription:', error);
      return () => {};
    }
  }

  // Get user conversations with fallback for missing indexes
  subscribeToConversations(
    userId: string, 
    callback: (conversations: Conversation[]) => void
  ): () => void {
    try {
      // Try the optimized query first (requires index)
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const conversations: Conversation[] = [];
        
        for (const doc of snapshot.docs) {
          const data = doc.data();
          // Add null checks for all timestamp fields
          const updatedAt = data.updatedAt?.toDate?.() || new Date();
          const createdAt = data.createdAt?.toDate?.() || new Date();
          const lastMessageTimestamp = data.lastMessage?.timestamp?.toDate?.() || undefined;
          
          conversations.push({
            id: doc.id,
            participants: data.participants || [],
            lastMessage: data.lastMessage ? {
              content: data.lastMessage.content || '',
              timestamp: lastMessageTimestamp || new Date(),
              senderId: data.lastMessage.senderId || '',
              type: data.lastMessage.type || 'text',
              senderName: data.lastMessage.senderName || undefined
            } : undefined,
            unreadCount: data.unreadCount || {},
            updatedAt: updatedAt,
            createdAt: createdAt,
            isGroup: data.isGroup || false,
            groupName: data.groupName || undefined,
            groupDescription: data.groupDescription || undefined,
            groupAvatar: data.groupAvatar || undefined,
            groupAdmin: data.groupAdmin || undefined,
            archived: data.archived || undefined,
            muted: data.muted || undefined,
            pinned: data.pinned || undefined,
            settings: data.settings || undefined,
            metadata: data.metadata || undefined,
            encryptionKey: data.encryptionKey || undefined,
            messageRetention: data.messageRetention || undefined
          });
        }
        
        callback(conversations);
      }, (error) => {
        console.error('Error subscribing to conversations:', error);
        // If it's an index error, try fallback query
        if (error.code === 'failed-precondition') {
          console.warn('Firestore index required. Using fallback query. Please create the index for conversations collection with fields: participants (array-contains), updatedAt (descending)');
          this.subscribeToConversationsFallback(userId, callback);
        } else {
          // Return empty array on other errors
          callback([]);
        }
      });

      this.unsubscribeFunctions.set(`conversations_${userId}`, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up conversation subscription:', error);
      // Return a no-op function
      return () => {};
    }
  }

  // Fallback method for conversations (no composite index required)
  private subscribeToConversationsFallback(
    userId: string, 
    callback: (conversations: Conversation[]) => void
  ): () => void {
    try {
      // Simple query without orderBy (no index required)
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const conversations: Conversation[] = [];
        
        for (const doc of snapshot.docs) {
          const data = doc.data();
          conversations.push({
            id: doc.id,
            participants: data.participants,
            lastMessage: data.lastMessage ? {
              content: data.lastMessage.content,
              timestamp: data.lastMessage.timestamp?.toDate?.() || new Date(),
              senderId: data.lastMessage.senderId,
              type: data.lastMessage.type || 'text'
            } : undefined,
            unreadCount: data.unreadCount || {},
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            isGroup: data.isGroup || false,
            groupName: data.groupName,
            groupAvatar: data.groupAvatar
          });
        }
        
        // Sort conversations client-side since we can't orderBy in the query
        conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        callback(conversations);
      }, (error) => {
        console.error('Error in fallback conversation subscription:', error);
        callback([]);
      });

      this.unsubscribeFunctions.set(`fallback_conversations_${userId}`, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up fallback conversation subscription:', error);
      return () => {};
    }
  }

  // Mark messages as read with conversation existence check
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Get unread messages with better error handling
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('receiverId', '==', userId),
        where('read', '==', false)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      
      messagesSnapshot.forEach((doc) => {
        batch.update(doc.ref, { 
          read: true, 
          status: 'read',
          readAt: serverTimestamp()
        });
      });

      // Check if conversation exists before updating
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (conversationDoc.exists()) {
        batch.update(conversationRef, {
          [`unreadCount.${userId}`]: 0
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
      // Don't throw error, just log it
      if (error.code === 'failed-precondition') {
        console.warn('Firestore index required for marking messages as read. Please create the index for messages collection with fields: conversationId (ascending), receiverId (ascending), read (ascending)');
      }
    }
  }

  // Update user status with document creation
  async updateUserStatus(userId: string, status: UserStatus['status']): Promise<void> {
    try {
      const statusRef = doc(db, 'userStatus', userId);
      
      // Check if document exists, if not create it
      const statusDoc = await getDoc(statusRef);
      if (!statusDoc.exists()) {
        await setDoc(statusRef, {
          userId,
          status,
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isTyping: false,
          typingIn: null
        });
      } else {
        await updateDoc(statusRef, {
          status,
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      // Don't throw error to avoid breaking message sending
    }
  }

  // Subscribe to user status with null checks
  subscribeToUserStatus(
    userId: string,
    callback: (status: { state: string, last_changed: number } | null) => void
  ): () => void {
    const userStatusRef = dbRef(rtdb, '/status/' + userId);
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });
    return unsubscribe;
  }

  // Set typing indicator (like WhatsApp)
  async setTypingIndicator(
    userId: string, 
    conversationId: string, 
    isTyping: boolean
  ): Promise<void> {
    try {
      const typingRef = doc(db, 'typingIndicators', `${conversationId}_${userId}`);
      
      if (isTyping) {
        // Set typing indicator
        await updateDoc(typingRef, {
          userId,
          conversationId,
          isTyping: true,
          timestamp: serverTimestamp()
        });
      } else {
        // Remove typing indicator
        await deleteDoc(typingRef);
      }
    } catch (error) {
      // If document doesn't exist and we're trying to set typing, create it
      if (isTyping && error.code === 'not-found') {
        try {
          const typingRef = doc(db, 'typingIndicators', `${conversationId}_${userId}`);
          await setDoc(typingRef, {
            userId,
            conversationId,
            isTyping: true,
            timestamp: serverTimestamp()
          });
        } catch (createError) {
          console.error('Error creating typing indicator:', createError);
        }
      } else {
        console.error('Error setting typing indicator:', error);
      }
      // Don't throw error to avoid breaking message sending
    }
  }

  // Subscribe to typing indicators for a conversation (like WhatsApp)
  subscribeToTypingIndicators(
    conversationId: string,
    currentUserId: string,
    callback: (typingUsers: string[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'typingIndicators'),
        where('conversationId', '==', conversationId),
        where('userId', '!=', currentUserId), // Don't show own typing
        where('isTyping', '==', true)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const typingUsers: string[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Only include typing indicators from the last 10 seconds
          const typingTime = data.timestamp?.toDate();
          const now = new Date();
          if (typingTime && (now.getTime() - typingTime.getTime()) < 10000) {
            typingUsers.push(data.userId);
          }
        });
        callback(typingUsers);
      }, (error) => {
        console.error('Error subscribing to typing indicators:', error);
        callback([]);
      });

      this.unsubscribeFunctions.set(`typing_${conversationId}`, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up typing indicator subscription:', error);
      return () => {};
    }
  }

  // Clean up old typing indicators (run periodically)
  async cleanupTypingIndicators(): Promise<void> {
    try {
      const tenSecondsAgo = new Date();
      tenSecondsAgo.setSeconds(tenSecondsAgo.getSeconds() - 10);

      const q = query(
        collection(db, 'typingIndicators'),
        where('timestamp', '<', tenSecondsAgo)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error cleaning up typing indicators:', error);
    }
  }

  // Create message notification
  private async createMessageNotification(
    userId: string,
    senderId: string,
    conversationId: string,
    content: string
  ): Promise<void> {
    try {
      // Get sender info
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      const senderName = senderDoc.data()?.fullName || 'Unknown Musician';

      const notificationData = {
        userId,
        conversationId,
        senderId,
        senderName,
        content: content.length > 100 ? content.substring(0, 100) + '...' : content,
        timestamp: serverTimestamp(),
        read: false,
        type: 'message'
      };

      // DEBUG LOG
      console.log('Creating notification:', notificationData);

      await addDoc(collection(db, 'notifications'), notificationData);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Get message notifications with better error handling
  subscribeToNotifications(
    userId: string, 
    callback: (notifications: MessageNotification[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications: MessageNotification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Add null checks for timestamp
          const timestamp = data.timestamp?.toDate?.() || new Date();
          
          notifications.push({
            id: doc.id,
            userId: data.userId || '',
            conversationId: data.conversationId || '',
            senderId: data.senderId || '',
            senderName: data.senderName || 'Unknown Musician',
            content: data.content || '',
            timestamp: timestamp,
            read: data.read || false,
            type: data.type || 'message'
          });
        });
        callback(notifications);
      }, (error) => {
        console.error('Error subscribing to notifications:', error);
        // If it's an index error, provide a helpful message
        if (error.code === 'failed-precondition') {
          console.warn('Firestore index required. Please create the index for notifications collection with fields: userId (ascending), read (ascending), timestamp (descending)');
        }
        // Return empty array on error
        callback([]);
      });

      this.unsubscribeFunctions.set(`notifications_${userId}`, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up notification subscription:', error);
      // Return a no-op function
      return () => {};
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Delete message
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const messageDoc = await getDoc(doc(db, 'messages', messageId));
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      if (messageData.senderId !== userId) {
        throw new Error('You can only delete your own messages');
      }

      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Edit message
  async editMessage(messageId: string, userId: string, newContent: string): Promise<void> {
    try {
      const messageDoc = await getDoc(doc(db, 'messages', messageId));
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      if (messageData.senderId !== userId) {
        throw new Error('You can only edit your own messages');
      }

      await updateDoc(doc(db, 'messages', messageId), {
        content: newContent,
        edited: true,
        editedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  // Get message statistics
  async getMessageStats(userId: string): Promise<MessageStats> {
    try {
      // Get user's conversations
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
      );
      const conversationsSnapshot = await getDocs(conversationsQuery);
      
      const conversationIds = conversationsSnapshot.docs.map(doc => doc.id);
      
      // Get total messages
      let totalMessages = 0;
      let unreadMessages = 0;
      let messagesThisWeek = 0;
      
      for (const conversationId of conversationIds) {
        const messagesQuery = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId)
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        
        totalMessages += messagesSnapshot.size;
        
        messagesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.receiverId === userId && !data.read) {
            unreadMessages++;
          }
          
          // Messages this week
          const messageDate = data.timestamp.toDate();
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          if (messageDate > weekAgo) {
            messagesThisWeek++;
          }
        });
      }

      return {
        totalMessages,
        totalConversations: conversationIds.length,
        unreadMessages,
        messagesThisWeek,
        activeConversations: conversationIds.length
      };
    } catch (error) {
      console.error('Error getting message stats:', error);
      throw error;
    }
  }

  // Forward message to another friend
  async forwardMessage(
    originalMessageId: string,
    senderId: string,
    receiverId: string,
    content: string
  ): Promise<Message> {
    // Verify sender is verified
    const isVerified = await this.isUserVerified(senderId);
    if (!isVerified) {
      throw new Error('Only verified musicians can forward messages');
    }

    // Check if users are friends
    const areFriends = await this.areUsersFriends(senderId, receiverId);
    if (!areFriends) {
      throw new Error('You can only forward messages to your friends');
    }

    try {
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(senderId, receiverId);
      
      // Send the forwarded message
      const message = await this.sendMessage(
        conversation.id,
        senderId,
        receiverId,
        content
      );

      return message;
    } catch (error) {
      console.error('Error forwarding message:', error);
      throw error;
    }
  }

  // Archive conversation
  async archiveConversation(conversationId: string, userId: string): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`archived.${userId}`]: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error archiving conversation:', error);
      throw error;
    }
  }

  // Unarchive conversation
  async unarchiveConversation(conversationId: string, userId: string): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`archived.${userId}`]: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error unarchiving conversation:', error);
      throw error;
    }
  }

  // Mute conversation
  async muteConversation(conversationId: string, userId: string, muteUntil?: Date): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const muteData = muteUntil ? { until: serverTimestamp() } : { muted: true };
      
      await updateDoc(conversationRef, {
        [`muted.${userId}`]: muteData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error muting conversation:', error);
      throw error;
    }
  }

  // Unmute conversation
  async unmuteConversation(conversationId: string, userId: string): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`muted.${userId}`]: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error unmuting conversation:', error);
      throw error;
    }
  }

  // Pin conversation
  async pinConversation(conversationId: string, userId: string): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`pinned.${userId}`]: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error pinning conversation:', error);
      throw error;
    }
  }

  // Unpin conversation
  async unpinConversation(conversationId: string, userId: string): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`pinned.${userId}`]: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error unpinning conversation:', error);
      throw error;
    }
  }

  /**
   * Subscribe to call history for a user.
   * Listens to the 'callHistory' collection where userId == given userId.
   * Calls the callback with an array of CallHistory records.
   */
  subscribeToCallHistory(userId: string, callback: (calls: CallHistory[]) => void): () => void {
    try {
      const q = query(
        collection(db, 'callHistory'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const calls: CallHistory[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          calls.push({
            id: doc.id,
            userId: data.userId,
            participantId: data.participantId,
            participantName: data.participantName || '',
            participantAvatar: data.participantAvatar || '',
            type: data.type || 'audio',
            direction: data.direction || 'incoming',
            status: data.status || 'completed',
            startTime: data.startTime?.toDate?.() || data.timestamp?.toDate?.() || new Date(),
            endTime: data.endTime?.toDate?.() || undefined,
            duration: data.duration || 0,
            isVerified: data.isVerified === true,
            timestamp: data.timestamp?.toDate?.() || new Date(),
          });
        });
        callback(calls);
      }, (error) => {
        console.error('Error subscribing to call history:', error);
        callback([]);
      });
      this.unsubscribeFunctions.set(`callHistory_${userId}`, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up call history subscription:', error);
      return () => {};
    }
  }

  /**
   * Add a call event to the call history for a user.
   * @param call CallHistory object (without id)
   */
  async addCallToHistory(call: Omit<CallHistory, 'id'>): Promise<void> {
    try {
      await addDoc(collection(db, 'callHistory'), {
        ...call,
        timestamp: call.timestamp || serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding call to history:', error);
      throw error;
    }
  }
}

export const messagingService = new MessagingService();