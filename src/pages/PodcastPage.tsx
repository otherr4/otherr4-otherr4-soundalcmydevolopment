import React from 'react';

const PodcastPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Podcast</h1>
      <p className="text-gray-300">Plan, record, and publish your podcast. Upload episodes and share with your fans.</p>
      <div className="bg-dark-800 rounded-lg p-6">
        <p className="text-gray-400">Integration hooks for hosting (Anchor, Spotify for Podcasters) can be added here.</p>
      </div>
    </div>
  );
};

export default PodcastPage;


