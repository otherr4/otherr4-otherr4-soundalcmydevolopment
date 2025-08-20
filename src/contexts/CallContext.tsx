import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocketIO } from '../hooks/useSocketIO';
import { messagingService } from '../services/messagingService';
import { getProfileImageUrl } from '../utils/profileImage';
import IncomingCallOverlay from '../components/communication/IncomingCallOverlay';

interface ConversationParticipant {
  userId: string;
  fullName?: string;
  profileImagePath?: string;
  isVerified?: boolean;
  instrumentType?: string;
  musicCulture?: string;
  status?: 'online' | 'offline' | 'away';
}

interface CallState {
  incomingCall: {
    from: string;
    type: 'audio' | 'video';
    offer: RTCSessionDescriptionInit;
  } | null;
  callState: 'idle' | 'calling' | 'incoming' | 'in-call';
  participant: ConversationParticipant | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideoEnabled: boolean;
  isMicEnabled: boolean;
  isSpeakerEnabled: boolean;
  callDuration: number;
}

interface CallContextType extends CallState {
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  makeCall: (userId: string, type: 'audio' | 'video') => Promise<void>;
  endCall: () => Promise<void>;
  toggleVideo: () => void;
  toggleMic: () => void;
  toggleSpeaker: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, getUserProfile } = useAuth();
  const [callState, setCallState] = useState<CallState>({
    incomingCall: null,
    callState: 'idle',
    participant: null,
    localStream: null,
    remoteStream: null,
    isVideoEnabled: true,
    isMicEnabled: true,
    isSpeakerEnabled: true,
    callDuration: 0,
  });
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const ringtoneAudio = useRef<HTMLAudioElement | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket for the current user
  const { socket, isConnected } = useSocketIO(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
    auth: user ? { token: user.uid } : undefined,
  });

  // Initialize call signaling for every user
  useEffect(() => {
    if (user && socket) {
      messagingService.initCallSignaling(socket, user.uid);
    }
  }, [user, socket]);

  useEffect(() => {
    if (!user) return;

    const handleCallSignal = async (type: string, data: any) => {
      console.log('[CallProvider] Received call signal:', type, data);

      switch (type) {
        case 'offer':
          const callerProfile = await getUserProfile(data.from);
          setCallState(prev => ({
            ...prev,
            incomingCall: { from: data.from, type: data.callType, offer: data.offer },
            callState: 'incoming',
            participant: {
              userId: data.from,
              fullName: callerProfile?.fullName,
              profileImagePath: callerProfile?.profileImagePath,
              isVerified: callerProfile?.isVerified,
              instrumentType: callerProfile?.instrumentType,
              musicCulture: callerProfile?.musicCulture,
              status: 'online',
            },
          }));
          if (ringtoneAudio.current) {
            ringtoneAudio.current.currentTime = 0;
            ringtoneAudio.current.play();
          }
          break;

        case 'answer':
          if (peerConnection.current) {
            await peerConnection.current.setRemoteDescription(data.answer);
          }
          setCallState(prev => ({ ...prev, callState: 'in-call' }));
          startCallDurationTimer();
          break;

        case 'ice-candidate':
          if (peerConnection.current) {
            await peerConnection.current.addIceCandidate(data.candidate);
          }
          break;

        case 'end':
          endCall();
          break;
      }
    };

    messagingService.onCallSignal(handleCallSignal);
  }, [user]);

  const startCallDurationTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    durationInterval.current = setInterval(() => {
      setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
    }, 1000);
  };

  const stopCallDurationTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  };

  const makeCall = async (userId: string, type: 'audio' | 'video') => {
    if (!user || !socket) return;

    try {
      const recipientProfile = await getUserProfile(userId);
      setCallState(prev => ({
        ...prev,
        callState: 'calling',
        participant: {
          userId,
          fullName: recipientProfile?.fullName,
          profileImagePath: recipientProfile?.profileImagePath,
          isVerified: recipientProfile?.isVerified,
          instrumentType: recipientProfile?.instrumentType,
          musicCulture: recipientProfile?.musicCulture,
          status: 'online',
        },
      }));

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });

      setCallState(prev => ({ ...prev, localStream: stream, isVideoEnabled: type === 'video' }));

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      peerConnection.current = pc;

      // Add local stream
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle remote stream
      pc.ontrack = (event) => {
        setCallState(prev => ({ ...prev, remoteStream: event.streams[0] }));
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      messagingService.sendCallSignal('offer', {
        to: userId,
        from: user.uid,
        callType: type,
        offer,
      });

    } catch (error) {
      console.error('Error making call:', error);
      endCall();
    }
  };

  const acceptCall = async () => {
    if (!callState.incomingCall || !user || !socket) return;

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callState.incomingCall.type === 'video',
      });

      setCallState(prev => ({ 
        ...prev, 
        localStream: stream,
        isVideoEnabled: callState.incomingCall!.type === 'video',
      }));

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      peerConnection.current = pc;

      // Add local stream
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle remote stream
      pc.ontrack = (event) => {
        setCallState(prev => ({ ...prev, remoteStream: event.streams[0] }));
      };

      // Set remote description (offer)
      await pc.setRemoteDescription(callState.incomingCall.offer);

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      messagingService.sendCallSignal('answer', {
        to: callState.incomingCall.from,
        answer,
      });

      setCallState(prev => ({ ...prev, callState: 'in-call' }));
      startCallDurationTimer();

      if (ringtoneAudio.current) {
        ringtoneAudio.current.pause();
        ringtoneAudio.current.currentTime = 0;
      }

    } catch (error) {
      console.error('Error accepting call:', error);
      endCall();
    }
  };

  const rejectCall = async () => {
    if (!callState.incomingCall) return;

    messagingService.sendCallSignal('end', {
      to: callState.incomingCall.from,
    });

    if (ringtoneAudio.current) {
      ringtoneAudio.current.pause();
      ringtoneAudio.current.currentTime = 0;
    }

    setCallState(prev => ({
      ...prev,
      incomingCall: null,
      callState: 'idle',
      participant: null,
      localStream: null,
      remoteStream: null,
      callDuration: 0,
    }));
  };

  const endCall = async () => {
    // Send end signal to peer
    if (callState.participant) {
      await messagingService.sendCallSignal('end', {
        to: callState.participant.userId,
      });
    }

    // Stop all tracks
    callState.localStream?.getTracks().forEach(track => track.stop());
    callState.remoteStream?.getTracks().forEach(track => track.stop());

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Stop duration timer
    stopCallDurationTimer();

    // Reset state
    setCallState({
      incomingCall: null,
      callState: 'idle',
      participant: null,
      localStream: null,
      remoteStream: null,
      isVideoEnabled: true,
      isMicEnabled: true,
      isSpeakerEnabled: true,
      callDuration: 0,
    });
  };

  const toggleVideo = () => {
    if (callState.localStream) {
      const videoTrack = callState.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
      }
    }
  };

  const toggleMic = () => {
    if (callState.localStream) {
      const audioTrack = callState.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMicEnabled: audioTrack.enabled }));
      }
    }
  };

  const toggleSpeaker = () => {
    setCallState(prev => ({ ...prev, isSpeakerEnabled: !prev.isSpeakerEnabled }));
    // Implement actual speaker toggle logic here
  };

  return (
    <CallContext.Provider 
      value={{
        ...callState,
        acceptCall,
        rejectCall,
        makeCall,
        endCall,
        toggleVideo,
        toggleMic,
        toggleSpeaker,
      }}
    >
      {children}
      {/* Global ringtone audio */}
      <audio ref={ringtoneAudio} src="/ringtone.mp3" loop style={{ display: 'none' }} />
      {/* Incoming call overlay */}
      {callState.callState === 'incoming' && callState.incomingCall && (
        <IncomingCallOverlay
          participant={callState.participant}
          callType={callState.incomingCall.type}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
    </CallContext.Provider>
  );
};

export default CallContext; 