import React from 'react';

const StudioPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Music Studio</h1>
      <p className="text-gray-300">Create, record, and collaborate. Connect with BandLab for browser-based music creation.</p>
      <div className="bg-dark-800 rounded-lg p-6 space-y-4">
        <div className="text-lg font-semibold">BandLab Studio</div>
        <p className="text-gray-400">Open BandLab in a new tab and start your session. Your SoundAlchemy profile stays in sync.</p>
        <a className="btn-primary" href="https://www.bandlab.com" target="_blank" rel="noreferrer">Open BandLab</a>
      </div>
      <div className="bg-dark-800 rounded-lg p-6 space-y-2">
        <div className="text-lg font-semibold">Recommended Gear</div>
        <ul className="list-disc ml-6 text-gray-300">
          <li>Audio Technica AT2020 or Shure MV7 microphones</li>
          <li>Focusrite Scarlett Solo audio interface</li>
          <li>Closed-back headphones (ATH-M50x)</li>
        </ul>
      </div>
    </div>
  );
};

export default StudioPage;


