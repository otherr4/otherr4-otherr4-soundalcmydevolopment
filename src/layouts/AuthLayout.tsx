import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Music } from 'lucide-react';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="absolute top-4 left-4 z-10">
        <Link to="/" className="flex items-center space-x-2">
          <Music size={28} className="text-secondary-500" />
          <span className="text-xl font-display font-bold bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text">
            SoundAlcmy
          </span>
        </Link>
      </div>
      
      <div className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-md px-6 py-8">
          <Outlet />
        </div>
      </div>
      
      <div className="py-4 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} SoundAlcmy. All rights reserved.
      </div>
    </div>
  );
};

export default AuthLayout;