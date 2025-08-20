import React from 'react';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { getProfileImageUrl } from '../../utils/profileImage';

interface IncomingCallOverlayProps {
  participant: {
    userId: string;
    fullName?: string;
    profileImagePath?: string;
    isVerified?: boolean;
    instrumentType?: string;
    musicCulture?: string;
  } | null;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallOverlay: React.FC<IncomingCallOverlayProps> = ({
  participant,
  callType,
  onAccept,
  onReject,
}) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80">
      <div className="bg-dark-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center w-full max-w-md">
        {/* Profile image */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-500">
            <img
              src={getProfileImageUrl(participant || { profileImagePath: undefined })}
              alt={participant?.fullName || 'Musician'}
              className="w-full h-full object-cover"
              onError={e => {
                (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
              }}
            />
          </div>
        </div>

        {/* Caller info */}
        <h2 className="text-white text-xl font-bold mb-1">
          {participant?.fullName || 'Unknown Caller'}
        </h2>
        <div className="text-gray-400 text-sm mb-4 flex items-center">
          {callType === 'video' ? (
            <>
              <Video size={16} className="mr-1" />
              Video Call
            </>
          ) : (
            <>
              <Phone size={16} className="mr-1" />
              Audio Call
            </>
          )}
        </div>

        {/* Additional info */}
        {participant?.instrumentType && (
          <p className="text-sm text-gray-500 mb-4">
            {participant.instrumentType}
            {participant.musicCulture && ` • ${participant.musicCulture}`}
          </p>
        )}

        {/* Call controls */}
        <div className="flex gap-8 mt-2 mb-2">
          <button
            onClick={onAccept}
            className="p-4 rounded-full bg-green-600 text-white hover:bg-green-700 shadow-lg transition-colors flex flex-col items-center"
          >
            <Phone className="w-6 h-6 mb-1" />
            <span className="text-sm">Accept</span>
          </button>
          <button
            onClick={onReject}
            className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg transition-colors flex flex-col items-center"
          >
            <PhoneOff className="w-6 h-6 mb-1" />
            <span className="text-sm">Decline</span>
          </button>
        </div>

        {/* Ringing indicator */}
        <div className="mt-4 text-gray-300 text-sm animate-pulse flex items-center">
          <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 animate-ping"></span>
          Incoming call...
        </div>
      </div>
    </div>
  );
};

export default IncomingCallOverlay; 