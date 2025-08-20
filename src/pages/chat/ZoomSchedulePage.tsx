import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import {
  createZoomMeeting,
  subscribeMyZoomMeetings,
  ZoomMeetingRecord,
  cancelZoomMeeting,
} from '../../services/zoomService';

const ZoomSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const [topic, setTopic] = useState('SoundAlchemy Session');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [meetings, setMeetings] = useState<ZoomMeetingRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeMyZoomMeetings(user.uid, setMeetings);
    return () => unsub();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !date || !time) return;
    setLoading(true);
    try {
      const start = new Date(`${date}T${time}:00`);
      await createZoomMeeting({
        hostId: user.uid,
        topic,
        description,
        startTime: start,
        durationMinutes: duration,
        joinUrl: joinUrl || undefined,
      });
      setTopic('SoundAlchemy Session');
      setDescription('');
      setDuration(30);
      setJoinUrl('');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Schedule Zoom Meeting</h1>
      <div className="bg-dark-800 rounded-lg p-4 mb-6 space-y-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Topic</label>
          <input className="form-input w-full" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea className="form-input w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1 flex items-center gap-2"><Calendar size={16}/> Date</label>
            <input type="date" className="form-input w-full" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1 flex items-center gap-2"><Clock size={16}/> Time</label>
            <input type="time" className="form-input w-full" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Duration (minutes)</label>
            <input type="number" min={15} step={15} className="form-input w-full" value={duration} onChange={(e) => setDuration(parseInt(e.target.value || '30', 10))} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1 flex items-center gap-2"><LinkIcon size={16}/> Custom Zoom/Meeting Link (optional)</label>
          <input className="form-input w-full" placeholder="https://zoom.us/j/XXXX" value={joinUrl} onChange={(e) => setJoinUrl(e.target.value)} />
        </div>
        <div>
          <button disabled={loading || !date || !time} onClick={handleCreate} className="btn-primary inline-flex items-center gap-2"><Plus size={16}/>Create</button>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-2">Your Meetings</h2>
      <div className="space-y-3">
        {meetings.map((m) => (
          <div key={m.id} className="bg-dark-800 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{m.topic}</div>
              <div className="text-sm text-gray-400">{new Date(m.startTime).toLocaleString()} • {m.durationMinutes} min</div>
              <a href={m.joinUrl} target="_blank" rel="noreferrer" className="text-primary-400 text-sm break-all">{m.joinUrl}</a>
            </div>
            <div className="flex items-center gap-2">
              <a className="btn-secondary" href={m.joinUrl} target="_blank" rel="noreferrer">Join</a>
              <button className="p-2 rounded bg-red-600 hover:bg-red-700" onClick={() => cancelZoomMeeting(m.id)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {meetings.length === 0 && (
          <div className="text-gray-400">No meetings yet.</div>
        )}
      </div>
    </div>
  );
};

export default ZoomSchedulePage;


