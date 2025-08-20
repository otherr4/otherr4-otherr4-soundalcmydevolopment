import React, { useState } from 'react';
import { uploadMusicVideo } from '../../services/musicVideoService';
import { useAuth } from '../../contexts/AuthContext';

const isValidYouTubeUrl = (url: string) => {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/i.test(url);
};

const VideoUploadForm: React.FC<{ onUpload: () => void }> = ({ onUpload }) => {
  const { user } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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
      await uploadMusicVideo({
        musicianId: user.uid,
        youtubeUrl,
        title,
        description,
        privacy,
      });
      setSuccess('Video uploaded successfully!');
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
    <form onSubmit={handleSubmit} className="bg-dark-800 p-6 rounded-lg shadow mb-8">
      <h2 className="text-xl font-semibold mb-4">Upload Your YouTube Music Video</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-500 mb-2">{success}</div>}
      <div className="mb-4">
        <label className="block text-gray-300 mb-1">YouTube URL</label>
        <input type="text" className="w-full p-2 rounded bg-dark-700 text-white" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." required />
      </div>
      <div className="mb-4">
        <label className="block text-gray-300 mb-1">Title</label>
        <input type="text" className="w-full p-2 rounded bg-dark-700 text-white" value={title} onChange={e => setTitle(e.target.value)} required />
      </div>
      <div className="mb-4">
        <label className="block text-gray-300 mb-1">Description</label>
        <textarea className="w-full p-2 rounded bg-dark-700 text-white" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="mb-4">
        <label className="block text-gray-300 mb-1">Privacy</label>
        <select className="w-full p-2 rounded bg-dark-700 text-white" value={privacy} onChange={e => setPrivacy(e.target.value as 'public' | 'private')}>
          <option value="public">Public (everyone can see)</option>
          <option value="private">Private (only you can see)</option>
        </select>
      </div>
      <button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-2 px-6 rounded" disabled={loading}>{loading ? 'Uploading...' : 'Upload Video'}</button>
    </form>
  );
};

export default VideoUploadForm; 