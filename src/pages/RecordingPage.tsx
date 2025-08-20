import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../config/firebase';

interface RecordingSlot {
  id: string;
  userId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
}

const RecordingPage: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('Vocal Session');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState<RecordingSlot[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'recordingSlots'),
      where('userId', '==', user.uid),
      orderBy('startTime', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setSlots(
        snap.docs.map((d) => {
          const data: any = d.data();
          return {
            id: d.id,
            userId: data.userId,
            title: data.title,
            startTime: data.startTime?.toDate?.() || new Date(),
            endTime: data.endTime?.toDate?.() || new Date(),
            notes: data.notes || '',
          } as RecordingSlot;
        })
      );
    });
    return () => unsub();
  }, [user]);

  const schedule = async () => {
    if (!user || !date || !start || !end) return;
    const startDate = new Date(`${date}T${start}:00`);
    const endDate = new Date(`${date}T${end}:00`);
    await addDoc(collection(db, 'recordingSlots'), {
      userId: user.uid,
      title,
      startTime: startDate,
      endTime: endDate,
      notes,
      createdAt: serverTimestamp(),
    });
    setTitle('Vocal Session');
    setNotes('');
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Recording Scheduler</h1>
      <div className="bg-dark-800 rounded-lg p-4 mb-6 space-y-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title</label>
          <input className="form-input w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input type="date" className="form-input w-full" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Start</label>
            <input type="time" className="form-input w-full" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">End</label>
            <input type="time" className="form-input w-full" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <textarea className="form-input w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={schedule} disabled={!date || !start || !end}>Schedule</button>
      </div>

      <h2 className="text-xl font-semibold mb-2">My Sessions</h2>
      <div className="space-y-2">
        {slots.map((s) => (
          <div key={s.id} className="bg-dark-800 p-4 rounded-lg flex items-center justify-between">
            <div>
              <div className="font-medium">{s.title}</div>
              <div className="text-sm text-gray-400">{new Date(s.startTime).toLocaleString()} - {new Date(s.endTime).toLocaleTimeString()}</div>
              {s.notes && <div className="text-sm text-gray-400">{s.notes}</div>}
            </div>
          </div>
        ))}
        {slots.length === 0 && <div className="text-gray-400">No sessions scheduled.</div>}
      </div>
    </div>
  );
};

export default RecordingPage;


