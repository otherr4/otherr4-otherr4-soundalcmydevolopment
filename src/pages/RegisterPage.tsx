import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createUserWithEmailAndPassword, AuthError, signInWithEmailAndPassword, deleteUser, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { auth, db, storage, userProfilePhotosRef, getStoragePath } from '../config/firebase';
import { sendEmail, getNewMusicianEmailTemplate } from '../config/emailService';
import { generateWelcomeMessage, generateAiResponse, checkAiServiceStatus, generateFallbackBio, generateFallbackTalentDescription } from '../config/aiService';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Music, Check, X, Camera, Loader, Eye, EyeOff, Mic, Globe, Info, ArrowLeft, ArrowRight, Sparkles, Lightbulb, Star } from 'lucide-react';
import Select from 'react-select';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import countryList from 'react-select-country-list';
import { validateImage } from '../utils/imageValidation';
import { compressImage } from '../utils/imageCompression';
import { components } from 'react-select';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaGlobe, FaMusic, FaMicrophone, FaPalette, FaSpinner, FaLightbulb, FaRobot, FaCamera } from 'react-icons/fa';
import ReactCountryFlag from 'react-country-flag';
import { countries as countriesData } from 'countries-list';
import { ICountry, TContinentCode } from 'countries-list';
import TalentTypeSelector from '../components/common/TalentTypeSelector';
import { INSTRUMENT_TYPE_GROUPS, SINGING_TYPE_GROUPS } from '../utils/constants';
import AuthService from '../services/authService';
import { logUserActivity } from '../utils/logUserActivity';
import SEO from '../components/common/SEO';

// Form step interface
interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  contactNumber: string;
  country: string;
  gender: string;
  instrumentTypes: string[];  // Change to array
  singingTypes: string[];    // Change to array
  musicCulture: string;
  bio: string;
  profileImage: File | null;
  profileImagePath: string;
  talentDescription: string;
}

interface FormErrors {
  [key: string]: string | string[] | undefined;
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  contactNumber?: string;
  country?: string;
  instrumentTypes?: string[];
  singingTypes?: string[];
  musicCulture?: string;
  bio?: string;
  profileImage?: string;
  talentDescription?: string;
}

// Enhanced country data with flags
const enhancedCountries = Object.entries(countriesData).map(([code, data]: [string, ICountry]) => ({
  value: code,
  label: data.name,
  flag: code,
  phone: data.phone,
  continent: data.continent,
  capital: data.capital,
  currency: data.currency,
})).sort((a, b) => a.label.localeCompare(b.label));

// Group countries by continent with proper type handling
const groupedCountries: Record<string, typeof enhancedCountries> = enhancedCountries.reduce((acc, country) => {
  const continent = country.continent;
  if (!acc[continent]) {
    acc[continent] = [];
  }
  acc[continent].push(country);
  return acc;
}, {} as Record<string, typeof enhancedCountries>);

const continentNames: Record<TContinentCode, string> = {
  EU: 'Europe',
  AS: 'Asia',
  AF: 'Africa',
  NA: 'North America',
  SA: 'South America',
  OC: 'Oceania',
  AN: 'Antarctica'
};

// Update country options mapping with type assertion
const countryOptions = Object.entries(groupedCountries).map(([continent, countries]) => ({
  label: continentNames[continent as TContinentCode] || continent,
  options: countries
}));

// Enhanced instruments data with categories and icons
const enhancedInstruments = [
  {
    label: 'String Instruments',
    icon: '🎻',
    options: [
      { value: 'acoustic_guitar', label: 'Acoustic Guitar', icon: '🎸', description: 'Steel or nylon string acoustic guitar' },
      { value: 'electric_guitar', label: 'Electric Guitar', icon: '🎸', description: 'Electric guitar with amplification' },
      { value: 'bass_guitar', label: 'Bass Guitar', icon: '🎸', description: 'Electric or acoustic bass guitar' },
      { value: 'violin', label: 'Violin', icon: '🎻', description: 'Classical violin or fiddle' },
      { value: 'viola', label: 'Viola', icon: '🎻', description: 'Classical viola' },
      { value: 'cello', label: 'Cello', icon: '🎻', description: 'Classical cello' },
      { value: 'double_bass', label: 'Double Bass', icon: '🎻', description: 'Upright or double bass' },
      { value: 'harp', label: 'Harp', icon: '🎼', description: 'Classical or Celtic harp' },
      { value: 'ukulele', label: 'Ukulele', icon: '🎸', description: 'Hawaiian ukulele' },
      { value: 'banjo', label: 'Banjo', icon: '🪕', description: 'Folk or bluegrass banjo' },
      { value: 'mandolin', label: 'Mandolin', icon: '🎸', description: 'Classical or folk mandolin' },
    ]
  },
  {
    label: 'Keyboard Instruments',
    icon: '🎹',
    options: [
      { value: 'piano', label: 'Piano', icon: '🎹', description: 'Acoustic or digital piano' },
      { value: 'synthesizer', label: 'Synthesizer', icon: '🎹', description: 'Electronic synthesizer' },
      { value: 'organ', label: 'Organ', icon: '🎹', description: 'Church or Hammond organ' },
      { value: 'accordion', label: 'Accordion', icon: '🪗', description: 'Piano or button accordion' },
      { value: 'melodica', label: 'Melodica', icon: '🎹', description: 'Wind piano/melodica' },
    ]
  },
  {
    label: 'Wind Instruments',
    icon: '🎷',
    options: [
      { value: 'saxophone', label: 'Saxophone', icon: '🎷', description: 'Alto, tenor, or soprano saxophone' },
      { value: 'trumpet', label: 'Trumpet', icon: '🎺', description: 'Classical or jazz trumpet' },
      { value: 'trombone', label: 'Trombone', icon: '🎺', description: 'Slide trombone' },
      { value: 'flute', label: 'Flute', icon: '🎵', description: 'Classical or wooden flute' },
      { value: 'clarinet', label: 'Clarinet', icon: '🎵', description: 'Classical clarinet' },
      { value: 'oboe', label: 'Oboe', icon: '🎵', description: 'Classical oboe' },
      { value: 'bassoon', label: 'Bassoon', icon: '🎵', description: 'Classical bassoon' },
      { value: 'bagpipes', label: 'Bagpipes', icon: '🎵', description: 'Traditional bagpipes' },
    ]
  },
  {
    label: 'Percussion',
    icon: '🥁',
    options: [
      { value: 'drums', label: 'Drums', icon: '🥁', description: 'Acoustic or electronic drum kit' },
      { value: 'cajon', label: 'Cajon', icon: '🥁', description: 'Peruvian box drum' },
      { value: 'congas', label: 'Congas', icon: '🥁', description: 'Afro-Cuban congas' },
      { value: 'bongos', label: 'Bongos', icon: '🥁', description: 'Cuban bongos' },
      { value: 'djembe', label: 'Djembe', icon: '🥁', description: 'African djembe drum' },
      { value: 'xylophone', label: 'Xylophone', icon: '🎵', description: 'Classical xylophone' },
      { value: 'marimba', label: 'Marimba', icon: '🎵', description: 'Classical marimba' },
      { value: 'vibraphone', label: 'Vibraphone', icon: '🎵', description: 'Jazz vibraphone' },
    ]
  },
  {
    label: 'Electronic',
    icon: '🎛️',
    options: [
      { value: 'dj', label: 'DJ Equipment', icon: '🎛️', description: 'Turntables and controllers' },
      { value: 'sampler', label: 'Sampler', icon: '🎛️', description: 'Digital audio sampler' },
      { value: 'drum_machine', label: 'Drum Machine', icon: '🎛️', description: 'Electronic rhythm programmer' },
      { value: 'ableton', label: 'Ableton Live', icon: '🎛️', description: 'Digital audio workstation' },
      { value: 'electronic_production', label: 'Electronic Production', icon: '🎛️', description: 'Digital music production' },
    ]
  }
];

// Enhanced singing types with categories and descriptions
const enhancedSingingTypes = [
  {
    label: 'Classical',
    icon: '🎭',
    options: [
      { value: 'opera', label: 'Opera', icon: '🎭', description: 'Classical operatic singing' },
      { value: 'classical_soprano', label: 'Classical Soprano', icon: '🎭', description: 'High classical voice' },
      { value: 'classical_alto', label: 'Classical Alto', icon: '🎭', description: 'Low classical voice' },
      { value: 'classical_tenor', label: 'Classical Tenor', icon: '🎭', description: 'High male classical voice' },
      { value: 'classical_bass', label: 'Classical Bass', icon: '🎭', description: 'Low male classical voice' },
    ]
  },
  {
    label: 'Contemporary',
    icon: '🎤',
    options: [
      { value: 'pop', label: 'Pop', icon: '🎤', description: 'Contemporary pop style' },
      { value: 'rock', label: 'Rock', icon: '🎸', description: 'Rock vocal style' },
      { value: 'jazz', label: 'Jazz', icon: '🎷', description: 'Jazz vocal style' },
      { value: 'blues', label: 'Blues', icon: '🎸', description: 'Blues vocal style' },
      { value: 'soul', label: 'Soul', icon: '🎤', description: 'Soul and R&B style' },
      { value: 'musical_theatre', label: 'Musical Theatre', icon: '🎭', description: 'Broadway and theatre style' },
    ]
  },
  {
    label: 'Traditional',
    icon: '🌍',
    options: [
      { value: 'folk', label: 'Folk', icon: '🎸', description: 'Traditional folk singing' },
      { value: 'gospel', label: 'Gospel', icon: '🎤', description: 'Gospel and spiritual music' },
      { value: 'world', label: 'World Music', icon: '🌍', description: 'Various world music styles' },
    ]
  },
  {
    label: 'Modern',
    icon: '🎵',
    options: [
      { value: 'rap', label: 'Rap/Hip-Hop', icon: '🎤', description: 'Rap and hip-hop vocals' },
      { value: 'electronic', label: 'Electronic', icon: '🎛️', description: 'Electronic music vocals' },
      { value: 'experimental', label: 'Experimental', icon: '🎵', description: 'Avant-garde vocal styles' },
    ]
  }
];

