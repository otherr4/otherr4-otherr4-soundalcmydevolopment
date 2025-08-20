import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, getDocs, doc, updateDoc, addDoc, serverTimestamp, where, orderBy, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Users, 
  Search, 
  Send, 
  MoreVertical, 
  Filter,
  Plus,
  Bot,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Archive,
  Trash2,
  Edit,
  Copy,
  Smile,
  Paperclip,
  Mic,
  Video,
  Phone,
  Settings,
  Zap,
  Brain,
  Sparkles,
  Target,
  MessageCircle,
  Bell,
  Shield,
  HelpCircle,
  Lightbulb,
  TrendingUp,
  Award,
  Music,
  Headphones,
  Mic2,
  Guitar,
  Piano,
  Drum,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  FileText,
  Image,
  File,
  Link,
  Calendar,
  Clock as ClockIcon,
  UserCheck,
  UserX,
  Mail,
  PhoneCall,
  Video as VideoIcon,
  MessageCircle as MessageCircleIcon,
  Settings as SettingsIcon,
  Info,
  Check,
  Loader,
  BarChart,
  CreditCard,
  Globe,
  Megaphone,
  UserPlus,
  CheckSquare,
  Square,
  Eye,
  CheckCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import adminMessagingService, { AdminMessage, MessageTemplate, AIConversation, BroadcastMessage } from '../../services/adminMessagingService';
import { API_URL } from '../../config/constants';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

// Image cache for ultra-fast loading
const imageCache = new Map<string, string>();
const preloadedImages = new Set<string>();

// Optimized image preloader
const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (preloadedImages.has(src)) {
      resolve();
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      preloadedImages.add(src);
      resolve();
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
};

// Batch preload images for better performance
const batchPreloadImages = async (urls: string[]) => {
  const uniqueUrls = urls.filter(url => url && !preloadedImages.has(url));
  if (uniqueUrls.length === 0) return;

  const promises = uniqueUrls.map(url => preloadImage(url).catch(() => {}));
  await Promise.allSettled(promises);
};

// Ultra-optimized Google Drive URL converter
const getGoogleDriveDirectUrl = (url: string): string => {
  if (!url) return '';
  
  if (url.includes('drive.google.com')) {
    let fileId = '';
    
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch) {
      fileId = fileIdMatch[1];
    } else {
      const ucMatch = url.match(/[?&]id=([^&]+)/);
      if (ucMatch) {
        fileId = ucMatch[1];
      } else {
        const openMatch = url.match(/\bid=([^&]+)/);
        if (openMatch) {
          fileId = openMatch[1];
        }
      }
    }

    if (fileId) {
      // Use optimized direct URL without timestamp for better caching
      return `https://images.weserv.nl/?url=drive.google.com/uc?export=view%26id=${fileId}`;
    }
  }
  
  return url;
};

// Ultra-fast profile image URL resolver with caching
const getProfileImageUrl = (path?: string): string => {
  if (!path) return '/default-avatar.svg';
  
  // Check cache first
  if (imageCache.has(path)) {
    return imageCache.get(path)!;
  }
  
  let resolvedUrl = '';
  
  if (path.includes('drive.google.com')) {
    resolvedUrl = getGoogleDriveDirectUrl(path);
  } else if (path.startsWith('/')) {
    resolvedUrl = path;
  } else if (path.startsWith('http')) {
    resolvedUrl = path;
  } else {
    resolvedUrl = `${API_URL}${path}`;
  }
  
  // Cache the resolved URL
  imageCache.set(path, resolvedUrl);
  return resolvedUrl;
};

