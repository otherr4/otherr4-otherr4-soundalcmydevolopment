import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  Users, 
  Music, 
  Star, 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye, 
  Clock, 
  Target, 
  Award, 
  Globe, 
  Lock, 
  Unlock, 
  Users as UsersIcon, 
  Music2, 
  Mic, 
  Guitar, 
  Piano, 
  Drum, 
  BadgeCheck, 
  AlertCircle, 
  Info, 
  HelpCircle, 
  ExternalLink, 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader,
  Edit,
  Trash2,
  MoreVertical,
  X
} from 'lucide-react';
import { 
  searchCollaborations, 
  applyToCollaboration, 
  incrementCollaborationViews,
  createCollaboration,
  getAllCollaborations,
  getUserCollaborations,
  updateCollaboration,
  deleteCollaboration
} from '../services/collaborationService';
import MusicianInvitationModal from '../components/collaboration/MusicianInvitationModal';
import { Collaboration, CollaborationFilter } from '../types/collaboration';
import SEO from '../components/common/SEO';

// Instrument icons mapping
const instrumentIcons: { [key: string]: React.ReactNode } = {
  'Vocals': <Mic className="w-4 h-4" />,
  'Guitar': <Guitar className="w-4 h-4" />,
  'Piano': <Piano className="w-4 h-4" />,
  'Drums': <Drum className="w-4 h-4" />,
  'Bass': <Guitar className="w-4 h-4" />,
  'Violin': <Music2 className="w-4 h-4" />,
  'Saxophone': <Music2 className="w-4 h-4" />,
  'Trumpet': <Music2 className="w-4 h-4" />,
  'Flute': <Music2 className="w-4 h-4" />,
  'Cello': <Music2 className="w-4 h-4" />,
  'Harp': <Music2 className="w-4 h-4" />,
  'Accordion': <Music2 className="w-4 h-4" />,
  'Harmonica': <Music2 className="w-4 h-4" />,
  'Ukulele': <Music2 className="w-4 h-4" />,
  'Banjo': <Music2 className="w-4 h-4" />,
  'Mandolin': <Music2 className="w-4 h-4" />,
  'Other': <Music2 className="w-4 h-4" />
};