// Enhanced gender options with icons and descriptions
const genderOptions = [
  {
    value: 'male',
    label: 'Male',
    icon: '👨',
    description: 'Male musician'
  },
  {
    value: 'female',
    label: 'Female',
    icon: '👩',
    description: 'Female musician'
  },
  {
    value: 'non_binary',
    label: 'Non-Binary',
    icon: '⚧',
    description: 'Non-binary musician'
  },
  {
    value: 'prefer_not_to_say',
    label: 'Prefer not to say',
    icon: '🤐',
    description: 'Keep gender private'
  }
];

// Enhanced music cultures with detailed categories
const enhancedMusicCultures = [
  {
    label: 'Western Classical',
    icon: '🎼',
    options: [
      { value: 'baroque', label: 'Baroque', icon: '🎼', description: 'European classical music from 1600-1750' },
      { value: 'classical', label: 'Classical', icon: '🎼', description: 'European classical music from 1730-1820' },
      { value: 'romantic', label: 'Romantic', icon: '🎼', description: 'European classical music from 1810-1910' },
      { value: 'contemporary_classical', label: 'Contemporary Classical', icon: '🎼', description: 'Modern classical music' },
    ]
  },
  {
    label: 'Jazz & Blues',
    icon: '🎷',
    options: [
      { value: 'traditional_jazz', label: 'Traditional Jazz', icon: '🎷', description: 'Early jazz styles' },
      { value: 'bebop', label: 'Bebop', icon: '🎷', description: 'Complex, fast-paced jazz' },
      { value: 'fusion', label: 'Jazz Fusion', icon: '🎷', description: 'Jazz mixed with other genres' },
      { value: 'blues', label: 'Blues', icon: '🎸', description: 'Traditional and modern blues' },
    ]
  },
  {
    label: 'World Music',
    icon: '🌍',
    options: [
      { value: 'african', label: 'African', icon: '🥁', description: 'Traditional and modern African music' },
      { value: 'latin', label: 'Latin American', icon: '🪘', description: 'Music from Latin America' },
      { value: 'indian', label: 'Indian', icon: '🎼', description: 'Classical and folk Indian music' },
      { value: 'middle_eastern', label: 'Middle Eastern', icon: '🎼', description: 'Traditional Middle Eastern music' },
      { value: 'asian', label: 'Asian', icon: '🎼', description: 'East Asian musical traditions' },
    ]
  },
  {
    label: 'Contemporary',
    icon: '🎵',
    options: [
      { value: 'pop', label: 'Pop', icon: '🎤', description: 'Modern popular music' },
      { value: 'rock', label: 'Rock', icon: '🎸', description: 'Various rock styles' },
      { value: 'electronic', label: 'Electronic', icon: '🎛️', description: 'Electronic and dance music' },
      { value: 'hip_hop', label: 'Hip-Hop', icon: '🎤', description: 'Rap and hip-hop culture' },
      { value: 'indie', label: 'Indie', icon: '🎸', description: 'Independent and alternative music' },
    ]
  },
  {
    label: 'Folk & Traditional',
    icon: '🪕',
    options: [
      { value: 'celtic', label: 'Celtic', icon: '🪕', description: 'Irish and Celtic music' },
      { value: 'bluegrass', label: 'Bluegrass', icon: '🪕', description: 'American folk music' },
      { value: 'folk', label: 'Folk', icon: '🎸', description: 'Traditional folk music' },
      { value: 'country', label: 'Country', icon: '🎸', description: 'Country and western music' },
    ]
  }
];

// Enhanced select styles with animations and better UI
const enhancedSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: '#1a1a1a',
    borderColor: state.isFocused ? '#3b82f6' : '#374151',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
    borderRadius: '0.75rem',
    padding: '2px',
    transition: 'all 200ms ease',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#4b5563',
    },
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: '#1a1a1a',
    border: '1px solid #374151',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    animation: 'selectMenuFade 200ms ease',
  }),
  menuList: (base: any) => ({
    ...base,
    padding: '6px',
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '::-webkit-scrollbar-track': {
      background: '#1a1a1a',
    },
    '::-webkit-scrollbar-thumb': {
      background: '#4b5563',
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: '#6b7280',
    },
  }),
  option: (base: any, state: any) => ({
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
  input: (base: any) => ({
    ...base,
    color: '#e5e7eb',
  }),
  singleValue: (base: any) => ({
    ...base,
    color: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: '#374151',
    borderRadius: '0.5rem',
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: '#e5e7eb',
    padding: '2px 6px',
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    color: '#e5e7eb',
    ':hover': {
      backgroundColor: '#4b5563',
      color: '#ef4444',
    },
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#6b7280',
  }),
  groupHeading: (base: any) => ({
    ...base,
    color: '#9ca3af',
    fontSize: '0.8125rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '8px 12px',
    marginBottom: '4px',
  }),
};

// Custom Select components
const CustomOption = ({ data, ...props }: any) => (
  <components.Option {...props}>
    <div className="flex items-center gap-3 w-full">
      <span className="text-xl flex-shrink-0">{data.icon}</span>
      <div className="flex flex-col">
      <span>{data.label}</span>
        {data.description && (
          <span className="text-xs text-gray-400">{data.description}</span>
        )}
      </div>
    </div>
  </components.Option>
);

const CustomGroupHeading = ({ data, ...props }: any) => (
  <components.GroupHeading {...props}>
    <div className="flex items-center gap-2">
      <span className="text-lg">{data.icon}</span>
      <span>{data.label}</span>
    </div>
  </components.GroupHeading>
);

const CustomCountryOption = ({ data, ...props }: any) => (
  <components.Option {...props}>
    <div className="flex items-center gap-3">
      <ReactCountryFlag
        countryCode={data.flag}
        svg
        style={{
          width: '24px',
          height: '18px',
        }}
      />
      <div className="flex flex-col">
        <span>{data.label}</span>
        <span className="text-xs text-gray-400">+{data.phone}</span>
      </div>
    </div>
  </components.Option>
);

// Enhanced password validation
const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check minimum length
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check for numbers
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check for special characters
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common passwords
  const commonPasswords = ['Password123!', 'Admin123!', 'Welcome123!', 'Letmein123!'];
  if (commonPasswords.includes(password)) {
    errors.push('This is a commonly used password. Please choose a unique one');
  }
  
  // Check for repeating characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeating characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Add password strength indicator
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  
  // Length
  score += Math.min(6, Math.floor(password.length / 3));
  
  // Complexity
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  
  // Variety
  const uniqueChars = new Set(password).size;
  score += Math.min(2, Math.floor(uniqueChars / 4));
  
  let label: string;
  let color: string;
  
  if (score < 4) {
    label = 'Weak';
    color = 'text-red-500';
  } else if (score < 8) {
    label = 'Moderate';
    color = 'text-yellow-500';
  } else if (score < 10) {
    label = 'Strong';
    color = 'text-green-500';
  } else {
    label = 'Very Strong';
    color = 'text-blue-500';
  }
  
  return { score, label, color };
};

// Add rate limiting for registration attempts
const rateLimiter = {
  attempts: 0,
  lastAttempt: 0,
  maxAttempts: 5,
  timeWindow: 15 * 60 * 1000, // 15 minutes
  
  canAttempt(): boolean {
    const now = Date.now();
    if (now - this.lastAttempt > this.timeWindow) {
      this.attempts = 0;
      return true;
    }
    return this.attempts < this.maxAttempts;
  },
  
  recordAttempt() {
    this.attempts++;
    this.lastAttempt = Date.now();
  }
};

// Add validation functions
const validateUserData = (data: FormData) => {
  const errors: { [key: string]: string } = {};

  // Validate full name
  if (!data.fullName.trim()) {
    errors.fullName = 'Full name is required';
  } else if (data.fullName.length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  } else if (!/^[a-zA-Z\s'-]+$/.test(data.fullName)) {
    errors.fullName = 'Full name can only contain letters, spaces, hyphens and apostrophes';
  }

  // Enhanced email validation
  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Enhanced password validation
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors[0];
  }

  // Contact number is now optional - only validate if provided
  if (data.contactNumber && data.contactNumber.trim() && !/^\+?[\d\s-]{8,}$/.test(data.contactNumber)) {
    errors.contactNumber = 'Please enter a valid phone number';
  }

  // Enhanced country validation
  if (!data.country) {
    errors.country = 'Country is required';
  } else if (!/^[A-Z]{2}$/.test(data.country)) {
    errors.country = 'Invalid country code';
  }

  // Gender validation
  if (!data.gender) {
    errors.gender = 'Please select your gender';
  }

  // Instruments and singing types are now optional - user must have at least one
  if (!data.instrumentTypes.length && !data.singingTypes.length) {
    errors.instrumentTypes = 'Please select at least one instrument or singing style';
  }

  // Enhanced music culture validation
  if (!data.musicCulture) {
    errors.musicCulture = 'Music culture is required';
  }

  // Enhanced bio validation
  if (!data.bio.trim()) {
    errors.bio = 'Bio is required';
  } else if (data.bio.length < 50) {
    errors.bio = 'Bio must be at least 50 characters';
  } else if (data.bio.length > 1000) {
    errors.bio = 'Bio must not exceed 1000 characters';
  }

  return errors;
};

