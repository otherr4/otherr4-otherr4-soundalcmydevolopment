import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../config/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Smile, Send, Paperclip } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  senderName: string;
}

interface AdminChatProps {
  userId: string;
  userName: string;
}

const AdminChat: React.FC<AdminChatProps> = ({ userId, userName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, `chats/${userId}/messages`),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(newMessages.reverse());
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, `chats/${userId}/messages`), {
        text: newMessage,
        senderId: 'admin',
        senderName: 'Admin',
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const addEmoji = (emoji: any) => {
    setNewMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex flex-col h-[600px] bg-dark-800 rounded-lg">
      <div className="p-4 border-b border-dark-600">
        <h3 className="text-lg font-semibold">Chat with {userName}</h3>
      </div>

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.senderId === 'admin'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-600 text-gray-200'
              }`}
            >
              <p className="text-sm font-semibold mb-1">{message.senderName}</p>
              <p>{message.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-dark-600">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:bg-dark-600 rounded-full"
          >
            <Smile size={20} />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-dark-700 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          
          <button
            type="submit"
            className="p-2 bg-primary-500 hover:bg-primary-600 rounded-full"
          >
            <Send size={20} />
          </button>
        </div>
        
        {showEmojiPicker && (
          <div className="absolute bottom-20 right-4">
            <Picker data={data} onEmojiSelect={addEmoji} />
          </div>
        )}
      </form>
    </div>
  );
};

export default AdminChat;