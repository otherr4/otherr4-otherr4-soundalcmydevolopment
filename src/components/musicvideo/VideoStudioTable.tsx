import React, { useState } from 'react';
import { MusicVideo } from '../../services/musicVideoService';
import { Pencil, Trash2, Eye, EyeOff, Heart } from 'lucide-react';

interface VideoStudioTableProps {
  videos: MusicVideo[];
  loading: boolean;
  refreshFlag: boolean;
  onEdit: (video: MusicVideo) => void;
  onDelete?: (video: MusicVideo) => void;
}

// Improved YouTube ID extraction for all common formats
const extractYouTubeVideoId = (url: string) => {
  if (!url) return '';
  const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : '';
};

const fallbackThumb = '/default-thumb.png'; // Place a default image in public/

const getYouTubeThumbnail = (url: string) => {
  const id = extractYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : fallbackThumb;
};

const PAGE_SIZE = 10;

const VideoStudioTable: React.FC<VideoStudioTableProps> = ({ videos, loading, onEdit, onDelete }) => {
  const [page, setPage] = useState(0);
  const pagedVideos = videos.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.ceil(videos.length / PAGE_SIZE);

  if (loading) return <div className="text-center text-gray-400">Loading videos...</div>;
  if (!videos.length) return <div className="text-center text-gray-500">No videos yet. Upload your first music video!</div>;

  return (
    <div className="overflow-x-auto bg-dark-800 rounded-lg shadow">
      <table className="min-w-full divide-y divide-dark-700">
        <thead>
          <tr className="text-left text-gray-400 text-xs uppercase">
            <th className="px-4 py-3">Video</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Privacy</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Likes</th>
            <th className="px-4 py-3">Views</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-700">
          {pagedVideos.map(video => (
            <tr key={video.id} className="hover:bg-dark-700 transition">
              <td className="px-4 py-2">
                <img
                  src={getYouTubeThumbnail(video.youtubeUrl)}
                  alt={video.title}
                  className="w-24 h-14 rounded object-cover border border-dark-600"
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).src = fallbackThumb; }}
                />
              </td>
              <td className="px-4 py-2">
                <div className="font-semibold text-white truncate max-w-xs" title={video.title}>{video.title}</div>
                <div className="text-xs text-gray-400 truncate max-w-xs" title={video.description}>{video.description}</div>
              </td>
              <td className="px-4 py-2">
                {video.privacy === 'public' ? (
                  <span className="inline-flex items-center gap-1 bg-green-700 text-white text-xs px-2 py-0.5 rounded"><Eye size={14} /> Public</span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-yellow-700 text-white text-xs px-2 py-0.5 rounded"><EyeOff size={14} /> Private</span>
                )}
              </td>
              <td className="px-4 py-2 text-gray-300 text-xs">
                {video.createdAt?.toDate ? video.createdAt.toDate().toLocaleDateString() : ''}
              </td>
              <td className="px-4 py-2 text-gray-300 text-xs">
                <span className="inline-flex items-center gap-1"><Heart size={14} />{video.likes?.length || 0}</span>
              </td>
              <td className="px-4 py-2 text-gray-300 text-xs">
                <span className="inline-flex items-center gap-1"><Eye size={14} />{video.views || 0}</span>
              </td>
              <td className="px-4 py-2">
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-dark-600 rounded" title="Edit" onClick={() => onEdit(video)}><Pencil size={18} /></button>
                  {onDelete && <button className="p-2 hover:bg-dark-600 rounded" title="Delete" onClick={() => onDelete(video)}><Trash2 size={18} /></button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pageCount > 1 && (
        <div className="flex justify-center items-center gap-2 py-4">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded bg-dark-700 text-white disabled:opacity-50">Prev</button>
          <span className="text-gray-400">Page {page + 1} of {pageCount}</span>
          <button disabled={page === pageCount - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded bg-dark-700 text-white disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
};

export default VideoStudioTable; 