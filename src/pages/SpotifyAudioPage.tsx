import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addSpotifyTrack, getSpotifyStats, SpotifyTrack, subscribeUserSpotifyTracks, toggleLike, toEmbedUrl, incrementTrackView, addTrackComment, subscribeTrackComments, SpotifyComment } from '../services/spotifyService';

const SpotifyAudioPage: React.FC = () => {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [stats, setStats] = useState<{ totalTracks: number; totalLikes: number; totalViews: number } | null>(null);
  const [activeComments, setActiveComments] = useState<Record<string, SpotifyComment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    console.log('[SpotifyAudioPage] Subscribing to user tracks for', user.uid);
    const unsub = subscribeUserSpotifyTracks(user.uid, async (t) => {
      console.log('[SpotifyAudioPage] Tracks received from Firestore:', t);
      setTracks(t);
      try {
        const s = await getSpotifyStats(user.uid);
        setStats(s);
      } catch (e) {
        setError('Failed to load stats.');
        console.error('[SpotifyAudioPage] Error loading stats:', e);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const save = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    if (!user || !/open\.spotify\.com\/(album|playlist|track)\//.test(url)) {
      setSaveError('Please enter a valid Spotify link.');
      return;
    }
    console.log('[SpotifyAudioPage] Saving track:', { ownerId: user.uid, url, title, description });
    try {
      await addSpotifyTrack({ ownerId: user.uid, url, title, description });
      setUrl('');
      setTitle('');
      setDescription('');
      setSaveSuccess('Track saved successfully!');
    } catch (e) {
      setSaveError('Failed to save track. Please check your connection and Firestore rules.');
      console.error('[SpotifyAudioPage] Error saving track:', e);
    }
  };

  const loadComments = (trackId: string) => {
    if (activeComments[trackId]) return; // already subscribed
    const unsub = subscribeTrackComments(trackId, (comments) => {
      setActiveComments((prev) => ({ ...prev, [trackId]: comments }));
    });
    // Note: caller keeps page alive; no need to store unsub per simplicity
  };

  if (!user) return <div className="text-center text-gray-400 mt-10">Please log in to manage your Spotify tracks.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Spotify Albums & Tracks</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-dark-800 p-4 rounded-lg space-y-3">
          <div className="text-sm text-gray-400">Paste Spotify link</div>
          <input className="form-input w-full" placeholder="https://open.spotify.com/album/..." value={url} onChange={(e) => setUrl(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="form-input w-full" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="form-input w-full" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={save} disabled={!/open\.spotify\.com\/(album|playlist|track)\//.test(url)}>Save Track</button>
          {saveError && <div className="text-red-400 mt-2">{saveError}</div>}
          {saveSuccess && <div className="text-green-400 mt-2">{saveSuccess}</div>}
        </div>

        <div className="bg-dark-800 p-4 rounded-lg">
          <div className="text-lg font-semibold mb-2">Dashboard</div>
          <div className="text-gray-300">Tracks: <span className="font-bold">{stats?.totalTracks || 0}</span></div>
          <div className="text-gray-300">Total Likes: <span className="font-bold">{stats?.totalLikes || 0}</span></div>
          <div className="text-gray-300">Total Views: <span className="font-bold">{stats?.totalViews || 0}</span></div>
        </div>
      </div>

      <div className="space-y-4">
        {loading && <div className="text-gray-400">Loading tracks...</div>}
        {error && <div className="text-red-400">{error}</div>}
        {!loading && !error && tracks.length === 0 && <div className="text-gray-400">No tracks saved yet.</div>}
        {tracks.map((t) => (
          <div key={t.id} className="bg-dark-800 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center">
            {t.thumbnailUrl && (
              <img src={t.thumbnailUrl} alt={t.title || 'cover'} className="w-20 h-20 rounded object-cover shadow-lg" />
            )}
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                <div>
                  <div className="font-semibold text-lg">{t.title || 'Spotify Item'}</div>
                  {t.authorName && <div className="text-gray-400 text-sm">{t.authorName}</div>}
                  {t.description && <div className="text-gray-500 text-xs mt-1">{t.description}</div>}
                </div>
                <div className="text-sm text-gray-400 mt-2 md:mt-0">{t.views || 0} views · {(t.likes?.length || 0)} likes</div>
              </div>
              <div className="w-full">
                <iframe
                  style={{ borderRadius: 12, width: '100%', height: t.kind === 'track' ? 80 : 352, minHeight: 80 }}
                  src={t.embedUrl}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  onLoad={() => incrementTrackView(t.id)}
                  title={t.title || 'Spotify Player'}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button className="btn-secondary" onClick={() => toggleLike(t.id, user.uid)}>
                  {t.likes?.includes(user.uid) ? '💖 Unlike' : '🤍 Like'}
                </button>
                <a className="btn-secondary" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(t.url)}`} target="_blank" rel="noreferrer">Share</a>
              </div>
              <div className="mt-4">
                <button className="text-primary-400 text-sm" onClick={() => loadComments(t.id)}>Comments</button>
                {activeComments[t.id] && (
                  <div className="mt-2 space-y-2">
                    {activeComments[t.id].map((c) => (
                      <div key={c.id} className="bg-dark-900 rounded p-2">
                        <div className="text-sm text-gray-400">{c.userName || c.userId} • {new Date(c.createdAt).toLocaleString()}</div>
                        <div>{c.content}</div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input className="form-input flex-1" placeholder="Add a comment" value={newComment[t.id] || ''} onChange={(e) => setNewComment((p) => ({ ...p, [t.id]: e.target.value }))} />
                      <button className="btn-primary" onClick={async () => {
                        const content = (newComment[t.id] || '').trim();
                        if (!content) return;
                        try {
                          await addTrackComment({ postId: t.id, userId: user.uid, userName: user.email?.split('@')[0], content });
                          setNewComment((p) => ({ ...p, [t.id]: '' }));
                        } catch (e) {
                          alert('Failed to post comment.');
                        }
                      }}>Post</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpotifyAudioPage;


