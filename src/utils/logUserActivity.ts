import { getDatabase, ref, set, serverTimestamp } from 'firebase/database';

export async function logUserActivity(uid: string, type: string, extra: any = {}) {
  const db = getDatabase();
  const logRef = ref(db, `loginHistory/${uid}/${Date.now()}`);
  await set(logRef, {
    type,
    timestamp: serverTimestamp(),
    deviceInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    },
    ...extra, // e.g., location, ip, etc.
  });
} 