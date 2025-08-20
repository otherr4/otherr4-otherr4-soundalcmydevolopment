import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMusicVideos, MusicVideo, updatePrivacy, deleteMusicVideo, trackVideoView } from '../../services/musicVideoService';
import { getProfileImageUrlWithFallback } from '../../utils/imageUtils';
import MusicianChannelHeader from '../../components/musicvideo/MusicianChannelHeader';
import VideoModal from '../../components/musicvideo/VideoModal';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, Eye, Calendar, ArrowLeft, ExternalLink, Loader, AlertCircle, Edit, Trash2, Settings, Plus, Upload, Lock, Unlock, MoreVertical, Heart } from 'lucide-react';
import SEO from '../../components/common/SEO';
import CommentsSection from '../../components/musicvideo/CommentsSection';
import LikeButton from '../../components/musicvideo/LikeButton';

const extractYouTubeVideoId = (url: string) => {
  const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : '';
};

// Video Upload Form Component
const VideoUploadForm: React.FC<{ onUpload: () => void; onCancel: () => void }> = ({ onUpload, onCancel }) => {
  const { user } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidYouTubeUrl = (url: string) => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/i.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidYouTubeUrl(youtubeUrl)) {
      setError('Please enter a valid YouTube URL.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!user) {
      setError('You must be logged in to upload.');
      return;
    }
    setLoading(true);
    try {
      const { uploadMusicVideo } = await import('../../services/musicVideoService');
      await uploadMusicVideo({
        musicianId: user.uid,
        youtubeUrl,
        title,
        description,
        privacy,
      });
      setYoutubeUrl('');
      setTitle('');
      setDescription('');
      setPrivacy('public');
      onUpload();
    } catch (err) {
      setError('Failed to upload video.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-dark-800 rounded-xl p-6 shadow-xl mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Upload New Video</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>
      
      {error && <div className="text-red-500 mb-4 p-3 bg-red-500/10 rounded-lg">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-2 font-medium">YouTube URL</label>
          <input
            type="text"
            className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
            value={youtubeUrl}
            onChange={e => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2 font-medium">Title</label>
          <input
            type="text"
            className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter video title..."
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2 font-medium">Description</label>
          <textarea
            className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none resize-none"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Enter video description..."
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2 font-medium">Privacy</label>
          <select
            className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
            value={privacy}
            onChange={e => setPrivacy(e.target.value as 'public' | 'private')}
          >
            <option value="public">Public (everyone can see)</option>
            <option value="private">Private (only you can see)</option>
          </select>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'Upload Video'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-gray-300 font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// Video Edit Form Component
const VideoEditForm: React.FC<{ video: MusicVideo; onSave: () => void; onCancel: () => void }> = ({ video, onSave, onCancel }) => {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [privacy, setPrivacy] = useState<'public' | 'private'>(video.privacy);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setLoading(true);
    try {
      const { updateMusicVideo } = await import('../../services/musicVideoService');
      await updateMusicVideo(video.id!, {
        title,
        description,
        privacy,
      });
      onSave();
    } catch (err) {
      setError('Failed to update video.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-dark-800 rounded-xl p-6 shadow-xl mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Edit Video</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>
      
      {error && <div className="text-red-500 mb-4 p-3 bg-red-500/10 rounded-lg">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-2 font-medium">Title</label>
          <input
            type="text"
            className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2 font-medium">Description</label>
          <textarea
            className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none resize-none"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2 font-medium">Privacy</label>
          <select
            className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
            value={privacy}
            onChange={e => setPrivacy(e.target.value as 'public' | 'private')}
          >
            <option value="public">Public (everyone can see)</option>
            <option value="private">Private (only you can see)</option>
          </select>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-gray-300 font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
};

const MusicianChannelPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<MusicVideo | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<MusicVideo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Check if current user is the channel owner
  const isOwner = user && (uid === 'me' || uid === user.uid);

  // Fetch musician profile
  useEffect(() => {
    if (!uid) return;
    setProfileLoading(true);
    (async () => {
      try {
        const effectiveUid = uid === 'me' ? user?.uid : uid;
        if (!effectiveUid) {
          setNotFound(true);
          setProfile(null);
          return;
        }
        const userDoc = await getDoc(doc(db, 'users', effectiveUid));
        if (!userDoc.exists()) {
          setNotFound(true);
          setProfile(null);
        } else {
          setProfile(userDoc.data());
          setNotFound(false);
        }
      } catch (e) {
        setNotFound(true);
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [uid, user]);

  // Fetch videos - show only correct musician's videos, never mix
  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    // If viewing your own channel
    if (user && (uid === 'me' || uid === user.uid)) {
      getMusicVideos(user.uid).then((allVideos) => {
        // Only show videos that belong to the logged-in user
        const filteredVideos = allVideos.filter(video => video.musicianId === user.uid);
        setVideos(filteredVideos);
      }).finally(() => setLoading(false));
    } else {
      // Viewing another musician's channel
      getMusicVideos(uid).then((allVideos) => {
        // Only show public videos that belong to the channel owner
        const filteredVideos = allVideos.filter(
          video => video.musicianId === uid && video.privacy === 'public'
        );
        setVideos(filteredVideos);
      }).finally(() => setLoading(false));
    }
  }, [uid, refreshFlag, user]);

  // Handle video actions
  const handleVideoAction = () => {
    setRefreshFlag(f => !f);
  };

  // Track video view when selected
  const handleVideoSelect = async (video: MusicVideo) => {
    setSelectedVideo(video);
    // Track view if video is public or user is the owner
    if (video.privacy === 'public' || (user && video.musicianId === user.uid)) {
      try {
        await trackVideoView(video.id!);
        // Refresh the video list to show updated view count
        setRefreshFlag(f => !f);
      } catch (error) {
        console.error('Error tracking video view:', error);
      }
    }
  };

  const handlePrivacyToggle = async (videoId: string, currentPrivacy: 'public' | 'private') => {
    try {
      const newPrivacy = currentPrivacy === 'public' ? 'private' : 'public';
      await updatePrivacy(videoId, newPrivacy);
      handleVideoAction();
    } catch (error) {
      console.error('Failed to update privacy:', error);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      await deleteMusicVideo(videoId);
      setShowDeleteConfirm(null);
      handleVideoAction();
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  };

  // Loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-primary-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading musician channel...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Channel Not Found</h1>
          <p className="text-gray-400 mb-6">This musician channel doesn't exist or is private.</p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors mx-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // SEO data
  const channelName = profile?.fullName || profile?.displayName || 'Musician Channel';
  const channelDescription = profile?.bio || `Watch music videos by ${channelName} on SoundAlchemy`;
  const channelImage = getProfileImageUrlWithFallback(profile?.profileImagePath || profile?.photoURL);

  return (
    <>
      <SEO
        title={`${channelName} - Music Channel | SoundAlchemy`}
        description={channelDescription}
        keywords={`${channelName}, music, videos, channel, soundalchemy, musician`}
        image={channelImage}
        url={`https://soundalcmy.com/musician/${uid}/channel`}
        lang="en"
      />
      
    <div className="min-h-screen bg-dark-900">
        {/* Back Button */}
        <div className="container mx-auto px-4 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        {/* Channel Header */}
        <div className="w-full bg-gradient-to-r from-primary-900 via-primary-800 to-dark-800">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              {/* Profile Photo */}
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-dark-700 border-4 border-white overflow-hidden shadow-2xl">
                  <img 
                    src={getProfileImageUrlWithFallback(profile.profileImagePath || profile.photoURL)} 
                    alt={channelName} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/default-avatar.svg';
                    }}
                  />
                </div>
                {profile.isVerified && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-2 shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Channel Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-white">{channelName}</h1>
                  {profile.isVerified && (
                    <span className="text-blue-400 text-sm font-semibold">✓ Verified</span>
                  )}
                  {isOwner && (
                    <span className="text-green-400 text-sm font-semibold bg-green-400/10 px-2 py-1 rounded-full">Owner</span>
                  )}
                </div>
                <p className="text-gray-300 text-lg mb-3">@{profile.username || uid?.slice(0, 8)}</p>
                
                {/* Channel Stats */}
                <div className="flex flex-wrap gap-6 mb-4">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Play className="w-5 h-5 text-primary-400" />
                    <span className="font-semibold">{videos.length}</span>
                    <span>videos</span>
                  </div>
                  {profile.friends && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Users className="w-5 h-5 text-primary-400" />
                      <span className="font-semibold">{profile.friends.length}</span>
                      <span>friends</span>
                    </div>
                  )}
                  {profile.analytics?.profileViews && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Eye className="w-5 h-5 text-primary-400" />
                      <span className="font-semibold">{profile.analytics.profileViews}</span>
                      <span>views</span>
                    </div>
                  )}
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-gray-300 max-w-2xl leading-relaxed">{profile.bio}</p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 mt-6">
                  <button
                    onClick={() => navigate(`/musician/${uid}`)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    <Users className="w-5 h-5" />
                    View Profile
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => setShowUploadForm(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Upload Video
                    </button>
                  )}
                  {user && user.uid !== uid && !isOwner && (
                    <button
                      onClick={() => navigate(`/musician/${uid}`)}
                      className="flex items-center gap-2 px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-colors"
                    >
                      <Users className="w-5 h-5" />
                      Add Friend
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-dark-700 bg-dark-800">
          <div className="container mx-auto px-4">
            <div className="flex space-x-8">
              {[
                { key: 'videos', label: 'Videos', icon: <Play className="w-5 h-5" /> },
                { key: 'about', label: 'About', icon: <Users className="w-5 h-5" /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-semibold transition-colors ${
                    activeTab === tab.key
                      ? 'border-primary-500 text-primary-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
      <div className="container mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'videos' && (
              <motion.div
                key="videos"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Upload Form */}
                <AnimatePresence>
                  {showUploadForm && (
                    <VideoUploadForm
                      onUpload={() => {
                        setShowUploadForm(false);
                        handleVideoAction();
                      }}
                      onCancel={() => setShowUploadForm(false)}
                    />
                  )}
                </AnimatePresence>

                {/* Edit Form */}
                <AnimatePresence>
                  {editingVideo && (
                    <VideoEditForm
                      video={editingVideo}
                      onSave={() => {
                        setEditingVideo(null);
                        handleVideoAction();
                      }}
                      onCancel={() => setEditingVideo(null)}
                    />
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white">Videos</h2>
                  <div className="flex items-center gap-4">
                    <div className="text-gray-400">
                      {videos.length} video{videos.length !== 1 ? 's' : ''}
                    </div>
                    {isOwner && !showUploadForm && (
                      <button
                        onClick={() => setShowUploadForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Upload
                      </button>
                    )}
                  </div>
                </div>

        {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-primary-400 mr-3" />
                    <span className="text-gray-400">Loading videos...</span>
                  </div>
        ) : videos.length === 0 ? (
                  <div className="text-center py-12">
                    <Play className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No videos yet</h3>
                    <p className="text-gray-500 mb-6">
                      {isOwner ? "Start sharing your music videos with the world!" : "This musician hasn't uploaded any videos yet."}
                    </p>
                    {isOwner && (
                      <button
                        onClick={() => setShowUploadForm(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors mx-auto"
                      >
                        <Upload className="w-5 h-5" />
                        Upload Your First Video
                      </button>
                    )}
                  </div>
        ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {videos.map((video, idx) => {
              const videoId = extractYouTubeVideoId(video.youtubeUrl);
                      const isVideoOwner = user && video.musicianId === user.uid;
                      
              return (
                        <motion.div
                  key={video.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-dark-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 group relative"
                        >
                          {/* Owner Controls Overlay */}
                          {isVideoOwner && (
                            <div className="absolute top-2 left-2 z-10 flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingVideo(video);
                                }}
                                className="p-1 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                                title="Edit video"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(video.id!);
                                }}
                                className="p-1 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                                title="Delete video"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrivacyToggle(video.id!, video.privacy);
                                }}
                                className="p-1 bg-yellow-600 hover:bg-yellow-700 rounded text-white transition-colors"
                                title={`Make ${video.privacy === 'public' ? 'private' : 'public'}`}
                              >
                                {video.privacy === 'public' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              </button>
                            </div>
                          )}

                          <div
                            className="cursor-pointer"
                  onClick={() => handleVideoSelect(video)}
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
                              <h3 className="font-semibold text-white text-base mb-2 line-clamp-2" title={video.title}>
                                {video.title}
                              </h3>
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
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl"
              >
                <h2 className="text-2xl font-bold text-white mb-6">About {channelName}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Bio</h3>
                      <p className="text-gray-300 leading-relaxed">
                        {profile.bio || 'No bio available.'}
                      </p>
                    </div>

                    {profile.instrumentTypes && profile.instrumentTypes.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Instruments</h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.instrumentTypes.map((instrument: string, idx: number) => (
                            <span
                              key={idx}
                              className="bg-primary-600/20 border border-primary-500/30 text-primary-400 px-3 py-1 rounded-full text-sm"
                            >
                              {instrument}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.musicCulture && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Music Culture</h3>
                        <span className="bg-secondary-600/20 border border-secondary-500/30 text-secondary-400 px-3 py-1 rounded-full text-sm">
                          {profile.musicCulture}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Channel Statistics</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
                          <span className="text-gray-400">Videos</span>
                          <span className="text-white font-semibold">{videos.length}</span>
                        </div>
                        {profile.friends && (
                          <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
                            <span className="text-gray-400">Friends</span>
                            <span className="text-white font-semibold">{profile.friends.length}</span>
                          </div>
                        )}
                        {profile.analytics?.profileViews && (
                          <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
                            <span className="text-gray-400">Profile Views</span>
                            <span className="text-white font-semibold">{profile.analytics.profileViews}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {profile.country && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Location</h3>
                        <div className="flex items-center gap-2 text-gray-300">
                          <span>📍</span>
                          <span>{profile.country}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Video Modal */}
        <AnimatePresence>
          {selectedVideo && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVideo(null)}
            >
              <motion.div
                className="video-modal-scroll relative w-full max-w-5xl max-h-screen h-screen bg-dark-900 rounded-2xl shadow-2xl overflow-y-auto flex flex-col min-h-0"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={e => e.stopPropagation()}
              >
                {/* Video player sticky header */}
                <div className="sticky top-0 z-10 bg-dark-900 shadow-lg">
                  <div className="relative w-full aspect-video bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeVideoId(selectedVideo.youtubeUrl)}?autoplay=1`}
                      title={selectedVideo.title}
                      className="w-full h-full min-h-[200px] max-h-[60vh]"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <button
                      className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors"
                      onClick={() => setSelectedVideo(null)}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Video info and actions - compact, with Show more for description */}
                  <div className="flex flex-col gap-2 px-6 pt-4 pb-2 border-b border-dark-800">
                    <h3 className="text-2xl font-bold text-white mb-1 line-clamp-2">{selectedVideo.title}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                        <span className="font-semibold text-white">{profile?.fullName || profile?.displayName || 'Musician'}</span>
                        <span className="text-gray-400">{selectedVideo.privacy === 'public' ? 'Public' : 'Private'}</span>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Eye className="w-4 h-4" />
                          <span>{selectedVideo.views || 0} views</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <LikeButton video={selectedVideo} onAction={handleVideoAction} />
                        <button
                          onClick={() => navigate(`/musician/${uid}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Profile
                        </button>
                      </div>
                    </div>
                    {/* Description with Show more/less */}
                    {selectedVideo.description && selectedVideo.description.length > 180 ? (
                      <>
                        <p className={`text-gray-300 text-base mb-2 whitespace-pre-line ${showFullDescription ? '' : 'line-clamp-2'}`}>{selectedVideo.description}</p>
                        {!showFullDescription && (
                          <button
                            className="text-blue-400 text-xs font-semibold mb-2 self-start hover:underline"
                            onClick={() => {
                              setShowFullDescription(true);
                              // Auto-scroll to keep description visible
                              setTimeout(() => {
                                const modal = document.querySelector('.video-modal-scroll');
                                if (modal) {
                                  modal.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                              }, 100);
                            }}
                          >
                            Show more
                          </button>
                        )}
                        {showFullDescription && (
                          <button
                            className="text-blue-400 text-xs font-semibold mb-2 self-start hover:underline"
                            onClick={() => setShowFullDescription(false)}
                          >
                            Show less
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-300 text-base mb-2 whitespace-pre-line">{selectedVideo.description}</p>
                    )}
                  </div>
                </div>
                {/* Comments Section - fills remaining space, always scrollable */}
                <div className="flex-1 min-h-0 bg-dark-900 px-0 sm:px-6 pb-6 pt-2 border-t border-dark-800">
                  <div className="max-w-3xl mx-auto h-full flex flex-col">
                    <CommentsSection videoId={selectedVideo.id!} />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-dark-900 rounded-xl shadow-2xl p-6 max-w-md w-full"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <div className="text-center">
                  <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Delete Video</h3>
                  <p className="text-gray-400 mb-6">Are you sure you want to delete this video? This action cannot be undone.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDeleteVideo(showDeleteConfirm)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="flex-1 bg-dark-700 hover:bg-dark-600 text-gray-300 font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
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

export default MusicianChannelPage; 