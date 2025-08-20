import React, { useEffect, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  likes?: string[];
}

const CommunityPage: React.FC = () => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'communityPosts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(
        snap.docs.map((d) => {
          const data: any = d.data();
          return {
            id: d.id,
            userId: data.userId,
            userName: data.userName || 'Musician',
            content: data.content,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          };
        })
      );
    });
    return () => unsub();
  }, []);

  const publish = async () => {
    if (!user || !content.trim()) return;
    await addDoc(collection(db, 'communityPosts'), {
      userId: user.uid,
      userName: user.email?.split('@')[0],
      content: content.trim(),
      createdAt: serverTimestamp(),
      likes: [],
    });
    setContent('');
  };

  const like = async (postId: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'communityPosts', postId), { likes: arrayUnion(user.uid) });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">Soundalchemy Community</h1>
      {user && (
        <div className="bg-dark-800 rounded-lg p-4 space-y-3">
          <textarea className="form-input w-full" placeholder="Share an update..." value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="flex justify-end"><button className="btn-primary" onClick={publish} disabled={!content.trim()}>Post</button></div>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="bg-dark-800 rounded-lg p-4">
            <div className="font-semibold">{p.userName}</div>
            <div className="text-gray-400 text-sm">{new Date(p.createdAt).toLocaleString()}</div>
            <div className="mt-2 whitespace-pre-wrap">{p.content}</div>
            <div className="mt-3 flex gap-3 text-sm">
              <button className="btn-secondary" onClick={() => like(p.id)}>Like {p.likes?.length ? `(${p.likes.length})` : ''}</button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <div className="text-gray-400">No posts yet.</div>}
      </div>
    </div>
  );
};

export default CommunityPage;


