import { 
  addDoc,
  collection,
  doc,
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

export interface ZoomMeetingRecord {
  id: string;
  hostId: string;
  topic: string;
  description?: string;
  startTime: Date;
  durationMinutes: number;
  joinUrl: string; // Zoom or any meeting link
  passcode?: string;
  createdAt: Date;
  updatedAt: Date;
  status?: 'scheduled' | 'started' | 'ended' | 'cancelled';
}

export interface ZoomRecordingRecord {
  id: string;
  meetingId: string;
  ownerId: string;
  title: string;
  url: string; // Recording link (Zoom cloud, Drive, etc.)
  createdAt: Date;
}

const COLLECTION_MEETINGS = 'zoomMeetings';
const COLLECTION_RECORDINGS = 'zoomRecordings';

export async function createZoomMeeting(params: {
  hostId: string;
  topic: string;
  description?: string;
  startTime: Date;
  durationMinutes: number;
  joinUrl?: string;
  passcode?: string;
}): Promise<ZoomMeetingRecord> {
  const joinUrl = params.joinUrl || `https://zoom.us/j/${Math.random().toString(36).substring(2, 10)}`;

  const ref = await addDoc(collection(db, COLLECTION_MEETINGS), {
    hostId: params.hostId,
    topic: params.topic,
    description: params.description || '',
    startTime: Timestamp.fromDate(params.startTime),
    durationMinutes: params.durationMinutes,
    joinUrl,
    passcode: params.passcode || null,
    status: 'scheduled',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: ref.id,
    hostId: params.hostId,
    topic: params.topic,
    description: params.description,
    startTime: params.startTime,
    durationMinutes: params.durationMinutes,
    joinUrl,
    passcode: params.passcode,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'scheduled',
  };
}

export async function listMyZoomMeetings(userId: string): Promise<ZoomMeetingRecord[]> {
  const q = query(
    collection(db, COLLECTION_MEETINGS),
    where('hostId', '==', userId),
    orderBy('startTime', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data: any = d.data();
    return {
      id: d.id,
      hostId: data.hostId,
      topic: data.topic,
      description: data.description || '',
      startTime: data.startTime?.toDate?.() || new Date(),
      durationMinutes: data.durationMinutes || 30,
      joinUrl: data.joinUrl,
      passcode: data.passcode || undefined,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
      status: data.status || 'scheduled',
    } as ZoomMeetingRecord;
  });
}

export function subscribeMyZoomMeetings(
  userId: string,
  callback: (meetings: ZoomMeetingRecord[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION_MEETINGS),
    where('hostId', '==', userId),
    orderBy('startTime', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const meetings: ZoomMeetingRecord[] = snapshot.docs.map((d) => {
      const data: any = d.data();
      return {
        id: d.id,
        hostId: data.hostId,
        topic: data.topic,
        description: data.description || '',
        startTime: data.startTime?.toDate?.() || new Date(),
        durationMinutes: data.durationMinutes || 30,
        joinUrl: data.joinUrl,
        passcode: data.passcode || undefined,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        status: data.status || 'scheduled',
      } as ZoomMeetingRecord;
    });
    callback(meetings);
  });
}

export async function addZoomRecording(params: {
  ownerId: string;
  meetingId: string;
  title: string;
  url: string;
}): Promise<ZoomRecordingRecord> {
  const ref = await addDoc(collection(db, COLLECTION_RECORDINGS), {
    ownerId: params.ownerId,
    meetingId: params.meetingId,
    title: params.title,
    url: params.url,
    createdAt: serverTimestamp(),
  });

  return {
    id: ref.id,
    ownerId: params.ownerId,
    meetingId: params.meetingId,
    title: params.title,
    url: params.url,
    createdAt: new Date(),
  };
}

export async function listMyZoomRecordings(userId: string): Promise<ZoomRecordingRecord[]> {
  const q = query(
    collection(db, COLLECTION_RECORDINGS),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data: any = d.data();
    return {
      id: d.id,
      ownerId: data.ownerId,
      meetingId: data.meetingId,
      title: data.title,
      url: data.url,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    } as ZoomRecordingRecord;
  });
}

export async function cancelZoomMeeting(meetingId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION_MEETINGS, meetingId), {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
}


