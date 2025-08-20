import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { messagingService } from '../../services/messagingService';
import { createWebSocketConnection, disconnectWebSocket } from '../../config/websocket';
import { 
  Message, 
  Conversation, 
  ConversationParticipant,
  MessageNotification,
  UserStatus
} from '../../types/messaging';
import { 
  Send, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Image, 
  Paperclip,
  Smile,
  Mic,
  X,
  Edit3,
  Trash2,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  UserPlus,
  Users,
  MessageCircle,
  ArrowLeft,
  MoreHorizontal,
  Archive,
  Pin,
  Reply,
  Forward,
  Copy,
  User,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Bell,
  Shield,
  Palette,
  Eye,
  HelpCircle,
  Moon,
  Sun,
  Smartphone,
  Volume1,
  Play,
  Pause,
  Monitor,
  Maximize2,
  Minimize2,
  Grid3X3,
  Square,
  VideoOff,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfileImageUrl } from '../../utils/profileImage';
import { EmojiPicker } from '../chat/EmojiPicker';
import Draggable from 'react-draggable';
import UserProfileModal from './UserProfileModal';
import CallHistoryComponent from './CallHistory';
import VideoCallSettingsModal from '../communication/VideoCallSettingsModal';
import StickerMessage from '../chat/StickerMessage';
import Select from 'react-select';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FaReply, FaEdit, FaTrash, FaCopy, FaInfoCircle, FaShare } from 'react-icons/fa';

interface MessagingInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

// Add a hook to subscribe to user status for a list of userIds
function useUserStatuses(userIds: string[]) {
  const [statuses, setStatuses] = useState<Record<string, { state: string, last_changed: number } | undefined>>({});

  useEffect(() => {
    if (!userIds || userIds.length === 0) return;
    const unsubscribes: (() => void)[] = [];
    userIds.forEach(uid => {
      const unsub = messagingService.subscribeToUserStatus(uid, (status) => {
        if (status) {
          setStatuses(prev => ({ ...prev, [uid]: status }));
        } else {
          setStatuses(prev => {
            const newStatuses = { ...prev };
            delete newStatuses[uid];
            return newStatuses;
          });
        }
      });
      unsubscribes.push(unsub);
    });
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [userIds.join(',')]);

  return statuses;
}

// Helper to find conversation for a friend regardless of participant order
function findConversationForFriend(conversations: Conversation[], userId: string, friendId: string) {
  return conversations.find(conv => {
    if (!conv.participants || conv.participants.length !== 2) return false;
    return conv.participants.includes(userId) && conv.participants.includes(friendId);
  });
}

interface VideoCallFallbackProps {
  participant: {
    fullName?: string;
    profileImagePath?: string;
    isVerified?: boolean;
    instrumentType?: string;
    musicCulture?: string;
  } | null;
  callState: 'idle' | 'calling' | 'incoming' | 'in-call';
  callDuration: number;
}

const VideoCallFallback: React.FC<VideoCallFallbackProps> = ({ participant, callState, callDuration }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-dark-800 rounded-lg p-6">
      {/* Profile Image */}
      <div className="relative mb-4">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary-500 shadow-lg">
          {participant?.profileImagePath ? (
            <img 
              src={getProfileImageUrl(participant)} 
              alt={participant.fullName} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
              }}
            />
          ) : (
            <div className="w-full h-full bg-dark-700 flex items-center justify-center">
              <User size={48} className="text-gray-400" />
            </div>
          )}
        </div>
        {participant?.isVerified && (
          <div className="absolute -right-1 -top-1 bg-primary-500 text-white p-1 rounded-full">
            <Check size={16} />
          </div>
        )}
      </div>

      {/* User Info */}
      <h3 className="text-2xl font-bold text-white mb-2">
        {participant?.fullName || 'Unknown User'}
      </h3>
      
      {/* Call Status */}
      <div className="text-gray-400 mb-4">
        {callState === 'calling' ? (
          <span className="text-yellow-500">Calling...</span>
        ) : callState === 'incoming' ? (
          <span className="text-green-500">Incoming Call</span>
        ) : (
          <span>{formatCallDuration(callDuration)}</span>
        )}
      </div>

      {/* User Details */}
      {participant && (
        <div className="text-center text-gray-400 space-y-2">
          <p>{participant.instrumentType}</p>
          <p>{participant.musicCulture}</p>
        </div>
      )}
    </div>
  );
};

