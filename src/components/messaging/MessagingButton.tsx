import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { messagingService } from '../../services/messagingService';
import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMessagingModal } from '../../contexts/MessagingModalContext';

const MessagingButton: React.FC = () => {
  const { user } = useAuth();
  const { openMessaging } = useMessagingModal();
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Subscribe to all conversations and sum unreadCount for the current user
  React.useEffect(() => {
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

  if (!user) return null;

  // Badge logic
  const badgeText = unreadCount > 99 ? '99+' : unreadCount > 0 ? unreadCount : '';
  const badgeColor = unreadCount > 0 ? 'bg-red-600' : '';
  const tooltip = unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'No unread messages';

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={openMessaging}
      className="relative p-3 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
      title={tooltip}
    >
      <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
      {/* Badge */}
      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`absolute -top-2 -right-2 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold shadow-lg px-1 ${badgeColor}`}
        >
          {badgeText}
        </motion.div>
      )}
      {/* Pulse animation for new messages */}
      {unreadCount > 0 && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-red-500 rounded-full opacity-20"
        />
      )}
    </motion.button>
  );
};

export default MessagingButton; 