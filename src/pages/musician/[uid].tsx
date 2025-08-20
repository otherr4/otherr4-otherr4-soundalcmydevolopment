import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeCheck, Users, Music, MapPin, Star, BarChart2, UserPlus, Loader, X, Check, XCircle, User, UserCircle, Image as ImageIcon, Info, Layers, Camera, X as CloseIcon, Pencil, ArrowLeft, Play, ExternalLink, Heart, Eye, Handshake, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SEO from '../../components/common/SEO';
import SpotifyTab from './SpotifyTab';
import { getMusicVideos, MusicVideo, trackVideoView } from '../../services/musicVideoService';
import LikeButton from '../../components/musicvideo/LikeButton';
import { getProfileImageUrlWithFallback } from '../../utils/imageUtils';
import { getUserCollaborations, getUserParticipatingCollaborations, createCollaboration } from '../../services/collaborationService';
import { Collaboration } from '../../types/collaboration';

// Helper to get direct Google Drive image URL
function getGoogleDriveDirectUrl(url: string): string {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    let fileId = '';
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch) {
      fileId = fileIdMatch[1];
    } else {
      const ucMatch = url.match(/[?&]id=([^&]+)/);
      if (ucMatch) fileId = ucMatch[1];
      else {
        const openMatch = url.match(/\bid=([^&]+)/);
        if (openMatch) fileId = openMatch[1];
      }
    }
    if (fileId) {
      return `https://images.weserv.nl/?url=drive.google.com/uc?export=view%26id=${fileId}`;
    }
  }
  return url;
}