// Edit collaboration modal component
const EditCollaborationModal: React.FC<{
  collaboration: Collaboration | null;
  onClose: () => void;
  onSave: (updatedCollaboration: Partial<Collaboration>) => void;
  isSaving: boolean;
}> = ({ collaboration, onClose, onSave, isSaving }) => {
  const [formData, setFormData] = useState<Partial<Collaboration>>({});

  useEffect(() => {
    if (collaboration) {
      setFormData({
        title: collaboration.title,
        description: collaboration.description,
        genre: collaboration.genre,
        instruments: collaboration.instruments,
        status: collaboration.status,
        privacy: collaboration.privacy,
        location: collaboration.location,
        compensation: collaboration.compensation,
        maxParticipants: collaboration.maxParticipants,
        requirements: collaboration.requirements
      });
    }
  }, [collaboration]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!collaboration) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Collaboration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2 font-medium">Title</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 font-medium">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2 font-medium">Genre</label>
              <select
                value={formData.genre || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
                required
              >
                <option value="">Select Genre</option>
                <option value="Pop">Pop</option>
                <option value="Rock">Rock</option>
                <option value="Jazz">Jazz</option>
                <option value="Classical">Classical</option>
                <option value="Hip Hop">Hip Hop</option>
                <option value="Country">Country</option>
                <option value="Electronic">Electronic</option>
                <option value="Folk">Folk</option>
                <option value="R&B">R&B</option>
                <option value="Blues">Blues</option>
                <option value="Reggae">Reggae</option>
                <option value="World Music">World Music</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-medium">Status</label>
              <select
                value={formData.status || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
                required
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2 font-medium">Privacy</label>
              <select
                value={formData.privacy || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, privacy: e.target.value as any }))}
                className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
                required
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="invite_only">Invite Only</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-medium">Location</label>
              <select
                value={formData.location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value as any }))}
                className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none"
                required
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2 font-medium">Requirements (one per line)</label>
            <textarea
              value={Array.isArray(formData.requirements) ? formData.requirements.join('\n') : ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                requirements: e.target.value.split('\n').filter(line => line.trim()) 
              }))}
              rows={3}
              className="w-full p-3 rounded-lg bg-dark-700 text-white border border-dark-600 focus:border-primary-500 focus:outline-none resize-none"
              placeholder="Enter requirements, one per line..."
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Collaboration card component
const CollaborationCard: React.FC<{
  collaboration: Collaboration;
  onApply: (collaborationId: string) => void;
  onView: (collaborationId: string) => void;
  onEdit: (collaboration: Collaboration) => void;
  onDelete: (collaborationId: string) => void;
  isApplying: boolean;
  setShareLink: (link: string) => void;
  setShowShareModal: (show: boolean) => void;
  currentUserId?: string;
  onInviteMusicians: (collaboration: Collaboration) => void;
  canJoinOrInvite: boolean;
}> = ({ 
  collaboration, 
  onApply, 
  onView, 
  onEdit, 
  onDelete, 
  isApplying, 
  setShareLink, 
  setShowShareModal,
  currentUserId,
  onInviteMusicians,
  canJoinOrInvite
}) => {
  const isCreator = currentUserId === collaboration.creatorId;
  const [showMenu, setShowMenu] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-purple-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCompensationIcon = (compensation: string) => {
    switch (compensation) {
      case 'paid': return <Award className="w-4 h-4 text-yellow-400" />;
      case 'revenue_share': return <Share2 className="w-4 h-4 text-green-400" />;
      case 'exposure': return <Eye className="w-4 h-4 text-blue-400" />;
      default: return <Heart className="w-4 h-4 text-red-400" />;
    }
  };

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'online': return <Globe className="w-4 h-4 text-blue-400" />;
      case 'offline': return <MapPin className="w-4 h-4 text-red-400" />;
      case 'hybrid': return <Target className="w-4 h-4 text-purple-400" />;
      default: return <MapPin className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-dark-800 rounded-xl p-6 border border-dark-700 hover:border-primary-500 transition-all duration-200 cursor-pointer relative"
      onClick={() => onView(collaboration.id)}
    >
      {/* Creator menu */}
      {isCreator && (
        <div className="absolute top-4 right-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 bg-dark-700 rounded-lg shadow-lg border border-dark-600 min-w-[120px] z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(collaboration);
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-300 hover:bg-dark-600 rounded-t-lg"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this collaboration?')) {
                    onDelete(collaboration.id);
                  }
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 w-full px-4 py-2 text-left text-red-400 hover:bg-dark-600 rounded-b-lg"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
            <Music className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{collaboration.title}</h3>
            <p className="text-sm text-gray-400">by {collaboration.creatorName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(collaboration.status)}`}>
            {collaboration.status.replace('_', ' ')}
          </span>
          {collaboration.isVerified && <BadgeCheck className="w-4 h-4 text-green-400" />}
        </div>
      </div>

      <p className="text-gray-300 mb-4 line-clamp-2">{collaboration.description}</p>

      <div className="flex items-center space-x-4 mb-4 text-sm text-gray-400">
        <div className="flex items-center space-x-1">
          {getLocationIcon(collaboration.location)}
          <span className="capitalize">{collaboration.location}</span>
        </div>
        <div className="flex items-center space-x-1">
          {getCompensationIcon(collaboration.compensation)}
          <span className="capitalize">{collaboration.compensation.replace('_', ' ')}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4" />
          <span>{collaboration.currentParticipants}/{collaboration.maxParticipants || '∞'}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {collaboration.instruments.slice(0, 5).map(instrument => (
            <span
              key={instrument}
              className="flex items-center space-x-1 px-2 py-1 bg-dark-700 rounded text-xs text-gray-300"
            >
              {instrumentIcons[instrument] || <Music2 className="w-3 h-3" />}
              <span>{instrument}</span>
            </span>
          ))}
          {collaboration.instruments.length > 5 && (
            <span className="px-2 py-1 bg-dark-700 rounded text-xs text-gray-400">
              +{collaboration.instruments.length - 5} more
            </span>
          )}
        </div>
        <span className="inline-block px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-xs font-semibold">
          {collaboration.genre}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>{collaboration.views}</span>
          </span>
          <span className="flex items-center space-x-1">
            <MessageCircle className="w-4 h-4" />
            <span>{collaboration.applications}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(collaboration.createdAt).toLocaleDateString()}</span>
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {collaboration.privacy === 'public' ? (
            <Unlock className="w-4 h-4 text-green-400" />
          ) : (
            <Lock className="w-4 h-4 text-yellow-400" />
          )}
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(collaboration.id);
          }}
          className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-colors"
        >
          View Details
        </button>
        {!isCreator && collaboration.status === 'open' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply(collaboration.id);
            }}
            disabled={isApplying}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {isApplying ? <Loader className="w-4 h-4 animate-spin" /> : 'Apply'}
          </button>
        )}
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        {isCreator && (
          <button
            className="btn-xs bg-green-600 hover:bg-green-700 text-white rounded px-2 py-1"
            onClick={e => {
              e.stopPropagation();
              onInviteMusicians(collaboration);
            }}
          >Invite Musicians</button>
        )}
        <button
          className="btn-xs bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1"
          onClick={e => {
            e.stopPropagation();
            setShareLink(window.location.origin + '/collaborations/' + collaboration.id);
            setShowShareModal(true);
          }}
        >Share</button>
      </div>
    </motion.div>
  );
};

// Filter component
const FilterPanel: React.FC<{
  filters: CollaborationFilter;
  onFilterChange: (filters: CollaborationFilter) => void;
}> = ({ filters, onFilterChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key: keyof CollaborationFilter, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-dark-800 rounded-lg border border-dark-700 text-white hover:bg-dark-700 transition-colors"
      >
        <Filter className="w-5 h-5" />
        <span>Filters</span>
        {Object.values(filters).some(v => v) && (
          <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-dark-800 rounded-lg border border-dark-700"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                <select
                  value={filters.genre || ''}
                  onChange={(e) => handleFilterChange('genre', e.target.value || undefined)}
                  className="w-full p-2 bg-dark-700 text-white rounded border border-dark-600 focus:border-primary-500 focus:outline-none"
                >
                  <option value="">All Genres</option>
                  <option value="Pop">Pop</option>
                  <option value="Rock">Rock</option>
                  <option value="Jazz">Jazz</option>
                  <option value="Classical">Classical</option>
                  <option value="Hip Hop">Hip Hop</option>
                  <option value="Country">Country</option>
                  <option value="Electronic">Electronic</option>
                  <option value="Folk">Folk</option>
                  <option value="R&B">R&B</option>
                  <option value="Blues">Blues</option>
                  <option value="Reggae">Reggae</option>
                  <option value="World Music">World Music</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Instrument</label>
                <select
                  value={filters.instrument || ''}
                  onChange={(e) => handleFilterChange('instrument', e.target.value || undefined)}
                  className="w-full p-2 bg-dark-700 text-white rounded border border-dark-600 focus:border-primary-500 focus:outline-none"
                >
                  <option value="">All Instruments</option>
                  <option value="Vocals">Vocals</option>
                  <option value="Guitar">Guitar</option>
                  <option value="Piano">Piano</option>
                  <option value="Drums">Drums</option>
                  <option value="Bass">Bass</option>
                  <option value="Violin">Violin</option>
                  <option value="Saxophone">Saxophone</option>
                  <option value="Trumpet">Trumpet</option>
                  <option value="Flute">Flute</option>
                  <option value="Cello">Cello</option>
                  <option value="Harp">Harp</option>
                  <option value="Accordion">Accordion</option>
                  <option value="Harmonica">Harmonica</option>
                  <option value="Ukulele">Ukulele</option>
                  <option value="Banjo">Banjo</option>
                  <option value="Mandolin">Mandolin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                  className="w-full p-2 bg-dark-700 text-white rounded border border-dark-600 focus:border-primary-500 focus:outline-none"
                >
                  <option value="">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                <select
                  value={filters.location || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                  className="w-full p-2 bg-dark-700 text-white rounded border border-dark-600 focus:border-primary-500 focus:outline-none"
                >
                  <option value="">All Locations</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Compensation</label>
                <select
                  value={filters.compensation || ''}
                  onChange={(e) => handleFilterChange('compensation', e.target.value || undefined)}
                  className="w-full p-2 bg-dark-700 text-white rounded border border-dark-600 focus:border-primary-500 focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                  <option value="revenue_share">Revenue Share</option>
                  <option value="exposure">Exposure</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => onFilterChange({})}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ShareModal placeholder
const ShareModal: React.FC<{ link: string; onClose: () => void }> = ({ link, onClose }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-dark-800 rounded-xl p-8 max-w-md w-full text-center">
      <h2 className="text-xl font-bold mb-4 text-white">Share Collaboration</h2>
      <input
        type="text"
        value={link}
        readOnly
        className="w-full p-2 mb-4 rounded bg-dark-700 text-white border border-dark-600"
        onFocus={e => e.target.select()}
      />
      <div className="flex justify-center gap-4 mb-4">
        <a href={`https://wa.me/?text=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" className="btn-xs bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1">WhatsApp</a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" className="btn-xs bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1">Facebook</a>
        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" className="btn-xs bg-blue-400 hover:bg-blue-500 text-white rounded px-3 py-1">Twitter</a>
        <button
          className="btn-xs bg-gray-600 hover:bg-gray-700 text-white rounded px-3 py-1"
          onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copied!'); }}
        >Copy</button>
      </div>
      <button className="btn-xs bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2" onClick={onClose}>Close</button>
    </div>
  </div>
);

const CollaborationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<CollaborationFilter>({});
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [editingCollab, setEditingCollab] = useState<Collaboration | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [selectedCollaboration, setSelectedCollaboration] = useState<Collaboration | null>(null);

  const creatorIdFromQuery = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('creatorId') || undefined;
  }, [location.search]);

  useEffect(() => {
    // Reset pagination when context changes
    setCurrentPage(1);
    loadCollaborations();
  }, [filters, currentPage, creatorIdFromQuery]);

  const loadCollaborations = async () => {
    try {
      setLoading(true);
      console.log('Loading collaborations with filters:', filters, 'page:', currentPage);
      
      // If a creatorId is specified in the URL, show ONLY that musician's created collaborations
      if (creatorIdFromQuery) {
        const createdByMusician = await getUserCollaborations(creatorIdFromQuery);
        console.log('Collaborations created by musician', creatorIdFromQuery, createdByMusician);
        setCollaborations(createdByMusician);
        setHasMore(false);
      } else {
        // If no filters are applied, get all collaborations
        if (Object.keys(filters).length === 0) {
          const allCollaborations = await getAllCollaborations();
          console.log('All collaborations loaded:', allCollaborations);
          setCollaborations(allCollaborations);
          setHasMore(false); // No pagination for all collaborations
        } else {
          const result = await searchCollaborations(filters, currentPage, 12);
          console.log('Search result:', result);
          if (currentPage === 1) {
            setCollaborations(result.collaborations);
          } else {
            setCollaborations(prev => [...prev, ...result.collaborations]);
          }
          setHasMore(result.hasMore);
        }
      }
    } catch (error) {
      console.error('Error loading collaborations:', error);
      toast.error('Failed to load collaborations');
      setCollaborations([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Don't modify the original collaborations array, just filter for display
  };

  const handleApply = async (collaborationId: string) => {
    if (!user) {
      toast.error('Please log in to apply for collaborations');
      return;
    }

    setApplyingTo(collaborationId);
    try {
      await applyToCollaboration(collaborationId, {
        applicantId: user.uid,
        applicantName: user.displayName || user.email || 'Musician',
        applicantAvatar: user.photoURL || undefined,
        instrument: 'Vocals', // This should be dynamic
        experience: 'I am passionate about music and would love to collaborate!',
        motivation: 'I want to be part of this amazing project and contribute my skills.',
      });
      toast.success('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying to collaboration:', error);
      toast.error('Failed to submit application');
    } finally {
      setApplyingTo(null);
    }
  };

  const handleView = async (collaborationId: string) => {
    try {
      await incrementCollaborationViews(collaborationId);
      navigate(`/collaborations/${collaborationId}`);
    } catch (error) {
      console.error('Error incrementing views:', error);
      navigate(`/collaborations/${collaborationId}`);
    }
  };

  const handleEdit = (collaboration: Collaboration) => {
    setEditingCollab(collaboration);
  };

  const handleSaveEdit = async (updatedData: Partial<Collaboration>) => {
    if (!editingCollab) return;

    setIsSaving(true);
    try {
      await updateCollaboration(editingCollab.id, updatedData);
      toast.success('Collaboration updated successfully!');
      
      // Reload collaborations to reflect changes
      loadCollaborations();
      setEditingCollab(null);
    } catch (error) {
      console.error('Error updating collaboration:', error);
      toast.error('Failed to update collaboration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (collaborationId: string) => {
    try {
      await deleteCollaboration(collaborationId);
      toast.success('Collaboration deleted successfully!');
      
      // Remove from local state
      setCollaborations(prev => prev.filter(c => c.id !== collaborationId));
    } catch (error) {
      console.error('Error deleting collaboration:', error);
      toast.error('Failed to delete collaboration');
    }
  };

  const handleInviteMusicians = (collaboration: Collaboration) => {
    setSelectedCollaboration(collaboration);
    setShowInvitationModal(true);
  };

  const createTestCollaboration = async () => {
    if (!user) {
      toast.error('Please log in to create a collaboration');
      return;
    }

    try {
      const testCollaboration = {
        title: 'Test Collaboration - We Are The World Cover',
        description: 'This is a test collaboration to verify the system is working correctly. We will be creating a cover version of "We Are The World" with multiple musicians from around the globe.',
        creatorId: user.uid,
        creatorName: user.displayName || user.email || 'Test Musician',
        creatorAvatar: user.photoURL || undefined,
        genre: 'Pop',
        instruments: ['Vocals', 'Guitar', 'Piano', 'Drums'],
        collaborationType: 'cover' as const,
        status: 'open' as const,
        privacy: 'public' as const,
        maxParticipants: 10,
        currentParticipants: 1,
        participants: [],
        requirements: ['Must be able to sing in English', 'Experience with pop music preferred'],
        timeline: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          milestones: []
        },
        attachments: [],
        tags: ['test', 'cover', 'pop'],
        location: 'online' as const,
        locationDetails: 'Online collaboration via SoundAlchemy',
        compensation: 'free' as const,
        compensationDetails: 'This is a free collaboration for exposure and experience',
        isVerified: true
      };

      console.log('Creating test collaboration:', testCollaboration);
      const collaborationId = await createCollaboration(testCollaboration);
      console.log('Test collaboration created with ID:', collaborationId);
      toast.success('Test collaboration created successfully!');
      
      // Reload collaborations
      loadCollaborations();
    } catch (error) {
      console.error('Error creating test collaboration:', error);
      toast.error('Failed to create test collaboration');
    }
  };

  // Helper to check if user is a friend of the creator
  const getIsFriend = (creatorFriends: string[] | undefined, userId: string | undefined) => {
    if (!Array.isArray(creatorFriends) || !userId) return false;
    return creatorFriends.includes(userId);
  };

  // Filter collaborations based on privacy and user
  const filteredCollaborations = collaborations.filter(collab => {
    if (collab.privacy === 'private') {
      return collab.creatorId === user?.uid;
    }
    if (collab.privacy === 'public') {
      return true;
    }
    if (collab.privacy === 'invite_only') {
      return Array.isArray(collab.invitedUids) && collab.invitedUids.includes(user?.uid || '');
    }
    return false;
  });

  // Helper to control join/apply/invite button
  const canJoinOrInvite = (collab: Collaboration) => {
    if (collab.privacy === 'private') {
      return collab.creatorId === user?.uid;
    }
    if (collab.privacy === 'public') {
      return collab.creatorId === user?.uid || getIsFriend(collab.creatorFriends, user?.uid);
    }
    if (collab.privacy === 'invite_only') {
      return Array.isArray(collab.invitedUids) && collab.invitedUids.includes(user?.uid || '');
    }
    return false;
  };

  return (
    <>
      <SEO
        title="Collaborations | SoundAlchemy – Find Musical Collaborations"
        description="Discover and join musical collaborations on SoundAlchemy. Find cover songs, original compositions, jam sessions, and more opportunities to collaborate with musicians worldwide."
        keywords="collaborations, music collaborations, find musicians, join collaboration, cover songs, original compositions, jam sessions"
        image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
        url="https://soundalcmy.com/collaborations"
        lang="en"
      />
      
      <div className="min-h-screen bg-dark-900 text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Collaborations</h1>
              <p className="text-gray-400">Discover and join amazing musical collaborations</p>
            </div>
            <div className="flex space-x-2 mt-4 md:mt-0">
              <button
                onClick={() => navigate('/start-collaboration')}
                className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Start Collaboration</span>
              </button>
              <button
                onClick={createTestCollaboration}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Create Test</span>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search collaborations..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <FilterPanel filters={filters} onFilterChange={setFilters} />
          </div>

          {/* Results */}
          {loading && currentPage === 1 ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : filteredCollaborations.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No collaborations found</h3>
              <p className="text-gray-400 mb-6">
                Try adjusting your search terms or filters to find more collaborations.
              </p>
              <button
                onClick={() => navigate('/start-collaboration')}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
              >
                Start Your Own Collaboration
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <AnimatePresence>
                  {filteredCollaborations.map((collaboration) => (
                    <CollaborationCard
                      key={collaboration.id}
                      collaboration={collaboration}
                      onApply={handleApply}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      isApplying={applyingTo === collaboration.id}
                      setShareLink={setShareLink}
                      setShowShareModal={setShowShareModal}
                      currentUserId={user?.uid}
                      onInviteMusicians={handleInviteMusicians}
                      canJoinOrInvite={canJoinOrInvite(collaboration)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="text-center">
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={loading}
                    className="px-6 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Modals */}
      {showShareModal && shareLink && <ShareModal link={shareLink} onClose={() => setShowShareModal(false)} />}
      {editingCollab && (
        <EditCollaborationModal
          collaboration={editingCollab}
          onClose={() => setEditingCollab(null)}
          onSave={handleSaveEdit}
          isSaving={isSaving}
        />
      )}
      {showInvitationModal && selectedCollaboration && (
        <MusicianInvitationModal
          collaboration={selectedCollaboration}
          isOpen={showInvitationModal}
          onClose={() => {
            setShowInvitationModal(false);
            setSelectedCollaboration(null);
          }}
        />
      )}
    </>
  );
};

export default CollaborationsPage; 