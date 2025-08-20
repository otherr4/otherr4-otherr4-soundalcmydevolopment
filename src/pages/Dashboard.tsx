import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { motion } from 'framer-motion';
import { AlertCircle, X, Bell, ChevronDown, ChevronUp, Phone, Mail, MapPin, Music, User, BadgeCheck, Users, Star, Music2, PlusCircle, BellRing, UserPlus, Trophy, Globe2, MessageSquare, Video, BarChart2, BookOpen, Award, Calendar, Headphones, Heart, MessageCircle, Share2, Search, ChevronLeft, ChevronRight, Loader, Menu as MenuIcon, MoreVertical } from 'lucide-react';
import { collection, getDocs, query, where, onSnapshot, updateDoc, arrayUnion, addDoc, serverTimestamp, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';

// Mock data for demonstration
const mockStats = {
  followers: 1280,
  collaborations: 14,
  projects: 7,
  plays: 45210,
  likes: 3200,
};
const mockAchievements = [
  { icon: <BadgeCheck className="text-green-400" />, label: 'Verified Musician' },
  { icon: <Trophy className="text-yellow-400" />, label: 'First Collaboration' },
  { icon: <Star className="text-pink-400" />, label: '1000+ Plays' },
];
const mockProjects = [
  { title: 'We Are The World Cover', status: 'In Progress', collaborators: ['Alice', 'Bob'], cover: 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg?auto=compress&w=400', link: '#' },
  { title: 'Jazz Fusion Jam', status: 'Published', collaborators: ['You', 'Carlos'], cover: 'https://images.pexels.com/photos/2531728/pexels-photo-2531728.jpeg?auto=compress&w=400', link: '#' },
];
const mockFeed = [
  { id: 1, type: 'track', user: 'Alice', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', content: '🎵 New track: "Dreamscape"', media: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', time: '2m ago' },
  { id: 2, type: 'video', user: 'Carlos', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', content: 'Live jam session replay!', media: 'https://www.w3schools.com/html/mov_bbb.mp4', time: '10m ago' },
  { id: 3, type: 'post', user: 'Lila', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', content: 'Looking for a drummer for my next project!', time: '30m ago' },
];
const mockNotifications = [
  { id: 1, type: 'invite', text: 'You have been invited to join "Jazz Fusion Jam"', time: '1h ago' },
  { id: 2, type: 'comment', text: 'Carlos commented on your track', time: '2h ago' },
  { id: 3, type: 'like', text: 'Lila liked your project', time: '3h ago' },
];
const mockEvents = [
  { id: 1, title: 'We Are The World Cover', date: '2024-07-05', type: 'cover', location: 'SoundAlchemy Online' },
  { id: 2, title: 'Global Jam Session', date: '2024-07-10', type: 'jam', location: 'Online' },
  { id: 3, title: 'Songwriting Workshop', date: '2024-07-15', type: 'workshop', location: 'Berlin' },
];

// Top Navigation Bar with Search
interface TopNavProps {
  onSearch: (v: string) => void;
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
}
const TopNav: React.FC<TopNavProps> = ({ onSearch, searchValue, setSearchValue }) => (
  <header className="w-full bg-dark-900 border-b border-dark-700 flex items-center px-4 py-3 fixed top-0 left-0 z-30" style={{ minHeight: 64 }}>
    <div className="flex items-center gap-2">
      <Music2 className="text-primary-400 w-7 h-7" />
      <span className="text-xl font-bold text-white hidden sm:inline">SoundAlchemy</span>
    </div>
    <form className="flex-1 flex justify-center" onSubmit={e => { e.preventDefault(); onSearch(searchValue); }}>
      <div className="relative w-full max-w-lg">
        <input
          type="text"
          className="w-full rounded-full bg-dark-800 border border-dark-700 px-4 py-2 pl-10 text-white focus:outline-none focus:border-primary-500 transition"
          placeholder="Search musicians, projects, posts..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
        />
        <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
      </div>
    </form>
    <div className="flex items-center gap-4 ml-4">
      <BellRing className="text-yellow-400 w-6 h-6" />
      <img src="/default-avatar.svg" alt="Profile" className="w-8 h-8 rounded-full border-2 border-primary-400" />
    </div>
  </header>
);

const Sidebar = () => (
  <aside className="hidden lg:flex flex-col w-64 h-full bg-dark-900 border-r border-dark-700 py-8 px-4 space-y-2 fixed left-0 top-0 z-20 pt-20">
    <nav className="flex flex-col gap-2">
      <a href="#" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-dark-700 transition"><HomeIcon /> Home</a>
      <a href="#feed" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-dark-700 transition"><MessageSquare /> Feed</a>
      <a href="#projects" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-dark-700 transition"><Music2 /> My Projects</a>
                        <a href="#find-musicians" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-dark-700 transition"><Users /> Find Musicians</a>
      <a href="#analytics" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-dark-700 transition"><BarChart2 /> Analytics</a>
      <a href="#learning" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-dark-700 transition"><BookOpen /> Learning</a>
      <a href="#settings" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-dark-700 transition"><User /> Settings</a>
    </nav>
  </aside>
);

const HomeIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9.75L12 4l9 5.75V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.75Z"/><path d="M9 22V12h6v10"/></svg>;

// Add musician type
interface Musician {
  uid: string;
  fullName?: string;
  profileImagePath?: string;
  instrumentTypes?: string[];
  instrumentType?: string;
  musicCulture?: string;
  bio?: string;
  isVerified?: boolean;
  friends?: string[];
  country?: string;
  _score?: number;
}

// Add helper to get direct Google Drive image URL
function getGoogleDriveDirectUrl(url: string): string {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    let fileId = '';
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch) {
      fileId = fileIdMatch[1];
    } else {
      const ucMatch = url.match(/[?&]id=([^&]+)/);
      if (ucMatch) fileId = ucMatch[1];
      else {
        const openMatch = url.match(/\bid=([^&]+)/);
        if (openMatch) fileId = openMatch[1];
      }
    }
    if (fileId) {
      return `https://images.weserv.nl/?url=drive.google.com/uc?export=view%26id=${fileId}`;
    }
  }
  return url;
}

// Find Musicians (only for verified users)
interface FindMusiciansProps {
  isVerified: boolean;
  handleUnfriend: (uid: string) => void;
  handleAcceptRequest: (req: any) => void;
  handleDeclineRequest: (req: any) => void;
}
const FindMusicians: React.FC<FindMusiciansProps> = ({ isVerified, handleUnfriend, handleAcceptRequest, handleDeclineRequest }) => {
  const [filter, setFilter] = useState({ instrument: '', genre: '', country: '' });
  const [search, setSearch] = useState('');
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [friendStatuses, setFriendStatuses] = useState<Record<string, 'none' | 'pending' | 'friends'>>({});
  const [friendLoading, setFriendLoading] = useState<Record<string, boolean>>({});
  const [friendError, setFriendError] = useState<Record<string, string | null>>({});
  const [userFriends, setUserFriends] = useState<string[]>([]);
  const [friendRequestsByMusician, setFriendRequestsByMusician] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isVerified) return;
    setLoading(true);
    (async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('isVerified', '==', true));
        const querySnapshot = await getDocs(q);
        const usersData: Musician[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            fullName: data.fullName || '',
            profileImagePath: data.profileImagePath,
            instrumentTypes: data.instrumentTypes,
            instrumentType: data.instrumentType,
            musicCulture: data.musicCulture,
            bio: data.bio,
            isVerified: data.isVerified,
            friends: data.friends,
            country: data.country || '',
          };
        }).filter(m => user?.uid !== m.uid); // Exclude only the current user
        setMusicians(usersData);
      } catch (error) {
        setMusicians([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isVerified, user]);

  // Fetch current user's friends
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserFriends(Array.isArray(data.friends) ? data.friends : []);
        }
      } catch {
        setUserFriends([]);
      }
    })();
  }, [user]);

  // Fetch friend statuses and store friend request object
  useEffect(() => {
    if (!user || musicians.length === 0) return;
    const unsubscribes: (() => void)[] = [];
    const statuses: Record<string, 'none' | 'pending' | 'friends'> = {};
    const requests: Record<string, any> = {};
    musicians.forEach((m) => {
      if (m.uid === user.uid) {
        statuses[m.uid] = 'friends';
        return;
      }
      const q = query(collection(db, 'friendRequests'),
        where('from', 'in', [user.uid, m.uid]),
        where('to', 'in', [user.uid, m.uid])
      );
      const unsub = onSnapshot(q, (snapshot) => {
        let found = false;
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (
            (data.from === user.uid && data.to === m.uid) ||
            (data.from === m.uid && data.to === user.uid)
          ) {
            found = true;
            requests[m.uid] = { ...data, id: docSnap.id };
            if (data.status === 'pending') {
              statuses[m.uid] = 'pending';
            } else if (data.status === 'accepted') {
              statuses[m.uid] = 'friends';
            } else {
              statuses[m.uid] = 'none';
            }
          }
        });
        if (!found) {
          statuses[m.uid] = 'none';
          requests[m.uid] = null;
        }
        setFriendStatuses((prev) => ({ ...prev, ...statuses }));
        setFriendRequestsByMusician((prev) => ({ ...prev, ...requests }));
      });
      unsubscribes.push(unsub);
    });
    return () => { unsubscribes.forEach(unsub => unsub()); };
  }, [user, musicians]);

  // Filtering logic
  const filtered = musicians.filter(m =>
    (!filter.instrument || (Array.isArray(m.instrumentTypes) ? m.instrumentTypes.some((i: string) => i.toLowerCase().includes(filter.instrument.toLowerCase())) : (m.instrumentType || '').toLowerCase().includes(filter.instrument.toLowerCase()))) &&
    (!filter.genre || (m.musicCulture || '').toLowerCase().includes(filter.genre.toLowerCase())) &&
    (!filter.country || (m.country || '').toLowerCase().includes(filter.country.toLowerCase())) &&
    (!search || (m.fullName || '').toLowerCase().includes(search.toLowerCase())) &&
    (!userFriends.includes(m.uid)) &&
    (user?.uid !== m.uid)
  );

  // Horizontal scroll navigation
  const scrollBy = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Add Friend logic
  const handleAddFriend = async (musicianUid: string) => {
    if (!user || !musicianUid || user.uid === musicianUid) return;
    setFriendLoading((prev) => ({ ...prev, [musicianUid]: true }));
    setFriendError((prev) => ({ ...prev, [musicianUid]: null }));
    try {
      if (friendStatuses[musicianUid] === 'pending' || friendStatuses[musicianUid] === 'friends') return;
      await addDoc(collection(db, 'friendRequests'), {
        from: user.uid,
        to: musicianUid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'users', musicianUid, 'notifications'), {
        type: 'friend_request',
        from: user.uid,
        createdAt: serverTimestamp(),
        read: false,
      });
      toast.success('Friend request sent!');
    } catch (e) {
      setFriendError((prev) => ({ ...prev, [musicianUid]: 'Failed to send request.' }));
    } finally {
      setFriendLoading((prev) => ({ ...prev, [musicianUid]: false }));
    }
  };

  // Add Cancel Request handler
  const handleCancelRequest = async (musicianUid: string) => {
    if (!user || !musicianUid) return;
    setFriendLoading((prev) => ({ ...prev, [musicianUid]: true }));
    setFriendError((prev) => ({ ...prev, [musicianUid]: null }));
    try {
      // Find the friend request doc
      const q = query(collection(db, 'friendRequests'),
        where('from', '==', user.uid),
        where('to', '==', musicianUid),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, 'friendRequests', docSnap.id));
      }
    } catch (e) {
      setFriendError((prev) => ({ ...prev, [musicianUid]: 'Failed to cancel request.' }));
    } finally {
      setFriendLoading((prev) => ({ ...prev, [musicianUid]: false }));
    }
  };

  if (!isVerified) {
    return (
      <section id="find-musicians" className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Find Musicians</h2>
        <div className="bg-yellow-100 text-yellow-800 rounded-lg p-6 text-center font-semibold">
          Only verified musicians can use the Find Musicians system. Get verified to unlock this feature!
        </div>
      </section>
    );
  }
  return (
    <section id="find-musicians" className="mb-10">
      <h2 className="text-2xl font-bold mb-4">Find Musicians</h2>
      <div className="flex flex-wrap gap-4 mb-4">
        <input className="rounded px-3 py-2 bg-dark-800 border border-dark-700 text-white" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
        <input className="rounded px-3 py-2 bg-dark-800 border border-dark-700 text-white" placeholder="Instrument" value={filter.instrument} onChange={e => setFilter(f => ({ ...f, instrument: e.target.value }))} />
        <input className="rounded px-3 py-2 bg-dark-800 border border-dark-700 text-white" placeholder="Genre" value={filter.genre} onChange={e => setFilter(f => ({ ...f, genre: e.target.value }))} />
        <input className="rounded px-3 py-2 bg-dark-800 border border-dark-700 text-white" placeholder="Country" value={filter.country} onChange={e => setFilter(f => ({ ...f, country: e.target.value }))} />
      </div>
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-400 text-center py-8">No musicians found.</div>
      ) : (
        <div className="relative">
          {/* Left Arrow (desktop only) */}
          <button
            type="button"
            className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-dark-800/80 hover:bg-dark-700/90 rounded-full p-2 shadow-lg border border-dark-700 transition"
            style={{ outline: 'none' }}
            onClick={() => scrollBy(-320)}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6 text-gray-300" />
          </button>
          {/* Scrollable container */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scrollbar-thin scrollbar-thumb-primary-500/60 scrollbar-track-dark-800 snap-x snap-mandatory px-1 py-2 md:py-4"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
          >
            {filtered.map((m, i) => (
              <div
                key={m.uid || i}
                className="min-w-[240px] max-w-[90vw] md:min-w-[260px] md:max-w-[280px] flex-shrink-0 bg-gray-800 rounded-2xl shadow-lg p-5 flex flex-col items-center snap-center transition-transform hover:scale-105 hover:shadow-2xl duration-200 cursor-pointer"
                style={{ boxSizing: 'border-box' }}
                onClick={() => navigate(`/musician/${m.uid}`)}
                title={`View ${m.fullName}'s profile`}
              >
                <img
                  src={m.profileImagePath ? getGoogleDriveDirectUrl(m.profileImagePath) : '/default-avatar.svg'}
                  alt={m.fullName || 'Musician'}
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary-400 mb-3 shadow"
                  style={{ background: '#222' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg'; }}
                />
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-lg truncate max-w-[140px]">{m.fullName || 'Musician'}</span>
                  {m.isVerified && <BadgeCheck className="text-green-400 w-5 h-5" aria-label="Verified" />}
                </div>
                <div className="text-gray-400 text-sm mb-2 text-center">
                  {(Array.isArray(m.instrumentTypes) ? m.instrumentTypes.join(', ') : m.instrumentType) || 'Musician'}<br />
                  {m.musicCulture ? <span>{m.musicCulture}</span> : null}
                  {m.country ? <span> • {m.country}</span> : null}
                </div>
                {friendStatuses[m.uid] === 'friends' ? (
                  <button
                    className="mt-2 w-full px-4 py-2 rounded-lg bg-red-600 text-white font-bold shadow-lg hover:bg-red-700 hover:scale-[1.03] transition-all duration-150 disabled:opacity-60"
                    onClick={e => { e.stopPropagation(); handleUnfriend(m.uid); }}
                    disabled={friendLoading[m.uid]}
                  >
                    {friendLoading[m.uid] ? 'Removing...' : 'Unfriend'}
                  </button>
                ) : friendStatuses[m.uid] === 'pending' && friendRequestsByMusician[m.uid] && user ? (
                  friendRequestsByMusician[m.uid].to === user.uid ? (
                    <div className="flex gap-2 mt-2 w-full">
                      <button
                        className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-bold shadow-lg hover:bg-green-700 hover:scale-[1.03] transition-all duration-150 disabled:opacity-60"
                        onClick={e => { e.stopPropagation(); handleAcceptRequest(friendRequestsByMusician[m.uid]); }}
                        disabled={friendLoading[m.uid]}
                      >
                        Accept
                      </button>
                      <button
                        className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-bold shadow-lg hover:bg-red-700 hover:scale-[1.03] transition-all duration-150 disabled:opacity-60"
                        onClick={e => { e.stopPropagation(); handleDeclineRequest(friendRequestsByMusician[m.uid]); }}
                        disabled={friendLoading[m.uid]}
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <button
                      className="mt-2 w-full px-4 py-2 rounded-lg bg-red-600 text-white font-bold shadow-lg hover:bg-red-700 hover:scale-[1.03] transition-all duration-150 disabled:opacity-60"
                      onClick={e => { e.stopPropagation(); handleCancelRequest(m.uid); }}
                      disabled={friendLoading[m.uid]}
                    >
                      {friendLoading[m.uid] ? 'Cancelling...' : 'Cancel Request'}
                    </button>
                  )
                ) : (
                  <button
                    className="btn-primary text-sm mt-2 w-full"
                    onClick={e => { e.stopPropagation(); handleAddFriend(m.uid); }}
                    disabled={friendLoading[m.uid]}
                  >
                    {friendLoading[m.uid] ? 'Sending...' : 'Add Friend'}
                  </button>
                )}
                {friendError[m.uid] && <div className="text-red-400 text-xs mt-1">{friendError[m.uid]}</div>}
              </div>
            ))}
          </div>
          {/* Right Arrow (desktop only) */}
          <button
            type="button"
            className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-dark-800/80 hover:bg-dark-700/90 rounded-full p-2 shadow-lg border border-dark-700 transition"
            style={{ outline: 'none' }}
            onClick={() => scrollBy(320)}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6 text-gray-300" />
          </button>
        </div>
      )}
    </section>
  );
};

