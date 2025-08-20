import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getProfileImageUrlWithFallback } from '../../utils/imageUtils';
import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserPlus, X, XCircle, Loader, CheckCircle } from 'lucide-react';

interface MusicianChannelHeaderProps {
  uid: string;
  videoCount: number;
}

// Use the centralized image utility function

const MusicianChannelHeader: React.FC<MusicianChannelHeaderProps> = ({ uid, videoCount }) => {
  const { getUserProfile, user, userProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Friend system states
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendRequestData, setFriendRequestData] = useState<any>(null);
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        // If uid is 'me', use the current user's UID
        const effectiveUid = uid === 'me' ? user?.uid : uid;
        console.log('Fetching profile for UID:', effectiveUid);
        
        if (effectiveUid) {
          const profileData = await getUserProfile(effectiveUid);
          console.log('Fetched profile data:', profileData);
          setProfile(profileData);
        } else {
          console.log('No effective UID found');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid, getUserProfile, user]);

  // Friend status tracking
  useEffect(() => {
    if (!user || !uid || user.uid === uid) return;
    
    const q = query(collection(db, 'friendRequests'),
      where('from', 'in', [user.uid, uid]),
      where('to', 'in', [user.uid, uid])
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      let found = false;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (
          (data.from === user.uid && data.to === uid) ||
          (data.from === uid && data.to === user.uid)
        ) {
          found = true;
          setFriendRequestId(docSnap.id);
          setFriendRequestData({ ...data, id: docSnap.id });
          if (data.status === 'pending') {
            setFriendStatus('pending');
          } else if (data.status === 'accepted') {
            setFriendStatus('friends');
          } else {
            setFriendStatus('none');
          }
        }
      });
      if (!found) {
        setFriendStatus('none');
        setFriendRequestId(null);
        setFriendRequestData(null);
      }
    });
    
    return () => unsub();
  }, [user, uid]);

  // Check if users are friends
  useEffect(() => {
    if (!user || !profile || !userProfile || !uid) return;
    if (user.uid === uid) return;
    
    // If either user has the other as a friend, set status to 'friends'
    const isFriends = (
      (Array.isArray(profile?.friends) && profile.friends.includes(user.uid)) ||
      (Array.isArray(userProfile?.friends) && userProfile.friends.includes(uid))
    );
    
    if (isFriends) {
      if (friendStatus !== 'friends') setFriendStatus('friends');
    } else if (friendStatus === 'friends') {
      setFriendStatus('none');
    }
  }, [user, profile, userProfile, uid, friendStatus]);

  // Friend request handlers
  const handleAddFriend = async () => {
    if (!user || !uid || user.uid === uid) return;
    setFriendLoading(true);
    setFriendError(null);
    try {
      if (friendStatus === 'pending' || friendStatus === 'friends') return;
      await addDoc(collection(db, 'friendRequests'), {
        from: user.uid,
        to: uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'users', uid, 'notifications'), {
        type: 'friend_request',
        from: user.uid,
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (e) {
      setFriendError('Failed to send request.');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleConfirmRequest = async () => {
    if (!user || !uid || !friendRequestId) return;
    setFriendLoading(true);
    setFriendError(null);
    try {
      // Update the friend request status to 'accepted'
      await updateDoc(doc(db, 'friendRequests', friendRequestId), { status: 'accepted' });
      // Add each user to the other's friends list
      const fromUserDoc = await getDoc(doc(db, 'users', uid));
      const toUserDoc = await getDoc(doc(db, 'users', user.uid));
      if (fromUserDoc.exists() && toUserDoc.exists()) {
        const fromFriends = fromUserDoc.data().friends || [];
        const toFriends = toUserDoc.data().friends || [];
        if (!fromFriends.includes(user.uid)) {
          await updateDoc(doc(db, 'users', uid), { friends: [...fromFriends, user.uid] });
        }
        if (!toFriends.includes(uid)) {
          await updateDoc(doc(db, 'users', user.uid), { friends: [...toFriends, uid] });
        }
      }
      // Delete the friend request document after confirming
      await deleteDoc(doc(db, 'friendRequests', friendRequestId));
    } catch (e) {
      setFriendError('Failed to confirm request.');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!user || !uid || !friendRequestId) return;
    setFriendLoading(true);
    setFriendError(null);
    try {
      await updateDoc(doc(db, 'friendRequests', friendRequestId), { status: 'declined' });
      await deleteDoc(doc(db, 'friendRequests', friendRequestId));
      setFriendStatus('none');
    } catch (e) {
      setFriendError('Failed to decline request.');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!friendRequestId) return;
    setFriendLoading(true);
    setFriendError(null);
    try {
      await updateDoc(doc(db, 'friendRequests', friendRequestId), { status: 'cancelled' });
      await deleteDoc(doc(db, 'friendRequests', friendRequestId));
      setFriendStatus('none');
    } catch (e) {
      setFriendError('Failed to cancel request.');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!user || !uid) return;
    setFriendLoading(true);
    setFriendError(null);
    try {
      // Remove each user from the other's friends list
      const fromUserDoc = await getDoc(doc(db, 'users', uid));
      const toUserDoc = await getDoc(doc(db, 'users', user.uid));
      if (fromUserDoc.exists() && toUserDoc.exists()) {
        const fromFriends = fromUserDoc.data().friends || [];
        const toFriends = toUserDoc.data().friends || [];
        const updatedFromFriends = fromFriends.filter((id: string) => id !== user.uid);
        const updatedToFriends = toFriends.filter((id: string) => id !== uid);
        await updateDoc(doc(db, 'users', uid), { friends: updatedFromFriends });
        await updateDoc(doc(db, 'users', user.uid), { friends: updatedToFriends });
      }
      setFriendStatus('none');
      setShowUnfriendModal(false);
    } catch (e) {
      setFriendError('Failed to unfriend.');
    } finally {
      setFriendLoading(false);
    }
  };

  const displayName = profile?.displayName || user?.displayName || 'Musician Channel';
  const username = profile?.username || user?.email?.split('@')[0] || (uid === 'me' ? user?.uid?.slice(0, 8) : uid?.slice(0, 8));
  const profilePhoto = getProfileImageUrlWithFallback(profile?.photoURL || user?.photoURL);

  console.log('Display name:', displayName);
  console.log('Username:', username);
  console.log('Profile photo URL:', profilePhoto);

  return (
    <div className="w-full h-56 bg-gradient-to-r from-primary-700 to-dark-800 flex items-end p-6">
      <div className="flex items-end gap-6">
        <div className="w-32 h-32 rounded-full bg-dark-700 border-4 border-white overflow-hidden">
          {loading ? (
            <div className="w-full h-full bg-gray-600 animate-pulse"></div>
          ) : (
            <img 
              src={profilePhoto} 
              alt="Avatar" 
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log('Image failed to load, using default');
                e.currentTarget.src = '/default-avatar.svg';
              }}
            />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold text-white">
              {loading ? 'Loading...' : displayName}
            </h1>
            {profile?.isVerified && (
              <CheckCircle className="w-6 h-6 text-blue-500" />
            )}
          </div>
          <div className="text-gray-300">@{username}</div>
          <div className="text-gray-400 text-sm mt-2">{videoCount} videos</div>
          {profile?.bio && <div className="text-gray-200 text-sm mt-2 max-w-xl">{profile.bio}</div>}
          
          {/* Friend Request Banner (Confirm/Decline) */}
          {friendStatus === 'pending' && friendRequestData && friendRequestData.status === 'pending' && friendRequestData.to === user?.uid && (
            <div className="mt-4 bg-gradient-to-r from-yellow-900/90 to-orange-900/90 border border-yellow-500/50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-semibold">Friend Request</span>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm"
                  onClick={handleConfirmRequest}
                  disabled={friendLoading}
                >
                  {friendLoading ? <Loader className="animate-spin w-4 h-4" /> : 'Confirm'}
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm"
                  onClick={handleDeclineRequest}
                  disabled={friendLoading}
                >
                  {friendLoading ? <Loader className="animate-spin w-4 h-4" /> : 'Decline'}
                </button>
              </div>
            </div>
          )}
          
          {/* Friend Action Buttons */}
          {user && user.uid !== uid && (
            <div className="mt-4">
              {friendStatus === 'none' && (
                <button
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={handleAddFriend}
                  disabled={friendLoading}
                >
                  {friendLoading ? <Loader className="animate-spin w-5 h-5" /> : <UserPlus className="w-5 h-5" />} Add Friend
                </button>
              )}
              
              {friendStatus === 'pending' && friendRequestData && friendRequestData.status === 'pending' && friendRequestData.from === user.uid && (
                <div className="flex items-center gap-3">
                  <button
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-yellow-500/90 text-white font-semibold cursor-not-allowed"
                    disabled
                  >
                    <Loader className="animate-spin w-5 h-5" /> Request Sent
                  </button>
                  <button
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-yellow-500 bg-transparent hover:bg-yellow-500/10 text-yellow-500 font-semibold"
                    onClick={handleCancelRequest}
                    disabled={friendLoading}
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              )}
              
              {friendStatus === 'friends' && (
                <button
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setShowUnfriendModal(true)}
                  disabled={friendLoading}
                >
                  {friendLoading ? <Loader className="animate-spin w-5 h-5" /> : <XCircle className="w-5 h-5" />} Unfriend
                </button>
              )}
            </div>
          )}
          
          {friendError && (
            <div className="mt-2 text-red-400 text-sm">{friendError}</div>
          )}
        </div>
      </div>
      
      {/* Unfriend Confirmation Modal */}
      {showUnfriendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-dark-900 rounded-2xl shadow-2xl p-6 max-w-xs w-full flex flex-col items-center">
            <XCircle className="w-10 h-10 text-red-500 mb-2" />
            <div className="text-white text-lg font-semibold mb-2 text-center">Are you sure you want to unfriend?</div>
            <div className="flex gap-4 mt-4">
              <button
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow"
                onClick={handleUnfriend}
                disabled={friendLoading}
              >
                {friendLoading ? <Loader className="animate-spin w-4 h-4" /> : 'Unfriend'}
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold shadow"
                onClick={() => setShowUnfriendModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicianChannelHeader; 