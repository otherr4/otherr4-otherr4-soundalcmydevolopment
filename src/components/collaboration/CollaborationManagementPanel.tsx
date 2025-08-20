import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  Settings, 
  Users, 
  FileText, 
  DollarSign, 
  BarChart3, 
  Edit, 
  UserPlus, 
  Check, 
  X, 
  AlertCircle, 
  Eye, 
  MessageSquare,
  UserMinus,
  Music,
  Headphones
} from 'lucide-react';
import { Collaboration, CollaborationApplication, CostItem } from '../../types/collaboration';
import { addParticipant, addCollaborationCost, removeCollaborationCost, updateCollaborationBudget } from '../../services/collaborationService';

interface CollaborationManagementPanelProps {
  collaboration: Collaboration;
  applications: CollaborationApplication[];
  onUpdateCollaboration: (updates: Partial<Collaboration>) => void;
  onReviewApplication: (applicationId: string, status: 'accepted' | 'rejected', message?: string) => void;
  onRemoveParticipant: (userId: string) => void;
  onInviteMusicians: () => void;
}

const CollaborationManagementPanel: React.FC<CollaborationManagementPanelProps> = ({
  collaboration,
  applications,
  onUpdateCollaboration,
  onReviewApplication,
  onRemoveParticipant,
  onInviteMusicians
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'participants' | 'costs'>('overview');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<CollaborationApplication | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const acceptedApplications = applications.filter(app => app.status === 'accepted');
  const rejectedApplications = applications.filter(app => app.status === 'rejected');

  const handleAcceptApplication = async (application: CollaborationApplication) => {
    try {
      // Add as participant
      await addParticipant(collaboration.id, {
        userId: application.applicantId,
        userName: application.applicantName,
        userAvatar: application.applicantAvatar,
        role: 'Musician',
        instrument: application.instrument
      });

      // Update application status
      await onReviewApplication(application.id, 'accepted', responseMessage || 'Welcome to the collaboration!');
      
      toast.success(`${application.applicantName} has been accepted!`);
      setShowApplicationModal(false);
      setSelectedApplication(null);
      setResponseMessage('');
    } catch (error) {
      console.error('Error accepting application:', error);
      toast.error('Failed to accept application');
    }
  };

  const handleRejectApplication = async (application: CollaborationApplication) => {
    try {
      await onReviewApplication(application.id, 'rejected', responseMessage || 'Thank you for your interest, but we cannot accept your application at this time.');
      toast.success('Application rejected');
      setShowApplicationModal(false);
      setSelectedApplication(null);
      setResponseMessage('');
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    }
  };

  return (
    <div className="bg-dark-800 rounded-xl p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary-400" />
          Collaboration Management
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onInviteMusicians}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invite Musicians
          </button>
        </div>
      </div>

      {/* Management Tabs */}
      <div className="flex border-b border-dark-700 mb-6">
        {[
          { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
          { key: 'applications', label: `Applications (${pendingApplications.length})`, icon: <FileText className="w-4 h-4" /> },
          { key: 'participants', label: 'Participants', icon: <Users className="w-4 h-4" /> },
          { key: 'costs', label: 'Costs & Budget', icon: <DollarSign className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors ${
              activeTab === tab.key
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-semibold text-white">Pending Applications</h3>
                </div>
                <p className="text-3xl font-bold text-yellow-400">{pendingApplications.length}</p>
                <p className="text-gray-400 text-sm">Need review</p>
              </div>
              
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold text-white">Active Participants</h3>
                </div>
                <p className="text-3xl font-bold text-green-400">{collaboration.currentParticipants}</p>
                <p className="text-gray-400 text-sm">of {collaboration.maxParticipants || '∞'} max</p>
              </div>
              
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-white">Total Views</h3>
                </div>
                <p className="text-3xl font-bold text-blue-400">{collaboration.views}</p>
                <p className="text-gray-400 text-sm">Collaboration views</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'applications' && (
          <motion.div
            key="applications"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Musician Applications</h3>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded text-sm">
                  {pendingApplications.length} Pending
                </span>
                <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-sm">
                  {acceptedApplications.length} Accepted
                </span>
                <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-sm">
                  {rejectedApplications.length} Rejected
                </span>
              </div>
            </div>

            {pendingApplications.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No pending applications</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApplications.map(application => (
                  <div key={application.id} className="bg-dark-700 rounded-lg p-4 border border-dark-600">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <img
                          src={application.applicantAvatar || '/default-avatar.svg'}
                          alt={application.applicantName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-white">{application.applicantName}</h4>
                            <span className="px-2 py-1 bg-primary-600/20 text-primary-400 rounded text-xs">
                              {application.instrument}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{application.experience}</p>
                          <p className="text-gray-300 text-sm">{application.motivation}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedApplication(application);
                            setShowApplicationModal(true);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'participants' && (
          <motion.div
            key="participants"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Current Participants</h3>
              <span className="text-gray-400">
                {collaboration.currentParticipants}/{collaboration.maxParticipants || '∞'}
              </span>
            </div>

            {collaboration.participants.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No participants yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {collaboration.participants.map((participant, index) => (
                  <div key={participant.userId} className="bg-dark-700 rounded-lg p-4 border border-dark-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={participant.userAvatar || '/default-avatar.svg'}
                          alt={participant.userName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <h4 className="font-semibold text-white">{participant.userName}</h4>
                          <p className="text-gray-400 text-sm">{participant.instrument} • {participant.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onRemoveParticipant(participant.userId)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'costs' && (
          <motion.div
            key="costs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-white">Costs & Budget Management</h3>

            {/* Quick Add Cost */}
            <div className="bg-dark-700 rounded-lg p-4">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const formData = new FormData(form);
                  const name = String(formData.get('name') || '').trim();
                  const amount = Number(formData.get('amount') || 0);
                  const category = String(formData.get('category') || 'other') as CostItem['category'];
                  if (!name || amount <= 0) return;
                  await addCollaborationCost(collaboration.id, {
                    name,
                    amount,
                    currency: 'USD',
                    category,
                    status: 'pending'
                  });
                  toast.success('Cost added');
                  onUpdateCollaboration({});
                  form.reset();
                }}
                className="grid grid-cols-1 md:grid-cols-4 gap-3"
              >
                <input name="name" placeholder="Item name" className="p-2 rounded bg-dark-800 border border-dark-600 text-white" />
                <input name="amount" type="number" step="0.01" placeholder="Amount" className="p-2 rounded bg-dark-800 border border-dark-600 text-white" />
                <select name="category" className="p-2 rounded bg-dark-800 border border-dark-600 text-white">
                  <option value="studio">Studio</option>
                  <option value="mixing">Mixing</option>
                  <option value="equipment">Equipment</option>
                  <option value="other">Other</option>
                </select>
                <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-semibold">+ Add</button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-dark-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Music className="w-5 h-5 text-blue-400" />
                  Studio & Recording
                </h4>
                <div className="space-y-2">
                  {(collaboration.budget?.items || [])
                    .filter(i => i.category === 'studio' || i.category === 'equipment')
                    .map(item => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span className="text-gray-300">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-white">${item.amount}</span>
                          <button
                            onClick={async () => {
                              await removeCollaborationCost(collaboration.id, item.id);
                              toast.success('Removed');
                              onUpdateCollaboration({});
                            }}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >-</button>
                        </div>
                      </div>
                    ))}
                  <hr className="border-dark-600" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-white">Total</span>
                    <span className="text-green-400">$
                      { (collaboration.budget?.items || [])
                        .filter(i => i.category === 'studio' || i.category === 'equipment')
                        .reduce((sum, i) => sum + (i.amount || 0), 0) }
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-dark-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-purple-400" />
                  Mixing & Mastering
                </h4>
                <div className="space-y-2">
                  {(collaboration.budget?.items || [])
                    .filter(i => i.category === 'mixing')
                    .map(item => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span className="text-gray-300">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-white">${item.amount}</span>
                          <button
                            onClick={async () => {
                              await removeCollaborationCost(collaboration.id, item.id);
                              toast.success('Removed');
                              onUpdateCollaboration({});
                            }}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >-</button>
                        </div>
                      </div>
                    ))}
                  <hr className="border-dark-600" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-white">Total</span>
                    <span className="text-green-400">$
                      { (collaboration.budget?.items || [])
                        .filter(i => i.category === 'mixing')
                        .reduce((sum, i) => sum + (i.amount || 0), 0) }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-dark-700 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">Total Budget Overview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Total Budget</p>
                  <p className="text-2xl font-bold text-white">${collaboration.budget?.total || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Spent</p>
                  <p className="text-2xl font-bold text-red-400">${collaboration.budget?.spent || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Remaining</p>
                  <p className="text-2xl font-bold text-green-400">{Math.max(0, (collaboration.budget?.total || 0) - (collaboration.budget?.spent || 0))}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Progress</p>
                  <p className="text-2xl font-bold text-blue-400">{
                    ((collaboration.budget?.spent || 0) && (collaboration.budget?.total || 0))
                      ? Math.round(((collaboration.budget!.spent || 0) / (collaboration.budget!.total || 1)) * 100)
                      : 0
                  }%</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Application Review Modal */}
      <AnimatePresence>
        {showApplicationModal && selectedApplication && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Review Application</h3>
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedApplication.applicantAvatar || '/default-avatar.svg'}
                    alt={selectedApplication.applicantName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-semibold text-white text-lg">{selectedApplication.applicantName}</h4>
                    <p className="text-gray-400">Applied for: {selectedApplication.instrument}</p>
                  </div>
                </div>

                <div className="bg-dark-700 rounded-lg p-4">
                  <h5 className="font-semibold text-white mb-2">Experience</h5>
                  <p className="text-gray-300">{selectedApplication.experience}</p>
                </div>

                <div className="bg-dark-700 rounded-lg p-4">
                  <h5 className="font-semibold text-white mb-2">Motivation</h5>
                  <p className="text-gray-300">{selectedApplication.motivation}</p>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Response Message (Optional)</label>
                  <textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Add a personal message to the applicant..."
                    className="w-full p-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleAcceptApplication(selectedApplication)}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Accept Application
                  </button>
                  <button
                    onClick={() => handleRejectApplication(selectedApplication)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Reject Application
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollaborationManagementPanel;
