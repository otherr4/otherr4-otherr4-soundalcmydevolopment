// User type (based on AuthContext and AdminContext)
export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  country: string;
  instrumentType: string;
  instrumentDetails?: string;
  singingType?: string;
  musicCulture: string;
  aboutMe: string;
  interests: string[];
  experience: string;
  goals: string;
  profileImage?: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  settings: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    twoFactorAuth: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showEmail: boolean;
    showPhone: boolean;
  };
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  pendingVerification: number;
  suspendedUsers: number;
  totalAdmins: number;
  recentSignups: number;
  usersByRole?: Record<string, number>;
  recentActivity?: Array<{
    date: string;
    registrations: number;
    verifications: number;
  }>;
}

export interface TrafficStats {
  success: boolean;
  data: {
    dailyVisits: number;
    monthlyVisits: number;
    peakHours: Record<string, number>;
    deviceTypes: Record<string, number>;
    locations: Record<string, number>;
  };
  message?: string;
}

export interface UserFilters {
  role?: string;
  status?: string;
  verificationStatus?: string;
  country?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface UserResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    stats: {
      totalActive: number;
      totalVerified: number;
      roleDistribution: Record<string, number>;
    };
  };
  message?: string;
}

export interface BulkActionResponse {
  success: boolean;
  data: {
    successful: string[];
    failed: Array<{
      id: string;
      error: string;
    }>;
  };
  message?: string;
}

export interface RegistrationFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phoneNumber: string;
  country: string;
  instrumentType: string;
  instrumentDetails?: string;
  singingType?: string;
  musicCulture: string;
  aboutMe: string;
  interests: string[];
  experience: string;
  goals: string;
  termsAccepted: boolean;
}

export const MUSIC_CULTURES = [
  { value: 'classical', label: 'Classical' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'rock', label: 'Rock' },
  { value: 'pop', label: 'Pop' },
  { value: 'folk', label: 'Folk' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'world', label: 'World Music' },
  { value: 'traditional', label: 'Traditional' },
  { value: 'other', label: 'Other' }
];

export const INTERESTS = [
  { value: 'performing', label: 'Performing' },
  { value: 'composing', label: 'Composing' },
  { value: 'teaching', label: 'Teaching' },
  { value: 'recording', label: 'Recording' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'music_production', label: 'Music Production' },
  { value: 'music_theory', label: 'Music Theory' },
  { value: 'improvisation', label: 'Improvisation' },
  { value: 'arranging', label: 'Arranging' },
  { value: 'music_technology', label: 'Music Technology' }
]; 