import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import VideoCallInterface from './VideoCallInterface';
import {
  Calendar,
  Clock,
  Users,
  MessageSquare,
  Settings,
  Plus,
} from 'lucide-react';

interface Meeting {
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
    role: 'host' | 'co-host' | 'participant';
  }[];
  startTime: Date;
  duration: number;
  status: 'scheduled' | 'ongoing' | 'ended';
  type: 'one-on-one' | 'group';
}

const ZoomMeeting: React.FC = () => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'in-call'>('idle');

  // Mock user data - replace with actual user data in production
  const localUser = {
    fullName: user?.email?.split('@')[0] || 'You',
    profileImagePath: user?.photoURL || undefined,
    isVerified: true,
    instrumentType: 'Guitar',
    musicCulture: 'Rock',
  };

  const remoteUser = activeMeeting?.participants.find(p => p.id !== user?.uid) 
    ? {
        fullName: activeMeeting.participants.find(p => p.id !== user?.uid)?.name,
        profileImagePath: activeMeeting.participants.find(p => p.id !== user?.uid)?.avatar,
        isVerified: true,
        instrumentType: 'Piano',
        musicCulture: 'Classical',
        status: 'online' as const,
      }
    : {
        fullName: 'Unknown User',
        status: 'offline' as const,
      };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'in-call') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  const handleStartMeeting = (meeting: Meeting) => {
    setActiveMeeting({
      ...meeting,
      status: 'ongoing',
    });
    setCallState('in-call');
  };

  const handleEndMeeting = () => {
    setActiveMeeting(null);
    setCallState('idle');
    setCallDuration(0);
  };

  const handleToggleVideo = () => {
    setIsVideoOff(!isVideoOff);
  };

  const handleToggleMic = () => {
    setIsMuted(!isMuted);
  };

  const handleToggleSpeaker = () => {
    // Implement speaker toggle logic
  };

  const handleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const handleSettings = () => {
    // Implement settings logic
  };

  return (
    <div className="h-full flex bg-dark-900">
      {/* Meetings List */}
      <div className="w-80 border-r border-dark-700 flex flex-col">
        <div className="p-4 border-b border-dark-700">
          <button className="w-full bg-primary-500 text-white rounded-lg py-2 px-4 flex items-center justify-center space-x-2 hover:bg-primary-600 transition-colors">
            <Plus size={20} />
            <span>New Meeting</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-400">Scheduled Meetings</h3>
          {/* Meeting list items */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {activeMeeting ? (
          <VideoCallInterface
            remoteUser={remoteUser}
            localUser={localUser}
            callState={callState}
            callDuration={callDuration}
            onToggleVideo={handleToggleVideo}
            onToggleMic={handleToggleMic}
            onToggleSpeaker={handleToggleSpeaker}
            onEndCall={handleEndMeeting}
            onScreenShare={handleScreenShare}
            onSettings={handleSettings}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-400 mb-4">No Active Meeting</h2>
              <p className="text-gray-500">Start a new meeting or join one from the list</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZoomMeeting; 