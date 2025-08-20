import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { API_URL } from '../../config/constants';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, where, orderBy, getDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { 
  Users, 
  Mail,
  Phone,
  MapPin, 
  Music, 
  CheckCircle, 
  XCircle,
  Clock,
  Calendar,
  User,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
  Shield,
  Star,
  Award,
  TrendingUp,
  BarChart2,
  Camera,
  Save,
  X,
  Loader,
  Check,
  Ban,
  UserCheck,
  UserX,
  UserCog,
  Mic,
  MessageSquare,
  Video,
  PhoneCall,
  Sparkles,
  Brain,
  Heart,
  Music2,
  Trophy,
  Lightbulb,
  Target,
  Zap,
  MessageCircle,
  Send,
  Smile,
  ThumbsUp,
  Star as StarIcon,
  Award as AwardIcon,
  Sparkles as SparklesIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, WidthType } from 'docx';
import EditProfileModal from '../../components/common/EditProfileModal';
import { Country, countries, getCountryInfo } from '../../utils/countries';

// Image cache for ultra-fast loading
const imageCache = new Map<string, string>();
const preloadedImages = new Set<string>();

// Optimized image preloader
const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (preloadedImages.has(src)) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      preloadedImages.add(src);
      resolve();
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
};

// Batch preload images for better performance
const batchPreloadImages = async (urls: string[]) => {
  const uniqueUrls = urls.filter(url => url && !preloadedImages.has(url));
  if (uniqueUrls.length === 0) return;

  const promises = uniqueUrls.map(url => preloadImage(url).catch(() => {}));
  await Promise.allSettled(promises);
};

interface UserData {
  uid: string;
  fullName: string;
  email: string;
  contactNumber: string;
  country: string;
  gender?: string;
  instrumentTypes?: string[];
  singingTypes?: string[];
  musicCulture: string;
  bio: string;
  talentDescription?: string;
  interests?: string[];
  experience?: string;
  goals?: string;
  profileImagePath: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'active';
  role: string;
  createdAt: any;
  lastUpdated: any;
  deactivated?: boolean; // Added deactivated field
  // Social media fields
  instagram?: string;
  facebook?: string;
  youtube?: string;
  linkedin?: string;
  tiktok?: string;
  spotify?: string;
  socialLinks?: { [key: string]: string };
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: any;
  type: 'text' | 'system' | 'ai';
}

interface UserInsight {
  type: 'talent' | 'potential' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  timestamp: any;
}

interface CommunicationSession {
  id: string;
  userId: string;
  type: 'chat' | 'call' | 'video';
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  startTime: any;
  endTime: any;
  notes: string;
}

// Ultra-optimized Google Drive URL converter
const getGoogleDriveDirectUrl = (url: string): string => {
  if (!url) return '';
  
  if (url.includes('drive.google.com')) {
    let fileId = '';
    
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch) {
      fileId = fileIdMatch[1];
    } else {
      const ucMatch = url.match(/[?&]id=([^&]+)/);
      if (ucMatch) {
        fileId = ucMatch[1];
      } else {
        const openMatch = url.match(/\bid=([^&]+)/);
        if (openMatch) {
          fileId = openMatch[1];
        }
      }
    }

    if (fileId) {
      // Use optimized direct URL without timestamp for better caching
      return `https://images.weserv.nl/?url=drive.google.com/uc?export=view%26id=${fileId}`;
    }
  }
  
  return url;
};

// Helper function to get country display with flag
const getCountryDisplay = (countryCode: string): string => {
  if (!countryCode) return 'Unknown';
  const country = getCountryInfo(countryCode);
  if (country) {
    return `${country.flag} ${country.name}`;
  }
  return countryCode || 'Unknown';
};

// Ultra-fast profile image URL resolver with caching
const getProfileImageUrl = (path?: string): string => {
  if (!path) return '/default-avatar.svg';
  
  // Check cache first
  if (imageCache.has(path)) {
    return imageCache.get(path)!;
  }
  
  let resolvedUrl = '';
  
  if (path.includes('drive.google.com')) {
    resolvedUrl = getGoogleDriveDirectUrl(path);
  } else if (path.startsWith('/')) {
    resolvedUrl = path;
  } else if (path.startsWith('http')) {
    resolvedUrl = path;
  } else {
    resolvedUrl = `${API_URL}${path}`;
  }
  
  // Cache the resolved URL
  imageCache.set(path, resolvedUrl);
  return resolvedUrl;
};