// Format call duration helper
const formatCallDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Add VideoGrid component
const VideoGrid: React.FC<{
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localUser: any;
  remoteUser: any;
  callState: 'idle' | 'calling' | 'incoming' | 'in-call';
  callDuration: number;
  isLocalVideoEnabled: boolean;
  isRemoteVideoEnabled: boolean;
  onToggleVideo: () => void;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
  onScreenShare: () => void;
  onSettings: () => void;
}> = ({
  localStream,
  remoteStream,
  localUser,
  remoteUser,
  callState,
  callDuration,
  isLocalVideoEnabled,
  isRemoteVideoEnabled,
  onToggleVideo,
  onToggleMic,
  onToggleSpeaker,
  onEndCall,
  onScreenShare,
  onSettings,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [gridLayout, setGridLayout] = useState<'single' | 'dual' | 'grid'>('dual');

  // Determine grid layout based on participants
  useEffect(() => {
    if (localStream && remoteStream) {
      setGridLayout('dual');
    } else if (localStream || remoteStream) {
      setGridLayout('single');
    }
  }, [localStream, remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.load();
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.load();
    }
  }, [remoteStream]);

  // Force video elements to update when enabled state changes
  useEffect(() => {
    if (localVideoRef.current && localStream && isLocalVideoEnabled) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack && videoTrack.enabled) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.load();
      }
    }
  }, [isLocalVideoEnabled, localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && isRemoteVideoEnabled) {
      const videoTrack = remoteStream.getVideoTracks()[0];
      if (videoTrack && videoTrack.enabled) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.load();
      }
    }
  }, [isRemoteVideoEnabled, remoteStream]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const getGridClass = () => {
    if (isFullscreen) return 'grid-cols-1';
    if (gridLayout === 'single') return 'grid-cols-1';
    if (gridLayout === 'dual') return 'grid-cols-2';
    return 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  const getVideoContainerClass = () => {
    if (isFullscreen) return 'col-span-1';
    if (gridLayout === 'single') return 'col-span-1';
    if (gridLayout === 'dual') return 'col-span-1';
    return 'col-span-1';
  };

  return (
    <div className={`flex flex-col h-full ${isMinimized ? 'w-80 h-60' : 'w-full'}`}>
      {/* Call Status Bar with Controls */}
      <div className="bg-dark-800 p-3 md:p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-white">
              {callState === 'calling' ? 'Ringing...' : 
               callState === 'incoming' ? 'Incoming Call' : 
               formatCallDuration(callDuration)}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1 md:space-x-2">
          {/* Grid Layout Toggle */}
          <button
            onClick={() => setGridLayout(gridLayout === 'dual' ? 'single' : 'dual')}
            className="p-2 rounded-full hover:bg-dark-700"
            title={gridLayout === 'dual' ? 'Single View' : 'Dual View'}
          >
            <Grid3X3 className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          </button>
          
          {/* Minimize/Maximize */}
          <button
            onClick={toggleMinimize}
            className="p-2 rounded-full hover:bg-dark-700"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4 md:w-5 md:h-5 text-gray-400" /> : <Minimize2 className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />}
          </button>
          
          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full hover:bg-dark-700"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 md:w-5 md:h-5 text-gray-400" /> : <Maximize2 className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />}
          </button>
          
          {/* Settings */}
          <button
            onClick={onSettings}
            className="p-2 rounded-full hover:bg-dark-700"
            title="Settings"
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className={`flex-1 bg-dark-800 p-2 md:p-4 grid ${getGridClass()} gap-2 md:gap-4`}>
        {/* Local Video */}
        <div className={`relative bg-dark-700 rounded-lg overflow-hidden ${getVideoContainerClass()}`}>
          {localStream && isLocalVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              onLoadedMetadata={() => {
                if (localVideoRef.current) {
                  localVideoRef.current.play().catch(console.error);
                }
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-500 shadow-lg">
                  {localUser?.profileImagePath ? (
                    <img 
                      src={getProfileImageUrl(localUser)}
                      alt={localUser.fullName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to default avatar if profile image fails
                        (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-dark-600 flex items-center justify-center">
                      <User size={32} className="text-gray-400" />
                    </div>
                  )}
                </div>
                {localUser?.isVerified && (
                  <div className="absolute -right-1 -top-1 bg-primary-500 text-white p-1 rounded-full">
                    <Check size={12} />
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {localUser?.fullName || 'You'}
              </h3>
              <p className="text-sm text-gray-400">
                Camera Off
              </p>
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-dark-900/80 px-3 py-1 rounded-full text-sm text-white">
            You
          </div>
        </div>

        {/* Remote Video */}
        {remoteStream && (
          <div className={`relative bg-dark-700 rounded-lg overflow-hidden ${getVideoContainerClass()}`}>
            {isRemoteVideoEnabled ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.play().catch(console.error);
                  }
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-500 shadow-lg">
                    {remoteUser?.profileImagePath ? (
                      <img 
                        src={getProfileImageUrl(remoteUser)}
                        alt={remoteUser.fullName} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to default avatar if profile image fails
                          (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-dark-600 flex items-center justify-center">
                        <User size={32} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  {remoteUser?.isVerified && (
                    <div className="absolute -right-1 -top-1 bg-primary-500 text-white p-1 rounded-full">
                      <Check size={12} />
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {remoteUser?.fullName || 'Unknown User'}
                </h3>
                <p className="text-sm text-gray-400">
                  {callState === 'calling' ? 'Calling...' : 
                   callState === 'incoming' ? 'Incoming Call' :
                   'Camera Off'}
                </p>
                {remoteUser?.instrumentType && (
                  <p className="text-xs text-gray-500 mt-1">
                    {remoteUser.instrumentType}
                    {remoteUser.musicCulture && ` • ${remoteUser.musicCulture}`}
                  </p>
                )}
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-dark-900/80 px-3 py-1 rounded-full text-sm text-white">
              {remoteUser?.fullName || 'Unknown User'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MessagingInterface: React.FC<MessagingInterfaceProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [availableFriends, setAvailableFriends] = useState<ConversationParticipant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<MessageNotification[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [viewMode, setViewMode] = useState<'conversations' | 'friends' | 'chat'>('conversations');
  const [selectedTab, setSelectedTab] = useState<'chats' | 'friends' | 'admin'>('chats');
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [showConversationMenu, setShowConversationMenu] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [sortOrder, setSortOrder] = useState<'recent' | 'unread'>('recent');
  // Add caret position state:
  const [caretPosition, setCaretPosition] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings state with persistence
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('soundalchemy-settings');
    return savedSettings ? JSON.parse(savedSettings) : {
      theme: 'dark',
      lastSeen: 'everyone',
      privacy: {
        profilePhoto: 'everyone',
        status: 'everyone',
        readReceipts: true
      },
      notifications: {
        messagePreview: true,
        sound: true,
        vibration: true
      },
      chat: {
        enterToSend: true,
        mediaAutoDownload: true
      },
      ringtone: 'apple.mp3'
    };
  });
  const [selectedRingtone, setSelectedRingtone] = useState('apple.mp3');
  const [isPlayingRingtone, setIsPlayingRingtone] = useState(false);
  const [currentSettingsTab, setCurrentSettingsTab] = useState('general');

  // --- Call/RTC State ---
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'in-call'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ from: string, type: 'audio' | 'video', offer: any } | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Advanced video call features
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [showVideoControls, setShowVideoControls] = useState(true);
  const [videoLayout, setVideoLayout] = useState<'pip' | 'grid' | 'fullscreen'>('pip');
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);
  const [videoQuality, setVideoQuality] = useState<'auto' | 'hd' | 'sd'>('auto');
  const [isLocalVideoEnabled, setIsLocalVideoEnabled] = useState(true);
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showVideoOptions, setShowVideoOptions] = useState(false);
  const [videoPosition, setVideoPosition] = useState({ x: 0, y: 0 });
  const [videoSize, setVideoSize] = useState({ width: 320, height: 240 });
  const [canSwitchToVideo, setCanSwitchToVideo] = useState(false);
  const [isSwitchingToVideo, setIsSwitchingToVideo] = useState(false);
  const [showVideoToggle, setShowVideoToggle] = useState(false);
  const [showVideoBar, setShowVideoBar] = useState(true);
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [blurBackground, setBlurBackground] = useState(false);
  const [fullscreenVideo, setFullscreenVideo] = useState<'none' | 'local' | 'remote'>('none');
  const [availableDevices, setAvailableDevices] = useState<{
    microphones: MediaDeviceInfo[];
    cameras: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }>({
    microphones: [],
    cameras: [],
    speakers: []
  });
  const [selectedDevices, setSelectedDevices] = useState({
    microphone: '',
    camera: '',
    speaker: ''
  });
  
  // Call timer
  const callTimerRef = useRef<NodeJS.Timeout>();

  // Audio elements for ringtone and ringback - separate refs for proper typing
  const ringbackAudioEl = useRef<HTMLAudioElement | null>(null);
  const ringtoneAudioEl = useRef<HTMLAudioElement | null>(null);
  const ringbackWebAudio = useRef<{ context: AudioContext; oscillator: OscillatorNode; gainNode: GainNode; loopInterval?: NodeJS.Timeout } | null>(null);
const ringtoneWebAudio = useRef<{ context: AudioContext; oscillator: OscillatorNode; gainNode: GainNode; loopInterval?: NodeJS.Timeout } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [audioOutputId, setAudioOutputId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const typingIntervalRef = useRef<NodeJS.Timeout>();

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize messaging service and WebSocket connection when user is available
  useEffect(() => {
    if (user) {
      messagingService.initialize(user.uid).catch(console.error);
      
      // Initialize WebSocket connection for real-time features
      const socket = createWebSocketConnection(user.uid);
      
      // Initialize call signaling
      messagingService.initCallSignaling(socket, user.uid);
      
      // Cleanup on unmount
      return () => {
        disconnectWebSocket();
      };
    }
  }, [user]);

  // Load conversations
  useEffect(() => {
    if (!user) return;

    const unsubscribe = messagingService.subscribeToConversations(user.uid, (conversations) => {
      setConversations(conversations);
    });

    return () => unsubscribe();
  }, [user]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation || !user) return;

    // Mark messages as read and reset unreadCount for this conversation
    messagingService.markMessagesAsRead(selectedConversation.id, user.uid);

    const unsubscribe = messagingService.subscribeToMessages(selectedConversation.id, (messages) => {
      setMessages(messages);
    });

    return () => unsubscribe();
  }, [selectedConversation, user]);

  // Load available friends
  useEffect(() => {
    if (!user) return;

    const loadFriends = async () => {
      try {
        const friends = await messagingService.getVerifiedFriends(user.uid);
        setAvailableFriends(friends);
      } catch (error) {
        console.error('Error loading friends:', error);
        // Removed toast.error('Failed to load friends')
      }
    };

    loadFriends();
  }, [user]);

  // Load notifications
  useEffect(() => {
    if (!user) return;

    const unsubscribe = messagingService.subscribeToNotifications(user.uid, (notifications) => {
      setNotifications(notifications);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle typing indicator (like WhatsApp)
  const handleTyping = () => {
    if (!selectedConversation || !user) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing indicator
    messagingService.setTypingIndicator(user.uid, selectedConversation.id, true);

    // Clear typing indicator after 2 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      messagingService.setTypingIndicator(user.uid, selectedConversation.id, false);
    }, 2000);
  };

  // Subscribe to typing indicators from other users
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const unsubscribe = messagingService.subscribeToTypingIndicators(
      selectedConversation.id,
      user.uid,
      (users) => {
        setTypingUsers(users);
      }
    );

    return () => unsubscribe();
  }, [selectedConversation, user]);

  // Cleanup typing indicators on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

  // --- Call Signaling Handlers ---
  useEffect(() => {
    messagingService.onCallSignal((type, data) => {
      if (type === 'offer') {
        setIncomingCall({ from: data.from, type: data.callType, offer: data.offer });
        setCallState('incoming');
        playRingtone();
      }
      if (type === 'answer' && peerConnectionRef.current) {
        peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallState('in-call');
        stopRingback();
        stopRingtone();
        startCallTimer();
      }
      if (type === 'ice-candidate' && peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
      if (type === 'switch-to-video') {
        handleVideoSwitch();
      }
      if (type === 'switch-to-audio') {
        handleAudioSwitch();
      }
      if (type === 'video-toggle') {
        handleVideoToggle(data.enabled);
      }
      if (type === 'end') {
        // Automatically end call on both sides when one user ends it
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }
        if (remoteStream) {
          remoteStream.getTracks().forEach(track => track.stop());
          setRemoteStream(null);
        }
        setCallState('idle');
        setCallType(null);
        setIncomingCall(null);
        stopRingtone();
        stopRingback();
        stopCallTimer();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Initiate Call ---
  const initiateCall = async (type: 'audio' | 'video') => {
    if (!selectedConversation || !user) return;
    const recipientId = getConversationParticipant(selectedConversation)?.userId;
    if (!recipientId) return;

    let callTimeout: NodeJS.Timeout | null = null;
    let callAnswered = false;

    try {
      // Check online status before calling (silent check)
      const isRecipientOnline = userStatuses[recipientId]?.state === 'online';
      // If offline, start missed call timer
      if (!isRecipientOnline) {
        callTimeout = setTimeout(async () => {
          if (!callAnswered) {
            setCallState('idle');
            setCallType(null);
            stopRingback();
            // Log missed call for both caller and recipient
            const participant = getConversationParticipant(selectedConversation);
            const now = new Date();
            await messagingService.addCallToHistory({
              userId: user.uid,
              participantId: recipientId,
              participantName: participant?.fullName || 'Unknown',
              participantAvatar: participant?.profileImagePath,
              type,
              direction: 'outgoing',
              status: 'missed',
              startTime: now,
              endTime: now,
              duration: 0,
              isVerified: participant?.isVerified || false,
              timestamp: now,
            });
            await messagingService.addCallToHistory({
              userId: recipientId,
              participantId: user.uid,
              participantName: user.displayName || 'Unknown',
              participantAvatar: user.photoURL ?? undefined,
              type,
              direction: 'incoming',
              status: 'missed',
              startTime: now,
              endTime: now,
              duration: 0,
              isVerified: false,
              timestamp: now,
            });
          }
        }, 30000); // 30 seconds
      }

      setCallType(type);
      setCallState('calling');
      setIsMuted(false);
      setIsSpeaker(false);
      setCanSwitchToVideo(type === 'audio');
      setIsLocalVideoEnabled(type === 'video'); // Auto-enable video for video calls
      playRingback();

      // Get user media with video enabled by default for video calls
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      });
      setLocalStream(stream);

      // Create peer connection with STUN servers
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          messagingService.sendCallSignal('ice-candidate', {
            to: recipientId,
            candidate: event.candidate
          });
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        callAnswered = true;
        if (callTimeout) clearTimeout(callTimeout);
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      messagingService.sendCallSignal('offer', {
        to: recipientId,
        offer,
        callType: type
      });

      // Play ringback tone
      if (ringbackAudioEl.current) {
        ringbackAudioEl.current.currentTime = 0;
        ringbackAudioEl.current.play().catch(console.error);
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      setCallState('idle');
      setCallType(null);
      if (callTimeout) clearTimeout(callTimeout);
    }
  };

  // --- Accept/Reject/End Call ---
  const acceptCall = async () => {
    if (!incomingCall || !user) return;

    try {
    setCallType(incomingCall.type);
    setCallState('in-call');
    setIsMuted(false);
    setIsSpeaker(false);
      setCanSwitchToVideo(incomingCall.type === 'audio');
      setIsLocalVideoEnabled(incomingCall.type === 'video'); // Auto-enable video for video calls

      // Get user media with video enabled by default for video calls
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: incomingCall.type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      });
    setLocalStream(stream);

      // Create peer connection with STUN servers
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
    peerConnectionRef.current = pc;

      // Add local stream tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        messagingService.sendCallSignal('ice-candidate', {
          to: incomingCall.from,
          candidate: event.candidate
        });
      }
    };

      // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

      // Set remote description and create answer
    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

      // Send answer
    messagingService.sendCallSignal('answer', {
      to: incomingCall.from,
      answer
    });

    setIncomingCall(null);

    // Stop ringtone
      stopRingtone();
      stopRingback();

      // Start call timer
      startCallTimer();

    } catch (error) {
      console.error('Error accepting call:', error);
      setCallState('idle');
      setCallType(null);
      setIncomingCall(null);
    }
  };

  const rejectCall = async () => {
    if (!incomingCall || !user) return;
    
    // Send reject signal
    messagingService.sendCallSignal('end', { to: incomingCall.from });
    
    // Stop ringtone
    stopRingtone();
    stopRingback();
    
    // Record rejected call in history
    const participant = getConversationParticipant(selectedConversation!);
    // await messagingService.addCallToHistory({
    //   userId: user.uid,
    //   participantId: incomingCall.from,
    //   participantName: participant?.fullName || 'Unknown',
    //   participantAvatar: participant?.profileImagePath,
    //   type: incomingCall.type,
    //   direction: 'incoming',
    //   status: 'rejected',
    //   startTime: new Date(),
    //   isVerified: participant?.isVerified || false
    // });
    
    setIncomingCall(null);
    setCallState('idle');
  };

  const endCall = async () => {
    // Always notify the other user that call is ending (for both incoming and outgoing calls)
    if (user) {
      let recipientId = '';
      
      // For outgoing calls
      if (selectedConversation) {
        recipientId = selectedConversation.participants.find(p => p !== user.uid) || '';
      }
      
      // For incoming calls
      if (incomingCall) {
        recipientId = incomingCall.from;
      }
      
      // Send end signal to the other user
      if (recipientId) {
        messagingService.sendCallSignal('end', { to: recipientId });
      }
    }
    
    // Clean up peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Stop all media streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    
    // Record call end in history if call was active
    if (callState === 'in-call' && user && selectedConversation) {
      const participant = getConversationParticipant(selectedConversation);
      const callStartTime = new Date(); // This should be tracked from when call started
      const callDuration = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
      
      await messagingService.addCallToHistory({
        userId: user.uid,
        participantId: participant?.userId || '',
        participantName: participant?.fullName || 'Unknown',
        participantAvatar: participant?.profileImagePath,
        type: callType || 'audio',
        direction: 'outgoing',
        status: 'completed',
        startTime: callStartTime,
        endTime: new Date(),
        duration: callDuration,
        isVerified: participant?.isVerified || false,
        timestamp: new Date(),
      });
    }
    
    // Stop call timer
    stopCallTimer();
    
    // Reset all call states
    setCallState('idle');
    setCallType(null);
    setIncomingCall(null);
    
    // Reset video states
    setShowVideoControls(true);
    setVideoLayout('pip');
    setIsVideoFullscreen(false);
    setIsVideoMinimized(false);
    setIsLocalVideoEnabled(true);
    setIsScreenSharing(false);
    setShowVideoOptions(false);
    setFullscreenVideo('none');
    setShowVideoSettings(false);
    
    // Stop all audio
    stopRingtone();
    stopRingback();
    
    // Call ended silently
  };

  // --- Speaker Toggle ---
  const toggleSpeaker = async () => {
    try {
      const remoteAudio = document.getElementById('remote-audio') as HTMLAudioElement | null;
      if (remoteAudio && 'setSinkId' in remoteAudio) {
        const newSpeakerState = !isSpeaker;
        const deviceId = newSpeakerState ? 'speaker' : 'default';
        
        // @ts-ignore
        await remoteAudio.setSinkId(deviceId);
        setIsSpeaker(newSpeakerState);
        
        // Speaker toggle successful
      } else {
        // Fallback for browsers that don't support setSinkId
        setIsSpeaker(!isSpeaker);
        // Speaker toggle not supported
      }
    } catch (error) {
      console.error('Error toggling speaker:', error);
      setIsSpeaker(!isSpeaker);
      // Could not switch audio output
    }
  };

  // --- Play/Stop Ringtone and Ringback ---
  const playRingtone = () => {
  try {
    // Stop any existing ringtone first
    stopRingtone();
    
    if (ringtoneAudioEl.current) {
      ringtoneAudioEl.current.currentTime = 0;
      ringtoneAudioEl.current.loop = true;
      ringtoneAudioEl.current.volume = 0.7;
      ringtoneAudioEl.current.play().then(() => {
        console.log('Ringtone started playing');
        // Ringtone started
      }).catch((error: any) => {
        console.error('Error playing ringtone:', error);
        // Fallback to Web Audio API if MP3 fails
        playFallbackRingtone();
      });
    } else {
      playFallbackRingtone();
    }
  } catch (error) {
    console.error('Error with ringtone:', error);
    playFallbackRingtone();
  }
};

  const playFallbackRingtone = () => {
  try {
    // Stop any existing fallback ringtone
    if (ringtoneWebAudio.current) {
      ringtoneWebAudio.current.oscillator.stop();
      ringtoneWebAudio.current.context.close();
      ringtoneWebAudio.current = null;
    }
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create a continuous ringtone pattern that loops
    const createRingtonePattern = () => {
      const frequencies = [800, 600, 800, 1000, 800, 600];
      const duration = 2.0; // 2 seconds per pattern
      
      frequencies.forEach((freq, index) => {
        const time = audioContext.currentTime + (index * duration / frequencies.length);
        oscillator.frequency.setValueAtTime(freq, time);
      });
      
      // Set gain for the pattern
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    };
    
    // Start the pattern
    createRingtonePattern();
    oscillator.start(audioContext.currentTime);
    
    // Create a loop that repeats the pattern every 2 seconds
    const loopInterval = setInterval(() => {
      if (ringtoneWebAudio.current) {
        createRingtonePattern();
      } else {
        clearInterval(loopInterval);
      }
    }, 2000);
    
    // Store reference to stop later
    ringtoneWebAudio.current = { 
      context: audioContext, 
      oscillator, 
      gainNode,
      loopInterval 
    };
    
    console.log('Fallback ringtone started playing');
    // Fallback ringtone started
  } catch (error) {
    console.error('Error with fallback ringtone:', error);
  }
};

  const stopRingtone = () => {
  try {
    if (ringtoneAudioEl.current) {
      ringtoneAudioEl.current.pause();
      ringtoneAudioEl.current.currentTime = 0;
    }
    if (ringtoneWebAudio.current) {
      if (ringtoneWebAudio.current.loopInterval) {
        clearInterval(ringtoneWebAudio.current.loopInterval);
      }
      ringtoneWebAudio.current.oscillator.stop();
      ringtoneWebAudio.current.context.close();
      ringtoneWebAudio.current = null;
    }
  } catch (error) {
    console.error('Error stopping ringtone:', error);
  }
};

  const playRingback = () => {
  try {
    // Stop any existing ringback first
    stopRingback();
    
    if (ringbackAudioEl.current) {
      ringbackAudioEl.current.currentTime = 0;
      ringbackAudioEl.current.loop = true;
      ringbackAudioEl.current.volume = 0.5;
      ringbackAudioEl.current.play().then(() => {
        console.log('Ringback started playing');
      }).catch((error: any) => {
        console.error('Error playing ringback:', error);
        // Fallback to Web Audio API
        playFallbackRingback();
      });
    } else {
      playFallbackRingback();
    }
  } catch (error) {
    console.error('Error with ringback:', error);
    playFallbackRingback();
  }
};

  const playFallbackRingback = () => {
  try {
    // Stop any existing fallback ringback
    if (ringbackWebAudio.current) {
      if (ringbackWebAudio.current.loopInterval) {
        clearInterval(ringbackWebAudio.current.loopInterval);
      }
      ringbackWebAudio.current.oscillator.stop();
      ringbackWebAudio.current.context.close();
      ringbackWebAudio.current = null;
    }
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create a continuous ringback pattern that loops
    const createRingbackPattern = () => {
      oscillator.frequency.setValueAtTime(480, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(620, audioContext.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    };
    
    // Start the pattern
    createRingbackPattern();
    oscillator.start(audioContext.currentTime);
    
    // Create a loop that repeats the pattern every 1 second
    const loopInterval = setInterval(() => {
      if (ringbackWebAudio.current) {
        createRingbackPattern();
      } else {
        clearInterval(loopInterval);
      }
    }, 1000);
    
    ringbackWebAudio.current = { 
      context: audioContext, 
      oscillator, 
      gainNode,
      loopInterval 
    };
    
    console.log('Fallback ringback started playing');
  } catch (error) {
    console.error('Error with fallback ringback:', error);
  }
};

    const stopRingback = () => {
    try {
      if (ringbackAudioEl.current) {
        ringbackAudioEl.current.pause();
        ringbackAudioEl.current.currentTime = 0;
      }
      if (ringbackWebAudio.current) {
        if (ringbackWebAudio.current.loopInterval) {
          clearInterval(ringbackWebAudio.current.loopInterval);
        }
        ringbackWebAudio.current.oscillator.stop();
        ringbackWebAudio.current.context.close();
        ringbackWebAudio.current = null;
      }
    } catch (error) {
      console.error('Error stopping ringback:', error);
    }
  };

  // Call timer functions
  const startCallTimer = () => {
    setCallStartTime(new Date());
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = undefined;
    }
    setCallStartTime(null);
    setCallDuration(0);
  };

  const formatCallDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };



  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        }
        
        setIsScreenSharing(true);
        setLocalStream(screenStream);
      } else {
        // Stop screen sharing and restore camera
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = cameraStream.getVideoTracks()[0];
        
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        }
        
        setIsScreenSharing(false);
        setLocalStream(cameraStream);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const toggleVideoFullscreen = () => {
    setIsVideoFullscreen(!isVideoFullscreen);
    if (videoLayout === 'pip') {
      setVideoLayout('fullscreen');
    } else {
      setVideoLayout('pip');
    }
  };

  const toggleVideoMinimize = () => {
    setIsVideoMinimized(!isVideoMinimized);
  };

  const changeVideoLayout = (layout: 'pip' | 'grid' | 'fullscreen') => {
    setVideoLayout(layout);
    if (layout === 'fullscreen') {
      setIsVideoFullscreen(true);
    } else {
      setIsVideoFullscreen(false);
    }
  };

  const changeVideoQuality = (quality: 'auto' | 'hd' | 'sd') => {
    setVideoQuality(quality);
    // Apply quality constraints to video track
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const constraints = {
          width: quality === 'hd' ? { ideal: 1920 } : quality === 'sd' ? { ideal: 640 } : undefined,
          height: quality === 'hd' ? { ideal: 1080 } : quality === 'sd' ? { ideal: 480 } : undefined,
          frameRate: quality === 'hd' ? { ideal: 30 } : quality === 'sd' ? { ideal: 15 } : undefined
        };
        videoTrack.applyConstraints(constraints);
      }
    }
  };

  // Switch from audio to video call
  const switchToVideoCall = async () => {
    if (!user || !selectedConversation) return;
    
    try {
      setIsSwitchingToVideo(true);
      
      // Get video stream
      const videoStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      
      // Add video track to existing peer connection
      if (peerConnectionRef.current) {
        const videoTrack = videoStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        
        if (sender) {
          sender.replaceTrack(videoTrack);
        } else {
          peerConnectionRef.current.addTrack(videoTrack, videoStream);
        }
      }
      
      // Update local stream with video
      setLocalStream(videoStream);
      setCallType('video');
      setIsLocalVideoEnabled(true);
      setCanSwitchToVideo(false);
      
      // Notify other user about video switch
      const recipientId = selectedConversation.participants.find(p => p !== user.uid);
      if (recipientId) {
        messagingService.sendCallSignal('switch-to-video', { to: recipientId });
      }
      
    } catch (error) {
      console.error('Error switching to video:', error);
    } finally {
      setIsSwitchingToVideo(false);
    }
  };

  // Handle video switch from other user
  const handleVideoSwitch = () => {
    setCallType('video');
    setCanSwitchToVideo(false);
  };

  // Switch back to audio call
  const switchToAudioCall = async () => {
    if (!user || !selectedConversation) return;
    
    try {
      // Stop video tracks
      if (localStream) {
        localStream.getVideoTracks().forEach(track => track.stop());
      }
      
      // Get audio-only stream
      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      
      // Replace video track with null to disable video
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(null);
        }
      }
      
      setLocalStream(audioStream);
      setCallType('audio');
      setIsLocalVideoEnabled(false);
      
      // Notify other user about audio switch
      const recipientId = selectedConversation.participants.find(p => p !== user.uid);
      if (recipientId) {
        messagingService.sendCallSignal('switch-to-audio', { to: recipientId });
      }
      
    } catch (error) {
      console.error('Error switching to audio:', error);
    }
  };

  // Handle audio switch from other user
  const handleAudioSwitch = () => {
    setCallType('audio');
    setIsLocalVideoEnabled(false);
  };

  // Get available devices
  const getAvailableDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      setAvailableDevices({
        microphones: devices.filter(device => device.kind === 'audioinput'),
        cameras: devices.filter(device => device.kind === 'videoinput'),
        speakers: devices.filter(device => device.kind === 'audiooutput')
      });
      
      // Set default selected devices
      if (devices.length > 0) {
        setSelectedDevices({
          microphone: devices.find(d => d.kind === 'audioinput')?.deviceId || '',
          camera: devices.find(d => d.kind === 'videoinput')?.deviceId || '',
          speaker: devices.find(d => d.kind === 'audiooutput')?.deviceId || ''
        });
      }
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  };

  // Change device
  const changeDevice = async (deviceType: 'microphone' | 'camera' | 'speaker', deviceId: string) => {
    try {
      if (deviceType === 'microphone' || deviceType === 'camera') {
        const constraints = {
          audio: deviceType === 'microphone' ? { deviceId: { exact: deviceId } } : true,
          video: deviceType === 'camera' ? { deviceId: { exact: deviceId } } : true
        };
        
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (peerConnectionRef.current) {
          const track = deviceType === 'microphone' 
            ? newStream.getAudioTracks()[0] 
            : newStream.getVideoTracks()[0];
          
          const sender = peerConnectionRef.current.getSenders().find(s => 
            s.track?.kind === (deviceType === 'microphone' ? 'audio' : 'video')
          );
          
          if (sender) {
            sender.replaceTrack(track);
          }
        }
        
        setLocalStream(newStream);
      } else if (deviceType === 'speaker') {
        const remoteAudio = document.getElementById('remote-audio') as HTMLAudioElement;
        if (remoteAudio && 'setSinkId' in remoteAudio) {
          // @ts-ignore
          await remoteAudio.setSinkId(deviceId);
        }
      }
      
      setSelectedDevices(prev => ({ ...prev, [deviceType]: deviceId }));
    } catch (error) {
      console.error(`Error changing ${deviceType}:`, error);
    }
  };

  // Toggle blur background
  const toggleBlurBackground = () => {
    setBlurBackground(!blurBackground);
  };

  // Toggle fullscreen video
  const toggleFullscreenVideo = (videoType: 'local' | 'remote') => {
    if (fullscreenVideo === videoType) {
      setFullscreenVideo('none');
    } else {
      setFullscreenVideo(videoType);
    }
  };

  // Improved video toggle that works for both users
  const toggleVideo = async () => {
    try {
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          const newEnabledState = !videoTrack.enabled;
          videoTrack.enabled = newEnabledState;
          setIsLocalVideoEnabled(newEnabledState);
          
          // If turning video back on, ensure the track is properly active
          if (newEnabledState) {
            // Force a small delay to ensure the track is properly enabled
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Update the peer connection if needed
            if (peerConnectionRef.current) {
              const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
              if (sender && sender.track !== videoTrack) {
                sender.replaceTrack(videoTrack);
              }
            }
          }
          
          // Send video state to other user
          if (user && selectedConversation) {
            const recipientId = selectedConversation.participants.find(p => p !== user.uid);
            if (recipientId) {
              messagingService.sendCallSignal('video-toggle', { 
                to: recipientId, 
                enabled: newEnabledState 
              });
            }
          }
        }
      } else {
        // If no local stream, try to get video stream
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: true 
          });
          setLocalStream(newStream);
          setIsLocalVideoEnabled(true);
          
          // Add video track to peer connection
          if (peerConnectionRef.current) {
            const videoTrack = newStream.getVideoTracks()[0];
            const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            } else {
              peerConnectionRef.current.addTrack(videoTrack, newStream);
            }
          }
        } catch (error) {
          console.error('Error getting video stream:', error);
          setIsLocalVideoEnabled(false);
        }
      }
    } catch (error) {
      console.error('Error toggling video:', error);
      setIsLocalVideoEnabled(false);
    }
  };

  // Handle video toggle from other user
  const handleVideoToggle = (enabled: boolean) => {
    setIsRemoteVideoEnabled(enabled);
  };

  // Send message with advanced features
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() && !replyToMessage && !forwardMessage) return;
    if (!selectedConversation || !user) return;

    const receiverId = selectedConversation.participants.find(p => p !== user.uid);
    if (!receiverId) return;

    // --- Optimistic UI update ---
    let optimisticMessage: Message | null = null;
    let messageContent = newMessage.trim();
    let messageType: Message['type'] = 'text';
    let metadata: any = undefined;
    let replyToId = replyToMessage?.id || undefined;

    // Handle forwarded messages
    if (forwardMessage) {
      messageContent = forwardMessage.content;
      messageType = forwardMessage.type;
      metadata = {
        ...forwardMessage.metadata,
        forwardedFrom: {
          messageId: forwardMessage.id,
          senderId: forwardMessage.senderId,
          senderName: availableFriends.find(f => f.userId === forwardMessage.senderId)?.fullName || 'Unknown',
          originalConversationId: forwardMessage.conversationId
        }
      };
    }

    // Handle reply messages
    if (replyToMessage) {
      replyToId = replyToMessage.id;
    }

    // Optimistically add the message to the UI
    optimisticMessage = {
      id: 'optimistic-' + Date.now(),
      conversationId: selectedConversation.id,
      senderId: user.uid,
      receiverId,
      content: messageContent,
      timestamp: new Date(),
      type: messageType,
      status: 'sending',
      read: false,
      edited: false,
      replyTo: replyToId,
      metadata,
    };
    setMessages(prev => [...prev, optimisticMessage!]);
    setNewMessage('');
    setReplyToMessage(null);
    setForwardMessage(null);
    setShowForwardModal(false);
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    // Send to backend
    try {
      await messagingService.sendMessage(
        selectedConversation.id,
        user.uid,
        receiverId,
        messageContent,
        messageType,
        undefined, // fileUrl
        undefined, // fileName
        undefined, // fileSize
        replyToId,
        metadata
      );
      // No need to update UI here; Firestore snapshot will update the real message
    } catch (error) {
      // Optionally, update the optimistic message to show error
      setMessages(prev =>
        prev.map(msg =>
          msg.id === optimisticMessage!.id ? { ...msg, status: 'error' } : msg
        )
      );
    }
  };

  // Start new conversation
  const startNewConversation = async (friend: ConversationParticipant) => {
    if (!user) return;

    try {
      setShowNewConversation(true);
      const conversation = await messagingService.getOrCreateConversation(user.uid, friend.userId);
      setSelectedConversation(conversation);
      setSearchQuery('');
      setViewMode('chat');
      setSelectedTab('chats');
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start conversation');
    }
  };

  // Edit message
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!user) return;

    try {
      await messagingService.editMessage(messageId, user.uid, newContent);
      setEditingMessage(null);
      setEditContent('');
      toast.success('Message updated');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      await messagingService.deleteMessage(messageId, user.uid);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Get conversation participant info
  const getConversationParticipant = (conversation: Conversation) => {
    if (!user) return null;
    const participantId = conversation.participants.find(p => p !== user.uid);
    return availableFriends.find(f => f.userId === participantId);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    // If Firestore Timestamp, convert to JS Date
    const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : timestamp;
    if (!(date instanceof Date)) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get message status icon
  const getMessageStatusIcon = (message: Message) => {
    if (message.senderId !== user?.uid) return null;
    // WhatsApp-like ticks
    switch (message.status) {
      case 'sending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />; // one gray tick
      case 'delivered': {
        // If recipient is online, show two gray ticks, else one gray tick
        const recipientId = message.receiverId;
        const isRecipientOnline = userStatuses?.[recipientId]?.state === 'online';
        if (isRecipientOnline) {
          return <CheckCheck className="w-4 h-4 text-gray-400" />; // two gray ticks
        } else {
          return <Check className="w-4 h-4 text-gray-400" />; // one gray tick
        }
      }
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />; // two blue ticks
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Handle conversation selection
  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setViewMode('chat');
  };

  // Handle back to conversations
  const handleBackToConversations = () => {
    setSelectedConversation(null);
    setViewMode('conversations');
  };

  // Sort conversations
  const getSortedConversations = () => {
    const sorted = [...conversations];
    if (sortOrder === 'recent') {
      return sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } else {
      return sorted.sort((a, b) => {
        const aUnread = a.unreadCount[user?.uid || ''] || 0;
        const bUnread = b.unreadCount[user?.uid || ''] || 0;
        if (bUnread !== aUnread) return bUnread - aUnread;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
    }
  };

  // Build a merged chats list: all friends, with their latest conversation if it exists
  const chatsList = useMemo(() => {
    if (!user?.uid) return [];
    return availableFriends.map(friend => {
      const conversation = findConversationForFriend(conversations, user.uid, friend.userId);
      return {
        friend,
        conversation,
        unreadCount: conversation ? (conversation.unreadCount[user.uid] || 0) : 0
      };
    }).sort((a, b) => {
      // Sort by most recent conversation, or by friend name if no conversation
      if (a.conversation && b.conversation) {
        return b.conversation.updatedAt.getTime() - a.conversation.updatedAt.getTime();
      } else if (a.conversation) {
        return -1;
      } else if (b.conversation) {
        return 1;
      } else {
        return a.friend.fullName.localeCompare(b.friend.fullName);
      }
    });
  }, [availableFriends, conversations, user]);

  // Copy message to clipboard
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  // Get all userIds to subscribe to status
  const allUserIds = useMemo(() => {
    const ids = new Set<string>();
    conversations.forEach(conv => conv.participants.forEach(id => ids.add(id)));
    availableFriends.forEach(f => ids.add(f.userId));
    return Array.from(ids).filter(id => id !== user?.uid);
  }, [conversations, availableFriends, user]);
  const userStatuses = useUserStatuses(allUserIds);

  // Ringtone functions
  const playRingtonePreview = (ringtoneFile: string) => {
    try {
      if (ringtoneAudioEl.current) {
        ringtoneAudioEl.current.pause();
        ringtoneAudioEl.current.currentTime = 0;
      }
      
      // Create a simple beep sound for demo purposes
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      setIsPlayingRingtone(true);
      setTimeout(() => setIsPlayingRingtone(false), 500);
      
      // Ringtone preview playing
    } catch (error) {
      console.error('Error playing ringtone:', error);
      // Could not play ringtone preview
    }
  };

  const stopRingtonePreview = () => {
    setIsPlayingRingtone(false);
  };

  // Apply theme effect
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [settings.theme]);

  // Get available devices when video call starts
  useEffect(() => {
    if (callType === 'video' && callState === 'in-call') {
      getAvailableDevices();
    }
  }, [callType, callState]);

  // Device options for settings modal
  const micOptions = availableDevices.microphones.map(device => ({
    deviceId: device.deviceId,
    label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`
  }));
  const cameraOptions = availableDevices.cameras.map(device => ({
    deviceId: device.deviceId,
    label: device.label || `Camera ${device.deviceId.slice(0, 8)}`
  }));
  const speakerOptions = availableDevices.speakers.map(device => ({
    deviceId: device.deviceId,
    label: device.label || `Speaker ${device.deviceId.slice(0, 8)}`
  }));

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('soundalchemy-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<typeof settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('soundalchemy-settings', JSON.stringify(updatedSettings));
    // Settings updated silently
  };

  // Add call handlers for the modal:
  const handleProfileCall = () => {
    setShowProfileModal(false);
    initiateCall('audio');
  };
  const handleProfileVideoCall = () => {
    setShowProfileModal(false);
    initiateCall('video');
  };

  // Add VideoCallFallback component
  const VideoCallFallback: React.FC<VideoCallFallbackProps> = ({ participant, callState, callDuration }) => {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-dark-800 rounded-lg p-6">
        {/* Profile Image */}
        <div className="relative mb-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary-500 shadow-lg">
            {participant?.profileImagePath ? (
              <img 
                src={getProfileImageUrl(participant)} 
                alt={participant.fullName} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                }}
              />
            ) : (
              <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                <User size={48} className="text-gray-400" />
              </div>
            )}
          </div>
          {participant?.isVerified && (
            <div className="absolute -right-1 -top-1 bg-primary-500 text-white p-1 rounded-full">
              <Check size={16} />
            </div>
          )}
        </div>

        {/* User Info */}
        <h3 className="text-2xl font-bold text-white mb-2">
          {participant?.fullName || 'Unknown User'}
        </h3>
        
        {/* Call Status */}
        <div className="text-gray-400 mb-4">
          {callState === 'calling' ? (
            <span className="text-yellow-500">Calling...</span>
          ) : callState === 'incoming' ? (
            <span className="text-green-500">Incoming Call</span>
          ) : (
            <span>{formatCallDuration(callDuration)}</span>
          )}
        </div>

        {/* User Details */}
        {participant && (
          <div className="text-center text-gray-400 space-y-2">
            <p>{participant.instrumentType}</p>
            <p>{participant.musicCulture}</p>
          </div>
        )}
      </div>
    );
  };

  // Improved professional waiting screen for outgoing video calls
  const VideoCallWaitingScreen: React.FC<{
    participant: any;
    isOnline: boolean;
    callType: 'audio' | 'video';
    onCancel: () => void;
    localUser: any;
  }> = ({ participant, isOnline, callType, onCancel, localUser }) => (
    <div className="flex flex-col items-center justify-center h-full w-full bg-black fade-in rounded-3xl p-10 shadow-2xl relative transition-all duration-500">
      {/* Animated pulse ring and glowing border */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="animate-ping absolute inline-flex h-36 w-36 rounded-full bg-primary-500 opacity-20"></span>
          <span className="absolute inline-flex h-36 w-36 rounded-full border-4 border-primary-500 animate-glow"></span>
        </div>
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary-500 shadow-lg relative z-10">
          {participant?.profileImagePath ? (
            <img
              src={getProfileImageUrl(participant)}
              alt={participant.fullName}
              className="w-full h-full object-cover"
              onError={e => {
                (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
              }}
            />
          ) : (
            <div className="w-full h-full bg-dark-700 flex items-center justify-center">
              <User size={48} className="text-gray-400" />
            </div>
          )}
          {participant?.isVerified && (
            <div className="absolute -right-2 -top-2 bg-primary-500 text-white p-2 rounded-full shadow-lg">
              <Check size={20} />
            </div>
          )}
        </div>
        {/* Your avatar in a small circle */}
        {localUser?.profileImagePath && (
          <div className="absolute -bottom-4 -right-4 w-14 h-14 rounded-full border-2 border-white bg-dark-800 flex items-center justify-center shadow-lg">
            <img
              src={getProfileImageUrl(localUser)}
              alt={localUser.fullName}
              className="w-full h-full object-cover rounded-full"
              onError={e => {
                (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
              }}
            />
          </div>
        )}
      </div>
      {/* Name and status */}
      <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
        {participant?.fullName || 'Unknown User'}
        {participant?.isVerified && <Check className="w-6 h-6 text-primary-400" />}
      </h2>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
        <span className="text-sm text-gray-300 font-medium">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      <div className="text-gray-400 mb-2 text-lg font-semibold">
        {callType === 'video' ? 'Video Call' : 'Audio Call'}
      </div>
      <div className="text-gray-400 mb-4 text-base flex items-center gap-2">
        {isOnline ? (
          <span className="text-yellow-400 animate-typewriter">Ringing, waiting for answer<span className="animate-dots">...</span></span>
        ) : (
          <span className="text-gray-400">Calling, user offline</span>
        )}
      </div>
      {participant?.instrumentType && (
        <div className="text-center text-gray-400 mb-2">
          <p>{participant.instrumentType}</p>
          {participant.musicCulture && <p>{participant.musicCulture}</p>}
        </div>
      )}
      <div className="flex items-center gap-4 mt-8">
        <button
          className="p-5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors shadow-lg"
          onClick={onCancel}
          title="Cancel Call"
        >
          <X className="w-8 h-8" />
        </button>
      </div>
      {/* Animations CSS */}
      <style>{`
        .fade-in { animation: fadeIn 0.7s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-glow {
          box-shadow: 0 0 24px 6px #6366f1, 0 0 48px 12px #6366f1;
          animation: glowPulse 2s infinite alternate;
        }
        @keyframes glowPulse {
          0% { box-shadow: 0 0 24px 6px #6366f1, 0 0 48px 12px #6366f1; }
          100% { box-shadow: 0 0 48px 16px #6366f1, 0 0 64px 24px #6366f1; }
        }
        .animate-typewriter {
          overflow: hidden;
          white-space: nowrap;
          border-right: 2px solid #facc15;
          animation: typing 2s steps(30, end) infinite alternate;
        }
        @keyframes typing {
          from { width: 0; }
          to { width: 18ch; }
        }
        .animate-dots::after {
          content: '';
          display: inline-block;
          width: 1em;
          text-align: left;
          animation: dots 1.2s steps(3, end) infinite;
        }
        @keyframes dots {
          0%, 20% { content: ''; }
          40% { content: '.'; }
          60% { content: '..'; }
          80%, 100% { content: '...'; }
        }
      `}</style>
    </div>
  );

  // Improved incoming call modal
  const IncomingCallModal: React.FC<{
    participant: any;
    isOnline: boolean;
    callType: 'audio' | 'video';
    onAccept: () => void;
    onReject: () => void;
  }> = ({ participant, isOnline, callType, onAccept, onReject }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 fade-in">
      <div className="flex flex-col items-center justify-center w-full max-w-md bg-black rounded-3xl p-8 shadow-2xl relative mx-2 sm:mx-auto">
        {/* Animated pulse ring and glowing border */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-32 w-32 rounded-full bg-primary-500 opacity-20"></span>
            <span className="absolute inline-flex h-32 w-32 rounded-full border-4 border-primary-500 animate-glow"></span>
          </div>
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary-500 shadow-lg relative z-10">
            {participant?.profileImagePath ? (
              <img
                src={getProfileImageUrl(participant)}
                alt={participant.fullName}
                className="w-full h-full object-cover"
                onError={e => {
                  (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                }}
              />
            ) : (
              <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                <User size={40} className="text-gray-400" />
              </div>
            )}
            {participant?.isVerified && (
              <div className="absolute -right-2 -top-2 bg-primary-500 text-white p-2 rounded-full shadow-lg">
                <Check size={18} />
              </div>
            )}
          </div>
        </div>
        {/* Name and status */}
        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2 text-center">
          {participant?.fullName || 'Unknown User'}
          {participant?.isVerified && <Check className="w-5 h-5 text-primary-400" />}
        </h2>
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
          <span className="text-sm text-gray-300 font-medium">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="text-gray-400 mb-2 text-lg font-semibold">
          {callType === 'video' ? 'Video Call' : 'Audio Call'}
        </div>
        <div className="text-primary-400 mb-4 text-base animate-typewriter">
          Incoming {callType === 'video' ? 'Video' : 'Audio'} Call
        </div>
        {participant?.instrumentType && (
          <div className="text-center text-gray-400 mb-2">
            <p>{participant.instrumentType}</p>
            {participant.musicCulture && <p>{participant.musicCulture}</p>}
          </div>
        )}
        <div className="flex items-center gap-8 mt-8 w-full justify-center">
          <button
            className="p-5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors shadow-lg"
            onClick={onReject}
            title="Reject Call"
          >
            <X className="w-8 h-8" />
          </button>
          <button
            className="p-5 bg-green-500 rounded-full text-white hover:bg-green-600 transition-colors shadow-lg"
            onClick={onAccept}
            title="Accept Call"
          >
            <Phone className="w-8 h-8" />
          </button>
        </div>
        {/* Animations CSS */}
        <style>{`
          .fade-in { animation: fadeIn 0.7s; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-glow {
            box-shadow: 0 0 24px 6px #6366f1, 0 0 48px 12px #6366f1;
            animation: glowPulse 2s infinite alternate;
          }
          @keyframes glowPulse {
            0% { box-shadow: 0 0 24px 6px #6366f1, 0 0 48px 12px #6366f1; }
            100% { box-shadow: 0 0 48px 16px #6366f1, 0 0 64px 24px #6366f1; }
          }
          .animate-typewriter {
            overflow: hidden;
            white-space: nowrap;
            border-right: 2px solid #facc15;
            animation: typing 2s steps(30, end) infinite alternate;
          }
          @keyframes typing {
            from { width: 0; }
            to { width: 18ch; }
          }
        `}</style>
      </div>
    </div>
  );

  // --- Add state for voice recording, file/image upload ---
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordingStart, setRecordingStart] = useState<number | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- Voice Recording Handlers ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      let chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedAudio(blob);
        setAudioPreview(URL.createObjectURL(blob));
        setPendingAudioBlob(blob);
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };
      setRecorder(mediaRecorder);
      setIsRecording(true);
      setRecordingStart(Date.now());
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - (recordingStart || Date.now())) / 1000));
      }, 1000);
      mediaRecorder.start();
      
      // Show recording started toast
      toast.success('Recording started...');
    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      recorder.stream.getTracks().forEach(track => track.stop());
      setRecorder(null);
    }
    setIsRecording(false);
    setRecordingStart(null);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const cancelRecording = () => {
    if (recorder) {
      recorder.stop();
      recorder.stream.getTracks().forEach(track => track.stop());
      setRecorder(null);
    }
    setIsRecording(false);
    setRecordedAudio(null);
    setAudioPreview(null);
    setPendingAudioBlob(null);
    setRecordingStart(null);
    setRecordingTime(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const sendVoiceMessage = async () => {
    if (!recordedAudio || !selectedConversation || !user) return;
    const receiverId = selectedConversation.participants.find(p => p !== user.uid);
    if (!receiverId) return;
    
    // Check minimum recording duration (1 second like WhatsApp)
    if (recordingTime < 1) {
      toast.error('Recording too short. Please record for at least 1 second.');
      return;
    }
    
    try {
      // Show loading toast
      const loadingToast = toast.loading('Sending voice message...');
      
      // Upload audio to backend
      const fileUrl = await uploadFile(recordedAudio, `audio_${Date.now()}.webm`, 'audio');
      await messagingService.sendMessage(
        selectedConversation.id,
        user.uid,
        receiverId,
        '',
        'audio',
        fileUrl,
        `audio_${Date.now()}.webm`,
        recordedAudio.size,
        undefined,
        undefined
      );
      
      setRecordedAudio(null);
      setAudioPreview(null);
      setPendingAudioBlob(null);
      
      toast.dismiss(loadingToast);
      toast.success('Voice message sent successfully');
    } catch (err) {
      console.error('Error sending voice message:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send voice message');
    }
  };

  // --- File/Image Upload Handlers ---
  const handleFileInput = () => fileInputRef.current?.click();
  const handleImageInput = () => imageInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !user) return;
    const receiverId = selectedConversation.participants.find(p => p !== user.uid);
    if (!receiverId) return;
    
    // Check file size (100MB limit like WhatsApp)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 100MB');
      e.target.value = '';
      return;
    }
    
    try {
      // Determine file type
      let messageType: Message['type'] = 'file';
      let typeOverride: 'photo' | 'file' | 'audio' = 'file';
      
      if (file.type.startsWith('image/')) {
        messageType = 'image';
        typeOverride = 'photo';
      } else if (file.type.startsWith('video/')) {
        messageType = 'video';
        typeOverride = 'file';
      } else if (file.type.startsWith('audio/')) {
        messageType = 'audio';
        typeOverride = 'audio';
      }
      
      // Show loading toast
      const loadingToast = toast.loading(`Uploading ${file.name}...`);
      
      const fileUrl = await uploadFile(file, file.name, typeOverride);
      
      await messagingService.sendMessage(
        selectedConversation.id,
        user.uid,
        receiverId,
        file.name,
        messageType,
        fileUrl,
        file.name,
        file.size,
        undefined,
        undefined
      );
      
      toast.dismiss(loadingToast);
      toast.success(`${file.name} sent successfully`);
    } catch (err) {
      console.error('Error sending file:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send file');
    }
    e.target.value = '';
  };

  // --- Photo preview before sending ---
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !user) return;
    // Show preview before sending
    setPhotoPreview(URL.createObjectURL(file));
    setPendingPhotoFile(file);
    e.target.value = '';
  };

  // Confirm send photo
  const handleSendPhoto = async () => {
    if (!pendingPhotoFile || !selectedConversation || !user) return;
    const receiverId = selectedConversation.participants.find(p => p !== user.uid);
    if (!receiverId) return;
    try {
      const fileUrl = await uploadFile(pendingPhotoFile, pendingPhotoFile.name, 'photo');
      await messagingService.sendMessage(
        selectedConversation.id,
        user.uid,
        receiverId,
        '',
        'image',
        fileUrl,
        pendingPhotoFile.name,
        pendingPhotoFile.size,
        undefined,
        undefined
      );
      setPhotoPreview(null);
      setPendingPhotoFile(null);
    } catch (err) {
      console.error('Error sending image:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send image');
    }
  };

  // Cancel photo preview
  const handleCancelPhoto = () => {
    setPhotoPreview(null);
    setPendingPhotoFile(null);
  };

  // --- Upload Helper (replace with your backend logic) ---
  const API_URL = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001'  // Local server.js
    : 'https://sound-alchemy-backend1.vercel.app';  // Production URL

  // Helper function to ensure proper Google Drive URL format
  const getImageUrl = (url: string | undefined) => {
    if (!url) return '';
    // Google Drive webContentLink or webViewLink
    if (url.includes('drive.google.com')) {
      // Try to extract file id
      const match = url.match(/(?:id=|file\/d\/)([\w-]+)/);
      const fileId = match ? match[1] : null;
      if (fileId) {
        // Use CORS proxy for preview and cache busting
        return `https://images.weserv.nl/?url=drive.google.com/uc?export=view%26id=${fileId}&t=${Date.now()}`;
      }
      // fallback: use as is
      return url;
    }
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };
  async function uploadFile(file: Blob, fileName: string, typeOverride?: 'photo' | 'file' | 'audio'): Promise<string> {
    if (!selectedConversation || !user) throw new Error('No conversation or user');
    const conversationId = selectedConversation.id;
    // Determine type by file or override
    let type: 'photo' | 'file' | 'audio' = 'file';
    if (typeOverride) {
      type = typeOverride;
    } else if (file.type.startsWith('image/')) {
      type = 'photo';
    } else if (file.type.startsWith('audio/')) {
      type = 'audio';
    }
    
    console.log('Uploading file:', { fileName, type, conversationId, fileSize: file.size });
    
    const formData = new FormData();
    formData.append('file', file, fileName);
    formData.append('conversationId', conversationId);
    formData.append('type', type);
    formData.append('userId', user.uid);
    
    try {
      // The backend should save to /uploads/messages/{conversationId}/{type}/
      const res = await fetch(`${API_URL}/api/upload-message-file`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('Upload response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Upload failed:', { status: res.status, error: errorText });
        throw new Error(`File upload failed: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Upload response data:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }
      
      // Expect backend to return { url: '/uploads/messages/{conversationId}/{type}/filename' }
      const fileUrl = data.url.startsWith('http') ? data.url : `${API_URL}${data.url}`;
      console.log('Final file URL:', fileUrl);
      return fileUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // --- Voice preview before sending ---
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);

  // Confirm send audio
  const handleSendAudio = async () => {
    if (!pendingAudioBlob || !selectedConversation || !user) return;
    const receiverId = selectedConversation.participants.find(p => p !== user.uid);
    if (!receiverId) return;
    try {
      const fileUrl = await uploadFile(pendingAudioBlob, `audio_${Date.now()}.webm`, 'audio');
      await messagingService.sendMessage(
        selectedConversation.id,
        user.uid,
        receiverId,
        '',
        'audio',
        fileUrl,
        `audio_${Date.now()}.webm`,
        pendingAudioBlob.size,
        undefined,
        undefined
      );
      setAudioPreview(null);
      setPendingAudioBlob(null);
      setRecordedAudio(null);
    } catch (err) {
      console.error('Error sending audio:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send voice message');
    }
  };

  // Cancel audio preview
  const handleCancelAudio = () => {
    setAudioPreview(null);
    setPendingAudioBlob(null);
    setRecordedAudio(null);
  };

  // Enhanced select styles for dark theme and portal
  const enhancedSelectStyles = {
    control: (base: Record<string, any>, state: { isFocused: boolean }) => ({
      ...base,
      backgroundColor: '#1a1a1a',
      borderColor: state.isFocused ? '#3b82f6' : '#374151',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
      borderRadius: '0.75rem',
      padding: '2px',
      transition: 'all 200ms ease',
      minHeight: 36,
      '&:hover': {
        borderColor: state.isFocused ? '#3b82f6' : '#4b5563',
      },
    }),
    menu: (base: Record<string, any>) => ({
      ...base,
      backgroundColor: '#1a1a1a',
      border: '1px solid #374151',
      borderRadius: '0.75rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      overflow: 'hidden',
      zIndex: 9999,
    }),
    menuPortal: (base: Record<string, any>) => ({ ...base, zIndex: 9999 }),
    option: (base: Record<string, any>, state: { isSelected: boolean; isFocused: boolean }) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? '#3b82f6' 
        : state.isFocused 
          ? 'rgba(59, 130, 246, 0.1)' 
          : 'transparent',
      color: state.isSelected ? 'white' : '#e5e7eb',
      padding: '10px 12px',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      transition: 'all 150ms ease',
      fontSize: '0.9375rem',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      '&:active': {
        backgroundColor: '#3b82f6',
      },
    }),
    input: (base: Record<string, any>) => ({
      ...base,
      color: '#e5e7eb',
    }),
    singleValue: (base: Record<string, any>) => ({
      ...base,
      color: '#e5e7eb',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }),
    placeholder: (base: Record<string, any>) => ({
      ...base,
      color: '#6b7280',
    }),
  };

  // WhatsApp-like attachment popover state
  const [showAttachmentPopover, setShowAttachmentPopover] = useState<boolean>(false);

  // Add this near the top-level of the component
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Add this useEffect to close the menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false);
      }
    }
    if (showHeaderMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHeaderMenu]);

  const [adminUserIds, setAdminUserIds] = useState<string[]>([]);
  const [selectedMainTab, setSelectedMainTab] = useState<'chats' | 'admin'>('chats');
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [showAdminNotification, setShowAdminNotification] = useState(false);

  // Fetch admin user IDs on mount
  useEffect(() => {
    const fetchAdmins = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'admin'));
      const snapshot = await getDocs(q);
      setAdminUserIds(snapshot.docs.map(doc => doc.id));
    };
    fetchAdmins();
  }, []);

  // Subscribe to admin message notifications
  useEffect(() => {
    if (!user?.uid || adminUserIds.length === 0) return;

    const unsubscribes: (() => void)[] = [];
    
    adminUserIds.forEach(adminId => {
      const messagesRef = collection(db, 'adminMessages');
      const q = query(
        messagesRef,
        where('senderId', '==', adminId),
        where('receiverId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        where('timestamp', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const message = { id: change.doc.id, ...change.doc.data() };
            setAdminNotifications(prev => [message, ...prev.slice(0, 4)]); // Keep last 5 notifications
            setShowAdminNotification(true);
            
            // Auto-hide notification after 10 seconds
            setTimeout(() => {
              setShowAdminNotification(false);
            }, 10000);
          }
        });
      });
      
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user?.uid, adminUserIds]);

  // Filter conversations
  const adminConversations = useMemo(() =>
    conversations.filter(conv => conv.participants.some(pid => adminUserIds.includes(pid))),
    [conversations, adminUserIds]
  );
  const userConversations = useMemo(() =>
    conversations.filter(conv => !conv.participants.some(pid => adminUserIds.includes(pid))),
    [conversations, adminUserIds]
  );

  // Count unread admin messages
  const unreadAdminCount = useMemo(() =>
    adminConversations.reduce((acc, conv) => acc + (conv.unreadCount?.[user?.uid || ''] || 0), 0),
    [adminConversations, user]
  );

  // Add admin notification component
  const AdminNotificationBanner = () => {
    if (!showAdminNotification || adminNotifications.length === 0) return null;

    const latestNotification = adminNotifications[0];
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 left-4 right-4 z-50 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-lg border border-primary-400"
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Bell size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">New Admin Message</h3>
                <p className="text-white/80 text-sm truncate max-w-xs">
                  {latestNotification.content}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSelectedMainTab('admin');
                  setShowAdminNotification(false);
                }}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors"
              >
                View
              </button>
              <button
                onClick={() => setShowAdminNotification(false)}
                className="p-1 text-white/80 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // --- Admin Chat State ---
  // Add AdminMessage type for admin chat
  interface AdminMessage {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: any;
    type?: string;
    status?: string;
    readBy?: string[];
    participants?: string | string[];
  }
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [selectedAdminType, setSelectedAdminType] = useState<string | null>(null);
  const [adminChatLoading, setAdminChatLoading] = useState(false);

  // --- Admin Message Type Meta (icon, color, label) ---
  const adminTypeMeta: Record<string, { icon: JSX.Element; color: string; label: string }> = {
    general:   { icon: <Info size={20} />, color: 'text-blue-400', label: 'General' },
    important: { icon: <AlertCircle size={20} />, color: 'text-red-500', label: 'Important' },
    update:    { icon: <Bell size={20} />, color: 'text-yellow-400', label: 'Update' },
    warning:   { icon: <AlertCircle size={20} />, color: 'text-yellow-500', label: 'Warning' },
  };

  // Group admin messages by type
  const adminMessagesByType = useMemo(() => {
    const groups: Record<string, AdminMessage[]> = {};
    adminMessages.forEach(msg => {
      const type = msg.type || 'general';
      if (!groups[type]) groups[type] = [];
      groups[type].push(msg);
    });
    return groups;
  }, [adminMessages]);

  const [newAdminMessage, setNewAdminMessage] = useState('');
  const [sendingAdminMessage, setSendingAdminMessage] = useState(false);

  // Add state for context menu position
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Add state for which message's action menu is open and its position
  const [actionMenu, setActionMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  // Handler to open the action menu (right-click or long-press)
  const openActionMenu = (e: React.MouseEvent | React.TouchEvent, messageId: string) => {
    e.preventDefault();
    let x = 0, y = 0;
    if ('touches' in e && e.touches.length > 0) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else if ('clientX' in e) {
      x = e.clientX;
      y = e.clientY;
    }
    setActionMenu({ id: messageId, x, y });
  };

  // Handler to close the action menu
  const closeActionMenu = () => setActionMenu(null);

  // Click outside to close
  useEffect(() => {
    if (!actionMenu) return;
    const handler = (e: MouseEvent) => {
      closeActionMenu();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [actionMenu]);

  // Subscribe to all admin messages for this user
  useEffect(() => {
    if (selectedTab !== 'admin' || !user?.uid) return;
    setAdminChatLoading(true);
    const q = query(
      collection(db, 'adminMessages'),
      where('receiverId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminMessage[];
      setAdminMessages(msgs);
      setAdminChatLoading(false);
    });
    return () => unsub();
  }, [selectedTab, user?.uid]);

  // --- Admin Message Section: Highly Responsive Mobile Collapsible Sections ---
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Open all sections by default when adminMessagesByType changes
  useEffect(() => {
    setOpenSections(prev => {
      const newState = { ...prev };
      Object.keys(adminMessagesByType).forEach(type => {
        if (!(type in newState)) newState[type] = true;
      });
      return newState;
    });
  }, [adminMessagesByType]);

  const toggleSection = (type: string) => {
    setOpenSections(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <Draggable handle=".messenger-header" disabled={window.innerWidth < 768}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        style={{ pointerEvents: 'auto' }}
      >
        <>
          {/* Admin Notification Banner */}
          <AdminNotificationBanner />
          
          <div className="bg-dark-900 rounded-2xl shadow-2xl w-full h-full max-w-6xl max-h-[80vh] md:h-[80vh] flex overflow-hidden mx-1 md:mx-0">
            {/* Conversations Sidebar */}
            <div className={`w-full md:w-80 bg-dark-800 border-r border-dark-700 flex flex-col ${viewMode === 'chat' ? 'hidden md:flex' : 'flex'}`}>
              {/* Header */}
              <div className="p-3 md:p-4 border-b border-dark-700 messenger-header cursor-move flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Messages</span>
                  <span className="sm:hidden">Chat</span>
                </h2>
                <div className="flex items-center gap-1 md:gap-2">
                  {/* Settings Icon */}
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button
                    onClick={() => setShowNewConversation(true)}
                    className="p-2 bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
                    title="New Message"
                  >
                    <Edit3 className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>

              {/* Search and Sort */}
              <div className="p-3 md:p-4 border-b border-dark-700">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 text-sm md:text-base"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSortOrder(sortOrder === 'recent' ? 'unread' : 'recent')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-dark-700 rounded hover:bg-dark-600 transition-colors"
                  >
                    {sortOrder === 'recent' ? 'Recent' : 'Unread'}
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-dark-700">
                <button
                  onClick={() => setSelectedTab('chats')}
                  className={`flex-1 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors ${
                    selectedTab === 'chats'
                      ? 'text-primary-400 border-b-2 border-primary-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">Chats</span>
                  <span className="sm:hidden">Chats</span>
                  <span className="ml-1">({conversations.length})</span>
                </button>
                <button
                  onClick={() => setSelectedTab('friends')}
                  className={`flex-1 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors ${
                    selectedTab === 'friends'
                      ? 'text-primary-400 border-b-2 border-primary-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">Friends</span>
                  <span className="sm:hidden">Friends</span>
                  <span className="ml-1">({availableFriends.length})</span>
                </button>
                <button
                  onClick={() => setSelectedTab('admin')}
                  className={`flex-1 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors ${
                    selectedTab === 'admin'
                      ? 'text-primary-400 border-b-2 border-primary-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Admin
                  {adminMessages.some(m => m.receiverId === user?.uid && m.status !== 'read') && (
                    <span className="ml-1 inline-block bg-red-500 text-white rounded-full px-2 text-xs align-middle">●</span>
                  )}
                </button>
              </div>

              {/* Call History Sidebar Icon */}
              <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b border-dark-700">
                <button
                  onClick={() => setShowCallHistory(true)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700 transition-colors text-primary-400 w-full justify-center"
                  title="Call History"
                >
                  <Phone className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm font-medium">Call History</span>
                </button>
              </div>

              {/* Content (Chats/Friends) */}
              <div className="flex-1 overflow-y-auto">
                {selectedTab === 'chats' ? (
                  // Conversations List
                  <div className="space-y-1">
                    {chatsList.length === 0 ? (
                      <div className="text-center py-6 md:py-8 px-4">
                        <MessageCircle className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm md:text-base">No musicians yet</p>
                        <p className="text-xs md:text-sm text-gray-500">Add friends to start messaging</p>
                      </div>
                    ) : (
                      chatsList
                        .filter(entry => entry.friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(({ friend, conversation, unreadCount }) => (
                          <div
                            key={friend.userId}
                            className="relative group"
                          >
                            <div
                              onClick={() => {
                                if (conversation) {
                                  handleConversationSelect(conversation);
                                } else {
                                  // Start a new conversation with this friend
                                  startNewConversation(friend);
                                }
                              }}
                              className={`flex items-center gap-2 md:gap-3 p-3 md:p-4 cursor-pointer transition-colors ${
                                selectedConversation?.participants?.includes(friend.userId)
                                  ? 'bg-primary-500/20 border-r-2 border-primary-500'
                                  : 'hover:bg-dark-700'
                              }`}
                            >
                              <div className="relative flex-shrink-0">
                                <img
                                  src={getProfileImageUrl(friend || { profileImagePath: undefined })}
                                  alt={friend.fullName}
                                  className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                                  onError={e => {
                                    (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                                  }}
                                />
                                {/* Status dot */}
                                <span
                                  className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border-2 border-dark-800 ${
                                    userStatuses?.[friend.userId]?.state === 'online'
                                      ? 'bg-green-500'
                                      : userStatuses?.[friend.userId]?.state === 'away'
                                      ? 'bg-yellow-400'
                                      : 'bg-gray-400'
                                  }`}
                                  title={userStatuses?.[friend.userId]?.state || 'offline'}
                                />
                                {friend.isVerified && (
                                  <div className="absolute -bottom-1 -left-1 bg-green-500 rounded-full p-0.5">
                                    <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-white truncate text-sm md:text-base">
                                    {friend.fullName}
                                  </p>
                                  {conversation && conversation.lastMessage && (
                                    <span className="text-xs text-gray-400 ml-2">
                                      {conversation.lastMessage && conversation.lastMessage.timestamp
                                        ? formatTimestamp(conversation.lastMessage.timestamp)
                                        : ''}
                                    </span>
                                  )}
                                </div>
                                {/* Professional last message preview */}
                                <p className="text-xs md:text-sm text-gray-300 truncate flex items-center gap-1">
                                  {conversation?.lastMessage ? (
                                    <>
                                      {/* Icon for message type */}
                                      {conversation.lastMessage.type === 'image' && <span title="Image" className="mr-1">📷</span>}
                                      {conversation.lastMessage.type === 'audio' && <span title="Audio" className="mr-1">🎤</span>}
                                      {conversation.lastMessage.type === 'video' && <span title="Video" className="mr-1">🎬</span>}
                                      {conversation.lastMessage.type === 'sticker' && <span title="Sticker" className="mr-1">🌟</span>}
                                      {conversation.lastMessage.type === 'file' && <span title="File" className="mr-1">📎</span>}
                                      {/* Only show sender name in preview if group chat and not from user */}
                                      {conversation.participants.length > 2 && conversation.lastMessage.senderId !== user?.uid && (
                                        <span className="font-semibold text-primary-400 mr-1">{availableFriends.find(f => f.userId === conversation.lastMessage.senderId)?.fullName || 'Unknown'}:</span>
                                      )}
                                      {/* Message content, truncated like WhatsApp */}
                                      <span>
                                        {(() => {
                                          let content = '';
                                          if (conversation.lastMessage.type === 'text') content = conversation.lastMessage.content;
                                          if (conversation.lastMessage.type === 'image') content = 'Photo';
                                          if (conversation.lastMessage.type === 'audio') content = 'Voice message';
                                          if (conversation.lastMessage.type === 'video') content = 'Video';
                                          if (conversation.lastMessage.type === 'sticker') content = 'Sticker';
                                          if (conversation.lastMessage.type === 'file') content = 'File';
                                          // Truncate to 40 chars like WhatsApp
                                          return content.length > 40 ? content.slice(0, 40) + '…' : content;
                                        })()}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="italic text-gray-500">No messages yet</span>
                                  )}
                                </p>
                              </div>
                              {unreadCount > 0 && (
                                <div className="bg-primary-500 text-white text-xs rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0">
                                  {unreadCount > 9 ? '9+' : unreadCount}
                                </div>
                              )}
                            </div>
                            {/* Conversation Menu ... */}

                            {/* Conversation Menu Dropdown */}
                            <AnimatePresence>
                              {conversation?.id && showConversationMenu === conversation.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute right-0 top-full mt-1 bg-dark-700 rounded-lg shadow-lg border border-dark-600 z-10 min-w-[150px]"
                                >
                                  <button className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-dark-600 flex items-center gap-2">
                                    <Pin className="w-4 h-4" />
                                    Pin Chat
                                  </button>
                                  <button className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-dark-600 flex items-center gap-2">
                                    <Archive className="w-4 h-4" />
                                    Archive
                                  </button>
                                  <hr className="border-dark-600" />
                                  <button className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-dark-600 flex items-center gap-2">
                                    <FaTrash size={16} />
                                    Delete
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))
                    )}
                  </div>
                ) : selectedTab === 'friends' ? (
                  // Friends List
                  <div className="space-y-1">
                    {availableFriends.length === 0 ? (
                      <div className="text-center py-6 md:py-8 px-4">
                        <Users className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm md:text-base">No friends found</p>
                        <p className="text-xs md:text-sm text-gray-500">Add friends to start messaging</p>
                      </div>
                    ) : (
                      availableFriends
                        .filter(f => f.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((friend) => (
                          <div
                            key={friend.userId}
                            onClick={() => startNewConversation(friend)}
                            className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg hover:bg-dark-700 cursor-pointer transition-colors"
                          >
                            <div className="relative flex-shrink-0">
                              <img
                                src={getProfileImageUrl(friend || { profileImagePath: undefined })}
                                alt={friend.fullName}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                                onError={e => {
                                  (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                                }}
                              />
                              {friend.isVerified && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                                  <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                                </div>
                              )}
                              {friend.status === 'online' && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate text-sm md:text-base">{friend.fullName}</p>
                              <p className="text-xs md:text-sm text-gray-400 truncate">
                                {friend.instrumentType} • {friend.musicCulture}
                              </p>
                            </div>
                            <button className="p-2 bg-primary-500 rounded-full hover:bg-primary-600 transition-colors flex-shrink-0">
                              <MessageCircle className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                ) : (
                  // Admin Messages List - Professional WhatsApp Style
                  <div className="flex-1 flex flex-col bg-dark-900">
                    {/* Logged-in user info at top */}
                    <div className="p-4 border-b border-dark-700 flex items-center gap-3 bg-dark-900">
                      <div className="h-10 w-10 rounded-full bg-dark-600 overflow-hidden flex-shrink-0">
                        <img src={user?.photoURL || '/default-avatar.svg'} alt={user?.displayName || 'User'} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white text-sm">{user?.displayName || 'Admin'}</span>
                        <span className="text-xs text-gray-400">{user?.email}</span>
                      </div>
                    </div>
                    
                    {adminChatLoading ? (
                      <div className="flex-1 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
                          <p className="text-sm">Loading admin messages...</p>
                        </div>
                      </div>
                    ) : adminMessages.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                          <p className="text-sm">No admin messages yet</p>
                          <p className="text-xs text-gray-500 mt-1">Messages from SoundAlchemy Team will appear here</p>
                        </div>
                      </div>
                    ) : (
                      // List of message types as conversations
                      <div className="flex-1 overflow-y-auto divide-y divide-dark-800">
                        {Object.entries(adminMessagesByType).map(([type, msgs]) => {
                          const lastMsg = msgs[msgs.length - 1];
                          const unreadCount = msgs.filter(m => !m.readBy?.includes(user?.uid || '')).length;
                          return (
                            <div
                              key={type}
                              className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${selectedAdminType === type ? 'bg-primary-600/20' : 'hover:bg-dark-800'}`}
                              onClick={() => setSelectedAdminType(type)}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-white text-sm capitalize">{type}</span>
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-primary-700 text-white capitalize">{type}</span>
                                  {unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                                      {unreadCount}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 truncate max-w-xs">
                                  {lastMsg?.content || 'No messages in this category'}
                                </div>
                              </div>
                              <div className="flex flex-col items-end ml-2">
                                <span className="text-xs md:text-sm opacity-70">
                                  {formatTimestamp(lastMsg?.timestamp?.toDate?.() || new Date())}
                                </span>
                                {unreadCount > 0 && (
                                  <span className="mt-1 w-2 h-2 rounded-full bg-primary-500"></span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedTab === 'admin' && selectedAdminType ? (
                // Admin Chat Interface
                <div className="flex-1 flex flex-col bg-dark-800 rounded-lg overflow-hidden">
                  {/* Chat header */}
                  <div className="p-4 border-b border-dark-700 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedAdminType(null)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="h-10 w-10 rounded-full bg-dark-600 overflow-hidden flex-shrink-0">
                      <img src="/soundalchemy-logo-funny.svg" alt="SoundAlchemy Team" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-white text-sm">SoundAlchemy Team</span>
                      <span className="text-xs text-gray-400 capitalize">{selectedAdminType} Messages</span>
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {adminMessagesByType[selectedAdminType]?.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500 text-sm opacity-70">
                        No messages yet in this category.
                      </div>
                    ) : (
                      adminMessagesByType[selectedAdminType].map((message) => (
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
                                {selectedAdminType.charAt(0).toUpperCase() + selectedAdminType.slice(1)}
                              </span>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs opacity-70">
                                  {formatTimestamp(message.timestamp)}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm font-semibold">
                              {message.senderId === user?.uid ? 'You' : 'SoundAlchemy Team'}
                            </p>
                            <p className="text-sm">{message.content}</p>
                            {/* After message content, before timestamp/status in the message bubble: */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="red">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M10 16l4-4-4-4" stroke="white" strokeWidth="2" fill="none"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Admin Chat Input Bar */}
                  <div className="p-4 border-t border-dark-700 bg-dark-800">
                    <form
                      className="flex items-center gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!user || !newAdminMessage.trim()) return;
                        setSendingAdminMessage(true);
                        // Find the adminId for this thread (use the senderId from the last admin message in this type)
                        const msgs = adminMessagesByType[selectedAdminType] || [];
                        const lastAdminMsg = msgs.find(m => m.senderId !== user.uid);
                        const adminId = lastAdminMsg ? lastAdminMsg.senderId : (adminUserIds[0] || 'admin');
                        const participantsKey = [adminId, user.uid].sort().join('_');
                        await addDoc(collection(db, 'adminMessages'), {
                          senderId: user.uid,
                          receiverId: adminId,
                          content: newAdminMessage.trim(),
                          type: selectedAdminType,
                          participants: participantsKey,
                          timestamp: serverTimestamp(),
                          status: 'sent',
                          readBy: [user.uid],
                        });
                        setNewAdminMessage('');
                        setSendingAdminMessage(false);
                      }}
                    >
                      <input
                        type="text"
                        className="flex-1 px-4 py-2 bg-dark-700 border border-dark-600 rounded-full text-white"
                        placeholder={`Reply to ${selectedAdminType}...`}
                        value={newAdminMessage}
                        onChange={e => setNewAdminMessage(e.target.value)}
                        disabled={sendingAdminMessage}
                      />
                      <button
                        type="submit"
                        className="p-2 bg-primary-500 rounded-full text-white hover:bg-primary-600 transition-colors"
                        disabled={sendingAdminMessage || !newAdminMessage.trim()}
                      >
                        <Send size={18} />
                      </button>
                    </form>
                  </div>
                </div>
              ) : selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 md:p-4 border-b border-dark-700 bg-dark-800">
                    <div className="flex items-center justify-between">
                      {/* Mobile back button */}
                      <button
                        onClick={handleBackToConversations}
                        className="md:hidden p-2 text-gray-400 hover:text-white transition-colors mr-2"
                        title="Back to conversations"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setShowProfileModal(true)}>
                        <div className="relative flex-shrink-0">
                          <img
                            src={getProfileImageUrl(getConversationParticipant(selectedConversation) || { profileImagePath: undefined })}
                            alt={getConversationParticipant(selectedConversation)?.fullName || 'Unknown'}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover"
                            onError={e => {
                              (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                            }}
                          />
                          {/* Status dot and verified badge as before */}
                          <span
                            className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border-2 border-dark-800 ${
                              userStatuses?.[getConversationParticipant(selectedConversation)?.userId || '']?.state === 'online'
                                ? 'bg-green-500'
                                : userStatuses?.[getConversationParticipant(selectedConversation)?.userId || '']?.state === 'away'
                                ? 'bg-yellow-400'
                                : 'bg-gray-400'
                            }`}
                            title={userStatuses?.[getConversationParticipant(selectedConversation)?.userId || '']?.state || 'offline'}
                          />
                          {getConversationParticipant(selectedConversation)?.isVerified && (
                            <div className="absolute -bottom-1 -left-1 bg-green-500 rounded-full p-0.5">
                              <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white text-sm md:text-base truncate">
                            {getConversationParticipant(selectedConversation)?.fullName || 'Unknown Musician'}
                          </h3>
                          <p className="text-xs md:text-sm text-gray-400 truncate">
                            {userStatuses?.[getConversationParticipant(selectedConversation)?.userId || '']?.state === 'online'
                              ? 'Online'
                              : userStatuses?.[getConversationParticipant(selectedConversation)?.userId || '']?.state === 'away'
                              ? 'Away'
                              : userStatuses?.[getConversationParticipant(selectedConversation)?.userId || '']?.last_changed
                              ? `Last seen: ${userStatuses?.[getConversationParticipant(selectedConversation)?.userId || '']?.last_changed ? new Date(userStatuses[getConversationParticipant(selectedConversation)?.userId || '']?.last_changed ?? Date.now()).toLocaleString() : ''}`
                              : 'Offline'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2">
                        {/* Removed Call History open icon from chat header */}
                        <button
                          onClick={() => initiateCall('audio')}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title="Voice Call"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => initiateCall('video')}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title="Video Call"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                        <div className="relative">
                          <button
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                            onClick={() => setShowHeaderMenu((v) => !v)}
                            title="More Options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {showHeaderMenu && (
                            <div
                              ref={headerMenuRef}
                              className="absolute right-0 mt-2 w-44 bg-dark-800 border border-dark-700 rounded-lg shadow-lg z-50 py-2"
                              style={{ minWidth: 160 }}
                            >
                              <button
                                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-dark-700"
                                onClick={() => { setShowHeaderMenu(false); /* TODO: View Contact logic */ }}
                              >
                                View Contact
                              </button>
                              <button
                                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-dark-700"
                                onClick={() => { setShowHeaderMenu(false); /* TODO: Mute logic */ }}
                              >
                                Mute Notifications
                              </button>
                              <button
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-dark-700"
                                onClick={() => { setShowHeaderMenu(false); /* TODO: Delete chat logic */ }}
                              >
                                Delete Chat
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-6 py-2 sm:py-4 pb-20 pb-[env(safe-area-inset-bottom)] space-y-1">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex w-full ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'} py-1`}
                        onContextMenu={e => openActionMenu(e, message.id)}
                        onTouchStart={e => openActionMenu(e, message.id)}
                      >
                        <div
                          className={`max-w-[80vw] sm:max-w-[60%] px-4 py-3 my-1 mx-2 shadow-md text-base sm:text-lg break-words transition-all duration-200
                            ${message.senderId === user?.uid
                              ? 'bg-primary-500 text-white rounded-2xl rounded-br-md sm:rounded-br-2xl self-end'
                              : 'bg-dark-800 text-gray-200 rounded-2xl rounded-bl-md sm:rounded-bl-2xl self-start'}
                            ${message.type === 'text' ? '' : 'flex flex-col items-center justify-center'}
                          `}
                          style={{ wordBreak: 'break-word', fontSize: 'clamp(1rem, 2vw, 1.15rem)', position: 'relative' }}
                        >
                          {/* Reply indicator */}
                          {message.replyTo && (
                            <div className="mb-1 px-2 py-1 rounded bg-primary-50 dark:bg-dark-700 border-l-4 border-primary-400 flex items-center gap-2">
                              <FaReply size={20} color="red" style={{ marginRight: 4 }} />
                              <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                                {message.senderId === user?.uid ? 'You' : availableFriends.find(f => f.userId === message.senderId)?.fullName || 'Unknown'}
                              </span>
                              {message.type === 'image' ? (
                                <img src={getImageUrl(message.fileUrl)} alt="reply-img" className="w-6 h-6 rounded object-cover" />
                              ) : (
                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{message.content}</span>
                              )}
                            </div>
                          )}

                          {/* Forward indicator */}
                          {message.forwardedFrom && (
                            <div className="mb-1 text-xs text-gray-400 bg-dark-700 px-2 py-1 rounded">
                              <div className="flex items-center gap-1">
                                <Forward className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                <span className="truncate">Forwarded from {message.forwardedFrom.senderName}</span>
                              </div>
                            </div>
                          )}
                          
                          {editingMessage === message.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full bg-transparent border-none outline-none text-inherit"
                                  autoFocus
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditMessage(message.id, editContent)}
                                    className="text-xs bg-white/20 px-2 py-1 rounded"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingMessage(null);
                                      setEditContent('');
                                    }}
                                    className="text-xs bg-white/20 px-2 py-1 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {/* Message content based on type */}
                                {message.type === 'text' && (
                                  <p className="text-sm md:text-base whitespace-pre-wrap break-words" style={{ fontFamily: 'inherit' }}>{message.content}</p>
                                )}
                                
                                {message.type === 'image' && (
                                  <div className="space-y-2 flex flex-col items-center justify-center">
                                    <img 
                                      src={getImageUrl(message.fileUrl)} 
                                      alt="Shared image"
                                      className="max-w-[70vw] md:max-w-[320px] rounded-lg mx-auto"
                                      loading="lazy"
                                    />
                                    {message.content && (
                                      <p className="text-base md:text-lg text-center"><span style={{ fontFamily: 'inherit', fontSize: '1.15em' }}>{message.content}</span></p>
                                    )}
                                  </div>
                                )}

                                {message.type === 'video' && (
                                  <div className="space-y-2 flex flex-col items-center justify-center">
                                    <video 
                                      src={getImageUrl(message.fileUrl)} 
                                      controls
                                      className="max-w-[70vw] md:max-w-[320px] rounded-lg mx-auto"
                                      poster={message.metadata?.thumbnailUrl}
                                    />
                                    {message.content && (
                                      <p className="text-base md:text-lg text-center"><span style={{ fontFamily: 'inherit', fontSize: '1.15em' }}>{message.content}</span></p>
                                    )}
                                  </div>
                                )}

                                {message.type === 'audio' && (
                                  <div className="space-y-2 flex flex-col items-center justify-center">
                                    <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg w-full">
                                      <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                                        <Volume2 className="w-4 h-4 text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-base font-medium text-white">Voice Message</p>
                                        <p className="text-xs text-gray-400">
                                          {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'Audio file'}
                                        </p>
                                      </div>
                                      <audio 
                                        src={getImageUrl(message.fileUrl)} 
                                        controls
                                        className="h-8 max-w-32"
                                        controlsList="nodownload"
                                      />
                                    </div>
                                    {message.content && (
                                      <p className="text-base md:text-lg text-center"><span style={{ fontFamily: 'inherit', fontSize: '1.15em' }}>{message.content}</span></p>
                                    )}
                                  </div>
                                )}

                                {message.type === 'file' && (
                                  <div className="space-y-2 flex flex-col items-center justify-center">
                                    <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg w-full">
                                      <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                                        <Paperclip className="w-4 h-4 text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-base font-medium text-white truncate">{message.fileName}</p>
                                        <p className="text-xs text-gray-400">
                                          {message.fileSize ? 
                                            (message.fileSize > 1024 * 1024 ? 
                                              `${(message.fileSize / 1024 / 1024).toFixed(1)} MB` : 
                                              `${(message.fileSize / 1024).toFixed(1)} KB`
                                            ) : 'Unknown size'}
                                        </p>
                                      </div>
                                      <a 
                                        href={getImageUrl(message.fileUrl)} 
                                        download={message.fileName}
                                        className="text-xs bg-primary-500 text-white px-3 py-1 rounded-full hover:bg-primary-600 transition-colors"
                                      >
                                        Download
                                      </a>
                                    </div>
                                    {message.content && (
                                      <p className="text-base md:text-lg text-center"><span style={{ fontFamily: 'inherit', fontSize: '1.15em' }}>{message.content}</span></p>
                                    )}
                                  </div>
                                )}

                                {message.type === 'location' && message.metadata?.location && (
                                  <div className="space-y-2 flex flex-col items-center justify-center">
                                    <div className="p-2 bg-white/10 rounded w-full">
                                      <p className="text-base font-medium">📍 Location</p>
                                      <p className="text-xs opacity-70">
                                        {message.metadata.location.address || `${message.metadata.location.lat}, ${message.metadata.location.lng}`}
                                      </p>
                                    </div>
                                    {message.content && (
                                      <p className="text-base md:text-lg text-center"><span style={{ fontFamily: 'inherit', fontSize: '1.15em' }}>{message.content}</span></p>
                                    )}
                                  </div>
                                )}

                                {message.type === 'contact' && message.metadata?.contact && (
                                  <div className="space-y-2 flex flex-col items-center justify-center">
                                    <div className="p-2 bg-white/10 rounded w-full">
                                      <p className="text-base font-medium">👤 Contact</p>
                                      <p className="text-xs">{message.metadata.contact.name}</p>
                                      <p className="text-xs opacity-70">{message.metadata.contact.phone}</p>
                                      {message.metadata.contact.email && (
                                        <p className="text-xs opacity-70">{message.metadata.contact.email}</p>
                                      )}
                                    </div>
                                    {message.content && (
                                      <p className="text-base md:text-lg text-center"><span style={{ fontFamily: 'inherit', fontSize: '1.15em' }}>{message.content}</span></p>
                                    )}
                                  </div>
                                )}

                                {message.type === 'sticker' && (
                                  <div className="space-y-2 flex flex-col items-center justify-center">
                                    <div className="flex items-center justify-center w-full">
                                      <StickerMessage
                                        stickerUrl={message.metadata?.stickerUrl || '😊'}
                                        stickerName={message.content || 'Sticker'}
                                        size="large"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Message metadata */}
                                <div className="flex items-center justify-between gap-1 md:gap-2 mt-1">
                                  <span className="text-xs md:text-sm opacity-70">
                                    {formatTimestamp(message.timestamp)}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {getMessageStatusIcon(message)}
                                    {message.senderId === user?.uid && (
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => setReplyToMessage(message)}
                                          className="text-xs opacity-70 hover:opacity-100"
                                          title="Reply"
                                          aria-label="Reply to message"
                                        >
                                          <FaReply size={20} color="red" style={{ marginRight: 4 }} />
                                        </button>
                                        <button
                                          onClick={() => setForwardMessage(message)}
                                          className="text-xs opacity-70 hover:opacity-100"
                                          title="Forward"
                                          aria-label="Forward message"
                                        >
                                          <Forward className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => copyMessage(message.content)}
                                          className="text-xs opacity-70 hover:opacity-100"
                                          title="Copy"
                                          aria-label="Copy message"
                                        >
                                          <FaCopy size={20} color="blue" style={{ marginRight: 4 }} />
                                        </button>
                                        {message.type === 'text' && (
                                          <button
                                            onClick={() => {
                                              setEditingMessage(message.id);
                                              setEditContent(message.content);
                                            }}
                                            className="text-xs opacity-70 hover:opacity-100"
                                            title="Edit"
                                            aria-label="Edit message"
                                          >
                                            <FaEdit size={20} color="yellow" style={{ marginRight: 4 }} />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteMessage(message.id)}
                                          className="text-xs opacity-70 hover:opacity-100 text-red-400"
                                          title="Delete"
                                          aria-label="Delete message"
                                        >
                                          <FaTrash size={20} color="red" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Edit indicator */}
                                {message.edited && (
                                  <p className="text-xs opacity-70">(edited)</p>
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                    {/* Typing indicators from other users */}
                    {typingUsers.length > 0 && (
                      <div className="flex justify-start">
                        <div className="bg-dark-700 text-gray-200 rounded-2xl px-3 md:px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-xs md:text-sm">
                              {typingUsers.length === 1 ? (
                                `${availableFriends.find(f => f.userId === typingUsers[0])?.fullName || 'Someone'} is typing...`
                              ) : (
                                `${typingUsers.length} people are typing...`
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="sticky bottom-0 left-0 w-full bg-dark-900 z-20 px-2 py-2 sm:px-6 sm:py-3 border-t border-dark-700 flex items-center gap-2 pb-[env(safe-area-inset-bottom)]">
                    {/* Reply indicator */}
                    {replyToMessage && (
                      <div className="mb-3 p-2 bg-dark-700 rounded-lg flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400">Replying to:</p>
                          <p className="text-xs md:text-sm text-white truncate"><span style={{ fontFamily: 'inherit', fontSize: '1.15em' }}>{replyToMessage.content}</span></p>
                        </div>
                        <button
                          onClick={() => setReplyToMessage(null)}
                          className="text-gray-400 hover:text-white flex-shrink-0 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Forward indicator */}
                    {forwardMessage && (
                      <div className="mb-3 p-2 bg-dark-700 rounded-lg flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400">Forwarding message:</p>
                          <p className="text-xs md:text-sm text-white truncate"><span style={{ fontFamily: 'inherit', fontSize: '1.15em' }}>{forwardMessage.content}</span></p>
                        </div>
                        <button
                          onClick={() => setForwardMessage(null)}
                          className="text-gray-400 hover:text-white flex-shrink-0 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    
                    {/* Photo preview before sending (like WhatsApp) */}
                    {photoPreview && (
                      <div className="mb-3 flex flex-col items-center justify-center gap-2 p-3 md:p-4 bg-dark-700 rounded-lg">
                        <img src={photoPreview} alt="Preview" className="max-h-48 md:max-h-64 rounded-lg mb-2" style={{ maxWidth: '100%' }} />
                        <div className="flex gap-2 md:gap-4">
                          <button
                            type="button"
                            onClick={handleSendPhoto}
                            className="px-3 md:px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 text-sm md:text-base"
                          >
                            Send
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelPhoto}
                            className="px-3 md:px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm md:text-base"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {audioPreview && (
                      <div className="mb-3 flex flex-col items-center justify-center gap-2 p-3 md:p-4 bg-dark-700 rounded-lg">
                        <audio src={audioPreview} controls className="w-full mb-2" />
                        <div className="flex gap-2 md:gap-4">
                          <button
                            type="button"
                            onClick={handleSendAudio}
                            className="px-3 md:px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 text-sm md:text-base"
                          >
                            Send
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelAudio}
                            className="px-3 md:px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm md:text-base"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full min-h-[48px]">
                      {/* Attachment Popover */}
                      <div className="relative">
                        <button
                          type="button"
                          className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
                          title="Attach"
                          aria-label="Attach"
                          onClick={() => setShowAttachmentPopover((v) => !v)}
                        >
                          <Paperclip className="w-6 h-6" />
                        </button>
                        {showAttachmentPopover && (
                          <div className="absolute bottom-12 left-0 z-50 bg-dark-800 border border-dark-600 rounded-xl shadow-xl p-2 flex flex-col gap-2 min-w-[180px] animate-fade-in">
                            <button type="button" className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700 transition-colors w-full" onClick={handleFileInput} aria-label="Document">
                              <Paperclip className="w-5 h-5" /> <span className="text-sm text-white">Document</span>
                            </button>
                            <button type="button" className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700 transition-colors w-full" onClick={handleImageInput} aria-label="Image">
                              <Image className="w-5 h-5" /> <span className="text-sm text-white">Image</span>
                            </button>
                            <button type="button" className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700 transition-colors w-full" onClick={handleImageInput} aria-label="Camera">
                              <Video className="w-5 h-5" /> <span className="text-sm text-white">Camera</span>
                            </button>
                            <button type="button" className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700 transition-colors w-full" onClick={handleFileInput} aria-label="Audio">
                              <Mic className="w-5 h-5" /> <span className="text-sm text-white">Audio</span>
                            </button>
                            <button type="button" className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700 transition-colors w-full" onClick={handleFileInput} aria-label="Video">
                              <Video className="w-5 h-5" /> <span className="text-sm text-white">Video</span>
                            </button>
                            <button type="button" className="flex items-center justify-center p-2 rounded-lg hover:bg-dark-700 transition-colors w-full mt-1" onClick={() => setShowAttachmentPopover(false)} aria-label="Close attachment menu">
                              <X className="w-5 h-5 text-gray-400" />
                            </button>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="*/*"
                          style={{ display: 'none' }}
                          onChange={onFileChange}
                        />
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={onImageChange}
                          capture="environment"
                        />
                      </div>
                      {/* Emoji Picker */}
                      <div className="flex items-center">
                        <EmojiPicker
                          keepOpenAfterSelect
                          inputRef={inputRef}
                          caretPosition={caretPosition}
                          onCaretPositionChange={setCaretPosition}
                          onEmojiSelect={(emoji) => {
                            if (inputRef.current) {
                              setNewMessage(inputRef.current.value);
                              setCaretPosition(inputRef.current.selectionStart ?? 0);
                            }
                          }}
                          onStickerSelect={(sticker) => {
                            if (selectedConversation && user) {
                              const receiverId = selectedConversation.participants.find(p => p !== user.uid);
                              if (receiverId) {
                                const stickerMessage: Message = {
                                  id: 'sticker-' + Date.now(),
                                  conversationId: selectedConversation.id,
                                  senderId: user.uid,
                                  receiverId,
                                  content: sticker.name,
                                  timestamp: new Date(),
                                  type: 'sticker',
                                  status: 'sending',
                                  read: false,
                                  edited: false,
                                  fileUrl: sticker.url,
                                  fileName: sticker.name,
                                  metadata: {
                                    stickerId: sticker.name,
                                    stickerUrl: sticker.url
                                  }
                                };
                                setMessages(prev => [...prev, stickerMessage]);
                                setTimeout(() => {
                                  scrollToBottom();
                                }, 100);
                                messagingService.sendMessage(
                                  selectedConversation.id,
                                  user.uid,
                                  receiverId,
                                  sticker.name,
                                  'sticker',
                                  sticker.url,
                                  sticker.name,
                                  undefined,
                                  undefined,
                                  { stickerId: sticker.name, stickerUrl: sticker.url }
                                ).catch(error => {
                                  setMessages(prev =>
                                    prev.map(msg =>
                                      msg.id === stickerMessage.id ? { ...msg, status: 'error' } : msg
                                    )
                                  );
                                });
                              }
                            }
                          }}
                        />
                      </div>
                      {/* Message Input */}
                      <textarea
                        ref={inputRef as any}
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          setCaretPosition(e.target.selectionStart ?? 0);
                          handleTyping();
                        }}
                        onClick={(e) => {
                          setCaretPosition((e.target as HTMLTextAreaElement).selectionStart ?? 0);
                        }}
                        onKeyUp={(e) => {
                          setCaretPosition((e.target as HTMLTextAreaElement).selectionStart ?? 0);
                        }}
                        placeholder={replyToMessage ? "Reply to message..." : forwardMessage ? "Add a comment (optional)..." : "Type a message..."}
                        className="flex-1 min-w-[60px] max-w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 text-base min-h-[44px] max-h-32 resize-none sm:text-base md:text-lg"
                        style={{ minWidth: 0, lineHeight: '1.4', overflow: 'auto' }}
                        aria-label="Type a message"
                        rows={1}
                        onInput={e => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                      />
                      {/* WhatsApp-style Send/Mic Button */}
                      {newMessage.trim().length > 0 ? (
                        <button
                          type="submit"
                          className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors ml-1"
                          title="Send"
                          aria-label="Send message"
                          tabIndex={0}
                        >
                          <Send className="w-6 h-6" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full text-gray-400 hover:text-white hover:bg-dark-700 transition-colors ml-1"
                          title="Voice Message"
                          aria-label="Voice Message"
                          onClick={startRecording}
                        >
                          <Mic className="w-6 h-6" />
                        </button>
                      )}
                    </form>
                  </div>
                </>
              ) : (
                <div className="hidden md:flex flex-1 items-center justify-center">
                  <div className="text-center px-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                      <Send className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Select a conversation</h3>
                    <p className="text-gray-400 text-sm md:text-base">Choose a friend to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Forward Message Modal, overlays, etc. */}
          <AnimatePresence>
            {showForwardModal && forwardMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/50"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-dark-800 w-full sm:w-full sm:max-w-md left-0 right-0 rounded-t-2xl sm:rounded-lg p-3 sm:p-6 pb-[env(safe-area-inset-bottom)]"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Forward Message</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableFriends.map((friend) => (
                      <button
                        key={friend.userId}
                        onClick={() => {
                          setShowForwardModal(false);
                          setForwardMessage(null);
                          toast.success(`Message forwarded to ${friend.fullName}`);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-dark-700 transition-colors"
                      >
                        <img
                          src={getProfileImageUrl(friend)}
                          alt={friend.fullName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="text-white">{friend.fullName}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => {
                        setShowForwardModal(false);
                        setForwardMessage(null);
                      }}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {showProfileModal && selectedConversation && (
            <UserProfileModal
              friend={getConversationParticipant(selectedConversation)}
              onClose={() => setShowProfileModal(false)}
              onCall={handleProfileCall}
              onVideoCall={handleProfileVideoCall}
            />
          )}
          
          {showCallHistory && (
            <CallHistoryComponent
              isOpen={showCallHistory}
              onClose={() => setShowCallHistory(false)}
            />
          )}
          {(callState === 'calling' || callState === 'in-call') && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-blue-900/90 to-purple-900/90">
              <div className={`bg-dark-800/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/10 transition-all duration-300 ${
                callType === 'video' && callState === 'in-call' ? 'w-full h-full max-w-none' : 'w-full max-w-md'
              }`}>
                
                                 {/* Video Call Interface */}
                 {callType === 'video' && callState === 'in-call' && (
                   <div className="flex flex-col h-full">
                     {/* Video Grid */}
                     <VideoGrid
                       localStream={localStream}
                       remoteStream={remoteStream}
                       localUser={user}
                       remoteUser={getConversationParticipant(selectedConversation!)}
                       callState={callState}
                       callDuration={callDuration}
                       isLocalVideoEnabled={isLocalVideoEnabled}
                       isRemoteVideoEnabled={isRemoteVideoEnabled}
                       onToggleVideo={toggleVideo}
                       onToggleMic={() => {
                         if (localStream) {
                           const audioTrack = localStream.getAudioTracks()[0];
                           if (audioTrack) {
                             audioTrack.enabled = !audioTrack.enabled;
                             setIsMuted(!audioTrack.enabled);
                           }
                         }
                       }}
                       onToggleSpeaker={toggleSpeaker}
                       onEndCall={endCall}
                       onScreenShare={toggleScreenShare}
                       onSettings={() => setShowVideoSettings(true)}
                     />

                     {/* Call Controls */}
                     <div className="p-3 md:p-4 bg-dark-900/90 backdrop-blur-lg border-t border-white/10">
                       <div className="flex items-center justify-center gap-2 md:gap-4">
                         {/* Mute/Unmute */}
                         <button
                           onClick={() => {
                             if (localStream) {
                               const audioTrack = localStream.getAudioTracks()[0];
                               if (audioTrack) {
                                 audioTrack.enabled = !audioTrack.enabled;
                                 setIsMuted(!audioTrack.enabled);
                               }
                             }
                           }}
                           className={`p-3 md:p-4 rounded-full transition-colors ${
                             isMuted ? 'bg-red-500 text-white' : 'bg-dark-700 text-white hover:bg-dark-600'
                           }`}
                         >
                           {isMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
                         </button>

                         {/* Video Toggle */}
                         <button
                           onClick={toggleVideo}
                           className={`p-3 md:p-4 rounded-full transition-colors ${
                             !isLocalVideoEnabled ? 'bg-red-500 text-white' : 'bg-dark-700 text-white hover:bg-dark-600'
                           }`}
                         >
                           {isLocalVideoEnabled ? <Video className="w-5 h-5 md:w-6 md:h-6" /> : <VideoOff className="w-5 h-5 md:w-6 md:h-6" />}
                         </button>

                         {/* End Call */}
                         <button
                           onClick={endCall}
                           className="p-3 md:p-4 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                         >
                           <X className="w-5 h-5 md:w-6 md:h-6" />
                         </button>

                         {/* Speaker Toggle */}
                         <button
                           onClick={toggleSpeaker}
                           className={`p-3 md:p-4 rounded-full transition-colors ${
                             isSpeaker ? 'bg-primary-500 text-white' : 'bg-dark-700 text-white hover:bg-dark-600'
                           }`}
                         >
                           {isSpeaker ? <Volume2 className="w-5 h-5 md:w-6 md:h-6" /> : <Volume1 className="w-5 h-5 md:w-6 md:h-6" />}
                         </button>

                         {/* Screen Share */}
                         <button
                           onClick={toggleScreenShare}
                           className={`p-3 md:p-4 rounded-full transition-colors ${
                             isScreenSharing ? 'bg-primary-500 text-white' : 'bg-dark-700 text-white hover:bg-dark-600'
                           }`}
                         >
                           <Monitor className="w-5 h-5 md:w-6 md:h-6" />
                         </button>
                       </div>

                       {/* Call Duration */}
                       <div className="mt-4 text-center text-white/80">
                         {formatCallDuration(callDuration)}
                       </div>
                     </div>
                   </div>
                 )}

                                 {/* Audio Call Interface */}
                 {callType === 'audio' && (
                   <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-blue-900/90 to-purple-900/90">
                     <div className="backdrop-blur-xl bg-dark-900/90 rounded-2xl shadow-2xl border border-white/10 flex flex-col items-center px-4 md:px-8 py-6 md:py-10 w-full max-w-md mx-2 md:mx-4 sm:mx-auto transition-all duration-300"
                       style={{ minWidth: '280px', maxWidth: '95vw' }}>
                       {/* User Profile Section */}
                       {selectedConversation && (
                         <>
                           <div className="relative mb-4 md:mb-6 flex flex-col items-center">
                             <div className="relative">
                    <img
                      src={getProfileImageUrl(getConversationParticipant(selectedConversation!) || { profileImagePath: undefined })}
                      alt={getConversationParticipant(selectedConversation!)?.fullName || 'Musician'}
                                 className="w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-primary-500 shadow-xl bg-dark-800"
                      onError={e => {
                        (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                      }}
                    />
                               {/* Improved Verified Badge */}
                               {getConversationParticipant(selectedConversation!)?.isVerified && (
                                 <span className="absolute -bottom-2 -right-2 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-green-500 border-4 border-dark-900 shadow-lg">
                                   <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />
                                 </span>
                               )}
                             </div>
                           </div>
                           <h2 className="text-white text-xl md:text-2xl lg:text-3xl font-bold mb-1 text-center truncate max-w-xs">
                             {getConversationParticipant(selectedConversation!)?.fullName || 'Musician'}
                           </h2>
                           {/* Call Status */}
                           {callState === 'calling' && (
                             <div className="space-y-2 mb-2">
                               <div className="text-gray-300 text-base sm:text-lg text-center">Audio Call</div>
                               <div className="flex items-center justify-center gap-2">
                                 <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                 <span className="text-sm text-gray-400 font-medium">Ringing...</span>
                               </div>
                             </div>
                           )}
                           {callState === 'in-call' && (
                             <div className="space-y-2 mb-2">
                               <div className="text-gray-300 text-base sm:text-lg text-center">In Call</div>
                               <div className="text-primary-400 text-lg sm:text-xl font-semibold text-center">
                                 {formatCallDuration(callDuration)}
                               </div>
                             </div>
                           )}
                           {/* User Info */}
                           <div className="mt-1 mb-6 text-center">
                             <p className="text-gray-400 text-sm font-medium">
                               {getConversationParticipant(selectedConversation!)?.instrumentType || 'Musician'}
                             </p>
                             {getConversationParticipant(selectedConversation!)?.musicCulture && (
                               <p className="text-gray-500 text-xs">
                                 {getConversationParticipant(selectedConversation!)?.musicCulture}
                               </p>
                             )}
                           </div>
                           {/* Call Controls */}
                           <div className="flex items-center justify-center gap-3 md:gap-4 lg:gap-6 mt-2 w-full">
                  {/* Mute/unmute button */}
                  <button
                    onClick={() => {
                      if (localStream) {
                        localStream.getAudioTracks().forEach(track => {
                          track.enabled = !track.enabled;
                          setIsMuted(!track.enabled);
                        });
                      }
                    }}
                               className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center rounded-full shadow-lg bg-gray-800 hover:bg-gray-700 transition-all duration-200 border-2 border-transparent ${isMuted ? 'bg-red-600 text-white border-red-500' : 'text-white'}`}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                               {isMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" /> : <Mic className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />}
                  </button>
                             {/* Switch to Video button (only for audio calls) */}
                             {callState === 'in-call' && callType === 'audio' && canSwitchToVideo && (
                  <button
                                 onClick={switchToVideoCall}
                                 disabled={isSwitchingToVideo}
                                 className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center rounded-full bg-primary-500 hover:bg-primary-600 text-white shadow-lg border-2 border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                 title="Switch to Video Call"
                               >
                                 {isSwitchingToVideo ? (
                                   <div className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                 ) : (
                                   <Video className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
                                 )}
                               </button>
                             )}
                             {/* Speakerphone button */}
                             <button
                               onClick={toggleSpeaker}
                               className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center rounded-full shadow-lg bg-gray-800 hover:bg-gray-700 transition-all duration-200 border-2 border-transparent ${isSpeaker ? 'bg-primary-500 text-white border-primary-400' : 'text-white'}`}
                               title={isSpeaker ? "Switch to Earpiece" : "Switch to Speaker"}
                             >
                               {isSpeaker ? <Volume2 className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" /> : <VolumeX className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />}
                  </button>
                  {/* End call button */}
                             <button
                               onClick={endCall}
                               className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg border-2 border-red-500 transition-all duration-200"
                               title="End Call"
                             >
                               <X className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
                  </button>
                </div>
                         </>
                       )}
                </div>
                   </div>
                 )}
              </div>
            </div>
          )}
          {callState === 'incoming' && incomingCall && selectedConversation && (
            <IncomingCallModal
              participant={getConversationParticipant(selectedConversation!)}
              isOnline={userStatuses[getConversationParticipant(selectedConversation!)?.userId || '']?.state === 'online'}
              callType={incomingCall.type}
              onAccept={acceptCall}
              onReject={rejectCall}
            />
          )}
          {callState === 'calling' || callState === 'in-call' || callState === 'incoming' ? (
            <>
              {/* Ringback for caller */}
              <audio ref={ringbackAudioEl} src="/ringback.mp3" style={{ display: 'none' }} />
              {/* Ringtone for receiver */}
              <audio ref={ringtoneAudioEl} src={`/Ringtones/${settings.ringtone}`} style={{ display: 'none' }} />
              {/* Remote audio for in-call */}
              {remoteStream && (
                <audio id="remote-audio" autoPlay playsInline ref={el => { if (el && remoteStream) el.srcObject = remoteStream; }} />
              )}
            </>
          ) : null}

          {/* Settings Modal/Sidebar */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-dark-800 rounded-2xl w-full h-full md:max-w-4xl md:h-[80vh] shadow-2xl flex flex-col md:flex-row overflow-hidden mx-0 md:mx-0"
                >
                  {/* Settings Sidebar */}
                  <nav className="w-full md:w-80 bg-dark-700 border-b md:border-b-0 md:border-r border-dark-600 flex flex-col h-auto md:h-full overflow-y-auto sticky top-0 z-10">
                    <div className="p-4 border-b border-dark-600 flex items-center justify-between bg-dark-700">
                      <h2 className="text-xl font-bold text-white">Settings</h2>
                      <button
                        onClick={() => setShowSettings(false)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-dark-600">
                      {[
                        { key: 'general', label: 'General', icon: <Settings className="w-5 h-5" /> },
                        { key: 'privacy', label: 'Privacy', icon: <Shield className="w-5 h-5" /> },
                        { key: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
                        { key: 'chat', label: 'Chat', icon: <MessageCircle className="w-5 h-5" /> },
                        { key: 'theme', label: 'Theme', icon: <Palette className="w-5 h-5" /> },
                        { key: 'help', label: 'Help', icon: <HelpCircle className="w-5 h-5" /> },
                        { key: 'mission', label: 'Mission', icon: <User className="w-5 h-5" /> },
                      ].map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setCurrentSettingsTab(tab.key)}
                          className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors text-base md:text-sm font-medium focus:outline-none focus:bg-primary-500/10 hover:bg-dark-600 ${
                            currentSettingsTab === tab.key ? 'bg-primary-500/20 text-primary-400' : 'text-gray-300'
                          }`}
                          style={{ minHeight: 48 }}
                        >
                          {tab.icon}
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </nav>
                  {/* Settings Content */}
                  <div className="flex-1 overflow-y-auto p-3 md:p-6 w-full">
                    {currentSettingsTab === 'general' && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                            <div>
                              <h4 className="text-white font-medium">Last Seen</h4>
                              <p className="text-sm text-gray-400">Who can see your last seen</p>
                            </div>
                            <div className="min-w-[160px]">
                              <Select
                                value={{ label: settings.lastSeen === 'everyone' ? 'Everyone' : settings.lastSeen === 'contacts' ? 'My Contacts' : 'Nobody', value: settings.lastSeen }}
                                onChange={opt => { if (opt) updateSettings({ lastSeen: opt.value }); }}
                                options={[
                                  { value: 'everyone', label: 'Everyone' },
                                  { value: 'contacts', label: 'My Contacts' },
                                  { value: 'nobody', label: 'Nobody' },
                                ]}
                                styles={enhancedSelectStyles}
                                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                                isSearchable={false}
                                classNamePrefix="react-select"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 min-w-[180px]">
                            <Select
                              value={{ label: selectedRingtone === 'apple.mp3' ? 'Apple' : selectedRingtone === 'cool-nice-ringtone-36803.mp3' ? 'Cool Nice' : 'Tera Honay Laga Hon', value: selectedRingtone }}
                              onChange={opt => { if (opt) { setSelectedRingtone(opt.value); updateSettings({ ringtone: opt.value }); } }}
                              options={[
                                { value: 'apple.mp3', label: 'Apple' },
                                { value: 'cool-nice-ringtone-36803.mp3', label: 'Cool Nice' },
                                { value: 'tera-honay-laga-hon-28-15126-66777.mp3', label: 'Tera Honay Laga Hon' },
                              ]}
                              styles={enhancedSelectStyles}
                              menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                              isSearchable={false}
                              classNamePrefix="react-select"
                            />
                            <button
                              onClick={() => isPlayingRingtone ? stopRingtonePreview() : playRingtonePreview(selectedRingtone)}
                              className="p-2 bg-primary-500 rounded hover:bg-primary-600 transition-colors"
                            >
                              {isPlayingRingtone ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentSettingsTab === 'privacy' && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Privacy Settings</h3>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                            <div>
                              <h4 className="text-white font-medium">Profile Photo</h4>
                              <p className="text-sm text-gray-400">Who can see your profile photo</p>
                            </div>
                            <div className="min-w-[160px]">
                              <Select
                                value={{ label: settings.privacy.profilePhoto === 'everyone' ? 'Everyone' : settings.privacy.profilePhoto === 'contacts' ? 'My Contacts' : 'Nobody', value: settings.privacy.profilePhoto }}
                                onChange={opt => { if (opt) updateSettings({ privacy: { ...settings.privacy, profilePhoto: opt.value } }); }}
                                options={[
                                  { value: 'everyone', label: 'Everyone' },
                                  { value: 'contacts', label: 'My Contacts' },
                                  { value: 'nobody', label: 'Nobody' },
                                ]}
                                styles={enhancedSelectStyles}
                                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                                isSearchable={false}
                                classNamePrefix="react-select"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                            <div>
                              <h4 className="text-white font-medium">Status</h4>
                              <p className="text-sm text-gray-400">Who can see your status</p>
                            </div>
                            <div className="min-w-[160px]">
                              <Select
                                value={{ label: settings.privacy.status === 'everyone' ? 'Everyone' : settings.privacy.status === 'contacts' ? 'My Contacts' : 'Nobody', value: settings.privacy.status }}
                                onChange={opt => { if (opt) updateSettings({ privacy: { ...settings.privacy, status: opt.value } }); }}
                                options={[
                                  { value: 'everyone', label: 'Everyone' },
                                  { value: 'contacts', label: 'My Contacts' },
                                  { value: 'nobody', label: 'Nobody' },
                                ]}
                                styles={enhancedSelectStyles}
                                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                                isSearchable={false}
                                classNamePrefix="react-select"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentSettingsTab === 'notifications' && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Notification Settings</h3>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                            <div>
                              <h4 className="text-white font-medium">Message Preview</h4>
                              <p className="text-sm text-gray-400">Show message content in notifications</p>
                            </div>
                            <button
                              onClick={() => updateSettings({ 
                                notifications: { ...settings.notifications, messagePreview: !settings.notifications.messagePreview }
                              })}
                              className={`w-12 h-6 rounded-full transition-colors ${
                                settings.notifications.messagePreview ? 'bg-primary-500' : 'bg-dark-600'
                              }`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.notifications.messagePreview ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                            <div>
                              <h4 className="text-white font-medium">Sound</h4>
                              <p className="text-sm text-gray-400">Play sound for notifications</p>
                            </div>
                            <button
                              onClick={() => updateSettings({ 
                                notifications: { ...settings.notifications, sound: !settings.notifications.sound }
                              })}
                              className={`w-12 h-6 rounded-full transition-colors ${
                                settings.notifications.sound ? 'bg-primary-500' : 'bg-dark-600'
                              }`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.notifications.sound ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                            <div>
                              <h4 className="text-white font-medium">Vibration</h4>
                              <p className="text-sm text-gray-400">Vibrate for notifications</p>
                            </div>
                            <button
                              onClick={() => updateSettings({ 
                                notifications: { ...settings.notifications, vibration: !settings.notifications.vibration }
                              })}
                              className={`w-12 h-6 rounded-full transition-colors ${
                                settings.notifications.vibration ? 'bg-primary-500' : 'bg-dark-600'
                              }`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.notifications.vibration ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentSettingsTab === 'chat' && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Chat Settings</h3>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                            <div>
                              <h4 className="text-white font-medium">Enter to Send</h4>
                              <p className="text-sm text-gray-400">Press Enter to send messages</p>
                            </div>
                            <button
                              onClick={() => updateSettings({ 
                                chat: { ...settings.chat, enterToSend: !settings.chat.enterToSend }
                              })}
                              className={`w-12 h-6 rounded-full transition-colors ${
                                settings.chat.enterToSend ? 'bg-primary-500' : 'bg-dark-600'
                              }`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.chat.enterToSend ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                            <div>
                              <h4 className="text-white font-medium">Auto Download Media</h4>
                              <p className="text-sm text-gray-400">Automatically download media files</p>
                            </div>
                            <button
                              onClick={() => updateSettings({ 
                                chat: { ...settings.chat, mediaAutoDownload: !settings.chat.mediaAutoDownload }
                              })}
                              className={`w-12 h-6 rounded-full transition-colors ${
                                settings.chat.mediaAutoDownload ? 'bg-primary-500' : 'bg-dark-600'
                              }`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.chat.mediaAutoDownload ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentSettingsTab === 'theme' && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Theme Settings</h3>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                            <div>
                              <h4 className="text-white font-medium">Theme</h4>
                              <p className="text-sm text-gray-400">Choose your preferred theme</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateSettings({ theme: 'light' })}
                                className={`p-2 rounded-lg transition-colors ${
                                  settings.theme === 'light' ? 'bg-primary-500 text-white' : 'bg-dark-600 text-gray-400'
                                }`}
                              >
                                <Sun className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => updateSettings({ theme: 'dark' })}
                                className={`p-2 rounded-lg transition-colors ${
                                  settings.theme === 'dark' ? 'bg-primary-500 text-white' : 'bg-dark-600 text-gray-400'
                                }`}
                              >
                                <Moon className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentSettingsTab === 'help' && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Help & Support</h3>
                        
                        <div className="space-y-4">
                          <div className="p-4 bg-dark-700 rounded-lg">
                            <h4 className="text-white font-medium mb-2">How to use SoundAlchemy</h4>
                            <p className="text-sm text-gray-400 mb-4">
                              SoundAlchemy is a professional messaging platform for musicians. Connect with other verified musicians, 
                              share your music, and collaborate on projects.
                            </p>
                            <div className="space-y-2 text-sm text-gray-400">
                              <p>• <strong>Messaging:</strong> Send text, images, audio, and video messages</p>
                              <p>• <strong>Calls:</strong> Make voice and video calls with crystal clear quality</p>
                              <p>• <strong>Privacy:</strong> Control who can see your profile and status</p>
                              <p>• <strong>Verification:</strong> All users are verified musicians</p>
                            </div>
                          </div>

                          <div className="p-4 bg-dark-700 rounded-lg">
                            <h4 className="text-white font-medium mb-2">Contact Support</h4>
                            <p className="text-sm text-gray-400">
                              Need help? Contact our support team at support@soundalchemy.com
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {currentSettingsTab === 'mission' && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Our Mission</h3>
                        <div className="bg-dark-700 rounded-lg p-4 text-gray-200 text-base md:text-lg leading-relaxed">
                          <p><b>SoundAlchemy</b> envisions a world where music transcends boundaries, technology amplifies creativity, and global collaboration creates positive change. Our mission is to empower musicians everywhere to connect, create, and inspire—together.</p>
                          <ul className="list-disc pl-6 mt-4 space-y-1 text-sm md:text-base">
                            <li>Amplify human creativity with technology</li>
                            <li>Preserve and celebrate cultural heritage</li>
                            <li>Drive innovation with environmental consciousness</li>
                            <li>Enable global musical collaboration</li>
                            <li>Promote positive social change through music</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Video Call Settings Modal */}
          {showVideoSettings && (
            <VideoCallSettingsModal
              isOpen={showVideoSettings}
              onClose={() => setShowVideoSettings(false)}
              currentMic={selectedDevices.microphone || micOptions[0]?.deviceId || ''}
              currentCamera={selectedDevices.camera || cameraOptions[0]?.deviceId || ''}
              currentSpeaker={selectedDevices.speaker || speakerOptions[0]?.deviceId || ''}
              onSelectMic={(deviceId) => changeDevice('microphone', deviceId)}
              onSelectCamera={(deviceId) => changeDevice('camera', deviceId)}
              onSelectSpeaker={(deviceId) => changeDevice('speaker', deviceId)}
              onSetBackground={(type, value) => {
                if (type === 'blur') {
                  setBlurBackground(true);
                } else if (type === 'none') {
                  setBlurBackground(false);
                }
                // Handle virtual background
              }}
              onSetVideoQuality={changeVideoQuality}
              micOptions={micOptions}
              cameraOptions={cameraOptions}
              speakerOptions={speakerOptions}
              videoQuality={videoQuality}
              backgroundType={blurBackground ? 'blur' : 'none'}
            />
          )}

          {/* Replace the blue/blank screen after clicking video call icon */}
          {callType === 'video' && callState === 'calling' && selectedConversation && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <VideoCallWaitingScreen
                participant={getConversationParticipant(selectedConversation)}
                isOnline={userStatuses[getConversationParticipant(selectedConversation)?.userId || '']?.state === 'online'}
                callType="video"
                onCancel={endCall}
                localUser={user}
              />
            </div>
          )}
        </>
      </motion.div>
    </Draggable>
  );
};

export default MessagingInterface; 