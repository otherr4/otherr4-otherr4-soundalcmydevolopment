import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { messagingService } from '../services/messagingService';
import { MessageStats } from '../types/messaging';
import { MessageCircle, Users, Send, Clock, Check, CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import MessagingInterface from '../components/messaging/MessagingInterface';
import SEO from '../components/common/SEO';

const messagingSchema = `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Messaging | SoundAlchemy",
  "description": "Chat and connect with global musicians on SoundAlchemy. Secure, real-time messaging for music collaboration. Powered by Lehan Kawshila.",
  "url": "https://soundalcmy.com/messaging"
}`;

const MessagingPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      try {
        setLoading(true);
        const messageStats = await messagingService.getMessageStats(user.uid);
        setStats(messageStats);
      } catch (error) {
        console.error('Error loading message stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user]);

  const handleOpenMessaging = () => {
    setIsMessagingOpen(true);
  };

  const handleCloseMessaging = () => {
    setIsMessagingOpen(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please log in to access messaging</h1>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Messaging | SoundAlchemy – Chat with Global Musicians"
        description="Chat and connect with global musicians on SoundAlchemy. Secure, real-time messaging for music collaboration. Powered by Lehan Kawshila."
        keywords="soundalcmy, soundalchemy, music, messaging, chat, global musicians, lehan kawshila, orchestra, guitar, world wide"
        image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
        url="https://soundalcmy.com/messaging"
        lang="en"
        schema={messagingSchema}
      />
      <div className="min-h-screen bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-primary-400" />
              Messaging Center
            </h1>
            <p className="text-gray-400">
              Connect with your verified musician friends through secure messaging
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-800 rounded-lg p-6 border border-dark-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Conversations</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? '...' : stats?.totalConversations || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-primary-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-dark-800 rounded-lg p-6 border border-dark-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Messages</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? '...' : stats?.totalMessages || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary-500/20 rounded-lg flex items-center justify-center">
                  <Send className="w-6 h-6 text-secondary-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-dark-800 rounded-lg p-6 border border-dark-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Unread Messages</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? '...' : stats?.unreadMessages || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <Check className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-dark-800 rounded-lg p-6 border border-dark-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Friends</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? '...' : stats?.activeFriends || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 rounded-lg p-6 border border-primary-500/20"
            >
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Start Messaging
              </h3>
              <p className="text-gray-400 mb-4">
                Open the messaging interface to chat with your verified musician friends.
              </p>
              <button
                onClick={handleOpenMessaging}
                className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Open Messages
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-dark-800 to-dark-700 rounded-lg p-6 border border-dark-600"
            >
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Friend System
              </h3>
              <p className="text-gray-400 mb-4">
                You can only message verified musicians who are your friends. Send friend requests to start conversations.
              </p>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-dark-700 text-white px-6 py-3 rounded-lg hover:bg-dark-600 transition-colors duration-300"
              >
                Find Friends
              </button>
            </motion.div>
          </div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-dark-800 rounded-lg p-6 border border-dark-700"
          >
            <h3 className="text-xl font-semibold text-white mb-6">Messaging Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-primary-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Friend-Only Messaging</h4>
                  <p className="text-sm text-gray-400">Only message verified musicians who are your friends</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-secondary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-secondary-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Real-time Updates</h4>
                  <p className="text-sm text-gray-400">Instant message delivery and read receipts</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCheck className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Message Status</h4>
                  <p className="text-sm text-gray-400">See when messages are sent, delivered, and read</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Messaging Interface */}
        <MessagingInterface 
          isOpen={isMessagingOpen} 
          onClose={handleCloseMessaging} 
        />
      </div>
    </>
  );
};

export default MessagingPage; 