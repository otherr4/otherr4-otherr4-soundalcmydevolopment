import React, { useEffect, useState } from 'react';
import { MusicVideo, trackVideoView } from '../../services/musicVideoService';
import LikeButton from './LikeButton';
import CommentsSection from './CommentsSection';
import { useAuth } from '../../contexts/AuthContext';
import { getProfileImageUrlWithFallback } from '../../utils/imageUtils';
import { Eye } from 'lucide-react';

interface VideoModalProps {
  video: MusicVideo;
  onClose: () => void;
  onAction: () => void;
}

const extractYouTubeVideoId = (url: string) => {
  const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : '';
};

const VideoModal: React.FC<VideoModalProps> = ({ video, onClose, onAction }) => {
  const videoId = extractYouTubeVideoId(video.youtubeUrl);
  const { userProfile, getUserProfile, user } = useAuth();
  const [musicianProfile, setMusicianProfile] = useState<any>(null);
  const [subscribed, setSubscribed] = useState(false);
  
  // Fetch the musician's profile data
  useEffect(() => {
    const fetchMusicianProfile = async () => {
      if (video.musicianId) {
        try {
          const profile = await getUserProfile(video.musicianId);
          setMusicianProfile(profile);
        } catch (error) {
          console.error('Error fetching musician profile:', error);
        }
      }
    };
    fetchMusicianProfile();
  }, [video.musicianId, getUserProfile]);

  useEffect(() => { setSubscribed(false); }, [video.musicianId]);

  // Track video view when modal opens
  useEffect(() => {
    if (video.privacy === 'public' || (user && video.musicianId === user.uid)) {
      trackVideoView(video.id!).catch(error => {
        console.error('Error tracking video view:', error);
      });
    }
  }, [video.id, video.privacy, user]);

  const channelName = musicianProfile?.displayName || 'Musician Channel';
  const channelAvatar = getProfileImageUrlWithFallback(musicianProfile?.photoURL);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="bg-dark-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl z-10 bg-dark-900 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-800 transition-colors" 
          onClick={onClose}
        >
          ×
        </button>
        
        {/* Video Player */}
        <div className="w-full aspect-video bg-black flex-shrink-0">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="rounded-t-xl w-full h-full"
          ></iframe>
        </div>
        
        {/* Content Area with Scroll */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Video Title */}
            <div className="text-xl sm:text-2xl font-bold text-white leading-tight">
              {video.title}
            </div>
            
            {/* Channel Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-dark-700 pb-4">
              <div className="flex items-center gap-3">
                <img 
                  src={channelAvatar} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full object-cover border border-dark-700 flex-shrink-0" 
                />
                <div className="min-w-0">
                  <div className="font-semibold text-white text-base truncate">
                    {channelName}
                  </div>
                  <div className="text-gray-400 text-xs truncate">
                    @{video.musicianId?.slice(0, 8) || 'user'}
                  </div>
                </div>
                <button
                  className={`ml-4 px-4 py-1 rounded font-semibold text-sm transition-colors flex-shrink-0 ${subscribed ? 'bg-gray-700 text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}
                  onClick={() => setSubscribed(s => !s)}
                >
                  {subscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                  <Eye className="w-4 h-4" />
                  <span>{video.views || 0} views</span>
                </div>
                <LikeButton video={video} onAction={onAction} />
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${video.privacy === 'public' ? 'bg-green-700 text-green-100' : 'bg-yellow-700 text-yellow-100'}`}>
                  {video.privacy === 'public' ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
            
            {/* Description */}
            <div className="text-gray-300 text-base whitespace-pre-line leading-relaxed">
              {video.description}
            </div>
            
            {/* Comments Section */}
            <div className="border-t border-dark-700 pt-4">
              <CommentsSection videoId={video.id!} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal; 