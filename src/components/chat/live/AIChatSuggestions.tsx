import React from 'react';

/**
 * AIChatSuggestions will use AI to suggest chatrooms and musicians
 * based on user profile, interests, and previous chats.
 * (Placeholder for now)
 */
const AIChatSuggestions: React.FC = () => {
  return (
    <div className="mt-4 p-3 rounded-lg bg-gray-800/70 border border-primary-500/30 shadow-inner">
      <h3 className="text-primary-400 font-semibold mb-1">Suggested for You</h3>
      <ul className="text-gray-300 text-sm list-disc ml-5">
        <li>Join "Mixing & Mastering Tips" – trending now</li>
        <li>Connect with musicians from your country</li>
        <li>Try "Carnatic Vocalists" for cultural exchange</li>
      </ul>
      <div className="mt-2 text-xs text-gray-400">(AI-powered suggestions coming soon)</div>
    </div>
  );
};

export default AIChatSuggestions; 