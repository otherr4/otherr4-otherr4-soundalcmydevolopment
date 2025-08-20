import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { messagingService } from '../../services/messagingService';
import { CallHistory, CallStats } from '../../types/messaging';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Video, 
  Clock, 
  Calendar,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  PhoneOff,
  Trash2,
  Redo2
} from 'lucide-react';
import { getProfileImageUrl } from '../../utils/profileImage';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';

interface CallHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

// Enhanced select styles for dark theme and portal
const enhancedSelectStyles = {
  control: (base: Record<string, any>, state: { isFocused: boolean }) => ({
    ...base,
    backgroundColor: '#1a1a1a',
    borderColor: state.isFocused ? '#3b82f6' : '#374151',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
    borderRadius: '0.75rem',
    padding: '2px',
    transition: 'all 200ms ease',
    minHeight: 36,
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#4b5563',
    },
  }),
  menu: (base: Record<string, any>) => ({
    ...base,
    backgroundColor: '#1a1a1a',
    border: '1px solid #374151',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  menuPortal: (base: Record<string, any>) => ({ ...base, zIndex: 9999 }),
  option: (base: Record<string, any>, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected 
      ? '#3b82f6' 
      : state.isFocused 
        ? 'rgba(59, 130, 246, 0.1)' 
        : 'transparent',
    color: state.isSelected ? 'white' : '#e5e7eb',
    padding: '10px 12px',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    fontSize: '0.9375rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    '&:active': {
      backgroundColor: '#3b82f6',
    },
  }),
  input: (base: Record<string, any>) => ({
    ...base,
    color: '#e5e7eb',
  }),
  singleValue: (base: Record<string, any>) => ({
    ...base,
    color: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  placeholder: (base: Record<string, any>) => ({
    ...base,
    color: '#6b7280',
  }),
};

const CallHistoryComponent: React.FC<CallHistoryProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
  const [callStats, setCallStats] = useState<CallStats>({
    totalCalls: 0,
    totalDuration: 0,
    missedCalls: 0,
    completedCalls: 0,
    averageDuration: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'audio' | 'video'>('all');
  const [filterDirection, setFilterDirection] = useState<'all' | 'incoming' | 'outgoing' | 'missed'>('all');
  const [loading, setLoading] = useState(true);

  // Subscribe to real call history
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubscribe = messagingService.subscribeToCallHistory(user.uid, (calls) => {
      setCallHistory(calls);
      setCallStats(calculateCallStats(calls));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const calculateCallStats = (history: CallHistory[]): CallStats => {
    const totalCalls = history.length;
    const completedCalls = history.filter(call => call.status === 'completed').length;
    const missedCalls = history.filter(call => call.status === 'missed').length;
    const totalDuration = history.reduce((sum, call) => sum + (call.duration || 0), 0);
    const averageDuration = completedCalls > 0 ? totalDuration / completedCalls : 0;
    return {
      totalCalls,
      totalDuration,
      missedCalls,
      completedCalls,
      averageDuration
    };
  };

  const getCallIcon = (call: CallHistory) => {
    const baseClasses = "w-5 h-5";
    if (call.type === 'video') {
      switch (call.direction) {
        case 'incoming':
          return <Video className={`${baseClasses} text-green-500`} />;
        case 'outgoing':
          return <Video className={`${baseClasses} text-blue-500`} />;
        case 'missed':
          return <Video className={`${baseClasses} text-red-500`} />;
        default:
          return <Video className={`${baseClasses} text-gray-500`} />;
      }
    } else {
      switch (call.direction) {
        case 'incoming':
          return <PhoneIncoming className={`${baseClasses} text-green-500`} />;
        case 'outgoing':
          return <PhoneOutgoing className={`${baseClasses} text-blue-500`} />;
        case 'missed':
          return <PhoneMissed className={`${baseClasses} text-red-500`} />;
        default:
          return <Phone className={`${baseClasses} text-gray-500`} />;
      }
    }
  };

  const getStatusIcon = (call: CallHistory) => {
    const baseClasses = "w-4 h-4";
    switch (call.status) {
      case 'completed':
        return <CheckCircle className={`${baseClasses} text-green-500`} />;
      case 'missed':
        return <XCircle className={`${baseClasses} text-red-500`} />;
      case 'rejected':
        return <PhoneOff className={`${baseClasses} text-red-500`} />;
      case 'busy':
      case 'no-answer':
        return <AlertCircle className={`${baseClasses} text-yellow-500`} />;
      default:
        return null;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredHistory = callHistory.filter(call => {
    const matchesSearch = call.participantName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || call.type === filterType;
    const matchesDirection = filterDirection === 'all' || call.direction === filterDirection;
    return matchesSearch && matchesType && matchesDirection;
  });

  // Delete call from history
  const handleDeleteCall = async (callId: string) => {
    if (!user) return;
    await messagingService.deleteCallFromHistory(callId, user.uid);
  };

  // Call back action
  const handleCallBack = (call: CallHistory) => {
    // This should trigger a call to the participant (audio or video)
    // You can wire this to your call initiation logic
    // For now, just log
    alert(`Calling back ${call.participantName} (${call.type})`);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-dark-800 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 md:w-6 md:h-6 text-primary-500" />
            <h2 className="text-lg md:text-xl font-bold text-white">Call History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="p-3 md:p-4 bg-dark-700 border-b border-dark-600">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-center">
            <div>
              <div className="text-lg md:text-2xl font-bold text-white">{callStats.totalCalls}</div>
              <div className="text-xs text-gray-400">Total Calls</div>
            </div>
            <div>
              <div className="text-lg md:text-2xl font-bold text-green-500">{callStats.completedCalls}</div>
              <div className="text-xs text-gray-400">Completed</div>
            </div>
            <div>
              <div className="text-lg md:text-2xl font-bold text-red-500">{callStats.missedCalls}</div>
              <div className="text-xs text-gray-400">Missed</div>
            </div>
            <div>
              <div className="text-lg md:text-2xl font-bold text-blue-500">
                {Math.round(callStats.averageDuration / 60)}m
              </div>
              <div className="text-xs text-gray-400">Avg Duration</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-3 md:p-4 border-b border-dark-700">
          <div className="flex flex-col md:flex-row gap-2 md:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search calls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm md:text-base"
              />
            </div>
            <div className="flex gap-2 min-w-0">
              <div className="w-32 min-w-[110px]">
                <Select
                  value={{ value: filterType, label: filterType === 'all' ? 'All Types' : filterType.charAt(0).toUpperCase() + filterType.slice(1) }}
                  onChange={opt => { if (opt) setFilterType(opt.value); }}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'audio', label: 'Audio' },
                    { value: 'video', label: 'Video' },
                  ]}
                  styles={enhancedSelectStyles}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  isSearchable={false}
                  classNamePrefix="react-select"
                  aria-label="Filter by type"
                />
              </div>
              <div className="w-32 min-w-[110px]">
                <Select
                  value={{ value: filterDirection, label: filterDirection === 'all' ? 'All Calls' : filterDirection.charAt(0).toUpperCase() + filterDirection.slice(1) }}
                  onChange={opt => { if (opt) setFilterDirection(opt.value); }}
                  options={[
                    { value: 'all', label: 'All Calls' },
                    { value: 'incoming', label: 'Incoming' },
                    { value: 'outgoing', label: 'Outgoing' },
                    { value: 'missed', label: 'Missed' },
                  ]}
                  styles={enhancedSelectStyles}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  isSearchable={false}
                  classNamePrefix="react-select"
                  aria-label="Filter by direction"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Call History List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Loading call history...</div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Phone className="w-12 h-12 md:w-16 md:h-16 mb-4 opacity-50" />
              <div className="text-base md:text-lg font-medium">No calls found</div>
              <div className="text-xs md:text-sm">Your call history will appear here</div>
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {filteredHistory.map((call, idx) => (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={
                    `bg-dark-800/90 border border-dark-700 shadow-sm md:shadow-lg rounded-xl mb-3 md:mb-2 p-3 md:p-4 transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center md:gap-4
                     ${idx !== filteredHistory.length - 1 ? 'md:border-b md:border-dark-800' : ''}
                     hover:shadow-xl hover:border-primary-500 focus-within:shadow-xl focus-within:border-primary-500`
                  }
                  onDoubleClick={() => handleCallBack(call)}
                  onContextMenu={e => { e.preventDefault(); handleDeleteCall(call.id); }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Call with ${call.participantName}`}
                >
                  {/* Top row: icon, avatar, name, verified, status */}
                  <div className="flex items-center gap-2 md:gap-4 w-full mb-1">
                    <span className="flex-shrink-0">{getCallIcon(call)}</span>
                    <img
                      src={getProfileImageUrl({ profileImagePath: call.participantAvatar })}
                      alt={call.participantName}
                      className="w-9 h-9 md:w-11 md:h-11 rounded-full object-cover border-2 border-dark-700"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                      }}
                    />
                    <span className="font-semibold text-base md:text-lg text-white truncate">
                      {call.participantName}
                    </span>
                    {call.isVerified && (
                      <span className="w-4 h-4 md:w-5 md:h-5 bg-primary-500 rounded-full flex items-center justify-center ml-1">
                        <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                      </span>
                    )}
                    <span className={
                      `flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-xs font-medium
                      ${call.status === 'completed' ? 'bg-green-900/60 text-green-400' : ''}
                      ${call.status === 'missed' ? 'bg-red-900/60 text-red-400' : ''}
                      ${call.status === 'rejected' ? 'bg-yellow-900/60 text-yellow-400' : ''}
                      ${call.status === 'busy' || call.status === 'no-answer' ? 'bg-yellow-900/60 text-yellow-400' : ''}
                      `
                    }>
                      {getStatusIcon(call)}
                      <span className="capitalize">{call.status}</span>
                    </span>
                  </div>
                  {/* Second row: direction, type, duration, time */}
                  <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-400 mb-1 md:mb-0 pl-11 md:pl-0">
                    <span className="flex items-center gap-1">
                      {call.direction === 'incoming' && <PhoneIncoming className="w-3 h-3 text-green-400" />}
                      {call.direction === 'outgoing' && <PhoneOutgoing className="w-3 h-3 text-blue-400" />}
                      {call.direction === 'missed' && <PhoneMissed className="w-3 h-3 text-red-400" />}
                      <span className="capitalize">{call.direction}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {call.type === 'video' ? <Video className="w-3 h-3 text-primary-400" /> : <Phone className="w-3 h-3 text-primary-400" />}
                      <span className="capitalize">{call.type}</span>
                    </span>
                    {call.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{formatDuration(call.duration)}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>{formatTime(call.timestamp)}</span>
                    </span>
                  </div>
                  {/* Actions: call back, delete */}
                  <div className="flex items-center justify-end gap-3 mt-2 md:mt-0 w-full md:w-auto min-w-[90px]">
                    <div className="flex items-center gap-2">
                      <button
                        className="group relative flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 hover:scale-110"
                        style={{ background: 'transparent', boxShadow: 'none' }}
                        title="Call Back"
                        aria-label={`Call back ${call.participantName}`}
                        onClick={() => handleCallBack(call)}
                      >
                        <Redo2 className="w-6 h-6 md:w-5 md:h-5 text-blue-400 group-hover:text-blue-500 transition-colors" />
                      </button>
                      <button
                        className="group relative flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 hover:scale-110"
                        style={{ background: 'transparent', boxShadow: 'none' }}
                        title="Delete Call"
                        aria-label={`Delete call with ${call.participantName}`}
                        onClick={() => handleDeleteCall(call.id)}
                      >
                        <Trash2 className="w-6 h-6 md:w-5 md:h-5 text-red-400 group-hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CallHistoryComponent; 