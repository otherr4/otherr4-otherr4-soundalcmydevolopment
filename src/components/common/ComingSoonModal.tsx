import React from 'react';
import { Rocket, X } from 'lucide-react';

interface ComingSoonModalProps {
  open: boolean;
  onClose: () => void;
  message: string;
}

const ComingSoonModal: React.FC<ComingSoonModalProps> = ({ open, onClose, message }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-100 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center relative animate-pop-in">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors" aria-label="Close">
          <X size={24} />
        </button>
        <div className="flex flex-col items-center mb-4">
          <Rocket size={48} className="text-pink-500 animate-bounce mb-2" />
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Coming Soon!</h2>
          <p className="text-lg font-medium text-gray-700 mb-2">{message}</p>
          <p className="text-sm text-gray-500">We're working hard to bring you this feature. Stay tuned and get ready for something amazing!</p>
        </div>
        <div className="w-full flex justify-center mt-4">
          <button onClick={onClose} className="px-6 py-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 text-white rounded-full font-bold shadow hover:scale-105 transition-transform">OK, Got it!</button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonModal; 