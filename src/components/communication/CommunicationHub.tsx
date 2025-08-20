import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import Tabs from '../common/Tabs';
import LiveChat from './LiveChat';
import DirectMessage from './DirectMessage';
import ZoomMeeting from './ZoomMeeting';
import VoiceCall from './VoiceCall';
import { Search, MessageSquare, Video, Phone, User, Users } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  role?: string;
}

const CommunicationHub: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeCommunicationType, setActiveCommunicationType] = useState<'message' | 'video' | 'voice' | null>(null);
  const [activeTab, setActiveTab] = useState('direct-message');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersQuery = query(collection(db, 'users'));
        const querySnapshot = await getDocs(usersQuery);
        const usersData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Unknown User',
            email: data.email || 'No email',
            avatar: data.avatar,
            status: data.status || 'offline',
            lastSeen: data.lastSeen?.toDate(),
            role: data.role || 'user'
          } as User;
        });
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const name = (user.name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower);
  });

  const handleStartCommunication = (type: 'message' | 'video' | 'voice') => {
    setActiveCommunicationType(type);
    switch (type) {
      case 'message':
        setActiveTab('direct-message');
        break;
      case 'video':
        setActiveTab('zoom-meeting');
        break;
      case 'voice':
        setActiveTab('voice-call');
        break;
    }
  };

  const tabs = [
    {
      id: 'live-chat',
      label: 'Team Chat',
      icon: '💬',
      component: <LiveChat />,
    },
    {
      id: 'direct-message',
      label: 'Direct Message',
      icon: '✉️',
      component: <DirectMessage selectedUser={selectedUser} />,
    },
    {
      id: 'zoom-meeting',
      label: 'Zoom Meeting',
      icon: '🎥',
      component: <ZoomMeeting selectedUser={selectedUser} />,
    },
    {
      id: 'voice-call',
      label: 'Voice Call',
      icon: '📞',
      component: <VoiceCall selectedUser={selectedUser} />,
    },
  ];

  return (
    <div className="h-full flex bg-dark-900">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l border-dark-700 flex flex-col">
        <div className="p-4 border-b border-dark-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-800 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400">All Users</h3>
              <span className="text-xs text-gray-500">{filteredUsers.length} users</span>
            </div>
            {users.length === 0 ? (
              <div className="text-center text-gray-400 py-4">No users found</div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? 'bg-primary-500/20'
                        : 'hover:bg-dark-700'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-dark-600 overflow-hidden">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
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
                            user.status === 'online'
                              ? 'bg-green-500'
                              : user.status === 'away'
                              ? 'bg-yellow-500'
                              : 'bg-gray-500'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{user.name}</p>
                          {user.role === 'admin' && (
                            <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {user.status === 'online' ? 'Online' : 
                           user.status === 'away' ? 'Away' : 
                           user.lastSeen ? `Last seen ${user.lastSeen.toLocaleTimeString()}` : 'Offline'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Communication Actions */}
        {selectedUser && (
          <div className="p-4 border-t border-dark-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Start Communication</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleStartCommunication('message')}
                className={`p-2 rounded-lg flex flex-col items-center justify-center space-y-1 ${
                  activeCommunicationType === 'message'
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-700 hover:bg-dark-600 text-white'
                }`}
              >
                <MessageSquare size={20} />
                <span className="text-xs">Message</span>
              </button>
              <button
                onClick={() => handleStartCommunication('video')}
                className={`p-2 rounded-lg flex flex-col items-center justify-center space-y-1 ${
                  activeCommunicationType === 'video'
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-700 hover:bg-dark-600 text-white'
                }`}
              >
                <Video size={20} />
                <span className="text-xs">Video</span>
              </button>
              <button
                onClick={() => handleStartCommunication('voice')}
                className={`p-2 rounded-lg flex flex-col items-center justify-center space-y-1 ${
                  activeCommunicationType === 'voice'
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-700 hover:bg-dark-600 text-white'
                }`}
              >
                <Phone size={20} />
                <span className="text-xs">Voice</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunicationHub; 