import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Music, 
  Users, 
  CheckCircle, 
  XCircle, 
  Loader,
  ExternalLink,
  Youtube,
  MapPin,
  Calendar,
  Eye,
  User,
  MessageCircle,
  Send,
  Clock,
  BadgeCheck,
  Heart,
  Star,
  ArrowRight,
  Play,
  Share2
} from 'lucide-react';
import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDoc,
  addDoc,
  collection
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getGoogleDriveDirectUrl } from '../../utils/imageUtils';

interface CollaborationInvitationNotificationProps {
  notification: {
    id: string;
    type: string;
    collaborationId: string;
    fromUserId: string;
    message: string;
    createdAt: Date;
    read: boolean;
  };
  collaboration: any;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

interface SenderInfo {
  uid: string;
  fullName: string;
  profileImagePath?: string;
  isVerified: boolean;
  instrumentType?: string;
  country?: string;
  bio?: string;
}

const CollaborationInvitationNotification: React.FC<CollaborationInvitationNotificationProps> = ({
  notification,
  collaboration,
  onAccept,
  onDecline,
  onClose
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [senderInfo, setSenderInfo] = useState<SenderInfo | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [showFullProfile, setShowFullProfile] = useState(false);

  // Fetch sender information
  useEffect(() => {
    const fetchSenderInfo = async () => {
      try {
        const senderDoc = await getDoc(doc(db, 'users', notification.fromUserId));
        if (senderDoc.exists()) {
          const data = senderDoc.data();
          setSenderInfo({
            uid: notification.fromUserId,
            fullName: data.fullName || data.displayName || 'Unknown Musician',
            profileImagePath: data.profileImagePath || data.photoURL,
            isVerified: !!data.isVerified,
            instrumentType: data.instrumentType,
            country: data.country,
            bio: data.bio
          });
        }
      } catch (error) {
        console.error('Error fetching sender info:', error);
      }
    };

    fetchSenderInfo();
  }, [notification.fromUserId]);

  const handleAccept = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      // Update invitation status
      await updateDoc(doc(db, 'collaborationInvitations', notification.id), {
        status: 'accepted',
        respondedAt: serverTimestamp(),
        responseMessage: responseMessage || 'Accepted the invitation'
      });

      // Add user to collaboration participants
      const collaborationRef = doc(db, 'collaborations', collaboration.id);
      await updateDoc(collaborationRef, {
        currentParticipants: collaboration.currentParticipants + 1,
        participants: [...(collaboration.participants || []), {
          userId: user.uid,
          userName: user.displayName || user.email,
          userAvatar: user.photoURL,
          role: 'Participant',
          instrument: 'Unknown',
          joinedAt: new Date(),
          status: 'active'
        }]
      });

      // Create notification for collaboration creator
      await addDoc(collection(db, 'users', collaboration.creatorId, 'notifications'), {
        type: 'collaboration_join',
        collaborationId: collaboration.id,
        fromUserId: user.uid,
        message: `${user.displayName || user.email} has joined your collaboration "${collaboration.title}"`,
        createdAt: serverTimestamp(),
        read: false
      });

      // Mark notification as read
      await updateDoc(doc(db, 'users', user.uid, 'notifications', notification.id), {
        read: true
      });

      toast.success('Invitation accepted! You are now part of the collaboration.');
      onAccept();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      // Update invitation status
      await updateDoc(doc(db, 'collaborationInvitations', notification.id), {
        status: 'declined',
        respondedAt: serverTimestamp(),
        responseMessage: responseMessage || 'Declined the invitation'
      });

      // Create notification for collaboration creator
      await addDoc(collection(db, 'users', collaboration.creatorId, 'notifications'), {
        type: 'collaboration_decline',
        collaborationId: collaboration.id,
        fromUserId: user.uid,
        message: `${user.displayName || user.email} has declined your invitation to "${collaboration.title}"`,
        createdAt: serverTimestamp(),
        read: false
      });

      // Mark notification as read
      await updateDoc(doc(db, 'users', user.uid, 'notifications', notification.id), {
        read: true
      });

      toast.success('Invitation declined');
      onDecline();
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewCollaboration = () => {
    navigate(`/collaborations/${collaboration.id}`);
    onClose();
  };

  const handleViewSenderProfile = () => {
    if (senderInfo) {
      navigate(`/musician/${senderInfo.uid}`);
      onClose();
    }
  };

  const handleShowFullProfile = () => {
    setShowFullProfile(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-dark-800 rounded-xl p-6 border border-dark-700 shadow-lg max-w-2xl w-full"
      >
        {/* Header with Sender Info */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={senderInfo?.profileImagePath ? getGoogleDriveDirectUrl(senderInfo.profileImagePath) : '/default-avatar.svg'}
                alt={senderInfo?.fullName || 'Musician'}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary-400 cursor-pointer hover:scale-105 transition-transform"
                onClick={handleShowFullProfile}
              />
              {senderInfo?.isVerified && (
                <BadgeCheck className="absolute -bottom-1 -right-1 w-5 h-5 text-blue-500 bg-white rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-white">{senderInfo?.fullName || 'Unknown Musician'}</h3>
                <button
                  onClick={handleViewSenderProfile}
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                {senderInfo?.instrumentType && (
                  <span className="flex items-center gap-1">
                    <Music className="w-4 h-4" />
                    {senderInfo.instrumentType}
                  </span>
                )}
                {senderInfo?.country && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {senderInfo.country}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(notification.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Collaboration Details */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 rounded-lg p-4 mb-4">
            <h4 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              <Music className="w-5 h-5 text-primary-400" />
              {collaboration.title}
            </h4>
            <p className="text-gray-300 mb-3">{collaboration.description}</p>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users className="w-4 h-4" />
                <span>{collaboration.currentParticipants}/{collaboration.maxParticipants || '∞'} participants</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="w-4 h-4" />
                <span className="capitalize">{collaboration.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>{new Date(collaboration.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Star className="w-4 h-4" />
                <span className="capitalize">{collaboration.genre}</span>
              </div>
            </div>

            {/* Required Instruments */}
            <div className="mb-3">
              <h5 className="text-sm font-semibold text-gray-300 mb-2">Required Instruments:</h5>
              <div className="flex flex-wrap gap-2">
                {collaboration.instruments?.map((instrument: string) => (
                  <span
                    key={instrument}
                    className="px-3 py-1 bg-dark-700 rounded-full text-xs text-gray-300 border border-dark-600"
                  >
                    {instrument}
                  </span>
                ))}
              </div>
            </div>

            {/* Reference Links */}
            {collaboration.referenceLinks && collaboration.referenceLinks.length > 0 && (
              <div className="mb-3">
                <h5 className="text-sm font-semibold text-gray-300 mb-2">Reference Links:</h5>
                <div className="space-y-2">
                  {collaboration.referenceLinks.map((link: string, index: number) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="truncate">{link}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Invitation Message */}
          {notification.message && (
            <div className="mb-4 p-4 bg-dark-700 rounded-lg border-l-4 border-primary-500">
              <h5 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary-400" />
                Personal Message from {senderInfo?.fullName || 'Musician'}:
              </h5>
              <p className="text-gray-300 text-sm leading-relaxed">{notification.message}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleViewCollaboration}
            className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>View Collaboration</span>
          </button>
          <button
            onClick={() => setShowResponseModal(true)}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Respond with Message</span>
          </button>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span>{isProcessing ? 'Accepting...' : 'Accept Invitation'}</span>
          </button>
          <button
            onClick={handleDecline}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span>{isProcessing ? 'Declining...' : 'Decline Invitation'}</span>
          </button>
        </div>
      </motion.div>

      {/* Response Message Modal */}
      <AnimatePresence>
        {showResponseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-bold text-white mb-4">Add Response Message</h3>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Add a personal message to your response..."
                className="w-full p-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-400 mt-1">
                {responseMessage.length}/500
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowResponseModal(false)}
                  className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowResponseModal(false);
                    // Continue with accept/decline with the message
                  }}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Profile Modal */}
      <AnimatePresence>
        {showFullProfile && senderInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Musician Profile</h3>
                <button
                  onClick={() => setShowFullProfile(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col items-center text-center">
                <img
                  src={senderInfo.profileImagePath ? getGoogleDriveDirectUrl(senderInfo.profileImagePath) : '/default-avatar.svg'}
                  alt={senderInfo.fullName}
                  className="w-20 h-20 rounded-full object-cover border-4 border-primary-400 mb-3"
                />
                <h4 className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
                  {senderInfo.fullName}
                  {senderInfo.isVerified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
                </h4>
                {senderInfo.instrumentType && (
                  <p className="text-gray-400 text-sm mb-2">{senderInfo.instrumentType}</p>
                )}
                {senderInfo.country && (
                  <p className="text-gray-400 text-sm mb-3">{senderInfo.country}</p>
                )}
                {senderInfo.bio && (
                  <p className="text-gray-300 text-sm leading-relaxed">{senderInfo.bio}</p>
                )}
                <button
                  onClick={handleViewSenderProfile}
                  className="mt-4 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  View Full Profile
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CollaborationInvitationNotification; 