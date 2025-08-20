import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCollaboration, getCollaborationApplications, updateApplicationStatus, updateCollaboration, addParticipant, removeParticipant } from '../services/collaborationService';
import { Collaboration, CollaborationApplication } from '../types/collaboration';
import { 
  Music,
  Users,
  Calendar,
  MapPin,
  Eye,
  MessageCircle,
  BadgeCheck,
  Loader,
  ExternalLink,
  Share2,
  Facebook,
  MessageCircle as WhatsApp,
  Mail,
  Copy,
  User,
  Heart,
  Star,
  Plus,
  CheckCircle,
  XCircle,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { doc, getDoc, addDoc, collection, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getGoogleDriveDirectUrl } from '../utils/imageUtils';
import SEO from '../components/common/SEO';
import MusicianInvitationModal from '../components/collaboration/MusicianInvitationModal';
import CollaborationManagementPanel from '../components/collaboration/CollaborationManagementPanel';

interface CreatorInfo {
  uid: string;
  fullName: string;
  profileImagePath?: string;
  isVerified: boolean;
  instrumentType?: string;
  country?: string;
  bio?: string;
  email?: string;
}

interface InvitedMessage {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  message: string;
  createdAt: Date;
  type: 'question' | 'interest' | 'suggestion';
}

const CollaborationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collaboration, setCollaboration] = useState<Collaboration | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo | null>(null);
  const [invitedMessages, setInvitedMessages] = useState<InvitedMessage[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showInvitedMessageModal, setShowInvitedMessageModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'question' | 'interest' | 'suggestion'>('question');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [applications, setApplications] = useState<CollaborationApplication[]>([]);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyInstrument, setApplyInstrument] = useState('');
  const [applyMessage, setApplyMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    
    const loadCollaboration = async () => {
      try {
        setLoading(true);
        const data = await getCollaboration(id);
        setCollaboration(data);
        
        // Load creator information
        if (data && data.creatorId) {
          const creatorDoc = await getDoc(doc(db, 'users', data.creatorId));
          if (creatorDoc.exists()) {
            const creatorData = creatorDoc.data();
            setCreatorInfo({
              uid: data.creatorId,
              fullName: creatorData.fullName || creatorData.displayName || 'Unknown Musician',
              profileImagePath: creatorData.profileImagePath || creatorData.photoURL,
              isVerified: !!creatorData.isVerified,
              instrumentType: creatorData.instrumentType,
              country: creatorData.country,
              bio: creatorData.bio,
              email: creatorData.email
            });
          }
        }
      } catch (error) {
        console.error('Error loading collaboration:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCollaboration();
  }, [id]);

  // Load applications for the collaboration
  useEffect(() => {
    if (!id) return;
    
    const loadApplications = async () => {
      try {
        const apps = await getCollaborationApplications(id);
        setApplications(apps);
      } catch (error) {
        console.error('Error loading applications:', error);
      }
    };

    loadApplications();
  }, [id]);

  // Live invited messages
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'collaborations', id, 'invitedMessages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const messages = snap.docs.map(d => ({ id: d.id, ...(d.data() as any), createdAt: (d.data() as any).createdAt?.toDate?.() || new Date() })) as InvitedMessage[];
      setInvitedMessages(messages);
    });
    return () => unsub();
  }, [id]);

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = collaboration?.title || 'Amazing Music Collaboration';
    const description = collaboration?.description || 'Check out this music collaboration!';
    
    let shareUrl = '';
    
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${title}\n\n${description}\n\n${url}`)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title}\n\n${description}`)}&url=${encodeURIComponent(url)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}\n\n${url}`)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
        setShowShareModal(false);
        return;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank');
    setShowShareModal(false);
  };

  const handleSendInvitedMessage = async () => {
    if (!user || !collaboration || !newMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      await addDoc(collection(db, 'collaborations', collaboration.id, 'invitedMessages'), {
        fromUserId: user.uid,
        fromUserName: user.displayName || user.email,
        fromUserAvatar: user.photoURL,
        message: newMessage.trim(),
        type: messageType,
        createdAt: serverTimestamp()
      });

      // Create notification for collaboration creator
      await addDoc(collection(db, 'users', collaboration.creatorId, 'notifications'), {
        type: 'collaboration_message',
        collaborationId: collaboration.id,
        fromUserId: user.uid,
        message: `${user.displayName || user.email} sent a message to your collaboration "${collaboration.title}"`,
        createdAt: serverTimestamp(),
        read: false
      });

      toast.success('Message sent successfully!');
      setNewMessage('');
      setShowInvitedMessageModal(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateCollaboration = async (updates: Partial<Collaboration>) => {
    if (!collaboration) return;
    
    try {
      await updateCollaboration(collaboration.id, updates);
      setCollaboration(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Collaboration updated successfully!');
    } catch (error) {
      console.error('Error updating collaboration:', error);
      toast.error('Failed to update collaboration');
    }
  };

  const handleReviewApplication = async (applicationId: string, status: 'accepted' | 'rejected', message?: string) => {
    try {
      await updateApplicationStatus(applicationId, status, message);
      
      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === applicationId 
          ? { ...app, status, responseMessage: message }
          : app
      ));
      
      toast.success(`Application ${status}`);
    } catch (error) {
      console.error('Error updating application status:', error);
      toast.error('Failed to update application status');
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!collaboration) return;
    
    try {
      await removeParticipant(collaboration.id, userId);
      
      // Update local state
      setCollaboration(prev => prev ? {
        ...prev,
        participants: prev.participants.filter(p => p.userId !== userId),
        currentParticipants: prev.currentParticipants - 1
      } : null);
      
      toast.success('Participant removed successfully');
    } catch (error) {
      console.error('Error removing participant:', error);
      toast.error('Failed to remove participant');
    }
  };

  const handleInviteMusicians = () => {
    setShowInvitationModal(true);
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'question': return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case 'interest': return <Heart className="w-4 h-4 text-red-400" />;
      case 'suggestion': return <Star className="w-4 h-4 text-yellow-400" />;
      default: return <MessageCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'question': return 'Question';
      case 'interest': return 'Interest';
      case 'suggestion': return 'Suggestion';
      default: return 'Message';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!collaboration) {
    return (
      <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Collaboration Not Found</h1>
          <p className="text-gray-400 mb-4">The collaboration you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/collaborations')}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
          >
            Browse Collaborations
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`${collaboration.title} | SoundAlchemy Collaboration`}
        description={collaboration.description}
        keywords={`collaboration, music, ${collaboration.genre}, ${collaboration.instruments.join(', ')}`}
        image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
        url={`https://soundalcmy.com/collaboration/${collaboration.id}`}
        lang="en"
      />
      
      <div className="min-h-screen bg-dark-900 text-white">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/collaborations')}
              className="text-gray-400 hover:text-white transition-colors mb-4 flex items-center gap-2"
            >
              ← Back to Collaborations
            </button>
            
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{collaboration.title}</h1>
                
                {/* Creator Info with Profile Photo */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <img
                      src={creatorInfo?.profileImagePath ? getGoogleDriveDirectUrl(creatorInfo.profileImagePath) : '/default-avatar.svg'}
                      alt={creatorInfo?.fullName || 'Creator'}
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary-400"
                    />
                    {creatorInfo?.isVerified && (
                      <BadgeCheck className="absolute -bottom-1 -right-1 w-5 h-5 text-blue-500 bg-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="text-gray-400">by <span className="text-white font-semibold">{creatorInfo?.fullName || collaboration.creatorName}</span></p>
                    {creatorInfo?.instrumentType && (
                      <p className="text-sm text-gray-500">{creatorInfo.instrumentType}</p>
                    )}
                    {creatorInfo?.country && (
                      <p className="text-sm text-gray-500">{creatorInfo.country}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  collaboration.status === 'open' ? 'bg-green-500' :
                  collaboration.status === 'in_progress' ? 'bg-blue-500' :
                  collaboration.status === 'completed' ? 'bg-purple-500' :
                  'bg-red-500'
                }`}>
                  {collaboration.status.replace('_', ' ')}
                </span>
                {collaboration.isVerified && <BadgeCheck className="w-5 h-5 text-green-400" />}
              </div>
            </div>
          </div>

          {/* Collaboration Management Panel - Only show for owner */}
          {user && user.uid === collaboration.creatorId && (
            <CollaborationManagementPanel
              collaboration={collaboration}
              applications={applications}
              onUpdateCollaboration={handleUpdateCollaboration}
              onReviewApplication={handleReviewApplication}
              onRemoveParticipant={handleRemoveParticipant}
              onInviteMusicians={handleInviteMusicians}
            />
          )}

          {/* Creator Full Details */}
          {creatorInfo && (
            <div className="bg-dark-800 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-400" />
                About the Creator
              </h2>
              <div className="flex items-start gap-4">
                <img
                  src={creatorInfo.profileImagePath ? getGoogleDriveDirectUrl(creatorInfo.profileImagePath) : '/default-avatar.svg'}
                  alt={creatorInfo.fullName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary-400"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">{creatorInfo.fullName}</h3>
                    {creatorInfo.isVerified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
                  </div>
                  {creatorInfo.instrumentType && (
                    <p className="text-gray-300 mb-2">
                      <Music className="w-4 h-4 inline mr-2" />
                      {creatorInfo.instrumentType}
                    </p>
                  )}
                  {creatorInfo.country && (
                    <p className="text-gray-300 mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      {creatorInfo.country}
                    </p>
                  )}
                  {creatorInfo.bio && (
                    <p className="text-gray-300 text-sm leading-relaxed">{creatorInfo.bio}</p>
                  )}
                  <button
                    onClick={() => navigate(`/musician/${creatorInfo.uid}`)}
                    className="mt-3 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors text-sm"
                  >
                    View Full Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-dark-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <p className="text-gray-300 leading-relaxed">{collaboration.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-dark-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Project Details</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Music className="w-5 h-5 text-primary-400" />
                  <span className="text-gray-300">Genre: <span className="text-white">{collaboration.genre}</span></span>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-primary-400" />
                  <span className="text-gray-300">Participants: <span className="text-white">{Math.max(0, collaboration.currentParticipants)}/{collaboration.maxParticipants || '∞'}</span></span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-primary-400" />
                  <span className="text-gray-300">Location: <span className="text-white capitalize">{collaboration.location}</span></span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-primary-400" />
                  <span className="text-gray-300">Created: <span className="text-white">{((collaboration as any).createdAt?.toDate?.() || new Date(collaboration.createdAt)).toLocaleDateString?.() || ''}</span></span>
                </div>
              </div>
            </div>

            <div className="bg-dark-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Required Instruments</h3>
              <div className="flex flex-wrap gap-2">
                {collaboration.instruments.map(instrument => (
                  <span
                    key={instrument}
                    className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-sm"
                  >
                    {instrument}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Requirements */}
          {collaboration.requirements.length > 0 && (
            <div className="bg-dark-800 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Requirements</h3>
              <ul className="space-y-2">
                {collaboration.requirements.map((req, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-primary-400 mt-1">•</span>
                    <span className="text-gray-300">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Invited Messages Section */}
          <div className="bg-dark-800 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary-400" />
                Invited Messages & Questions
              </h3>
              {user && user.uid !== collaboration.creatorId && (
                <button
                  onClick={() => setShowInvitedMessageModal(true)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ask Question
                </button>
              )}
            </div>
            
            {invitedMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No messages yet.</p>
                <p className="text-gray-500 text-sm">Be the first to ask a question or show interest!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invitedMessages.map((message) => (
                  <div key={message.id} className="p-4 bg-dark-700 rounded-lg border border-dark-600">
                    <div className="flex items-start gap-3">
                      <img
                        src={message.fromUserAvatar || '/default-avatar.svg'}
                        alt={message.fromUserName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-white">{message.fromUserName}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            message.type === 'question' ? 'bg-blue-500/20 text-blue-400' :
                            message.type === 'interest' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {getMessageTypeLabel(message.type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm">{message.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-dark-800 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-primary-400" />
                <span className="text-gray-300">Start Date: <span className="text-white">{new Date(collaboration.timeline.startDate).toLocaleDateString()}</span></span>
              </div>
              {collaboration.timeline.endDate && (
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-primary-400" />
                  <span className="text-gray-300">End Date: <span className="text-white">{new Date(collaboration.timeline.endDate).toLocaleDateString()}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Reference Links */}
          {collaboration.referenceLinks && collaboration.referenceLinks.length > 0 && (
            <div className="bg-dark-800 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Reference Links</h3>
              <div className="space-y-3">
                {collaboration.referenceLinks.map((link, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <ExternalLink className="w-5 h-5 text-primary-400" />
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      {link}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="bg-dark-800 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Eye className="w-5 h-5 text-blue-400" />
                  <span className="text-2xl font-bold text-white">{collaboration.views}</span>
                </div>
                <span className="text-gray-400 text-sm">Views</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                  <span className="text-2xl font-bold text-white">{collaboration.applications}</span>
                </div>
                <span className="text-gray-400 text-sm">Applications</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span className="text-2xl font-bold text-white">{collaboration.currentParticipants}</span>
                </div>
                <span className="text-gray-400 text-sm">Participants</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Calendar className="w-5 h-5 text-orange-400" />
                  <span className="text-2xl font-bold text-white">{collaboration.attachments.length}</span>
                </div>
                <span className="text-gray-400 text-sm">Attachments</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            {user?.uid !== collaboration.creatorId && collaboration.status === 'open' && (
              <button 
                onClick={() => {
                  setApplyInstrument(collaboration.instruments[0] || 'Vocals');
                  setApplyMessage('');
                  setShowApplyModal(true);
                }}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Apply to Join
              </button>
            )}
            <button 
              onClick={() => setShowShareModal(true)}
              className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              Share Collaboration
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Share Collaboration</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <WhatsApp className="w-5 h-5" />
                  WhatsApp
                </button>
                <button
                  onClick={() => handleShare('facebook')}
                  className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Facebook className="w-5 h-5" />
                  Facebook
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="p-4 bg-blue-400 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Twitter
                </button>
                <button
                  onClick={() => handleShare('email')}
                  className="p-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Email
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="p-4 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 col-span-2"
                >
                  <Copy className="w-5 h-5" />
                  Copy Link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invited Message Modal */}
      <AnimatePresence>
        {showInvitedMessageModal && (
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Send Message</h3>
                <button
                  onClick={() => setShowInvitedMessageModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-white font-semibold mb-2">Message Type</label>
                <div className="flex gap-2">
                  {[
                    { value: 'question', label: 'Question', icon: <MessageCircle className="w-4 h-4" /> },
                    { value: 'interest', label: 'Interest', icon: <Heart className="w-4 h-4" /> },
                    { value: 'suggestion', label: 'Suggestion', icon: <Star className="w-4 h-4" /> }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setMessageType(type.value as any)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-colors ${
                        messageType === type.value
                          ? 'bg-primary-600 text-white'
                          : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                      }`}
                    >
                      {type.icon}
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-white font-semibold mb-2">Your Message</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ask a question, show interest, or make a suggestion..."
                  className="w-full p-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
                  rows={4}
                  maxLength={500}
                />
                <div className="text-right text-sm text-gray-400 mt-1">
                  {newMessage.length}/500
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowInvitedMessageModal(false)}
                  className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvitedMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {sendingMessage ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sendingMessage ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apply to Join Modal */}
      <AnimatePresence>
        {showApplyModal && collaboration && user && (
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Apply to Join</h3>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Instrument</label>
                  <select
                    value={applyInstrument}
                    onChange={e => setApplyInstrument(e.target.value)}
                    className="w-full p-3 bg-dark-700 border border-dark-600 rounded-lg text-white"
                  >
                    {(collaboration.instruments.length ? collaboration.instruments : ['Vocals','Guitar','Piano','Drums']).map(inst => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Message (optional)</label>
                  <textarea
                    value={applyMessage}
                    onChange={e => setApplyMessage(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-dark-700 border border-dark-600 rounded-lg text-white"
                    placeholder="Tell the creator why you’d be a great fit..."
                  />
                </div>

                <button
                  onClick={async () => {
                    try {
                      const applicantName = user.displayName || user.email || 'Musician';
                      await addDoc(collection(db, 'collaborationApplications'), {
                        collaborationId: collaboration.id,
                        applicantId: user.uid,
                        applicantName,
                        applicantAvatar: user.photoURL || null,
                        instrument: applyInstrument,
                        experience: '',
                        motivation: applyMessage || '',
                        status: 'pending',
                        appliedAt: serverTimestamp()
                      });
                      await addDoc(collection(db, 'users', collaboration.creatorId, 'notifications'), {
                        type: 'collaboration_application',
                        collaborationId: collaboration.id,
                        fromUserId: user.uid,
                        fromUserName: applicantName,
                        fromUserAvatar: user.photoURL || null,
                        message: `${applicantName} applied to join "${collaboration.title}"`,
                        link: `/collaborations/${collaboration.id}?tab=applications`,
                        createdAt: serverTimestamp(),
                        read: false
                      });
                      toast.success('Application sent');
                      setShowApplyModal(false);
                    } catch (err) {
                      console.error(err);
                      toast.error('Failed to apply');
                    }
                  }}
                  className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold"
                >
                  Submit Application
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Musician Invitation Modal */}
      {showInvitationModal && collaboration && (
        <MusicianInvitationModal
          collaboration={collaboration}
          isOpen={showInvitationModal}
          onClose={() => setShowInvitationModal(false)}
        />
      )}
    </>
  );
};

export default CollaborationDetailPage; 