export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'contact' | 'sticker';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  read: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  edited: boolean;
  editedAt?: Date;
  replyTo?: string; // ID of the message being replied to
  forwardedFrom?: {
    messageId: string;
    senderId: string;
    senderName: string;
    originalConversationId: string;
  };
  deliveredAt?: Date;
  readAt?: Date;
  metadata?: {
    location?: { lat: number; lng: number; address?: string };
    contact?: { name: string; phone: string; email?: string; avatar?: string };
    audioDuration?: number;
    videoDuration?: number;
    imageDimensions?: { width: number; height: number };
    fileType?: string;
    mimeType?: string;
    thumbnailUrl?: string;
    encryptionKey?: string; // For end-to-end encryption
    stickerId?: string;
    stickerUrl?: string;
  };
  reactions?: MessageReaction[];
  mentions?: string[]; // Array of user IDs mentioned in the message
  isEdited?: boolean;
  editHistory?: {
    originalContent: string;
    editedAt: Date;
    editedBy: string;
  }[];
  encryptionLevel?: 'none' | 'transport' | 'end-to-end';
  messageHash?: string; // For message integrity verification
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails?: ConversationParticipant[]; // Enhanced participant info
  lastMessage?: {
    content: string;
    timestamp: Date;
    senderId: string;
    type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'contact' | 'sticker';
    senderName?: string;
  };
  unreadCount: Record<string, number>;
  updatedAt: Date;
  createdAt: Date;
  isGroup: boolean;
  groupName?: string; // For group chats
  groupDescription?: string; // For group chats
  groupAvatar?: string; // For group chats
  groupAdmin?: string; // Admin user ID for group chats
  archived?: Record<string, boolean>; // User-specific archive status
  muted?: Record<string, boolean | { until: Date }>; // User-specific mute status
  pinned?: Record<string, boolean>; // User-specific pin status
  settings?: {
    allowMemberInvites?: boolean;
    allowMessageEditing?: boolean;
    allowMessageDeletion?: boolean;
    requireAdminApproval?: boolean;
    encryptionEnabled?: boolean;
  };
  metadata?: {
    totalMessages: number;
    activeMembers: number;
    lastActivity: Date;
    createdBy: string;
    tags?: string[];
    category?: 'music' | 'collaboration' | 'general' | 'project';
  };
  encryptionKey?: string; // For end-to-end encryption
  messageRetention?: {
    enabled: boolean;
    days: number;
    autoDelete: boolean;
  };
}

export interface UserStatus {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
  isTyping?: Record<string, boolean>; // Conversation ID -> typing status
}

export interface MessageNotification {
  id: string;
  userId: string;
  senderId: string;
  conversationId: string;
  content: string;
  timestamp: Date;
  read: boolean;
  type: 'message' | 'friend_request' | 'mention';
}

export interface ConversationParticipant {
  userId: string;
  fullName: string;
  profileImagePath?: string;
  isVerified: boolean;
  instrumentType?: string;
  musicCulture?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
  email?: string;
  phoneNumber?: string;
  country?: string;
  bio?: string;
  role?: 'admin' | 'member'; // For group chats
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
  duration?: number; // For audio/video
  dimensions?: { width: number; height: number }; // For images/videos
}

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface MessageSearchResult {
  message: Message;
  conversation: Conversation;
  participant: ConversationParticipant;
  highlight: string; // Highlighted search term
}

export interface ConversationSettings {
  notifications: boolean;
  sound: boolean;
  vibration: boolean;
  theme: 'default' | 'dark' | 'light';
  fontSize: 'small' | 'medium' | 'large';
  language: string;
}

export interface MessageReaction {
  userId: string;
  reaction: string; // emoji or reaction type
  timestamp: Date;
}

export interface MessageStats {
  totalConversations: number;
  activeConversations: number;
  archivedConversations: number;
  totalMessages: number;
  unreadMessages: number;
  pinnedConversations: number;
  messagesThisWeek: number;
  activeFriends: number;
}

export interface ConversationFilters {
  showArchived: boolean;
  showMuted: boolean;
  showPinned: boolean;
  searchTerm: string;
  sortBy: 'recent' | 'unread' | 'name';
  sortOrder: 'asc' | 'desc';
}

export interface ConversationArchive {
  conversationId: string;
  userId: string;
  archivedAt: Date;
  reason?: string;
}

export interface MessageForward {
  originalMessageId: string;
  originalSenderId: string;
  originalSenderName: string;
  forwardedAt: Date;
  forwardedBy: string;
}

export interface ConversationPin {
  conversationId: string;
  userId: string;
  pinnedAt: Date;
  position: number; // Order in pinned conversations
}

export interface MessageEdit {
  messageId: string;
  originalContent: string;
  newContent: string;
  editedAt: Date;
  editedBy: string;
}

export interface ConversationMute {
  conversationId: string;
  userId: string;
  mutedAt: Date;
  mutedUntil?: Date;
  reason?: string;
}

export interface MessageStatus {
  messageId: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  timestamp: Date;
  errorMessage?: string;
}

export interface ConversationSearchResult {
  conversation: Conversation;
  participant: ConversationParticipant;
  lastMessage?: Message;
  unreadCount: number;
  relevance: number; // Search relevance score
}

export interface MessageThread {
  rootMessageId: string;
  replies: Message[];
  participants: string[];
  lastActivity: Date;
}

export interface ConversationInvite {
  conversationId: string;
  invitedUserId: string;
  invitedBy: string;
  invitedAt: Date;
  status: 'pending' | 'accepted' | 'declined';
  expiresAt: Date;
}

export interface MessageDraft {
  conversationId: string;
  userId: string;
  content: string;
  attachments: MessageAttachment[];
  lastSaved: Date;
  autoSave: boolean;
}

export interface ConversationBackup {
  conversationId: string;
  userId: string;
  backupData: {
    messages: Message[];
    participants: ConversationParticipant[];
    settings: ConversationSettings;
  };
  backedUpAt: Date;
  version: string;
}

export interface MessageAnalytics {
  totalMessages: number;
  messagesByDay: Record<string, number>;
  averageResponseTime: number;
  mostActiveHours: number[];
  topEmojis: Record<string, number>;
  messageLengthStats: {
    average: number;
    shortest: number;
    longest: number;
  };
}

export interface ConversationAnalytics {
  conversationId: string;
  totalMessages: number;
  participants: string[];
  startDate: Date;
  lastActivity: Date;
  averageMessagesPerDay: number;
  responseTimeStats: {
    average: number;
    fastest: number;
    slowest: number;
  };
  messageTypes: Record<string, number>;
  activeHours: Record<number, number>;
}

export interface CallHistory {
  id: string;
  userId: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  status: 'completed' | 'missed' | 'rejected' | 'busy' | 'no-answer';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  isVerified: boolean;
  timestamp: Date;
}

export interface CallStats {
  totalCalls: number;
  totalDuration: number;
  missedCalls: number;
  completedCalls: number;
  averageDuration: number;
} 