// Helper to get country flag emoji
function getCountryFlag(countryCode: string): string {
  if (!countryCode) return '';
  // Only works for ISO country codes (A-Z)
  return Array.from(countryCode.toUpperCase())
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

// Helper to get mutual friends
function getMutualFriends(userFriends: string[], profileFriends: string[], allUsers: any[]): any[] {
  if (!userFriends || !profileFriends) return [];
  const mutualIds = userFriends.filter((id) => profileFriends.includes(id));
  return allUsers.filter((u) => mutualIds.includes(u.uid));
}

// Helper to extract YouTube video ID
const extractYouTubeVideoId = (url: string) => {
  const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : '';
};

const TABS = [
  { key: 'timeline', label: 'Timeline', icon: <Layers className="w-4 h-4" /> },
  { key: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
  { key: 'friends', label: 'Friends', icon: <Users className="w-4 h-4" /> },
  { key: 'videos', label: 'Videos', icon: <Play className="w-4 h-4" /> },
  { key: 'collaborations', label: 'Collaborations', icon: <Handshake className="w-4 h-4" /> },
  { key: 'projects', label: 'Projects', icon: <Music className="w-4 h-4" /> },
  { key: 'media', label: 'Media', icon: <Camera className="w-4 h-4" /> },
  { key: 'spotify', label: 'Spotify', icon: <Music className="w-4 h-4" /> },
];

const PublicMusicianProfile: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendRequestData, setFriendRequestData] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('timeline');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [analytics, setAnalytics] = useState<any>({});
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<MusicVideo | null>(null);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [participatingCollaborations, setParticipatingCollaborations] = useState<Collaboration[]>([]);
  const [collaborationsLoading, setCollaborationsLoading] = useState(false);

  // Debug function to create a test collaboration
  const createTestCollaboration = async () => {
    if (!user || !uid) return;
    
    try {
      const testCollaboration = {
        title: 'Test Collaboration - Profile Debug',
        description: 'This is a test collaboration created from the profile page to debug the collaborations display.',
        creatorId: uid,
        creatorName: profile?.fullName || 'Test Musician',
        creatorAvatar: profile?.profileImagePath || undefined,
        genre: 'Pop',
        instruments: ['Vocals', 'Guitar', 'Piano'],
        collaborationType: 'cover' as const,
        status: 'open' as const,
        privacy: 'public' as const,
        maxParticipants: 5,
        currentParticipants: 1,
        participants: [],
        requirements: ['Must be able to sing', 'Experience with pop music'],
        timeline: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          milestones: []
        },
        attachments: [],
        tags: ['test', 'debug', 'profile'],
        location: 'online' as const,
        locationDetails: 'Online collaboration',
        compensation: 'free' as const,
        compensationDetails: 'Free collaboration for testing',
        isVerified: true
      };

      console.log('Creating test collaboration for profile:', testCollaboration);
      const collaborationId = await createCollaboration(testCollaboration);
      console.log('Test collaboration created with ID:', collaborationId);
      
      // Reload collaborations
      const createdCollabs = await getUserCollaborations(uid);
      setCollaborations(createdCollabs);
    } catch (error) {
      console.error('Error creating test collaboration:', error);
    }
  };

  // Debug function to refresh collaborations
  const refreshCollaborations = async () => {
    if (!uid) return;
    
    try {
      console.log('Manually refreshing collaborations for user:', uid);
      const createdCollabs = await getUserCollaborations(uid);
      const participatingCollabs = await getUserParticipatingCollaborations(uid);
      
      console.log('Refreshed - Created collaborations:', createdCollabs.length);
      console.log('Refreshed - Participating collaborations:', participatingCollabs.length);
      
      setCollaborations(createdCollabs);
      setParticipatingCollaborations(participatingCollabs);
    } catch (error) {
      console.error('Error refreshing collaborations:', error);
    }
  };

  // Debug function to test collaboration fetching (can be called from console)
  const testCollaborationFetching = async () => {
    if (!uid) {
      console.log('No UID available');
      return;
    }
    
    console.log('🧪 Testing collaboration fetching for user:', uid);
    
    try {
      // Test getUserCollaborations
      console.log('📋 Testing getUserCollaborations...');
      const createdCollabs = await getUserCollaborations(uid);
      console.log('✅ getUserCollaborations result:', createdCollabs);
      
      // Test getUserParticipatingCollaborations
      console.log('👥 Testing getUserParticipatingCollaborations...');
      const participatingCollabs = await getUserParticipatingCollaborations(uid);
      console.log('✅ getUserParticipatingCollaborations result:', participatingCollabs);
      
      // Test direct Firestore query
      console.log('🔥 Testing direct Firestore query...');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const collaborationsRef = collection(db, 'collaborations');
      const userQuery = query(collaborationsRef, where('creatorId', '==', uid));
      const snapshot = await getDocs(userQuery);
      
      console.log(`✅ Direct query found ${snapshot.size} collaborations`);
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${data.title} (${data.status})`);
      });
      
    } catch (error) {
      console.error('❌ Error in testCollaborationFetching:', error);
    }
  };

  // Expose debug function to window for console access
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testCollaborationFetching = testCollaborationFetching;
      (window as any).refreshCollaborations = refreshCollaborations;
      (window as any).createTestCollaboration = createTestCollaboration;
    }
  }, [uid]);

  // Fetch profile and analytics
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) {
          setNotFound(true);
          setProfile(null);
        } else {
          setProfile(userDoc.data());
          setNotFound(false);
        }
        // Fetch analytics from user doc or analytics collection
        let analyticsData = {};
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.analytics) analyticsData = data.analytics;
        }
        setAnalytics(analyticsData);
      } catch (e) {
        setNotFound(true);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  // Fetch videos for the musician
  useEffect(() => {
    if (!uid) return;
    setVideosLoading(true);

    // If viewing your own profile
    if (user && user.uid === uid) {
      getMusicVideos(user.uid).then((allVideos) => {
        // Only show videos that belong to the logged-in user
        const filteredVideos = allVideos.filter(video => video.musicianId === user.uid);
        setVideos(filteredVideos);
      }).finally(() => setVideosLoading(false));
    } else {
      // Viewing another musician's profile
      getMusicVideos(uid).then((allVideos) => {
        // Only show public videos that belong to the profile owner
        const filteredVideos = allVideos.filter(
          video => video.musicianId === uid && video.privacy === 'public'
        );
        setVideos(filteredVideos);
      }).finally(() => setVideosLoading(false));
    }
  }, [uid, user]);
  
  // Fetch collaborations for the musician
  useEffect(() => {
    if (!uid) return;
    setCollaborationsLoading(true);
    
    const fetchCollaborations = async () => {
      try {
        console.log('Fetching collaborations for user:', uid);
        
        // Get collaborations created by the user
        const createdCollabs = await getUserCollaborations(uid);
        console.log('Created collaborations for', uid, ':', createdCollabs);
        
        // Filter to only show public collaborations when viewing someone else's profile
        const filteredCreatedCollabs = user && user.uid !== uid 
          ? createdCollabs.filter(collab => collab.privacy === 'public')
          : createdCollabs;
        
        setCollaborations(filteredCreatedCollabs);
        
        // Get collaborations where the user is a participant
        const participatingCollabs = await getUserParticipatingCollaborations(uid);
        console.log('Participating collaborations for', uid, ':', participatingCollabs);
        
        // Filter to only show public collaborations when viewing someone else's profile
        const filteredParticipatingCollabs = user && user.uid !== uid 
          ? participatingCollabs.filter(collab => collab.privacy === 'public')
          : participatingCollabs;
        
        setParticipatingCollaborations(filteredParticipatingCollabs);
      } catch (error) {
        console.error('Error fetching collaborations:', error);
        // Don't throw error, just set empty arrays
        setCollaborations([]);
        setParticipatingCollaborations([]);
      } finally {
        setCollaborationsLoading(false);
      }
    };

    fetchCollaborations();
  }, [uid, user]);

  // Increment profile views if not owner and not already counted in this session
  useEffect(() => {
    if (!user || !uid || user.uid === uid) return;
    const sessionKey = `profile_viewed_${uid}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, 'true');
    (async () => {
      try {
        // Increment analytics.profileViews atomically
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
          'analytics.profileViews': (profile?.analytics?.profileViews || 0) + 1
        });
        // Optionally, update local state
        setAnalytics((prev: any) => ({ ...prev, profileViews: (prev?.profileViews || 0) + 1 }));
      } catch (e) {
        // Ignore errors
      }
    })();
  }, [user, uid, profile]);

  useEffect(() => {
    // Fetch all users for mutual friends
    (async () => {
      // Correctly fetch all users using getDocs
      const { getDocs } = await import('firebase/firestore');
      const usersSnap = await getDocs(collection(db, 'users'));
      setAllUsers(usersSnap.docs.map(doc => ({ ...doc.data(), uid: doc.id })));
    })();
  }, []);

  useEffect(() => {
    if (user && user.uid === uid) {
      navigate('/profile');
    }
  }, [user, uid, navigate]);

  useEffect(() => {
    if (!userProfile || !uid || userProfile.uid === uid) return;
    const q = query(collection(db, 'friendRequests'),
      where('from', 'in', [userProfile.uid, uid]),
      where('to', 'in', [userProfile.uid, uid])
    );
    const unsub = onSnapshot(q, (snapshot) => {
      let found = false;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (
          (data.from === userProfile.uid && data.to === uid) ||
          (data.from === uid && data.to === userProfile.uid)
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
  }, [userProfile, uid]);

  useEffect(() => {
    if (!userProfile || !profile || !uid) return;
    if (userProfile.uid === uid) return;
    // If either user has the other as a friend, set status to 'friends'
    const isFriends = (
      (Array.isArray(profile?.friends) && profile.friends.includes(userProfile.uid)) ||
      (Array.isArray(userProfile.friends) && userProfile.friends.includes(uid))
    );
    if (isFriends) {
      if (friendStatus !== 'friends') setFriendStatus('friends');
    } else if (friendStatus === 'friends') {
      setFriendStatus('none');
    }
  }, [userProfile, profile, uid, friendStatus]);

  const handleAddFriend = async () => {
    if (!userProfile || !uid || userProfile.uid === uid) return;
    setFriendLoading(true);
    setFriendError(null);
    try {
      if (friendStatus === 'pending' || friendStatus === 'friends') return;
      await addDoc(collection(db, 'friendRequests'), {
        from: userProfile.uid,
        to: uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'users', uid, 'notifications'), {
        type: 'friend_request',
        from: userProfile.uid,
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (e) {
      setFriendError('Failed to send request.');
    } finally {
      setFriendLoading(false);
    }
  };

  // Accept friend request (Confirm)
  const handleConfirmRequest = async () => {
    if (!userProfile || !uid || !friendRequestId) return;
    setFriendLoading(true);
    setFriendError(null);
    try {
      // Update the friend request status to 'accepted'
      await updateDoc(doc(db, 'friendRequests', friendRequestId), { status: 'accepted' });
      // Add each user to the other's friends list
      const fromUserDoc = await getDoc(doc(db, 'users', uid));
      const toUserDoc = await getDoc(doc(db, 'users', userProfile.uid));
      if (fromUserDoc.exists() && toUserDoc.exists()) {
        const fromFriends = fromUserDoc.data().friends || [];
        const toFriends = toUserDoc.data().friends || [];
        if (!fromFriends.includes(userProfile.uid)) {
          await updateDoc(doc(db, 'users', uid), { friends: [...fromFriends, userProfile.uid] });
        }
        if (!toFriends.includes(uid)) {
          await updateDoc(doc(db, 'users', userProfile.uid), { friends: [...toFriends, uid] });
        }
      }
      // Optionally, delete the friend request document after confirming
      await deleteDoc(doc(db, 'friendRequests', friendRequestId));
    } catch (e) {
      setFriendError('Failed to confirm request.');
    } finally {
      setFriendLoading(false);
    }
  };

  // Decline friend request
  const handleDeclineRequest = async () => {
    if (!userProfile || !uid || !friendRequestId) return;
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

  // Cancel friend request
  const handleCancelRequest = async () => {
    if (!friendRequestId) return;
    setFriendLoading(true);
    setFriendError(null);
    try {
      // Remove the friend request document
      await updateDoc(doc(db, 'friendRequests', friendRequestId), { status: 'cancelled' });
      await deleteDoc(doc(db, 'friendRequests', friendRequestId));
      setFriendStatus('none');
    } catch (e) {
      setFriendError('Failed to cancel request.');
    } finally {
      setFriendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <X size={48} className="mb-4 text-red-500" />
        <h2 className="text-2xl font-bold mb-2">Musician Not Found</h2>
        <p className="text-gray-400 mb-6">This musician profile does not exist or is private.</p>
        <button className="btn-primary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  // Public fields
  const {
    fullName,
    username,
    profileImagePath,
    isVerified,
    country,
    countryCode,
    friends = [],
    instrumentTypes = [],
    instrumentType,
    musicCulture,
    bio,
    talentDescription,
  } = profile;

  // For demo, fallback to country code from country name
  const countryFlag = countryCode ? getCountryFlag(countryCode) : '';
  const instruments = Array.isArray(instrumentTypes) ? instrumentTypes : (instrumentType ? [instrumentType] : []);
  // Use userProfile?.friends if it exists, otherwise default to []
  const userFriends = (userProfile && 'friends' in userProfile && Array.isArray(userProfile.friends)) ? userProfile.friends : [];
  const mutualFriends = getMutualFriends(userFriends, friends, allUsers);

  // Animated counters
  const AnimatedCounter = ({ value, className }: { value: number, className?: string }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      let start = 0;
      const end = value;
      if (start === end) return;
      let increment = end / 30;
      let current = start;
      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, 15);
      return () => clearInterval(timer);
    }, [value]);
    return <span className={className}>{count}</span>;
  };

  // Use profile?.fullName or 'Musician' for dynamic SEO
  const profileName = profile?.fullName || 'Musician';
  const profileDescription = profile?.bio || `Discover the music, collaborations, and journey of ${profileName} on SoundAlchemy. Connect with global musicians, orchestras, and more. Powered by Lehan Kawshila.`;
  const profileImage = getProfileImageUrlWithFallback(profile?.profileImagePath || profile?.photoURL);
  const profileUrl = `https://soundalcmy.com/musician/${uid}`;
  const profileSchema = `{
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "${profileName}",
    "description": "${profileDescription}",
    "url": "${profileUrl}",
    "image": "${profileImage}",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${profileUrl}"
    }
  }`;

  return (
    <>
      <SEO
        title={`${profileName} | Musician Profile | SoundAlchemy – Global Musicians & Music Platform`}
        description={profileDescription}
        keywords="soundalcmy, soundalchemy, music, musician, profile, global musicians, lehan kawshila, orchestra, guitar, world wide"
        image={profileImage}
        url={profileUrl}
        lang="en"
        schema={profileSchema}
      />
      <div className="min-h-screen bg-gradient-to-br from-black via-dark-900 to-dark-800 flex flex-col items-center justify-center py-6 px-4">
        {/* Back Button */}
        <div className="w-full max-w-2xl lg:max-w-4xl xl:max-w-6xl flex items-center mb-6">
          <button
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-dark-700 hover:bg-dark-600 text-gray-200 font-semibold shadow-lg transition-all duration-200 focus:outline-none hover:scale-105"
            onClick={() => navigate(-1)}
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
        </div>
        {/* Responsive Card - Much Wider */}
        <div className="w-full max-w-2xl lg:max-w-4xl xl:max-w-6xl bg-dark-900 rounded-3xl shadow-2xl mx-auto relative flex flex-col items-center overflow-hidden">
          {/* Gradient Cover */}
          <div className="w-full h-32 sm:h-36 md:h-40 bg-gradient-to-r from-blue-700 via-purple-600 to-red-600" />
          {/* Edit Icon (only if profile owner) */}
          {user && user.uid === uid && (
            <button
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 z-20"
              aria-label="Edit profile"
            >
              <Pencil className="w-5 h-5 text-white" />
            </button>
          )}
          {/* Profile Photo - Centered, overlapping cover and card */}
          <div className="absolute left-1/2 top-24 sm:top-28 md:top-32 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
            <div className="relative">
              <img
                src={getProfileImageUrlWithFallback(profileImagePath || profile?.photoURL)}
                alt={fullName}
                className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-44 lg:h-44 rounded-full border-4 border-white shadow-2xl object-cover bg-dark-700 cursor-pointer hover:scale-105 transition-transform duration-200"
                onClick={() => setShowPhotoModal(true)}
                aria-label="View profile photo"
                tabIndex={0}
                role="button"
                onError={e => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg'; }}
              />
              {isVerified && (
                <span className="absolute bottom-2 right-2 bg-white rounded-full p-1 shadow-lg">
                  <BadgeCheck className="w-6 h-6 text-blue-500" />
                </span>
              )}
            </div>
          </div>
          {/* Profile Photo Modal (Lightbox) */}
          <AnimatePresence>
            {showPhotoModal && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPhotoModal(false)}
                aria-modal="true"
                role="dialog"
              >
                <motion.div
                  className="relative max-w-full max-h-full flex items-center justify-center"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                >
                  <img
                    src={getProfileImageUrlWithFallback(profileImagePath || profile?.photoURL)}
                    alt={fullName}
                    className="w-[90vw] h-[90vw] sm:w-[60vw] sm:h-[60vw] md:w-[30vw] md:h-[30vw] max-w-[400px] max-h-[80vh] rounded-2xl object-cover border-4 border-white shadow-2xl"
                    style={{ objectFit: 'cover' }}
                  />
                  <button
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-2 hover:bg-black/80 transition-colors"
                    onClick={() => setShowPhotoModal(false)}
                    aria-label="Close photo view"
                  >
                    <CloseIcon className="w-6 h-6 text-white" />
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Card Content */}
          <div className="w-full flex flex-col items-center pt-24 pb-8 px-6 sm:px-12 lg:px-16 mt-2">
            {/* Friend Request Banner (Confirm/Decline) */}
            {friendStatus === 'pending' && friendRequestData && friendRequestData.status === 'pending' && friendRequestData.to === user?.uid && (
              <div className="w-full max-w-2xl mx-auto bg-gradient-to-r from-yellow-900/90 to-orange-900/90 border border-yellow-500/50 rounded-2xl shadow-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-500/20 rounded-full p-3">
                    <UserPlus className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div>
                    <span className="text-white font-bold text-lg">Friend Request</span>
                    <p className="text-yellow-200 text-sm">Someone wants to connect with you!</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg transition-all duration-200 hover:scale-105"
                    onClick={handleConfirmRequest}
                    disabled={friendLoading}
                  >
                    {friendLoading ? <Loader className="animate-spin w-5 h-5" /> : 'Confirm'}
                  </button>
                  <button
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-lg transition-all duration-200 hover:scale-105"
                    onClick={handleDeclineRequest}
                    disabled={friendLoading}
                  >
                    {friendLoading ? <Loader className="animate-spin w-5 h-5" /> : 'Decline'}
                  </button>
                </div>
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-1 flex items-center justify-center gap-2">
              {fullName}
              {isVerified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
            </h1>
            {profile.email && (
              <div className="text-gray-400 text-sm sm:text-base text-center mb-2">{profile.email}</div>
            )}
            {/* Instruments */}
            {instruments.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mb-4">
                {instruments.map((inst: string, idx: number) => (
                  <span key={idx} className="bg-blue-600/20 border border-blue-500/30 text-blue-400 font-medium px-4 py-2 rounded-full hover:bg-blue-600/30 transition-all duration-200 text-sm sm:text-base cursor-pointer">
                    {inst}
                  </span>
                ))}
              </div>
            )}
            {/* Bio */}
            {bio && (
              <div
                className="w-full max-w-3xl mx-auto bg-dark-800/80 rounded-xl px-6 py-4 mt-4 mb-6 text-gray-200 text-base sm:text-lg leading-relaxed overflow-y-auto scrollbar-thin scrollbar-thumb-dark-700 scrollbar-track-dark-900 transition-all shadow-lg"
                style={{ maxHeight: '20rem', minHeight: '3rem', scrollBehavior: 'smooth' }}
                aria-label="Musician bio"
              >
                {bio}
              </div>
            )}
            {/* Add Friend / Unfriend Button - Professional and Responsive */}
            {user && user.uid !== uid && (
              <div className="w-full flex flex-col items-center mb-4">
                {friendStatus === 'none' && (
                  <button
                    className="flex items-center gap-3 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-base sm:text-lg shadow-lg transition-all duration-200 focus:outline-none hover:scale-105"
                    onClick={handleAddFriend}
                    disabled={friendLoading}
                    aria-label="Add Friend"
                  >
                    {friendLoading ? <Loader className="animate-spin w-5 h-5" /> : <UserPlus className="w-5 h-5" />} Add Friend
                  </button>
                )}
                {friendStatus === 'pending' && friendRequestData && friendRequestData.status === 'pending' && friendRequestData.from === user.uid && (
                  <div className="flex items-center gap-4">
                    <button
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-yellow-500/90 text-white font-semibold text-base sm:text-lg shadow-lg transition-all duration-200 cursor-not-allowed"
                      disabled
                      aria-label="Request Sent"
                    >
                      <Loader className="animate-spin w-5 h-5" /> Request Sent
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-yellow-500 bg-transparent hover:bg-yellow-500/10 text-yellow-500 font-semibold shadow-lg transition-all duration-200 text-base sm:text-lg focus:outline-none hover:scale-105"
                      onClick={handleCancelRequest}
                      disabled={friendLoading}
                      aria-label="Cancel Request"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                )}
                {friendStatus === 'friends' && (
                  <>
                    <button
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold text-base sm:text-lg shadow-lg transition-all duration-200 focus:outline-none hover:scale-105"
                      onClick={() => setShowUnfriendModal(true)}
                      disabled={friendLoading}
                      aria-label="Unfriend"
                    >
                      {friendLoading ? <Loader className="animate-spin w-5 h-5" /> : <XCircle className="w-5 h-5" />} Unfriend
                    </button>
                    {/* Unfriend Confirmation Modal */}
                    <AnimatePresence>
                      {showUnfriendModal && (
                        <motion.div
                          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          aria-modal="true"
                          role="dialog"
                        >
                          <motion.div
                            className="bg-dark-900 rounded-2xl shadow-2xl p-6 max-w-xs w-full flex flex-col items-center"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                          >
                            <XCircle className="w-10 h-10 text-red-500 mb-2" />
                            <div className="text-white text-lg font-semibold mb-2 text-center">Are you sure you want to unfriend?</div>
                            <div className="flex gap-4 mt-4">
                              <button
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow"
                                onClick={async () => {
                                  setShowUnfriendModal(false);
                                  setFriendStatus('none'); // Optimistically update UI
                                  if (!uid || !userProfile?.uid) return;
                                  setFriendLoading(true);
                                  setFriendError(null);
                                  try {
                                    const fromUserDoc = await getDoc(doc(db, 'users', uid));
                                    const toUserDoc = await getDoc(doc(db, 'users', userProfile.uid));
                                    if (fromUserDoc.exists() && toUserDoc.exists()) {
                                      const fromFriends = fromUserDoc.data().friends || [];
                                      const toFriends = toUserDoc.data().friends || [];
                                      await updateDoc(doc(db, 'users', uid), { friends: fromFriends.filter((f: string) => f !== userProfile.uid) });
                                      await updateDoc(doc(db, 'users', userProfile.uid), { friends: toFriends.filter((f: string) => f !== uid) });
                                    }
                                    // Also delete the friend request document if it exists
                                    if (friendRequestId) {
                                      await deleteDoc(doc(db, 'friendRequests', friendRequestId));
                                    }
                                  } catch (e) {
                                    setFriendError('Failed to unfriend.');
                                  } finally {
                                    setFriendLoading(false);
                                  }
                                }}
                              >
                                Yes, Unfriend
                              </button>
                              <button
                                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-semibold shadow"
                                onClick={() => setShowUnfriendModal(false)}
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
                {friendError && <span className="text-red-400 text-sm mt-1 ml-4">{friendError}</span>}
              </div>
            )}
            {/* Mutual Friends & Friends Count - Centered */}
            <div className="flex flex-col items-center gap-4 mb-8 w-full">
              <div className="flex items-center gap-3 justify-center bg-dark-800/50 rounded-xl px-6 py-3 shadow-lg">
                <Users className="w-6 h-6 text-primary-400" />
                <AnimatedCounter value={friends.length} className="text-2xl font-bold text-primary-400" />
                <span className="text-gray-400 text-lg">Friends</span>
              </div>
              {mutualFriends.length > 0 && (
                <div className="flex items-center gap-2 justify-center bg-dark-800/30 rounded-lg px-4 py-2">
                  <span className="text-gray-400 text-sm">Mutual Friends:</span>
                  <div className="flex -space-x-2">
                    {mutualFriends.slice(0, 5).map((mf, idx) => (
                      <motion.img
                        key={mf.uid}
                        src={mf.profileImagePath ? getGoogleDriveDirectUrl(mf.profileImagePath) : '/default-avatar.svg'}
                        alt={mf.fullName}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200"
                        initial={{ x: 20 * idx, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 * idx, type: 'spring', stiffness: 200 }}
                        onClick={() => navigate(`/musician/${mf.uid}`)}
                      />
                    ))}
                    {mutualFriends.length > 5 && (
                      <span className="ml-2 text-sm text-gray-400">+{mutualFriends.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Navigation Tabs - Fully responsive and professional */}
            <div className="w-full max-w-4xl mx-auto flex overflow-x-auto whitespace-nowrap scrollbar-hide border-b border-dark-700 mb-8 justify-center">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`relative px-6 py-3 text-base sm:text-lg font-semibold flex items-center gap-2 transition-colors duration-200 focus:outline-none ${activeTab === tab.key ? 'text-blue-400' : 'text-gray-400 hover:text-blue-300'}`}
                  onClick={() => setActiveTab(tab.key)}
                  style={{ minWidth: 'max-content' }}
                >
                  {tab.icon} {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute left-0 bottom-0 w-full h-0.5 bg-blue-400 rounded-t-lg" style={{ zIndex: 1 }} />
                  )}
                </button>
              ))}
            </div>
            {/* Tab Content - Centered */}
            <div className="mt-6 w-full flex flex-col items-center">
              <AnimatePresence mode="wait">
                {activeTab === 'timeline' && (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="text-gray-300 text-lg">Timeline and posts coming soon...</div>
                    {/* Recent Activity */}
                    <motion.div className="mt-6 bg-dark-700/80 rounded-xl p-4 shadow flex items-center gap-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                      <UserCircle className="w-8 h-8 text-primary-400" />
                      <div>
                        <div className="font-semibold text-white">Recent Activity</div>
                        <div className="text-gray-400 text-sm">Last active: {/* TODO: Add real last active time */}Just now</div>
                      </div>
                    </motion.div>
                    {/* Featured Media */}
                    <motion.div className="mt-6 bg-dark-700/80 rounded-xl p-4 shadow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <div className="font-semibold text-white mb-2 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary-400" /> Featured Media</div>
                      <div className="flex gap-4 overflow-x-auto">
                        {/* TODO: Map real media here */}
                        <div className="w-32 h-32 bg-dark-900 rounded-lg flex items-center justify-center text-gray-500">No media</div>
                      </div>
                    </motion.div>
                    {/* Badges & Achievements */}
                    <motion.div className="mt-6 bg-dark-700/80 rounded-xl p-4 shadow flex items-center gap-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                      <Star className="w-8 h-8 text-yellow-400" />
                      <div>
                        <div className="font-semibold text-white">Badges & Achievements</div>
                        <div className="text-gray-400 text-sm">No badges yet</div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
                {activeTab === 'about' && (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Star className="w-5 h-5 text-primary-400" /> About</h3>
                      <p className="text-gray-300 text-base leading-relaxed whitespace-pre-line mb-2">{bio || 'No bio provided.'}</p>
                      {talentDescription && <p className="text-gray-400 italic text-base">{talentDescription}</p>}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Music className="w-5 h-5 text-primary-400" /> Talents & Instruments</h3>
                      <div className="flex flex-wrap gap-3">
                        {instruments.length > 0 && instruments.map((inst: string, idx: number) => (
                          <motion.span
                            key={idx}
                            className="flex items-center gap-2 px-4 py-2 bg-dark-700 rounded-full text-gray-200 text-base font-medium shadow"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 200 }}
                          >
                            <Music className="w-4 h-4 text-primary-400" /> {inst}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                    {musicCulture && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Info className="w-5 h-5 text-primary-400" /> Music Culture</h3>
                        <span className="inline-block px-4 py-2 bg-primary-900/40 rounded-full text-primary-300 font-semibold">{musicCulture}</span>
                      </div>
                    )}
                  </motion.div>
                )}
                {activeTab === 'friends' && (
                  <motion.div
                    key="friends"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary-400" /> Friends</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {friends.length === 0 && <div className="text-gray-400 col-span-4">No friends yet.</div>}
                      {friends.slice(0, 8).map((fid: string, idx: number) => {
                        const f = allUsers.find(u => u.uid === fid);
                        return f ? (
                          <motion.div
                            key={fid}
                            className="flex flex-col items-center bg-dark-700 rounded-xl p-4 shadow hover:shadow-lg transition-shadow cursor-pointer"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * idx }}
                            onClick={() => navigate(`/musician/${fid}`)}
                          >
                            <img
                              src={f.profileImagePath ? getGoogleDriveDirectUrl(f.profileImagePath) : '/default-avatar.svg'}
                              alt={f.fullName}
                              className="w-16 h-16 rounded-full border-2 border-primary-400 mb-2 object-cover"
                            />
                            <div className="text-white font-semibold text-base">{f.fullName}</div>
                            {f.country && <div className="text-gray-400 text-sm">{f.country}</div>}
                          </motion.div>
                        ) : null;
                      })}
                    </div>
                  </motion.div>
                )}
                {activeTab === 'videos' && (
                  <motion.div
                    key="videos"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Play className="w-6 h-6 text-primary-400" /> Videos
                      </h3>
                      <button
                        onClick={() => navigate(`/musician/${uid}/channel`)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Go to Video Channel
                      </button>
                    </div>
                    
                    {videosLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader className="w-8 h-8 animate-spin text-primary-400" />
                        <span className="ml-3 text-gray-400">Loading videos...</span>
                      </div>
                    ) : videos.length === 0 ? (
                      <div className="text-center py-12">
                        <Play className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg mb-4">No videos available yet.</p>
                        <p className="text-gray-500">This musician hasn't uploaded any videos yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {videos.slice(0, 8).map((video, idx) => {
                          const videoId = extractYouTubeVideoId(video.youtubeUrl);
                          return (
                            <motion.div
                              key={video.id}
                              className="bg-dark-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.05 * idx }}
                              onClick={async () => {
                                setSelectedVideo(video);
                                // Track view if video is public or user is the owner
                                if (video.privacy === 'public' || (user && video.musicianId === user.uid)) {
                                  try {
                                    await trackVideoView(video.id!);
                                  } catch (error) {
                                    console.error('Error tracking video view:', error);
                                  }
                                }
                              }}
                            >
                              <div className="relative">
                                <img
                                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                  alt={video.title}
                                  className="w-full aspect-video object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                                  <div className="bg-white/90 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <Play className="w-6 h-6 text-black" />
                                  </div>
                                </div>
                                <div className="absolute top-2 right-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    video.privacy === 'public' 
                                      ? 'bg-green-600 text-green-100' 
                                      : 'bg-yellow-600 text-yellow-100'
                                  }`}>
                                    {video.privacy === 'public' ? 'Public' : 'Private'}
                                  </span>
                                </div>
                              </div>
                              <div className="p-4">
                                <h4 className="font-semibold text-white text-base mb-2 line-clamp-2" title={video.title}>
                                  {video.title}
                                </h4>
                                <p className="text-gray-400 text-sm mb-3 line-clamp-2" title={video.description}>
                                  {video.description}
                                </p>
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 text-gray-400">
                                      <Heart className={`w-4 h-4 ${video.likes?.includes(user?.uid || '') ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                                      <span>{video.likes?.length || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-400">
                                      <Eye className="w-4 h-4" />
                                      <span>{video.views || 0}</span>
                                    </div>
                                  </div>
                                  <span className="text-gray-500">Click to watch</span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                    
                    {videos.length > 8 && (
                      <div className="text-center mt-8">
                        <button
                          onClick={() => navigate(`/musician/${uid}/channel`)}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
                        >
                          View All {videos.length} Videos
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
                {activeTab === 'collaborations' && (
                  <motion.div
                    key="collaborations"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Handshake className="w-6 h-6 text-primary-400" /> Collaborations
                      </h3>
                      <button
                        onClick={() => navigate(`/collaborations?creatorId=${uid}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View All Collaborations
                      </button>
                    </div>
                    
                    {/* Debug Info */}
                    <div className="mb-4 p-4 bg-dark-800 rounded-lg">
                      <p className="text-gray-400 text-sm">Debug Info:</p>
                      <p className="text-gray-400 text-sm">Created collaborations: {collaborations.length}</p>
                      <p className="text-gray-400 text-sm">Participating collaborations: {participatingCollaborations.length}</p>
                      <p className="text-gray-400 text-sm">User ID: {uid}</p>
                      <p className="text-gray-400 text-sm">Current user: {user?.uid}</p>
                      <p className="text-gray-400 text-sm">Is own profile: {user?.uid === uid ? 'Yes' : 'No'}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={refreshCollaborations}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                        >
                          Refresh Collaborations
                        </button>
                        <button
                          onClick={testCollaborationFetching}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                        >
                          Test Fetching
                        </button>
                      </div>
                    </div>
                    
                    {collaborationsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader className="w-8 h-8 animate-spin text-primary-400" />
                        <span className="ml-3 text-gray-400">Loading collaborations...</span>
                      </div>
                    ) : collaborations.length === 0 && participatingCollaborations.length === 0 ? (
                      <div className="text-center py-12">
                        <Handshake className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg mb-4">No collaborations available yet.</p>
                        <p className="text-gray-500">This musician hasn't created or joined any collaborations yet.</p>
                        {user && user.uid === uid && (
                          <div className="flex flex-col gap-3 mt-4">
                            <button
                              onClick={() => navigate('/collaborations')}
                              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
                            >
                              Start Your First Collaboration
                            </button>
                            {/* Debug button - only show for development */}
                            <button
                              onClick={createTestCollaboration}
                              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-all duration-200"
                            >
                              Create Test Collaboration (Debug)
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {collaborations.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold mb-4 text-primary-300 flex items-center gap-2">
                              <Handshake className="w-5 h-5" />
                              Created Collaborations ({collaborations.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {collaborations.slice(0, 4).map((collab, idx) => (
                                <motion.div
                                  key={collab.id}
                                  className="bg-dark-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.05 * idx }}
                                  onClick={() => navigate(`/collaborations/${collab.id}`)}
                                >
                                  <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                      <h4 className="font-semibold text-white text-lg line-clamp-1" title={collab.title}>
                                        {collab.title}
                                      </h4>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        collab.status === 'open' ? 'bg-green-600 text-green-100' : 
                                        collab.status === 'cancelled' ? 'bg-red-600 text-red-100' : 
                                        collab.status === 'completed' ? 'bg-blue-600 text-blue-100' :
                                        'bg-yellow-600 text-yellow-100'
                                      }`}>
                                        {collab.status.charAt(0).toUpperCase() + collab.status.slice(1)}
                                      </span>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-2" title={collab.description}>
                                      {collab.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                      {collab.instruments?.slice(0, 3).map((instrument, i) => (
                                        <span key={i} className="px-2 py-1 bg-dark-700 rounded-full text-xs text-gray-300">
                                          {instrument}
                                        </span>
                                      ))}
                                      {collab.instruments && collab.instruments.length > 3 && (
                                        <span className="px-2 py-1 bg-dark-700 rounded-full text-xs text-gray-300">
                                          +{collab.instruments.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 text-gray-400">
                                          <Users className="w-4 h-4" />
                                          <span>{collab.participants?.length || 0}/{collab.maxParticipants || '∞'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-400">
                                          <Eye className="w-4 h-4" />
                                          <span>{collab.views || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-400">
                                          <MessageCircle className="w-4 h-4" />
                                          <span>{collab.applications || 0}</span>
                                        </div>
                                      </div>
                                      <span className="text-gray-500">Click to view</span>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                            {collaborations.length > 4 && (
                              <div className="text-center mt-4">
                                <button
                                  onClick={() => navigate(`/collaborations?creatorId=${uid}`)}
                                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-all duration-200"
                                >
                                  View All {collaborations.length} Created Collaborations
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {participatingCollaborations.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold mb-4 text-secondary-300 flex items-center gap-2">
                              <Users className="w-5 h-5" />
                              Participating Collaborations ({participatingCollaborations.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {participatingCollaborations.slice(0, 4).map((collab, idx) => (
                                <motion.div
                                  key={collab.id}
                                  className="bg-dark-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.05 * idx }}
                                  onClick={() => navigate(`/collaborations/${collab.id}`)}
                                >
                                  <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                      <h4 className="font-semibold text-white text-lg line-clamp-1" title={collab.title}>
                                        {collab.title}
                                      </h4>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        collab.status === 'open' ? 'bg-green-600 text-green-100' : 
                                        collab.status === 'cancelled' ? 'bg-red-600 text-red-100' : 
                                        collab.status === 'completed' ? 'bg-blue-600 text-blue-100' :
                                        'bg-yellow-600 text-yellow-100'
                                      }`}>
                                        {collab.status.charAt(0).toUpperCase() + collab.status.slice(1)}
                                      </span>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-2" title={collab.description}>
                                      {collab.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                      {collab.instruments?.slice(0, 3).map((instrument, i) => (
                                        <span key={i} className="px-2 py-1 bg-dark-700 rounded-full text-xs text-gray-300">
                                          {instrument}
                                        </span>
                                      ))}
                                      {collab.instruments && collab.instruments.length > 3 && (
                                        <span className="px-2 py-1 bg-dark-700 rounded-full text-xs text-gray-300">
                                          +{collab.instruments.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 text-gray-400">
                                          <Users className="w-4 h-4" />
                                          <span>{collab.participants?.length || 0}/{collab.maxParticipants || '∞'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-400">
                                          <Eye className="w-4 h-4" />
                                          <span>{collab.views || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-400">
                                          <MessageCircle className="w-4 h-4" />
                                          <span>{collab.applications || 0}</span>
                                        </div>
                                      </div>
                                      <span className="text-gray-500">Click to view</span>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                            {participatingCollaborations.length > 4 && (
                              <div className="text-center mt-4">
                                <button
                                  onClick={() => navigate(`/collaborations?creatorId=${uid}`)}
                                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-all duration-200"
                                >
                                  View All {participatingCollaborations.length} Participating Collaborations
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
                {activeTab === 'projects' && (
                  <motion.div
                    key="projects"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Music className="w-5 h-5 text-primary-400" /> Projects</h3>
                    <div className="text-gray-400">Projects feature coming soon...</div>
                  </motion.div>
                )}
                {activeTab === 'media' && (
                  <motion.div
                    key="media"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary-400" /> Media</h3>
                    <div className="text-gray-400">Media gallery coming soon...</div>
                  </motion.div>
                )}
                {activeTab === 'spotify' && (
                  <motion.div
                    key="spotify"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                  >
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Music className="w-5 h-5 text-primary-400" /> Spotify</h3>
                    <SpotifyTab ownerId={uid!} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Stats Section - Centered */}
            <div className="mt-10 mb-4 w-full flex flex-col items-center">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2"><BarChart2 className="w-6 h-6 text-primary-400" /> Statistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 justify-center w-full max-w-3xl">
                <div className="flex flex-col items-center bg-dark-800/50 rounded-xl p-4 shadow-lg hover:bg-dark-800/70 transition-all duration-200">
                  <AnimatedCounter value={analytics?.profileViews || 0} className="text-3xl font-bold text-primary-400" />
                  <span className="text-gray-400 text-sm mt-1">Profile Views</span>
                </div>
                <div className="flex flex-col items-center bg-dark-800/50 rounded-xl p-4 shadow-lg hover:bg-dark-800/70 transition-all duration-200">
                  <AnimatedCounter value={friends?.length || 0} className="text-3xl font-bold text-secondary-400" />
                  <span className="text-gray-400 text-sm mt-1">Friends</span>
                </div>
                <div className="flex flex-col items-center bg-dark-800/50 rounded-xl p-4 shadow-lg hover:bg-dark-800/70 transition-all duration-200">
                  <AnimatedCounter value={(collaborations?.length || 0) + (participatingCollaborations?.length || 0)} className="text-3xl font-bold text-blue-400" />
                  <span className="text-gray-400 text-sm mt-1">Collaborations</span>
                </div>
                <div className="flex flex-col items-center bg-dark-800/50 rounded-xl p-4 shadow-lg hover:bg-dark-800/70 transition-all duration-200">
                  <AnimatedCounter value={videos?.length || 0} className="text-3xl font-bold text-pink-400" />
                  <span className="text-gray-400 text-sm mt-1">Videos</span>
                </div>
                <div className="flex flex-col items-center bg-dark-800/50 rounded-xl p-4 shadow-lg hover:bg-dark-800/70 transition-all duration-200">
                  <AnimatedCounter value={analytics?.projects || 0} className="text-3xl font-bold text-blue-400" />
                  <span className="text-gray-400 text-sm mt-1">Projects</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Video Modal */}
        <AnimatePresence>
          {selectedVideo && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVideo(null)}
            >
              <motion.div
                className="relative max-w-4xl w-full bg-dark-900 rounded-2xl shadow-2xl overflow-hidden"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="relative">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeVideoId(selectedVideo.youtubeUrl)}?autoplay=1`}
                    title={selectedVideo.title}
                    className="w-full aspect-video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <button
                    className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors"
                    onClick={() => setSelectedVideo(null)}
                  >
                    <CloseIcon className="w-6 h-6 text-white" />
                  </button>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{selectedVideo.title}</h3>
                  <p className="text-gray-400 mb-4">{selectedVideo.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{selectedVideo.views || 0} views</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedVideo.privacy === 'public' 
                          ? 'bg-green-600 text-green-100' 
                          : 'bg-yellow-600 text-yellow-100'
                      }`}>
                        {selectedVideo.privacy === 'public' ? 'Public' : 'Private'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <LikeButton video={selectedVideo} onAction={() => {}} />
                      <button
                        onClick={() => navigate(`/musician/${uid}/channel`)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Channel
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default PublicMusicianProfile;