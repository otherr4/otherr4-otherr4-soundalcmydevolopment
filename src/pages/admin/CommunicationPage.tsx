import React from 'react';
import CommunicationHub from '../../components/communication/CommunicationHub';

const CommunicationPage: React.FC = () => {
  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Communication Hub</h1>
        <p className="text-gray-400 mt-1">
          Manage and monitor all communication channels
        </p>
      </div>
      
      <div className="bg-dark-800 rounded-lg shadow-lg overflow-hidden h-[calc(100vh-12rem)]">
        <CommunicationHub />
      </div>
    </div>
  );
};

export default CommunicationPage; 