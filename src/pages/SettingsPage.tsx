import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Shield, Activity, MapPin, User, Trash2, PauseCircle, LogOut, Key, Mail, Smartphone, Info, AlertTriangle, Settings as SettingsIcon, Eye, Users, CheckCircle, XCircle, ArrowLeft, Bell, Globe, CreditCard, HelpCircle, ShieldCheck, Database, Link2, Sliders, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { updateEmail, updatePassword } from 'firebase/auth';
import { getDatabase, ref as rtdbRef, onValue, remove } from 'firebase/database';
import * as UAParser from 'ua-parser-js';
import { logUserActivity } from '../utils/logUserActivity';
import SEO from '../components/common/SEO';
import { deleteUserFullData } from '../utils/userManagementService';
import { getAuth, GoogleAuthProvider, reauthenticateWithPopup, deleteUser as firebaseDeleteUser } from 'firebase/auth';
import LoadingSpinner from '../components/common/LoadingSpinner';

const settingsSchema = `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Settings | SoundAlchemy",
  "description": "Manage your SoundAlchemy account settings, privacy, and notifications. Connect with global musicians, orchestras, and more. Powered by Lehan Kawshila.",
  "url": "https://soundalcmy.com/settings"
}`;

const sections = [
  { key: 'overview', label: 'Overview', icon: <SettingsIcon /> },
  { key: 'privacy', label: 'Privacy & Security', icon: <Shield /> },
  { key: 'account', label: 'Account Management', icon: <User /> },
  { key: 'activity', label: 'Activity & Devices', icon: <Activity /> },
  { key: 'notifications', label: 'Notifications & Alerts', icon: <Bell /> },
  { key: 'language', label: 'Language & Region', icon: <Globe /> },
  { key: 'subscription', label: 'Subscription & Billing', icon: <CreditCard /> },
  { key: 'security', label: 'Security Center', icon: <ShieldCheck /> },
  { key: 'dataprivacy', label: 'Data & Privacy', icon: <Database /> },
  { key: 'policy', label: 'App Policy', icon: <Info /> }, // NEW SECTION
  { key: 'integrations', label: 'Integrations', icon: <Link2 /> },
  { key: 'personalization', label: 'Personalization', icon: <Sliders /> },
  { key: 'support', label: 'Support & Help', icon: <HelpCircle /> },
  { key: 'advanced', label: 'Advanced', icon: <AlertTriangle /> },
];

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [profilePublic, setProfilePublic] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Notification preferences state (default values will be overridden by Firestore data)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundVibration, setSoundVibration] = useState(false);
  const [messagePreviews, setMessagePreviews] = useState(true);

  // Helper to update a single notification preference in Firestore
  const updateNotificationPref = async (key: string, value: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [`notifications.${key}`]: value,
      });
      toast.success('Notification preference updated.');
    } catch (e) {
      toast.error('Failed to update preference.');
    }
  };

  const realtimeDb = getDatabase();
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [devicesLoading, setDevicesLoading] = useState(true);

  const getDeviceDetails = (deviceInfo: any) => {
    const parser = new (UAParser as any).UAParser(deviceInfo?.userAgent || '');
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    return {
      browser: browser.name || 'Unknown',
      browserVersion: browser.version || '',
      os: os.name || 'Unknown',
      osVersion: os.version || '',
      deviceType: device.type || 'desktop',
      deviceModel: device.model || '',
      deviceVendor: device.vendor || '',
      userAgent: deviceInfo?.userAgent || '',
      platform: deviceInfo?.platform || '',
      language: deviceInfo?.language || '',
      screen: deviceInfo?.screenResolution || '',
    };
  };
  const [logoutDeviceId, setLogoutDeviceId] = useState<string | null>(null);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const currentUserAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
  const currentPlatform = typeof window !== 'undefined' ? window.navigator.platform : '';

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'login': return 'Logged in';
      case 'logout': return 'Logged out';
      case 'registration': return 'Account Created';
      case 'password_change': return 'Password Changed';
      case 'email_change': return 'Email Changed';
      case 'device_removed': return 'Device Removed';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { deactivated: true });
      toast.success('Account deactivated. You can reactivate by clicking Reactivate.');
      setDeactivated(true);
    } catch (e) {
      toast.error('Failed to deactivate account.');
    }
  };

  const handleReactivateAccount = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { deactivated: false });
      toast.success('Account reactivated.');
      setDeactivated(false);
    } catch (e) {
      toast.error('Failed to reactivate account.');
    }
  };

  const [deactivated, setDeactivated] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
    // Optionally: save to user profile if logged in
    if (user) {
      updateDoc(doc(db, 'users', user.uid), { theme }).catch(() => {});
    }
  }, [theme, user]);

  // Load privacy settings from Firestore
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(docSnap => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setProfilePublic(d.profilePublic !== false);
        setOnlineStatus(d.onlineStatus !== false);
        setDeactivated(!!d.deactivated);
        // Notification preferences (fallback to sensible defaults)
        setEmailNotifications(d.notifications?.email !== false);
        setPushNotifications(d.notifications?.push !== false);
        setSoundVibration(!!d.notifications?.sound);
        setMessagePreviews(d.notifications?.preview !== false);
      }
    });
  }, [user]);

  // Fetch real activity log and devices from Realtime Database
  useEffect(() => {
    if (!user) return;
    setActivityLoading(true);
    setDevicesLoading(true);
    const logRef = rtdbRef(realtimeDb, `loginHistory/${user.uid}`);
    onValue(logRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let logs = Object.entries(data).map(([id, entry]: any) => ({ id, ...entry }));
        // Sort by timestamp descending
        logs.sort((a, b) => (b.timestamp?._seconds || 0) - (a.timestamp?._seconds || 0));
        // Deduplicate by device userAgent + platform (for devices), and by id for activity
        const seenDevices = new Set();
        const uniqueDevices = logs.filter(l => {
          const key = (l.deviceInfo?.userAgent || '') + (l.deviceInfo?.platform || '');
          if (seenDevices.has(key)) return false;
          seenDevices.add(key);
          return true;
        });
        setActivityLog(logs);
        setDevices(uniqueDevices.map(l => {
          const details = getDeviceDetails(l.deviceInfo);
          const isCurrent = l.deviceInfo?.userAgent === currentUserAgent && l.deviceInfo?.platform === currentPlatform;
          return {
            id: l.id,
            name: details.deviceModel || details.deviceType || details.platform || 'Unknown',
            browser: details.browser,
            os: details.os,
            location: l.location?.country || l.location?.city || '',
            lastActive: l.timestamp?._seconds ? new Date(l.timestamp._seconds * 1000).toLocaleString() : '',
            userAgent: details.userAgent,
            isCurrent,
            details,
            type: l.type || 'login',
          };
        }));
      } else {
        setActivityLog([]);
        setDevices([]);
      }
      setActivityLoading(false);
      setDevicesLoading(false);
    });
  }, [user]);

  // Placeholder for account protection tips
  const protectionTips = [
    'Use a strong, unique password for your account.',
    'Enable two-factor authentication (2FA) for extra security.',
    'Review your account activity regularly.',
    'Never share your password with anyone.',
    'Be cautious of phishing emails and suspicious links.',
  ];

  // Placeholder for connected accounts
  const connectedAccounts = [
    { provider: 'Google', email: user?.email, icon: <Mail /> },
    // Add more providers as needed
  ];

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      setDeleting(true);
      // 1. Re-authenticate if needed (Google)
      const auth = getAuth();
      if (user.providerData.some((p) => p.providerId === 'google.com')) {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      }
      // 2. Delete all user data (Firestore, RTDB, etc.)
      await deleteUserFullData(user.uid);
      // 3. Delete from Firebase Auth
      await firebaseDeleteUser(user);
      // 4. Log out and redirect
      toast.success('Account deleted successfully.');
      logout();
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/login'); // Ultra-fast, hard redirect to login page
    } catch (e: any) {
      setDeleting(false);
      toast.error(e.message || 'Failed to delete account.');
    }
  };

  const handleDownloadData = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'soundalchemy_user_data.json';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Data downloaded.');
      } else {
        toast.error('No user data found.');
      }
    } catch (e) {
      toast.error('Failed to download data.');
    }
    setDownloading(false);
  };

  const handleExportActivity = async () => {
    if (!user) return;
    setExporting(true);
    try {
      // For demo, use activityLog. Replace with real activity from backend if available.
      const csv = [
        ['Action', 'Location', 'Device', 'Time'],
        ...activityLog.map(l => [l.action, l.location, l.device, l.time])
      ].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'soundalchemy_activity_log.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Activity exported.');
    } catch (e) {
      toast.error('Failed to export activity.');
    }
    setExporting(false);
  };

  const handleProfilePublicToggle = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { profilePublic: !profilePublic });
      setProfilePublic(!profilePublic);
      toast.success(`Profile visibility set to ${!profilePublic ? 'Public' : 'Private'}`);
    } catch (e) {
      toast.error('Failed to update profile visibility.');
    }
  };

  const handleOnlineStatusToggle = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { onlineStatus: !onlineStatus });
      setOnlineStatus(!onlineStatus);
      toast.success(`Online status ${!onlineStatus ? 'enabled' : 'hidden'}`);
    } catch (e) {
      toast.error('Failed to update online status.');
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setEmailLoading(true);
    setEmailSuccess('');
    setEmailError('');
    try {
      await updateEmail(user, email);
      await updateDoc(doc(db, 'users', user.uid), { email });
      await logUserActivity(user.uid, 'email_change');
      setEmailSuccess('Email updated successfully.');
      toast.success('Email updated.');
    } catch (e: any) {
      setEmailError(e.message || 'Failed to update email.');
      toast.error('Failed to update email.');
    }
    setEmailLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPasswordLoading(true);
    setPasswordSuccess('');
    setPasswordError('');
    try {
      await updatePassword(user, password);
      await logUserActivity(user.uid, 'password_change');
      setPasswordSuccess('Password updated successfully.');
      toast.success('Password updated.');
    } catch (e: any) {
      setPasswordError(e.message || 'Failed to update password.');
      toast.error('Failed to update password.');
    }
    setPasswordLoading(false);
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!user) return;
    try {
      await remove(rtdbRef(realtimeDb, `loginHistory/${user.uid}/${deviceId}`));
      toast.success('Device removed.');
    } catch (e) {
      toast.error('Failed to remove device.');
    }
  };

  const handleLogoutDevice = async () => {
    if (!user || !logoutDeviceId) return;
    try {
      await remove(rtdbRef(realtimeDb, `loginHistory/${user.uid}/${logoutDeviceId}`));
      toast.success('Device logged out.');
      setLogoutDeviceId(null);
      setConfirmLogoutOpen(false);
    } catch (e) {
      toast.error('Failed to log out device.');
    }
  };

  // Section renderers
  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><SettingsIcon className="text-primary-400" /> Settings Overview</h2>
            <p className="text-xs sm:text-sm text-gray-300">Manage your SoundAlchemy account settings, privacy, security, and more. Use the menu to navigate through different settings sections.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-full">
              <div className="p-3 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md flex flex-col gap-2 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-base"><Shield /> Privacy & Security</h3>
                <p className="text-xs text-gray-400">Control your privacy, enable 2FA, and review your activity log.</p>
              </div>
              <div className="p-3 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md flex flex-col gap-2 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-base"><User /> Account Management</h3>
                <p className="text-xs text-gray-400">Change your email, password, and manage connected accounts.</p>
              </div>
              <div className="p-3 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md flex flex-col gap-2 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-base"><Activity /> Activity & Devices</h3>
                <p className="text-xs text-gray-400">See your recent activity and manage your devices.</p>
              </div>
              <div className="p-3 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md flex flex-col gap-2 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-base"><AlertTriangle /> Advanced</h3>
                <p className="text-xs text-gray-400">Delete or deactivate your account, and access advanced controls.</p>
              </div>
            </div>
          </motion.div>
        );
      case 'privacy':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Shield className="text-primary-400" /> Privacy & Security</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2"><Lock /> Privacy Controls</h3>
                <div className="flex flex-col gap-4 mt-2 w-full max-w-full">
                  <div className="flex items-center gap-3 w-full max-w-full">
                    <span>Profile Visibility:</span>
                    <button onClick={handleProfilePublicToggle} className={`px-3 py-1 rounded-full font-bold ${profilePublic ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'}`}>{profilePublic ? 'Public' : 'Private'}</button>
                  </div>
                  <div className="flex items-center gap-3 w-full max-w-full">
                    <span>Show Online Status:</span>
                    <button onClick={handleOnlineStatusToggle} className={`px-3 py-1 rounded-full font-bold ${onlineStatus ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'}`}>{onlineStatus ? 'Enabled' : 'Hidden'}</button>
                  </div>
                  <div className="flex items-center gap-3 w-full max-w-full">
                    <span>Blocked Users:</span>
                    <span className="text-gray-400">(Not supported yet)</span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2"><Key /> Two-Factor Authentication (2FA)</h3>
                <p className="text-xs text-gray-300 mb-2">2FA is not supported yet. Contact support for advanced security options.</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 mt-6 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2"><Activity /> Activity Log</h3>
              <div className="overflow-x-auto w-full max-w-full">
                <div className="max-h-64 md:max-h-96 overflow-y-auto custom-scrollbar w-full max-w-full">
                  <table className="min-w-full text-left text-gray-300 text-xs sm:text-sm break-words w-full max-w-full">
                    <thead className="sticky top-0 bg-dark-800 z-10">
                      <tr>
                        <th className="py-2 px-4">Action</th>
                        <th className="py-2 px-4">Location</th>
                        <th className="py-2 px-4">Device</th>
                        <th className="py-2 px-4">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLog.length === 0 ? (
                        <tr><td colSpan={4} className="text-center text-gray-500 py-4 text-xs sm:text-sm">No activity found.</td></tr>
                      ) : activityLog.map(log => {
                        const details = getDeviceDetails(log.deviceInfo || {});
                        const location = log.location?.country || log.location?.city
                          ? `${log.location?.city ? log.location.city + ', ' : ''}${log.location?.country || ''}`
                          : '';
                        return (
                          <tr key={log.id} className="border-b border-dark-600">
                            <td className="py-2 px-4">{getActionLabel(log.type || 'Unknown')}</td>
                            <td className="py-2 px-4 flex items-center gap-2 text-xs sm:text-sm">
                              {location ? (
                                <>
                                  <MapPin className="w-4 h-4 text-primary-400" />
                                  {location}
                                </>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="py-2 px-4">{details.deviceModel || details.deviceType || details.platform || 'Unknown'}</td>
                            <td className="py-2 px-4">{log.timestamp?._seconds ? new Date(log.timestamp._seconds * 1000).toLocaleString() : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 mt-6 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2"><Shield /> Protect Your Account</h3>
              <ul className="list-disc ml-6 text-gray-300 space-y-2 mt-2 w-full max-w-full">
                {protectionTips.map((tip, idx) => (
                  <li key={idx} className="text-xs sm:text-sm">{tip}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        );
      case 'account':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><User className="text-primary-400" /> Account Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2"><Mail /> Change Email</h3>
                <form onSubmit={handleEmailChange} className="flex flex-col gap-3 mt-2 w-full max-w-full">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-xs w-full max-w-full" required />
                  <button type="submit" className="btn-primary px-3 py-2 rounded-lg text-xs w-full max-w-full mt-2" disabled={emailLoading}>{emailLoading ? 'Updating...' : 'Update Email'}</button>
                  {emailSuccess && <span className="text-green-400 text-xs">{emailSuccess}</span>}
                  {emailError && <span className="text-red-400 text-xs">{emailError}</span>}
                </form>
              </div>
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2"><Key /> Change Password</h3>
                <form onSubmit={handlePasswordChange} className="flex flex-col gap-3 mt-2 w-full max-w-full">
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white" required minLength={6} placeholder="New password" />
                  <button type="submit" className="btn-primary px-3 py-2 rounded-lg" disabled={passwordLoading}>{passwordLoading ? 'Updating...' : 'Update Password'}</button>
                  {passwordSuccess && <span className="text-green-400 text-xs">{passwordSuccess}</span>}
                  {passwordError && <span className="text-red-400 text-xs">{passwordError}</span>}
                </form>
              </div>
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2"><Users /> Connected Accounts</h3>
                <ul className="space-y-2 mt-2 w-full max-w-full">
                  {connectedAccounts.map((acc, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm">
                      {acc.icon}
                      <span>{acc.provider}</span>
                      <span className="truncate break-all text-xs sm:text-sm max-w-full block">{acc.email}</span>
                      <span className="ml-auto text-xs text-gray-400">(Disconnect not supported)</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        );
      case 'activity':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Activity className="text-primary-400" /> Activity & Devices</h2>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2"><Eye /> Recent Activity</h3>
              {activityLoading ? (
                <div className="text-gray-400 text-xs sm:text-sm">Loading activity...</div>
              ) : activityLog.length === 0 ? (
                <div className="text-gray-400 text-xs sm:text-sm">No activity found.</div>
              ) : (
                <div className="overflow-x-auto w-full max-w-full">
                  <div className="max-h-64 md:max-h-96 overflow-y-auto custom-scrollbar mt-2 w-full max-w-full">
                    <table className="min-w-full text-left text-gray-300 text-xs sm:text-sm break-words w-full max-w-full">
                      <thead className="sticky top-0 bg-dark-800 z-10">
                        <tr>
                          <th className="py-2 px-4">Action</th>
                          <th className="py-2 px-4">Location</th>
                          <th className="py-2 px-4">Device</th>
                          <th className="py-2 px-4">Browser/OS</th>
                          <th className="py-2 px-4">IP</th>
                          <th className="py-2 px-4">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLog.map(log => {
                          const details = getDeviceDetails(log.deviceInfo || {});
                          const location = log.location?.country || log.location?.city
                            ? `${log.location?.city ? log.location.city + ', ' : ''}${log.location?.country || ''}`
                            : '';
                          return (
                            <tr key={log.id} className="border-b border-dark-600">
                              <td className="py-2 px-4">{getActionLabel(log.type || 'Unknown')}</td>
                              <td className="py-2 px-4 flex items-center gap-2 text-xs sm:text-sm">
                                {location ? (
                                  <>
                                    <MapPin className="w-4 h-4 text-primary-400" />
                                    {location}
                                  </>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              <td className="py-2 px-4">{details.deviceModel || details.deviceType || details.platform || 'Unknown'}</td>
                              <td className="py-2 px-4">{details.browser} / {details.os}</td>
                              <td className="py-2 px-4">{log.ip || '-'}</td>
                              <td className="py-2 px-4">{log.timestamp?._seconds ? new Date(log.timestamp._seconds * 1000).toLocaleString() : ''}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2"><Smartphone /> Device Management</h3>
              {devicesLoading ? (
                <div className="text-gray-400 text-xs sm:text-sm">Loading devices...</div>
              ) : devices.length === 0 ? (
                <div className="text-gray-400 text-xs sm:text-sm">No devices found.</div>
              ) : (
                <div className="overflow-x-auto w-full max-w-full">
                  <ul className="divide-y divide-dark-600 max-h-64 md:max-h-96 overflow-y-auto custom-scrollbar w-full max-w-full">
                    {devices.map(device => (
                      <li key={device.id} className="flex flex-col md:flex-row md:items-center gap-2 py-3 text-xs sm:text-sm">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-primary-400" />
                            <span className="font-semibold text-gray-200">{device.name}</span>
                            <span className="text-xs text-gray-400 ml-2">{device.browser} / {device.os}</span>
                            {device.isCurrent && <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">This device</span>}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {device.location ? (
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary-400" />{device.location}</span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )} • Last active: {device.lastActive}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 break-all">{device.userAgent}</div>
                          <div className="text-xs text-gray-500 mt-1">Session type: {device.type}</div>
                        </div>
                        {!device.isCurrent && (
                          <button className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold hover:bg-red-600 hover:text-white transition" onClick={() => { setLogoutDeviceId(device.id); setConfirmLogoutOpen(true); }}>Log out</button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {confirmLogoutOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-1 sm:px-2">
                <div className="bg-dark-800 p-3 sm:p-4 rounded-xl shadow-xl border border-red-600 max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2"><LogOut /> Log out device</h3>
                  <p className="text-gray-300 mb-6">Are you sure you want to log out this device? This will end the session on that device.</p>
                  <div className="flex gap-4 justify-end">
                    <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600" onClick={() => setConfirmLogoutOpen(false)}>Cancel</button>
                    <button className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700" onClick={handleLogoutDevice}>Log out</button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        );
      case 'notifications':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Bell className="text-primary-400" /> Notifications & Alerts</h2>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-2"><Bell /> Notification Preferences</h3>
              <ul className="space-y-3">
                <li className="flex items-center justify-between">
                  <span>Email Notifications</span>
                  <button
                    onClick={() => {
                      const newVal = !emailNotifications;
                      setEmailNotifications(newVal);
                      updateNotificationPref('email', newVal);
                    }}
                    className={`px-3 py-1 rounded-full font-bold transition-colors ${emailNotifications ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'}`}
                  >{emailNotifications ? 'On' : 'Off'}</button>
                </li>
                <li className="flex items-center justify-between">
                  <span>Push Notifications</span>
                  <button
                    onClick={() => {
                      const newVal = !pushNotifications;
                      setPushNotifications(newVal);
                      updateNotificationPref('push', newVal);
                    }}
                    className={`px-3 py-1 rounded-full font-bold transition-colors ${pushNotifications ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'}`}
                  >{pushNotifications ? 'On' : 'Off'}</button>
                </li>
                <li className="flex items-center justify-between">
                  <span>Sound & Vibration</span>
                  <button
                    onClick={() => {
                      const newVal = !soundVibration;
                      setSoundVibration(newVal);
                      updateNotificationPref('sound', newVal);
                    }}
                    className={`px-3 py-1 rounded-full font-bold transition-colors ${soundVibration ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'}`}
                  >{soundVibration ? 'On' : 'Off'}</button>
                </li>
                <li className="flex items-center justify-between">
                  <span>Message Previews</span>
                  <button
                    onClick={() => {
                      const newVal = !messagePreviews;
                      setMessagePreviews(newVal);
                      updateNotificationPref('preview', newVal);
                    }}
                    className={`px-3 py-1 rounded-full font-bold transition-colors ${messagePreviews ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'}`}
                  >{messagePreviews ? 'On' : 'Off'}</button>
                </li>
              </ul>
            </div>
          </motion.div>
        );
      case 'language':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Globe className="text-primary-400" /> Language & Region</h2>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-2"><Globe /> Language & Regional Settings</h3>
              <ul className="space-y-3">
                <li className="flex items-center justify-between">
                  <span>App Language</span>
                  <button className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 font-bold">English</button>
                </li>
                <li className="flex items-center justify-between">
                  <span>Date/Time Format</span>
                  <button className="px-3 py-1 rounded-full bg-gray-600 text-gray-200 font-bold">24-hour</button>
                </li>
                <li className="flex items-center justify-between">
                  <span>Currency</span>
                  <button className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 font-bold">USD</button>
                </li>
              </ul>
            </div>
          </motion.div>
        );
      case 'subscription':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><CreditCard className="text-primary-400" /> Subscription & Billing</h2>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full flex flex-col gap-4 items-center justify-center min-h-[180px]">
              <span className="inline-block px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-xs mb-2">Coming Soon</span>
              <p className="text-xs text-gray-400 text-center">Subscription management features are coming soon. You will be able to view and manage your plan, payment methods, and invoices here.</p>
            </div>
          </motion.div>
        );
      case 'security':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><ShieldCheck className="text-primary-400" /> Security Center</h2>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md flex flex-col gap-3 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-base"><Key /> Two-Factor Authentication (2FA)</h3>
              <p className="text-gray-400 text-xs">Add an extra layer of security to your account. (Coming soon)</p>
              <button className="btn-primary px-3 py-2 rounded-lg text-xs w-full max-w-xs mt-2 opacity-60 cursor-not-allowed">Enable 2FA</button>
            </div>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md flex flex-col gap-3 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-base"><Bell /> Login Alerts</h3>
              <p className="text-gray-400 text-xs">Get notified when your account is accessed from a new device.</p>
              <button className="btn-primary px-3 py-2 rounded-lg text-xs w-full max-w-xs mt-2">Manage Alerts</button>
            </div>
          </motion.div>
        );
      case 'dataprivacy':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Database className="text-primary-400" /> Data & Privacy</h2>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md flex flex-col gap-3 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-base"><Info /> Download Your Data</h3>
              <button className="btn-primary px-3 py-2 rounded-lg text-xs w-full max-w-xs mt-2">Download</button>
            </div>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md flex flex-col gap-3 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-base"><Shield /> Data Sharing Preferences</h3>
              <p className="text-gray-400 text-xs">Control how your data is shared with third parties.</p>
              <button className="btn-primary px-3 py-2 rounded-lg text-xs w-full max-w-xs mt-2">Manage Sharing</button>
            </div>
          </motion.div>
        );
      case 'policy':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Info className="text-primary-400" /> App Policy</h2>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md flex flex-col gap-3 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-base">Official App Policy</h3>
              <p className="text-gray-300 text-sm">
                Welcome to SoundAlchemy. We are committed to protecting your privacy and ensuring the security of your data. Our platform uses industry-standard security practices, including encryption, secure authentication, and regular audits. We do not share your personal data with third parties without your consent. You have full control over your data, can download or delete your information at any time, and can contact support for any privacy concerns. For more details, please review our full Privacy Policy and Terms of Service.
              </p>
              <ul className="list-disc ml-6 text-gray-300 space-y-2 mt-2">
                <li>All user data is encrypted and securely stored.</li>
                <li>We comply with GDPR and other international privacy laws.</li>
                <li>Two-factor authentication (2FA) is available for enhanced security.</li>
                <li>You can request data deletion or export at any time.</li>
                <li>Contact support for any privacy or security questions.</li>
              </ul>
              <div className="mt-4 text-xs text-gray-400">Last updated: June 2024</div>
            </div>
          </motion.div>
        );
      case 'integrations':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Link2 className="text-primary-400" /> Integrations</h2>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md flex flex-col gap-3 w-full max-w-full items-center justify-center min-h-[120px]">
              <span className="inline-block px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-xs mb-2">Coming Soon</span>
              <p className="text-xs text-gray-400 text-center">Integrations with third-party apps and API keys will be available soon.</p>
            </div>
          </motion.div>
        );
      case 'personalization':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Sliders className="text-primary-400" /> Personalization</h2>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md flex flex-col gap-3 w-full max-w-full items-center justify-center min-h-[120px]">
              <span className="inline-block px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-xs mb-2">Coming Soon</span>
              <p className="text-xs text-gray-400 text-center">Personalization options (theme, layout, notification sounds) are coming soon.</p>
            </div>
          </motion.div>
        );
      case 'support':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><HelpCircle className="text-primary-400" /> Support & Help</h2>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-2"><HelpCircle /> Get Support</h3>
              <ul className="space-y-3">
                <li><button className="underline text-primary-400 hover:text-primary-300">FAQs</button></li>
                <li><button className="underline text-primary-400 hover:text-primary-300">Contact Support</button></li>
                <li><button className="underline text-primary-400 hover:text-primary-300">Report an Issue</button></li>
                <li><button className="underline text-primary-400 hover:text-primary-300">Privacy Policy</button></li>
                <li><button className="underline text-primary-400 hover:text-primary-300">Terms of Service</button></li>
              </ul>
              <div className="mt-4 text-xs text-gray-400">App Version 1.0.0</div>
            </div>
          </motion.div>
        );
      case 'advanced':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><AlertTriangle className="text-primary-400" /> Advanced Settings</h2>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-red-400 flex items-center gap-2"><Trash2 /> Delete Account</h3>
              <p className="text-gray-300 mb-2">Permanently delete your musician account. This action cannot be undone.</p>
              <button className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors" onClick={() => setShowDeleteModal(true)}>Delete Account</button>
            </div>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-yellow-400 flex items-center gap-2"><PauseCircle /> {deactivated ? 'Reactivate Account' : 'Deactivate Account'}</h3>
              <p className="text-gray-300 mb-2">
                {deactivated
                  ? 'Your account is currently deactivated. You can reactivate it at any time.'
                  : 'Temporarily deactivate your account. You can reactivate at any time.'}
              </p>
              {deactivated ? (
                <button className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 transition-colors" onClick={handleReactivateAccount}>Reactivate Account</button>
              ) : (
                <button className="px-4 py-2 rounded-lg bg-yellow-500 text-white font-bold hover:bg-yellow-600 transition-colors" onClick={() => setShowDeactivateModal(true)}>Deactivate Account</button>
              )}
            </div>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2"><Info /> More Advanced Controls</h3>
              <ul className="list-disc ml-6 text-gray-300 space-y-2 mt-2 w-full max-w-full">
                <li><button className="underline text-primary-400 hover:text-primary-300" onClick={handleDownloadData} disabled={downloading}>{downloading ? 'Downloading...' : 'Download your data'}</button></li>
                <li><button className="underline text-primary-400 hover:text-primary-300" onClick={handleExportActivity} disabled={exporting}>{exporting ? 'Exporting...' : 'Export account activity'}</button></li>
                <li><button className="underline text-primary-400 hover:text-primary-300" onClick={() => setShowApiModal(true)}>Manage API access</button></li>
              </ul>
            </div>
            {/* Delete Modal */}
            {showDeleteModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-1 sm:px-2">
                <div className="bg-dark-800 p-3 sm:p-4 rounded-xl shadow-xl border border-red-600 max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2"><Trash2 /> Confirm Delete</h3>
                  <p className="text-gray-300 mb-6">Are you sure you want to permanently delete your account? This cannot be undone.</p>
                  <div className="flex gap-4 justify-end">
                    <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                    <button className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700" onClick={handleDeleteAccount}>Delete</button>
                  </div>
                </div>
              </div>
            )}
            {/* Deactivate Modal */}
            {showDeactivateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-1 sm:px-2">
                <div className="bg-dark-800 p-3 sm:p-4 rounded-xl shadow-xl border border-yellow-500 max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2"><PauseCircle /> Confirm Deactivation</h3>
                  <p className="text-gray-300 mb-6">Are you sure you want to temporarily deactivate your account? You can reactivate by logging in again.</p>
                  <div className="flex gap-4 justify-end">
                    <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600" onClick={() => setShowDeactivateModal(false)}>Cancel</button>
                    <button className="px-4 py-2 rounded-lg bg-yellow-500 text-white font-bold hover:bg-yellow-600" onClick={handleDeactivateAccount}>Deactivate</button>
                  </div>
                </div>
              </div>
            )}
            {/* API Modal */}
            {showApiModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-1 sm:px-2">
                <div className="bg-dark-800 p-3 sm:p-4 rounded-xl shadow-xl border border-primary-500 max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold text-primary-400 mb-4 flex items-center gap-2"><Info /> API Access</h3>
                  <p className="text-gray-300 mb-6">API access management coming soon. For now, contact support for API keys or integration help.</p>
                  <div className="flex gap-4 justify-end">
                    <button className="px-4 py-2 rounded-lg bg-primary-500 text-white font-bold hover:bg-primary-600" onClick={() => setShowApiModal(false)}>Close</button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <SEO
        title="Settings | SoundAlchemy – Account, Privacy & Music Platform"
        description="Manage your SoundAlchemy account settings, privacy, and notifications. Connect with global musicians, orchestras, and more. Powered by Lehan Kawshila."
        keywords="soundalcmy, soundalchemy, music, settings, account, privacy, global musicians, lehan kawshila, orchestra, guitar, world wide"
        image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
        url="https://soundalcmy.com/settings"
        lang="en"
        schema={settingsSchema}
      />
      {deleting && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black bg-opacity-80">
          <LoadingSpinner size="large" color="#fff" />
          <div className="mt-6 text-lg font-semibold text-white animate-pulse">Deleting your account…</div>
        </div>
      )}
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <div className="w-full bg-gradient-to-r from-primary-900 via-dark-900 to-primary-900 py-6 px-3 sm:py-8 sm:px-4 md:px-12 flex flex-row items-center gap-3 border-b border-dark-700" style={{background: 'linear-gradient(90deg, #181c24 0%, #23272f 100%)'}}>
          {/* Back button for mobile */}
          <button
            className="md:hidden flex items-center justify-center p-2 mr-2 rounded-full hover:bg-primary-500/10 focus:outline-none focus:ring-2 focus:ring-primary-400"
            onClick={() => window.history.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-primary-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl md:text-3xl font-bold mb-1 flex items-center gap-2 sm:gap-3"><SettingsIcon className="text-primary-400" /> Account Settings</h1>
            <p className="text-xs sm:text-sm md:text-lg text-gray-300">Full control over your SoundAlchemy account, privacy, and security.</p>
          </div>
          {/* Theme toggle */}
          <div className="flex items-center gap-2 ml-4">
            <button
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`p-2 rounded-lg border border-primary-700 transition-colors ${theme === 'dark' ? 'bg-primary-500 text-white' : 'bg-dark-600 text-gray-400'}`}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <span className="text-xs text-gray-400">{theme === 'dark' ? 'Dark' : 'Light'} Mode</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full py-8 px-2 sm:px-4 md:px-8 gap-8">
          {/* Mobile Tab Bar for Section Navigation */}
          <nav className="flex md:hidden gap-2 mb-6 overflow-x-auto no-scrollbar sticky top-0 z-20 bg-gray-900/95 py-2 -mx-2 px-2 border-b border-dark-700">
            {sections.map(section => (
              <button
                key={section.key}
                className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg min-w-[80px] font-semibold text-xs transition-all duration-200 border-b-2 ${activeSection === section.key ? 'border-primary-500 text-primary-400 bg-primary-500/10' : 'border-transparent text-gray-400 hover:text-primary-400'}`}
                onClick={() => setActiveSection(section.key)}
              >
                <span className="mb-1">{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
          {/* Sidebar for Desktop */}
          <aside className="hidden md:block w-full md:w-64 mb-8 md:mb-0">
            <nav className="flex flex-col gap-2 md:gap-4 overflow-y-auto max-h-[calc(100vh-120px)] bg-dark-900/90 shadow-lg rounded-xl p-2 custom-scrollbar sticky top-8" style={{ minHeight: '400px' }}>
              {sections.map(section => (
                <button
                  key={section.key}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full text-left font-semibold text-xs transition-all duration-200 border border-transparent hover:bg-primary-500/10 hover:text-primary-400 ${activeSection === section.key ? 'bg-primary-500/20 text-primary-400 border-primary-500' : 'text-gray-300'}`}
                  onClick={() => setActiveSection(section.key)}
                  style={{ minWidth: '140px' }}
                  tabIndex={0}
                  aria-current={activeSection === section.key ? 'page' : undefined}
                >
                  {section.icon}
                  <span>{section.label}</span>
                </button>
              ))}
            </nav>
          </aside>
          {/* Main Content */}
          <main className="flex-1 min-w-0 w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="space-y-6 w-full max-w-full">
                {/* Card-style container for each section */}
                <div className="space-y-6 w-full max-w-full">
                  {renderSection()}
                </div>
              </div>
            </motion.div>
          </main>
        </div>
      </div>
    </>
  );
};

export default SettingsPage; 