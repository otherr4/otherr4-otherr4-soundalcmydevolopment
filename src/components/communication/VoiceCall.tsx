import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Users,
  Settings,
  MoreVertical,
  Clock,
  Calendar,
  Plus,
} from 'lucide-react';

interface Call {
  id: string;
  title: string;
  host: {
    id: string;
    name: string;
    avatar?: string;
  };
  participants: {
    id: string;
    name: string;
    avatar?: string;
    role: 'host' | 'participant';
    status: 'connected' | 'connecting' | 'disconnected';
  }[];
  startTime: Date;
  duration: number;
  status: 'scheduled' | 'ongoing' | 'ended';
  type: 'one-on-one' | 'group';
}

const VoiceCall: React.FC = () => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [activeCall, setActiveCall] = useState<Call | null>(null);

  const [scheduledCalls, setScheduledCalls] = useState<Call[]>([
    {
      id: '1',
      title: 'Audio Setup Support',
      host: {
        id: '1',
        name: 'Support Team',
        avatar: '👨‍💼',
      },
      participants: [
        {
          id: '1',
          name: 'Support Team',
          avatar: '👨‍💼',
          role: 'host',
          status: 'connected',
        },
        {
          id: user?.uid || '',
          name: user?.email || 'You',
          avatar: '👤',
          role: 'participant',
          status: 'connecting',
        },
      ],
      startTime: new Date(Date.now() + 1800000), // 30 minutes from now
      duration: 15, // 15 minutes
      status: 'scheduled',
      type: 'one-on-one',
    },
    {
      id: '2',
      title: 'Soundalchemy Audio Workshop',
      host: {
        id: '2',
        name: 'Technical Support',
        avatar: '👨‍💻',
      },
      participants: [
        {
          id: '2',
          name: 'Technical Support',
          avatar: '👨‍💻',
          role: 'host',
          status: 'connected',
        },
        {
          id: user?.uid || '',
          name: user?.email || 'You',
          avatar: '👤',
          role: 'participant',
          status: 'connecting',
        },
      ],
      startTime: new Date(Date.now() + 5400000), // 1.5 hours from now
      duration: 45, // 45 minutes
      status: 'scheduled',
      type: 'group',
    },
  ]);

  const handleStartCall = (call: Call) => {
    setActiveCall({
      ...call,
      status: 'ongoing',
    });
  };

  const handleEndCall = () => {
    if (activeCall) {
      setScheduledCalls(calls =>
        calls.map(c =>
          c.id === activeCall.id
            ? { ...c, status: 'ended' }
            : c
        )
      );
      setActiveCall(null);
    }
  };

  return (
    <div className="h-full flex bg-dark-900">
      {/* Calls List */}
      <div className="w-80 border-r border-dark-700 flex flex-col">
        <div className="p-4 border-b border-dark-700">
          <button className="w-full bg-primary-500 text-white rounded-lg py-2 px-4 flex items-center justify-center space-x-2 hover:bg-primary-600 transition-colors">
            <Plus size={20} />
            <span>New Call</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-400">Upcoming Calls</h3>
          {scheduledCalls
            .filter(call => call.status === 'scheduled')
            .map(call => (
              <div
                key={call.id}
                className="bg-dark-800 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{call.title}</h4>
                  <span className="text-xs text-gray-400">
                    {call.type === 'one-on-one' ? '1:1' : 'Group'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Calendar size={16} />
                  <span>
                    {new Date(call.startTime).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Clock size={16} />
                  <span>
                    {new Date(call.startTime).toLocaleTimeString()} ({call.duration} min)
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Users size={16} />
                  <span>{call.participants.length} participants</span>
                </div>
                <button
                  onClick={() => handleStartCall(call)}
                  className="w-full bg-primary-500 text-white rounded-lg py-2 hover:bg-primary-600 transition-colors"
                >
                  Join Call
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Call Area */}
      <div className="flex-1 flex flex-col">
        {activeCall ? (
          <>
            {/* Participants Grid */}
            <div className="flex-1 bg-dark-800 p-4 grid grid-cols-2 gap-4">
              {activeCall.participants.map(participant => (
                <div
                  key={participant.id}
                  className="bg-dark-700 rounded-lg p-6 flex items-center justify-center relative"
                >
                  <div className="w-24 h-24 rounded-full bg-primary-500/20 flex items-center justify-center">
                    {participant.avatar}
                  </div>
                  <div className="absolute bottom-4 left-4 bg-dark-900/80 px-3 py-1 rounded-full text-sm">
                    {participant.name}
                    {participant.role === 'host' && (
                      <span className="ml-2 text-xs text-primary-500">(Host)</span>
                    )}
                  </div>
                  <div
                    className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                      participant.status === 'connected'
                        ? 'bg-green-500'
                        : participant.status === 'connecting'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="border-t border-dark-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-3 rounded-full ${
                      isMuted ? 'bg-red-500' : 'bg-dark-700'
                    } text-white hover:bg-opacity-80 transition-colors`}
                  >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                  <button
                    onClick={() => setIsSpeakerOff(!isSpeakerOff)}
                    className={`p-3 rounded-full ${
                      isSpeakerOff ? 'bg-red-500' : 'bg-dark-700'
                    } text-white hover:bg-opacity-80 transition-colors`}
                  >
                    {isSpeakerOff ? <VolumeX size={24} /> : <Volume2 size={24} />}
                  </button>
                </div>

                <button
                  onClick={handleEndCall}
                  className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <PhoneOff size={24} />
                </button>

                <div className="flex items-center space-x-4">
                  <button className="p-3 rounded-full bg-dark-700 text-white hover:bg-dark-600 transition-colors">
                    <MessageSquare size={24} />
                  </button>
                  <button className="p-3 rounded-full bg-dark-700 text-white hover:bg-dark-600 transition-colors">
                    <Users size={24} />
                  </button>
                  <button className="p-3 rounded-full bg-dark-700 text-white hover:bg-dark-600 transition-colors">
                    <Settings size={24} />
                  </button>
                  <button className="p-3 rounded-full bg-dark-700 text-white hover:bg-dark-600 transition-colors">
                    <MoreVertical size={24} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select or start a call to begin
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCall; 