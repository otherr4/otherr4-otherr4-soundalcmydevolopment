import { 
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface SpotifyTrack {
  id: string;
  ownerId: string;
  url: string;
  embedUrl: string;
  kind: 'track' | 'album' | 'playlist';
  title?: string;
  description?: string;
  createdAt: Date;
  likes?: string[]; // userIds
  views?: number;
  thumbnailUrl?: string;
  authorName?: string;
}

export interface SpotifyComment {
  id: string;
  postId: string;
  userId: string;
  userName?: string;
  content: string;
  createdAt: Date;
}

const COLLECTION = 'spotifyTracks';
const COMMENTS = 'spotifyTrackComments';

export function toEmbedUrl(url: string): { embedUrl: string; kind: SpotifyTrack['kind'] } {
  const pattern = /open\.spotify\.com\/(album|playlist|track)\//;
  const match = url.match(pattern);
  const kind = (match?.[1] || 'track') as SpotifyTrack['kind'];
  const embedUrl = url.replace('open.spotify.com', 'open.spotify.com/embed');
  return { embedUrl, kind };
}

export async function addSpotifyTrack(params: {
  ownerId: string;
  url: string;
  title?: string;
  description?: string;
}): Promise<SpotifyTrack> {
  const { embedUrl, kind } = toEmbedUrl(params.url);
  let metaTitle: string | undefined;
  let thumbnailUrl: string | undefined;
  let authorName: string | undefined;
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(params.url)}`);
    if (res.ok) {
      const meta = await res.json();
      metaTitle = meta?.title;
      thumbnailUrl = meta?.thumbnail_url;
      authorName = meta?.author_name;
    }
  } catch (_) {}
  const ref = await addDoc(collection(db, COLLECTION), {
    ownerId: params.ownerId,
    url: params.url,
    embedUrl,
    kind,
    title: params.title || metaTitle || '',
    description: params.description || '',
    createdAt: serverTimestamp(),
    likes: [],
    views: 0,
    thumbnailUrl: thumbnailUrl || null,
    authorName: authorName || null,
  });
  return {
    id: ref.id,
    ownerId: params.ownerId,
    url: params.url,
    embedUrl,
    kind,
    title: params.title || metaTitle,
    description: params.description,
    createdAt: new Date(),
    likes: [],
    views: 0,
    thumbnailUrl: thumbnailUrl,
    authorName,
  };
}

export function subscribeUserSpotifyTracks(
  userId: string,
  callback: (tracks: SpotifyTrack[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const tracks: SpotifyTrack[] = snapshot.docs.map((d) => {
      const data: any = d.data();
      return {
        id: d.id,
        ownerId: data.ownerId,
        url: data.url,
        embedUrl: data.embedUrl,
        kind: data.kind,
        title: data.title,
        description: data.description,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        likes: data.likes || [],
        views: data.views || 0,
        thumbnailUrl: data.thumbnailUrl || undefined,
        authorName: data.authorName || undefined,
      };
    });
    callback(tracks);
  });
}

export async function listUserSpotifyTracks(userId: string): Promise<SpotifyTrack[]> {
  return new Promise((resolve) => {
    const unsub = subscribeUserSpotifyTracks(userId, (tracks) => {
      resolve(tracks);
      unsub();
    });
  });
}

export async function incrementTrackView(trackId: string): Promise<void> {
  const ref = doc(db, COLLECTION, trackId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const curr = snap.data()?.views || 0;
    await updateDoc(ref, { views: curr + 1 });
  }
}

export async function toggleLike(trackId: string, userId: string): Promise<void> {
  const ref = doc(db, COLLECTION, trackId);
  const snap = await getDoc(ref);
  const likes: string[] = (snap.data()?.likes || []) as string[];
  const op = likes.includes(userId) ? arrayRemove(userId) : arrayUnion(userId);
  await updateDoc(ref, { likes: op } as any);
}

export async function addTrackComment(params: {
  postId: string;
  userId: string;
  userName?: string;
  content: string;
}): Promise<void> {
  await addDoc(collection(db, COMMENTS), {
    postId: params.postId,
    userId: params.userId,
    userName: params.userName || 'Musician',
    content: params.content,
    createdAt: serverTimestamp(),
  });
}

export function subscribeTrackComments(
  postId: string,
  callback: (comments: SpotifyComment[]) => void
): () => void {
  const q = query(
    collection(db, COMMENTS),
    where('postId', '==', postId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const comments: SpotifyComment[] = snap.docs.map((d) => {
      const data: any = d.data();
      return {
        id: d.id,
        postId: data.postId,
        userId: data.userId,
        userName: data.userName,
        content: data.content,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      };
    });
    callback(comments);
  });
}

export async function getSpotifyStats(userId: string): Promise<{
  totalTracks: number;
  totalLikes: number;
  totalViews: number;
}> {
  const tracks = await listUserSpotifyTracks(userId);
  return {
    totalTracks: tracks.length,
    totalLikes: tracks.reduce((s, t) => s + (t.likes?.length || 0), 0),
    totalViews: tracks.reduce((s, t) => s + (t.views || 0), 0),
  };
}


