import React, { useState, useEffect } from 'react';
import ChatRoom from './live/ChatRoom';
import MusicianProfilePanel from './live/MusicianProfilePanel';
import { db } from '../../config/firebase';
import { collection, addDoc, onSnapshot, Timestamp, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

// Helper to get direct Google Drive image URL
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
      // Use optimized direct URL without timestamp for better caching
      return `https://images.weserv.nl/?url=drive.google.com/uc?export=view%26id=${fileId}`;
    }
  }
  return url;
}

interface Room {
  id: string;
  title: string;
  topic: string;
  scheduled: string;
  createdAt: Timestamp;
  creatorUid: string;
  creatorName: string;
  creatorAvatar: string;
}

const LiveChatHub: React.FC = () => {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ title: '', topic: '', scheduled: '' });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch rooms in real time
  useEffect(() => {
    const q = query(collection(db, 'chatRooms'), orderBy('scheduled', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Create a new room in Firestore
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.title || !newRoom.topic || !newRoom.scheduled || !user) return;
    await addDoc(collection(db, 'chatRooms'), {
      title: newRoom.title,
      topic: newRoom.topic,
      scheduled: newRoom.scheduled,
      createdAt: Timestamp.now(),
      creatorUid: user.uid,
      creatorName: user.displayName || user.email || 'Unknown',
      creatorAvatar: user.photoURL || '/default-avatar.svg',
    });
    setShowCreateRoom(false);
    setNewRoom({ title: '', topic: '', scheduled: '' });
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900/95 to-gray-800/90 backdrop-blur-2xl py-6 px-2">
      <div className="w-full max-w-6xl h-[80vh] flex flex-col md:flex-row rounded-2xl shadow-2xl border border-gray-800/60 bg-gray-900/80 overflow-hidden">
        {/* Left: Room List */}
        <div className="w-full md:w-1/4 flex flex-col gap-4 p-4 border-r border-gray-800/60 bg-gray-900/90 max-h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white">Live Chatrooms</h2>
            <button
              className="px-3 py-1 rounded-lg bg-primary-500 hover:bg-primary-400 text-white font-semibold text-sm shadow transition-all duration-200"
              onClick={() => setShowCreateRoom(true)}
            >
              + Create Room
            </button>
          </div>
          <ul className="space-y-2">
            {loading ? (
              <li className="text-gray-400 text-center py-8">Loading rooms...</li>
            ) : rooms.length === 0 ? (
              <li className="text-gray-400 text-center py-8">No rooms yet. Be the first to create one!</li>
            ) : (
              rooms.map(room => (
                <li key={room.id}>
                  <button
                    className={`w-full flex flex-col items-start px-4 py-3 rounded-lg transition-all duration-200 bg-gray-800/70 hover:bg-primary-700/80 border border-gray-700/40 shadow-md text-left ${selectedRoom === room.id ? 'ring-2 ring-primary-400' : ''}`}
                    onClick={() => setSelectedRoom(room.id)}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <img
                        src={getGoogleDriveDirectUrl(room.creatorAvatar)}
                        alt={room.creatorName}
                        className="w-8 h-8 rounded-full border-2 border-primary-400"
                        onError={e => { e.currentTarget.src = '/default-avatar.svg'; }}
                      />
                      <span className="text-white font-semibold text-base">{room.creatorName}</span>
                    </div>
                    <span className="text-white font-medium text-lg">{room.title}</span>
                    <span className="text-primary-400 text-sm mb-1">{room.topic}</span>
                    <span className="text-xs text-gray-400">Scheduled: {room.scheduled ? new Date(room.scheduled).toLocaleString() : 'N/A'}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Center: Chat Room */}
        <div className="w-full md:w-2/4 flex flex-col h-full max-h-full bg-gray-900/80">
          {selectedRoom ? (
            <ChatRoom roomId={selectedRoom} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <span className="text-3xl mb-2">🎵</span>
              <p>Select a chatroom to start jamming with musicians worldwide!</p>
            </div>
          )}
        </div>

        {/* Right: Musician Profile & Presence */}
        <div className="w-full md:w-1/4 flex flex-col gap-4 p-4 border-l border-gray-800/60 bg-gray-900/90 max-h-full overflow-y-auto">
          <MusicianProfilePanel />
        </div>

        {/* Room Creation Modal (real form) */}
        {showCreateRoom && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <form onSubmit={handleCreateRoom} className="bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Create a New Chatroom</h3>
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Room Title</label>
                <input type="text" className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500" value={newRoom.title} onChange={e => setNewRoom({ ...newRoom, title: e.target.value })} required />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Today's Topic / Brief</label>
                <input type="text" className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500" value={newRoom.topic} onChange={e => setNewRoom({ ...newRoom, topic: e.target.value })} required />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Scheduled Time</label>
                <input type="datetime-local" className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500" value={newRoom.scheduled} onChange={e => setNewRoom({ ...newRoom, scheduled: e.target.value })} required />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="px-4 py-2 rounded-lg bg-gray-700 text-white" onClick={() => setShowCreateRoom(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-400 text-white font-semibold shadow">Create</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveChatHub; 