// Image validation and upload utilities
const validateAndProcessImage = async (file: File): Promise<{ isValid: boolean; error?: string; processedFile?: File }> => {
  return new Promise((resolve) => {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      resolve({ isValid: false, error: 'Image size must be less than 5MB' });
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      resolve({ isValid: false, error: 'Only JPEG, PNG, GIF, and WebP images are allowed' });
      return;
    }

    // Check image dimensions
    const img = new Image();
    img.onload = () => {
      if (img.width < 100 || img.height < 100) {
        resolve({ isValid: false, error: 'Image dimensions must be at least 100x100 pixels' });
        return;
      }
      if (img.width > 2000 || img.height > 2000) {
        resolve({ isValid: false, error: 'Image dimensions must not exceed 2000x2000 pixels' });
        return;
      }
      resolve({ isValid: true, processedFile: file });
    };
    img.onerror = () => {
      resolve({ isValid: false, error: 'Invalid image file' });
    };
    img.src = URL.createObjectURL(file);
  });
};

// Add function to check existing profile image
const checkExistingProfileImage = async (userId: string): Promise<boolean> => {
  try {
    const storageRef = ref(storage, `usersproflesphotos/${userId}`);
    const result = await listAll(storageRef);
    return result.items.length > 0;
  } catch (error) {
    console.error('Error checking existing profile image:', error);
    return false;
  }
};

// Add function to verify image path in Firebase
const verifyImagePathInFirebase = async (userId: string, imagePath: string): Promise<boolean> => {
  try {
    // Check if image exists in storage
    const storageRef = ref(storage, imagePath);
    await getDownloadURL(storageRef);

    // Check if path is saved in user document
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    if (userData?.profileImagePath !== imagePath) {
      throw new Error('Image path not saved correctly in user document');
    }

    return true;
  } catch (error) {
    console.error('Error verifying image path:', error);
    return false;
  }
};

// Add function to handle duplicate image replacement
const replaceExistingImage = async (userId: string, newFile: File): Promise<{ path: string; url: string }> => {
  try {
    // Get existing image path
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const existingPath = userData?.profileImagePath;

    // Delete existing image if it exists
    if (existingPath) {
      try {
        const existingRef = ref(storage, existingPath);
        await deleteObject(existingRef);
        toast('Replacing existing profile image...', {
          duration: 3000
        });
      } catch (error) {
        console.error('Error deleting existing image:', error);
        // Continue even if delete fails
      }
    }

    // Upload new image
    const timestamp = Date.now();
    const fileExtension = newFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `profile_${timestamp}.${fileExtension}`;
    const newPath = `usersproflesphotos/${userId}/${fileName}`;

    // Upload new file
    const uploadResult = await uploadBytes(ref(storage, newPath), newFile);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    return {
      path: newPath,
      url: downloadURL
    };
  } catch (error) {
    console.error('Error replacing image:', error);
    throw error;
  }
};

const API_URL = 'https://sound-alchemy-backend1.vercel.app';

