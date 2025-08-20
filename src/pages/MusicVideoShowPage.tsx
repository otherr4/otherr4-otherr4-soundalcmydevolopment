import React, { useState, useEffect } from 'react';
import VideoUploadForm from '../components/musicvideo/VideoUploadForm';
import VideoStudioTable from '../components/musicvideo/VideoStudioTable';
import AnalyticsDashboard from '../components/musicvideo/AnalyticsDashboard';
import { MusicVideo, getMusicVideos } from '../services/musicVideoService';
import { useAuth } from '../contexts/AuthContext';

const MusicVideoShowPage: React.FC = () => {
  const { user } = useAuth();
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<MusicVideo | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMusicVideos(user.uid)
      .then((allVideos) => {
        // Only show videos owned by the logged-in user
        setVideos(allVideos.filter(v => v.musicianId === user.uid));
      })
      .finally(() => setLoading(false));
  }, [user, refreshFlag]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Music Video Studio</h1>
      <div className="mb-8">
        <VideoUploadForm onUpload={() => setRefreshFlag(f => !f)} />
      </div>
      <AnalyticsDashboard videos={videos} />
      <VideoStudioTable 
        videos={videos}
        loading={loading}
        refreshFlag={refreshFlag}
        onEdit={video => setSelectedVideo(video)}
      />
    </div>
  );
};

export default MusicVideoShowPage; 