import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../common/Avatar';
import { MessageBubble } from './MessageBubble';
import { EmojiPicker } from './EmojiPicker';
import { AttachmentButton } from './AttachmentButton';

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: any;
  attachments?: string[];
  status: 'sent' | 'delivered' | 'read';
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!selectedUser || !user) return;

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', [user.uid, selectedUser].sort().join('_')),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(newMessages);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [selectedUser, user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !user) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        senderId: user.uid,
        receiverId: selectedUser,
        timestamp: serverTimestamp(),
        participants: [user.uid, selectedUser].sort().join('_'),
        status: 'sent',
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center px-6 py-3 bg-white border-b">
          {selectedUser && (
            <div className="flex items-center space-x-4">
              <Avatar userId={selectedUser} size="md" />
              <div>
                <h2 className="text-lg font-semibold">User Name</h2>
                <p className="text-sm text-gray-500">Online</p>
              </div>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === user?.uid}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="px-6 py-3 bg-white border-t">
          <div className="flex items-center space-x-4">
            <EmojiPicker onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)} />
            <AttachmentButton onAttach={(files) => console.log('Attachments:', files)} />
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-500 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 