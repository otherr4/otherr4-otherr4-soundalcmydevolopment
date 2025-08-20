import React from 'react';

const LiveStreamPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Live Stream</h1>
      <p className="text-gray-300">Go live on your favorite platforms. Use OBS or StreamYard, paste your RTMP details here for reference.</p>
      <div className="bg-dark-800 rounded-lg p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400">RTMP Server</div>
            <input className="form-input w-full" placeholder="rtmp://..." />
          </div>
          <div>
            <div className="text-sm text-gray-400">Stream Key</div>
            <input className="form-input w-full" placeholder="key" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamPage;


