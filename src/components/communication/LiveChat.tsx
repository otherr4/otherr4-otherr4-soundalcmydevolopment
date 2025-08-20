import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Smile, Paperclip, Mic, Video, Phone } from 'lucide-react';

interface Message {
  id: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
}

const LiveChat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [onlineUsers, setOnlineUsers] = useState([
    { id: '1', name: 'Support Team', avatar: '👨‍💼', status: 'online' },
    { id: '2', name: 'Technical Support', avatar: '👨‍💻', status: 'online' },
    { id: '3', name: 'Community Manager', avatar: '👩‍💼', status: 'away' },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      sender: {
        id: user?.uid || '',
        name: user?.email || 'Anonymous',
      },
      content: newMessage,
      timestamp: new Date(),
      type: 'text',
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  return (
    <div className="h-full flex flex-col bg-dark-900">
      {/* Online Users Sidebar */}
      <div className="flex h-full">
        <div className="w-64 border-r border-dark-700 p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Online Support</h3>
          <div className="space-y-3">
            {onlineUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-dark-800 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender.id === user?.uid ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.sender.id === user?.uid
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-800 text-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium">{message.sender.name}</span>
                    <span className="text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm"><span style={{ fontFamily: 'inherit', fontSize: '1.15em' }}>{message.content}</span></p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-dark-700 p-4">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Paperclip size={20} />
              </button>
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Smile size={20} />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-dark-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Mic size={20} />
                </button>
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Video size={20} />
                </button>
                <button
                  type="submit"
                  className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveChat; 