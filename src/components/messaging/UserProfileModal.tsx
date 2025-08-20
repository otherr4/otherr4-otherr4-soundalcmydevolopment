import React from 'react';
import { X, Phone, Video, Mail, User, Globe, Music, Info } from 'lucide-react';
import { getCountryInfo } from '../../utils/countries';
import { getProfileImageUrl } from '../../utils/profileImage';

const UserProfileModal = ({ friend, onClose, onCall, onVideoCall }) => {
  if (!friend) return null;
  const countryInfo = getCountryInfo(friend.country || 'US');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-dark-800 rounded-2xl p-6 w-full max-w-sm relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <img
            src={getProfileImageUrl(friend)}
            alt={friend.fullName}
            className="w-24 h-24 rounded-full object-cover mb-3 border-4 border-primary-500 shadow-lg"
          />
          {/* Call/Video Buttons below profile image */}
          <div className="flex justify-center gap-6 mb-3">
            <button
              onClick={onCall}
              className="p-3 rounded-full bg-primary-500/20 hover:bg-primary-500/40 text-primary-400 shadow"
              title="Call"
            >
              <Phone className="w-6 h-6" />
            </button>
            <button
              onClick={onVideoCall}
              className="p-3 rounded-full bg-primary-500/20 hover:bg-primary-500/40 text-primary-400 shadow"
              title="Video Call"
            >
              <Video className="w-6 h-6" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{friend.fullName}</h2>
          <p className="text-gray-400 mb-2 flex items-center gap-2">
            <Music className="w-4 h-4" />
            {friend.instrumentType || 'Instrument'}
            <span className="mx-1">•</span>
            {friend.musicCulture || 'Music Culture'}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-primary-400" />
            <span className="text-2xl">{countryInfo.flag}</span>
            <span className="text-gray-300">{countryInfo.name}</span>
          </div>
          {/* Status */}
          <div className="mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-primary-400" />
            <span className={`text-sm font-medium ${friend.status === 'online' ? 'text-green-400' : friend.status === 'away' ? 'text-yellow-400' : 'text-gray-400'}`}>{friend.status ? friend.status.charAt(0).toUpperCase() + friend.status.slice(1) : 'Offline'}</span>
          </div>
          {/* About/Bio */}
          {friend.bio && (
            <div className="w-full mt-2 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-primary-400" />
                <span className="text-gray-300 font-semibold text-base">About</span>
              </div>
              <div className="bg-dark-700/60 border border-dark-600 rounded-xl p-4 shadow-inner max-h-40 overflow-y-auto transition-all duration-300 hover:shadow-lg custom-scrollbar">
                <p className="text-gray-200 text-sm leading-relaxed font-medium whitespace-pre-line break-words" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {friend.bio}
                </p>
              </div>
            </div>
          )}
          {/* Email */}
          <div className="w-full flex items-center gap-2 mt-2">
            <Mail className="w-4 h-4 text-primary-400" />
            <span className="text-gray-300 text-sm">{friend.email || 'No email provided'}</span>
          </div>
          {/* Phone */}
          <div className="w-full flex items-center gap-2 mt-2">
            <Phone className="w-4 h-4 text-primary-400" />
            <span className="text-gray-300 text-sm">{friend.phoneNumber || 'No phone number'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal; 