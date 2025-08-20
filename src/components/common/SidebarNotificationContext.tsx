import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Info, MessageSquare, AlertCircle, Settings, X, Trash2, Music, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, onSnapshot, doc, getDoc, updateDoc, getDocs, deleteDoc, arrayUnion, query, where } from 'firebase/firestore';
import { getGoogleDriveDirectUrl } from '../../utils/profileImage';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: string;
  from?: string;
  title?: string;
  message?: string;
  timestamp?: any;
  read: boolean;
  priority?: 'high' | 'medium' | 'low';
  collaborationId?: string; // Added for collaboration invitations
}

interface SidebarNotificationContextType {
  unreadCount: number;
  openNotificationModal: () => void;
}

const SidebarNotificationContext = createContext<SidebarNotificationContextType | undefined>(undefined);

export const SidebarNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [senderInfo, setSenderInfo] = useState<Record<string, { name: string; avatar: string; instrument?: string; country?: string }>>({});
  const [profileModalUser, setProfileModalUser] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileModalNotification, setProfileModalNotification] = useState<Notification | null>(null);
  const navigate = useNavigate();

  // Listen for real notifications from Firestore
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const notifRef = collection(db, 'users', user.uid, 'notifications');
    const unsub = onSnapshot(notifRef, (snapshot) => {
      const notifs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          type: data.type,
          from: data.from,
          title: data.title,
          message: data.message,
          timestamp: data.createdAt,
          read: data.read,
          priority: data.priority,
          collaborationId: data.collaborationId, // Added for collaboration invitations
        } as Notification;
      });
      setNotifications(notifs);
    });
    return () => unsub();
  }, [user]);

  // Fetch sender info for friend requests
  useEffect(() => {
    if (!user) return;
    // Find all unique sender UIDs from notifications
    const friendRequestSenders = notifications
      .filter(n => n.type === 'friend_request' && n.from)
      .map(n => n.from!);
    const uniqueSenders = Array.from(new Set(friendRequestSenders));
    if (uniqueSenders.length === 0) return;
    // Fetch each sender's info
    Promise.all(uniqueSenders.map(uid => getDoc(doc(db, 'users', uid)))).then(docs => {
      const info: Record<string, { name: string; avatar: string; instrument?: string; country?: string }> = {};
      docs.forEach((docSnap, i) => {
        if (docSnap.exists()) {
          const d = docSnap.data();
          info[uniqueSenders[i]] = {
            name: d.fullName || 'Musician',
            avatar: d.profileImagePath ? getGoogleDriveDirectUrl(d.profileImagePath) : '/default-avatar.svg',
            instrument: d.instrumentType,
            country: d.country
          };
        }
      });
      setSenderInfo(info);
    });
  }, [notifications, user]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markNotificationAsRead = async (id: string) => {
    if (!user) return;
    setNotifications(notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    ));
    await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { read: true });
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    // Update local state immediately for responsiveness
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    // Update Firestore
    await Promise.all(
      unread.map(n => updateDoc(doc(db, 'users', user.uid, 'notifications', n.id), { read: true }))
    );
  };

  // Delete a single notification
  const deleteNotification = async (notificationId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notifications', notificationId));
    } catch (e) {
      // Optionally show error
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!user) return;
    try {
      const notifs = await getDocs(collection(db, 'users', user.uid, 'notifications'));
      for (const docSnap of notifs.docs) {
        await deleteDoc(docSnap.ref);
      }
    } catch (e) {
      // Optionally show error
    }
  };

  const openNotificationModal = async () => {
    await markAllAsRead();
    setShowNotificationModal(true);
  };
  const closeNotificationModal = () => setShowNotificationModal(false);

  // Fetch sender profile for modal
  const openProfileModal = async (userId: string, notification?: Notification) => {
    setProfileLoading(true);
    setProfileError(null);
    setShowProfileModal(true);
    setProfileModalNotification(notification || null);
    try {
      const docSnap = await getDoc(doc(db, 'users', userId));
      if (docSnap.exists()) {
        setProfileModalUser(docSnap.data());
      } else {
        setProfileError('User not found');
      }
    } catch (e) {
      setProfileError('Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Accept friend request
  const handleAcceptRequest = async (notification: Notification) => {
    if (!user || !notification.from) return;
    try {
      // Find the friend request doc
      const q = query(collection(db, 'friendRequests'), where('from', '==', notification.from), where('to', '==', user.uid), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        // Update the friend request status to 'accepted'
        await updateDoc(doc(db, 'friendRequests', docSnap.id), { status: 'accepted' });
      }
      // Add each user to the other's friends list
      const fromUserDoc = await getDoc(doc(db, 'users', notification.from));
      const toUserDoc = await getDoc(doc(db, 'users', user.uid));
      if (fromUserDoc.exists() && toUserDoc.exists()) {
        const fromFriends = fromUserDoc.data().friends || [];
        const toFriends = toUserDoc.data().friends || [];
        if (!fromFriends.includes(user.uid)) {
          await updateDoc(doc(db, 'users', notification.from), { friends: [...fromFriends, user.uid] });
        }
        if (!toFriends.includes(notification.from)) {
          await updateDoc(doc(db, 'users', user.uid), { friends: [...toFriends, notification.from] });
        }
      }
      // Remove the notification
      await deleteNotification(notification.id);
      // Remove any duplicate friend request docs
      for (const docSnap of snap.docs) {
        if (docSnap.id !== notification.id) {
          await deleteDoc(doc(db, 'friendRequests', docSnap.id));
        }
      }
      setShowProfileModal(false);
    } catch (e) {
      // Optionally show error
    }
  };
  // Decline friend request
  const handleDeclineRequest = async (notification: Notification) => {
    if (!user || !notification.from) return;
    try {
      // Delete the friend request from friendRequests collection
      await deleteDoc(doc(db, 'friendRequests', notification.id));
      // Remove the notification
      await deleteNotification(notification.id);
      // Remove the friend request from sender's side (delete friendRequest doc if exists)
      const q = query(collection(db, 'friendRequests'), where('from', '==', notification.from), where('to', '==', user.uid));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        if (docSnap.id !== notification.id) {
          await deleteDoc(doc(db, 'friendRequests', docSnap.id));
        }
      }
      setShowProfileModal(false);
    } catch (e) {
      // Optionally show error
    }
  };

  // Accept collaboration invitation
  const handleAcceptCollaborationInvitation = async (notification: Notification) => {
    if (!user || !notification.from || !notification.collaborationId) return;
    try {
      // Add the user to the collaboration's participants list
      await updateDoc(doc(db, 'collaborations', notification.collaborationId), {
        participants: arrayUnion(user.uid),
      });
      // Remove the notification
      await deleteNotification(notification.id);
      // Optionally show success message
      alert('Collaboration invitation accepted!');
      setShowProfileModal(false);
    } catch (e) {
      // Optionally show error
    }
  };

  // Decline collaboration invitation
  const handleDeclineCollaborationInvitation = async (notification: Notification) => {
    if (!user || !notification.from || !notification.collaborationId) return;
    try {
      // Delete the collaboration invitation from the sender's side
      const q = query(collection(db, 'collaborations'), where('id', '==', notification.collaborationId), where('from', '==', notification.from));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, 'collaborations', docSnap.id));
      }
      // Remove the notification
      await deleteNotification(notification.id);
      // Optionally show success message
      alert('Collaboration invitation declined.');
      setShowProfileModal(false);
    } catch (e) {
      // Optionally show error
    }
  };

  const NotificationModal: React.FC = () => (
    createPortal(
      <AnimatePresence>
        {showNotificationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={closeNotificationModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-800 rounded-2xl w-full max-w-md mx-auto p-6 shadow-2xl border border-primary-500/20 relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-dark-700 transition-colors"
                onClick={closeNotificationModal}
                aria-label="Close"
              >
                <X size={20} className="text-gray-400 hover:text-white" />
              </button>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Bell className="text-yellow-400" /> Notifications
              </h2>
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-4 rounded-xl cursor-pointer shadow-md border border-dark-700 transition-all duration-200 ${
                        notification.read ? 'bg-dark-800' : 'bg-primary-500/10 border-primary-500/40'
                      } hover:bg-dark-700 flex items-start gap-3`}
                      onClick={() => {
                        if (notification.type === 'friend_request' && notification.from) {
                          // Navigate to musician profile and close modal
                          closeNotificationModal();
                          navigate(`/musician/${notification.from}`);
                        } else if (notification.type === 'collaboration_invitation' && notification.from) {
                          // Navigate to collaboration details and close modal
                          closeNotificationModal();
                          navigate(`/collaborations/${notification.collaborationId}`);
                        } else {
                          markNotificationAsRead(notification.id);
                        }
                      }}
                    >
                      {/* Profile picture for friend requests and collaboration invitations */}
                      {(notification.type === 'friend_request' || notification.type === 'collaboration_invitation') && (
                        <img
                          src={senderInfo[notification.from!]?.avatar || '/default-avatar.svg'}
                          alt={senderInfo[notification.from!]?.name || 'Musician'}
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary-400 cursor-pointer hover:scale-105 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (notification.from) {
                              openProfileModal(notification.from, notification);
                            }
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-base font-medium text-white truncate">
                            {notification.type === 'friend_request'
                              ? `${senderInfo[notification.from!]?.name || 'Musician'} sent you a friend request`
                              : notification.type === 'collaboration_invitation'
                              ? `${senderInfo[notification.from!]?.name || 'Musician'} invited you to a collaboration`
                              : notification.title || 'Notification'}
                          </p>
                          {notification.timestamp && (
                            <span className="text-xs text-gray-400 ml-2">
                              {new Date(notification.timestamp.seconds ? notification.timestamp.seconds * 1000 : notification.timestamp).toLocaleTimeString()}
                            </span>
                          )}
                          {/* Delete icon */}
                          <button
                            className="ml-2 p-1 rounded-full hover:bg-red-500/20"
                            onClick={e => { e.stopPropagation(); deleteNotification(notification.id); }}
                            aria-label="Delete notification"
                          >
                            <Trash2 size={14} className="text-red-400 hover:text-red-300" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-400 mt-1 truncate">
                          {notification.message}
                        </p>
                        {/* User details for collaboration invitations */}
                        {notification.type === 'collaboration_invitation' && senderInfo[notification.from!] && (
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Music className="w-3 h-3" />
                              {senderInfo[notification.from!]?.instrument || 'Musician'}
                            </span>
                            {senderInfo[notification.from!]?.country && (
                              <span className="flex items-center gap-1 ml-3">
                                <MapPin className="w-3 h-3" />
                                {senderInfo[notification.from!]?.country}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Action buttons for collaboration invitations */}
                        {notification.type === 'collaboration_invitation' && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                // Navigate to collaboration details
                                navigate(`/collaborations/${notification.collaborationId}`);
                                closeNotificationModal();
                              }}
                              className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-lg font-semibold transition-colors"
                            >
                              View Details
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                // Accept invitation
                                handleAcceptCollaborationInvitation(notification);
                              }}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-semibold transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                // Decline invitation
                                handleDeclineCollaborationInvitation(notification);
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-semibold transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                      {!notification.read && (
                        <span className="ml-2 w-3 h-3 bg-primary-400 rounded-full inline-block"></span>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={clearAllNotifications}
                    className="w-full py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300 hover:text-white font-semibold transition-all"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </motion.div>
            {/* Profile Modal for friend requests */}
            <AnimatePresence>
              {showProfileModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
                  onClick={() => setShowProfileModal(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-dark-800 rounded-2xl w-full max-w-lg mx-auto p-8 shadow-2xl border border-primary-500/20 relative"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      className="absolute top-4 right-4 p-2 rounded-full hover:bg-dark-700 transition-colors"
                      onClick={() => setShowProfileModal(false)}
                      aria-label="Close"
                    >
                      <X size={20} className="text-gray-400 hover:text-white" />
                    </button>
                    {profileLoading ? (
                      <div className="text-center text-gray-400 py-8">Loading...</div>
                    ) : profileError ? (
                      <div className="text-center text-red-400 py-8">{profileError}</div>
                    ) : profileModalUser ? (
                      <div className="flex flex-col items-center gap-4">
                        <img
                          src={profileModalUser.profileImagePath ? getGoogleDriveDirectUrl(profileModalUser.profileImagePath) : '/default-avatar.svg'}
                          alt={profileModalUser.fullName || 'Profile'}
                          className="w-24 h-24 rounded-full object-cover border-4 border-primary-400 mb-2"
                        />
                        <h2 className="text-2xl font-bold text-white mb-1">{profileModalUser.fullName}</h2>
                        <div className="text-gray-400 text-sm mb-2">{profileModalUser.email}</div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="bg-primary-500/20 text-primary-400 px-3 py-1 rounded-full text-xs">{profileModalUser.country}</span>
                          {profileModalUser.isVerified && (
                            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">Verified</span>
                          )}
                        </div>
                        <div className="text-gray-300 text-sm mb-2">{profileModalUser.bio}</div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {Array.isArray(profileModalUser.instrumentTypes) && profileModalUser.instrumentTypes.map((inst: string, i: number) => (
                            <span key={i} className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs">{inst}</span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {Array.isArray(profileModalUser.singingTypes) && profileModalUser.singingTypes.map((sing: string, i: number) => (
                            <span key={i} className="bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full text-xs">{sing}</span>
                          ))}
                        </div>
                        <div className="flex gap-4 mt-4">
                          <button
                            className="btn-primary px-6 py-2 rounded"
                            onClick={() => profileModalNotification && handleAcceptRequest(profileModalNotification)}
                          >
                            Accept
                          </button>
                          <button
                            className="btn-outline px-6 py-2 rounded"
                            onClick={() => profileModalNotification && handleDeclineRequest(profileModalNotification)}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )
  );

  return (
    <SidebarNotificationContext.Provider value={{ unreadCount, openNotificationModal }}>
      {children}
      <NotificationModal />
    </SidebarNotificationContext.Provider>
  );
};

export const useSidebarNotification = () => {
  const ctx = useContext(SidebarNotificationContext);
  if (!ctx) throw new Error('useSidebarNotification must be used within SidebarNotificationProvider');
  return ctx;
}; 