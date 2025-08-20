import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Shield, Activity, MapPin, User, Trash2, PauseCircle, LogOut, Key, Mail, Smartphone, Info, AlertTriangle, Settings as SettingsIcon, Eye, Users, CheckCircle, XCircle, ArrowLeft, Bell, Globe, CreditCard, HelpCircle, ShieldCheck, Database, Link2, Sliders, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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
  const { theme, setTheme } = useTheme();
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

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    soundVibration: false,
    messagePreviews: true,
    collaborationAlerts: true,
    systemUpdates: true,
    marketingEmails: false,
    securityAlerts: true
  });

  // Language and region settings
  const [languageSettings, setLanguageSettings] = useState({
    appLanguage: 'English',
    dateTimeFormat: '24-hour',
    currency: 'USD',
    timezone: 'UTC'
  });

  // Personalization settings
  const [personalizationSettings, setPersonalizationSettings] = useState({
    autoPlayVideos: true,
    showOnlineStatus: true,
    compactMode: false,
    animationsEnabled: true,
    highContrast: false,
    analyticsEnabled: true
  });

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

  // Theme is now managed by ThemeContext

  // Load settings from Firestore
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(docSnap => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setProfilePublic(d.profilePublic !== false);
        setOnlineStatus(d.onlineStatus !== false);
        setDeactivated(!!d.deactivated);
        
        // Load notification settings
        if (d.notificationSettings) {
          setNotificationSettings(prev => ({ ...prev, ...d.notificationSettings }));
        }
        
        // Load language settings
        if (d.languageSettings) {
          setLanguageSettings(prev => ({ ...prev, ...d.languageSettings }));
        }
        
        // Load personalization settings
        if (d.personalizationSettings) {
          setPersonalizationSettings(prev => ({ ...prev, ...d.personalizationSettings }));
        }
        
        // Load theme from user data (handled by ThemeContext)
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

  // Settings update functions
  const updateNotificationSetting = async (key: string, value: boolean) => {
    if (!user) return;
    try {
      const newSettings = { ...notificationSettings, [key]: value };
      setNotificationSettings(newSettings);
      await updateDoc(doc(db, 'users', user.uid), { notificationSettings: newSettings });
      toast.success('Notification settings updated.');
    } catch (e) {
      toast.error('Failed to update notification settings.');
    }
  };

  const updateLanguageSetting = async (key: string, value: string) => {
    if (!user) return;
    try {
      const newSettings = { ...languageSettings, [key]: value };
      setLanguageSettings(newSettings);
      await updateDoc(doc(db, 'users', user.uid), { languageSettings: newSettings });
      toast.success('Language settings updated.');
    } catch (e) {
      toast.error('Failed to update language settings.');
    }
  };

  const updatePersonalizationSetting = async (key: string, value: boolean) => {
    if (!user) return;
    try {
      const newSettings = { ...personalizationSettings, [key]: value };
      setPersonalizationSettings(newSettings);
      await updateDoc(doc(db, 'users', user.uid), { personalizationSettings: newSettings });
      toast.success('Personalization settings updated.');
    } catch (e) {
      toast.error('Failed to update personalization settings.');
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-full">
              {sections.filter(s => s.key !== 'overview').map(section => (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md flex flex-col gap-3 w-full max-w-full hover:bg-dark-700/80 hover:border-primary-500 transition-all duration-200 text-left group"
                >
                  <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-base group-hover:text-primary-300">
                    {section.icon} {section.label}
                  </h3>
                  <p className="text-xs text-gray-400 group-hover:text-gray-300">
                    {section.key === 'privacy' && 'Control your privacy, enable 2FA, and review your activity log.'}
                    {section.key === 'account' && 'Change your email, password, and manage connected accounts.'}
                    {section.key === 'activity' && 'See your recent activity and manage your devices.'}
                    {section.key === 'notifications' && 'Manage your notification preferences and alerts.'}
                    {section.key === 'language' && 'Set your language, region, and localization preferences.'}
                    {section.key === 'subscription' && 'View and manage your subscription and billing information.'}
                    {section.key === 'security' && 'Advanced security settings including 2FA and login alerts.'}
                    {section.key === 'dataprivacy' && 'Download your data and manage privacy preferences.'}
                    {section.key === 'policy' && 'Read our official app policy and terms of service.'}
                    {section.key === 'integrations' && 'Connect third-party apps and manage API access.'}
                    {section.key === 'personalization' && 'Customize your app experience and preferences.'}
                    {section.key === 'support' && 'Get help, report issues, and contact support.'}
                    {section.key === 'advanced' && 'Delete or deactivate your account, and access advanced controls.'}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-primary-500 group-hover:text-primary-400">
                      {['subscription', 'integrations', 'personalization'].includes(section.key) ? 'Coming Soon' : 'Available'}
                    </span>
                    <ArrowLeft className="w-4 h-4 text-gray-500 group-hover:text-primary-400 transform rotate-180 transition-transform" />
                  </div>
                </button>
              ))}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Bell /> General Notifications</h3>
                <div className="space-y-4">
                  {Object.entries({
                    emailNotifications: 'Email Notifications',
                    pushNotifications: 'Push Notifications',
                    soundVibration: 'Sound & Vibration',
                    messagePreviews: 'Message Previews'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{label}</span>
                      <button
                        onClick={() => updateNotificationSetting(key, !notificationSettings[key as keyof typeof notificationSettings])}
                        className={`px-3 py-1 rounded-full font-bold text-xs transition-colors ${
                          notificationSettings[key as keyof typeof notificationSettings]
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                        }`}
                      >
                        {notificationSettings[key as keyof typeof notificationSettings] ? 'On' : 'Off'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Shield /> Security & System</h3>
                <div className="space-y-4">
                  {Object.entries({
                    collaborationAlerts: 'Collaboration Alerts',
                    systemUpdates: 'System Updates',
                    securityAlerts: 'Security Alerts',
                    marketingEmails: 'Marketing Emails'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{label}</span>
                      <button
                        onClick={() => updateNotificationSetting(key, !notificationSettings[key as keyof typeof notificationSettings])}
                        className={`px-3 py-1 rounded-full font-bold text-xs transition-colors ${
                          notificationSettings[key as keyof typeof notificationSettings]
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                        }`}
                      >
                        {notificationSettings[key as keyof typeof notificationSettings] ? 'On' : 'Off'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-2"><Info /> Notification Info</h3>
              <p className="text-xs text-gray-400">
                Manage how you receive notifications from SoundAlchemy. Email notifications are sent to your registered email address. 
                Push notifications require browser permission and work when you're online.
              </p>
            </div>
          </motion.div>
        );
      case 'language':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Globe className="text-primary-400" /> Language & Region</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Globe /> Language Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">App Language</span>
                    <select
                      value={languageSettings.appLanguage}
                      onChange={(e) => updateLanguageSetting('appLanguage', e.target.value)}
                      className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Español</option>
                      <option value="French">Français</option>
                      <option value="German">Deutsch</option>
                      <option value="Italian">Italiano</option>
                      <option value="Portuguese">Português</option>
                      <option value="Japanese">日本語</option>
                      <option value="Korean">한국어</option>
                      <option value="Chinese">中文</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Timezone</span>
                    <select
                      value={languageSettings.timezone}
                      onChange={(e) => updateLanguageSetting('timezone', e.target.value)}
                      className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Asia/Seoul">Seoul</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><MapPin /> Regional Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Date/Time Format</span>
                    <select
                      value={languageSettings.dateTimeFormat}
                      onChange={(e) => updateLanguageSetting('dateTimeFormat', e.target.value)}
                      className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      <option value="12-hour">12-hour (AM/PM)</option>
                      <option value="24-hour">24-hour</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Currency</span>
                    <select
                      value={languageSettings.currency}
                      onChange={(e) => updateLanguageSetting('currency', e.target.value)}
                      className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="KRW">KRW (₩)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="CHF">CHF</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-2"><Info /> Language Info</h3>
              <p className="text-xs text-gray-400">
                Language changes will take effect after refreshing the page. Regional settings affect how dates, times, and currency are displayed throughout the app.
              </p>
            </div>
          </motion.div>
        );
      case 'subscription':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><CreditCard className="text-primary-400" /> Subscription & Billing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><User /> Current Plan</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Plan Type</span>
                    <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 font-bold text-xs">Free</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Status</span>
                    <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 font-bold text-xs">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Next Billing</span>
                    <span className="text-xs text-gray-400">N/A</span>
                  </div>
                </div>
                <button className="w-full mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold text-xs transition-colors">
                  Upgrade Plan
                </button>
              </div>
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><CreditCard /> Payment Methods</h3>
                <div className="space-y-3">
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No payment methods added</p>
                  </div>
                </div>
                <button className="w-full mt-4 px-4 py-2 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-lg font-bold text-xs transition-colors">
                  Add Payment Method
                </button>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Info /> Billing History</h3>
              <div className="text-center py-8">
                <div className="text-gray-500 mb-2">📄</div>
                <p className="text-xs text-gray-400">No billing history available</p>
                <p className="text-xs text-gray-500 mt-1">Invoices and receipts will appear here once you upgrade</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 w-full max-w-full">
              <h3 className="font-semibold text-yellow-400 flex items-center gap-2 mb-2"><AlertTriangle /> Coming Soon</h3>
              <p className="text-xs text-yellow-300">
                Full subscription management including premium plans, payment processing, and billing history is currently in development. 
                Stay tuned for updates!
              </p>
            </div>
          </motion.div>
        );
      case 'security':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><ShieldCheck className="text-primary-400" /> Security Center</h2>
            
            {/* Security Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-full">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h3 className="font-semibold text-green-400 text-sm">Account Secure</h3>
                <p className="text-xs text-green-300 mt-1">Your account is protected</p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <h3 className="font-semibold text-yellow-400 text-sm">2FA Disabled</h3>
                <p className="text-xs text-yellow-300 mt-1">Enable for better security</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
                <Activity className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-400 text-sm">Active Sessions</h3>
                <p className="text-xs text-blue-300 mt-1">{devices.length} device(s)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
              {/* Two-Factor Authentication */}
              <div className="p-6 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-lg mb-4"><Key /> Two-Factor Authentication</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-200">SMS Authentication</p>
                      <p className="text-xs text-gray-400">Receive codes via text message</p>
                    </div>
                    <span className="px-2 py-1 bg-gray-600/20 text-gray-400 rounded text-xs">Coming Soon</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Authenticator App</p>
                      <p className="text-xs text-gray-400">Use Google Authenticator or similar</p>
                    </div>
                    <span className="px-2 py-1 bg-gray-600/20 text-gray-400 rounded text-xs">Coming Soon</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Email Authentication</p>
                      <p className="text-xs text-gray-400">Receive codes via email</p>
                    </div>
                    <span className="px-2 py-1 bg-gray-600/20 text-gray-400 rounded text-xs">Coming Soon</span>
                  </div>
                </div>
              </div>

              {/* Login Security */}
              <div className="p-6 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-lg mb-4"><Bell /> Login Security</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Login Alerts</p>
                      <p className="text-xs text-gray-400">Get notified of new device logins</p>
                    </div>
                    <button
                      onClick={() => updateNotificationSetting('securityAlerts', !notificationSettings.securityAlerts)}
                      className={`px-3 py-1 rounded-full font-bold text-xs transition-colors ${
                        notificationSettings.securityAlerts
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                      }`}
                    >
                      {notificationSettings.securityAlerts ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Suspicious Activity</p>
                      <p className="text-xs text-gray-400">Monitor unusual login patterns</p>
                    </div>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Password Strength</p>
                      <p className="text-xs text-gray-400">Current password security level</p>
                    </div>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Strong</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Recommendations */}
            <div className="p-6 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-lg mb-4"><Shield /> Security Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-200">Completed:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-xs text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Strong password set
                    </li>
                    <li className="flex items-center gap-2 text-xs text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Email verified
                    </li>
                    <li className="flex items-center gap-2 text-xs text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Login alerts enabled
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-200">Recommended:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-xs text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      Enable two-factor authentication
                    </li>
                    <li className="flex items-center gap-2 text-xs text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      Review active sessions
                    </li>
                    <li className="flex items-center gap-2 text-xs text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      Update recovery information
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Security Activity */}
            <div className="p-6 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-lg mb-4"><Activity /> Recent Security Activity</h3>
              <div className="space-y-3">
                {activityLog.slice(0, 5).map((log, index) => {
                  const details = getDeviceDetails(log.deviceInfo || {});
                  const location = log.location?.country || log.location?.city
                    ? `${log.location?.city ? log.location.city + ', ' : ''}${log.location?.country || ''}`
                    : 'Unknown location';
                  return (
                    <div key={log.id || index} className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center">
                          <Shield className="w-4 h-4 text-primary-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-200">{getActionLabel(log.type || 'Unknown')}</p>
                          <p className="text-xs text-gray-400">
                            {details.browser} • {location} • {log.timestamp?._seconds ? new Date(log.timestamp._seconds * 1000).toLocaleDateString() : ''}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Verified</span>
                    </div>
                  );
                })}
                {activityLog.length === 0 && (
                  <p className="text-center text-gray-500 py-4 text-sm">No recent security activity</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      case 'dataprivacy':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Database className="text-primary-400" /> Data & Privacy</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
              {/* Data Export */}
              <div className="p-6 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-lg mb-4"><Info /> Export Your Data</h3>
                <div className="space-y-4">
                  <p className="text-sm text-gray-300">
                    Download a copy of your SoundAlchemy data including profile information, music files, collaborations, and activity history.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                      <span className="text-sm text-gray-200">Profile Data</span>
                      <span className="text-xs text-gray-400">JSON format</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                      <span className="text-sm text-gray-200">Music Files</span>
                      <span className="text-xs text-gray-400">Original formats</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                      <span className="text-sm text-gray-200">Activity Log</span>
                      <span className="text-xs text-gray-400">CSV format</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleDownloadData}
                      disabled={downloading}
                      className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-colors"
                    >
                      {downloading ? 'Downloading...' : 'Download Profile Data'}
                    </button>
                    <button 
                      onClick={handleExportActivity}
                      disabled={exporting}
                      className="flex-1 px-4 py-2 bg-secondary-600 hover:bg-secondary-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-colors"
                    >
                      {exporting ? 'Exporting...' : 'Export Activity'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Privacy Controls */}
              <div className="p-6 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-lg mb-4"><Shield /> Privacy Controls</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Profile Visibility</p>
                      <p className="text-xs text-gray-400">Control who can see your profile</p>
                    </div>
                    <button
                      onClick={handleProfilePublicToggle}
                      className={`px-3 py-1 rounded-full font-bold text-xs transition-colors ${
                        profilePublic
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                      }`}
                    >
                      {profilePublic ? 'Public' : 'Private'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Online Status</p>
                      <p className="text-xs text-gray-400">Show when you're active</p>
                    </div>
                    <button
                      onClick={handleOnlineStatusToggle}
                      className={`px-3 py-1 rounded-full font-bold text-xs transition-colors ${
                        onlineStatus
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                      }`}
                    >
                      {onlineStatus ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Data Analytics</p>
                      <p className="text-xs text-gray-400">Help improve our services</p>
                    </div>
                    <button
                      onClick={() => updatePersonalizationSetting('analyticsEnabled', !personalizationSettings.analyticsEnabled)}
                      className={`px-3 py-1 rounded-full font-bold text-xs transition-colors ${
                        personalizationSettings.analyticsEnabled
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                      }`}
                    >
                      {personalizationSettings.analyticsEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div className="p-6 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-lg mb-4"><Database /> Data Retention Policy</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-dark-700/30 rounded-lg">
                  <h4 className="font-medium text-gray-200 mb-2">Profile Data</h4>
                  <p className="text-xs text-gray-400">Stored until account deletion</p>
                  <p className="text-xs text-primary-400 mt-1">Permanent</p>
                </div>
                <div className="p-4 bg-dark-700/30 rounded-lg">
                  <h4 className="font-medium text-gray-200 mb-2">Activity Logs</h4>
                  <p className="text-xs text-gray-400">Kept for security purposes</p>
                  <p className="text-xs text-primary-400 mt-1">90 days</p>
                </div>
                <div className="p-4 bg-dark-700/30 rounded-lg">
                  <h4 className="font-medium text-gray-200 mb-2">Music Files</h4>
                  <p className="text-xs text-gray-400">Stored with your content</p>
                  <p className="text-xs text-primary-400 mt-1">Until deleted</p>
                </div>
              </div>
            </div>

            {/* GDPR Compliance */}
            <div className="p-6 rounded-lg bg-blue-500/10 border border-blue-500/30 w-full max-w-full">
              <h3 className="font-semibold text-blue-400 flex items-center gap-2 text-lg mb-4"><ShieldCheck /> Your Rights (GDPR)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-300">Data Subject Rights:</h4>
                  <ul className="space-y-1 text-xs text-blue-200">
                    <li>• Right to access your personal data</li>
                    <li>• Right to rectification (correction)</li>
                    <li>• Right to erasure ("right to be forgotten")</li>
                    <li>• Right to restrict processing</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-300">Additional Rights:</h4>
                  <ul className="space-y-1 text-xs text-blue-200">
                    <li>• Right to data portability</li>
                    <li>• Right to object to processing</li>
                    <li>• Rights related to automated decision making</li>
                    <li>• Right to lodge a complaint</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 text-xs text-blue-300">
                <p>To exercise any of these rights, please contact our Data Protection Officer at privacy@soundalchemy.com</p>
              </div>
            </div>
          </motion.div>
        );
      case 'policy':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Info className="text-primary-400" /> App Policy</h2>
            
            {/* Privacy Policy Section */}
            <div className="p-6 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-lg mb-4"><Shield /> Privacy Policy</h3>
              <div className="space-y-4 text-sm text-gray-300">
                <p>
                  <strong>SoundAlchemy</strong> is committed to protecting your privacy and ensuring the security of your personal information. 
                  This Privacy Policy explains how we collect, use, and safeguard your data when you use our music collaboration platform.
                </p>
                
                <div>
                  <h4 className="font-semibold text-primary-300 mb-2">Information We Collect:</h4>
                  <ul className="list-disc ml-6 space-y-1 text-xs">
                    <li>Account information (name, email, profile details)</li>
                    <li>Music content and collaboration data</li>
                    <li>Usage analytics and performance metrics</li>
                    <li>Device and browser information for security</li>
                    <li>Communication data (messages, comments)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-primary-300 mb-2">How We Use Your Data:</h4>
                  <ul className="list-disc ml-6 space-y-1 text-xs">
                    <li>Provide and improve our music collaboration services</li>
                    <li>Facilitate connections between musicians worldwide</li>
                    <li>Ensure platform security and prevent abuse</li>
                    <li>Send important service updates and notifications</li>
                    <li>Analyze usage patterns to enhance user experience</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-primary-300 mb-2">Data Protection:</h4>
                  <ul className="list-disc ml-6 space-y-1 text-xs">
                    <li>All data is encrypted in transit and at rest using AES-256</li>
                    <li>Regular security audits and penetration testing</li>
                    <li>GDPR, CCPA, and international privacy law compliance</li>
                    <li>Secure authentication with optional 2FA</li>
                    <li>Data minimization and retention policies</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Terms of Service Section */}
            <div className="p-6 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-lg mb-4"><CheckCircle /> Terms of Service</h3>
              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <h4 className="font-semibold text-primary-300 mb-2">Acceptable Use:</h4>
                  <ul className="list-disc ml-6 space-y-1 text-xs">
                    <li>Use SoundAlchemy for legitimate music collaboration purposes</li>
                    <li>Respect intellectual property rights of all users</li>
                    <li>Maintain professional and respectful communication</li>
                    <li>Do not upload copyrighted content without permission</li>
                    <li>Report any suspicious or inappropriate behavior</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-primary-300 mb-2">Content Ownership:</h4>
                  <ul className="list-disc ml-6 space-y-1 text-xs">
                    <li>You retain ownership of your original music content</li>
                    <li>Collaborative works are jointly owned by contributors</li>
                    <li>SoundAlchemy has limited license to display and process content</li>
                    <li>Users grant permission for platform functionality</li>
                    <li>Respect for all participants' creative contributions</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-primary-300 mb-2">Platform Responsibilities:</h4>
                  <ul className="list-disc ml-6 space-y-1 text-xs">
                    <li>Maintain service availability and performance</li>
                    <li>Provide secure and reliable data storage</li>
                    <li>Offer customer support and technical assistance</li>
                    <li>Continuously improve platform features</li>
                    <li>Enforce community guidelines and safety measures</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Rights Section */}
            <div className="p-6 rounded-lg bg-dark-800/80 border border-primary-700 shadow-md w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 text-lg mb-4"><Database /> Your Data Rights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-primary-300">Access & Control:</h4>
                  <ul className="list-disc ml-6 space-y-1 text-xs text-gray-300">
                    <li>Download all your personal data</li>
                    <li>Update or correct information</li>
                    <li>Delete your account and data</li>
                    <li>Control privacy settings</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-primary-300">Data Portability:</h4>
                  <ul className="list-disc ml-6 space-y-1 text-xs text-gray-300">
                    <li>Export data in standard formats</li>
                    <li>Transfer to other platforms</li>
                    <li>Backup your music projects</li>
                    <li>Maintain collaboration history</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contact & Compliance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <h3 className="font-semibold text-green-400 flex items-center gap-2 mb-3"><ShieldCheck /> Security Certified</h3>
                <ul className="space-y-1 text-xs text-green-300">
                  <li>✓ SOC 2 Type II Compliant</li>
                  <li>✓ GDPR & CCPA Compliant</li>
                  <li>✓ ISO 27001 Security Standards</li>
                  <li>✓ Regular Security Audits</li>
                  <li>✓ 99.9% Uptime SLA</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <h3 className="font-semibold text-blue-400 flex items-center gap-2 mb-3"><Mail /> Contact Us</h3>
                <div className="space-y-2 text-xs text-blue-300">
                  <p><strong>Privacy Officer:</strong> privacy@soundalchemy.com</p>
                  <p><strong>Security Team:</strong> security@soundalchemy.com</p>
                  <p><strong>General Support:</strong> support@soundalchemy.com</p>
                  <p><strong>Legal Inquiries:</strong> legal@soundalchemy.com</p>
                  <p className="mt-3 text-gray-400">Response time: 24-48 hours</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-dark-700/50 border border-dark-600 text-center">
              <p className="text-xs text-gray-400">
                <strong>Last Updated:</strong> December 2024 | 
                <strong> Version:</strong> 2.1 | 
                <strong> Effective Date:</strong> January 1, 2025
              </p>
              <p className="text-xs text-gray-500 mt-2">
                By using SoundAlchemy, you agree to our Privacy Policy and Terms of Service. 
                We will notify you of any material changes to these policies.
              </p>
            </div>
          </motion.div>
        );
      case 'integrations':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Link2 className="text-primary-400" /> Integrations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Link2 /> Connected Services</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs">YT</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">YouTube</p>
                        <p className="text-xs text-gray-400">Music platform integration</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-lg font-bold text-xs transition-colors">
                      Connect
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs">SP</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">Spotify</p>
                        <p className="text-xs text-gray-400">Music streaming service</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-lg font-bold text-xs transition-colors">
                      Connect
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs">DC</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">Discord</p>
                        <p className="text-xs text-gray-400">Community integration</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-lg font-bold text-xs transition-colors">
                      Connect
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Key /> API Access</h3>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Key className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No API keys generated</p>
                  </div>
                  <button className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold text-xs transition-colors">
                    Generate API Key
                  </button>
                  <div className="text-xs text-gray-400">
                    <p>API keys allow third-party applications to access your SoundAlchemy data securely.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 w-full max-w-full">
              <h3 className="font-semibold text-yellow-400 flex items-center gap-2 mb-2"><AlertTriangle /> Coming Soon</h3>
              <p className="text-xs text-yellow-300">
                Full integration functionality including OAuth connections, webhook management, and API key generation is currently in development. 
                These features will be available in future updates.
              </p>
            </div>
          </motion.div>
        );
      case 'personalization':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Sliders className="text-primary-400" /> Personalization</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Eye /> Display Preferences</h3>
                <div className="space-y-4">
                  {Object.entries({
                    autoPlayVideos: 'Auto-play Videos',
                    showOnlineStatus: 'Show Online Status',
                    compactMode: 'Compact Mode',
                    animationsEnabled: 'Enable Animations'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{label}</span>
                      <button
                        onClick={() => updatePersonalizationSetting(key, !personalizationSettings[key as keyof typeof personalizationSettings])}
                        className={`px-3 py-1 rounded-full font-bold text-xs transition-colors ${
                          personalizationSettings[key as keyof typeof personalizationSettings]
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                        }`}
                      >
                        {personalizationSettings[key as keyof typeof personalizationSettings] ? 'On' : 'Off'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Sliders /> Accessibility</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">High Contrast</span>
                    <button
                      onClick={() => updatePersonalizationSetting('highContrast', !personalizationSettings.highContrast)}
                      className={`px-3 py-1 rounded-full font-bold text-xs transition-colors ${
                        personalizationSettings.highContrast
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                      }`}
                    >
                      {personalizationSettings.highContrast ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Theme</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTheme('light')}
                        className={`p-2 rounded-lg border transition-colors ${
                          theme === 'light'
                            ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                            : 'border-gray-600 bg-dark-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <Sun className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`p-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                            : 'border-gray-600 bg-dark-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <Moon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-2"><Info /> Personalization Info</h3>
              <p className="text-xs text-gray-400">
                Customize your SoundAlchemy experience with these personalization options. Theme changes apply immediately, 
                while other settings may require a page refresh to take full effect.
              </p>
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
          <nav className="flex md:hidden gap-2 mb-6 overflow-x-auto custom-scrollbar-horizontal sticky top-0 z-20 bg-gray-900/95 backdrop-blur-sm py-3 -mx-2 px-2 border-b border-dark-700 shadow-lg">
            {sections.map(section => (
              <button
                key={section.key}
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg min-w-[90px] font-semibold text-xs transition-all duration-300 border-2 whitespace-nowrap ${activeSection === section.key ? 'border-primary-500 text-primary-400 bg-primary-500/20 shadow-lg transform scale-105' : 'border-transparent text-gray-400 hover:text-primary-400 hover:bg-primary-500/5 hover:border-primary-700'}`}
                onClick={() => setActiveSection(section.key)}
              >
                <span className="mb-1 text-base">{section.icon}</span>
                <span className="text-xs leading-tight">{section.label}</span>
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
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <div className="space-y-6 w-full max-w-full h-full">
                {/* Card-style container for each section with enhanced scrolling */}
                <div className="space-y-6 w-full max-w-full max-h-[calc(100vh-200px)] md:max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar pr-2">
                  <div className="pb-8">
                    {renderSection()}
                  </div>
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