// Ultra-optimized ProfileImage component
const ProfileImage = React.memo(({ src, alt }: { src: string; alt: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const imageUrl = React.useMemo(() => getProfileImageUrl(src), [src]);
  const defaultAvatar = '/default-avatar.svg';

  useEffect(() => {
    if (!imageUrl || imageUrl === defaultAvatar) {
      setIsLoaded(true);
      return;
    }

    // If already preloaded, show immediately
    if (preloadedImages.has(imageUrl)) {
      setIsLoaded(true);
      return;
    }

    // Preload the image
    preloadImage(imageUrl)
      .then(() => {
        setIsLoaded(true);
        setHasError(false);
      })
      .catch(() => {
        setHasError(true);
        setIsLoaded(true);
      });
  }, [imageUrl]);

  // If no src or error, show default avatar
  if (!src || hasError) {
    return (
      <div className="relative w-full h-full">
        <img 
          src={defaultAvatar}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <img 
        ref={imgRef}
        src={imageUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        loading="lazy"
        decoding="async"
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-dark-600 animate-pulse" />
      )}
    </div>
  );
});

ProfileImage.displayName = 'ProfileImage';

interface UserData {
  uid: string;
  fullName: string;
  email: string;
  contactNumber: string;
  country: string;
  instrumentTypes?: string[];
  singingTypes?: string[];
  musicCulture: string;
  bio: string;
  profileImagePath: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'active';
  role: string;
  createdAt: any;
  lastUpdated: any;
}

// Add user status tracking
interface UserStatus {
  status: 'online' | 'offline' | 'away';
  lastSeen: any;
}

const MESSAGE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'important', label: 'Important' },
  { value: 'system', label: 'System' },
  { value: 'ai', label: 'AI' },
  { value: 'template', label: 'Template' },
];

const CATEGORY_DEFAULT: AdminMessage['category'] = 'general';
const PRIORITY_DEFAULT: AdminMessage['priority'] = 'medium';

const AdminMessagingPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAIAgent, setShowAIAgent] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [aiConversations, setAiConversations] = useState<AIConversation[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '', category: 'general' });
  const [viewMode, setViewMode] = useState<'users' | 'templates' | 'ai' | 'analytics' | 'broadcast'>('users');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI Agent State
  const [aiAgentStatus, setAiAgentStatus] = useState<'idle' | 'active' | 'busy'>('idle');
  const [aiAgentStats, setAiAgentStats] = useState({
    conversationsHandled: 0,
    averageResponseTime: 0,
    satisfactionRate: 0,
    escalationRate: 0
  });

  // NEW: Broadcast messaging state
  const [broadcastMessages, setBroadcastMessages] = useState<BroadcastMessage[]>([]);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    content: '',
    type: 'all' as 'all' | 'selected' | 'verified' | 'pending',
    category: 'announcement' as AdminMessage['category'],
    priority: 'medium' as AdminMessage['priority']
  });
  const [selectedMusicians, setSelectedMusicians] = useState<Set<string>>(new Set());
  const [musicianFilter, setMusicianFilter] = useState<'all' | 'verified' | 'pending' | 'rejected' | 'active'>('all');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // New state for message type and emoji picker
  const [messageType, setMessageType] = useState<AdminMessage['type']>('general');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Add user status tracking
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
    fetchTemplates();
    fetchAIConversations();
    fetchBroadcastMessages();
  }, []);

  // Preload all user images when users data changes
  useEffect(() => {
    if (users.length > 0) {
      const imageUrls = users
        .map(user => user.profileImagePath)
        .filter(Boolean)
        .map(path => getProfileImageUrl(path));
      
      // Preload images in background without blocking UI
      batchPreloadImages(imageUrls);
    }
  }, [users]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.uid);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // NEW: Fetch broadcast messages
  const fetchBroadcastMessages = async () => {
    try {
      const unsubscribe = adminMessagingService.subscribeToBroadcastMessages((broadcasts) => {
        setBroadcastMessages(broadcasts);
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching broadcast messages:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const usersData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserData[];
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const templatesData = await adminMessagingService.getTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchAIConversations = async () => {
    try {
      const conversationsData = await adminMessagingService.getAIConversations();
      setAiConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching AI conversations:', error);
    }
  };

    const fetchMessages = async (userId: string) => {
    try {
      if (!user?.uid) return;
      
      const unsubscribe = adminMessagingService.subscribeToMessages(userId, user.uid, (messagesData) => {
        setMessages(messagesData);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Fix subscribeToMessages call to match the correct signature
  useEffect(() => {
    if (!selectedUser || !user?.uid) return;
    const unsubscribe = adminMessagingService.subscribeToMessages(selectedUser.uid, user.uid, (msgs: AdminMessage[]) => {
      setMessages(msgs);
      scrollToBottom();
    });
    return () => unsubscribe();
  }, [selectedUser, user]);

  // Add user status subscription
  useEffect(() => {
    if (!users.length) return;

    const unsubscribes: (() => void)[] = [];
    
    users.forEach(user => {
      const statusRef = doc(db, 'userStatus', user.uid);
      const unsubscribe = onSnapshot(statusRef, (doc) => {
        if (doc.exists()) {
          const statusData = doc.data() as UserStatus;
          setUserStatuses(prev => ({
            ...prev,
            [user.uid]: statusData
          }));
          
          // Update online users set
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            if (statusData.status === 'online') {
              newSet.add(user.uid);
            } else {
              newSet.delete(user.uid);
            }
            return newSet;
          });
        }
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [users]);

  // Update sendMessage to mark messages as read
  const sendMessage = async (content: string) => {
    if (!content.trim() || !selectedUser || !user?.uid) return;
    try {
      const messageData = {
        senderId: user.uid,
        receiverId: selectedUser.uid,
        content: content.trim(),
        type: messageType,
        category: CATEGORY_DEFAULT,
        priority: PRIORITY_DEFAULT,
        status: 'sent' as const,
        isAutomated: messageType === 'ai' || messageType === 'template',
        aiGenerated: messageType === 'ai',
        templateId: selectedTemplate?.id,
        participants: [user.uid, selectedUser.uid].sort().join('_'),
        readBy: [user.uid], // Mark as read by sender
        deliveredAt: serverTimestamp(),
        readAt: serverTimestamp()
      };
      console.log('Sending message:', messageData);
      await adminMessagingService.sendMessage(messageData);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // NEW: Send broadcast message
  const sendBroadcastMessage = async () => {
    if (!broadcastForm.content.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (broadcastForm.type === 'selected' && selectedMusicians.size === 0) {
      toast.error('Please select at least one musician');
      return;
    }

    try {
      setIsSendingBroadcast(true);
      
      await adminMessagingService.sendBroadcastMessage(
        broadcastForm.content,
        broadcastForm.type,
        broadcastForm.type === 'selected' ? Array.from(selectedMusicians) : undefined,
        broadcastForm.category,
        broadcastForm.priority,
        broadcastForm.title
      );

      setBroadcastForm({
        title: '',
        content: '',
        type: 'all',
        category: 'announcement',
        priority: 'medium'
      });
      setSelectedMusicians(new Set());
      setShowBroadcastModal(false);
      toast.success('Broadcast message sent successfully');
    } catch (error) {
      console.error('Error sending broadcast message:', error);
      toast.error('Failed to send broadcast message');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // NEW: Handle musician selection
  const handleMusicianSelection = (musicianId: string) => {
    const newSelected = new Set(selectedMusicians);
    if (newSelected.has(musicianId)) {
      newSelected.delete(musicianId);
    } else {
      newSelected.add(musicianId);
    }
    setSelectedMusicians(newSelected);
  };

  // NEW: Select all musicians
  const handleSelectAllMusicians = () => {
    if (selectedMusicians.size === users.length) {
      setSelectedMusicians(new Set());
    } else {
      setSelectedMusicians(new Set(users.map(u => u.uid)));
    }
  };

  const generateAIResponse = async () => {
    if (!selectedUser || !newMessage.trim()) return;

    setIsGeneratingAI(true);
    try {
      const aiResponse = await adminMessagingService.generateAIResponse(newMessage, selectedUser);
      await sendMessage(aiResponse);
      
      toast.success('AI response generated and sent');
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast.error('Failed to generate AI response');
    } finally {
      setIsGeneratingAI(false);
    }
  };



  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const templateData = {
        name: newTemplate.name,
        content: newTemplate.content,
        category: newTemplate.category,
        variables: adminMessagingService.extractTemplateVariables(newTemplate.content),
        isActive: true,
        createdBy: user?.uid || 'admin',
        tags: []
      };

      await adminMessagingService.createTemplate(templateData);
      
      setNewTemplate({ name: '', content: '', category: 'general' });
      setShowNewTemplate(false);
      fetchTemplates();
      toast.success('Template created successfully');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'verification': return <UserCheck size={16} />;
      case 'support': return <HelpCircle size={16} />;
      case 'technical': return <Settings size={16} />;
      case 'billing': return <CreditCard size={16} />;
      case 'feature': return <Lightbulb size={16} />;
      case 'bug': return <AlertCircle size={16} />;
      case 'suggestion': return <MessageCircle size={16} />;
      default: return <MessageSquare size={16} />;
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      user.fullName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.country?.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || user.verificationStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredMessages = messages.filter(message => {
    const matchesCategory = categoryFilter === 'all' || message.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || message.priority === priorityFilter;
    return matchesCategory && matchesPriority;
  });

  // NEW: Filtered musicians for selection
  const filteredMusicians = users.filter(user => {
    if (musicianFilter === 'all') return true;
    if (musicianFilter === 'verified') return user.isVerified;
    if (musicianFilter === 'pending') return user.verificationStatus === 'pending';
    if (musicianFilter === 'rejected') return user.verificationStatus === 'rejected';
    if (musicianFilter === 'active') return user.verificationStatus === 'active';
    return true;
  });

  // NEW: Render broadcast section
  const renderBroadcastSection = () => (
    <div className="flex-1 bg-dark-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Broadcast Messaging</h2>
        <button
          onClick={() => setShowBroadcastModal(true)}
          className="flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
        >
          <Megaphone size={16} className="mr-2" />
          New Broadcast
        </button>
      </div>

      {/* Broadcast Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center">
            <Megaphone size={20} className="text-primary-400 mr-2" />
            <div>
              <p className="text-sm text-gray-400">Total Broadcasts</p>
              <p className="text-xl font-bold">{broadcastMessages.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center">
            <Users size={20} className="text-green-400 mr-2" />
            <div>
              <p className="text-sm text-gray-400">Total Recipients</p>
              <p className="text-xl font-bold">
                {broadcastMessages.reduce((sum, b) => sum + (b.deliveryCount || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle size={20} className="text-blue-400 mr-2" />
            <div>
              <p className="text-sm text-gray-400">Delivery Rate</p>
              <p className="text-xl font-bold">100%</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center">
            <Eye size={20} className="text-yellow-400 mr-2" />
            <div>
              <p className="text-sm text-gray-400">Read Rate</p>
              <p className="text-xl font-bold">75%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Broadcasts */}
      <div className="bg-dark-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Recent Broadcasts</h3>
        <div className="space-y-3">
          {broadcastMessages.slice(0, 5).map((broadcast) => (
            <div key={broadcast.id} className="bg-dark-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{broadcast.title}</h4>
                <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(broadcast.priority)}`}>
                  {broadcast.priority}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-2">{broadcast.content}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Type: {broadcast.type}</span>
                <span>Recipients: {broadcast.deliveryCount}</span>
                <span>Read: {broadcast.readCount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // NEW: Render broadcast modal
  const renderBroadcastModal = () => (
    <AnimatePresence>
      {showBroadcastModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowBroadcastModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-dark-800 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-dark-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Send Broadcast Message</h2>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Message Form */}
              <div className="w-1/2 p-6 border-r border-dark-700">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Broadcast Type
                    </label>
                    <select
                      value={broadcastForm.type}
                      onChange={(e) => setBroadcastForm(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                    >
                      <option value="all">All Musicians</option>
                      <option value="verified">Verified Musicians Only</option>
                      <option value="pending">Pending Verification</option>
                      <option value="selected">Selected Musicians</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={broadcastForm.title}
                      onChange={(e) => setBroadcastForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter broadcast title..."
                      className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Message
                    </label>
                    <textarea
                      value={broadcastForm.content}
                      onChange={(e) => setBroadcastForm(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Enter your broadcast message..."
                      rows={6}
                      className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Category
                      </label>
                      <select
                        value={broadcastForm.category}
                        onChange={(e) => setBroadcastForm(prev => ({ ...prev, category: e.target.value as any }))}
                        className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                      >
                        <option value="announcement">Announcement</option>
                        <option value="update">Update</option>
                        <option value="general">General</option>
                        <option value="support">Support</option>
                        <option value="technical">Technical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Priority
                      </label>
                      <select
                        value={broadcastForm.priority}
                        onChange={(e) => setBroadcastForm(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={sendBroadcastMessage}
                    disabled={isSendingBroadcast || !broadcastForm.content.trim()}
                    className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {isSendingBroadcast ? (
                      <>
                        <Loader size={16} className="animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Megaphone size={16} className="mr-2" />
                        Send Broadcast
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Musician Selection */}
              <div className="w-1/2 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Select Musicians</h3>
                  <div className="flex items-center space-x-2">
                    <select
                      value={musicianFilter}
                      onChange={(e) => setMusicianFilter(e.target.value as any)}
                      className="px-3 py-1 bg-dark-700 border border-dark-600 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                    >
                      <option value="all">All</option>
                      <option value="verified">Verified</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                      <option value="active">Active</option>
                    </select>
                    <button
                      onClick={handleSelectAllMusicians}
                      className="px-3 py-1 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm transition-colors"
                    >
                      {selectedMusicians.size === filteredMusicians.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredMusicians.map((musician) => (
                    <div
                      key={musician.uid}
                      className="flex items-center p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors cursor-pointer"
                      onClick={() => handleMusicianSelection(musician.uid)}
                    >
                      <div className="flex items-center flex-1">
                        <div className="h-8 w-8 rounded-full bg-dark-600 overflow-hidden flex-shrink-0 mr-3">
                          <ProfileImage src={musician.profileImagePath} alt={musician.fullName} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{musician.fullName}</p>
                          <p className="text-xs text-gray-400">{musician.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(musician.verificationStatus)}`}>
                          {musician.verificationStatus}
                        </span>
                        {selectedMusicians.has(musician.uid) ? (
                          <CheckSquare size={16} className="text-primary-400" />
                        ) : (
                          <Square size={16} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-dark-700 rounded-lg">
                  <p className="text-sm text-gray-400">
                    Selected: {selectedMusicians.size} musician{selectedMusicians.size !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Add function to mark messages as read
  const markMessagesAsRead = async (conversationId: string) => {
    if (!user?.uid || !selectedUser) return;
    
    try {
      await adminMessagingService.markMessagesAsRead(selectedUser.uid, user.uid);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedUser && messages.length > 0) {
      markMessagesAsRead(selectedUser.uid);
    }
  }, [selectedUser, messages]);

  // Add helper function to get user status display
  const getUserStatusDisplay = (userId: string) => {
    const status = userStatuses[userId];
    if (!status) return { text: 'Offline', color: 'text-gray-400', dot: 'bg-gray-400' };
    
    switch (status.status) {
      case 'online':
        return { text: 'Online', color: 'text-green-400', dot: 'bg-green-400' };
      case 'away':
        return { text: 'Away', color: 'text-yellow-400', dot: 'bg-yellow-400' };
      default:
        return { text: 'Offline', color: 'text-gray-400', dot: 'bg-gray-400' };
    }
  };

  // Add helper function to get message status icon
  const getMessageStatusIcon = (message: AdminMessage) => {
    if (message.senderId !== user?.uid) return null;
    
    if (message.readBy?.includes(selectedUser?.uid || '')) {
      return <CheckCheck size={12} className="text-blue-400" />;
    } else if (message.deliveredAt) {
      return <CheckCheck size={12} className="text-gray-400" />;
    } else {
      return <Check size={12} className="text-gray-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Admin Messaging Center</h1>
        <p className="text-gray-400">Communicate with musicians using AI-powered responses and templates</p>
      </div>

      {/* View Mode Tabs */}
      <div className="flex space-x-1 mb-6 bg-dark-700 rounded-lg p-1">
        <button
          onClick={() => setViewMode('users')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'users' 
              ? 'bg-primary-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users size={16} className="mr-2" />
          Musicians
        </button>
        <button
          onClick={() => setViewMode('templates')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'templates' 
              ? 'bg-primary-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileText size={16} className="mr-2" />
          Templates
        </button>
        <button
          onClick={() => setViewMode('ai')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'ai' 
              ? 'bg-primary-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Bot size={16} className="mr-2" />
          AI Agent
        </button>
        <button
          onClick={() => setViewMode('analytics')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'analytics' 
              ? 'bg-primary-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <BarChart size={16} className="mr-2" />
          Analytics
        </button>
        <button
          onClick={() => setViewMode('broadcast')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'broadcast' 
              ? 'bg-primary-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Megaphone size={16} className="mr-2" />
          Broadcast
        </button>
      </div>

      {viewMode === 'users' && (
        <div className="flex-1 flex gap-6">
          {/* Users List */}
          <div className="w-1/3 bg-dark-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-dark-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Musicians</h2>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search musicians..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500 text-sm"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto h-[calc(100vh-300px)]">
              {isLoading ? (
                <div className="p-4 text-center">
                  <Loader className="animate-spin mx-auto mb-2" size={24} />
                  <p className="text-gray-400">Loading musicians...</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.uid}
                    onClick={() => setSelectedUser(user)}
                    className={`p-4 border-b border-dark-700 cursor-pointer transition-colors ${
                      selectedUser?.uid === user.uid ? 'bg-primary-600/20 border-primary-500' : 'hover:bg-dark-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-dark-600 overflow-hidden flex-shrink-0">
                        <ProfileImage src={user.profileImagePath} alt={user.fullName} />
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-sm">{user.fullName}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(user.verificationStatus)}`}>
                            {user.verificationStatus}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{user.email}</p>
                        <p className="text-xs text-gray-500">{user.country}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 bg-dark-800 rounded-lg overflow-hidden flex flex-col">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-dark-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-dark-600 overflow-hidden">
                          <ProfileImage
                            src={selectedUser.profileImagePath}
                            alt={selectedUser.fullName}
                          />
                        </div>
                        {/* Online status indicator */}
                        {onlineUsers.has(selectedUser.uid) && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-dark-800 rounded-full"></div>
                        )}
                      </div>
                      <div className="ml-3">
                        <h3 className="font-medium">{selectedUser.fullName}</h3>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getUserStatusDisplay(selectedUser.uid).dot}`}></div>
                          <p className={`text-sm ${getUserStatusDisplay(selectedUser.uid).color}`}>
                            {getUserStatusDisplay(selectedUser.uid).text}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowTemplates(true)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        title="Message Templates"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        onClick={() => setShowAIAgent(true)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        title="AI Agent"
                      >
                        <Bot size={16} />
                      </button>
                      <button
                        onClick={() => {/* initiate call logic */}}
                        className="p-2 text-primary-400 hover:text-primary-300"
                        title="Start Call"
                      >
                        <Phone size={18} />
                      </button>
                      <button
                        onClick={() => {/* initiate video call logic */}}
                        className="p-2 text-primary-400 hover:text-primary-300"
                        title="Start Video Call"
                      >
                        <Video size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm opacity-70">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.senderId === user?.uid
                              ? 'bg-primary-500 text-white'
                              : 'bg-dark-700 text-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs opacity-70">
                              {MESSAGE_TYPES.find(t => t.value === message.type)?.label || message.type}
                            </span>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs opacity-70">
                                {message.timestamp?.toDate?.()?.toLocaleTimeString() || 'Now'}
                              </span>
                              {getMessageStatusIcon(message)}
                            </div>
                          </div>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-dark-700">
                  <div className="flex items-center space-x-2">
                    <select
                      value={messageType}
                      onChange={e => setMessageType(e.target.value as AdminMessage['type'])}
                      className="px-2 py-1 bg-dark-700 border border-dark-600 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                    >
                      {MESSAGE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(v => !v)}
                      className="p-2 hover:bg-dark-600 rounded-full"
                      title="Add Emoji"
                    >
                      <Smile size={20} />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 right-0 z-50">
                        <Picker data={data} onEmojiSelect={(emoji: any) => setNewMessage(prev => prev + emoji.native)} theme="dark" />
                      </div>
                    )}
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(newMessage);
                        }
                      }}
                    />
                    <button
                      onClick={() => sendMessage(newMessage)}
                      disabled={!newMessage.trim()}
                      className="p-2 bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                    >
                      <Send size={16} className="text-white" />
                    </button>
                    <button
                      onClick={generateAIResponse}
                      disabled={!newMessage.trim() || isGeneratingAI}
                      className="p-2 bg-secondary-500 rounded-lg hover:bg-secondary-600 transition-colors disabled:opacity-50"
                      title="Generate AI Response"
                    >
                      {isGeneratingAI ? (
                        <Loader size={16} className="animate-spin text-white" />
                      ) : (
                        <Bot size={16} className="text-white" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare size={48} className="text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Select a Musician</h3>
                  <p className="text-gray-400">Choose a musician from the list to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'templates' && (
        <div className="flex-1 bg-dark-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Message Templates</h2>
            <button
              onClick={() => setShowNewTemplate(true)}
              className="flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            >
              <Plus size={16} className="mr-2" />
              New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{template.name}</h3>
                  <span className="text-xs text-gray-400">Used {template.usageCount} times</span>
                </div>
                <p className="text-sm text-gray-400 mb-3 line-clamp-3">{template.content}</p>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-1 bg-dark-600 rounded-full text-xs">{template.category}</span>
                  <button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setNewMessage(template.content);
                    }}
                    className="text-primary-400 hover:text-primary-300 text-sm"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'ai' && (
        <div className="flex-1 bg-dark-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">AI Agent Dashboard</h2>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-sm ${
                aiAgentStatus === 'active' ? 'bg-green-500/20 text-green-400' :
                aiAgentStatus === 'busy' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {aiAgentStatus === 'active' ? '🟢 Active' :
                 aiAgentStatus === 'busy' ? '🟡 Busy' : '⚪ Idle'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <MessageCircle size={20} className="text-primary-400 mr-2" />
                <span className="text-sm text-gray-400">Conversations</span>
              </div>
              <div className="text-2xl font-bold">{aiAgentStats.conversationsHandled}</div>
            </div>
            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Clock size={20} className="text-green-400 mr-2" />
                <span className="text-sm text-gray-400">Avg Response</span>
              </div>
              <div className="text-2xl font-bold">{aiAgentStats.averageResponseTime}s</div>
            </div>
            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Star size={20} className="text-yellow-400 mr-2" />
                <span className="text-sm text-gray-400">Satisfaction</span>
              </div>
              <div className="text-2xl font-bold">{aiAgentStats.satisfactionRate}%</div>
            </div>
            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <User size={20} className="text-red-400 mr-2" />
                <span className="text-sm text-gray-400">Escalations</span>
              </div>
              <div className="text-2xl font-bold">{aiAgentStats.escalationRate}%</div>
            </div>
          </div>

          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="font-medium mb-4">Recent AI Conversations</h3>
            <div className="space-y-3">
              {aiConversations.slice(0, 5).map((conversation) => (
                <div key={conversation.id} className="flex items-center justify-between p-3 bg-dark-600 rounded-lg">
                  <div>
                    <h4 className="font-medium">{conversation.userName}</h4>
                    <p className="text-sm text-gray-400">{conversation.category}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(conversation.priority)}`}>
                      {conversation.priority}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      conversation.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                      conversation.status === 'escalated' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {conversation.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'analytics' && (
        <div className="flex-1 bg-dark-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Messaging Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <MessageSquare size={20} className="text-primary-400 mr-2" />
                <span className="text-sm text-gray-400">Total Messages</span>
              </div>
              <div className="text-2xl font-bold">{messages.length}</div>
            </div>
            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Bot size={20} className="text-secondary-400 mr-2" />
                <span className="text-sm text-gray-400">AI Responses</span>
              </div>
              <div className="text-2xl font-bold">
                {messages.filter(m => m.type === 'ai').length}
              </div>
            </div>
            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <FileText size={20} className="text-green-400 mr-2" />
                <span className="text-sm text-gray-400">Templates Used</span>
              </div>
              <div className="text-2xl font-bold">
                {messages.filter(m => m.type === 'template').length}
              </div>
            </div>
            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Users size={20} className="text-blue-400 mr-2" />
                <span className="text-sm text-gray-400">Active Users</span>
              </div>
              <div className="text-2xl font-bold">{users.length}</div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'broadcast' && renderBroadcastSection()}

      {/* Templates Modal */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowTemplates(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Message Templates</h2>
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  {templates.map((template) => (
                    <div key={template.id} className="p-4 bg-dark-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{template.name}</h3>
                        <span className="text-xs text-gray-400">Used {template.usageCount} times</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{template.content}</p>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-1 bg-dark-600 rounded-full text-xs">{template.category}</span>
                        <button
                          onClick={() => {
                            setSelectedTemplate(template);
                            setNewMessage(template.content);
                            setShowTemplates(false);
                          }}
                          className="text-primary-400 hover:text-primary-300 text-sm"
                        >
                          Use Template
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Template Modal */}
      <AnimatePresence>
        {showNewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowNewTemplate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-lg w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Create New Template</h2>
                  <button
                    onClick={() => setShowNewTemplate(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                      placeholder="Enter template name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Category
                    </label>
                    <select
                      value={newTemplate.category}
                      onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                    >
                      <option value="general">General</option>
                      <option value="verification">Verification</option>
                      <option value="support">Support</option>
                      <option value="technical">Technical</option>
                      <option value="billing">Billing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Template Content
                    </label>
                    <textarea
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                      placeholder="Enter template content. Use {{variable}} for dynamic content."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowNewTemplate(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createTemplate}
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                    >
                      Create Template
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broadcast Modal */}
      {renderBroadcastModal()}
    </div>
  );
};

export default AdminMessagingPage; 