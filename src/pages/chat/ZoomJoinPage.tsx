import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listMyZoomMeetings, ZoomMeetingRecord } from '../../services/zoomService';

const ZoomJoinPage: React.FC = () => {
  const { user } = useAuth();
  const [myMeetings, setMyMeetings] = useState<ZoomMeetingRecord[]>([]);
  const [link, setLink] = useState('');

  useEffect(() => {
    if (!user) return;
    listMyZoomMeetings(user.uid).then(setMyMeetings);
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Join Meeting</h1>
      <div className="bg-dark-800 rounded-lg p-4 mb-6">
        <label className="block text-sm text-gray-400 mb-1">Paste Zoom/meeting link</label>
        <div className="flex gap-2">
          <input className="form-input flex-1" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://zoom.us/j/..." />
          <a className={`btn-primary ${!link ? 'pointer-events-none opacity-50' : ''}`} href={link || undefined} target="_blank" rel="noreferrer">Join</a>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-2">Your scheduled meetings</h2>
      <div className="space-y-2">
        {myMeetings.map((m) => (
          <div key={m.id} className="bg-dark-800 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{m.topic}</div>
              <div className="text-sm text-gray-400">{new Date(m.startTime).toLocaleString()} • {m.durationMinutes} min</div>
            </div>
            <a className="btn-secondary" href={m.joinUrl} target="_blank" rel="noreferrer">Join</a>
          </div>
        ))}
        {myMeetings.length === 0 && <div className="text-gray-400">No meetings.</div>}
      </div>
    </div>
  );
};

export default ZoomJoinPage;


