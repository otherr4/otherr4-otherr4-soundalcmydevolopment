import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  UserPlus, 
  Music, 
  Youtube, 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  Loader,
  Search,
  Filter,
  Globe,
  MapPin,
  Award,
  BadgeCheck,
  ExternalLink,
  Send,
  Clock,
  Eye
} from 'lucide-react';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  getDoc,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getGoogleDriveDirectUrl } from '../../utils/imageUtils';

interface Musician {
  uid: string;
  fullName: string;
  profileImagePath?: string;
  instrumentType?: string;
  instrumentTypes?: string[];
  musicCulture?: string;
  country?: string;
  bio?: string;
  isVerified: boolean;
  friends: string[];
  youtubeLinks?: string[];
  spotifyLinks?: string[];
  soundcloudLinks?: string[];
}

interface CollaborationInvitation {
  id: string;
  collaborationId: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  createdAt: Date;
  respondedAt?: Date;
  responseMessage?: string;
}

interface MusicianInvitationModalProps {
  collaboration: any;
  isOpen: boolean;
  onClose: () => void;
}

const MusicianInvitationModal: React.FC<MusicianInvitationModalProps> = ({
  collaboration,
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMusicians, setSelectedMusicians] = useState<string[]>([]);
  const [invitationMessage, setInvitationMessage] = useState('');
  const [sendingInvitations, setSendingInvitations] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<CollaborationInvitation[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'invitations'>('friends');

  // Load user's musician friends
  useEffect(() => {
    if (!user || !isOpen) return;

    const loadMusicianFriends = async () => {
      try {
        setLoading(true);
        console.log('Loading musician friends for user:', user.uid);

        // Get current user's friends
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          console.log('User document does not exist');
          setMusicians([]);
          return;
        }

        const userData = userDoc.data();
        const friendUids = Array.isArray(userData.friends) ? userData.friends : [];
        console.log('Found friend UIDs:', friendUids);
        console.log('User data friends field:', userData.friends);
        console.log('Friends array type:', typeof userData.friends);
        console.log('Friends array length:', userData.friends?.length);

        if (friendUids.length === 0) {
          console.log('No friends found');
          setMusicians([]);
          return;
        }

        // Fetch each friend individually since we need to use document IDs
        let friendsData: Musician[] = [];
        let loadedCount = 0;
        let errorCount = 0;
        
        for (const friendUid of friendUids) {
          try {
            console.log('Loading friend with UID:', friendUid);
            const friendDoc = await getDoc(doc(db, 'users', friendUid));
            if (friendDoc.exists()) {
              const data = friendDoc.data();
              console.log('Friend data loaded:', {
                uid: friendUid,
                fullName: data.fullName || data.displayName,
                exists: friendDoc.exists()
              });
              
              friendsData.push({
                uid: friendUid, // Use the document ID as uid
                fullName: data.fullName || data.displayName || 'Unknown Musician',
                profileImagePath: data.profileImagePath || data.photoURL || '',
                instrumentType: data.instrumentType,
                instrumentTypes: data.instrumentTypes,
                musicCulture: data.musicCulture,
                country: data.country,
                bio: data.bio,
                isVerified: !!data.isVerified,
                friends: data.friends || [],
                youtubeLinks: data.youtubeLinks,
                spotifyLinks: data.spotifyLinks,
                soundcloudLinks: data.soundcloudLinks
              });
              loadedCount++;
            } else {
              console.log('Friend document does not exist for UID:', friendUid);
              errorCount++;
            }
          } catch (error) {
            console.error('Error loading friend with UID:', friendUid, error);
            errorCount++;
          }
        }

        // Sort alphabetically for better UX
        friendsData.sort((a, b) => a.fullName.localeCompare(b.fullName));
        console.log('Friends loading summary:', {
          totalFriendUids: friendUids.length,
          loadedCount,
          errorCount,
          finalFriendsData: friendsData.length
        });
        setMusicians(friendsData);
      } catch (error) {
        console.error('Error loading musician friends:', error);
        toast.error('Failed to load musician friends');
        setMusicians([]);
      } finally {
        setLoading(false);
      }
    };

    loadMusicianFriends();
  }, [user, isOpen]);

  // Load pending invitations
  useEffect(() => {
    if (!user || !collaboration || !isOpen) return;

    const loadPendingInvitations = async () => {
      try {
        const q = query(
          collection(db, 'collaborationInvitations'),
          where('collaborationId', '==', collaboration.id),
          where('fromUserId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const invitations: CollaborationInvitation[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            invitations.push({
              id: doc.id,
              collaborationId: data.collaborationId,
              fromUserId: data.fromUserId,
              toUserId: data.toUserId,
              status: data.status || 'pending',
              message: data.message,
              createdAt: data.createdAt?.toDate() || new Date(),
              respondedAt: data.respondedAt?.toDate(),
              responseMessage: data.responseMessage
            });
          });
          setPendingInvitations(invitations);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error loading invitations:', error);
      }
    };

    loadPendingInvitations();
  }, [user, collaboration, isOpen]);

  const handleMusicianSelect = (uid: string) => {
    // Check if musician already has a pending invitation
    const existingInvitation = pendingInvitations.find(inv => inv.toUserId === uid);
    
    if (existingInvitation) {
      if (existingInvitation.status === 'pending') {
        toast.error('Invitation already sent to this musician');
        return;
      } else if (existingInvitation.status === 'accepted') {
        toast.error('This musician has already joined the collaboration');
        return;
      }
    }
    
    setSelectedMusicians(prev => 
      prev.includes(uid) 
        ? prev.filter(id => id !== uid)
        : [...prev, uid]
    );
  };

  const handleSendInvitations = async () => {
    if (!user || selectedMusicians.length === 0) {
      toast.error('Please select at least one musician to invite');
      return;
    }

    if (!invitationMessage.trim()) {
      toast.error('Please add a message for your invitation');
      return;
    }

    setSendingInvitations(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const musicianId of selectedMusicians) {
        try {
          // Check if invitation already exists
          const existingInvitation = pendingInvitations.find(inv => inv.toUserId === musicianId);
          if (existingInvitation && existingInvitation.status === 'pending') {
            errorCount++;
            continue; // Skip this musician
          }

          // Create invitation
          const invitationRef = await addDoc(collection(db, 'collaborationInvitations'), {
            collaborationId: collaboration.id,
            fromUserId: user.uid,
            toUserId: musicianId,
            status: 'pending',
            message: invitationMessage.trim(),
            createdAt: serverTimestamp()
          });

          // Create notification for the musician
          await addDoc(collection(db, 'users', musicianId, 'notifications'), {
            type: 'collaboration_invitation',
            collaborationId: collaboration.id,
            invitationId: invitationRef.id,
            fromUserId: user.uid,
            message: invitationMessage.trim() || `You've been invited to join "${collaboration.title}"`,
            createdAt: serverTimestamp(),
            read: false
          });

          successCount++;
        } catch (error) {
          console.error('Error sending invitation to', musicianId, ':', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully sent ${successCount} invitation(s)!`);
        if (errorCount > 0) {
          toast.error(`${errorCount} invitation(s) failed to send`);
        }
      } else {
        toast.error('Failed to send any invitations');
      }

      setSelectedMusicians([]);
      setInvitationMessage('');
      setActiveTab('invitations');
      
      // Refresh pending invitations - they are already being updated via onSnapshot
      // No need to call loadPendingInvitations as it's handled by the useEffect
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast.error('Failed to send invitations');
    } finally {
      setSendingInvitations(false);
    }
  };

  const handleAcceptInvitation = async (invitation: CollaborationInvitation) => {
    try {
      // Update invitation status
      await updateDoc(doc(db, 'collaborationInvitations', invitation.id), {
        status: 'accepted',
        respondedAt: serverTimestamp(),
        responseMessage: 'Accepted the invitation'
      });

      // Add musician to collaboration participants
      const collaborationRef = doc(db, 'collaborations', collaboration.id);
      const musician = musicians.find(m => m.uid === invitation.toUserId);
      
      if (musician) {
        await updateDoc(collaborationRef, {
          currentParticipants: increment(1),
          participants: arrayUnion({
            userId: invitation.toUserId,
            userName: musician.fullName,
            userAvatar: musician.profileImagePath,
            role: 'Participant',
            instrument: musician.instrumentType || 'Unknown',
            joinedAt: new Date(),
            status: 'active'
          })
        });
      }

      // Create notification for collaboration creator
      await addDoc(collection(db, 'users', collaboration.creatorId, 'notifications'), {
        type: 'collaboration_join',
        collaborationId: collaboration.id,
        fromUserId: invitation.toUserId,
        message: `${musician?.fullName || 'A musician'} has joined your collaboration "${collaboration.title}"`,
        createdAt: serverTimestamp(),
        read: false
      });

      toast.success('Invitation accepted! You are now part of this collaboration.');
      
      // Invitations will be updated automatically via onSnapshot
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation. Please try again.');
    }
  };

  const handleDeclineInvitation = async (invitation: CollaborationInvitation) => {
    try {
      await updateDoc(doc(db, 'collaborationInvitations', invitation.id), {
        status: 'declined',
        respondedAt: serverTimestamp(),
        responseMessage: 'Declined the invitation'
      });

      // Create notification for collaboration creator
      const musician = musicians.find(m => m.uid === invitation.toUserId);
      await addDoc(collection(db, 'users', collaboration.creatorId, 'notifications'), {
        type: 'collaboration_decline',
        collaborationId: collaboration.id,
        fromUserId: invitation.toUserId,
        message: `${musician?.fullName || 'A musician'} has declined your invitation to "${collaboration.title}"`,
        createdAt: serverTimestamp(),
        read: false
      });

      toast.success('Invitation declined');
      
      // Invitations will be updated automatically via onSnapshot
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation. Please try again.');
    }
  };

  const handleUndoInvitation = async (invitation: CollaborationInvitation) => {
    try {
      // Delete the invitation
      await deleteDoc(doc(db, 'collaborationInvitations', invitation.id));
      
      // Remove notification from the invited user
      await deleteDoc(doc(db, 'users', invitation.toUserId, 'notifications', invitation.id));
      
      toast.success('Invitation cancelled');
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const filteredMusicians = musicians.filter(musician =>
    musician.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    musician.instrumentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    musician.musicCulture?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Debug logging for musicians and filtering
  console.log('Musicians state:', musicians.length);
  console.log('Search term:', searchTerm);
  console.log('Filtered musicians:', filteredMusicians.length);
  console.log('All musicians:', musicians.map(m => ({ uid: m.uid, name: m.fullName })));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-500';
      case 'declined': return 'text-red-500';
      case 'pending': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return 'Already Joined';
      case 'declined': return 'Declined';
      case 'pending': return 'Waiting for Response';
      default: return 'Unknown';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-dark-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <div>
                <h2 className="text-2xl font-bold text-white">Invite Musicians</h2>
                <p className="text-gray-400">Invite your musician friends to "{collaboration?.title}"</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-dark-700">
              <button
                onClick={() => setActiveTab('friends')}
                className={`flex-1 px-6 py-3 text-center font-semibold transition-colors ${
                  activeTab === 'friends'
                    ? 'text-primary-400 border-b-2 border-primary-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                My Friends ({musicians.length})
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className={`flex-1 px-6 py-3 text-center font-semibold transition-colors ${
                  activeTab === 'invitations'
                    ? 'text-primary-400 border-b-2 border-primary-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <MessageCircle className="w-4 h-4 inline mr-2" />
                Invitations ({pendingInvitations.length})
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {activeTab === 'friends' && (
                <div className="space-y-6">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search musicians..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Message Input */}
                  <div>
                    <label className="block text-white font-semibold mb-2">Invitation Message</label>
                    <textarea
                      value={invitationMessage}
                      onChange={(e) => setInvitationMessage(e.target.value)}
                      placeholder="Write a personalized message to invite musicians to your collaboration..."
                      className="w-full p-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="text-right text-sm text-gray-400 mt-1">
                      {invitationMessage.length}/500
                    </div>
                  </div>

                  {/* Musicians List */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        My Friends ({filteredMusicians.length})
                      </h3>
                      {selectedMusicians.length > 0 && (
                        <span className="text-primary-400 text-sm">
                          {selectedMusicians.length} selected
                        </span>
                      )}
                    </div>

                    {/* Debug Information */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                        <h4 className="text-yellow-400 font-semibold mb-2">Debug Info:</h4>
                        <div className="text-yellow-200 text-sm space-y-1">
                          <div>Total musicians loaded: {musicians.length}</div>
                          <div>Search term: "{searchTerm}"</div>
                          <div>Filtered musicians: {filteredMusicians.length}</div>
                          <div>Selected musicians: {selectedMusicians.length}</div>
                          {musicians.length > 0 && (
                            <div>First musician: {musicians[0]?.fullName} (UID: {musicians[0]?.uid})</div>
                          )}
                        </div>
                      </div>
                    )}

                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader className="w-8 h-8 animate-spin text-primary-400" />
                        <span className="ml-3 text-gray-400">Loading friends...</span>
                      </div>
                    ) : filteredMusicians.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                        <p className="text-gray-400">
                          {searchTerm ? 'No friends match your search.' : 'No musician friends found.'}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {searchTerm ? 'Try adjusting your search terms.' : 'Add more friends to invite them to collaborations.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredMusicians.map((musician) => {
                          const isSelected = selectedMusicians.includes(musician.uid);
                          const hasPendingInvitation = pendingInvitations.some(
                            inv => inv.toUserId === musician.uid && inv.status === 'pending'
                          );
                          const hasAcceptedInvitation = pendingInvitations.some(
                            inv => inv.toUserId === musician.uid && inv.status === 'accepted'
                          );

                          return (
                            <div
                              key={musician.uid}
                              className={`p-4 rounded-lg border transition-all duration-200 ${
                                isSelected
                                  ? 'border-primary-500 bg-primary-500/10'
                                  : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                              } ${hasPendingInvitation ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                              onClick={() => !hasPendingInvitation && !hasAcceptedInvitation && handleMusicianSelect(musician.uid)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img
                                    src={musician.profileImagePath ? getGoogleDriveDirectUrl(musician.profileImagePath) : '/default-avatar.svg'}
                                    alt={musician.fullName}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                  {musician.isVerified && (
                                    <BadgeCheck className="absolute -bottom-1 -right-1 w-5 h-5 text-blue-500 bg-white rounded-full" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-white">{musician.fullName}</h4>
                                    {hasPendingInvitation && (
                                      <span className="px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded-full">
                                        Invited
                                      </span>
                                    )}
                                    {hasAcceptedInvitation && (
                                      <span className="px-2 py-1 bg-green-600 text-green-100 text-xs rounded-full">
                                        Joined
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-400">
                                    {musician.instrumentType && (
                                      <span className="flex items-center gap-1">
                                        <Music className="w-4 h-4" />
                                        {musician.instrumentType}
                                      </span>
                                    )}
                                    {musician.country && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {musician.country}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {!hasPendingInvitation && !hasAcceptedInvitation && (
                                  <div className="flex items-center gap-2">
                                    {isSelected ? (
                                      <CheckCircle className="w-6 h-6 text-primary-400" />
                                    ) : (
                                      <UserPlus className="w-6 h-6 text-gray-400" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Send Button */}
                  {selectedMusicians.length > 0 && (
                    <div className="flex items-center justify-between pt-4 border-t border-dark-700">
                      <span className="text-gray-400">
                        {selectedMusicians.length} musician(s) selected
                      </span>
                      <button
                        onClick={handleSendInvitations}
                        disabled={sendingInvitations || !invitationMessage.trim()}
                        className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                      >
                        {sendingInvitations ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Send Invitations
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'invitations' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Pending Invitations</h3>
                  
                  {pendingInvitations.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400">No pending invitations.</p>
                      <p className="text-gray-500 text-sm">Invitations you send will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingInvitations.map((invitation) => {
                        const musician = musicians.find(m => m.uid === invitation.toUserId);
                        return (
                          <div key={invitation.id} className="p-4 bg-dark-700 rounded-lg border border-dark-600">
                            <div className="flex items-start gap-3">
                              <img
                                src={musician?.profileImagePath ? getGoogleDriveDirectUrl(musician.profileImagePath) : '/default-avatar.svg'}
                                alt={musician?.fullName || 'Musician'}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-white">
                                    {musician?.fullName || 'Unknown Musician'}
                                  </h4>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                                    {getStatusText(invitation.status)}
                                  </span>
                                </div>
                                {invitation.message && (
                                  <p className="text-gray-400 text-sm mb-2">"{invitation.message}"</p>
                                )}
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>Sent {invitation.createdAt instanceof Date ? invitation.createdAt.toLocaleDateString() : 'recently'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {invitation.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleAcceptInvitation(invitation)}
                                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => handleDeclineInvitation(invitation)}
                                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                                    >
                                      Decline
                                    </button>
                                  </>
                                )}
                                {invitation.status === 'pending' && (
                                  <button
                                    onClick={() => handleUndoInvitation(invitation)}
                                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MusicianInvitationModal; 