import { db } from '../config/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, query, where, orderBy, serverTimestamp, increment } from 'firebase/firestore';

export interface MusicVideo {
  id?: string;
  musicianId: string;
  youtubeUrl: string;
  title: string;
  description: string;
  createdAt?: any;
  privacy: 'public' | 'private';
  likes?: string[];
  views?: number;
  viewCount?: number;
}

export async function uploadMusicVideo(video: Omit<MusicVideo, 'id' | 'createdAt' | 'likes' | 'views'>) {
  const ref = await addDoc(collection(db, 'musicVideos'), {
    ...video,
    createdAt: serverTimestamp(),
    likes: [],
    views: 0,
  });
  return ref.id;
}

export async function getMusicVideos(userId: string): Promise<MusicVideo[]> {
  // Show public videos and private videos owned by the user
  const q = query(
    collection(db, 'musicVideos'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as MusicVideo))
    .filter((video: MusicVideo) => video.privacy === 'public' || video.musicianId === userId);
}

export async function likeMusicVideo(videoId: string, userId: string) {
  const ref = doc(db, 'musicVideos', videoId);
  await updateDoc(ref, { likes: arrayUnion(userId) });
}

export async function unlikeMusicVideo(videoId: string, userId: string) {
  const ref = doc(db, 'musicVideos', videoId);
  await updateDoc(ref, { likes: arrayRemove(userId) });
}

// Track video view
export async function trackVideoView(videoId: string) {
  const ref = doc(db, 'musicVideos', videoId);
  await updateDoc(ref, { 
    views: increment(1),
    viewCount: increment(1)
  });
}

// Get video with updated view count
export async function getVideoWithViewCount(videoId: string): Promise<MusicVideo | null> {
  const ref = doc(db, 'musicVideos', videoId);
  const snapshot = await getDocs(query(collection(db, 'musicVideos'), where('__name__', '==', videoId)));
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MusicVideo;
}

export async function addComment(videoId: string, userId: string, comment: string) {
  await addDoc(collection(db, 'musicVideos', videoId, 'comments'), {
    userId,
    comment,
    createdAt: serverTimestamp(),
    likes: [],
    hearts: [],
    replies: []
  });
}

export async function addReply(videoId: string, commentId: string, userId: string, reply: string) {
  // Add reply to the comment's replies subcollection
  await addDoc(collection(db, 'musicVideos', videoId, 'comments', commentId, 'replies'), {
    userId,
    comment: reply,
    createdAt: serverTimestamp(),
    likes: [],
    hearts: []
  });
}

export async function getComments(videoId: string) {
  const q = query(collection(db, 'musicVideos', videoId, 'comments'), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  const comments = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const commentData = { id: doc.id, ...doc.data() };
      
      // Fetch replies for this comment
      const repliesQuery = query(
        collection(db, 'musicVideos', videoId, 'comments', doc.id, 'replies'),
        orderBy('createdAt', 'asc')
      );
      const repliesSnapshot = await getDocs(repliesQuery);
      const replies = repliesSnapshot.docs.map(replyDoc => ({
        id: replyDoc.id,
        ...replyDoc.data()
      }));
      
      return {
        ...commentData,
        replies
      };
    })
  );
  
  return comments;
}

export async function updateMusicVideo(videoId: string, updates: Partial<Pick<MusicVideo, 'title' | 'description' | 'privacy'>>) {
  const ref = doc(db, 'musicVideos', videoId);
  await updateDoc(ref, updates);
}

export async function updatePrivacy(videoId: string, privacy: 'public' | 'private') {
  const ref = doc(db, 'musicVideos', videoId);
  await updateDoc(ref, { privacy });
}

export async function deleteMusicVideo(videoId: string) {
  const ref = doc(db, 'musicVideos', videoId);
  await deleteDoc(ref);
} 