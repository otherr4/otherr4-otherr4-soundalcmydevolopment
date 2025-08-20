import React, { useState } from 'react';
import { MusicVideo, likeMusicVideo, unlikeMusicVideo } from '../../services/musicVideoService';
import { useAuth } from '../../contexts/AuthContext';
import { Heart } from 'lucide-react';

interface LikeButtonProps {
  video: MusicVideo;
  onAction: () => void;
}

const LikeButton: React.FC<LikeButtonProps> = ({ video, onAction }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const likes = video.likes || [];
  const liked = user && likes.includes(user.uid);

  const handleLike = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (liked) {
        await unlikeMusicVideo(video.id!, user.uid);
      } else {
        await likeMusicVideo(video.id!, user.uid);
      }
      onAction();
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
        liked 
          ? 'bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30' 
          : 'bg-dark-700 text-gray-300 border border-dark-600 hover:bg-dark-600 hover:text-white'
      }`}
      onClick={handleLike}
      disabled={loading || !user}
      title={liked ? 'Unlike' : 'Like'}
    >
      <Heart 
        className={`w-5 h-5 transition-all duration-200 ${
          liked ? 'fill-red-500 text-red-500' : 'text-gray-400'
        }`}
        size={20}
      />
      <span className="text-sm font-semibold">{likes.length}</span>
    </button>
  );
};

export default LikeButton; 