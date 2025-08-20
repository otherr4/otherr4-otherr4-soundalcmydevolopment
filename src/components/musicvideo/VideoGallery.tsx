import React, { useEffect, useState } from 'react';
import { getMusicVideos, MusicVideo } from '../../services/musicVideoService';
import { useAuth } from '../../contexts/AuthContext';
import { Heart, Eye } from 'lucide-react';

interface VideoGalleryProps {
  onSelect: (video: MusicVideo) => void;
  refreshFlag: boolean;
}

const extractYouTubeVideoId = (url: string) => {
  // Handles https://youtu.be/VIDEO_ID, https://www.youtube.com/watch?v=VIDEO_ID, and extra params
  const regex =
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : '';
};

const getYouTubeThumbnail = (url: string) => {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
};

const VideoGallery: React.FC<VideoGalleryProps> = ({ onSelect, refreshFlag }) => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMusicVideos(user.uid).then((videos: MusicVideo[]) => setVideos(videos)).finally(() => setLoading(false));
  }, [user, refreshFlag]);

  if (loading) return <div className="text-center text-gray-400">Loading videos...</div>;
  if (!videos.length) return <div className="text-center text-gray-500">No videos yet. Upload your first music video!</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {videos.map(video => (
        <div key={video.id} className="bg-dark-700 rounded-lg p-4 shadow cursor-pointer hover:shadow-lg transition" onClick={() => onSelect(video)}>
          <img src={getYouTubeThumbnail(video.youtubeUrl)} alt={video.title} className="rounded w-full mb-3 aspect-video object-cover" />
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-white truncate" title={video.title}>{video.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${video.privacy === 'public' ? 'bg-green-600' : 'bg-yellow-600'} text-white ml-2`}>{video.privacy}</span>
          </div>
          <div className="text-gray-400 text-sm mb-1 truncate">By {video.musicianId}</div>
          <div className="flex items-center gap-4 text-gray-400 text-xs">
            <div className="flex items-center gap-1">
              <Heart className={`w-3 h-3 ${video.likes?.includes(user?.uid || '') ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              <span>{video.likes?.length || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{video.views || 0}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideoGallery; 