import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../../config/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { getProfileImageUrl } from '../../../utils/imageUtils';

interface ChatRoomProps {
  roomId: string;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: Timestamp;
  reactions: string[];
}

interface RoomInfo {
  title: string;
  topic: string;
  scheduled: string;
  creatorName: string;
  creatorAvatar: string;
}

interface Participant {
  id: string;
  name: string;
  avatar: string;
  instrument?: string;
  genre?: string;
  country?: string;
}

/**
 * ChatRoom displays real-time messages, typing indicators, and reactions.
 * Integrate with Socket.io or Firebase for real-time updates.
 */
const ChatRoom: React.FC<ChatRoomProps> = ({ roomId }) => {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch room info
  useEffect(() => {
    if (!roomId) return;
    getDoc(doc(db, 'chatRooms', roomId)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setRoomInfo({
          title: d.title,
          topic: d.topic,
          scheduled: d.scheduled,
          creatorName: d.creatorName,
          creatorAvatar: d.creatorAvatar,
        });
      }
    });
  }, [roomId]);

  // Fetch messages in real time
  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, 'chatRooms', roomId, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });
    return () => unsub();
  }, [roomId]);

  // Participants: add self on mount, remove on unmount
  useEffect(() => {
    if (!roomId || !user) return;
    const partRef = doc(db, 'chatRooms', roomId, 'participants', user.uid);
    setDoc(partRef, {
      name: user.displayName || user.email || 'Unknown',
      avatar: user.photoURL || '/default-avatar.svg',
      instrument: userProfile?.instrumentType || '',
      genre: userProfile?.musicCulture || '',
      country: userProfile?.country || '',
      joinedAt: Timestamp.now(),
    });
    return () => {
      deleteDoc(partRef);
    };
  }, [roomId, user, userProfile]);

  // Fetch participants in real time
  useEffect(() => {
    if (!roomId) return;
    const q = collection(db, 'chatRooms', roomId, 'participants');
    const unsub = onSnapshot(q, (snapshot) => {
      setParticipants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant)));
    });
    return () => unsub();
  }, [roomId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
      userId: user.uid,
      userName: user.displayName || user.email || 'Unknown',
      userAvatar: user.photoURL || '/default-avatar.svg',
      content: input,
      timestamp: Timestamp.now(),
      reactions: [],
    });
    setInput('');
  };

  // Handle reaction (optional, not implemented here)
  // const addReaction = ...

  return (
    <div className="flex flex-col h-full bg-gray-900/80 rounded-xl shadow-lg border border-gray-700/60 p-4">
      {/* Session Info Banner */}
      {roomInfo && (
        <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-primary-900/40 to-primary-700/20 border border-primary-500/30 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={getProfileImageUrl(roomInfo.creatorAvatar)}
              alt={roomInfo.creatorName}
              className="w-10 h-10 rounded-full border-2 border-primary-400"
              onError={e => { e.currentTarget.src = '/default-avatar.svg'; }}
            />
            <div>
              <div className="font-bold text-white text-lg">{roomInfo.title}</div>
              <div className="text-primary-300 text-sm">{roomInfo.topic}</div>
              <div className="text-xs text-gray-400">Scheduled: {roomInfo.scheduled ? new Date(roomInfo.scheduled).toLocaleString() : 'N/A'}</div>
              <div className="text-xs text-gray-400">Host: {roomInfo.creatorName}</div>
            </div>
          </div>
          <button className="ml-auto px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-400 text-white font-semibold shadow" onClick={() => setShowParticipants(true)}>
            View Musicians ({participants.length})
          </button>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl" onClick={() => setShowParticipants(false)}>&times;</button>
            <h3 className="text-xl font-bold text-white mb-4">Musicians in Discussion</h3>
            <ul className="space-y-4 max-h-96 overflow-y-auto">
              {participants.map(p => (
                <li key={p.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/70 border border-primary-500/20">
                  <img
                    src={getProfileImageUrl(p.avatar)}
                    alt={p.name}
                    className="w-12 h-12 rounded-full border-2 border-primary-400"
                    onError={e => { e.currentTarget.src = '/default-avatar.svg'; }}
                  />
                  <div>
                    <div className="font-semibold text-white text-base">{p.name}</div>
                    <div className="text-primary-300 text-sm">
                      {p.instrument && <span>{p.instrument}</span>}
                      {p.instrument && p.genre && <span> • </span>}
                      {p.genre && <span>{p.genre}</span>}
                    </div>
                    <div className="text-xs text-gray-400">{p.country}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar mb-2">
        {messages.map(msg => (
          <div key={msg.id} className="flex items-start gap-3 mb-4 group">
            <img
              src={getProfileImageUrl(msg.userAvatar)}
              alt={msg.userName}
              className="w-10 h-10 rounded-full border-2 border-primary-500/60 shadow-md"
              onError={e => { e.currentTarget.src = '/default-avatar.svg'; }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary-300">{msg.userName}</span>
                <span className="text-xs text-gray-400">{msg.timestamp && msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="text-white text-base bg-gray-800/80 rounded-lg px-4 py-2 mt-1 shadow-sm">
                {msg.content}
              </div>
              {/* Reactions (optional) */}
              {/* <div className="flex gap-2 mt-1"> ... </div> */}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {/* Message input */}
      <div className="flex items-center gap-2 mt-2">
        <input
          className="flex-1 px-4 py-2 rounded-lg bg-gray-800/80 text-white border border-gray-700/60 focus:outline-none focus:ring-2 focus:ring-primary-400 shadow"
          placeholder="Type your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') sendMessage();
          }}
        />
        <button
          className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-400 text-white font-semibold shadow transition-all duration-200"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatRoom; 