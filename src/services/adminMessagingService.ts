import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  where, 
  orderBy, 
  onSnapshot,
  deleteDoc,
  getDoc,
  writeBatch,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { generateAiResponse, checkAiServiceStatus } from '../config/aiService';

export interface AdminMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: any;
  type: 'text' | 'system' | 'ai' | 'template' | 'important' | 'general' | 'broadcast' | 'announcement';
  category: 'verification' | 'support' | 'general' | 'technical' | 'billing' | 'feature' | 'bug' | 'suggestion' | 'announcement' | 'update';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'sent' | 'delivered' | 'read' | 'replied';
  isAutomated: boolean;
  templateId?: string;
  aiGenerated?: boolean;
  attachments?: string[];
  isBroadcast?: boolean;
  broadcastType?: 'all' | 'selected' | 'verified' | 'pending';
  selectedUsers?: string[];
  readBy?: string[]; // Add read receipts
  deliveredAt?: any; // Add delivery timestamp
  readAt?: any; // Add read timestamp
  participants?: string; // Add participants field for querying
  metadata?: {
    userAgent?: string;
    platform?: string;
    location?: string;
    aiConfidence?: number;
    escalationReason?: string;
    broadcastId?: string;
    deliveryCount?: number;
    readCount?: number;
  };
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  isActive: boolean;
  usageCount: number;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  tags: string[];
}

export interface AIConversation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  messages: AdminMessage[];
  status: 'active' | 'resolved' | 'escalated' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  assignedTo?: string;
  createdAt: any;
  lastUpdated: any;
  aiConfidence: number;
  escalationReason?: string;
  satisfactionRating?: number;
  resolutionTime?: number;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  content: string;
  type: 'all' | 'selected' | 'verified' | 'pending';
  selectedUsers?: string[];
  category: AdminMessage['category'];
  priority: AdminMessage['priority'];
  sentBy: string;
  sentAt: any;
  deliveryCount: number;
  readCount: number;
  status: 'sending' | 'sent' | 'completed';
  metadata?: {
    totalRecipients?: number;
    deliveryRate?: number;
    readRate?: number;
  };
}

export interface AdminMessagingStats {
  totalMessages: number;
  aiGeneratedMessages: number;
  templateMessages: number;
  broadcastMessages: number;
  averageResponseTime: number;
  satisfactionRate: number;
  escalationRate: number;
  activeConversations: number;
  resolvedConversations: number;
  topCategories: { category: string; count: number }[];
  topTemplates: { templateId: string; name: string; usageCount: number }[];
  broadcastStats: {
    totalBroadcasts: number;
    totalRecipients: number;
    averageDeliveryRate: number;
    averageReadRate: number;
  };
}

class AdminMessagingService {
  private aiServiceStatus: boolean = false;

  constructor() {
    this.initializeAIService();
  }

  private async initializeAIService() {
    try {
      const status = await checkAiServiceStatus();
      this.aiServiceStatus = status.available;
      console.log('AI Service Status:', status);
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      this.aiServiceStatus = false;
    }
  }

