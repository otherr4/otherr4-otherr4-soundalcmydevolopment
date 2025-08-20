import React from 'react';
import LiveChatHub from '../../components/chat/LiveChatHub';

const LiveChatPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <LiveChatHub />
    </div>
  );
};

export default LiveChatPage; 