// Add notification type
interface FriendRequestNotification {
  id: string;
  type: string;
  from: string;
  createdAt?: any;
  read: boolean;
}

const ComingSoonModal: React.FC<{ open: boolean; onClose: () => void; feature?: string }> = ({ open, onClose, feature }) => (
  <Dialog open={open} onClose={onClose} className="fixed z-50 inset-0 flex items-center justify-center">
    <div className="fixed inset-0 bg-black/60" aria-hidden="true" onClick={onClose}></div>
    <div className="relative bg-dark-800 rounded-xl shadow-xl p-8 max-w-sm w-full z-10 flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-2">Coming Soon!</h2>
      <p className="text-gray-300 mb-4 text-center">{feature ? `${feature} is coming soon to SoundAlchemy!` : 'This feature is coming soon to SoundAlchemy!'}</p>
      <button className="btn-primary px-6 py-2 rounded" onClick={onClose}>OK</button>
    </div>
  </Dialog>
);

const dashboardSchema = `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "SoundAlchemy Dashboard",
  "description": "Your personalized music dashboard for global musicians, collaborations, and orchestras. Powered by SoundAlchemy and Lehan Kawshila.",
  "url": "https://soundalcmy.com/dashboard"
}`;

interface CommunityPost {
  id: string;
  userId: string;
  userName?: string;
  userImage?: string;
  content?: string;
  timestamp?: any;
  media?: { type: string; url: string; thumbnail?: string };
  likes?: number;
  comments?: number;
  shares?: number;
  tags?: string[];
  visibility?: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarClosed, setSidebarClosed] = useState(true);
  const [allMusicians, setAllMusicians] = useState<Musician[]>([]);
  const [musiciansLoading, setMusiciansLoading] = useState(false);
  const [notifications, setNotifications] = useState<FriendRequestNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [senderInfo, setSenderInfo] = useState<Record<string, { name: string; avatar: string }>>({});
  const navigate = useNavigate();
  const [friends, setFriends] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [suggestedMusicians, setSuggestedMusicians] = useState<Musician[]>([]);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [unfriendLoading, setUnfriendLoading] = useState<string | null>(null);
  const [unfriendError, setUnfriendError] = useState<string | null>(null);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState<string | undefined>(undefined);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [collaborations, setCollaborations] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [personalizedFeed, setPersonalizedFeed] = useState<any[]>([]);

  // Fetch user data (as before)
  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch all verified musicians for global search and suggestions
  useEffect(() => {
    setMusiciansLoading(true);
    (async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('isVerified', '==', true));
        const querySnapshot = await getDocs(q);
        const usersData: Musician[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            fullName: data.fullName || '',
            profileImagePath: data.profileImagePath,
            instrumentTypes: data.instrumentTypes,
            instrumentType: data.instrumentType,
            musicCulture: data.musicCulture,
            bio: data.bio,
            isVerified: data.isVerified,
            friends: data.friends,
            country: data.country || '',
          };
        });
        setAllMusicians(usersData);
      } catch (error) {
        setAllMusicians([]);
      } finally {
        setMusiciansLoading(false);
      }
    })();
  }, []);

  // Suggestions: always show up to 5 musicians, update reactively
  useEffect(() => {
    if (!userData || !allMusicians.length) {
      setSuggestedMusicians([]);
      return;
    }
    const myInstruments = Array.isArray(userData.instrumentTypes) ? userData.instrumentTypes : (userData.instrumentType ? [userData.instrumentType] : []);
    const myCulture = (userData.musicCulture || '').toLowerCase();
    const myBio = (userData.bio || '').toLowerCase();
    const myFriends = userData.friends || [];
    const myUid = userData.uid || user?.uid;
    // Score musicians (only verified)
    let scored = allMusicians
      .filter((m: Musician) => m.uid !== myUid && !(myFriends || []).includes(m.uid) && m.isVerified)
      .map((m: Musician) => {
        let score = 0;
        // Instrument match
        const theirInstruments = Array.isArray(m.instrumentTypes) ? m.instrumentTypes : (m.instrumentType ? [m.instrumentType] : []);
        if (myInstruments.length && theirInstruments.length) {
          score += myInstruments.filter((i: string) => theirInstruments.includes(i)).length * 3;
        }
        // Music culture match
        if (myCulture && m.musicCulture && m.musicCulture.toLowerCase() === myCulture) score += 2;
        // Bio keyword match
        if (myBio && m.bio) {
          const bioWords = myBio.split(/\s+/);
          const theirBio = m.bio.toLowerCase();
          score += bioWords.filter((word: string) => word.length > 3 && theirBio.includes(word)).length;
        }
        return { ...m, _score: score ?? 0 };
      })
      .sort((a: Musician, b: Musician) => (b._score ?? 0) - (a._score ?? 0));
    // Always show up to 5, fallback to random if not enough scored
    let suggestions: Musician[] = [];
    if (scored.length >= 5) {
      suggestions = scored.slice(0, 5);
    } else if (scored.length > 0) {
      // Fill with randoms if not enough
      const remaining = allMusicians.filter(m => m.uid !== myUid && !(myFriends || []).includes(m.uid) && !scored.some(s => s.uid === m.uid) && m.isVerified);
      const shuffled = remaining.sort(() => Math.random() - 0.5);
      suggestions = [...scored, ...shuffled.slice(0, 5 - scored.length)];
    } else {
      // No scored, just random (only verified)
      const pool = allMusicians.filter(m => m.uid !== myUid && !(myFriends || []).includes(m.uid) && m.isVerified);
      suggestions = pool.sort(() => Math.random() - 0.5).slice(0, 5);
    }
    setSuggestedMusicians(suggestions);
  }, [userData, allMusicians, user, friends]);

  // Listen for friend request notifications
  useEffect(() => {
    if (!user) return;
    setNotifLoading(true);
    const notifRef = collection(db, 'users', user.uid, 'notifications');
    const unsub = onSnapshot(notifRef, (snapshot) => {
      // Only include notifications with required fields
      const notifs = snapshot.docs
        .map(doc => {
          const data = doc.data() as unknown as Partial<FriendRequestNotification>;
          return {
            id: doc.id,
            type: data.type ?? '',
            from: data.from ?? '',
            read: data.read ?? false,
            ...(data.createdAt !== undefined ? { createdAt: data.createdAt } : {}),
          };
        })
        .filter((n): n is FriendRequestNotification =>
          typeof n.type === 'string' &&
          typeof n.from === 'string' &&
          typeof n.read === 'boolean'
        );
      setNotifications(notifs.filter(n => n.type === 'friend_request' && !n.read));
      setNotifLoading(false);
    }, (err) => {
      setNotifError('Failed to load notifications');
      setNotifLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Fetch sender info for notifications
  useEffect(() => {
    const fetchSenders = async () => {
      const uniqueSenderUids = Array.from(new Set(notifications.map(n => n.from)));
      const info: Record<string, { name: string; avatar: string }> = {};
      for (const uid of uniqueSenderUids) {
        if (senderInfo[uid]) {
          info[uid] = senderInfo[uid];
          continue;
        }
        try {
          const docSnap = await getDoc(doc(db, 'users', uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            info[uid] = {
              name: data.fullName || 'Musician',
              avatar: data.profileImagePath ? getGoogleDriveDirectUrl(data.profileImagePath) : '/default-avatar.svg',
            };
          } else {
            info[uid] = { name: 'Musician', avatar: '/default-avatar.svg' };
          }
        } catch {
          info[uid] = { name: 'Musician', avatar: '/default-avatar.svg' };
        }
      }
      setSenderInfo(prev => ({ ...prev, ...info }));
    };
    if (notifications.length > 0) fetchSenders();
  }, [notifications]);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setFriendsLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const friendUids: string[] = userData.friends || [];
        if (friendUids.length === 0) {
          setFriends([]);
          setFriendsLoading(false);
          return;
        }
        // Fetch each friend's public info
        const friendDocs = await Promise.all(friendUids.map(uid => getDoc(doc(db, 'users', uid))));
        const friendData = friendDocs
          .filter(docSnap => docSnap.exists())
          .map(docSnap => {
            const d = docSnap.data();
            return {
              uid: docSnap.id,
              fullName: d.fullName,
              profileImagePath: d.profileImagePath,
              country: d.country,
              instrumentTypes: d.instrumentTypes,
              isVerified: d.isVerified,
            };
          });
        setFriends(friendData);
      } else {
        setFriends([]);
      }
    } catch (e) {
      setFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchFriends(); }, [user, fetchFriends]);

  useEffect(() => { fetchUserData(); }, [fetchUserData]);

  useEffect(() => {
    if (!user) return;
    // Fetch portfolio (projects)
    (async () => {
      try {
        const docRef = doc(db, 'portfolios', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPortfolio(docSnap.data().tracks || []);
        } else {
          setPortfolio([]);
        }
      } catch {
        setPortfolio([]);
      }
    })();
    // Fetch collaborations
    (async () => {
      try {
        const docRef = doc(db, 'collaborations', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCollaborations(docSnap.data().opportunities || []);
        } else {
          setCollaborations([]);
        }
      } catch {
        setCollaborations([]);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Fetch analytics
    (async () => {
      try {
        const docRef = doc(db, 'analytics', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAnalytics(docSnap.data());
        } else {
          setAnalytics(null);
        }
      } catch {
        setAnalytics(null);
      }
    })();
  }, [user]);

  // Unfriend handler
  const handleUnfriend = async (friendUid: string) => {
    if (!user) return;
    setUnfriendLoading(friendUid);
    setUnfriendError(null);
    try {
      // Fetch current user's friends
      const userDocSnap = await getDoc(doc(db, 'users', user.uid));
      const friendDocSnap = await getDoc(doc(db, 'users', friendUid));
      if (userDocSnap.exists() && friendDocSnap.exists()) {
        const userFriends: string[] = userDocSnap.data().friends || [];
        const friendFriends: string[] = friendDocSnap.data().friends || [];
        const updatedUserFriends = userFriends.filter((uid: string) => uid !== friendUid);
        const updatedFriendFriends = friendFriends.filter((uid: string) => uid !== user.uid);
        await updateDoc(doc(db, 'users', user.uid), { friends: updatedUserFriends });
        await updateDoc(doc(db, 'users', friendUid), { friends: updatedFriendFriends });
        // Remove any friendRequests between the two users
        const friendRequestsRef = collection(db, 'friendRequests');
        const q = query(friendRequestsRef,
          where('from', 'in', [user.uid, friendUid]),
          where('to', 'in', [user.uid, friendUid])
        );
        const reqsSnap = await getDocs(q);
        for (const docSnap of reqsSnap.docs) {
          await deleteDoc(doc(db, 'friendRequests', docSnap.id));
        }
        fetchFriends();
      } else {
        setUnfriendError('User not found.');
      }
    } catch (e) {
      setUnfriendError('Failed to unfriend. Please try again.');
    } finally {
      setUnfriendLoading(null);
    }
  };

  // New handlers
  const handleAcceptRequest = async (notif: FriendRequestNotification) => {
    if (!user) return;
    setNotifLoading(true);
    setNotifError(null);
    try {
      // Update the friend request status to 'accepted'
      await updateDoc(doc(db, 'friendRequests', notif.id), { status: 'accepted' });
      // Add each user to the other's friends list
      const fromUserDoc = await getDoc(doc(db, 'users', notif.from));
      const toUserDoc = await getDoc(doc(db, 'users', user.uid));
      if (fromUserDoc.exists() && toUserDoc.exists()) {
        const fromFriends = fromUserDoc.data().friends || [];
        const toFriends = toUserDoc.data().friends || [];
        if (!fromFriends.includes(user.uid)) {
          await updateDoc(doc(db, 'users', notif.from), { friends: [...fromFriends, user.uid] });
        }
        if (!toFriends.includes(notif.from)) {
          await updateDoc(doc(db, 'users', user.uid), { friends: [...toFriends, notif.from] });
        }
      }
      fetchFriends();
    } catch (e) {
      setNotifError('Failed to accept request.');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleDeclineRequest = async (notif: FriendRequestNotification) => {
    if (!user) return;
    setNotifLoading(true);
    setNotifError(null);
    try {
      await deleteDoc(doc(db, 'friendRequests', notif.id));
    } catch (e) {
      setNotifError('Failed to decline request.');
    } finally {
      setNotifLoading(false);
    }
  };

  // Optimized: Fetch personalized feed from top-level community_posts
  useEffect(() => {
    const fetchFeed = async () => {
      if (!userData) return;
      setFeedLoading(true);
      try {
        const postsRef = collection(db, 'community_posts');
        const q = query(postsRef, orderBy('timestamp', 'desc'), limit(30));
        const snapshot = await getDocs(q);
        let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommunityPost[];
        // Filter for public, friends, or matching tags
        posts = posts.filter(post =>
          post.visibility === 'public' ||
          (userData.friends && userData.friends.includes(post.userId)) ||
          (userData.instrumentTypes && post.tags && post.tags.some((tag: string) => userData.instrumentTypes.includes(tag))) ||
          (userData.musicCulture && post.tags && post.tags.includes(userData.musicCulture))
        );
        setPersonalizedFeed(posts);
      } catch (e) {
        setPersonalizedFeed([]);
      } finally {
        setFeedLoading(false);
      }
    };
    fetchFeed();
  }, [userData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Dashboard | SoundAlchemy – Global Musicians, Collaboration & Music Platform"
        description="Your personalized music dashboard for global musicians, collaborations, orchestras, and more. Powered by SoundAlchemy and Lehan Kawshila."
        keywords="soundalcmy, soundalchemy, music, dashboard, global musicians, lehan kawshila, collaboration, orchestra, guitar, world wide"
        image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
        url="https://soundalcmy.com/dashboard"
        lang="en"
        schema={dashboardSchema}
      />
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700 text-white flex flex-col">
        {/* Top Navigation Bar */}
        <TopNav onSearch={v => setSearchValue(v)} searchValue={searchValue} setSearchValue={setSearchValue} />
        <div className="flex flex-1 pt-20">
          {/* Main Content */}
          <main className="flex-1 px-2 sm:px-4 md:px-8 py-8 max-w-6xl mx-auto w-full">
            {/* Welcome & Quick Actions */}
            <section className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 mb-8">
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border-4 border-primary-500 shadow-lg">
                {userData?.profileImagePath || userData?.profileImage ? (
                  <img
                    src={userData.profileImagePath ? getGoogleDriveDirectUrl(userData.profileImagePath) : userData.profileImage || '/default-avatar.svg'}
                    alt={userData.fullName || 'Profile'}
                    className="w-full h-full object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg'; }}
                  />
                ) : (
                  <Music2 className="text-primary-400 w-16 h-16" />
                )}
                {/* Verified or Pending Badge */}
                {userData?.isVerified ? (
                  <span className="absolute bottom-2 right-2 bg-green-500 rounded-full p-1 shadow-lg flex items-center" title="Verified Musician">
                    <BadgeCheck className="w-5 h-5 text-white" />
                  </span>
                ) : (
                  <span className="absolute bottom-2 right-2 bg-yellow-400 rounded-full p-1 shadow-lg flex items-center" title="Pending Verification">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </span>
                )}
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-2 justify-center md:justify-start">
                  Welcome back, {userData?.fullName || 'Musician'}! 🎶
                  {/* Inline badge for verified */}
                  {userData?.isVerified ? (
                    <span className="ml-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                      <BadgeCheck className="w-4 h-4" /> Verified
                    </span>
                  ) : (
                    <span className="ml-2 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Pending Verification
                    </span>
                  )}
                </h1>
                <p className="text-lg text-gray-300 mb-3">Let your music inspire the world. Ready for your next collaboration?</p>
                {/* Show verification status if not verified */}
                {!userData?.isVerified && (
                  <>
                    <div className="text-yellow-400 text-sm mb-2">
                      {userData?.verificationStatus ? `Status: ${userData.verificationStatus}` : 'Your account is pending verification.'}
                    </div>
                    <div className="text-yellow-200 text-xs mb-2">
                      Note: Our SoundAlchemy team is reviewing your details. Once verified, all features will be enabled for your account.
                    </div>
                  </>
                )}
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  {friends.length > 0 && (
                    <div className="bg-gray-800/80 rounded-lg px-4 py-2 flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary-400" />
                      {`${friends.length} Friends`}
                    </div>
                  )}
                  <div className="bg-gray-800/80 rounded-lg px-4 py-2 flex items-center gap-2 cursor-pointer" onClick={() => { setComingSoonFeature('Projects'); setComingSoonOpen(true); }}>
                    <Music2 className="w-5 h-5 text-secondary-400" />
                    {portfolio.length > 0 ? `${portfolio.length} Projects` : 'No projects yet'}
                  </div>
                  <div className="bg-gray-800/80 rounded-lg px-4 py-2 flex items-center gap-2 cursor-pointer" onClick={() => { setComingSoonFeature('Collaborations'); setComingSoonOpen(true); }}>
                    <UserPlus className="w-5 h-5 text-pink-400" />
                    {collaborations.length > 0 ? `${collaborations.length} Collaborations` : 'No collaborations yet'}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button className="btn-primary flex items-center gap-2" onClick={() => { setComingSoonFeature('Upload Track'); setComingSoonOpen(true); }}><PlusCircle /> Upload Track</button>
                <Link to="/start-collaboration" className="btn-secondary flex items-center gap-2"><UserPlus /> Start Collaboration</Link>
                <Link to="/collaborations" className="btn-outline flex items-center gap-2"><Users /> Browse Collaborations</Link>
                <button className="btn-outline flex items-center gap-2" onClick={() => { setComingSoonFeature('Go Live'); setComingSoonOpen(true); }}><Video /> Go Live</button>
                <button className="btn-outline flex items-center gap-2" onClick={() => navigate('/profile?editProfile=true')}><Star /> Edit Profile</button>
                {userData?.isVerified && (
                  <Link to="/messaging" className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700">
                    <MessageCircle className="w-4 h-4" /> Messages
                  </Link>
                )}
              </div>
            </section>

            {/* Friends List Section */}
            {friends.length > 0 && (
              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">My Friends <span className="text-gray-400 text-base font-normal">({friends.length})</span></h2>
                {friendsLoading ? (
                  <div className="flex justify-center items-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div></div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-primary-500/60 scrollbar-track-dark-800 snap-x snap-mandatory py-2">
                    {friends.map(f => (
                      <div
                        key={f.uid}
                        className="min-w-[180px] max-w-[200px] flex-shrink-0 bg-gray-800 rounded-xl p-3 flex flex-col items-center snap-center cursor-pointer hover:scale-105 transition-transform relative"
                      >
                        <img
                          src={f.profileImagePath ? getGoogleDriveDirectUrl(f.profileImagePath) : '/default-avatar.svg'}
                          alt={f.fullName || 'Musician'}
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary-400 mb-2"
                          onClick={() => navigate(`/musician/${f.uid}`)}
                          onError={e => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg'; }}
                          style={{ cursor: 'pointer' }}
                        />
                        <div className="flex items-center gap-1 mb-1">
                          <span className="font-semibold text-base truncate max-w-[100px]">{f.fullName || 'Musician'}</span>
                          {f.isVerified && <BadgeCheck className="text-green-400 w-4 h-4" />}
                        </div>
                        <div className="text-xs text-gray-400 text-center truncate max-w-[120px]">{Array.isArray(f.instrumentTypes) ? f.instrumentTypes.join(', ') : ''}</div>
                        <div className="text-xs text-gray-400">{f.country || ''}</div>
                        <button
                          className="mt-3 w-full px-4 py-2 rounded-lg bg-red-600/80 text-white font-semibold hover:bg-red-700 transition disabled:opacity-60"
                          onClick={() => handleUnfriend(f.uid)}
                          disabled={unfriendLoading === f.uid}
                        >
                          {unfriendLoading === f.uid ? 'Removing...' : 'Unfriend'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {unfriendError && <div className="text-red-400 text-center mt-2">{unfriendError}</div>}
              </section>
            )}

            {/* Global Search Results (if searching) */}
            {searchValue && (
              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">Search Results for "{searchValue}"</h2>
                {musiciansLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {allMusicians.filter(m => (m.fullName || '').toLowerCase().includes(searchValue.toLowerCase())).map((m, i) => (
                      <div key={m.uid || i} className="bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col items-center">
                        <img src={m.profileImagePath || '/default-avatar.svg'} alt={m.fullName || 'Musician'} className="w-20 h-20 rounded-full object-cover border-2 border-primary-400 mb-2" />
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-lg">{m.fullName || 'Musician'}</span>
                          <BadgeCheck className="text-green-400 w-5 h-5" aria-label="Verified" />
                        </div>
                        <div className="text-gray-400 text-sm mb-2">
                          {(Array.isArray(m.instrumentTypes) ? m.instrumentTypes.join(', ') : m.instrumentType) || 'Musician'}
                          {m.musicCulture ? ` • ${m.musicCulture}` : ''}
                          {m.country ? ` • ${m.country}` : ''}
                        </div>
                        <button className="btn-primary text-sm mt-2">Add Friend</button>
                      </div>
                    ))}
                    {/* Optionally, show a message if no results */}
                    {allMusicians.filter(m => (m.fullName || '').toLowerCase().includes(searchValue.toLowerCase())).length === 0 && (
                      <div className="col-span-full text-gray-400">No musicians found.</div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Content Feed */}
            <section id="feed" className="mb-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 animate-fade-in">
                <Star className="text-yellow-400 animate-bounce" /> For You
              </h2>
              <div className="bg-gradient-to-br from-blue-900 via-dark-800 to-dark-700 rounded-2xl shadow-2xl p-10 flex flex-col items-center animate-fade-in-up relative overflow-hidden">
                <div className="absolute -top-8 -left-8 opacity-10 pointer-events-none select-none">
                  <Star className="w-32 h-32 text-yellow-400 animate-spin-slow" />
                </div>
                <p className="text-xl text-gray-200 text-center font-medium animate-fade-in">
                  No personalized news or updates yet.<br />
                  <span className="text-primary-400">Follow musicians and join collaborations to see more here!</span>
                </p>
              </div>
            </section>

            {/* My Projects & Collaborations */}
            <section id="projects" className="mb-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 animate-fade-in">
                <Music2 className="text-primary-400 animate-pulse" /> My Projects & Collaborations
              </h2>
              <div className="bg-gradient-to-br from-primary-900 via-dark-800 to-dark-700 rounded-2xl shadow-2xl p-10 flex flex-col items-center animate-fade-in-up relative overflow-hidden">
                <div className="absolute -bottom-8 -right-8 opacity-10 pointer-events-none select-none">
                  <Music2 className="w-32 h-32 text-primary-400 animate-spin-slow" />
                </div>
                <p className="text-xl text-gray-200 text-center font-medium animate-fade-in mb-6">
                  You have no projects or collaborations yet.<br />
                  <span className="text-secondary-400">Start a new project or join a collaboration to get started!</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-6 w-full justify-center animate-fade-in-up">
                  <Link to="/start-collaboration" className="btn-primary text-lg px-8 py-3 rounded-xl shadow-lg hover:scale-105 hover:bg-primary-600 transition-all duration-200 animate-glow flex items-center gap-2">
                    <PlusCircle className="w-6 h-6" /> Start Collaboration
                  </Link>
                  <Link to="/collaborations" className="btn-secondary text-lg px-8 py-3 rounded-xl shadow-lg hover:scale-105 hover:bg-red-700 transition-all duration-200 animate-glow flex items-center gap-2">
                    <Users className="w-6 h-6" /> Browse Collaborations
                  </Link>
                </div>
              </div>
            </section>

            {/* Find Musicians (unique, verified only) */}
            <FindMusicians isVerified={userData?.isVerified} handleUnfriend={handleUnfriend} handleAcceptRequest={handleAcceptRequest} handleDeclineRequest={handleDeclineRequest} />

            {/* Analytics & Achievements */}
            <section id="analytics" className="mb-10">
              <h2 className="text-2xl font-bold mb-4">Your Stats & Achievements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-800 rounded-xl p-6 shadow-xl flex flex-col items-center">
                  <h3 className="text-xl font-bold mb-4">Your Stats</h3>
                  <div className="flex flex-wrap gap-6 justify-center">
                    <div className="flex flex-col items-center"><span className="text-2xl font-bold text-primary-400">{analytics?.totalPlays ?? 0}</span><span className="text-gray-400">Plays</span></div>
                    <div className="flex flex-col items-center"><span className="text-2xl font-bold text-secondary-400">{analytics?.likes ?? 0}</span><span className="text-gray-400">Likes</span></div>
                    <div className="flex flex-col items-center"><span className="text-2xl font-bold text-pink-400">{analytics?.collaborations ?? 0}</span><span className="text-gray-400">Collabs</span></div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-xl p-6 shadow-xl flex flex-col items-center">
                  <h3 className="text-xl font-bold mb-4">Achievements</h3>
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    {userData?.isVerified ? (
                      <div className="flex flex-col items-center">
                        <span className="inline-flex items-center bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold mb-2">
                          <BadgeCheck className="w-5 h-5 mr-2" /> Verified Musician
                        </span>
                        <span className="text-gray-300 text-sm">You have earned the Verified Musician badge!</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="inline-flex items-center bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded text-sm font-semibold mb-2">
                          <AlertCircle className="w-5 h-5 mr-2" /> Not Verified
                        </span>
                        <span className="text-gray-300 text-sm">Complete your profile and verification to earn badges.</span>
                      </div>
                    )}
                    {/* Achievements: hide Total Friends if zero friends */}
                    {friends.length > 0 && (
                      <div className="flex flex-col items-center mt-4">
                        <span className="text-lg font-bold text-primary-400">{friends.length}</span>
                        <span className="text-gray-400">Total Friends</span>
                      </div>
                    )}
                    <div className="flex flex-col items-center mt-2">
                      <span className="text-lg font-bold text-green-400">{friends.filter((f: any) => f.isVerified).length}</span>
                      <span className="text-gray-400">Verified Musician Friends</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SoundAlcmy Video Channel Show */}
            <section id="video-channel" className="mb-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 animate-fade-in">
                <Video className="text-pink-400 animate-bounce" /> SoundAlcmy Video Channel Show
              </h2>
              <div className="bg-gradient-to-br from-pink-900 via-dark-800 to-dark-700 rounded-2xl p-10 shadow-2xl flex flex-col items-center relative overflow-hidden animate-fade-in-up">
                <div className="absolute -top-10 -right-10 opacity-20 pointer-events-none select-none">
                  <Video className="w-40 h-40 text-pink-500 animate-spin-slow" />
                </div>
                <div className="flex flex-col items-center z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <Music2 className="w-12 h-12 text-primary-400 animate-pulse" />
                    <span className="text-3xl font-extrabold bg-gradient-to-r from-pink-400 to-primary-400 bg-clip-text text-transparent drop-shadow-lg animate-fade-in">SoundAlcmy Video Channel</span>
                  </div>
                  <p className="text-lg text-gray-200 mb-6 text-center max-w-xl animate-fade-in">
                    Explore exclusive music video shows, artist interviews, and creative content from the SoundAlcmy community. Join, create, and share your own music videos in our professional Video Studio!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 w-full justify-center animate-fade-in-up">
                    <a
                      href="http://localhost:5173/musician/me/channel"
                      className="btn-primary flex items-center gap-2 text-lg px-8 py-3 rounded-xl shadow-lg hover:scale-105 hover:bg-pink-600 transition-all duration-200 animate-glow"
                    >
                      <Video className="w-6 h-6" /> Go To SoundAlcmy Video Channel
                    </a>
                    <a
                      href="http://localhost:5173/music-videos"
                      className="btn-secondary flex items-center gap-2 text-lg px-8 py-3 rounded-xl shadow-lg hover:scale-105 hover:bg-primary-700 transition-all duration-200 animate-glow"
                    >
                      <PlusCircle className="w-6 h-6" /> Go To Video Studio
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Community & Events */}
            <section id="community" className="mb-10">
              <h2 className="text-2xl font-bold mb-4">Community & Events</h2>
              <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
                <h3 className="text-lg font-bold mb-2">Upcoming Events</h3>
                <ul className="space-y-2">
                  {mockEvents.map(event => (
                    <li key={event.id} className="flex items-center gap-3 cursor-pointer hover:bg-dark-700 rounded-lg px-2 py-1 transition" onClick={() => { setComingSoonFeature(event.title); setComingSoonOpen(true); }}>
                      <Calendar className="text-primary-400 w-5 h-5" />
                      <span className="font-medium">{event.title}</span>
                      <span className="text-gray-400">{event.date}</span>
                      <span className="text-gray-400">{event.location}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
            <ComingSoonModal open={comingSoonOpen} onClose={() => setComingSoonOpen(false)} feature={comingSoonFeature} />
          </main>
          {/* Sidebar open button: always visible on xl screens */}
          {sidebarClosed && (
            <button
              className={`fixed top-28 right-0 z-30 bg-dark-800 border border-dark-700 rounded-l-full p-2 shadow-lg transition-transform xl:block hidden`}
              style={{ outline: 'none' }}
              onClick={() => {
                setSidebarOpen(true);
                setSidebarClosed(false);
              }}
              aria-label="Open sidebar"
            >
              <ChevronLeft className="w-6 h-6 text-gray-300" />
            </button>
          )}
          {/* Sidebar: only show if open */}
          {sidebarOpen && !sidebarClosed && (
            <aside
              className={`xl:flex flex-col w-80 h-full bg-dark-900 border-l border-dark-700 py-8 px-4 space-y-8 fixed right-0 top-0 z-20 pt-20 transition-transform duration-300 ease-in-out translate-x-0 hidden xl:block`}
              style={{ minWidth: 320 }}
            >
              {/* Sidebar content here */}
              {/* Add a close button inside the sidebar */}
              <button
                className="absolute top-28 left-0 transform -translate-x-full bg-dark-800 border border-dark-700 rounded-l-full p-2 shadow-lg hover:bg-dark-700 transition-colors"
                style={{ outline: 'none' }}
                onClick={() => {
                  setSidebarOpen(false);
                  setSidebarClosed(true);
                }}
                aria-label="Close sidebar"
              >
                <ChevronRight className="w-6 h-6 text-gray-300" />
              </button>
              {/* Notifications */}
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><BellRing className="text-yellow-400" /> Notifications</h3>
                {notifLoading ? (
                  <div className="text-gray-400">Loading...</div>
                ) : notifError ? (
                  <div className="text-red-400">{notifError}</div>
                ) : notifications.length === 0 ? (
                  <div className="text-gray-400">No new notifications.</div>
                ) : (
                  <ul className="space-y-3">
                    {notifications.map(n => (
                      <li key={n.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-3 shadow hover:shadow-lg transition-shadow">
                        <img
                          src={senderInfo[n.from]?.avatar || '/default-avatar.svg'}
                          alt={senderInfo[n.from]?.name || 'Musician'}
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary-400 cursor-pointer"
                          onClick={() => navigate(`/musician/${n.from}`)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{senderInfo[n.from]?.name || 'Musician'}</div>
                          <div className="text-gray-400 text-xs truncate">wants to add you as a friend</div>
                        </div>
                        <div className="flex gap-2">
                          {n.type === 'friend_request' && (
                            <>
                              <button
                                className="px-3 py-1 rounded-full bg-green-600 text-white font-bold shadow hover:bg-green-700 transition-all duration-150 disabled:opacity-60"
                                onClick={async () => {
                                  await handleAcceptRequest(n);
                                  if (!user) return;
                                  await updateDoc(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
                                }}
                                disabled={notifLoading}
                              >
                                {notifLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Accept'}
                              </button>
                              <button
                                className="px-3 py-1 rounded-full bg-red-600 text-white font-bold shadow hover:bg-red-700 transition-all duration-150 disabled:opacity-60"
                                onClick={async () => {
                                  await handleDeclineRequest(n);
                                  if (!user) return;
                                  await updateDoc(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
                                }}
                                disabled={notifLoading}
                              >
                                {notifLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Decline'}
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Suggestions */}
              {userData?.isVerified && (
                <div>
                  <h3 className="text-lg font-bold mb-2">Suggestions</h3>
                  {(() => {
                    const verifiedSuggestions = suggestedMusicians.filter((s: Musician) => s.isVerified);
                    if (musiciansLoading) {
                      return <div className="text-gray-400">Loading...</div>;
                    } else if (verifiedSuggestions.length === 0) {
                      return <div className="text-gray-400">No suggestions available. Invite more musicians to join SoundAlchemy!</div>;
                    } else {
                      return verifiedSuggestions.map((s: Musician, i: number) => (
                        <div key={s.uid || i} className="flex items-center gap-3 bg-gray-800/80 rounded-lg px-4 py-3 shadow">
                          <img src={s.profileImagePath ? getGoogleDriveDirectUrl(s.profileImagePath) : '/default-avatar.svg'} alt={s.fullName || 'Musician'} className="w-12 h-12 rounded-full object-cover border-2 border-primary-400" onError={e => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg'; }} />
                          <div>
                            <div className="font-semibold flex items-center gap-1">{s.fullName || 'Musician'} {s.isVerified && <BadgeCheck className="text-green-400 w-4 h-4" />}</div>
                            <div className="text-xs text-gray-400 truncate max-w-[120px]">{Array.isArray(s.instrumentTypes) ? s.instrumentTypes.join(', ') : s.instrumentType}</div>
                            <button className="btn-primary btn-xs mt-1" onClick={() => navigate(`/musician/${s.uid}`)}>View</button>
                          </div>
                        </div>
                      ));
                    }
                  })()}
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard; 