// Ultra-optimized ProfileImage component
const ProfileImage = React.memo(({ src, alt }: { src: string; alt: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const imageUrl = useMemo(() => getProfileImageUrl(src), [src]);
  const defaultAvatar = '/default-avatar.svg';

  useEffect(() => {
    if (!imageUrl || imageUrl === defaultAvatar) {
      setIsLoaded(true);
      return;
    }

    // If already preloaded, show immediately
    if (preloadedImages.has(imageUrl)) {
      setIsLoaded(true);
      return;
    }

    // Preload the image
    preloadImage(imageUrl)
      .then(() => {
        setIsLoaded(true);
        setHasError(false);
      })
      .catch(() => {
        setHasError(true);
        setIsLoaded(true);
      });
  }, [imageUrl]);

  // If no src or error, show default avatar
  if (!src || hasError) {
    return (
      <div className="relative w-full h-full">
        <img 
          src={defaultAvatar}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <img 
        ref={imgRef}
        src={imageUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        loading="lazy"
        decoding="async"
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-dark-600 animate-pulse" />
      )}
    </div>
  );
});

ProfileImage.displayName = 'ProfileImage';

const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserData>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState('');
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkActionReason, setBulkActionReason] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userInsights, setUserInsights] = useState<UserInsight[]>([]);
  const [communicationSessions, setCommunicationSessions] = useState<CommunicationSession[]>([]);
  const [selectedSessionType, setSelectedSessionType] = useState<'chat' | 'call' | 'video'>('chat');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add state for import modal and file
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<UserData[]>([]);
  const [importFileType, setImportFileType] = useState<'csv' | 'json' | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importSelected, setImportSelected] = useState<Set<string>>(new Set());
  const [importSearch, setImportSearch] = useState('');
  const [importStatusFilter, setImportStatusFilter] = useState('all');

  useEffect(() => {
    if (showImportModal) {
      setImportSelected(new Set(importPreview.map(u => u.uid)));
    }
  }, [importPreview, showImportModal]);

  // Preload all user images when users data changes
  useEffect(() => {
    if (users.length > 0) {
      const imageUrls = users
        .map(user => user.profileImagePath)
        .filter(Boolean)
        .map(path => getProfileImageUrl(path));
      
      // Preload images in background without blocking UI
      batchPreloadImages(imageUrls);
    }
  }, [users]);

  // Export Handlers
  const handleExport = async (type: 'csv' | 'json' | 'pdf' | 'excel' | 'word', onlySelected = false) => {
    let exportUsers = onlySelected ? getSelectedUsersData() : users;
    if (exportUsers.length === 0) {
      toast.error('No users to export');
      return;
    }
    // Filter out invalid users for backup
    const validUsers = exportUsers.filter(u => u.uid && u.fullName && u.email);
    const skippedUsers = exportUsers.filter(u => !u.uid || !u.fullName || !u.email);
    if (validUsers.length === 0) {
      toast.error('Cannot export: All users are missing uid, fullName, or email');
      return;
    }
    if (skippedUsers.length > 0) {
      toast('Some users were skipped in backup due to missing required fields: ' + skippedUsers.map(u => u.fullName || u.email || u.uid || 'Unknown').join(', '), { icon: '⚠️' });
    }
    exportUsers = validUsers;
    if (type === 'json') {
      const blob = new Blob([JSON.stringify(exportUsers, null, 2)], { type: 'application/json' });
      saveAs(blob, `users_export_${onlySelected ? 'selected' : 'all'}.json`);
    } else if (type === 'csv') {
      const csv = Papa.unparse(exportUsers);
      const blob = new Blob([csv], { type: 'text/csv' });
      saveAs(blob, `users_export_${onlySelected ? 'selected' : 'all'}.csv`);
    } else if (type === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('SoundAlchemy', 105, 18, { align: 'center' });
      doc.setFontSize(12);
      doc.text('User Export', 10, 30);
      const tableData = exportUsers.map(u => [u.fullName, u.email, u.contactNumber, getCountryDisplay(u.country), u.verificationStatus, u.role]);
      autoTable(doc, {
        head: [['Name', 'Email', 'Contact', 'Country', 'Status', 'Role']],
        body: tableData,
        startY: 35,
      });
      doc.save(`users_export_${onlySelected ? 'selected' : 'all'}.pdf`);
    } else if (type === 'excel') {
      // Add title row and user data
      const wsData = [
        ['SoundAlchemy'],
        [],
        ['Name', 'Email', 'Contact', 'Country', 'Status', 'Role'],
        ...exportUsers.map(u => [u.fullName, u.email, u.contactNumber, getCountryDisplay(u.country), u.verificationStatus, u.role])
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveAs(blob, `users_export_${onlySelected ? 'selected' : 'all'}.xlsx`);
    } else if (type === 'word') {
      // Title
      const title = new Paragraph({
        text: 'SoundAlchemy',
        heading: HeadingLevel.HEADING_1,
        alignment: 'center',
        spacing: { after: 200 },
      });
      // Table header
      const tableHeader = ['Name', 'Email', 'Contact', 'Country', 'Status', 'Role'];
      // Table rows
      const tableRows = [
        new TableRow({
          children: tableHeader.map(h => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }))
        }),
        ...exportUsers.map(u => new TableRow({
          children: [u.fullName, u.email, u.contactNumber, getCountryDisplay(u.country), u.verificationStatus, u.role].map(val =>
            new TableCell({
              children: [new Paragraph(val || '')],
              width: { size: 20, type: WidthType.PERCENTAGE },
            })
          )
        }))
      ];
      const table = new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      });
      const docx = new Document({
        sections: [{
          children: [title, table],
        }],
      });
      const blob = await Packer.toBlob(docx);
      saveAs(blob, `users_export_${onlySelected ? 'selected' : 'all'}.docx`);
    }
  };

  // Import Handler
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'csv' | 'json') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileType(type);
    setImportFileName(file.name);
    if (type === 'json') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target?.result as string);
          // Validate: must be array, each user must have uid, fullName, email
          if (!Array.isArray(data)) {
            toast.error('Backup file format invalid: must be a JSON array of users');
            return;
          }
          const invalidUser = data.find((u: any) => !u.uid || !u.fullName || !u.email);
          if (invalidUser) {
            toast.error('Backup file format invalid: each user must have uid, fullName, and email');
            return;
          }
          setImportPreview(data);
          setShowImportModal(true);
        } catch {
          toast.error('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    } else if (type === 'csv') {
      Papa.parse<UserData>(file, {
        header: true,
        complete: (results: Papa.ParseResult<UserData>) => {
          setImportPreview(results.data as UserData[]);
          setShowImportModal(true);
        },
        error: () => toast.error('Invalid CSV file'),
      });
    }
  };

  // Backup Handler (same as export all JSON)
  const handleBackup = () => handleExport('json', false);

  // Restore Handler (same as import JSON)
  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => handleImportFile(e, 'json');

  // Confirm Restore Handler: Write all imported users to Firestore
  const handleConfirmRestore = async () => {
    // Only restore users with required fields
    const validUsers = filteredImportPreview.filter(u => importSelected.has(u.uid) && u.uid && u.fullName && u.email);
    const skippedUsers = filteredImportPreview.filter(u => importSelected.has(u.uid) && (!u.uid || !u.fullName || !u.email));
    if (validUsers.length === 0) {
      toast.error('No valid users selected for restore. Each user must have uid, fullName, and email.');
      return;
    }
    if (skippedUsers.length > 0) {
      toast('Some users were skipped due to missing required fields: ' + skippedUsers.map(u => u.fullName || u.email || u.uid || 'Unknown').join(', '), { icon: '⚠️' });
    }
    setLoading(true);
    toast.loading('Restoring users to database...', { id: 'restore-users' });
    try {
      await Promise.all(validUsers.map(user => {
        const userRef = doc(db, 'users', user.uid);
        return setDoc(userRef, user, { merge: true });
      }));
      toast.success('Users restored successfully', { id: 'restore-users' });
      setShowImportModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error restoring users:', error);
      toast.error('Failed to restore users', { id: 'restore-users' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRestore = () => {
    setShowImportModal(false);
    toast('User restore cancelled', { icon: '⚠️' });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const usersData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserData[];
      
      setUsers(usersData);
      } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user: UserData) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleEditClick = (user: UserData) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName,
      contactNumber: user.contactNumber,
      country: user.country,
      instrumentTypes: Array.isArray(user.instrumentTypes)
        ? user.instrumentTypes
        : (typeof user.instrumentTypes === 'string' && (user.instrumentTypes as string) && (user.instrumentTypes as string).length > 0 ? (user.instrumentTypes as string).split(',').map((i: string) => i.trim()) : []),
      singingTypes: Array.isArray(user.singingTypes)
        ? user.singingTypes
        : (typeof user.singingTypes === 'string' && (user.singingTypes as string) && (user.singingTypes as string).length > 0 ? (user.singingTypes as string).split(',').map((i: string) => i.trim()) : []),
      musicCulture: user.musicCulture,
      bio: user.bio,
      talentDescription: user.talentDescription,
      interests: Array.isArray(user.interests)
        ? user.interests
        : (typeof user.interests === 'string' && (user.interests as string) && (user.interests as string).length > 0 ? (user.interests as string).split(',').map((i: string) => i.trim()) : []),
      experience: user.experience,
      goals: user.goals,
      gender: user.gender,
      profileImagePath: user.profileImagePath,
      instagram: user.instagram,
      facebook: user.facebook,
      youtube: user.youtube,
      linkedin: user.linkedin,
      tiktok: user.tiktok,
      spotify: user.spotify,
      socialLinks: user.socialLinks,
    });
    setShowEditModal(true);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const userRef = doc(db, 'users', selectedUser.uid);
      let statusUpdate: Partial<UserData> = {};
      if (newStatus === 'deactivate') {
        statusUpdate = { deactivated: true };
      } else if (newStatus === 'reactivate') {
        statusUpdate = { deactivated: false };
      } else {
        statusUpdate = {
          verificationStatus: newStatus as UserData['verificationStatus'],
          isVerified: newStatus === 'verified',
          lastUpdated: new Date()
        };
      }
      await updateDoc(userRef, statusUpdate);
      // Update local state
      setUsers(users.map(u =>
        u.uid === selectedUser.uid
          ? { ...u, ...statusUpdate }
          : u
      ));
      toast.success(
        newStatus === 'deactivate'
          ? 'User account deactivated'
          : newStatus === 'reactivate'
            ? 'User account reactivated'
            : `User status updated to ${newStatus}`
      );
      setShowStatusModal(false);
      setShowUserModal(false);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (updatedUserData: Partial<UserData>) => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const userRef = doc(db, 'users', selectedUser.uid);
      
      await updateDoc(userRef, {
        ...updatedUserData,
        lastUpdated: new Date()
      });
      
      // Update local state
      setUsers(users.map(u => 
        u.uid === selectedUser.uid 
          ? { ...u, ...updatedUserData }
          : u
      ));

      toast.success('User details updated successfully');
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating user details:', error);
      toast.error('Failed to update user details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user: UserData) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setLoading(true);
      const userRef = doc(db, 'users', userToDelete.uid);
      
      // Delete the user document
      await deleteDoc(userRef);
      
      // Update local state by removing the deleted user
      setUsers(users.filter(u => u.uid !== userToDelete.uid));

      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  // Bulk selection functions
  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.uid)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.size === 0) return;

    try {
      setLoading(true);
      const selectedUserData = users.filter(u => selectedUsers.has(u.uid));
      
      switch (bulkAction) {
        case 'verify':
          await Promise.all(selectedUserData.map(async (user) => {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              verificationStatus: 'verified',
              isVerified: true,
              lastUpdated: new Date()
            });
          }));
          toast.success(`${selectedUsers.size} users verified successfully`);
          break;

        case 'reject':
          await Promise.all(selectedUserData.map(async (user) => {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              verificationStatus: 'rejected',
              isVerified: false,
              lastUpdated: new Date()
            });
          }));
          toast.success(`${selectedUsers.size} users rejected successfully`);
          break;

        case 'activate':
          await Promise.all(selectedUserData.map(async (user) => {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              verificationStatus: 'active',
              isVerified: true,
              lastUpdated: new Date()
            });
          }));
          toast.success(`${selectedUsers.size} users activated successfully`);
          break;

        case 'delete':
          await Promise.all(selectedUserData.map(async (user) => {
            const userRef = doc(db, 'users', user.uid);
            await deleteDoc(userRef);
          }));
          toast.success(`${selectedUsers.size} users deleted successfully`);
          break;

        default:
          toast.error('Invalid action selected');
          return;
      }

      // Refresh users list
      await fetchUsers();
      setSelectedUsers(new Set());
      setShowBulkActionsModal(false);
      setBulkAction('');
      setBulkActionReason('');
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedUsersData = () => {
    return users.filter(u => selectedUsers.has(u.uid));
  };

  const getStatusBadge = (status: string | undefined, deactivated?: boolean) => {
    const defaultStatus = 'pending';
    const currentStatus = status || defaultStatus;
    if (deactivated) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
          <Ban size={14} className="mr-1" />
          Deactivated
        </span>
      );
    }
    const statusConfig = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
      verified: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
      rejected: { color: 'bg-red-500/20 text-red-400', icon: XCircle },
      active: { color: 'bg-blue-500/20 text-blue-400', icon: UserCheck }
    };
    const config = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon size={14} className="mr-1" />
        {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
      </span>
    );
  };

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    
    // If it's a Firestore timestamp
    if (date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    
    // If it's a regular Date object
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    
    // If it's a string or number timestamp
    try {
      return new Date(date).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Memoized filtered users for better performance
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (user.fullName?.toLowerCase() || '').includes(searchLower) ||
        (user.email?.toLowerCase() || '').includes(searchLower) ||
        (user.country?.toLowerCase() || '').includes(searchLower);
      
      const matchesStatus = statusFilter === 'all' || user.verificationStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const messageData = {
        senderId: user?.uid,
        receiverId: selectedUser.uid,
        content: newMessage,
        timestamp: serverTimestamp(),
        type: 'text'
      };

      await addDoc(collection(db, 'messages'), messageData);
      setNewMessage('');
      toast.success('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const generateUserInsights = async () => {
    if (!selectedUser) return;

    setIsGeneratingInsights(true);
    try {
      // Simulate AI analysis with a delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newInsights: UserInsight[] = [
        {
          type: 'talent',
          title: 'Musical Versatility',
          description: 'Shows exceptional adaptability across multiple musical styles and instruments.',
          confidence: 0.92,
          timestamp: new Date()
        },
        {
          type: 'potential',
          title: 'Collaboration Potential',
          description: 'Demonstrates strong communication skills and openness to new ideas.',
          confidence: 0.88,
          timestamp: new Date()
        },
        {
          type: 'achievement',
          title: 'Performance Excellence',
          description: 'Consistently delivers high-quality performances with attention to detail.',
          confidence: 0.95,
          timestamp: new Date()
        },
        {
          type: 'recommendation',
          title: 'Growth Opportunities',
          description: 'Could benefit from exploring fusion genres and digital music production.',
          confidence: 0.85,
          timestamp: new Date()
        }
      ];

      setUserInsights(newInsights);
      toast.success('User insights generated successfully');
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate insights');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const scheduleCommunication = async (type: 'chat' | 'call' | 'video') => {
    if (!selectedUser) return;

    try {
      const sessionData = {
        userId: selectedUser.uid,
        type,
        status: 'scheduled',
        startTime: serverTimestamp(),
        notes: '',
        createdBy: user?.uid
      };

      await addDoc(collection(db, 'communicationSessions'), sessionData);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} session scheduled successfully`);
    } catch (error) {
      console.error('Error scheduling session:', error);
      toast.error('Failed to schedule session');
    }
  };

  const renderCommunicationSection = () => (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">Communication</h3>
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => {
            setShowUserModal(false);
            setShowCommunicationModal(true);
          }}
          className="flex flex-col items-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
        >
          <MessageSquare size={24} className="text-primary-400 mb-2" />
          <span className="text-sm">Chat</span>
        </button>
        <button
          onClick={() => scheduleCommunication('call')}
          className="flex flex-col items-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
        >
          <PhoneCall size={24} className="text-primary-400 mb-2" />
          <span className="text-sm">Call</span>
        </button>
        <button
          onClick={() => scheduleCommunication('video')}
          className="flex flex-col items-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
        >
          <Video size={24} className="text-primary-400 mb-2" />
          <span className="text-sm">Video</span>
        </button>
      </div>
    </div>
  );

  const renderAIInsightsSection = () => (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400">AI Insights</h3>
        <button
          onClick={generateUserInsights}
          className="flex items-center text-sm text-primary-400 hover:text-primary-300"
          disabled={isGeneratingInsights}
        >
          {isGeneratingInsights ? (
            <>
              <Loader size={16} className="animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={16} className="mr-2" />
              Generate Insights
            </>
          )}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {userInsights.map((insight, index) => (
          <div
            key={index}
            className="p-4 bg-dark-700 rounded-lg"
          >
            <div className="flex items-center mb-2">
              {insight.type === 'talent' && <Music2 size={16} className="text-yellow-400 mr-2" />}
              {insight.type === 'potential' && <TrendingUp size={16} className="text-green-400 mr-2" />}
              {insight.type === 'achievement' && <Trophy size={16} className="text-blue-400 mr-2" />}
              {insight.type === 'recommendation' && <Lightbulb size={16} className="text-purple-400 mr-2" />}
              <span className="text-sm font-medium">{insight.title}</span>
            </div>
            <p className="text-sm text-gray-400">{insight.description}</p>
            <div className="mt-2 flex items-center">
              <div className="flex-1 h-1 bg-dark-600 rounded-full">
                <div
                  className="h-1 bg-primary-500 rounded-full"
                  style={{ width: `${insight.confidence * 100}%` }}
                />
              </div>
              <span className="ml-2 text-xs text-gray-400">
                {Math.round(insight.confidence * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCommunicationModal = () => (
    <AnimatePresence>
      {showCommunicationModal && selectedUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowCommunicationModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-dark-800 rounded-lg w-full max-w-2xl h-[600px] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-dark-600 flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-20 w-20 rounded-full bg-dark-600 overflow-hidden">
                  <ProfileImage
                    src={selectedUser.profileImagePath}
                    alt={selectedUser.fullName}
                  />
                </div>
                <div className="ml-3">
                  <h3 className="font-medium">{selectedUser.fullName}</h3>
                  <p className="text-sm text-gray-400">Online</p>
                </div>
              </div>
              <button
                onClick={() => setShowCommunicationModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.senderId === user?.uid
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-700 text-gray-200'
                    }`}
                  >
                    <p className="text-sm"><span style={{ fontFamily: 'inherit', fontSize: '1.15em' }}>{message.content}</span></p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {formatDate(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-dark-600">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Send size={20} className="text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Filtered import preview users
  const filteredImportPreview = useMemo(() => {
    return importPreview.filter(user => {
      const searchLower = importSearch.toLowerCase();
      const matchesSearch =
        (user.fullName?.toLowerCase() || '').includes(searchLower) ||
        (user.email?.toLowerCase() || '').includes(searchLower) ||
        (user.country?.toLowerCase() || '').includes(searchLower);
      const matchesStatus =
        importStatusFilter === 'all' || user.verificationStatus === importStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [importPreview, importSearch, importStatusFilter]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">User Management</h1>
        <p className="text-gray-400">Manage and monitor user accounts</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
              placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
          />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="active">Active</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedUsers.size > 0 && (
        <div className="bg-dark-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear Selection
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setBulkAction('verify');
                  setShowBulkActionsModal(true);
                }}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center"
              >
                <CheckCircle size={16} className="mr-1" />
                Verify
              </button>
              <button
                onClick={() => {
                  setBulkAction('activate');
                  setShowBulkActionsModal(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center"
              >
                <UserCheck size={16} className="mr-1" />
                Activate
              </button>
              <button
                onClick={() => {
                  setBulkAction('reject');
                  setShowBulkActionsModal(true);
                }}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors flex items-center"
              >
                <XCircle size={16} className="mr-1" />
                Reject
              </button>
              <button
                onClick={() => {
                  setBulkAction('delete');
                  setShowBulkActionsModal(true);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center"
              >
                <Trash2 size={16} className="mr-1" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Data Management Toolbar above the user table */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 mb-4">
        <div className="relative group">
          <button className="btn-primary px-4 py-2 rounded-lg font-medium">Export ▼</button>
          <div className="absolute left-0 mt-2 w-48 bg-dark-700 rounded-lg shadow-lg z-10 hidden group-hover:block">
            <button className="block w-full text-left px-4 py-2 hover:bg-dark-600" onClick={() => handleExport('csv', selectedUsers.size > 0)}>Export CSV</button>
            <button className="block w-full text-left px-4 py-2 hover:bg-dark-600" onClick={() => handleExport('excel', selectedUsers.size > 0)}>Export Excel</button>
            <button className="block w-full text-left px-4 py-2 hover:bg-dark-600" onClick={() => handleExport('json', selectedUsers.size > 0)}>Export JSON</button>
            <button className="block w-full text-left px-4 py-2 hover:bg-dark-600" onClick={() => handleExport('pdf', selectedUsers.size > 0)}>Export PDF</button>
            <button className="block w-full text-left px-4 py-2 hover:bg-dark-600" onClick={() => handleExport('word', selectedUsers.size > 0)}>Export Word</button>
          </div>
        </div>
        <div className="relative group">
          <button className="btn-primary px-4 py-2 rounded-lg font-medium">Import ▼</button>
          <div className="absolute left-0 mt-2 w-40 bg-dark-700 rounded-lg shadow-lg z-10 hidden group-hover:block">
            <label className="block w-full text-left px-4 py-2 hover:bg-dark-600 cursor-pointer">
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={e => handleImportFile(e, 'csv')} />
            </label>
            <label className="block w-full text-left px-4 py-2 hover:bg-dark-600 cursor-pointer">
              Import JSON
              <input type="file" accept=".json" className="hidden" onChange={e => handleImportFile(e, 'json')} />
            </label>
          </div>
        </div>
        <button className="btn-outline px-4 py-2 rounded-lg font-medium" onClick={handleBackup}>Backup All</button>
        <button
          className="btn-outline px-4 py-2 rounded-lg font-medium"
          onClick={() => handleExport('json', true)}
          disabled={selectedUsers.size === 0}
        >
          Backup Selected
        </button>
        <label className="btn-outline px-4 py-2 rounded-lg font-medium cursor-pointer">
          Restore
          <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
        </label>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="bg-dark-800 rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mr-3"></div>
            <span className="text-gray-400">Loading users...</span>
          </div>
        </div>
      ) : (
        <div className="bg-dark-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[600px] sm:min-w-0">
              <thead>
                <tr className="bg-dark-700">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={handleSelectAll}
                        className="mr-3 rounded border-gray-600 bg-dark-600 text-primary-500 focus:ring-primary-500 focus:ring-2"
                      />
                      Select All
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr 
                      key={user.uid}
                      className="hover:bg-dark-700/50 cursor-pointer transition-colors"
                      onClick={(e) => {
                        // Only open modal if not clicking on a checkbox or its label
                        if (
                          e.target instanceof HTMLInputElement ||
                          (e.target instanceof HTMLElement && e.target.closest('input[type="checkbox"]'))
                        ) {
                          return;
                        }
                        handleUserClick(user);
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.uid)}
                          onChange={(e) => {
                            handleSelectUser(user.uid);
                          }}
                          onClick={e => e.stopPropagation()} // Prevent row click
                          className="rounded border-gray-600 bg-dark-600 text-primary-500 focus:ring-primary-500 focus:ring-2"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-dark-600 overflow-hidden flex-shrink-0">
                            <ProfileImage
                              src={user.profileImagePath}
                              alt={user.fullName} 
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium">{user.fullName}</div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{user.contactNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{getCountryDisplay(user.country)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.verificationStatus, user.deactivated)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(user);
                            }}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(user);
                              setShowStatusModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                          >
                            <UserCog size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(user);
                            }}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* User Details Modal */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto"
            style={{ maxHeight: '100vh' }}
            onClick={() => setShowUserModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-800 rounded-lg w-full max-w-2xl overflow-y-auto max-h-[95vh] sm:max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4">
                  <div className="flex items-center">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-dark-600 overflow-hidden">
                      <ProfileImage
                        src={selectedUser.profileImagePath}
                        alt={selectedUser.fullName} 
                      />
                    </div>
                    <div className="ml-4">
                      <h2 className="text-lg sm:text-xl font-bold">{selectedUser.fullName}</h2>
                      <div className="flex items-center mt-1">
                        {getStatusBadge(selectedUser.verificationStatus, selectedUser.deactivated)}
                      </div>
                      {/* Joined Date Section */}
                      <div className="mt-2 text-xs text-gray-400">
                        {selectedUser.createdAt && (
                          <>
                            Joined: {(() => {
                              let dateObj = selectedUser.createdAt;
                              if (dateObj && typeof dateObj.toDate === 'function') {
                                dateObj = dateObj.toDate();
                              } else if (typeof dateObj === 'string' || typeof dateObj === 'number') {
                                dateObj = new Date(dateObj);
                              }
                              if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
                                return dateObj.toLocaleString(undefined, {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                });
                              }
                              return 'Unknown';
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="text-gray-400 hover:text-white self-start"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Mail size={16} className="text-primary-400 mr-2" />
                        {selectedUser.email}
                      </div>
                      <div className="flex items-center text-sm">
                        <Phone size={16} className="text-primary-400 mr-2" />
                        {selectedUser.contactNumber}
                      </div>
                    </div>
                  </div>
                  {/* Social Media Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Social Media</h3>
                    {(() => {
                      const getSocialValue = (user: any, key: string) => user[key] || (user.socialLinks && user.socialLinks[key]) || '';
                      const instagram = getSocialValue(selectedUser, 'instagram');
                      const facebook = getSocialValue(selectedUser, 'facebook');
                      const youtube = getSocialValue(selectedUser, 'youtube');
                      const linkedin = getSocialValue(selectedUser, 'linkedin');
                      const tiktok = getSocialValue(selectedUser, 'tiktok');
                      const spotify = getSocialValue(selectedUser, 'spotify');
                      return (
                        <div className="flex flex-col gap-2">
                          {instagram && (
                            <a
                              href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-pink-400 hover:underline"
                            >
                              <span className="text-lg">
                                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.2 2.4.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.5.3 1.2.4 2.4.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.9-.4 2.4-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.5.2-1.2.3-2.4.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.2-2.4-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.5-.3-1.2-.4-2.4C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.9.4-2.4.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.5-.2 1.2-.3 2.4-.4C8.4 2.2 8.8 2.2 12 2.2zm0-2.2C8.7 0 8.3 0 7 .1 5.7.2 4.7.4 3.9.7c-.9.3-1.6.7-2.3 1.4C.4 3.1 0 3.8.7 4.7c.3.9.5 1.8.6 3.1C1.2 8.3 1.2 8.7 1.2 12c0 3.3 0 3.7.1 5 .1 1.3.3 2.2.6 3.1.3.9.7 1.6 1.4 2.3.7.7 1.4 1.1 2.3 1.4.9.3 1.8.5 3.1.6 1.3.1 1.7.1 5 .1s3.7 0 5-.1c1.3-.1 2.2-.3 3.1-.6.9-.3 1.6-.7 2.3-1.4.7-.7 1.1-1.4 1.4-2.3.3-.9.5-1.8.6-3.1.1-1.3.1-1.7.1-5s0-3.7-.1-5c-.1-1.3-.3-2.2-.6-3.1-.3-.9-.7-1.6-1.4-2.3-.7-.7-1.4-1.1-2.3-1.4-.9-.3-1.8-.5-3.1-.6C15.7 0 15.3 0 12 0z"/><circle cx="12" cy="12" r="3.6"/><circle cx="18.4" cy="5.6" r="1.1"/></svg>
                              </span>
                              Instagram
                            </a>
                          )}
                          {facebook && (
                            <a
                              href={facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-500 hover:underline"
                            >
                              <span className="text-lg">
                                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.6 0 0 .6 0 1.326v21.348C0 23.4.6 24 1.326 24h11.495v-9.294H9.691v-3.622h3.13V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.4 24 24 23.4 24 22.674V1.326C24 .6 23.4 0 22.675 0"/></svg>
                              </span>
                              Facebook
                            </a>
                          )}
                          {youtube && (
                            <a
                              href={youtube.startsWith('http') ? youtube : `https://youtube.com/${youtube}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-red-500 hover:underline"
                            >
                              <span className="text-lg">
                                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a2.994 2.994 0 0 0-2.112-2.112C19.163 3.5 12 3.5 12 3.5s-7.163 0-9.386.574A2.994 2.994 0 0 0 .502 6.186C0 8.409 0 12 0 12s0 3.591.502 5.814a2.994 2.994 0 0 0 2.112 2.112C4.837 20.5 12 20.5 12 20.5s7.163 0 9.386-.574a2.994 2.994 0 0 0 2.112-2.112C24 15.591 24 12 24 12s0-3.591-.502-5.814zM9.545 15.568V8.432l6.545 3.568-6.545 3.568z"/></svg>
                              </span>
                              YouTube
                            </a>
                          )}
                          {linkedin && (
                            <a
                              href={linkedin.startsWith('http') ? linkedin : `https://linkedin.com/in/${linkedin}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-700 hover:underline"
                            >
                              <span className="text-lg">
                                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.327-.025-3.037-1.849-3.037-1.851 0-2.132 1.445-2.132 2.939v5.667H9.358V9h3.414v1.561h.049c.476-.899 1.637-1.849 3.369-1.849 3.602 0 4.267 2.369 4.267 5.455v6.285zM5.337 7.433c-1.144 0-2.069-.926-2.069-2.068 0-1.143.925-2.069 2.069-2.069 1.143 0 2.068.926 2.068 2.069 0 1.142-.925 2.068-2.068 2.068zm1.777 13.019H3.56V9h3.554v11.452zM22.225 0H1.771C.792 0 0 .771 0 1.723v20.549C0 23.229.792 24 1.771 24h20.451C23.2 24 24 23.229 24 22.271V1.723C24 .771 23.2 0 22.225 0z"/></svg>
                              </span>
                              LinkedIn
                            </a>
                          )}
                          {tiktok && (
                            <a
                              href={tiktok.startsWith('http') ? tiktok : `https://tiktok.com/@${tiktok.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-black dark:text-white hover:underline"
                            >
                              <span className="text-lg">
                                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.25c-5.376 0-9.75 4.374-9.75 9.75s4.374 9.75 9.75 9.75 9.75-4.374 9.75-9.75-4.374-9.75-9.75-9.75zm0 18c-4.556 0-8.25-3.694-8.25-8.25s3.694-8.25 8.25-8.25 8.25 3.694 8.25 8.25-3.694 8.25-8.25 8.25zm2.25-8.25c0-1.242-1.008-2.25-2.25-2.25s-2.25 1.008-2.25 2.25 1.008 2.25 2.25 2.25 2.25-1.008 2.25-2.25zm-2.25 3.75c-2.071 0-3.75-1.679-3.75-3.75s1.679-3.75 3.75-3.75 3.75 1.679 3.75 3.75-1.679 3.75-3.75 3.75z"/></svg>
                              </span>
                              TikTok
                            </a>
                          )}
                          {spotify && (
                            <a
                              href={spotify.startsWith('http') ? spotify : `https://open.spotify.com/artist/${spotify}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-green-500 hover:underline"
                            >
                              <span className="text-lg">
                                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-6.627-5.373-12-12-12zm3.707 17.293c-.391.391-1.023.391-1.414 0l-2.293-2.293-2.293 2.293c-.391.391-1.023.391-1.414 0s-.391-1.023 0-1.414l2.293-2.293-2.293-2.293c-.391-.391-.391-1.023 0-1.414s1.023-.391 1.414 0l2.293 2.293 2.293-2.293c.391-.391 1.023-.391 1.414 0s.391 1.023 0 1.414l-2.293 2.293 2.293 2.293c.391.391.391 1.023 0 1.414z"/></svg>
                              </span>
                              Spotify
                            </a>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Location</h3>
                    <div className="flex items-center text-sm">
                      <MapPin size={16} className="text-primary-400 mr-2" />
                      {getCountryDisplay(selectedUser.country)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Musical Background</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Music size={16} className="text-primary-400 mr-2" />
                        {selectedUser.instrumentTypes && selectedUser.instrumentTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedUser.instrumentTypes.map((inst, idx) => (
                              <span key={idx} className="bg-dark-600 text-gray-300 px-2 py-1 rounded-full text-xs mr-1">{inst}</span>
                            ))}
                          </div>
                        ) : 'None'}
                      </div>
                      {selectedUser.singingTypes && selectedUser.singingTypes.length > 0 && (
                        <div className="flex items-center text-sm">
                          <Mic size={16} className="text-primary-400 mr-2" />
                          <div className="flex flex-wrap gap-1">
                            {selectedUser.singingTypes.map((style, idx) => (
                              <span key={idx} className="bg-dark-600 text-gray-300 px-2 py-1 rounded-full text-xs mr-1">{style}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Talent Description</h3>
                    <p className="text-sm text-gray-300">{selectedUser.talentDescription}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.interests?.map((interest, index) => (
                        <span key={index} className="bg-dark-600 text-gray-300 px-2 py-1 rounded-full text-xs">{interest}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Experience</h3>
                    <p className="text-sm text-gray-300">{selectedUser.experience}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Goals</h3>
                    <p className="text-sm text-gray-300">{selectedUser.goals}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Gender</h3>
                    <p className="text-sm text-gray-300">{selectedUser.gender || 'Not specified'}</p>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Bio</h3>
                  <p className="text-sm text-gray-300">{selectedUser.bio}</p>
                </div>

                {renderCommunicationSection()}
                {renderAIInsightsSection()}

                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => {
                      setShowUserModal(false);
                      handleEditClick(selectedUser);
                    }}
                    className="btn-outline w-full sm:w-auto"
                  >
                    Edit Details
                  </button>
                  <button
                    onClick={() => {
                      setShowUserModal(false);
                      setShowStatusModal(true);
                    }}
                    className="btn-primary w-full sm:w-auto"
                  >
                    Change Status
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <EditProfileModal
        open={showEditModal}
        user={selectedUser}
        onSave={handleEditSubmit}
        onCancel={() => setShowEditModal(false)}
      />

      {/* Status Change Modal */}
      <AnimatePresence>
        {showStatusModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowStatusModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-lg w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Change User Status</h2>
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      New Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                    >
                      <option value="">Select a status</option>
                      <option value="verified">Verify User</option>
                      <option value="rejected">Reject User</option>
                      <option value="active">Activate User</option>
                      <option value="pending">Set to Pending</option>
                      <option value="deactivate">Deactivate Account</option>
                      <option value="reactivate">Reactivate Account</option>
                    </select>
              </div>
              
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Reason for Change
                    </label>
                    <textarea
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      rows={3}
                      placeholder="Enter reason for status change..."
                      className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                    />
                  </div>
            </div>
            
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedStatus)}
                    className="btn-primary"
                    disabled={!selectedStatus || loading}
                  >
                    {loading ? (
                      <>
                        <Loader size={16} className="animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check size={16} className="mr-2" />
                        Update Status
                      </>
                    )}
                  </button>
                </div>
            </div>
            </motion.div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && userToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-lg w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-red-400">Delete User</h2>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <div className="h-12 w-12 rounded-full bg-dark-600 overflow-hidden flex-shrink-0">
                      <ProfileImage
                        src={userToDelete.profileImagePath}
                        alt={userToDelete.fullName} 
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-lg font-semibold">{userToDelete.fullName}</div>
                      <div className="text-sm text-gray-400">{userToDelete.email}</div>
                    </div>
                  </div>
                  
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle size={20} className="text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold text-red-400 mb-2">Warning: This action cannot be undone</h3>
                        <p className="text-sm text-gray-300">
                          You are about to permanently delete this user account. This will remove all user data including profile information, messages, and any associated content.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader size={16} className="animate-spin mr-2" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} className="mr-2" />
                        Delete User
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions Confirmation Modal */}
      <AnimatePresence>
        {showBulkActionsModal && selectedUsers.size > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowBulkActionsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-lg w-full max-w-lg overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">
                    {bulkAction === 'verify' && 'Verify Users'}
                    {bulkAction === 'activate' && 'Activate Users'}
                    {bulkAction === 'reject' && 'Reject Users'}
                    {bulkAction === 'delete' && 'Delete Users'}
                  </h2>
                  <button
                    onClick={() => setShowBulkActionsModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <AlertCircle size={20} className="text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold text-blue-400 mb-2">
                          {bulkAction === 'verify' && 'Verify Selected Users'}
                          {bulkAction === 'activate' && 'Activate Selected Users'}
                          {bulkAction === 'reject' && 'Reject Selected Users'}
                          {bulkAction === 'delete' && 'Delete Selected Users'}
                        </h3>
                        <p className="text-sm text-gray-300">
                          You are about to {bulkAction} {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}.
                          {bulkAction === 'delete' && ' This action cannot be undone.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Selected Users:</h4>
                    <div className="space-y-2">
                      {getSelectedUsersData().map((user) => (
                        <div key={user.uid} className="flex items-center text-sm p-2 rounded hover:bg-dark-700 transition-colors">
                          <div className="h-6 w-6 rounded-full bg-dark-600 overflow-hidden flex-shrink-0 mr-2">
                            <ProfileImage
                              src={user.profileImagePath}
                              alt={user.fullName} 
                            />
                          </div>
                          <span className="text-gray-300 font-medium">{user.fullName}</span>
                          <span className="text-gray-500 ml-2">({user.email})</span>
                          <span className="text-gray-400 ml-2">{getCountryDisplay(user.country)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {bulkAction !== 'delete' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Reason for {bulkAction} (optional)
                      </label>
                      <textarea
                        value={bulkActionReason}
                        onChange={(e) => setBulkActionReason(e.target.value)}
                        rows={3}
                        placeholder={`Enter reason for ${bulkAction}...`}
                        className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowBulkActionsModal(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkAction}
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader size={16} className="animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} className="mr-2" />
                        {bulkAction === 'verify' && 'Verify'}
                        {bulkAction === 'activate' && 'Activate'}
                        {bulkAction === 'reject' && 'Reject'}
                        {bulkAction === 'delete' && 'Delete'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal (add Confirm Restore button) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 w-full max-w-3xl relative">
            {loading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 rounded-lg">
                <div className="flex flex-col items-center">
                  <span className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500 mb-2"></span>
                  <span className="text-primary-400 font-semibold">Restoring users...</span>
                </div>
              </div>
            )}
            <h2 className="text-xl font-bold mb-4">Import Preview - Detailed User Data</h2>
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-3 gap-2">
              <input
                type="text"
                value={importSearch}
                onChange={e => setImportSearch(e.target.value)}
                placeholder="Search users..."
                className="flex-1 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-primary-500"
                disabled={loading}
              />
              <select
                value={importStatusFilter}
                onChange={e => setImportStatusFilter(e.target.value)}
                className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-primary-500"
                disabled={loading}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="active">Active</option>
              </select>
              <div className="text-xs text-gray-400 mt-2 md:mt-0">
                Selected: {Array.from(importSelected).filter(uid => filteredImportPreview.some(u => u.uid === uid)).length} / {filteredImportPreview.length}
              </div>
            </div>
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={filteredImportPreview.length > 0 && filteredImportPreview.every(u => importSelected.has(u.uid))}
                onChange={() => {
                  const filteredUids = filteredImportPreview.map(u => u.uid);
                  if (filteredUids.every(uid => importSelected.has(uid))) {
                    // Unselect all filtered
                    setImportSelected(prev => {
                      const newSet = new Set(prev);
                      filteredUids.forEach(uid => newSet.delete(uid));
                      return newSet;
                    });
                  } else {
                    // Select all filtered
                    setImportSelected(prev => {
                      const newSet = new Set(prev);
                      filteredUids.forEach(uid => newSet.add(uid));
                      return newSet;
                    });
                  }
                }}
                disabled={loading || filteredImportPreview.length === 0}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Select All (filtered)</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto mb-4 space-y-6">
              {filteredImportPreview.length === 0 ? (
                <div className="text-center text-gray-400 py-8">No users found</div>
              ) : filteredImportPreview.map((user, idx) => (
                <div key={user.uid || idx} className="bg-dark-700 rounded-lg p-4 shadow border border-dark-600 flex flex-col md:flex-row md:items-center md:space-x-4">
                  <div className="flex flex-col items-center md:items-start md:w-12">
                    <input
                      type="checkbox"
                      checked={importSelected.has(user.uid)}
                      onChange={() => {
                        const newSet = new Set(importSelected);
                        if (newSet.has(user.uid)) newSet.delete(user.uid);
                        else newSet.add(user.uid);
                        setImportSelected(newSet);
                      }}
                      disabled={loading}
                      className="mb-2"
                    />
                    {/* Use ProfileImage for real-time, optimized preview */}
                    <div className="flex-shrink-0 h-16 w-16 rounded-full bg-dark-600 overflow-hidden">
                      <ProfileImage src={user.profileImagePath} alt={user.fullName} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-white">{user.fullName}</div>
                    <div className="text-sm text-gray-400">{user.email}</div>
                    <div className="text-sm text-gray-400">Contact: {user.contactNumber}</div>
                    <div className="text-sm text-gray-400">Country: {user.country}</div>
                    <div className="text-sm text-gray-400">Gender: {user.gender || 'Not specified'}</div>
                    <div className="text-sm text-gray-400">Status: {user.verificationStatus}</div>
                    <div className="text-sm text-gray-400">Role: {user.role}</div>
                    <div className="text-sm text-gray-400">Deactivated: {user.deactivated ? 'Yes' : 'No'}</div>
                    <div className="text-sm text-gray-400">Created: {user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleString() : new Date(user.createdAt).toLocaleString()) : 'Unknown'}</div>
                    <div className="text-sm text-gray-400">Last Updated: {user.lastUpdated ? (user.lastUpdated.toDate ? user.lastUpdated.toDate().toLocaleString() : new Date(user.lastUpdated).toLocaleString()) : 'Unknown'}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div>
                        <div className="font-medium text-gray-300 mb-1">Musical Info</div>
                        <div className="text-xs text-gray-400">Instruments: {user.instrumentTypes?.join(', ') || 'None'}</div>
                        <div className="text-xs text-gray-400">Singing Types: {user.singingTypes?.join(', ') || 'None'}</div>
                        <div className="text-xs text-gray-400">Music Culture: {user.musicCulture}</div>
                        <div className="text-xs text-gray-400">Talent: {user.talentDescription}</div>
                        <div className="text-xs text-gray-400">Experience: {user.experience}</div>
                        <div className="text-xs text-gray-400">Goals: {user.goals}</div>
                        <div className="text-xs text-gray-400">Bio: {user.bio}</div>
                        <div className="text-xs text-gray-400">Interests: {user.interests?.join(', ') || 'None'}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-300 mb-1">Social Links</div>
                        <div className="text-xs text-gray-400">Instagram: {user.instagram || user.socialLinks?.instagram || '-'}</div>
                        <div className="text-xs text-gray-400">Facebook: {user.facebook || user.socialLinks?.facebook || '-'}</div>
                        <div className="text-xs text-gray-400">YouTube: {user.youtube || user.socialLinks?.youtube || '-'}</div>
                        <div className="text-xs text-gray-400">LinkedIn: {user.linkedin || user.socialLinks?.linkedin || '-'}</div>
                        <div className="text-xs text-gray-400">TikTok: {user.tiktok || user.socialLinks?.tiktok || '-'}</div>
                        <div className="text-xs text-gray-400">Spotify: {user.spotify || user.socialLinks?.spotify || '-'}</div>
                        {user.socialLinks && Object.keys(user.socialLinks).map(key => (
                          !['instagram','facebook','youtube','linkedin','tiktok','spotify'].includes(key) ? (
                            <div key={key} className="text-xs text-gray-400">{key}: {user.socialLinks[key]}</div>
                          ) : null
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={handleCancelRestore} className="btn-outline" disabled={loading}>Cancel</button>
              <button onClick={handleConfirmRestore} className="btn-primary" disabled={loading || Array.from(importSelected).filter(uid => filteredImportPreview.some(u => u.uid === uid)).length === 0}>
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white inline-block mr-2"></span>
                    Restoring...
                  </>
                ) : 'Restore Users'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;