const uploadProfilePhoto = async (file: File, userId: string): Promise<{ path: string; url: string }> => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', userId);
    formData.append('fileName', `profile_${Date.now()}_${file.name}`);

    const response = await fetch(`${API_URL}/api/upload-profile-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to upload image');
    }

    return {
      path: data.path,
      url: data.imageUrl || data.path
    };
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
};

// Enhanced phone input styles with better colors and responsiveness
const enhancedPhoneInputStyles = {
  container: `
    .phone-input-container {
      @apply relative w-full transition-all duration-200;
    }

    .phone-input-container .form-control {
      @apply w-full h-[48px] pl-[62px] pr-4 py-2 
        bg-gray-800/90 
        border-2 border-gray-700 
        rounded-xl 
        text-gray-100 
        text-base
        placeholder-gray-400
        transition-all duration-200
        focus:outline-none 
        focus:border-blue-500 
        focus:ring-2 
        focus:ring-blue-500/20
        hover:border-gray-600;
    }

    .phone-input-container.error .form-control {
      @apply border-red-500 focus:border-red-500 focus:ring-red-500/20;
    }

    .phone-input-container .flag-dropdown {
      @apply absolute left-0 top-0 h-full 
        border-r-2 border-gray-700
        rounded-l-xl
        bg-gray-800/90
        transition-all duration-200;
    }

    .phone-input-container .selected-flag {
      @apply h-full px-4
        rounded-l-xl
        hover:bg-gray-700/50
        transition-all duration-200
        flex items-center;
    }

    .phone-input-container .selected-flag:focus {
      @apply bg-gray-700/50;
    }

    .phone-input-container .selected-flag .flag {
      @apply opacity-90 scale-110;
    }

    .phone-input-container .selected-flag .arrow {
      @apply border-t-gray-400 ml-2;
    }

    .phone-input-container .selected-flag .arrow.up {
      @apply border-b-gray-400;
    }

    /* Enhanced country dropdown styling */
    .phone-input-container .country-list {
      @apply w-[300px] max-h-[300px]
        bg-gray-800/95 
        border-2 border-gray-700 
        rounded-xl
        shadow-lg 
        overflow-y-auto
        scrollbar-thin 
        scrollbar-thumb-gray-600 
        scrollbar-track-gray-800/50
        mt-2
        backdrop-blur-sm;
    }

    .phone-input-container .country-list .search {
      @apply sticky top-0 z-10
        p-3
        bg-gray-800/95
        border-b-2 border-gray-700
        backdrop-blur-sm;
    }

    .phone-input-container .country-list .search-box {
      @apply w-full px-4 py-2.5
        bg-gray-700/90
        border-2 border-gray-600
        rounded-lg
        text-gray-100
        placeholder-gray-400
        focus:outline-none
        focus:border-blue-500
        focus:ring-2
        focus:ring-blue-500/20
        transition-all duration-200;
    }

    .phone-input-container .country-list .country {
      @apply px-4 py-2.5
        hover:bg-gray-700/80
        cursor-pointer
        transition-all duration-200
        flex items-center gap-3
        border-b border-gray-700/50
        last:border-b-0;
    }

    .phone-input-container .country-list .country.highlight {
      @apply bg-gray-700/80;
    }

    .phone-input-container .country-list .country-name {
      @apply text-gray-100 text-sm font-medium;
    }

    .phone-input-container .country-list .dial-code {
      @apply text-primary-400 text-sm font-medium ml-auto;
    }

    .phone-input-container .country-list .flag {
      @apply mr-3 scale-110 opacity-90;
    }

    .phone-input-container .country-list::-webkit-scrollbar {
      @apply w-2;
    }

    .phone-input-container .country-list::-webkit-scrollbar-track {
      @apply bg-gray-800/50 rounded-r-lg;
    }

    .phone-input-container .country-list::-webkit-scrollbar-thumb {
      @apply bg-gray-600/90 rounded-full hover:bg-gray-500;
    }
  `,
};

// Update step labels
const stepLabels = [
  { number: 1, label: 'Account', icon: <FaUser className="w-5 h-5" /> },
  { number: 2, label: 'Contact', icon: <FaPhone className="w-5 h-5" /> },
  { number: 3, label: 'Music', icon: <FaMusic className="w-5 h-5" /> },
  { number: 4, label: 'Profile', icon: <FaCamera className="w-5 h-5" /> }
];

// Add registration steps tracking
const registrationSteps = {
  ACCOUNT: 1,
  CONTACT: 2,
  MUSIC: 3,
  PROFILE: 4
};

// Add AI-powered placeholder suggestions
const bioPlaceholders = [
  "I'm a passionate musician with 5 years of experience in classical piano. I love blending traditional compositions with modern electronic elements...",
  "As a self-taught guitarist and vocalist, I've developed a unique style that combines folk melodies with contemporary rock influences...",
  "My journey in music began with jazz saxophone, and over the years I've explored various genres from bebop to fusion..."
];

const talentPlaceholders = [
  "I specialize in creating emotional soundscapes using a mix of classical piano and modern synthesizers. My unique approach involves...",
  "My talent lies in vocal improvisation and creating harmonies. I can seamlessly blend different vocal techniques like...",
  "What makes me unique is my ability to bridge traditional and modern music styles. I've developed techniques for..."
];

// Update phone number detection helper to be more accurate
const detectCountryFromPhone = (phoneNumber: string) => {
  // Remove all non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Common country codes with their patterns
  const countryPatterns = [
    { code: 'US', pattern: /^1/, minLength: 10 },
    { code: 'GB', pattern: /^44/, minLength: 10 },
    { code: 'IN', pattern: /^91/, minLength: 10 },
    { code: 'AU', pattern: /^61/, minLength: 9 },
    { code: 'CA', pattern: /^1/, minLength: 10 },
    { code: 'CN', pattern: /^86/, minLength: 11 },
    { code: 'JP', pattern: /^81/, minLength: 10 },
    { code: 'KR', pattern: /^82/, minLength: 10 },
    { code: 'DE', pattern: /^49/, minLength: 10 },
    { code: 'FR', pattern: /^33/, minLength: 9 },
    { code: 'IT', pattern: /^39/, minLength: 10 },
    { code: 'ES', pattern: /^34/, minLength: 9 },
    { code: 'BR', pattern: /^55/, minLength: 10 },
    { code: 'RU', pattern: /^7/, minLength: 10 },
    { code: 'SG', pattern: /^65/, minLength: 8 },
  ];

  // Check each pattern
  for (const { code, pattern, minLength } of countryPatterns) {
    if (pattern.test(cleanNumber) && cleanNumber.length >= minLength) {
      return code.toLowerCase();
    }
  }

  // If no match found but number starts with a valid country code
  if (cleanNumber.length >= 2) {
    const firstTwo = cleanNumber.substring(0, 2);
    const firstOne = cleanNumber.substring(0, 1);
    
    // Check common two-digit country codes
    if (firstTwo === '44') return 'gb';
    if (firstTwo === '91') return 'in';
    if (firstTwo === '61') return 'au';
    if (firstTwo === '86') return 'cn';
    if (firstTwo === '81') return 'jp';
    if (firstTwo === '82') return 'kr';
    if (firstTwo === '49') return 'de';
    if (firstTwo === '33') return 'fr';
    if (firstTwo === '39') return 'it';
    if (firstTwo === '34') return 'es';
    if (firstTwo === '55') return 'br';
    if (firstTwo === '65') return 'sg';
    
    // Check single-digit country codes
    if (firstOne === '1') return 'us'; // Default to US for North American numbers
    if (firstOne === '7') return 'ru';
  }

  return null;
};

// Update PasswordInput to handle value and onChange correctly
const PasswordInput = ({ 
  value, 
  onChange, 
  error,
  name,
  label,
  placeholder 
}: { 
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  name: string;
  label: string;
  placeholder: string;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const strength = name === 'password' ? getPasswordStrength(value) : null;

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={`form-input w-full pr-10 ${error ? 'border-red-500' : ''}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      
      {/* Only show password strength for main password field */}
      {name === 'password' && value && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  strength?.color === 'text-red-500' ? 'bg-red-500' :
                  strength?.color === 'text-yellow-500' ? 'bg-yellow-500' :
                  strength?.color === 'text-green-500' ? 'bg-green-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${(strength?.score || 0 / 12) * 100}%` }}
              />
            </div>
            <span className={`text-sm ${strength?.color}`}>
              {strength?.label}
            </span>
          </div>
          
          {/* Password requirements */}
          <div className="mt-2 text-sm space-y-1">
            <p className={value.length >= 12 ? 'text-green-500' : 'text-gray-400'}>
              ✓ At least 12 characters
            </p>
            <p className={/[A-Z]/.test(value) ? 'text-green-500' : 'text-gray-400'}>
              ✓ At least one uppercase letter
            </p>
            <p className={/[a-z]/.test(value) ? 'text-green-500' : 'text-gray-400'}>
              ✓ At least one lowercase letter
            </p>
            <p className={/\d/.test(value) ? 'text-green-500' : 'text-gray-400'}>
              ✓ At least one number
            </p>
            <p className={/[!@#$%^&*(),.?":{}|<>]/.test(value) ? 'text-green-500' : 'text-gray-400'}>
              ✓ At least one special character
            </p>
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [countries, setCountries] = useState(countryList().getData());
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    contactNumber: '',
    country: '',
    gender: '',
    instrumentTypes: [],  // Initialize as empty array
    singingTypes: [],     // Initialize as empty array
    musicCulture: '',
    bio: '',
    profileImage: null,
    profileImagePath: '',
    talentDescription: '',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Add new state for photo validation
  const [isPhotoValidating, setIsPhotoValidating] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Add new state for registration progress
  const [registrationStatus, setRegistrationStatus] = useState<{
    isSubmitting: boolean;
    progress: number;
    currentTask: string;
  }>({
    isSubmitting: false,
    progress: 0,
    currentTask: ''
  });

  // Add new state for AI-powered placeholders
  const [currentBioPlaceholder, setCurrentBioPlaceholder] = useState(bioPlaceholders[0]);
  const [currentTalentPlaceholder, setCurrentTalentPlaceholder] = useState(talentPlaceholders[0]);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [showBioSuggestions, setShowBioSuggestions] = useState(false);
  const [showTalentSuggestions, setShowTalentSuggestions] = useState(false);
  const [aiServiceStatus, setAiServiceStatus] = useState<'available' | 'unavailable' | 'checking'>('checking');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  // Check AI service status on component mount
  useEffect(() => {
    const checkAiService = async () => {
      try {
        const status = await checkAiServiceStatus();
        setAiServiceStatus(status.available ? 'available' : 'unavailable');
        
        if (!status.available) {
          console.warn('AI service unavailable:', status.error);
        }
      } catch (error) {
        console.error('Error checking AI service:', error);
        setAiServiceStatus('unavailable');
      }
    };
    
    checkAiService();
  }, []);

  // Rotate placeholders periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBioPlaceholder(prev => {
        const currentIndex = bioPlaceholders.indexOf(prev);
        return bioPlaceholders[(currentIndex + 1) % bioPlaceholders.length];
      });
      setCurrentTalentPlaceholder(prev => {
        const currentIndex = talentPlaceholders.indexOf(prev);
        return talentPlaceholders[(currentIndex + 1) % talentPlaceholders.length];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Enhanced AI-powered bio generation with proper Gemini API integration
  const handleGenerateBioSuggestion = async () => {
    if (!formData.instrumentTypes.length && !formData.singingTypes.length) {
      toast.error('Please select at least one instrument or singing style first');
      return;
    }
    setIsGeneratingBio(true);
    try {
      if (aiServiceStatus === 'unavailable') {
        // Use fallback generation when AI is unavailable
        const allTalents = [...formData.instrumentTypes, ...formData.singingTypes];
        const fallbackBio = generateFallbackBio(formData.fullName, allTalents);
      setFormData(prev => ({
        ...prev,
          bio: fallbackBio
        }));
        toast.success('📝 Generated bio using template!');
        return;
      }
      
      const allTalents = [...formData.instrumentTypes, ...formData.singingTypes];
      const prompt = `Create a professional, engaging musician bio for ${formData.fullName} who specializes in ${allTalents.join(', ')}. 
      The bio should be 150-200 words and include:
      - Years of experience and musical journey
      - Musical influences and style
      - Notable performances or achievements
      - Teaching or collaboration experience
      - Musical goals and aspirations
      Make it sound authentic, professional, and engaging for potential collaborations.`;
      
      const response = await generateAiResponse(prompt);
      
      if (response.success && response.text) {
        setFormData(prev => ({
          ...prev,
          bio: response.text || ''
      }));
        toast.success('✨ AI-generated bio created successfully!');
      } else {
        throw new Error(response.error || 'Failed to generate bio');
      }
    } catch (error) {
      console.error('Bio generation error:', error);
      // Fallback to template generation on error
      const fallbackBio = generateFallbackBio(formData.fullName, formData.instrumentTypes);
      setFormData(prev => ({
        ...prev,
        bio: fallbackBio
      }));
      toast.success('📝 Generated bio using template!');
    } finally {
      setIsGeneratingBio(false);
    }
  };

  // Enhanced AI-powered bio improvement
  const handleImproveBio = async () => {
    if (!formData.bio.trim()) {
      toast.error('Please write something first to improve');
      return;
    }
    setIsGeneratingBio(true);
    try {
      if (aiServiceStatus === 'unavailable') {
        toast.error('❌ AI service unavailable. Please improve your bio manually.');
        return;
      }
      
      const allTalents = [...formData.instrumentTypes, ...formData.singingTypes];
      const prompt = `Improve this musician's bio to make it more professional, engaging, and compelling for collaborations. 
      Musician: ${formData.fullName}
      Specialties: ${allTalents.join(', ')}
      Original bio: "${formData.bio}"
      
      Focus on:
      - Better flow and structure
      - More specific achievements
      - Stronger unique selling points
      - Professional tone
      - Clear value proposition
      
      Keep it around 150-200 words and make it sound authentic.`;
      
      const response = await generateAiResponse(prompt);
      
      if (response.success && response.text) {
        setFormData(prev => ({
          ...prev,
          bio: response.text || ''
        }));
        toast.success('🚀 Bio enhanced with AI!');
      } else {
        throw new Error(response.error || 'Failed to improve bio');
      }
    } catch (error) {
      console.error('Bio improvement error:', error);
      toast.error('❌ AI service unavailable. Please improve manually.');
    } finally {
      setIsGeneratingBio(false);
    }
  };

  // Enhanced AI-powered talent description generation
  const handleGenerateTalentSuggestion = async () => {
    if (!formData.instrumentTypes.length && !formData.singingTypes.length) {
      toast.error('Please select at least one instrument or singing style first');
      return;
    }
    setIsGeneratingBio(true);
    try {
      if (aiServiceStatus === 'unavailable') {
        // Use fallback generation when AI is unavailable
        const fallbackTalent = generateFallbackTalentDescription(formData.fullName, formData.instrumentTypes, formData.singingTypes);
        setFormData(prev => ({
          ...prev,
          talentDescription: fallbackTalent
        }));
        toast.success('📝 Generated talent description using template!');
        return;
      }
      
      const talentTypes = [...formData.instrumentTypes, ...formData.singingTypes];
      const prompt = `Create a compelling "What Makes You Unique?" description for ${formData.fullName}, a musician who specializes in ${talentTypes.join(', ')}.
      
      Focus on:
      - Unique playing techniques or style
      - Special musical achievements
      - Creative approach to music
      - What sets them apart from other musicians
      - Their musical signature or trademark
      
      Make it 100-150 words, engaging, and highlight their uniqueness for potential collaborations.`;
      
      const response = await generateAiResponse(prompt);
      
      if (response.success && response.text) {
        setFormData(prev => ({
          ...prev,
          talentDescription: response.text || ''
        }));
        toast.success('⭐ Unique talent description generated!');
      } else {
        throw new Error(response.error || 'Failed to generate talent description');
      }
    } catch (error) {
      console.error('Talent generation error:', error);
      // Fallback to template generation on error
      const fallbackTalent = generateFallbackTalentDescription(formData.fullName, formData.instrumentTypes, formData.singingTypes);
      setFormData(prev => ({
        ...prev,
        talentDescription: fallbackTalent
      }));
      toast.success('📝 Generated talent description using template!');
    } finally {
      setIsGeneratingBio(false);
    }
  };

  // Enhanced AI-powered talent description improvement
  const handleImproveTalent = async () => {
    if (!formData.talentDescription.trim()) {
      toast.error('Please write something first to improve');
      return;
    }
    setIsGeneratingBio(true);
    try {
      if (aiServiceStatus === 'unavailable') {
        toast.error('❌ AI service unavailable. Please improve your description manually.');
        return;
      }
      
      const talentTypes = [...formData.instrumentTypes, ...formData.singingTypes];
      const prompt = `Enhance this musician's uniqueness description to make it more compelling and professional.
      
      Original description: "${formData.talentDescription}"
      Musician: ${formData.fullName}
      Specialties: ${talentTypes.join(', ')}
      
      Improve by:
      - Making it more specific and unique
      - Adding concrete examples
      - Enhancing the professional tone
      - Highlighting what truly sets them apart
      - Making it more engaging for potential collaborators
      
      Keep it 100-150 words and maintain authenticity.`;
      
      const response = await generateAiResponse(prompt);
      
      if (response.success && response.text) {
        setFormData(prev => ({
          ...prev,
          talentDescription: response.text || ''
        }));
        toast.success('🌟 Uniqueness enhanced with AI!');
      } else {
        throw new Error(response.error || 'Failed to improve talent description');
      }
    } catch (error) {
      console.error('Talent improvement error:', error);
      toast.error('❌ AI service unavailable. Please improve manually.');
    } finally {
      setIsGeneratingBio(false);
    }
  };

  // Update the validation function
  const validateStep = (step: number): boolean => {
    let isValid = true;
    const errors: Partial<FormErrors> = {};

    switch (step) {
      case 1: // Account
        if (!formData.fullName.trim()) {
          errors.fullName = 'Name is required';
          isValid = false;
        }

        if (!formData.email.trim()) {
          errors.email = 'Email is required';
          isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          errors.email = 'Email is invalid';
          isValid = false;
        }

        if (!formData.password) {
          errors.password = 'Password is required';
          isValid = false;
        } else if (formData.password.length < 6) {
          errors.password = 'Password must be at least 6 characters';
          isValid = false;
        }

        if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
          isValid = false;
        }
        break;

      case 2: // Contact
        // Phone number is now optional - only validate if provided
        if (formData.contactNumber && formData.contactNumber.trim() && formData.contactNumber.length < 8) {
          errors.contactNumber = 'Please enter a valid phone number';
          isValid = false;
        }

        if (!formData.country) {
          errors.country = 'Country is required';
          isValid = false;
        }

        if (!formData.gender) {
          errors.gender = 'Please select your gender';
          isValid = false;
        }
        break;

      case 3: // Music
        // User must have either instruments or singing types (at least one)
        if (!formData.instrumentTypes.length && !formData.singingTypes.length) {
          errors.instrumentTypes = ['Please select at least one instrument or singing style'];
          isValid = false;
        }

        if (!formData.musicCulture) {
          errors.musicCulture = 'Music culture is required';
          isValid = false;
        }
        break;

      case 4: // Profile
        if (!formData.bio.trim()) {
          errors.bio = 'Bio is required';
          isValid = false;
        } else if (formData.bio.length < 50) {
          errors.bio = 'Bio should be at least 50 characters';
          isValid = false;
        } else if (formData.bio.length > 1000) {
          errors.bio = 'Bio should not exceed 1000 characters';
          isValid = false;
        }

        if (!formData.talentDescription.trim()) {
          errors.talentDescription = 'Talent description is required';
          isValid = false;
        } else if (formData.talentDescription.length < 50) {
          errors.talentDescription = 'Please provide more details about your talent';
          isValid = false;
        }
        break;
    }

    setFormErrors(prev => ({ ...prev, ...errors }));
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Update handleChange to use the new FormErrors type
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSelectChange = (name: string) => (selectedOption: any) => {
    setFormData({
      ...formData,
      [name]: selectedOption ? selectedOption.value : '',
    });
  };

  // Update image URL handling with type assertion
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const validation = await validateAndProcessImage(file);
      if (!validation.isValid) {
        toast.error(validation.error || 'Invalid image');
        return;
      }

      setIsLoading(true);
      setPhotoError(null);

      // Create preview URL
      const previewURL = URL.createObjectURL(validation.processedFile!);
      
      // Clean up previous preview URL if it exists
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Update states
      setPreviewUrl(previewURL);
      setFormData(prev => ({
        ...prev,
        profileImage: validation.processedFile!,
        profileImagePath: previewURL // Store the preview URL temporarily
      }));

      setFormErrors(prev => ({
        ...prev,
        profileImage: undefined
      }));

    } catch (error) {
      console.error('Error handling image:', error);
      toast.error('Failed to process image');
      setPhotoError('Failed to process image');
      setFormErrors(prev => ({
        ...prev,
        profileImage: 'Failed to process image'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Update phone input handling
  const handlePhoneChange = (value: string, countryData: any) => {
    // Remove all non-digit characters for detection
    const cleanNumber = value.replace(/\D/g, '');
    
    // Only try to detect if user is actually typing a number
    if (cleanNumber.length > 0) {
      const detectedCountry = detectCountryFromPhone(cleanNumber);
      
      // Update form data with the phone number
      setFormData(prev => ({
        ...prev,
      contactNumber: value,
        // Only update country if we detected one
        ...(detectedCountry ? { country: detectedCountry.toUpperCase() } : {})
      }));

      // Clear any existing errors
      if (formErrors.contactNumber || formErrors.country) {
        setFormErrors(prev => ({
          ...prev,
          contactNumber: '',
          country: ''
        }));
      }
    } else {
      // Reset both phone number and country when empty
      setFormData(prev => ({
        ...prev,
        contactNumber: '',
        country: ''
      }));
    }
  };

  // Enhanced handleSubmit with better error handling and user feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) return;
    
    // Check rate limiting
    if (!rateLimiter.canAttempt()) {
      toast.error('Too many registration attempts. Please try again later.', {
        duration: 3000
      });
      return;
    }
    
    setRegistrationStatus({
      isSubmitting: true,
      progress: 0,
      currentTask: 'Starting registration...'
    });
    
    try {
      // Record attempt
      rateLimiter.recordAttempt();

      // Step 1: Validate all user data
      setRegistrationStatus(prev => ({
        ...prev,
        progress: 10,
        currentTask: 'Validating your information...'
      }));
      
      const validationErrors = validateUserData(formData);
      if (Object.keys(validationErrors).length > 0) {
        setFormErrors(prev => ({ ...prev, ...validationErrors }));
        toast.error('Please fix the validation errors before proceeding', {
          duration: 3000
        });
        return;
      }

      // Step 2: Create Firebase Auth account
      setRegistrationStatus(prev => ({
        ...prev,
        progress: 30,
        currentTask: 'Creating your account...'
      }));
      
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const user = userCredential.user;
      
      // Send email verification
      await sendEmailVerification(user);
      
      setRegistrationStatus(prev => ({
        ...prev,
        progress: 50,
        currentTask: 'Verifying email...'
      }));
      
      // Step 3: Handle profile image
      let profileImageData = null;
      if (formData.profileImage) {
        try {
          setRegistrationStatus(prev => ({
            ...prev,
            progress: 60,
            currentTask: 'Processing profile photo...'
          }));

          profileImageData = await uploadProfilePhoto(formData.profileImage, user.uid);

          if (!profileImageData?.path) {
            throw new Error('Failed to get image path from server');
          }

          toast.success('Profile photo uploaded successfully!', {
            duration: 2000
          });
        } catch (error) {
          console.error('Error processing profile photo:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to process profile photo';
          
          toast.error(`Failed to upload profile photo: ${errorMessage}. Continuing without photo.`, {
            duration: 4000
          });
          
          setRegistrationStatus(prev => ({
            ...prev,
            progress: 70,
            currentTask: 'Continuing without profile photo...'
          }));
        }
      }
      
      // Step 4: Save user data to Firestore
      setRegistrationStatus(prev => ({
        ...prev,
        progress: 80,
        currentTask: 'Saving your profile data...'
      }));
      
      const userData = {
        uid: user.uid,
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        contactNumber: formData.contactNumber,
        country: formData.country,
        gender: formData.gender,
        instrumentTypes: formData.instrumentTypes,  // Save array directly
        singingTypes: formData.singingTypes,       // Save array directly
        musicCulture: formData.musicCulture,
        bio: formData.bio.trim(),
        profileImagePath: profileImageData?.path || '',
        profileImageUrl: profileImageData?.url || '',
        profileImageStatus: profileImageData ? 'uploaded' : 'none',
        profileImageUploadedAt: profileImageData ? new Date() : null,
        isVerified: false,
        verificationStatus: 'pending',
        role: 'user',
        welcomeMessage: await generateWelcomeMessage(
          formData.fullName,
          formData.instrumentTypes.join(', ')
        ),
        createdAt: new Date(),
        lastUpdated: new Date(),
        lastLogin: new Date(),
        accountStatus: 'active',
        emailVerified: false,
        phoneVerified: false,
        registrationIP: '',
        registrationDevice: navigator.userAgent,
        securitySettings: {
          twoFactorEnabled: false,
          loginNotifications: true,
          profileVisibility: 'public'
        },
        registrationCompleted: true,
        registrationSteps: {
          accountCreated: true,
          profilePhotoUploaded: !!profileImageData,
          welcomeMessageGenerated: true,
          dataSaved: false
        },
        talentDescription: formData.talentDescription.trim(),
      };

      // Save data with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let saveSuccess = false;

      while (retryCount < maxRetries && !saveSuccess) {
        try {
      await setDoc(doc(db, 'users', user.uid), userData);
          saveSuccess = true;

          // Verify data was saved
          const savedUserDoc = await getDoc(doc(db, 'users', user.uid));
          if (!savedUserDoc.exists()) {
            throw new Error('Failed to verify user data was saved');
          }

          const savedData = savedUserDoc.data();
          if (profileImageData && savedData?.profileImagePath !== profileImageData.path) {
            throw new Error('Failed to verify image path was saved correctly');
          }

          // Auto-login
          if (auth.currentUser?.uid !== user.uid) {
            await signInWithEmailAndPassword(auth, formData.email, formData.password);
          }
      
      // Show success message and navigate to profile
          window.location.href = '/profile?registered=true';
        } catch (error) {
          retryCount++;
          console.error(`Attempt ${retryCount} failed:`, error);
          
          if (retryCount === maxRetries) {
            // Delete user account if data saving fails
            await deleteUser(user);
            throw new Error('Failed to save user data after multiple attempts');
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Failed to register. Please try again.';
      
      if ((error as AuthError)?.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please log in or use a different email.';
      } else if ((error as AuthError)?.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if ((error as AuthError)?.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password registration is not enabled. Please contact support.';
      } else if ((error as AuthError)?.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setRegistrationStatus({
        isSubmitting: false,
        progress: 0,
        currentTask: `Error: ${errorMessage}`
      });

      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setRegistrationStatus(prev => ({
        ...prev,
        isSubmitting: false
      }));
    }
  };

  // Progress bar component with enhanced animations
  const ProgressBar = () => {
    return (
      <div className="w-full mb-8">
        <div className="flex justify-between mb-2">
          {stepLabels.map((step) => (
            <div
              key={step.number}
              className={`flex flex-col items-center ${
                currentStep >= step.number ? 'text-primary-500' : 'text-gray-500'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  currentStep > step.number
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : currentStep === step.number
                    ? 'border-primary-500 text-primary-500'
                    : 'border-gray-500 text-gray-500'
                }`}
              >
                {currentStep > step.number ? <Check size={20} /> : step.icon}
              </div>
              <span className="text-sm mt-2 font-medium">{step.label}</span>
            </div>
          ))}
        </div>
        <div className="relative h-2 bg-dark-600 rounded-full overflow-hidden mt-4">
          <div
            className="absolute h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500 ease-in-out"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          ></div>
        </div>
      </div>
    );
  };

  // Add RegistrationProgress component
  const RegistrationProgress = () => {
    if (!registrationStatus.isSubmitting) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800/95 p-6 rounded-xl border-2 border-gray-700 max-w-md w-full mx-4">
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
            
            <div className="space-y-2">
              <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${registrationStatus.progress}%` }}
                ></div>
              </div>
              
              <div className="text-center">
                <p className="text-gray-300 text-sm font-medium">
                  {registrationStatus.currentTask}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {registrationStatus.progress}% Complete
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add helper to get selected option from value
  const getSelectedOption = (options: any[], value: string) => {
    for (const group of options) {
      if (group.options) {
        const found = group.options.find((opt: any) => opt.value === value);
        if (found) return found;
      } else if (group.value === value) {
        return group;
      }
    }
    return null;
  };

  // Update Select components to maintain selected values
  const renderInstrumentSelect = () => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-200">
        What instruments do you play?
      </label>
      <TalentTypeSelector
        groups={INSTRUMENT_TYPE_GROUPS}
        selectedTypes={formData.instrumentTypes}
        onChange={(types: string[]) => setFormData(prev => ({ ...prev, instrumentTypes: types }))}
        title="Select your instruments"
        icon={Music}
      />
    </div>
  );

  const renderVocalSelect = () => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-200">
        What are your singing styles?
      </label>
      <TalentTypeSelector
        groups={SINGING_TYPE_GROUPS}
        selectedTypes={formData.singingTypes}
        onChange={(types: string[]) => setFormData(prev => ({ ...prev, singingTypes: types }))}
        title="Select your singing styles"
        icon={Mic}
      />
    </div>
  );

  const renderMusicCultureSelect = () => (
    <Select
      options={enhancedMusicCultures}
      styles={enhancedSelectStyles}
      placeholder="Select your primary music culture"
      value={formData.musicCulture ? getSelectedOption(enhancedMusicCultures, formData.musicCulture) : null}
      onChange={handleSelectChange('musicCulture')}
      components={{
        Option: CustomOption,
        GroupHeading: CustomGroupHeading
      }}
      isSearchable
      classNamePrefix="react-select"
      className={formErrors.musicCulture ? 'select-error' : ''}
    />
  );

  const renderCountrySelect = () => (
    <Select
      options={countryOptions}
      styles={enhancedSelectStyles}
      placeholder="Select your country"
      value={formData.country ? getSelectedOption(countryOptions, formData.country) : null}
      onChange={handleSelectChange('country')}
      components={{
        Option: CustomCountryOption,
        GroupHeading: CustomGroupHeading
      }}
      isSearchable
      classNamePrefix="react-select"
      className={formErrors.country ? 'select-error' : ''}
    />
  );

  const renderGenderSelect = () => (
    <div className="relative">
      <Select
        options={genderOptions}
        styles={{
          ...enhancedSelectStyles,
          control: (base: any, state: any) => ({
            ...base,
            backgroundColor: '#1a1a1a',
            borderColor: state.isFocused ? '#ec4899' : '#374151',
            boxShadow: state.isFocused ? '0 0 0 2px rgba(236, 72, 153, 0.5)' : 'none',
            borderRadius: '0.75rem',
            padding: '2px',
            transition: 'all 200ms ease',
            minHeight: '48px',
            '&:hover': {
              borderColor: state.isFocused ? '#ec4899' : '#4b5563',
            },
          }),
          option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isSelected 
              ? '#ec4899' 
              : state.isFocused 
                ? 'rgba(236, 72, 153, 0.1)' 
                : 'transparent',
            color: state.isSelected ? 'white' : '#e5e7eb',
            padding: '12px 16px',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            fontSize: '0.9375rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            '&:active': {
              backgroundColor: '#ec4899',
            },
          }),
        }}
        placeholder="Choose your gender"
        value={formData.gender ? genderOptions.find(option => option.value === formData.gender) : null}
        onChange={handleSelectChange('gender')}
        components={{
          Option: CustomOption
        }}
        isSearchable={false}
        classNamePrefix="react-select"
        className={formErrors.gender ? 'select-error' : ''}
      />
    </div>
  );

  // Add effect to restore data from session storage
  useEffect(() => {
    const savedData = sessionStorage.getItem('registrationData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setFormData(prev => ({
        ...prev,
        ...parsedData
      }));
    }
  }, []);

  // Update phone input component
  const renderPhoneInput = () => (
    <div className={`phone-input-container ${formErrors.contactNumber ? 'error' : ''} group`}>
      <PhoneInput
        country={''}
        value={formData.contactNumber}
        onChange={handlePhoneChange}
        enableSearch
        searchPlaceholder="Search countries..."
        countryCodeEditable={true}
        enableAreaCodes={true}
        disableSearchIcon={false}
        autoFormat={true}
        inputProps={{
          required: false,
          className: "phone-input focus:ring-2 focus:ring-blue-500/20",
          placeholder: "Enter phone number (optional)"
        }}
        searchStyle={{
          width: '100%',
          height: '40px',
          padding: '8px 12px',
          fontSize: '14px',
          backgroundColor: '#1f2937',
          color: '#f3f4f6',
          border: 'none'
        }}
        buttonStyle={{
          border: 'none',
          padding: '0 16px',
          background: 'transparent',
        }}
        inputStyle={{
          width: '100%',
          height: '48px',
          fontSize: '16px',
          backgroundColor: 'transparent',
          borderRadius: '12px',
          borderWidth: '2px',
          borderColor: formErrors.contactNumber ? '#ef4444' : '#374151',
          color: '#f3f4f6',
          paddingLeft: '62px'
        }}
        dropdownStyle={{
          width: '300px',
          maxHeight: '300px',
          backgroundColor: '#1f2937',
          border: '2px solid #374151',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
        searchClass="search-box"
        containerClass={`phone-input-container ${formErrors.contactNumber ? 'error' : ''}`}
        preferredCountries={[]}
        regions={['america', 'europe', 'asia', 'oceania', 'africa']}
      />
    </div>
  );

  const handleGoogleRegister = async () => {
    try {
      setIsLoading(true);
      const userProfile = await AuthService.registerWithGoogle();
      
      // Navigate to profile with registration flag
      window.location.href = '/profile?registered=true';
    } catch (error) {
      // Optionally, show error toast
      console.error('Google registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const registerSchema = `{
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Register | SoundAlchemy",
    "description": "Sign up for SoundAlchemy and join a global community of musicians, orchestras, and creators. Powered by Lehan Kawshila.",
    "url": "https://soundalcmy.com/register"
  }`;

  return (
    <>
      <SEO
        title="Register | SoundAlchemy – Join Global Musicians & Music Platform"
        description="Sign up for SoundAlchemy and join a global community of musicians, orchestras, and creators. Powered by Lehan Kawshila."
        keywords="soundalcmy, soundalchemy, music, register, sign up, global musicians, lehan kawshila, orchestra, guitar, world wide"
        image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
        url="https://soundalcmy.com/register"
        lang="en"
        schema={registerSchema}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="glass-card rounded-xl p-8 w-full max-w-2xl mx-auto"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Join SoundAlchemy</h2>
          <p className="text-gray-400 mt-2">Create your musician account</p>
          <button
            type="button"
            onClick={handleGoogleRegister}
            className="w-full bg-white border border-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-50 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
            </svg>
            Continue with Google
          </button>
        </div>

        <ProgressBar />

        <form onSubmit={handleSubmit}>
          {/* Step 1: Account Information */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold mb-4">Account Information</h3>
              
              <div className="mb-4">
                <label htmlFor="fullName" className="block text-gray-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                    className={`form-input pl-10 ${formErrors.fullName ? 'border-red-500' : ''}`}
                  placeholder="Your full name"
                />
                  <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
                {formErrors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.fullName}</p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                    className={`form-input pl-10 ${formErrors.email ? 'border-red-500' : ''}`}
                  placeholder="your.email@example.com"
                />
                  <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
                {formErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                )}
              </div>

              <PasswordInput
                  name="password"
                label="Password"
                  value={formData.password}
                  onChange={handleChange}
                error={formErrors.password}
                  placeholder="Create a strong password"
                />

              <PasswordInput
                  name="confirmPassword"
                label="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                error={formErrors.confirmPassword}
                  placeholder="Confirm your password"
                />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary"
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <FaPhone className="text-primary-500" />
                Contact Information
              </h3>

              <div className="space-y-8">
                {/* Helpful message about contact information */}
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-300">
                      <p className="font-medium text-green-400 mb-1">Contact Information</p>
                      <p>Share your contact details to help other musicians reach out for collaborations. <strong>Phone number is completely optional</strong> - you can skip it now and add it later in your profile settings.</p>
                    </div>
                  </div>
                </div>

                {/* Gender Selection */}
                <div className="relative">
                  <label className="block text-gray-300 mb-3 font-medium flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg">
                      <span className="text-lg">👤</span>
                    </div>
                    Gender
                  </label>
                  {renderGenderSelect()}
                  {formErrors.gender && (
                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {formErrors.gender}
                    </p>
                  )}
                  <p className="text-gray-400 text-sm mt-2 flex items-center gap-1">
                    <Info className="w-4 h-4 opacity-70" />
                    This helps us personalize your experience and connect you with relevant musicians
                  </p>
                </div>

                <div className="relative">
                  <label className="block text-gray-300 mb-3 font-medium flex items-center gap-2">
                    <FaPhone className="text-primary-500 w-4 h-4" />
                    Phone Number
                    <span className="text-gray-400 text-sm font-normal">(Optional)</span>
                </label>
                  {renderPhoneInput()}
                {formErrors.contactNumber && (
                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {formErrors.contactNumber}
                    </p>
                )}
                  <p className="text-gray-400 text-sm mt-2 flex items-center gap-1">
                    <Info className="w-4 h-4 opacity-70" />
                    Phone number is optional - you can add it later in your profile settings
                  </p>
              </div>

                <div className="relative">
                  <label className="block text-gray-300 mb-2 flex items-center gap-2">
                    <FaGlobe className="text-primary-500 w-4 h-4" />
                  Country
                </label>
                  {renderCountrySelect()}
                {formErrors.country && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.country}</p>
                )}
              </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="btn-outline flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className={`btn-primary flex items-center gap-2 ${
                      !formData.country || !formData.gender
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:translate-x-1'
                  }`}
                    disabled={!formData.country || !formData.gender}
                >
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Musical Information */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <FaMusic className="text-primary-500" />
                Musical Background
              </h3>

              <div className="space-y-6">
                {/* Helpful message about musical background */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-300">
                      <p className="font-medium text-blue-400 mb-1">Musical Background</p>
                      <p>Tell us about your musical talents! You can select instruments you play, singing styles, or both. <strong>You need to select at least one</strong> (either instruments or singing styles) to help other musicians find you for collaborations.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 flex items-center gap-2">
                    <Music className="w-5 h-5 text-primary-500" />
                    Instruments You Play
                    <span className="text-gray-400 text-sm font-normal">(Optional)</span>
                  </label>
                  {renderInstrumentSelect()}
                  {formErrors.instrumentTypes && formErrors.instrumentTypes.length > 0 && (
                    <p className="text-red-500 text-sm mt-1">
                      {Array.isArray(formErrors.instrumentTypes) ? formErrors.instrumentTypes.join(', ') : formErrors.instrumentTypes}
                    </p>
                  )}
                  <p className="text-gray-400 text-sm mt-2 flex items-center gap-1">
                    <Info className="w-4 h-4 opacity-70" />
                    Select instruments you play - Optional for vocalists
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 flex items-center gap-2">
                    <Mic className="w-5 h-5 text-primary-500" />
                    Vocal Styles
                    <span className="text-gray-400 text-sm font-normal">(Optional)</span>
                  </label>
                  {renderVocalSelect()}
                  <p className="text-gray-400 text-sm mt-2 flex items-center gap-1">
                    <Info className="w-4 h-4 opacity-70" />
                    Select your singing styles - Optional for instrumentalists
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary-500" />
                    Music Culture
                  </label>
                  {renderMusicCultureSelect()}
                  {formErrors.musicCulture && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.musicCulture}</p>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="btn-outline flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={(!formData.instrumentTypes.length && !formData.singingTypes.length) || !formData.musicCulture}
                    className={`btn-primary flex items-center gap-2 ${
                      (!formData.instrumentTypes.length && !formData.singingTypes.length) || !formData.musicCulture
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:translate-x-1'
                    }`}
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Profile Information */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h3 className="text-xl font-semibold flex items-center gap-3">
                <FaCamera className="text-primary-500" />
                Profile Information
              </h3>

                {/* AI Service Status Indicator */}
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                    aiServiceStatus === 'available' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : aiServiceStatus === 'unavailable' 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {aiServiceStatus === 'available' ? (
                      <>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>AI Ready</span>
                      </>
                    ) : aiServiceStatus === 'unavailable' ? (
                      <>
                        <X className="w-3 h-3" />
                        <span>AI Unavailable</span>
                      </>
                    ) : (
                      <>
                        <Loader className="w-3 h-3 animate-spin" />
                        <span>Checking AI...</span>
                      </>
                    )}
                    </div>
                  </div>
                </div>

              <div className="space-y-8">


                {/* Enhanced Bio Section */}
                <div className="relative">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <label className="block text-gray-300 font-semibold flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl shadow-lg">
                        <FaLightbulb className="text-blue-400 w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Personal Bio
                    </div>
                        <div className="text-sm text-gray-400 font-normal flex items-center gap-1">
                          <Music className="w-3 h-3" />
                          Tell your musical story
                        </div>
                      </div>
                    </label>
                    
                    <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateBioSuggestion}
                        className={`px-3 py-2.5 rounded-xl border transition-all duration-300 flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl ${
                          aiServiceStatus === 'unavailable' 
                            ? 'bg-gray-500/20 border-gray-500/30 text-gray-400 cursor-not-allowed' 
                            : isGeneratingBio 
                              ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 opacity-50 cursor-wait' 
                              : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 text-blue-400 hover:from-blue-500/30 hover:to-purple-500/30 hover:scale-105 hover:-translate-y-0.5'
                      }`}
                        disabled={isGeneratingBio || aiServiceStatus === 'unavailable'}
                        title={aiServiceStatus === 'unavailable' ? 'AI service unavailable' : 'Generate bio with AI'}
                    >
                      {isGeneratingBio ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                            <span className="hidden xs:inline">Generating...</span>
                          </>
                        ) : aiServiceStatus === 'unavailable' ? (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden xs:inline">Generate Template</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                            <span className="hidden xs:inline">AI Generate</span>
                        </>
                      )}
                    </button>
                      
                      {formData.bio && (
                        <button
                          type="button"
                          onClick={() => handleImproveBio()}
                          className={`px-3 py-2.5 rounded-xl border transition-all duration-300 flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl ${
                            aiServiceStatus === 'unavailable' 
                              ? 'bg-gray-500/20 border-gray-500/30 text-gray-400 cursor-not-allowed' 
                              : isGeneratingBio 
                                ? 'bg-green-500/20 border-green-500/30 text-green-400 opacity-50 cursor-wait' 
                                : 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400 hover:from-green-500/30 hover:to-emerald-500/30 hover:scale-105 hover:-translate-y-0.5'
                          }`}
                          disabled={isGeneratingBio || aiServiceStatus === 'unavailable'}
                          title={aiServiceStatus === 'unavailable' ? 'AI service unavailable' : 'Improve bio with AI'}
                        >
                          {isGeneratingBio ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              <span className="hidden xs:inline">Improving...</span>
                            </>
                          ) : aiServiceStatus === 'unavailable' ? (
                            <>
                              <X className="w-4 h-4" />
                              <span className="hidden xs:inline">AI Unavailable</span>
                            </>
                          ) : (
                            <>
                              <FaRobot className="w-4 h-4" />
                              <span className="hidden xs:inline">Improve</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative group">
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                      onFocus={() => setShowBioSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowBioSuggestions(false), 200)}
                      className={`w-full h-36 px-4 py-4 bg-gray-800/90 border-2 ${
                        formErrors.bio ? 'border-red-500' : 'border-gray-700'
                      } rounded-xl text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 group-hover:border-gray-600 shadow-lg`}
                      placeholder={currentBioPlaceholder}
                    />
                    
                    <div className="absolute right-4 top-4 text-gray-400 group-hover:text-blue-400 transition-colors">
                      <FaLightbulb className="w-5 h-5" />
                    </div>
                    
                    {/* Enhanced Bio Suggestions Popup */}
                    {showBioSuggestions && (
                      <div className="absolute top-full left-0 right-0 mt-3 p-5 bg-gray-800/95 border-2 border-gray-700 rounded-xl backdrop-blur-sm z-10 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Lightbulb className="w-4 h-4 text-blue-400" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-200">Professional Bio Tips</h4>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 text-green-400">
                              <div className="p-1 bg-green-500/20 rounded-full">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-gray-300 font-medium">Years of experience</span>
                            </div>
                            <div className="flex items-center gap-3 text-green-400">
                              <div className="p-1 bg-green-500/20 rounded-full">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-gray-300 font-medium">Musical influences</span>
                            </div>
                            <div className="flex items-center gap-3 text-green-400">
                              <div className="p-1 bg-green-500/20 rounded-full">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-gray-300 font-medium">Performance highlights</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 text-green-400">
                              <div className="p-1 bg-green-500/20 rounded-full">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-gray-300 font-medium">Teaching philosophy</span>
                            </div>
                            <div className="flex items-center gap-3 text-green-400">
                              <div className="p-1 bg-green-500/20 rounded-full">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-gray-300 font-medium">Collaboration style</span>
                            </div>
                            <div className="flex items-center gap-3 text-green-400">
                              <div className="p-1 bg-green-500/20 rounded-full">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-gray-300 font-medium">Future goals</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                {formErrors.bio && (
                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {formErrors.bio}
                    </p>
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Info className="w-4 h-4" />
                        Min 50 characters
                      </span>
                      <span className={`text-sm font-medium ${formData.bio.length > 800 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {formData.bio.length}/1000
                      </span>
                    </div>
                    
                    {formData.bio.length >= 50 && (
                      <div className="flex items-center gap-2 text-green-400">
                        <div className="p-1 bg-green-500/20 rounded-full">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-sm font-medium">Valid bio</span>
                      </div>
                    )}
                  </div>
              </div>

                {/* Enhanced Talent Description Section */}
                <div className="relative">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <label className="block text-gray-300 font-semibold flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl shadow-lg">
                        <Star className="text-purple-400 w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    What Makes You Unique?
                        </div>
                        <div className="text-sm text-gray-400 font-normal flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Showcase your special talents
                        </div>
                      </div>
              </label>
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateTalentSuggestion}
                        className={`px-3 py-2.5 rounded-xl border transition-all duration-300 flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl ${
                          aiServiceStatus === 'unavailable' 
                            ? 'bg-gray-500/20 border-gray-500/30 text-gray-400 cursor-not-allowed' 
                            : isGeneratingBio 
                              ? 'bg-purple-500/20 border-purple-500/30 text-purple-400 opacity-50 cursor-wait' 
                              : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400 hover:from-purple-500/30 hover:to-pink-500/30 hover:scale-105 hover:-translate-y-0.5'
                        }`}
                        disabled={isGeneratingBio || aiServiceStatus === 'unavailable'}
                        title={aiServiceStatus === 'unavailable' ? 'AI service unavailable' : 'Generate talent description with AI'}
                      >
                        {isGeneratingBio ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span className="hidden xs:inline">Generating...</span>
                          </>
                        ) : aiServiceStatus === 'unavailable' ? (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden xs:inline">Generate Template</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden xs:inline">AI Generate</span>
                          </>
                        )}
                      </button>
                      
                      {formData.talentDescription && (
                        <button
                          type="button"
                          onClick={handleImproveTalent}
                          className={`px-3 py-2.5 rounded-xl border transition-all duration-300 flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl ${
                            aiServiceStatus === 'unavailable' 
                              ? 'bg-gray-500/20 border-gray-500/30 text-gray-400 cursor-not-allowed' 
                              : isGeneratingBio 
                                ? 'bg-orange-500/20 border-orange-500/30 text-orange-400 opacity-50 cursor-wait' 
                                : 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30 text-orange-400 hover:from-orange-500/30 hover:to-red-500/30 hover:scale-105 hover:-translate-y-0.5'
                          }`}
                          disabled={isGeneratingBio || aiServiceStatus === 'unavailable'}
                          title={aiServiceStatus === 'unavailable' ? 'AI service unavailable' : 'Improve talent description with AI'}
                        >
                          {isGeneratingBio ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              <span className="hidden xs:inline">Improving...</span>
                            </>
                          ) : aiServiceStatus === 'unavailable' ? (
                            <>
                              <X className="w-4 h-4" />
                              <span className="hidden xs:inline">AI Unavailable</span>
                            </>
                          ) : (
                            <>
                              <FaRobot className="w-4 h-4" />
                              <span className="hidden xs:inline">Improve</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                                  <div className="relative group">
                    <textarea
                      name="talentDescription"
                      value={formData.talentDescription}
                      onChange={handleChange}
                      onFocus={() => setShowTalentSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowTalentSuggestions(false), 200)}
                      className={`w-full h-36 px-4 py-4 bg-gray-800/90 border-2 ${
                        formErrors.talentDescription ? 'border-red-500' : 'border-gray-700'
                      } rounded-xl text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 group-hover:border-gray-600 shadow-lg`}
                      placeholder={currentTalentPlaceholder}
                    />
                    
                    <div className="absolute right-4 top-4 text-gray-400 group-hover:text-purple-400 transition-colors">
                      <Star className="w-5 h-5" />
                  </div>

                    {/* Enhanced Talent Suggestions Popup */}
                    {showTalentSuggestions && (
                      <div className="absolute top-full left-0 right-0 mt-3 p-5 bg-gray-800/95 border-2 border-gray-700 rounded-xl backdrop-blur-sm z-10 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Star className="w-4 h-4 text-purple-400" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-200">Uniqueness Highlights</h4>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 text-green-400">
                              <div className="p-1 bg-green-500/20 rounded-full">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-gray-300 font-medium">Unique playing techniques</span>
                            </div>
                            <div className="flex items-center gap-3 text-green-400">
                              <div className="p-1 bg-green-500/20 rounded-full">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-gray-300 font-medium">Special achievements</span>
                            </div>
                            <div className="flex items-center gap-3 text-green-400">
                              <div className="p-1 bg-green-500/20 rounded-full">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-gray-300 font-medium">Creative process</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 text-green-400">
                              <div className="p-1 bg-green-500/20 rounded-full">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-gray-300 font-medium">Musical innovations</span>
                            </div>
                            <div className="flex items-center gap-3 text-green-400">
                              <div className="p-1 bg-green-500/20 rounded-full">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-gray-300 font-medium">Performance style</span>
                            </div>
                            <div className="flex items-center gap-3 text-green-400">
                              <div className="p-1 bg-green-500/20 rounded-full">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-gray-300 font-medium">Personal touch</span>
                            </div>
                          </div>
                        </div>
                  </div>
                    )}
                  </div>
                  
                  {formErrors.talentDescription && (
                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {formErrors.talentDescription}
                    </p>
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Info className="w-4 h-4" />
                        Be specific & unique
                      </span>
                      <span className={`text-sm font-medium ${formData.talentDescription.length > 400 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {formData.talentDescription.length}/500
                      </span>
                    </div>
                    
                    {formData.talentDescription.length >= 50 && (
                      <div className="flex items-center gap-2 text-green-400">
                        <div className="p-1 bg-green-500/20 rounded-full">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-sm font-medium">Valid description</span>
                      </div>
                    )}
                </div>
              </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="btn-outline flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={registrationStatus.isSubmitting || !formData.bio || !formData.talentDescription}
                    className={`btn-primary flex items-center gap-2 ${
                      registrationStatus.isSubmitting || !formData.bio || !formData.talentDescription
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:translate-x-1'
                    }`}
                  >
                    {registrationStatus.isSubmitting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </form>

        {/* Registration Progress Overlay */}
        <RegistrationProgress />

        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300">
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </>
  );
};

// Add the styles to the existing styles
const styles = `
  ${enhancedPhoneInputStyles.container}

  @keyframes selectMenuFade {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes buttonPulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  @keyframes gradientShift {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  .select-error .react-select__control {
    @apply border-red-500;
  }

  .react-select__menu {
    @apply z-50;
  }

  /* Custom breakpoint for extra small screens */
  @media (min-width: 475px) {
    .xs\\:inline {
      display: inline;
    }
  }

  /* Enhanced button animations */
  .btn-ai-generate {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2));
    background-size: 200% 200%;
    animation: gradientShift 3s ease infinite;
  }

  .btn-ai-improve {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2));
    background-size: 200% 200%;
    animation: gradientShift 3s ease infinite;
  }

  /* Enhanced hover effects */
  .hover-lift {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  }

  /* Professional text gradients */
  .text-gradient-blue {
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .text-gradient-purple {
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

export default RegisterPage;