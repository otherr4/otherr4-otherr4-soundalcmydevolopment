import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Shield, Activity, MapPin, User, Trash2, PauseCircle, LogOut, Key, Mail, Smartphone, Info, AlertTriangle, 
  Settings as SettingsIcon, Eye, Users, CheckCircle, XCircle, ArrowLeft, Bell, Globe, CreditCard, HelpCircle, 
  ShieldCheck, Database, Link2, Sliders, Sun, Moon, Download, Upload, EyeOff, Wifi, WifiOff, Volume2, VolumeX,
  Palette, Languages, Calendar, DollarSign, FileText, Shield as ShieldIcon, Zap, RefreshCw, Save, AlertCircle,
  ChevronRight, ChevronDown, ExternalLink, Copy, Check, X, Plus, Minus, Star, Clock, Calendar as CalendarIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { doc, updateDoc, deleteDoc, getDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { updateEmail, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { getDatabase, ref as rtdbRef, onValue, remove, set } from 'firebase/database';
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
  { key: 'overview', label: 'Overview', icon: <SettingsIcon />, description: 'Account settings overview and quick actions' },
  { key: 'privacy', label: 'Privacy & Security', icon: <Shield />, description: 'Control your privacy and security settings' },
  { key: 'account', label: 'Account Management', icon: <User />, description: 'Manage your account information and credentials' },
  { key: 'activity', label: 'Activity & Devices', icon: <Activity />, description: 'View activity log and manage devices' },
  { key: 'notifications', label: 'Notifications & Alerts', icon: <Bell />, description: 'Configure notification preferences' },
  { key: 'language', label: 'Language & Region', icon: <Globe />, description: 'Set language and regional preferences' },
  { key: 'subscription', label: 'Subscription & Billing', icon: <CreditCard />, description: 'Manage subscriptions and billing' },
  { key: 'security', label: 'Security Center', icon: <ShieldCheck />, description: 'Advanced security features and 2FA' },
  { key: 'dataprivacy', label: 'Data & Privacy', icon: <Database />, description: 'Data export, deletion, and privacy controls' },
  { key: 'policy', label: 'App Policy', icon: <FileText />, description: 'Official app policies and terms' },
  { key: 'integrations', label: 'Integrations', icon: <Link2 />, description: 'Third-party integrations and API access' },
  { key: 'personalization', label: 'Personalization', icon: <Sliders />, description: 'Customize your experience' },
  { key: 'support', label: 'Support & Help', icon: <HelpCircle />, description: 'Get help and support resources' },
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

  // Enhanced state management
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    sound: false,
    vibration: true,
    messagePreviews: true,
    collaborationAlerts: true,
    securityAlerts: true,
    marketingEmails: false
  });

  // Language and region settings
  const [languageSettings, setLanguageSettings] = useState({
    language: 'en',
    region: 'US',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currency: 'USD'
  });

  // Personalization settings
  const [personalizationSettings, setPersonalizationSettings] = useState({
    theme: 'dark',
    accentColor: 'blue',
    fontSize: 'medium',
    animations: true,
    autoSave: true,
    compactMode: false
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

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  // Enhanced theme management with database sync
  const updateTheme = useCallback(async (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.classList.remove('dark', 'light', 'auto');
    document.documentElement.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Save to user profile if logged in
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { 
          theme: newTheme,
          lastSettingsUpdate: new Date().toISOString()
        });
        await logUserActivity(user.uid, 'theme_change', { theme: newTheme });
      } catch (error) {
        console.error('Failed to save theme to database:', error);
      }
    }
  }, [user]);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll position tracking for mobile navigation
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-save functionality
  const autoSave = useCallback(async (settings: any, type: string) => {
    if (!user) return;
    
    setSaveStatus('saving');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [`settings.${type}`]: settings,
        lastSettingsUpdate: new Date().toISOString()
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      toast.error('Failed to save settings');
    }
  }, [user]);

  // Load all settings from Firestore
  useEffect(() => {
    if (!user) return;
    
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Load privacy settings
          setProfilePublic(data.profilePublic !== false);
          setOnlineStatus(data.onlineStatus !== false);
          setDeactivated(!!data.deactivated);
          
          // Load notification settings
          if (data.settings?.notifications) {
            setNotificationSettings(prev => ({ ...prev, ...data.settings.notifications }));
          }
          
          // Load language settings
          if (data.settings?.language) {
            setLanguageSettings(prev => ({ ...prev, ...data.settings.language }));
          }
          
          // Load personalization settings
          if (data.settings?.personalization) {
            setPersonalizationSettings(prev => ({ ...prev, ...data.settings.personalization }));
          }
          
          // Load theme
          if (data.theme) {
            setTheme(data.theme);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
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

  // Enhanced notification settings handlers
  const handleNotificationToggle = async (key: keyof typeof notificationSettings) => {
    const newSettings = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(newSettings);
    await autoSave(newSettings, 'notifications');
    toast.success(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${newSettings[key] ? 'enabled' : 'disabled'}`);
  };

  // Enhanced language settings handlers
  const handleLanguageChange = async (key: keyof typeof languageSettings, value: string) => {
    const newSettings = { ...languageSettings, [key]: value };
    setLanguageSettings(newSettings);
    await autoSave(newSettings, 'language');
    toast.success(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} updated to ${value}`);
  };

  // Enhanced personalization settings handlers
  const handlePersonalizationChange = async (key: keyof typeof personalizationSettings, value: any) => {
    const newSettings = { ...personalizationSettings, [key]: value };
    setPersonalizationSettings(newSettings);
    await autoSave(newSettings, 'personalization');
    
    if (key === 'theme') {
      await updateTheme(value);
    }
    
    toast.success(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} updated`);
  };

  // Professional App Policy Content
  const appPolicyContent = {
    privacy: {
      title: "Privacy Policy",
      content: `SoundAlchemy is committed to protecting your privacy and ensuring the security of your personal data. Our comprehensive privacy policy outlines how we collect, use, and protect your information.

**Data Collection & Usage:**
• We collect only necessary information to provide our services
• Your data is encrypted using industry-standard AES-256 encryption
• We never sell or share your personal data with third parties
• You have full control over your data and can request deletion at any time

**Security Measures:**
• End-to-end encryption for all communications
• Regular security audits and penetration testing
• Compliance with GDPR, CCPA, and other international privacy laws
• Two-factor authentication (2FA) for enhanced account security

**Data Retention:**
• Account data is retained until you request deletion
• Activity logs are automatically deleted after 90 days
• Backup data is encrypted and securely stored

**Your Rights:**
• Access, modify, or delete your personal data
• Export your data in standard formats
• Opt-out of marketing communications
• Request data portability

For detailed information, contact our privacy team at privacy@soundalcmy.com`
    },
    terms: {
      title: "Terms of Service",
      content: `By using SoundAlchemy, you agree to these terms of service that govern your use of our platform.

**Acceptable Use:**
• Use the platform for legitimate musical collaboration
• Respect intellectual property rights
• Maintain appropriate behavior in all interactions
• Report violations or suspicious activity

**Account Responsibilities:**
• Keep your account credentials secure
• Notify us immediately of any security concerns
• Maintain accurate and up-to-date information
• Accept responsibility for account activities

**Service Availability:**
• We strive for 99.9% uptime but cannot guarantee uninterrupted service
• Scheduled maintenance will be announced in advance
• Emergency maintenance may occur without notice

**Intellectual Property:**
• You retain ownership of your original content
• You grant us license to display and distribute your content
• Respect copyright and licensing requirements
• Report copyright violations

**Limitation of Liability:**
• We provide the service "as is" without warranties
• We are not liable for indirect or consequential damages
• Maximum liability is limited to your subscription amount

**Termination:**
• You may terminate your account at any time
• We may terminate accounts for policy violations
• Data deletion occurs within 30 days of termination

For questions about these terms, contact legal@soundalcmy.com`
    },
    security: {
      title: "Security Policy",
      content: `SoundAlchemy implements comprehensive security measures to protect your data and ensure platform integrity.

**Infrastructure Security:**
• Cloud infrastructure with enterprise-grade security
• Regular security updates and vulnerability assessments
• DDoS protection and traffic monitoring
• Geographic data distribution for redundancy

**Application Security:**
• Secure coding practices and regular code audits
• Input validation and output encoding
• SQL injection and XSS protection
• Rate limiting and abuse prevention

**Data Protection:**
• Encryption at rest and in transit (TLS 1.3)
• Secure key management and rotation
• Regular backup testing and recovery procedures
• Compliance with industry security standards

**Access Control:**
• Role-based access control (RBAC)
• Multi-factor authentication (MFA)
• Session management and timeout policies
• Audit logging for all administrative actions

**Incident Response:**
• 24/7 security monitoring and alerting
• Incident response team with defined procedures
• User notification within 72 hours of incidents
• Regular security training for all staff

**Third-Party Security:**
• Vendor security assessments
• Data processing agreements (DPAs)
• Regular third-party security reviews
• Limited data sharing with trusted partners

For security concerns, contact security@soundalcmy.com`
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Bell className="text-primary-400" /> Notifications & Alerts</h2>
              {saveStatus === 'saving' && <div className="flex items-center gap-2 text-xs text-gray-400"><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</div>}
              {saveStatus === 'saved' && <div className="flex items-center gap-2 text-xs text-green-400"><Check className="w-4 h-4" /> Saved</div>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Bell /> General Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Email Notifications</span>
                      <p className="text-xs text-gray-400">Receive notifications via email</p>
                    </div>
                    <button 
                      onClick={() => handleNotificationToggle('email')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notificationSettings.email ? 'bg-primary-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.email ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Push Notifications</span>
                      <p className="text-xs text-gray-400">Receive push notifications</p>
                    </div>
                    <button 
                      onClick={() => handleNotificationToggle('push')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notificationSettings.push ? 'bg-primary-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.push ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Sound & Vibration</span>
                      <p className="text-xs text-gray-400">Play sounds and vibrate for notifications</p>
                    </div>
                    <button 
                      onClick={() => handleNotificationToggle('sound')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notificationSettings.sound ? 'bg-primary-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.sound ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Message Previews</span>
                      <p className="text-xs text-gray-400">Show message content in notifications</p>
                    </div>
                    <button 
                      onClick={() => handleNotificationToggle('messagePreviews')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notificationSettings.messagePreviews ? 'bg-primary-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.messagePreviews ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><AlertCircle /> Alert Types</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Collaboration Alerts</span>
                      <p className="text-xs text-gray-400">New collaboration requests and updates</p>
                    </div>
                    <button 
                      onClick={() => handleNotificationToggle('collaborationAlerts')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notificationSettings.collaborationAlerts ? 'bg-primary-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.collaborationAlerts ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Security Alerts</span>
                      <p className="text-xs text-gray-400">Account security and login notifications</p>
                    </div>
                    <button 
                      onClick={() => handleNotificationToggle('securityAlerts')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notificationSettings.securityAlerts ? 'bg-primary-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.securityAlerts ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Marketing Emails</span>
                      <p className="text-xs text-gray-400">News, updates, and promotional content</p>
                    </div>
                    <button 
                      onClick={() => handleNotificationToggle('marketingEmails')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notificationSettings.marketingEmails ? 'bg-primary-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.marketingEmails ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Clock /> Notification Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-dark-700/50">
                  <div className="text-sm font-medium">Quiet Hours</div>
                  <div className="text-xs text-gray-400">10:00 PM - 8:00 AM</div>
                  <button className="mt-2 text-xs text-primary-400 hover:text-primary-300">Configure</button>
                </div>
                <div className="text-center p-3 rounded-lg bg-dark-700/50">
                  <div className="text-sm font-medium">Weekend Mode</div>
                  <div className="text-xs text-gray-400">Reduced notifications</div>
                  <button className="mt-2 text-xs text-primary-400 hover:text-primary-300">Configure</button>
                </div>
                <div className="text-center p-3 rounded-lg bg-dark-700/50">
                  <div className="text-sm font-medium">Priority Contacts</div>
                  <div className="text-xs text-gray-400">Always notify</div>
                  <button className="mt-2 text-xs text-primary-400 hover:text-primary-300">Manage</button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'language':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Globe className="text-primary-400" /> Language & Region</h2>
              {saveStatus === 'saving' && <div className="flex items-center gap-2 text-xs text-gray-400"><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</div>}
              {saveStatus === 'saved' && <div className="flex items-center gap-2 text-xs text-green-400"><Check className="w-4 h-4" /> Saved</div>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Languages /> Language Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">App Language</label>
                    <select 
                      value={languageSettings.language}
                      onChange={(e) => handleLanguageChange('language', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="it">Italiano</option>
                      <option value="pt">Português</option>
                      <option value="ru">Русский</option>
                      <option value="ja">日本語</option>
                      <option value="ko">한국어</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Region</label>
                    <select 
                      value={languageSettings.region}
                      onChange={(e) => handleLanguageChange('region', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="JP">Japan</option>
                      <option value="KR">South Korea</option>
                      <option value="CN">China</option>
                      <option value="IN">India</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Timezone</label>
                    <select 
                      value={languageSettings.timezone}
                      onChange={(e) => handleLanguageChange('timezone', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="EST">EST (Eastern Standard Time)</option>
                      <option value="CST">CST (Central Standard Time)</option>
                      <option value="MST">MST (Mountain Standard Time)</option>
                      <option value="PST">PST (Pacific Standard Time)</option>
                      <option value="GMT">GMT (Greenwich Mean Time)</option>
                      <option value="CET">CET (Central European Time)</option>
                      <option value="JST">JST (Japan Standard Time)</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Calendar /> Format Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Date Format</label>
                    <select 
                      value={languageSettings.dateFormat}
                      onChange={(e) => handleLanguageChange('dateFormat', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                      <option value="MM-DD-YY">MM-DD-YY (Short)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Time Format</label>
                    <select 
                      value={languageSettings.timeFormat}
                      onChange={(e) => handleLanguageChange('timeFormat', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="12h">12-hour (AM/PM)</option>
                      <option value="24h">24-hour</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Currency</label>
                    <select 
                      value={languageSettings.currency}
                      onChange={(e) => handleLanguageChange('currency', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CAD">CAD (C$)</option>
                      <option value="AUD">AUD (A$)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Info /> Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-dark-700/50">
                  <div className="text-gray-400 mb-1">Date</div>
                  <div className="font-medium">
                    {new Date().toLocaleDateString(languageSettings.language, {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-dark-700/50">
                  <div className="text-gray-400 mb-1">Time</div>
                  <div className="font-medium">
                    {new Date().toLocaleTimeString(languageSettings.language, {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: languageSettings.timeFormat === '12h'
                    })}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-dark-700/50">
                  <div className="text-gray-400 mb-1">Currency</div>
                  <div className="font-medium">
                    {new Intl.NumberFormat(languageSettings.language, {
                      style: 'currency',
                      currency: languageSettings.currency
                    }).format(1234.56)}
                  </div>
                </div>
              </div>
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><FileText className="text-primary-400" /> App Policy</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => setExpandedSections(prev => new Set([...prev, 'privacy']))}
                className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 hover:border-primary-500 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-6 h-6 text-primary-400" />
                  <h3 className="font-semibold text-primary-400">Privacy Policy</h3>
                </div>
                <p className="text-xs text-gray-400">How we collect, use, and protect your data</p>
              </button>
              
              <button
                onClick={() => setExpandedSections(prev => new Set([...prev, 'terms']))}
                className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 hover:border-primary-500 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-6 h-6 text-primary-400" />
                  <h3 className="font-semibold text-primary-400">Terms of Service</h3>
                </div>
                <p className="text-xs text-gray-400">Rules and guidelines for using our platform</p>
              </button>
              
              <button
                onClick={() => setExpandedSections(prev => new Set([...prev, 'security']))}
                className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 hover:border-primary-500 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="w-6 h-6 text-primary-400" />
                  <h3 className="font-semibold text-primary-400">Security Policy</h3>
                </div>
                <p className="text-xs text-gray-400">Our security measures and practices</p>
              </button>
            </div>
            
            <AnimatePresence>
              {expandedSections.has('privacy') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-6 rounded-lg bg-dark-800/80 border border-primary-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-primary-400 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      {appPolicyContent.privacy.title}
                    </h3>
                    <button
                      onClick={() => setExpandedSections(prev => {
                        const newSet = new Set(prev);
                        newSet.delete('privacy');
                        return newSet;
                      })}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="prose prose-invert max-w-none text-sm">
                    <pre className="whitespace-pre-wrap text-gray-300 font-sans">{appPolicyContent.privacy.content}</pre>
                  </div>
                </motion.div>
              )}
              
              {expandedSections.has('terms') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-6 rounded-lg bg-dark-800/80 border border-primary-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-primary-400 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {appPolicyContent.terms.title}
                    </h3>
                    <button
                      onClick={() => setExpandedSections(prev => {
                        const newSet = new Set(prev);
                        newSet.delete('terms');
                        return newSet;
                      })}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="prose prose-invert max-w-none text-sm">
                    <pre className="whitespace-pre-wrap text-gray-300 font-sans">{appPolicyContent.terms.content}</pre>
                  </div>
                </motion.div>
              )}
              
              {expandedSections.has('security') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-6 rounded-lg bg-dark-800/80 border border-primary-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-primary-400 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      {appPolicyContent.security.title}
                    </h3>
                    <button
                      onClick={() => setExpandedSections(prev => {
                        const newSet = new Set(prev);
                        newSet.delete('security');
                        return newSet;
                      })}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="prose prose-invert max-w-none text-sm">
                    <pre className="whitespace-pre-wrap text-gray-300 font-sans">{appPolicyContent.security.content}</pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Info /> Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-200">Privacy Team</div>
                  <div className="text-gray-400">privacy@soundalcmy.com</div>
                </div>
                <div>
                  <div className="font-medium text-gray-200">Legal Team</div>
                  <div className="text-gray-400">legal@soundalcmy.com</div>
                </div>
                <div>
                  <div className="font-medium text-gray-200">Security Team</div>
                  <div className="text-gray-400">security@soundalcmy.com</div>
                </div>
              </div>
              <div className="mt-4 text-xs text-gray-400">Last updated: December 2024 | Version 2.1</div>
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 w-full max-w-full">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Sliders className="text-primary-400" /> Personalization</h2>
              {saveStatus === 'saving' && <div className="flex items-center gap-2 text-xs text-gray-400"><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</div>}
              {saveStatus === 'saved' && <div className="flex items-center gap-2 text-xs text-green-400"><Check className="w-4 h-4" /> Saved</div>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full">
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Palette /> Theme & Appearance</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Theme</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handlePersonalizationChange('theme', 'dark')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          personalizationSettings.theme === 'dark'
                            ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                            : 'border-dark-600 bg-dark-700 text-gray-300 hover:border-primary-500/50'
                        }`}
                      >
                        <div className="w-full h-8 bg-gray-900 rounded mb-2"></div>
                        <span className="text-xs">Dark</span>
                      </button>
                      <button
                        onClick={() => handlePersonalizationChange('theme', 'light')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          personalizationSettings.theme === 'light'
                            ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                            : 'border-dark-600 bg-dark-700 text-gray-300 hover:border-primary-500/50'
                        }`}
                      >
                        <div className="w-full h-8 bg-gray-100 rounded mb-2"></div>
                        <span className="text-xs">Light</span>
                      </button>
                      <button
                        onClick={() => handlePersonalizationChange('theme', 'auto')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          personalizationSettings.theme === 'auto'
                            ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                            : 'border-dark-600 bg-dark-700 text-gray-300 hover:border-primary-500/50'
                        }`}
                      >
                        <div className="w-full h-8 bg-gradient-to-r from-gray-900 to-gray-100 rounded mb-2"></div>
                        <span className="text-xs">Auto</span>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Accent Color</label>
                    <div className="grid grid-cols-6 gap-2">
                      {['blue', 'purple', 'green', 'red', 'orange', 'pink'].map((color) => (
                        <button
                          key={color}
                          onClick={() => handlePersonalizationChange('accentColor', color)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            personalizationSettings.accentColor === color
                              ? 'border-white scale-110'
                              : 'border-dark-600 hover:scale-105'
                          }`}
                          style={{
                            backgroundColor: color === 'blue' ? '#3b82f6' :
                                           color === 'purple' ? '#8b5cf6' :
                                           color === 'green' ? '#10b981' :
                                           color === 'red' ? '#ef4444' :
                                           color === 'orange' ? '#f97316' :
                                           color === 'pink' ? '#ec4899' : '#3b82f6'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Font Size</label>
                    <select 
                      value={personalizationSettings.fontSize}
                      onChange={(e) => handlePersonalizationChange('fontSize', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="extra-large">Extra Large</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
                <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Zap /> Interface Options</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Animations</span>
                      <p className="text-xs text-gray-400">Enable smooth transitions and animations</p>
                    </div>
                    <button 
                      onClick={() => handlePersonalizationChange('animations', !personalizationSettings.animations)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        personalizationSettings.animations ? 'bg-primary-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        personalizationSettings.animations ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Auto Save</span>
                      <p className="text-xs text-gray-400">Automatically save changes</p>
                    </div>
                    <button 
                      onClick={() => handlePersonalizationChange('autoSave', !personalizationSettings.autoSave)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        personalizationSettings.autoSave ? 'bg-primary-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        personalizationSettings.autoSave ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Compact Mode</span>
                      <p className="text-xs text-gray-400">Reduce spacing for more content</p>
                    </div>
                    <button 
                      onClick={() => handlePersonalizationChange('compactMode', !personalizationSettings.compactMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        personalizationSettings.compactMode ? 'bg-primary-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        personalizationSettings.compactMode ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-dark-800/80 border border-primary-700 w-full max-w-full">
              <h3 className="font-semibold text-primary-400 flex items-center gap-2 mb-4"><Info /> Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-dark-700/50">
                  <div className="text-sm font-medium mb-2">Current Theme</div>
                  <div className="text-xs text-gray-400 capitalize">{personalizationSettings.theme} Mode</div>
                </div>
                <div className="p-3 rounded-lg bg-dark-700/50">
                  <div className="text-sm font-medium mb-2">Accent Color</div>
                  <div className="text-xs text-gray-400 capitalize">{personalizationSettings.accentColor}</div>
                </div>
                <div className="p-3 rounded-lg bg-dark-700/50">
                  <div className="text-sm font-medium mb-2">Font Size</div>
                  <div className="text-xs text-gray-400 capitalize">{personalizationSettings.fontSize.replace('-', ' ')}</div>
                </div>
              </div>
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
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm">
          <LoadingSpinner size="large" color="#fff" />
          <div className="mt-6 text-lg font-semibold text-white animate-pulse">Deleting your account…</div>
          <div className="mt-2 text-sm text-gray-300">This process cannot be undone.</div>
        </div>
      )}
      
      {isLoading && (
        <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <LoadingSpinner size="large" color="#fff" />
          <div className="mt-4 text-sm text-gray-300">Loading settings...</div>
        </div>
      )}
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <div className="w-full bg-gradient-to-r from-primary-900 via-dark-900 to-primary-900 py-6 px-3 sm:py-8 sm:px-4 md:px-12 flex flex-row items-center gap-3 border-b border-dark-700 shadow-lg" style={{background: 'linear-gradient(90deg, #181c24 0%, #23272f 100%)'}}>
          {/* Enhanced Back button for mobile */}
          <button
            className="md:hidden flex items-center justify-center p-2 mr-2 rounded-full hover:bg-primary-500/10 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all duration-200"
            onClick={() => window.history.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-primary-400" />
          </button>
          
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl md:text-3xl font-bold mb-1 flex items-center gap-2 sm:gap-3">
              <SettingsIcon className="text-primary-400" /> 
              Account Settings
            </h1>
            <p className="text-xs sm:text-sm md:text-lg text-gray-300">
              Full control over your SoundAlchemy account, privacy, and security.
            </p>
            {/* Save status indicator */}
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-2 mt-2 text-xs text-yellow-400">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Saving changes...
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-2 mt-2 text-xs text-green-400">
                <Check className="w-3 h-3" />
                Changes saved successfully
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
                <X className="w-3 h-3" />
                Failed to save changes
              </div>
            )}
          </div>
          
          {/* Enhanced Theme toggle with better UX */}
          <div className="flex items-center gap-3 ml-4">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-gray-400">Theme:</span>
            </div>
            <div className="flex items-center bg-dark-800 rounded-lg p-1 border border-dark-600">
              <button
                aria-label="Switch to light mode"
                className={`p-2 rounded-md transition-all duration-200 ${
                  theme === 'light' 
                    ? 'bg-primary-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
                onClick={() => updateTheme('light')}
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                aria-label="Switch to dark mode"
                className={`p-2 rounded-md transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-primary-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
                onClick={() => updateTheme('dark')}
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                aria-label="Switch to auto mode"
                className={`p-2 rounded-md transition-all duration-200 ${
                  theme === 'auto' 
                    ? 'bg-primary-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
                onClick={() => updateTheme('auto')}
              >
                <div className="w-4 h-4 bg-gradient-to-r from-gray-900 to-gray-100 rounded-sm"></div>
              </button>
            </div>
            <div className="hidden md:block text-xs text-gray-400 capitalize">
              {theme} Mode
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full py-8 px-2 sm:px-4 md:px-8 gap-8">
          {/* Enhanced Mobile Tab Bar for Section Navigation */}
          <nav className={`flex md:hidden gap-2 mb-6 overflow-x-auto no-scrollbar sticky top-0 z-20 transition-all duration-300 ${
            scrollPosition > 100 ? 'bg-gray-900/95 backdrop-blur-sm shadow-lg' : 'bg-gray-900/80'
          } py-3 -mx-2 px-2 border-b border-dark-700`}>
            {sections.map(section => (
              <button
                key={section.key}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg min-w-[90px] font-semibold text-xs transition-all duration-200 border-b-2 ${
                  activeSection === section.key 
                    ? 'border-primary-500 text-primary-400 bg-primary-500/10 shadow-lg' 
                    : 'border-transparent text-gray-400 hover:text-primary-400 hover:bg-primary-500/5'
                }`}
                onClick={() => setActiveSection(section.key)}
                title={section.description}
              >
                <span className="mb-1">{section.icon}</span>
                <span className="text-center leading-tight">{section.label}</span>
              </button>
            ))}
          </nav>
          
          {/* Enhanced Sidebar for Desktop */}
          <aside className="hidden md:block w-full md:w-64 mb-8 md:mb-0">
            <nav className="flex flex-col gap-2 md:gap-3 overflow-y-auto max-h-[calc(100vh-120px)] bg-dark-900/90 shadow-lg rounded-xl p-3 custom-scrollbar sticky top-8 border border-dark-700" style={{ minHeight: '400px' }}>
              {sections.map(section => (
                <button
                  key={section.key}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left font-semibold text-sm transition-all duration-200 border border-transparent hover:bg-primary-500/10 hover:text-primary-400 hover:border-primary-500/30 ${
                    activeSection === section.key 
                      ? 'bg-primary-500/20 text-primary-400 border-primary-500 shadow-lg' 
                      : 'text-gray-300'
                  }`}
                  onClick={() => setActiveSection(section.key)}
                  style={{ minWidth: '140px' }}
                  tabIndex={0}
                  aria-current={activeSection === section.key ? 'page' : undefined}
                  title={section.description}
                >
                  <span className="flex-shrink-0">{section.icon}</span>
                  <span className="truncate">{section.label}</span>
                  {activeSection === section.key && (
                    <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
            </nav>
          </aside>
          
          {/* Enhanced Main Content with Scroll */}
          <main className="flex-1 min-w-0 w-full">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3 }}
              className="h-full overflow-y-auto custom-scrollbar pr-2"
            >
              <div className="space-y-6 w-full max-w-full">
                {/* Enhanced section container with better spacing */}
                <div className="space-y-8 w-full max-w-full">
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