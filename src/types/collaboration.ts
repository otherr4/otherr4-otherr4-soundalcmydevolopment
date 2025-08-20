export interface Collaboration {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  genre: string;
  instruments: string[];
  collaborationType: 'cover' | 'original' | 'remix' | 'jam' | 'composition' | 'other';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  privacy: 'public' | 'private' | 'invite_only';
  maxParticipants?: number;
  currentParticipants: number;
  participants: CollaborationParticipant[];
  requirements: string[];
  timeline: {
    startDate: string;
    endDate?: string;
    milestones: CollaborationMilestone[];
  };
  attachments: CollaborationAttachment[];
  tags: string[];
  referenceLinks?: string[];
  location: 'online' | 'offline' | 'hybrid';
  locationDetails?: string;
  compensation: 'free' | 'paid' | 'revenue_share' | 'exposure';
  compensationDetails?: string;
  createdAt: Date;
  updatedAt: Date;
  views: number;
  applications: number;
  isVerified: boolean;
  // --- ADDED FIELDS FOR PRIVACY/FILTERING ---
  invitedUids?: string[];
  creatorFriends?: string[];
  // --- ADDED FIELDS FOR COST MANAGEMENT ---
  budget?: {
    total: number;
    spent: number;
    currency: string;
    items: CostItem[];
  };
  // --- ADDED FIELDS FOR ENHANCED REQUIREMENTS ---
  detailedRequirements?: {
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    experience: string;
    equipment: string[];
    availability: string;
    commitment: string;
    additionalNotes: string;
  };
  // --- ADDED FIELDS FOR STUDIO/MIXING COSTS ---
  studioCosts?: {
    studioTime: number;
    equipmentRental: number;
    engineer: number;
    additionalServices: CostItem[];
  };
  mixingCosts?: {
    mixing: number;
    mastering: number;
    additionalEdits: number;
    revisions: number;
  };
}

export interface CostItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  category: 'studio' | 'mixing' | 'equipment' | 'other';
  description?: string;
  date: Date;
  status: 'pending' | 'paid' | 'cancelled';
}

export interface CollaborationParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: string;
  instrument: string;
  joinedAt: Date;
  status: 'active' | 'inactive' | 'left';
  contribution?: string;
}

export interface CollaborationMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assignedTo?: string[];
  completedAt?: Date;
}

export interface CollaborationAttachment {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'image' | 'document' | 'sheet_music';
  url: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  description?: string;
}

export interface CollaborationApplication {
  id: string;
  collaborationId: string;
  applicantId: string;
  applicantName: string;
  applicantAvatar?: string;
  instrument: string;
  experience: string;
  motivation: string;
  portfolio?: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  appliedAt: Date;
  respondedAt?: Date;
  responseMessage?: string;
}

export interface CollaborationStep {
  id: string;
  title: string;
  description: string;
  order: number;
  isRequired: boolean;
  isCompleted: boolean;
  fields: CollaborationStepField[];
}

export interface CollaborationStepField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'file' | 'date' | 'number' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  value?: any;
}

export interface CollaborationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: CollaborationStep[];
  isPopular: boolean;
  usageCount: number;
}

export interface CollaborationStats {
  totalCollaborations: number;
  activeCollaborations: number;
  completedCollaborations: number;
  totalApplications: number;
  acceptedApplications: number;
  averageCompletionTime: number;
  topGenres: string[];
  topInstruments: string[];
}

export type CollaborationFilter = {
  genre?: string;
  instrument?: string;
  status?: string;
  type?: string;
  location?: string;
  compensation?: string;
  dateRange?: {
    start: string;
    end: string;
  };
};

export interface CollaborationSearchResult {
  collaborations: Collaboration[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
} 