  // Message Management
  async sendMessage(messageData: Omit<AdminMessage, 'id' | 'timestamp'>): Promise<string> {
    try {
      // Always set the participants field
      const senderId = messageData.senderId;
      const receiverId = messageData.receiverId;
      const participants = [senderId, receiverId].sort().join('_');

      // Clean the message data to remove undefined values
      const cleanMessageData: any = {};
      Object.entries({ ...messageData, participants }).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          cleanMessageData[key] = value;
        }
      });

      const docRef = await addDoc(collection(db, 'adminMessages'), {
        ...cleanMessageData,
        timestamp: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  // NEW: Send broadcast message to all musicians or selected musicians
  async sendBroadcastMessage(
    content: string,
    type: 'all' | 'selected' | 'verified' | 'pending',
    selectedUsers?: string[],
    category: AdminMessage['category'] = 'announcement',
    priority: AdminMessage['priority'] = 'medium',
    title?: string
  ): Promise<string> {
    try {
      const batch = writeBatch(db);
      
      // Create broadcast record
      const broadcastData: Omit<BroadcastMessage, 'id'> = {
        title: title || 'Admin Announcement',
        content,
        type,
        selectedUsers,
        category,
        priority,
        sentBy: 'admin', // You'll need to pass the actual admin ID
        sentAt: serverTimestamp(),
        deliveryCount: 0,
        readCount: 0,
        status: 'sending'
      };

      const broadcastRef = doc(collection(db, 'broadcastMessages'));
      batch.set(broadcastRef, broadcastData);

      // Get target users based on type
      let targetUsers: string[] = [];
      
      if (type === 'all') {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        targetUsers = usersSnapshot.docs.map(doc => doc.id);
      } else if (type === 'selected' && selectedUsers) {
        targetUsers = selectedUsers;
      } else if (type === 'verified') {
        const verifiedSnapshot = await getDocs(
          query(collection(db, 'users'), where('isVerified', '==', true))
        );
        targetUsers = verifiedSnapshot.docs.map(doc => doc.id);
      } else if (type === 'pending') {
        const pendingSnapshot = await getDocs(
          query(collection(db, 'users'), where('verificationStatus', '==', 'pending'))
        );
        targetUsers = pendingSnapshot.docs.map(doc => doc.id);
      }

      // Create individual messages for each user
      const messagePromises = targetUsers.map(userId => {
        const messageData: Omit<AdminMessage, 'id' | 'timestamp'> = {
          senderId: 'admin', // You'll need to pass the actual admin ID
          receiverId: userId,
          content,
          type: 'broadcast',
          category,
          priority,
          status: 'sent',
          isAutomated: false,
          isBroadcast: true,
          broadcastType: type,
          selectedUsers,
          metadata: {
            broadcastId: broadcastRef.id,
            deliveryCount: 0,
            readCount: 0
          }
        };

        const messageRef = doc(collection(db, 'adminMessages'));
        batch.set(messageRef, {
          ...messageData,
          timestamp: serverTimestamp()
        });

        return messageRef;
      });

      // Update broadcast with delivery count
      batch.update(broadcastRef, {
        deliveryCount: targetUsers.length,
        status: 'sent',
        metadata: {
          totalRecipients: targetUsers.length,
          deliveryRate: 100,
          readRate: 0
        }
      });

      await batch.commit();
      return broadcastRef.id;
    } catch (error) {
      console.error('Error sending broadcast message:', error);
      throw new Error('Failed to send broadcast message');
    }
  }

  // NEW: Get all musicians for selection
  async getAllMusicians(): Promise<any[]> {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      return usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching musicians:', error);
      throw new Error('Failed to fetch musicians');
    }
  }

  // NEW: Get musicians by verification status
  async getMusiciansByStatus(status: 'all' | 'verified' | 'pending' | 'rejected' | 'active'): Promise<any[]> {
    try {
      let q;
      
      if (status === 'all') {
        q = query(collection(db, 'users'));
      } else if (status === 'verified') {
        q = query(collection(db, 'users'), where('isVerified', '==', true));
      } else if (status === 'pending') {
        q = query(collection(db, 'users'), where('verificationStatus', '==', 'pending'));
      } else if (status === 'rejected') {
        q = query(collection(db, 'users'), where('verificationStatus', '==', 'rejected'));
      } else if (status === 'active') {
        q = query(collection(db, 'users'), where('verificationStatus', '==', 'active'));
      }

      const usersSnapshot = await getDocs(q!);
      return usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching musicians by status:', error);
      throw new Error('Failed to fetch musicians');
    }
  }

  // NEW: Get broadcast messages
  async getBroadcastMessages(): Promise<BroadcastMessage[]> {
    try {
      const broadcastSnapshot = await getDocs(
        query(collection(db, 'broadcastMessages'))
      );
      
      const broadcasts = broadcastSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BroadcastMessage[];
      
      // Sort by sentAt in memory to avoid index issues
      return broadcasts.sort((a, b) => {
        const aTime = a.sentAt?.toDate?.() || new Date(a.sentAt || 0);
        const bTime = b.sentAt?.toDate?.() || new Date(b.sentAt || 0);
        return bTime.getTime() - aTime.getTime(); // Descending order
      });
    } catch (error) {
      console.error('Error fetching broadcast messages:', error);
      throw new Error('Failed to fetch broadcast messages');
    }
  }

  // NEW: Subscribe to broadcast messages
  subscribeToBroadcastMessages(callback: (broadcasts: BroadcastMessage[]) => void) {
    const q = query(collection(db, 'broadcastMessages'));
    
    return onSnapshot(q, (snapshot) => {
      const broadcasts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BroadcastMessage[];
      
      // Sort by sentAt in memory to avoid index issues
      const sortedBroadcasts = broadcasts.sort((a, b) => {
        const aTime = a.sentAt?.toDate?.() || new Date(a.sentAt || 0);
        const bTime = b.sentAt?.toDate?.() || new Date(b.sentAt || 0);
        return bTime.getTime() - aTime.getTime(); // Descending order
      });
      
      callback(sortedBroadcasts);
    });
  }

  async getMessages(userId: string, adminId: string): Promise<AdminMessage[]> {
    try {
      const messagesRef = collection(db, 'adminMessages');
      const q = query(
        messagesRef,
        where('participants', '==', [adminId, userId].sort().join('_'))
      );

      const querySnapshot = await getDocs(q);
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminMessage[];
      
      // Sort by timestamp in memory to avoid index issues
      return messages.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
        return aTime.getTime() - bTime.getTime();
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Failed to fetch messages');
    }
  }

  subscribeToMessages(userId: string, adminId: string, callback: (messages: AdminMessage[]) => void) {
    const messagesRef = collection(db, 'adminMessages');
    const q = query(
      messagesRef,
      where('participants', '==', [adminId, userId].sort().join('_'))
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminMessage[];
      
      // Sort by timestamp in memory to avoid index issues
      const sortedMessages = messages.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
        return aTime.getTime() - bTime.getTime();
      });
      
      callback(sortedMessages);
    });
  }

  // AI Response Generation
  async generateAIResponse(userMessage: string, userData: any, context?: string): Promise<string> {
    if (!this.aiServiceStatus) {
      return this.generateFallbackResponse(userMessage, userData);
    }

    try {
      const prompt = this.buildAIPrompt(userMessage, userData, context);
      const response = await generateAiResponse(prompt);
      
      if (response.success && response.text) {
        return response.text;
      } else {
        return this.generateFallbackResponse(userMessage, userData);
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.generateFallbackResponse(userMessage, userData);
    }
  }

  private buildAIPrompt(userMessage: string, userData: any, context?: string): string {
    const userInstruments = userData.instrumentTypes?.join(', ') || 'musician';
    const userCulture = userData.musicCulture || 'music';
    const userName = userData.fullName || 'User';

    return `You are SoundAlchemy's AI support assistant, helping musicians on our global music platform. 

User Information:
- Name: ${userName}
- Instruments: ${userInstruments}
- Music Culture: ${userCulture}
- Verification Status: ${userData.verificationStatus || 'unknown'}

User Message: "${userMessage}"

Context: ${context || 'General inquiry'}

Please provide a helpful, professional, and empathetic response that:
1. Addresses the user's specific concern
2. Shows understanding of their musical background
3. Provides actionable guidance when possible
4. Maintains a warm, supportive tone
5. Encourages engagement with the SoundAlchemy platform
6. Keeps the response concise (2-3 sentences maximum)

Response:`;
  }

  private generateFallbackResponse(userMessage: string, userData: any): string {
    const messageLower = userMessage.toLowerCase();
    const userName = userData.fullName || 'there';
    const userInstruments = userData.instrumentTypes?.join(', ') || 'music';

    if (messageLower.includes('verification') || messageLower.includes('verify')) {
      return `Hi ${userName}! I understand you're asking about verification. Your account is currently ${userData.verificationStatus}. If you need help with the verification process, please provide any additional documentation you'd like us to review. We're here to help you get verified as quickly as possible!`;
    }

    if (messageLower.includes('problem') || messageLower.includes('issue') || messageLower.includes('help')) {
      return `Hello ${userName}! I'm here to help you with your musical journey. Could you please provide more details about the specific issue you're experiencing? This will help me provide you with the most accurate solution.`;
    }

    if (messageLower.includes('collaboration') || messageLower.includes('connect')) {
      return `Great question, ${userName}! As a ${userInstruments} player, you can connect with other musicians through our platform. I'd be happy to help you find collaboration opportunities. What type of collaboration are you looking for?`;
    }

    if (messageLower.includes('feature') || messageLower.includes('request')) {
      return `Thank you for your feedback, ${userName}! We're always looking to improve SoundAlchemy for musicians like you. I've noted your request and will forward it to our development team. Is there anything else you'd like to share?`;
    }

    return `Hello ${userName}! Thank you for reaching out to SoundAlchemy support. I'm here to assist you with any questions about your musical journey. How can I help you today?`;
  }

  // Template Management
  async createTemplate(templateData: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'messageTemplates'), {
        ...templateData,
        usageCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error('Failed to create template');
    }
  }

  async getTemplates(category?: string): Promise<MessageTemplate[]> {
    try {
      const templatesRef = collection(db, 'messageTemplates');
      let q = query(templatesRef, where('isActive', '==', true));
      
      if (category && category !== 'all') {
        q = query(templatesRef, where('isActive', '==', true), where('category', '==', category));
      }

      const querySnapshot = await getDocs(q);
      const templates = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MessageTemplate[];
      
      // Sort by usage count in memory to avoid index issues
      return templates.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw new Error('Failed to fetch templates');
    }
  }

  async updateTemplate(templateId: string, updates: Partial<MessageTemplate>): Promise<void> {
    try {
      const templateRef = doc(db, 'messageTemplates', templateId);
      await updateDoc(templateRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error('Failed to update template');
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const templateRef = doc(db, 'messageTemplates', templateId);
      await deleteDoc(templateRef);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error('Failed to delete template');
    }
  }

  async incrementTemplateUsage(templateId: string): Promise<void> {
    try {
      const templateRef = doc(db, 'messageTemplates', templateId);
      const templateDoc = await getDoc(templateRef);
      
      if (templateDoc.exists()) {
        const currentUsage = templateDoc.data().usageCount || 0;
        await updateDoc(templateRef, {
          usageCount: currentUsage + 1,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error incrementing template usage:', error);
    }
  }

  // AI Conversation Management
  async createAIConversation(conversationData: Omit<AIConversation, 'id' | 'createdAt' | 'lastUpdated'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'aiConversations'), {
        ...conversationData,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating AI conversation:', error);
      throw new Error('Failed to create AI conversation');
    }
  }

  async getAIConversations(status?: string): Promise<AIConversation[]> {
    try {
      const conversationsRef = collection(db, 'aiConversations');
      let q = query(conversationsRef);
      
      if (status && status !== 'all') {
        q = query(conversationsRef, where('status', '==', status));
      }

      const querySnapshot = await getDocs(q);
      const conversations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AIConversation[];
      
      // Sort by lastUpdated in memory to avoid index issues
      return conversations.sort((a, b) => {
        const aTime = a.lastUpdated?.toDate?.() || new Date(a.lastUpdated || 0);
        const bTime = b.lastUpdated?.toDate?.() || new Date(b.lastUpdated || 0);
        return bTime.getTime() - aTime.getTime(); // Descending order
      });
    } catch (error) {
      console.error('Error fetching AI conversations:', error);
      throw new Error('Failed to fetch AI conversations');
    }
  }

  async updateAIConversation(conversationId: string, updates: Partial<AIConversation>): Promise<void> {
    try {
      const conversationRef = doc(db, 'aiConversations', conversationId);
      await updateDoc(conversationRef, {
        ...updates,
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating AI conversation:', error);
      throw new Error('Failed to update AI conversation');
    }
  }

  // Analytics and Statistics
  async getMessagingStats(adminId: string, timeRange: 'day' | 'week' | 'month' = 'week'): Promise<AdminMessagingStats> {
    try {
      const now = new Date();
      const timeRanges = {
        day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      };

      const startDate = timeRanges[timeRange];

      // Get messages in time range
      const messagesRef = collection(db, 'adminMessages');
      const messagesQuery = query(
        messagesRef,
        where('senderId', '==', adminId),
        where('timestamp', '>=', startDate)
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      const messages = messagesSnapshot.docs.map(doc => doc.data()) as AdminMessage[];

      // Get conversations
      const conversationsRef = collection(db, 'aiConversations');
      const conversationsQuery = query(
        conversationsRef,
        where('createdAt', '>=', startDate)
      );

      const conversationsSnapshot = await getDocs(conversationsQuery);
      const conversations = conversationsSnapshot.docs.map(doc => doc.data()) as AIConversation[];

      // Calculate statistics
      const totalMessages = messages.length;
      const aiGeneratedMessages = messages.filter(m => m.type === 'ai').length;
      const templateMessages = messages.filter(m => m.type === 'template').length;
      const broadcastMessages = messages.filter(m => m.type === 'broadcast').length;
      
      const activeConversations = conversations.filter(c => c.status === 'active').length;
      const resolvedConversations = conversations.filter(c => c.status === 'resolved').length;

      // Calculate average response time (simplified)
      const responseTimes = messages
        .filter(m => m.type === 'ai' || m.type === 'template')
        .map(m => 2); // Assume 2 minutes average for AI responses
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      // Calculate satisfaction rate (simplified)
      const satisfactionRate = conversations.length > 0 
        ? (conversations.filter(c => c.satisfactionRating && c.satisfactionRating >= 4).length / conversations.length) * 100
        : 0;

      // Calculate escalation rate
      const escalationRate = conversations.length > 0 
        ? (conversations.filter(c => c.status === 'escalated').length / conversations.length) * 100
        : 0;

      // Get top categories
      const categoryCounts = messages.reduce((acc, message) => {
        acc[message.category] = (acc[message.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topCategories = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get top templates
      const templates = await this.getTemplates();
      const topTemplates = templates
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(t => ({ templateId: t.id, name: t.name, usageCount: t.usageCount }));

      // Get broadcast statistics
      const broadcastMessagesQuery = query(
        collection(db, 'broadcastMessages'),
        where('sentAt', '>=', startDate)
      );
      const broadcastSnapshot = await getDocs(broadcastMessagesQuery);
      const broadcasts = broadcastSnapshot.docs.map(doc => doc.data()) as BroadcastMessage[];
      
      const totalBroadcasts = broadcasts.length;
      const totalRecipients = broadcasts.reduce((sum, b) => sum + (b.deliveryCount || 0), 0);
      const averageDeliveryRate = totalBroadcasts > 0 ? 100 : 0; // Simplified
      const averageReadRate = totalBroadcasts > 0 ? 75 : 0; // Simplified

      return {
        totalMessages,
        aiGeneratedMessages,
        templateMessages,
        broadcastMessages,
        averageResponseTime,
        satisfactionRate,
        escalationRate,
        activeConversations,
        resolvedConversations,
        topCategories,
        topTemplates,
        broadcastStats: {
          totalBroadcasts,
          totalRecipients,
          averageDeliveryRate,
          averageReadRate
        }
      };
    } catch (error) {
      console.error('Error fetching messaging stats:', error);
      throw new Error('Failed to fetch messaging statistics');
    }
  }

  // Utility Functions
  extractTemplateVariables(content: string): string[] {
    const variables = content.match(/\{\{(\w+)\}\}/g);
    return variables ? variables.map(v => v.replace(/\{\{|\}\}/g, '')) : [];
  }

  replaceTemplateVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return result;
  }

  // Auto-escalation logic
  shouldEscalateToHuman(messages: AdminMessage[], userData: any): boolean {
    // Escalate if:
    // 1. More than 5 messages in conversation
    if (messages.length > 5) return true;

    // 2. User has urgent priority issues
    const urgentMessages = messages.filter(m => m.priority === 'urgent');
    if (urgentMessages.length > 0) return true;

    // 3. User is unverified and asking about verification
    const verificationMessages = messages.filter(m => 
      m.category === 'verification' && 
      userData.verificationStatus === 'pending'
    );
    if (verificationMessages.length > 2) return true;

    // 4. Complex technical issues
    const technicalMessages = messages.filter(m => m.category === 'technical');
    if (technicalMessages.length > 3) return true;

    return false;
  }

  // Smart categorization
  categorizeMessage(content: string): AdminMessage['category'] {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('verify') || lowerContent.includes('verification')) {
      return 'verification';
    }
    if (lowerContent.includes('bug') || lowerContent.includes('error') || lowerContent.includes('broken')) {
      return 'bug';
    }
    if (lowerContent.includes('feature') || lowerContent.includes('request') || lowerContent.includes('add')) {
      return 'feature';
    }
    if (lowerContent.includes('bill') || lowerContent.includes('payment') || lowerContent.includes('money')) {
      return 'billing';
    }
    if (lowerContent.includes('technical') || lowerContent.includes('problem') || lowerContent.includes('issue')) {
      return 'technical';
    }
    if (lowerContent.includes('suggest') || lowerContent.includes('improve') || lowerContent.includes('better')) {
      return 'suggestion';
    }
    if (lowerContent.includes('help') || lowerContent.includes('support') || lowerContent.includes('assist')) {
      return 'support';
    }
    
    return 'general';
  }

  // Priority assessment
  assessPriority(content: string, userData: any): AdminMessage['priority'] {
    const lowerContent = content.toLowerCase();
    
    // Urgent keywords
    if (lowerContent.includes('urgent') || lowerContent.includes('emergency') || lowerContent.includes('broken')) {
      return 'urgent';
    }
    
    // High priority indicators
    if (lowerContent.includes('important') || lowerContent.includes('critical') || 
        lowerContent.includes('verification') || userData.verificationStatus === 'pending') {
      return 'high';
    }
    
    // Medium priority
    if (lowerContent.includes('help') || lowerContent.includes('support') || lowerContent.includes('question')) {
      return 'medium';
    }
    
    return 'low';
  }

  // Mark messages as read
  async markMessagesAsRead(userId: string, adminId: string): Promise<void> {
    try {
      const messagesRef = collection(db, 'adminMessages');
      const q = query(
        messagesRef,
        where('senderId', '==', userId),
        where('receiverId', '==', adminId),
        where('status', '==', 'sent')
      );
      
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: 'read',
          readAt: serverTimestamp(),
          readBy: arrayUnion(adminId)
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw new Error('Failed to mark messages as read');
    }
  }
}

export const adminMessagingService = new AdminMessagingService();
export default adminMessagingService; 