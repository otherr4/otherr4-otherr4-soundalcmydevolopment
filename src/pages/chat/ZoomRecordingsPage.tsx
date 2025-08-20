import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { addZoomRecording, listMyZoomRecordings, ZoomRecordingRecord, listMyZoomMeetings } from '../../services/zoomService';

const ZoomRecordingsPage: React.FC = () => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<ZoomRecordingRecord[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [myMeetingOptions, setMyMeetingOptions] = useState<{id: string; topic: string;}[]>([]);

  useEffect(() => {
    if (!user) return;
    listMyZoomRecordings(user.uid).then(setRecordings);
    listMyZoomMeetings(user.uid).then(ms => setMyMeetingOptions(ms.map(m => ({ id: m.id, topic: m.topic }))));
  }, [user]);

  const handleAdd = async () => {
    if (!user || !title || !url || !meetingId) return;
    await addZoomRecording({ ownerId: user.uid, meetingId, title, url });
    setTitle('');
    setUrl('');
    const latest = await listMyZoomRecordings(user.uid);
    setRecordings(latest);
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Zoom Recordings</h1>
      <div className="bg-dark-800 p-4 rounded-lg mb-6 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3"><div className="text-sm text-gray-400 mb-1">Meeting</div>
          <select className="form-input w-full" value={meetingId} onChange={(e) => setMeetingId(e.target.value)}>
            <option value="">Select a meeting</option>
            {myMeetingOptions.map(m => (<option key={m.id} value={m.id}>{m.topic}</option>))}
          </select>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">Title</div>
          <input className="form-input w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <div className="text-sm text-gray-400 mb-1">Recording URL</div>
          <input className="form-input w-full" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <button disabled={!meetingId || !title || !url} className="btn-primary" onClick={handleAdd}>Add Recording</button>
        </div>
      </div>

      <div className="space-y-3">
        {recordings.map(r => (
          <div key={r.id} className="bg-dark-800 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{r.title}</div>
              <div className="text-sm text-gray-400">{new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <a className="btn-secondary" href={r.url} target="_blank" rel="noreferrer">Open</a>
          </div>
        ))}
        {recordings.length === 0 && <div className="text-gray-400">No recordings added yet.</div>}
      </div>
    </div>
  );
};

export default ZoomRecordingsPage;


