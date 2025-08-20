import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { Send, Paperclip, Smile, Image as ImageIcon, File, X, User, Loader2, Undo2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  role?: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  read: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  updatedAt: Date;
  unreadCount: number;
}

interface DirectMessageProps {
  selectedUser: User | null;
}

const DirectMessage: React.FC<DirectMessageProps> = ({ selectedUser }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSentMessage, setLastSentMessage] = useState<Message | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const undoTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const conversationsQuery = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
          const conversationsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              participants: data.participants,
              lastMessage: data.lastMessage,
              updatedAt: data.updatedAt?.toDate() || new Date(),
              unreadCount: data.unreadCount || 0
            } as Conversation;
          });
          conversationsData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
          setConversations(conversationsData);
          setIsLoading(false);
        }, (error) => {
          console.error('Error fetching conversations:', error);
          setError('Failed to load conversations');
          setIsLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error in fetchConversations:', error);
        setError('Failed to load conversations');
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedUser) return;

    const conversationId = [user.uid, selectedUser.id].sort().join('_');
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: data.content,
          timestamp: data.timestamp.toDate(),
          type: data.type,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          read: data.read,
          status: data.status || 'sent'
        } as Message;
      });
      setMessages(messagesData);

      // Mark messages as read
      const unreadMessages = messagesData.filter(
        msg => !msg.read && msg.receiverId === user.uid
      );
      if (unreadMessages.length > 0) {
        unreadMessages.forEach(msg => {
          updateDoc(doc(db, 'messages', msg.id), { 
            read: true,
            status: 'read'
          });
        });
      }
    });

    return () => unsubscribe();
  }, [user, selectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTyping = () => {
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!user || !selectedUser || (!newMessage.trim() && attachments.length === 0)) return;

    const conversationId = [user.uid, selectedUser.id].sort().join('_');
    const tempMessageId = `temp_${Date.now()}`;
    
    try {
      // Add temporary message to UI
      const tempMessage: Message = {
        id: tempMessageId,
        senderId: user.uid,
        receiverId: selectedUser.id,
        content: newMessage.trim(),
        timestamp: new Date(),
        type: 'text',
        read: false,
        status: 'sending'
      };
      setMessages(prev => [...prev, tempMessage]);

      // Create or update conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDocs(query(collection(db, 'conversations'), where('id', '==', conversationId)));
      
      if (conversationDoc.empty) {
        await addDoc(collection(db, 'conversations'), {
          id: conversationId,
          participants: [user.uid, selectedUser.id],
          updatedAt: serverTimestamp(),
          unreadCount: 1
        });
      } else {
        await updateDoc(conversationRef, {
          updatedAt: serverTimestamp(),
          unreadCount: 1
        });
      }

      // Add message to Firestore
      const messageData = {
        conversationId,
        senderId: user.uid,
        receiverId: selectedUser.id,
        content: newMessage.trim(),
        timestamp: serverTimestamp(),
        type: 'text',
        read: false,
        status: 'sent'
      };

      const messageRef = await addDoc(collection(db, 'messages'), messageData);
      
      // Update temporary message with real ID and status
      const sentMessage = {
        ...tempMessage,
        id: messageRef.id,
        status: 'sent'
      };
      
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessageId ? sentMessage : msg
      ));

      // Set last sent message and show undo button
      setLastSentMessage(sentMessage);
      setShowUndo(true);

      // Clear undo button after 5 seconds
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndo(false);
        setLastSentMessage(null);
      }, 5000);

      setNewMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Update temporary message with error status
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessageId 
          ? { ...msg, status: 'error' }
          : msg
      ));
      setError('Failed to send message');
    }
  };

  const handleUndoMessage = async () => {
    if (!lastSentMessage) return;

    try {
      // Remove message from Firestore
      await deleteDoc(doc(db, 'messages', lastSentMessage.id));

      // Remove message from UI
      setMessages(prev => prev.filter(msg => msg.id !== lastSentMessage.id));

      // Clear undo state
      setShowUndo(false);
      setLastSentMessage(null);
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    } catch (error) {
      console.error('Error undoing message:', error);
      setError('Failed to undo message');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-900">
        <div className="text-center text-gray-400">
          <p className="text-lg mb-2">Select a user to start messaging</p>
          <p className="text-sm">Choose from the user list on the right</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-900">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-900">
        <div className="text-center text-red-500">
          <p className="text-lg mb-2">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-sm text-primary-500 hover:text-primary-400"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-dark-900">
      {/* Chat Header */}
      <div className="p-4 border-b border-dark-700 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-dark-600 overflow-hidden">
              {selectedUser.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={24} className="text-gray-400" />
                </div>
              )}
            </div>
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-dark-900 ${
                selectedUser.status === 'online'
                  ? 'bg-green-500'
                  : selectedUser.status === 'away'
                  ? 'bg-yellow-500'
                  : 'bg-gray-500'
              }`}
            />
          </div>
          <div>
            <h3 className="font-medium">{selectedUser.name}</h3>
            <p className="text-sm text-gray-400">
              {isTyping ? 'Typing...' : 
               selectedUser.status === 'online' ? 'Online' : 
               selectedUser.status === 'away' ? 'Away' : 
               selectedUser.lastSeen ? `Last seen ${selectedUser.lastSeen.toLocaleTimeString()}` : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.senderId === user?.uid
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-white'
              }`}
            >
              {message.type === 'text' ? (
                <p><span style={{ fontFamily: 'inherit', fontSize: '1.15em' }}>{message.content}</span></p>
              ) : message.type === 'image' ? (
                <img
                  src={message.fileUrl}
                  alt="Shared image"
                  className="max-w-full rounded-lg"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <File size={20} />
                  <a
                    href={message.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline"
                  >
                    {message.fileName}
                  </a>
                </div>
              )}
              <div className="flex items-center justify-end space-x-1 mt-1">
                <span className="text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                {message.senderId === user?.uid && (
                  <span className="text-xs">
                    {message.status === 'sending' && <Loader2 className="w-3 h-3 animate-spin" />}
                    {message.status === 'sent' && '✓'}
                    {message.status === 'delivered' && '✓✓'}
                    {message.status === 'read' && '✓✓'}
                    {message.status === 'error' && '⚠️'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-dark-700">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 bg-dark-700 rounded-lg p-2"
              >
                <File size={16} className="text-gray-400" />
                <span className="text-sm text-gray-300">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white"
          >
            <Paperclip size={20} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-dark-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {showUndo && (
            <button
              onClick={handleUndoMessage}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Undo last message"
            >
              <Undo2 size={20} />
            </button>
          )}
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() && attachments.length === 0}
            className={`p-2 rounded-lg ${
              newMessage.trim() || attachments.length > 0
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-dark-700 text-gray-400'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectMessage; 