import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { messagingService } from '../../services/messagingService';
import { MessageCircle, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MessagingInterface from './MessagingInterface';

const FloatingMessagingButton: React.FC = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Subscribe to all conversations and sum unreadCount for the current user
  useEffect(() => {
    if (!user) return;
    const unsubscribe = messagingService.subscribeToConversations(user.uid, (conversations: any[]) => {
      let totalUnread = 0;
      conversations.forEach(conv => {
        if (conv.unreadCount && typeof conv.unreadCount[user.uid] === 'number') {
          totalUnread += conv.unreadCount[user.uid];
        }
      });
      setUnreadCount(totalUnread);
    });
    return () => unsubscribe();
  }, [user]);

  const handleOpenMessaging = () => {
    setIsMessagingOpen(true);
  };

  const handleCloseMessaging = () => {
    setIsMessagingOpen(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Messaging Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          onClick={handleOpenMessaging}
          className="relative group"
        >
          {/* Main Button */}
          <div className="relative">
            <motion.div
              className="w-14 h-14 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full shadow-2xl flex items-center justify-center cursor-pointer"
              animate={{
                boxShadow: isHovered 
                  ? "0 20px 40px rgba(59, 130, 246, 0.4)" 
                  : "0 10px 30px rgba(0, 0, 0, 0.3)"
              }}
              transition={{ duration: 0.3 }}
            >
              <MessageCircle className="w-6 h-6 text-white" />
            </motion.div>

            {/* Unread Badge */}
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[22px] h-6 flex items-center justify-center font-bold shadow-lg border-2 border-white"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.div>
            )}

            {/* Pulse animation for new messages */}
            {unreadCount > 0 && (
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-red-500 rounded-full opacity-30"
              />
            )}
          </div>

          {/* Tooltip */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-dark-800 text-white px-3 py-2 rounded-lg shadow-lg whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {unreadCount > 0 ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''}` : 'Messages'}
                  </span>
                </div>
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-dark-800 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Quick Actions (optional) */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full mb-3 right-0 bg-dark-800 rounded-lg shadow-lg p-2"
            >
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleOpenMessaging}
                  className="flex items-center gap-2 px-3 py-2 text-white hover:bg-dark-700 rounded transition-colors text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Open Messages
                </button>
                <button
                  onClick={handleOpenMessaging}
                  className="flex items-center gap-2 px-3 py-2 text-white hover:bg-dark-700 rounded transition-colors text-sm"
                >
                  <Users className="w-4 h-4" />
                  New Chat
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Messaging Interface */}
      <AnimatePresence>
        {isMessagingOpen && (
          <MessagingInterface 
            isOpen={isMessagingOpen} 
            onClose={handleCloseMessaging} 
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingMessagingButton; 