import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Share,
  Settings,
  Volume2,
  VolumeX,
  Check,
  User,
} from 'lucide-react';
import VideoCallSettingsModal from './VideoCallSettingsModal';
import { API_URL } from '../../config/constants';

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
  
  if (path.includes('drive.google.com')) {
    return getGoogleDriveDirectUrl(path);
  } else if (path.startsWith('/')) {
    return path;
  } else if (path.startsWith('http')) {
    return path;
  } else {
    return `${API_URL}${path}`;
  }
};

interface VideoCallInterfaceProps {
  remoteUser: {
    fullName?: string;
    profileImagePath?: string;
    isVerified?: boolean;
    instrumentType?: string;
    musicCulture?: string;
    status?: 'online' | 'offline' | 'away';
  };
  localUser: {
    fullName?: string;
    profileImagePath?: string;
    isVerified?: boolean;
    instrumentType?: string;
    musicCulture?: string;
  };
  callState: 'idle' | 'calling' | 'incoming' | 'in-call';
  callDuration: number;
  onToggleVideo: () => void;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
  onScreenShare: () => void;
  onSettings: () => void;
}

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({
  remoteUser,
  localUser,
  callState,
  callDuration,
  onToggleVideo,
  onToggleMic,
  onToggleSpeaker,
  onEndCall,
  onScreenShare,
  onSettings,
}) => {
  const { user } = useAuth();
  const [isLocalVideoEnabled, setIsLocalVideoEnabled] = useState(true);
  const [isRemoteVideoEnabled] = useState(true); // Placeholder for future remote video state
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // Auto-enable video when call starts
    if (callState === 'in-call' && !isLocalVideoEnabled) {
      setIsLocalVideoEnabled(true);
      onToggleVideo();
    }
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Only toggle local video
  const handleVideoToggle = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsLocalVideoEnabled(videoTrack.enabled);
      }
    } else {
      setIsLocalVideoEnabled(v => !v);
    }
    onToggleVideo();
  };

  const handleMicToggle = () => {
    setIsMicEnabled(!isMicEnabled);
    onToggleMic();
  };

  const handleSpeakerToggle = () => {
    setIsSpeakerEnabled(!isSpeakerEnabled);
    onToggleSpeaker();
  };

  // Device options for settings modal (mocked for now)
  const micOptions = [{ deviceId: 'default', label: 'Default Mic' }];
  const cameraOptions = [{ deviceId: 'default', label: 'Default Camera' }];
  const speakerOptions = [{ deviceId: 'default', label: 'Default Speaker' }];

  return (
    <div className="h-full flex flex-col bg-dark-900">
      {/* Call Status Bar */}
      <div className="bg-dark-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {remoteUser.status === 'online' ? (
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            ) : (
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            )}
            <span className="text-white">
              {callState === 'calling' ? 'Ringing...' : 
               callState === 'incoming' ? 'Incoming Call' : 
               formatDuration(callDuration)}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full hover:bg-dark-700"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4">
        {/* Local Video */}
        <div className="relative bg-dark-700 rounded-lg overflow-hidden">
          {localStream && isLocalVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden">
                  {localUser?.profileImagePath ? (
                    <img 
                      src={getProfileImageUrl(localUser.profileImagePath)} 
                      alt={localUser.fullName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
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
              {localUser?.instrumentType && (
                <p className="text-xs text-gray-500 mt-1">
                  {localUser.instrumentType}
                  {localUser.musicCulture && ` • ${localUser.musicCulture}`}
                </p>
              )}
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-dark-900/80 px-3 py-1 rounded-full text-sm text-white">
            You
          </div>
        </div>

        {/* Remote Video */}
        <div className="relative bg-dark-700 rounded-lg overflow-hidden">
          {remoteStream && isRemoteVideoEnabled ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden">
                  {remoteUser?.profileImagePath ? (
                    <img 
                      src={getProfileImageUrl(remoteUser.profileImagePath)} 
                      alt={remoteUser.fullName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
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
                {callState === 'calling' ? 'Ringing...' : 
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
      </div>

      {/* Call Controls */}
      <div className="bg-dark-800 p-4">
        <div className="flex items-center justify-center space-x-6">
          <button
            onClick={handleMicToggle}
            className={`p-4 rounded-full ${
              isMicEnabled ? 'bg-dark-700' : 'bg-red-500'
            } hover:opacity-90 transition-colors`}
          >
            {isMicEnabled ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </button>
          <button
            onClick={handleVideoToggle}
            className={`p-4 rounded-full ${
              isLocalVideoEnabled ? 'bg-dark-700' : 'bg-red-500'
            } hover:opacity-90 transition-colors`}
          >
            {isLocalVideoEnabled ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <VideoOff className="w-6 h-6 text-white" />
            )}
          </button>
          <button
            onClick={onEndCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={handleSpeakerToggle}
            className={`p-4 rounded-full ${
              isSpeakerEnabled ? 'bg-dark-700' : 'bg-red-500'
            } hover:opacity-90 transition-colors`}
          >
            {isSpeakerEnabled ? (
              <Volume2 className="w-6 h-6 text-white" />
            ) : (
              <VolumeX className="w-6 h-6 text-white" />
            )}
          </button>
          <button
            onClick={onScreenShare}
            className="p-4 rounded-full bg-dark-700 hover:opacity-90 transition-colors"
          >
            <Share className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
      {/* Settings Modal */}
      <VideoCallSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentMic={micOptions[0].deviceId}
        currentCamera={cameraOptions[0].deviceId}
        currentSpeaker={speakerOptions[0].deviceId}
        onSelectMic={() => {}}
        onSelectCamera={() => {}}
        onSelectSpeaker={() => {}}
        onSetBackground={() => {}}
        onSetVideoQuality={() => {}}
        micOptions={micOptions}
        cameraOptions={cameraOptions}
        speakerOptions={speakerOptions}
        videoQuality="auto"
        backgroundType="none"
      />
    </div>
  );
};

export default VideoCallInterface; 