import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeUserSpotifyTracks, SpotifyTrack, toggleLike, incrementTrackView } from '../../services/spotifyService';

const SpotifyTab: React.FC<{ ownerId: string }> = ({ ownerId }) => {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);

  useEffect(() => {
    const unsub = subscribeUserSpotifyTracks(ownerId, setTracks);
    return () => unsub();
  }, [ownerId]);

  return (
    <div className="space-y-4 w-full">
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
              {user && (
                <button className="btn-secondary" onClick={() => toggleLike(t.id, user.uid)}>
                  {t.likes?.includes(user.uid) ? '💖 Unlike' : '🤍 Like'}
                </button>
              )}
              <a className="btn-secondary" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(t.url)}`} target="_blank" rel="noreferrer">Share</a>
            </div>
          </div>
        </div>
      ))}
      {tracks.length === 0 && <div className="text-gray-400">No Spotify items yet.</div>}
    </div>
  );
};

export default SpotifyTab;


