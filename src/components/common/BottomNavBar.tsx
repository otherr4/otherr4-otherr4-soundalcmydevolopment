import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  User, 
  Video, 
  MessageCircle, 
  MoreHorizontal,
  MessageSquare,
  Users,
  Music,
  Mic,
  Podcast,
  Radio,
  Headphones,
  Phone,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Profile', icon: User, path: '/profile' },
  { label: 'Video Channel', icon: Video, path: '/musician/me/channel' },
  { label: 'Messages', icon: MessageCircle, path: '/messaging' },
];

const moreOptions = [
  {
    title: 'Communication',
    items: [
      { label: 'Live Chat', icon: MessageSquare, path: '/chat/live', badge: 0, isNew: true },
      { label: 'Messages', icon: MessageCircle, path: '/messaging', badge: 0 },
      { label: 'Zoom Meetings', icon: Video, path: '/chat/zoom' },
      { label: 'Voice Chat', icon: Headphones, path: '/chat/voice', isNew: true },
    ]
  },
  {
    title: 'Community',
    items: [
      { label: 'Soundalchemy Community', icon: Users, path: '/community', badge: 12 },
      { label: 'Direct Messages', icon: MessageCircle, path: '/messages' },
      { label: 'Music Video Show', icon: Music, path: '/music-videos' },
      { label: 'SoundAlcmy Video Channel', icon: Video, path: '/musician/me/channel' },
    ]
  },
  {
    title: 'Audio Tools',
    items: [
      { label: 'Music Studio', icon: Music, path: '/studio', isNew: true },
      { label: 'Recording', icon: Mic, path: '/recording' },
      { label: 'Podcast', icon: Podcast, path: '/podcast' },
      { label: 'Live Stream', icon: Radio, path: '/stream' },
    ]
  }
];

const BottomNavBar: React.FC = () => {
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown when route changes
  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-dark-900 border-t border-dark-700 flex md:hidden justify-around py-1 shadow-xl">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center px-2 py-1 text-xs font-medium transition-colors ${isActive ? 'text-primary-400' : 'text-gray-400 hover:text-white'}`}
            >
              <item.icon size={24} className="mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        
        {/* More Button */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`flex flex-col items-center justify-center px-2 py-1 text-xs font-medium transition-colors ${isMoreOpen ? 'text-primary-400' : 'text-gray-400 hover:text-white'}`}
          >
            <MoreHorizontal size={24} className="mb-0.5" />
            <span>More</span>
            {isMoreOpen ? (
              <ChevronUp size={12} className="mt-1" />
            ) : (
              <ChevronDown size={12} className="mt-1" />
            )}
          </button>
        </div>
      </nav>

      {/* Full Screen Modal Dropdown */}
      <AnimatePresence>
        {isMoreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setIsMoreOpen(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-md bg-dark-800 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-dark-600">
                <h2 className="text-lg font-bold text-white">More Options</h2>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="p-2 rounded-full hover:bg-dark-700 transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
                <div className="p-4 space-y-6">
                  {moreOptions.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="space-y-3">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 border-b border-dark-600 pb-2">
                        {section.title}
                      </h3>
                      <div className="space-y-2">
                        {section.items.map((item, itemIndex) => {
                          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                          return (
                            <Link
                              key={`${sectionIndex}-${itemIndex}`}
                              to={item.path}
                              onClick={() => setIsMoreOpen(false)}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                                isActive 
                                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' 
                                  : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <item.icon size={20} className="flex-shrink-0" />
                                <span className="font-medium">{item.label}</span>
                                {item.isNew && (
                                  <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full flex-shrink-0">
                                    New
                                  </span>
                                )}
                              </div>
                              {item.badge !== undefined && (
                                <span className="px-2 py-0.5 text-xs bg-primary-500 text-white rounded-full flex-shrink-0 ml-2">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BottomNavBar; 