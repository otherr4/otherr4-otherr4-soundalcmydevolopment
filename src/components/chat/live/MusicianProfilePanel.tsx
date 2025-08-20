import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getProfileImageUrl } from '../../../utils/imageUtils';

const MusicianProfilePanel: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) setProfile(snap.data());
    });
  }, [user]);

  if (!user || !profile) return null;

  // Determine the correct profile image URL
  const profileImageUrl = getProfileImageUrl(profile.profileImagePath || user.photoURL);

  return (
    <div className="p-4 rounded-lg bg-gray-800/70 border border-primary-500/30 shadow-inner flex flex-col items-center">
      <img
        src={profileImageUrl}
        alt={profile.fullName || user.displayName || 'Musician'}
        className="w-16 h-16 rounded-full border-2 border-primary-400 mb-2 object-cover"
        onError={e => { e.currentTarget.src = '/default-avatar.svg'; }}
      />
      <div className="text-white font-bold text-lg">{profile.fullName || user.displayName || 'Musician'}</div>
      <div className="text-primary-300 text-sm">
        {profile.instrumentType || 'Instrument'}
        {profile.instrumentType && profile.musicCulture && ' • '}
        {profile.musicCulture || 'Genre'}
      </div>
      <div className="text-gray-400 text-xs mb-2">{profile.country || 'Country'}</div>
      {profile.isVerified && (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/80 text-white mb-2">Verified</span>
      )}
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/80 text-white mb-2">online</span>
      {profile.bio && (
        <div className="mt-3 text-xs text-gray-400 text-center">{profile.bio}</div>
      )}
    </div>
  );
};

export default MusicianProfilePanel; 