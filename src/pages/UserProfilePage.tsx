import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { compressImage, validateImage } from '../utils/imageUtils';
import { 
  User, 
  Music, 
  MapPin, 
  Phone, 
  Mail, 
  Edit3, 
  Camera,
  Save,
  X,
  Loader,
  BookOpen,
  LightbulbIcon,
  HandHelping,
  BarChart2,
  FileMusic,
  Users,
  Book,
  Award,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Star,
  Heart,
  MessageCircle,
  Share2,
  Mic,
  Headphones,
  Video,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Target as TargetIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Share2 as Share2Icon,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  BadgeCheck
} from 'lucide-react';
import { analyzeBioForSuggestions, generateCollaborationIdeas } from '../config/aiService';
import { Country, countries, getCountryInfo } from '../utils/countries';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { INSTRUMENT_TYPE_GROUPS, SINGING_TYPE_GROUPS } from '../utils/constants';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import VerifiedBadge from '../components/common/VerifiedBadge';
import Select, { GroupBase, SingleValue } from 'react-select';
import { FaInstagram, FaFacebook, FaYoutube, FaLinkedin, FaTiktok, FaSpotify } from 'react-icons/fa';
import SEO from '../components/common/SEO';
import type { TalentType } from '../utils/constants';

const imageCache = new Map<string, string>();
const preloadedImages = new Set<string>();

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

const batchPreloadImages = async (urls: string[]) => {
  const uniqueUrls = urls.filter(url => url && !preloadedImages.has(url));
  if (uniqueUrls.length === 0) return;

  const promises = uniqueUrls.map(url => preloadImage(url).catch(() => {}));
  await Promise.allSettled(promises);
};

interface UserProfile {
  id?: string;
  fullName: string;
  email?: string;
  contactNumber: string;
  country: string;
  gender?: string; // Add gender field
  bio: string;
  profileImagePath?: string;
  profileImage?: File | null;
  previewURL?: string;
  talentDescription: string;
  instrumentTypes: string[];  // Make this required
  instrumentType?: string;    // Keep for backward compatibility
  singingTypes: string[];    // Make this required
  singingType?: string;      // Keep for backward compatibility
  lastUpdated?: Date;
  createdAt?: Date;
  isVerified?: boolean;
  verificationStatus?: string;
  role?: string;
  welcomeMessage?: string;
  musicCulture?: string;
  skills?: string[];
  interests?: string[];
  analytics?: {
    totalPlays: number;
    followers: number;
    collaborations: number;
    monthlyGrowth: number;
    profileViews: number;
    projects: number;
  };
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    linkedin?: string;
    tiktok?: string;
    spotify?: string;
    [key: string]: string | undefined;
  };
}

interface PracticeSession {
  id: string;
  date: Date;
  duration: number;
  focus: string;
  notes: string;
  mood: string;
  achievements: string[];
}

interface MusicEvent {
  id: string;
  title: string;
  type: 'concert' | 'workshop' | 'collaboration' | 'recording';
  date: Date;
  location: string;
  description: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  participants?: string[];
}

interface SkillProgress {
  skill: string;
  level: number;
  lastPracticed: Date;
  goals: {
    shortTerm: string;
    longTerm: string;
  };
  achievements: string[];
}

type UploadResponse = {
  success: boolean;
  error?: string;
  fileId?: string;
  imageUrl?: string;
  webViewLink?: string;
  webContentLink?: string;
  path?: string;
};

const API_URL = 'https://sound-alchemy-finished-backend.vercel.app';  // Using production URL for all environments

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

const getProfileImageUrl = (path?: string): string => {
  if (!path) return '/default-avatar.svg';

  // If it's a local blob URL, return as is for preview
  if (path.startsWith('blob:')) {
    return path;
  }

  // Check cache first
  if (imageCache.has(path)) {
    return imageCache.get(path)!;
  }
  
  let resolvedUrl = '';
  
  // Handle Google URLs (both photoURL and Google Drive)
  if (path.includes('googleusercontent.com') || path.includes('lh3.googleusercontent.com')) {
    // Google user profile images - use directly
    resolvedUrl = path;
  } else if (path.includes('drive.google.com')) {
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

const ProfileImage = React.memo(({ src, alt, isVerified }: { src: string; alt: string; isVerified?: boolean }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const imageUrl = useMemo(() => {
    const url = getProfileImageUrl(src);
    console.log('ProfileImage - src:', src, 'resolved URL:', url);
    return url;
  }, [src]);
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
        console.log('ProfileImage - Image loaded successfully:', imageUrl);
      })
      .catch((error) => {
        console.error('ProfileImage - Failed to load image:', imageUrl, error);
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
        className={`w-full h-full object-cover transition-opacity duration-200 hover:scale-105 ${
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
      {isVerified && !hasError && isLoaded && (
        <div className="absolute bottom-2 right-2 z-10">
          <VerifiedBadge size={32} tooltip="Verified Musician" />
        </div>
      )}
    </div>
  );
});

ProfileImage.displayName = 'ProfileImage';

const CountrySelect = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCountry = countries.find((country: Country) => country.code === value);
  const filteredCountries = countries.filter((country: Country) => 
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer bg-background hover:bg-accent transition-colors min-h-[48px]"
        onClick={() => setIsOpen(!isOpen)}
        style={{ minHeight: 48 }}
      >
        <span className="text-2xl">{selectedCountry?.flag || '🌍'}</span>
        <span className="flex-grow text-base font-semibold">{selectedCountry?.name || 'Select your country'}</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </div>

      <div
        className={`absolute left-0 w-full mt-1 rounded-lg border z-[9999] transition-all duration-200 bg-[#23272f] ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
        style={{
          maxHeight: '50vh', // Mobile
          overflowY: 'auto',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.45), 0 1.5px 8px 0 rgba(0,0,0,0.18)',
          border: '1.5px solid #444',
        }}
      >
        {isOpen && (
          <div className="flex flex-col w-full">
            <div className="sticky top-0 bg-[#23272f] p-2 sm:p-3 border-b border-[#333] z-10">
              <input
                type="text"
                placeholder="Search countries..."
                className="w-full p-2 sm:p-3 rounded-lg bg-[#23272f] border border-[#333] text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 15 }}
              />
            </div>
            {/* Add a row for 'Select your country' at the top */}
            <div
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors text-base font-semibold rounded-lg ${!value ? 'bg-primary-500/20 text-primary-400 font-bold' : 'hover:bg-primary-500/10 text-white'}`}
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchQuery('');
              }}
              style={{ minHeight: 44 }}
            >
              <span className="text-2xl">🌍</span>
              <span className="flex-grow">Select your country</span>
            </div>
            <div className="border-t border-[#333] my-1" />
            <div className="overflow-y-auto max-h-[35vh] sm:max-h-[340px] custom-scrollbar">
              {filteredCountries.map((country: Country) => (
                <div
                  key={country.code}
                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer rounded-lg transition-all text-sm sm:text-base font-semibold ${
                    value === country.code
                      ? 'bg-primary-500/30 text-primary-400 font-bold border border-primary-500'
                      : 'hover:bg-primary-500/10 text-white border border-transparent'
                  }`}
                  onClick={() => {
                    onChange(country.code);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  style={{ minHeight: 40, alignItems: 'center' }}
                >
                  <span className="text-2xl mr-2" style={{ minWidth: 32, textAlign: 'center' }}>{country.flag}</span>
                  <span className="flex-grow text-base" style={{ fontWeight: 600 }}>{country.name}</span>
                  <span className="text-xs sm:text-base text-muted-foreground ml-auto" style={{ fontWeight: 500 }}>{country.phoneCode}</span>
                </div>
              ))}
              {filteredCountries.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-sm sm:text-base">
                  No countries found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const formatPhoneNumber = (phoneNumber: string) => {
  // Remove any non-digit characters except '+'
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Check if it starts with '+'
  const hasPlus = cleaned.startsWith('+');
  
  // Format the number: +XX XXXXXXXXX
  if (cleaned.length >= 11) {
    const countryCode = hasPlus ? cleaned.slice(0, 3) : '+' + cleaned.slice(0, 2);
    const restOfNumber = hasPlus ? cleaned.slice(3) : cleaned.slice(2);
    return `${countryCode} ${restOfNumber}`;
  }
  
  return cleaned;
};

const PhoneNumberDisplay = ({ phoneNumber }: { phoneNumber: string }) => {
  const formattedNumber = formatPhoneNumber(phoneNumber);
  
  return (
    <div className="flex items-center gap-3">
      <div className="text-xl font-medium tracking-wide" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {formattedNumber}
      </div>
    </div>
  );
};

const TalentBadge = ({ icon, text }: { icon: string; text: string }) => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800/50 backdrop-blur-sm rounded-full">
    <span className="text-lg">{icon}</span>
    <span className="text-sm font-medium text-gray-300">{text}</span>
  </div>
);

interface InstrumentType {
  id: string;
  name: string;
  icon: string;
}

interface SingingType {
  id: string;
  name: string;
  icon: string;
}

const MusicianTalents = ({ profile }: { profile: UserProfile }) => {
  const { t } = useTranslation();
  if (!profile) return null;

  // Get instruments from either array or single value
  const instruments = Array.isArray(profile.instrumentTypes) 
    ? profile.instrumentTypes 
    : (profile.instrumentType ? [profile.instrumentType] : []);

  const singingStyles = Array.isArray(profile.singingTypes)
    ? profile.singingTypes
    : (profile.singingType ? [profile.singingType] : []);

  const hasInstruments = instruments.length > 0;
  const hasSinging = singingStyles.length > 0;

  if (!hasInstruments && !hasSinging) return null;

  const allInstruments = INSTRUMENT_TYPE_GROUPS.flatMap(group => group.types);
  const allSingingTypes = SINGING_TYPE_GROUPS.flatMap(group => group.types);

  const instrumentNames = instruments.map(id => allInstruments.find(type => type.id === id)).filter(Boolean);
  const singingNames = singingStyles.map(id => allSingingTypes.find(type => type.id === id)).filter(Boolean);

  return (
    <div className="mt-4 space-y-3">
      {hasInstruments && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-gray-400">{t('profile_instruments')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {instrumentNames.map(instrument => instrument && (
              <TalentBadge 
                key={instrument.id} 
                icon={instrument.icon} 
                text={instrument.name}
              />
            ))}
          </div>
        </div>
      )}
      
      {hasSinging && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-gray-400">{t('profile_singing_styles')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {singingNames.map(style => style && (
              <TalentBadge 
                key={style.id} 
                icon={style.icon} 
                text={style.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TalentDisplay = ({ profile }: { profile: UserProfile }) => {
  const { t } = useTranslation();
  // Get instruments from either array or single value
  const instruments = profile?.instrumentTypes || (profile?.instrumentType ? [profile.instrumentType] : []);
  const singingStyles = profile?.singingTypes || (profile?.singingType ? [profile.singingType] : []);

  const hasInstruments = instruments.length > 0;
  const hasSinging = singingStyles.length > 0;

  if (!hasInstruments && !hasSinging) return null;

  const allInstruments = INSTRUMENT_TYPE_GROUPS.flatMap(group => group.types);
  const allSingingTypes = SINGING_TYPE_GROUPS.flatMap(group => group.types);

  const instrumentNames = instruments.map(id => allInstruments.find(type => type.id === id)).filter(Boolean);
  const singingNames = singingStyles.map(id => allSingingTypes.find(type => type.id === id)).filter(Boolean);

  const talents = [];
  if (hasInstruments) {
    talents.push(`${instrumentNames?.join(', ')} ${t('profile_player')}`);
  }
  if (hasSinging) {
    talents.push(`${singingNames?.join(', ')} ${t('profile_singer')}`);
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-primary-400 font-medium">
        {talents.join(' & ')}
      </span>
      {profile?.verificationStatus === 'pending' && (
        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-xs rounded-full">
          {t('profile_verification_pending')}
        </span>
      )}
    </div>
  );
};

const ProfileHeader = ({ profile, user }: { profile: UserProfile, user: any }) => {
  const { t } = useTranslation();
  const hasInstruments = (profile?.instrumentTypes?.length ?? 0) > 0;
  const hasSinging = (profile?.singingTypes?.length ?? 0) > 0;

  const getTalentText = () => {
    const talents = [];
    
    if (hasInstruments) {
      const instruments = profile?.instrumentTypes
        ?.map(id => INSTRUMENT_TYPE_GROUPS.find(group => group.id === id))
        .filter(Boolean)
        .map(inst => inst?.name);
      if (instruments?.length) {
        talents.push(instruments.join(', '));
      }
    }
    
    if (hasSinging) {
      const styles = profile?.singingTypes
        ?.map(id => SINGING_TYPE_GROUPS.find(group => group.id === id))
        .filter(Boolean)
        .map(style => style?.name);
      if (styles?.length) {
        talents.push(styles.join(', '));
      }
    }
    
    return talents.length > 0 ? talents.join(' • ') : t('profile_musician');
  };

  return (
    <div className="text-center mb-6">
      <div className="relative inline-block">
        <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-2 border-primary-500">
          <ProfileImage
            src={(() => {
              if (profile?.profileImagePath?.trim()) return profile.profileImagePath;
              if (user?.photoURL) return user.photoURL;
              const googleProvider = user?.providerData?.find((p: any) => p.providerId === 'google.com');
              if (googleProvider?.photoURL) return googleProvider.photoURL;
              return '';
            })()}
            alt={profile?.fullName || 'Profile'}
            isVerified={profile?.isVerified}
          />
        </div>
        {profile?.isVerified && (
          <div className="absolute bottom-4 -right-1">
            <VerifiedBadge size={36} tooltip="Verified Musician" />
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">{profile?.fullName}</h1>
      
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="text-primary-400 font-medium">
          {getTalentText()}
        </span>
        {profile?.verificationStatus === 'pending' && (
          <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-xs rounded-full">
            Verification pending
          </span>
        )}
      </div>
      {/* Improved note for unverified users */}
      {!profile?.isVerified && (
        <div className="mt-3 text-yellow-200 text-xs text-center bg-yellow-900/20 rounded-lg px-3 py-2 border border-yellow-400/30">
          <strong>Note:</strong> Our SoundAlchemy team is reviewing your details. Once verified, all features will be enabled for your account.
        </div>
      )}

      <div className="flex items-center justify-center gap-2 mt-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">
            {(getCountryInfo(profile?.country || 'US') || { name: 'United States' }).name}
          </span>
        </div>
      </div>

      {hasInstruments && (
        <div className="flex flex-wrap gap-2 mt-4">
          {profile?.instrumentTypes?.map(id => {
            const instrument = getInstrumentTypeById(id);
            return (
              <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800/50 backdrop-blur-sm rounded-full">
                <span className="text-lg">{instrument.icon}</span>
                <span className="text-sm font-medium text-gray-300">{instrument.name}</span>
              </div>
            );
          })}
        </div>
      )}
      {hasSinging && (
        <div className="flex flex-wrap gap-2 mt-4">
          {profile?.singingTypes?.map(id => {
            const style = getSingingTypeById(id);
            return (
              <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800/50 backdrop-blur-sm rounded-full">
                <span className="text-lg">{style.icon}</span>
                <span className="text-sm font-medium text-gray-300">{style.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const MusicianTypeSection = ({ profile }: { profile: UserProfile }) => {
  const hasInstruments = (profile?.instrumentTypes?.length ?? 0) > 0;
  const hasSinging = (profile?.singingTypes?.length ?? 0) > 0;

  const getMusicianType = () => {
    if (hasInstruments && hasSinging) return "Instrumentalist & Singer";
    if (hasInstruments) return "Instrumentalist";
    if (hasSinging) return "Singer";
    return "Musician";
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-white">Musician Type</h3>
        </div>
        <span className="px-4 py-2 rounded-lg bg-primary-500/10 text-primary-400 font-medium">
          {(() => {
            const hasInstruments = profile?.instrumentTypes && profile.instrumentTypes.length > 0;
            const hasSinging = profile?.singingTypes && profile.singingTypes.length > 0;
            if (hasInstruments && hasSinging) return 'Instrumentalist & Singer';
            if (hasInstruments) return 'Instrumentalist';
            if (hasSinging) return 'Singer';
            return 'Musician';
          })()}
        </span>
      </div>

      {hasInstruments && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-400">Instruments</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile?.instrumentTypes?.map(id => {
              const instrument = getInstrumentTypeById(id);
              return (
                <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800/50 backdrop-blur-sm rounded-full">
                  <span className="text-lg">{instrument.icon}</span>
                  <span className="text-sm font-medium text-gray-300">{instrument.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasSinging && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-400">Singing Styles</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile?.singingTypes?.map(id => {
              const style = getSingingTypeById(id);
              return (
                <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800/50 backdrop-blur-sm rounded-full">
                  <span className="text-lg">{style.icon}</span>
                  <span className="text-sm font-medium text-gray-300">{style.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const getGenderDisplay = (gender?: string) => {
  if (!gender) return null;
  
  const genderMap: { [key: string]: { icon: string; label: string } } = {
    male: { icon: '👨', label: 'Male' },
    female: { icon: '👩', label: 'Female' },
    non_binary: { icon: '⚧', label: 'Non-Binary' },
    prefer_not_to_say: { icon: '🤐', label: 'Prefer not to say' }
  };
  
  return genderMap[gender] || null;
};

const getMusicCultureDisplay = (musicCulture?: string) => {
  if (!musicCulture) return null;
  
  const musicCultureMap: { [key: string]: { icon: string; label: string; category: string } } = {
    // Western Classical
    baroque: { icon: '🎼', label: 'Baroque', category: 'Western Classical' },
    classical: { icon: '🎼', label: 'Classical', category: 'Western Classical' },
    romantic: { icon: '🎼', label: 'Romantic', category: 'Western Classical' },
    contemporary_classical: { icon: '🎼', label: 'Contemporary Classical', category: 'Western Classical' },
    
    // Jazz & Blues
    traditional_jazz: { icon: '🎷', label: 'Traditional Jazz', category: 'Jazz & Blues' },
    bebop: { icon: '🎷', label: 'Bebop', category: 'Jazz & Blues' },
    fusion: { icon: '🎷', label: 'Jazz Fusion', category: 'Jazz & Blues' },
    blues: { icon: '🎸', label: 'Blues', category: 'Jazz & Blues' },
    
    // World Music
    african: { icon: '🥁', label: 'African', category: 'World Music' },
    latin: { icon: '🪘', label: 'Latin American', category: 'World Music' },
    indian: { icon: '🎼', label: 'Indian', category: 'World Music' },
    middle_eastern: { icon: '🎼', label: 'Middle Eastern', category: 'World Music' },
    asian: { icon: '🎼', label: 'Asian', category: 'World Music' },
    
    // Contemporary
    pop: { icon: '🎤', label: 'Pop', category: 'Contemporary' },
    rock: { icon: '🎸', label: 'Rock', category: 'Contemporary' },
    electronic: { icon: '🎛️', label: 'Electronic', category: 'Contemporary' },
    hip_hop: { icon: '🎤', label: 'Hip-Hop', category: 'Contemporary' },
    indie: { icon: '🎸', label: 'Indie', category: 'Contemporary' },
    
    // Folk & Traditional
    celtic: { icon: '🪕', label: 'Celtic', category: 'Folk & Traditional' },
    bluegrass: { icon: '🪕', label: 'Bluegrass', category: 'Folk & Traditional' },
    folk: { icon: '🎸', label: 'Folk', category: 'Folk & Traditional' },
    country: { icon: '🎸', label: 'Country', category: 'Folk & Traditional' },
    
    // Legacy options from older versions
    jazz: { icon: '🎷', label: 'Jazz', category: 'Jazz & Blues' },
    world: { icon: '🌍', label: 'World Music', category: 'World Music' },
    traditional: { icon: '🪕', label: 'Traditional', category: 'Folk & Traditional' },
    other: { icon: '🎵', label: 'Other', category: 'Contemporary' }
  };
  
  return musicCultureMap[musicCulture] || null;
};

const handleImageUpload = async (file: File, userId: string): Promise<{ path: string; url: string }> => {
  try {
    console.log('Starting image upload for user:', userId);
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    // Use the same API approach as handleSubmit
    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', userId);
    formData.append('fileName', `profile_${Date.now()}_${file.name}`);

    const response = await fetch(`${API_URL}/api/upload-profile-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const uploadResponse = await response.json() as UploadResponse;
    if (!uploadResponse.success) {
      throw new Error(uploadResponse.error || 'Failed to upload image');
    }

    const result = {
      path: uploadResponse.path || '',
      url: uploadResponse.imageUrl || uploadResponse.path || ''
    };
    
    console.log('Image upload successful:', result);
    return result;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

const updateUserProfileImage = async (userId: string, imagePath: string) => {
  try {
    console.log('Updating user profile with new image:', { userId, imagePath });
    
    // Update Firestore document
    await updateDoc(doc(db, 'users', userId), {
      profileImagePath: imagePath,
      lastUpdated: new Date()
    });
    
    console.log('User profile updated successfully with new image');
  } catch (error) {
    console.error('Error updating user profile with image:', error);
    throw error;
  }
};

const ComingSoonButton: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = "", ...props }) => (
  <button
    className={`relative opacity-60 cursor-not-allowed ${className}`}
    disabled
    title="Coming Soon"
    {...props}
  >
    {children}
    <span className="absolute -top-2 -right-2 text-xs text-yellow-400 font-bold px-2 bg-dark-800 rounded-full shadow">Coming Soon</span>
  </button>
);

const reminderMessages = {
  country: [
    "🌍 Where in the world are you? Select your country to unlock global features!",
    "🏳️‍🌈 Add your country and join the worldwide music community!",
    "🗺️ Let us know your country for a more personalized experience."
  ],
  bio: [
    "🎤 Tell us your story! Add a bio so others can vibe with you.",
    "📝 A few words about you can make a big difference. Write your bio!",
    "✨ Your musical journey deserves a spotlight. Fill in your bio!"
  ],
  talentDescription: [
    "🌟 What makes you unique? Describe your musical talents!",
    "🎶 Share your specialties and stand out from the crowd.",
    "🧑‍🎤 Let others know what you rock at! Add your talent description."
  ],
  talents: [
    "🎸 What do you play or sing? Add your instruments or singing styles!",
    "🎤 Show off your musical skills—select at least one talent.",
    "🥁 Don't be shy! Let us know your musical strengths."
  ],
  profileImage: [
    "📸 Add a profile picture to make your profile shine!",
    "😎 Upload a cool photo—faces get more friends!",
    "🤳 A picture is worth a thousand notes. Add yours!"
  ],
  socialLinks: [
    "🔗 Add a social media link to build trust and connect with more musicians.",
  ],
};

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const getDynamicReminders = (profile: UserProfile | null, user: any): string[] => {
  if (!profile) return [];
  const reminders: string[] = [];
  if (!profile.country || !profile.country.trim()) {
    reminders.push(getRandom(reminderMessages.country));
  }
  if (!profile.bio || !profile.bio.trim()) {
    reminders.push(getRandom(reminderMessages.bio));
  }
  if (!profile.talentDescription || !profile.talentDescription.trim()) {
    reminders.push(getRandom(reminderMessages.talentDescription));
  }
  if (
    (!profile.instrumentTypes || profile.instrumentTypes.length === 0) &&
    (!profile.singingTypes || profile.singingTypes.length === 0)
  ) {
    reminders.push(getRandom(reminderMessages.talents));
  }
  if (!profile.profileImagePath && !user?.photoURL) {
    reminders.push(getRandom(reminderMessages.profileImage));
  }
  if (!profile.socialLinks || Object.values(profile.socialLinks).filter(Boolean).length < 1) {
    reminders.unshift(getRandom(reminderMessages.socialLinks));
  }
  return reminders;
};

const musicCultureOptions: GroupBase<{ value: string; label: string; icon: string }>[] = [
  {
    label: 'Western Classical',
    options: [
      { value: 'baroque', label: 'Baroque', icon: '🎼' },
      { value: 'classical', label: 'Classical', icon: '🎼' },
      { value: 'romantic', label: 'Romantic', icon: '🎼' },
      { value: 'contemporary_classical', label: 'Contemporary Classical', icon: '🎼' },
    ],
  },
  {
    label: 'Jazz & Blues',
    options: [
      { value: 'traditional_jazz', label: 'Traditional Jazz', icon: '🎷' },
      { value: 'bebop', label: 'Bebop', icon: '🎷' },
      { value: 'fusion', label: 'Jazz Fusion', icon: '🎷' },
      { value: 'blues', label: 'Blues', icon: '🎸' },
      { value: 'jazz', label: 'Jazz', icon: '🎷' },
    ],
  },
  {
    label: 'World Music',
    options: [
      { value: 'african', label: 'African', icon: '🥁' },
      { value: 'latin', label: 'Latin American', icon: '🪘' },
      { value: 'indian', label: 'Indian', icon: '🎼' },
      { value: 'middle_eastern', label: 'Middle Eastern', icon: '🎼' },
      { value: 'asian', label: 'Asian', icon: '🎼' },
      { value: 'world', label: 'World Music', icon: '🌍' },
    ],
  },
  {
    label: 'Contemporary',
    options: [
      { value: 'pop', label: 'Pop', icon: '🎤' },
      { value: 'rock', label: 'Rock', icon: '🎸' },
      { value: 'electronic', label: 'Electronic', icon: '🎛️' },
      { value: 'hip_hop', label: 'Hip-Hop', icon: '🎤' },
      { value: 'indie', label: 'Indie', icon: '🎸' },
    ],
  },
  {
    label: 'Folk & Traditional',
    options: [
      { value: 'celtic', label: 'Celtic', icon: '🪕' },
      { value: 'bluegrass', label: 'Bluegrass', icon: '🪕' },
      { value: 'folk', label: 'Folk', icon: '🎸' },
      { value: 'country', label: 'Country', icon: '🎸' },
      { value: 'traditional', label: 'Traditional', icon: '🪕' },
    ],
  },
  {
    label: '',
    options: [
      { value: 'other', label: 'Other', icon: '🎵' },
    ],
  },
];

const formatOptionLabel = (option: { value: string; label: string; icon: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-lg">{option.icon}</span>
    <span>{option.label}</span>
  </div>
);

const genderOptions = [
  { value: '', label: 'Select Gender', icon: '⚪' },
  { value: 'male', label: 'Male', icon: '👨' },
  { value: 'female', label: 'Female', icon: '👩' },
  { value: 'non_binary', label: 'Non-Binary', icon: '⚧' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: '🤐' },
];

const formatGenderOptionLabel = (option: { value: string; label: string; icon: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-lg">{option.icon}</span>
    <span>{option.label}</span>
  </div>
);

const SOCIAL_MEDIA = [
  { key: 'instagram', label: 'Instagram', icon: <FaInstagram className="w-5 h-5 text-pink-500" /> },
  { key: 'facebook', label: 'Facebook', icon: <FaFacebook className="w-5 h-5 text-blue-600" /> },
  { key: 'youtube', label: 'YouTube', icon: <FaYoutube className="w-5 h-5 text-red-600" /> },
  { key: 'linkedin', label: 'LinkedIn', icon: <FaLinkedin className="w-5 h-5 text-blue-700" /> },
  { key: 'tiktok', label: 'TikTok', icon: <FaTiktok className="w-5 h-5 text-black dark:text-white" /> },
  { key: 'spotify', label: 'Spotify', icon: <FaSpotify className="w-5 h-5 text-green-500" /> },
];

// Add this helper function near the top (after imports or before the component)
function formatJoinDate(createdAt: any): string {
  if (!createdAt) return 'Not available';
  let dateObj: Date;
  // Firestore Timestamp
  if (createdAt.seconds && createdAt.nanoseconds) {
    dateObj = new Date(createdAt.seconds * 1000);
  } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    dateObj = new Date(createdAt);
  } else if (createdAt instanceof Date) {
    dateObj = createdAt;
  } else {
    return 'Not available';
  }
  if (isNaN(dateObj.getTime())) return 'Not available';
  return dateObj.toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Utility: Flatten instrument and singing type groups for lookup
const FLAT_INSTRUMENT_TYPES = INSTRUMENT_TYPE_GROUPS.flatMap(group => group.types);
const FLAT_SINGING_TYPES = SINGING_TYPE_GROUPS.flatMap(group => group.types);

// Utility: Get TalentType by id or return a custom entry
function getInstrumentTypeById(id: string): TalentType {
  return (
    FLAT_INSTRUMENT_TYPES.find(type => type.id === id) ||
    (id && id !== 'other' ? { id, name: id, icon: '➕' } : { id: 'other', name: 'Other', icon: '➕' })
  );
}
function getSingingTypeById(id: string): TalentType {
  return (
    FLAT_SINGING_TYPES.find(type => type.id === id) ||
    (id && id !== 'other' ? { id, name: id, icon: '➕' } : { id: 'other', name: 'Other', icon: '➕' })
  );
}

const UserProfilePage = (): JSX.Element => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioSuggestions, setBioSuggestions] = useState<string[]>([]);
  const [collaborationIdeas, setCollaborationIdeas] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false); // Changed from true to false
  const [editForm, setEditForm] = useState<UserProfile>({
    fullName: '',
    contactNumber: '',
    country: '',
    gender: '',
    musicCulture: '',
    bio: '',
    talentDescription: '',
    instrumentTypes: [],
    singingTypes: [],
    createdAt: new Date(),
    lastUpdated: new Date(),
    socialLinks: {},
  });

  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [learningProgress, setLearningProgress] = useState<any>(null);
  const [collaborationOpportunities, setCollaborationOpportunities] = useState<any[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([]);
  const [musicEvents, setMusicEvents] = useState<MusicEvent[]>([]);
  const [skillProgress, setSkillProgress] = useState<SkillProgress[]>([]);
  const [communityFeed, setCommunityFeed] = useState<any[]>([]);
  const [showFullBio, setShowFullBio] = useState(false);
  const [bioOverflow, setBioOverflow] = useState(false);
  const bioRef = React.useRef<HTMLParagraphElement>(null);
  // Add state to track missing fields
  const [hasMissingFields, setHasMissingFields] = useState(false);
  // Add state to control alert visibility
  const [showProfileAlert, setShowProfileAlert] = useState(false);
  // Add state for profile picture alert
  const [showProfilePictureAlert, setShowProfilePictureAlert] = useState(false);
  const navigate = useNavigate();
  const [friends, setFriends] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const location = useLocation();
  // In the component, replace missing fields state and logic
  const [dynamicReminders, setDynamicReminders] = useState<string[]>([]);
  const [currentReminderIndex, setCurrentReminderIndex] = useState(0);
  // Add at the top, after other useState
  const [showCountryRequiredModal, setShowCountryRequiredModal] = useState(false);
  // Add state for field validation and alert visibility
  const [showGenderAlert, setShowGenderAlert] = useState(false);
  const [showMusicCultureAlert, setShowMusicCultureAlert] = useState(false);

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user?.uid) return;
      setFriendsLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const friendUids: string[] = userData.friends || [];
          if (friendUids.length === 0) {
            setFriends([]);
            setFriendsLoading(false);
            return;
          }
          // Fetch each friend's public info
          const friendDocs = await Promise.all(friendUids.map(uid => getDoc(doc(db, 'users', uid))));
          const friendData = friendDocs
            .filter(docSnap => docSnap.exists())
            .map(docSnap => {
              const d = docSnap.data();
              return {
                uid: docSnap.id,
                fullName: d.fullName,
                profileImagePath: d.profileImagePath,
                country: d.country,
                instrumentTypes: d.instrumentTypes,
                isVerified: d.isVerified,
              };
            });
          setFriends(friendData);
        } else {
          setFriends([]);
        }
      } catch (e) {
        setFriends([]);
      } finally {
        setFriendsLoading(false);
      }
    };
    fetchFriends();
  }, [user]);

  // Preload profile image when profile data changes
  useEffect(() => {
    if (profile?.profileImagePath) {
      const imageUrl = getProfileImageUrl(profile.profileImagePath);
      batchPreloadImages([imageUrl]);
    }
  }, [profile?.profileImagePath]);

  // Preload friend images when friends data changes
  useEffect(() => {
    if (friends.length > 0) {
      const imageUrls = friends
        .map(friend => friend.profileImagePath)
        .filter(Boolean)
        .map(path => getProfileImageUrl(path));
      
      // Preload images in background without blocking UI
      batchPreloadImages(imageUrls);
    }
  }, [friends]);

  // Add welcome message component
  const WelcomeMessage = ({ name }: { name: string }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="text-center px-8"
      >
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-6xl font-bold text-white mb-4"
          style={{ fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif' }}
        >
          Hello, {name}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl text-gray-300"
          style={{ fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif' }}
        >
          Welcome to your musical journey
        </motion.p>
      </motion.div>
    </motion.div>
  );

  // Simplified welcome message and profile loading logic
  useEffect(() => {
    const handleProfileAndWelcome = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        // Check URL parameters for new registration
        const urlParams = new URLSearchParams(window.location.search);
        const isNewRegistration = urlParams.get('registered') === 'true';
        
        // Check if welcome message has been shown in this session
        const hasShownWelcome = sessionStorage.getItem('welcomeMessageShown') === 'true';
        
        console.log('Fetching user profile for uid:', user.uid);
        console.log('Google user data:', {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified
        });
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          console.log('Fetched user data:', userData);
          
          // For Google users, ensure email and profile image are set from Google auth
          let updatedUserData = { ...userData };
          let needsUpdate = false;
          
          // Auto-set email from Google auth if not present or different
          if (user.email && (!userData.email || userData.email !== user.email)) {
            updatedUserData.email = user.email;
            needsUpdate = true;
            console.log('Auto-setting email from Google auth:', user.email);
          }
          
          // Auto-set profile image from Google auth if not present
          if (user.photoURL && !userData.profileImagePath) {
            updatedUserData.profileImagePath = user.photoURL;
            needsUpdate = true;
            console.log('Auto-setting profile image from Google auth:', user.photoURL);
          }
          
          // Auto-set display name from Google auth if not present
          if (user.displayName && (!userData.fullName || userData.fullName !== user.displayName)) {
            updatedUserData.fullName = user.displayName;
            needsUpdate = true;
            console.log('Auto-setting display name from Google auth:', user.displayName);
          }
          
          // Update the document if needed
          if (needsUpdate) {
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                ...updatedUserData,
                lastUpdated: new Date()
              });
              console.log('Updated user data with Google auth information');
            } catch (updateError) {
              console.error('Error updating user data with Google auth info:', updateError);
            }
          }
          
          setProfile(updatedUserData);
          
          // Get profile image URL - prioritize Google photoURL for Google users
          if (user.photoURL && !userData.profileImagePath) {
            // Use Google photoURL directly
            console.log('Using Google photoURL:', user.photoURL);
            setImageUrl(user.photoURL);
          } else if (userData.profileImagePath) {
            console.log('Profile has image path:', userData.profileImagePath);
            const imageUrl = getProfileImageUrl(userData.profileImagePath);
            console.log('Setting image URL:', imageUrl);
            setImageUrl(imageUrl);
          } else if (user.photoURL) {
            // Fallback to Google photoURL
            console.log('Fallback to Google photoURL:', user.photoURL);
            setImageUrl(user.photoURL);
          } else {
            console.log('No profile image available, using default');
            setImageUrl('/default-avatar.svg');
          }

          // Check for missing required fields - don't count profile image as missing for Google users
          const missingFields = !userData.country || !userData.bio || !userData.talentDescription || (!userData.profileImagePath && !user.photoURL);
          const missingProfilePicture = !userData.profileImagePath && !user.photoURL;
          setHasMissingFields(missingFields);
          setShowProfilePictureAlert(missingProfilePicture);
          
          // Handle welcome message logic
          if (isNewRegistration && userData.fullName && !hasShownWelcome) {
            // Show welcome message for new registrations
            setShowWelcome(true);
            sessionStorage.setItem('welcomeMessageShown', 'true');
            
            // Clean up URL parameters
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('registered');
            window.history.replaceState({}, '', newUrl.toString());
          } else if (!hasShownWelcome && userData.fullName && !isNewRegistration) {
            // Show welcome message for first-time visitors (not new registrations)
            setShowWelcome(true);
            sessionStorage.setItem('welcomeMessageShown', 'true');
          }
          
          // Show edit modal for missing fields (but not immediately for new registrations)
          if (missingFields && !isNewRegistration) {
            setShowEditModal(true);
          }

          // Initialize edit form with Google auth data
          setEditForm({
            fullName: updatedUserData.fullName,
            contactNumber: updatedUserData.contactNumber,
            country: updatedUserData.country,
            gender: updatedUserData.gender,
            musicCulture: updatedUserData.musicCulture,
            bio: updatedUserData.bio,
            talentDescription: updatedUserData.talentDescription,
            instrumentTypes: Array.isArray(updatedUserData.instrumentTypes) 
              ? updatedUserData.instrumentTypes 
              : (updatedUserData.instrumentType ? [updatedUserData.instrumentType] : []),
            singingTypes: Array.isArray(updatedUserData.singingTypes)
              ? updatedUserData.singingTypes
              : (updatedUserData.singingType ? [updatedUserData.singingType] : []),
            createdAt: updatedUserData.createdAt || new Date(),
            lastUpdated: updatedUserData.lastUpdated || new Date(),
            socialLinks: updatedUserData.socialLinks || {},
          });
          // If Google user and no country set, show highly important modal
          const isGoogleUser = user.providerData && user.providerData.some((p) => p.providerId === 'google.com');
          if (isGoogleUser && (!updatedUserData.country || updatedUserData.country.trim() === '')) {
            setShowCountryRequiredModal(true);
          }
        } else {
          console.log('No user document found - creating new user document');
          // Create a new user document if it doesn't exist
          const newUserData: Partial<UserProfile> = {
            fullName: user.displayName || '',
            email: user.email || '',
            contactNumber: '',
            country: '', // Default to empty string, not 'US'
            bio: '',
            talentDescription: '',
            instrumentTypes: [],
            singingTypes: [],
            profileImagePath: user.photoURL || '', // Auto-set Google profile image
            isVerified: false, // Always false for new users, regardless of Google auth
            verificationStatus: 'pending', // Always pending for new users
            role: 'user',
            createdAt: new Date(),
            lastUpdated: new Date(),
            socialLinks: {},
          };
          
          await setDoc(doc(db, 'users', user.uid), newUserData);
          setProfile(newUserData as UserProfile);
          
          // If user has Google photoURL, use it
          if (user.photoURL) {
            setImageUrl(user.photoURL);
            console.log('Set Google photoURL for new user:', user.photoURL);
          }
          
          // Show welcome message for new users (not from registration)
          if (user.displayName && !hasShownWelcome) {
            setShowWelcome(true);
            sessionStorage.setItem('welcomeMessageShown', 'true');
          }
          
          // Initialize edit form for new user
          setEditForm({
            fullName: user.displayName || '',
            contactNumber: '',
            country: '',
            gender: '',
            musicCulture: '',
            bio: '',
            talentDescription: '',
            instrumentTypes: [],
            singingTypes: [],
            createdAt: new Date(),
            lastUpdated: new Date(),
            socialLinks: {},
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    handleProfileAndWelcome();
  }, [user]);

  // Welcome Message Timer Effect - Simplified
  useEffect(() => {
    if (showWelcome && profile?.fullName) {
      const welcomeTimer = setTimeout(() => {
        setShowWelcome(false);
      }, 3000); // Show welcome message for 3 seconds
      
      return () => clearTimeout(welcomeTimer);
    }
  }, [showWelcome, profile?.fullName]);

  // Cleanup old sessionStorage flags on component unmount
  useEffect(() => {
    return () => {
      // Clean up any old sessionStorage flags that might cause issues
      sessionStorage.removeItem('newRegistration');
      sessionStorage.removeItem('platformRefreshed');
    };
  }, []);



  useEffect(() => {
    const loadAdditionalData = async () => {
      if (!user?.uid) return;
      
      try {
        // Load portfolio data
        const portfolioDoc = await getDoc(doc(db, 'portfolios', user.uid));
        if (portfolioDoc.exists()) {
          setPortfolio(portfolioDoc.data().tracks || []);
        }
        
        // Load analytics data
        const analyticsDoc = await getDoc(doc(db, 'analytics', user.uid));
        if (analyticsDoc.exists()) {
          setAnalytics(analyticsDoc.data());
        }
        
        // Load learning progress
        const learningDoc = await getDoc(doc(db, 'learning', user.uid));
        if (learningDoc.exists()) {
          setLearningProgress(learningDoc.data());
        }
        
        // Load collaboration opportunities
        const collabDoc = await getDoc(doc(db, 'collaborations', user.uid));
        if (collabDoc.exists()) {
          setCollaborationOpportunities(collabDoc.data().opportunities || []);
        }
        
        // Load practice sessions
        const practiceDoc = await getDoc(doc(db, 'practice_sessions', user.uid));
        if (practiceDoc.exists()) {
          setPracticeSessions(practiceDoc.data().sessions || []);
        }
        
        // Load music events
        const eventsDoc = await getDoc(doc(db, 'music_events', user.uid));
        if (eventsDoc.exists()) {
          setMusicEvents(eventsDoc.data().events || []);
        }
        
        // Load skill progress
        const skillsDoc = await getDoc(doc(db, 'skill_progress', user.uid));
        if (skillsDoc.exists()) {
          setSkillProgress(skillsDoc.data().skills || []);
        }
        
        // Load community feed
        const feedDoc = await getDoc(doc(db, 'community_feed', user.uid));
        if (feedDoc.exists()) {
          setCommunityFeed(feedDoc.data().posts || []);
        }
      } catch (error) {
        console.error('Error loading additional data:', error);
      }
    };
    
    loadAdditionalData();
  }, [user]);

  useEffect(() => {
    if (bioRef.current) {
      setBioOverflow(bioRef.current.scrollHeight > bioRef.current.clientHeight);
    }
  }, [profile?.bio]);

  const getTalentText = () => {
    if (!profile) return 'Musician';
    
    const hasInstruments = (profile.instrumentTypes?.length ?? 0) > 0;
    const hasSinging = (profile.singingTypes?.length ?? 0) > 0;
    const talents = [];
    
    if (hasInstruments) {
      const instruments = profile.instrumentTypes
        ?.map(id => getInstrumentTypeById(id).name)
        .filter(Boolean);
      if (instruments?.length) {
        talents.push(instruments.join(', '));
      }
    }
    
    if (hasSinging) {
      const styles = profile.singingTypes
        ?.map(id => getSingingTypeById(id).name)
        .filter(Boolean);
      if (styles?.length) {
        talents.push(styles.join(', '));
      }
    }
    
    return talents.length > 0 ? talents.join(' • ') : 'Musician';
  };

  const handleEditToggle = () => {
    setShowEditModal(true);
    setEditForm({
      fullName: profile?.fullName || '',
      contactNumber: profile?.contactNumber || '',
      country: profile?.country || 'US',
      gender: profile?.gender || '',
      musicCulture: profile?.musicCulture || '',
      bio: profile?.bio || '',
      talentDescription: profile?.talentDescription || '',
      profileImage: null,
      previewURL: profile?.profileImagePath ? getProfileImageUrl(profile.profileImagePath) : '',
      instrumentTypes: profile?.instrumentTypes || [],
      singingTypes: profile?.singingTypes || [],
      socialLinks: profile?.socialLinks || {},
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large. Maximum size is 5MB.');
      return;
    }

    // Create preview URL for local preview only
    const previewURL = URL.createObjectURL(file);
    setPreviewUrl(previewURL);
    setSelectedImage(file);
    setEditForm(prev => ({
      ...prev,
      profileImage: file,
      // Do NOT set previewURL as profileImagePath
      previewURL: previewURL
    }));
  };

  const handleSocialLinkChange = (key: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return;
    }

    let hasError = false;
    if (!editForm.gender || editForm.gender.trim() === "") {
      setShowGenderAlert(true);
      hasError = true;
    } else {
      setShowGenderAlert(false);
    }
    if (!editForm.musicCulture || editForm.musicCulture.trim() === "") {
      setShowMusicCultureAlert(true);
      hasError = true;
    } else {
      setShowMusicCultureAlert(false);
    }
      if (!editForm.country || editForm.country.trim() === "") {
        toast.error("Please select your country correctly.");
        setLoading(false);
        return;
      }
    if (hasError) {
        setLoading(false);
        return;
      }

    try {
      setLoading(true);
      setError(null);

      // Initialize userData without profileImagePath
      const userData: Partial<UserProfile> = {
        fullName: editForm.fullName,
        contactNumber: editForm.contactNumber,
        country: editForm.country,
        gender: editForm.gender,
        musicCulture: editForm.musicCulture,
        bio: editForm.bio,
        talentDescription: editForm.talentDescription,
        lastUpdated: new Date(),
        instrumentTypes: editForm.instrumentTypes,
        singingTypes: editForm.singingTypes,
        socialLinks: editForm.socialLinks,
      };

      // Handle image upload using the new function
      if (editForm.profileImage) {
        try {
          console.log('Starting image upload process');
          const uploadResult = await handleImageUpload(editForm.profileImage, user.uid);
          if (uploadResult.path) {
            userData.profileImagePath = uploadResult.path; // Only use backend path
          }
          toast.success('Profile image uploaded successfully!');
        } catch (error) {
          console.error('Error uploading image:', error);
          toast.error('Failed to upload profile image');
          setLoading(false);
          return; // Return to prevent further execution
        }
      }

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), userData);
      
      // Update local profile state
      setProfile(prev => prev ? { ...prev, ...userData } : null);
      
      // Update image URL if new image was uploaded
      if (userData.profileImagePath) {
        setImageUrl(userData.profileImagePath);
      }
      
      setShowEditModal(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      // Check if musicCulture, gender, or country is missing and show specific error
      if (!editForm.country || editForm.country.trim() === "") {
        toast.error("Please select your country correctly.");
      } else if (!editForm.gender || editForm.gender.trim() === "") {
        toast.error("Please select your gender correctly.");
      } else if (!editForm.musicCulture || editForm.musicCulture.trim() === "") {
        toast.error("Please select your music culture correctly.");
      } else {
        toast.error('Failed to update profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Add handleSave function similar to the example provided
  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Update user data in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        ...editForm,
        lastUpdated: new Date()
      });
      
      // Update local profile state
      setProfile(prev => prev ? { ...prev, ...editForm } : null);
      
      // Update display name in Firebase Auth if it changed
      if (editForm.fullName !== profile?.fullName) {
        // Note: updateProfile requires re-authentication for some changes
        // This is handled by the user's session
      }
      
      setShowEditModal(false);
      toast.success('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  const getVerificationBadge = () => {
    if (!profile) return null;
    
    if (profile.isVerified) {
      return (
        <div className="inline-flex items-center bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
          </svg>
          Verified Musician
        </div>
      );
    }
    
    return (
      <div className="inline-flex items-center bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-semibold">
        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Verification {profile.verificationStatus}
      </div>
    );
  };

  const getCountryInfo = (countryCode: string): { name: string; flag: string; phoneCode: string } => {
    const country = countries.find(c => c.code === countryCode);
    return country || { name: 'United States', flag: '🇺🇸', phoneCode: '+1' };
  };

  const TalentTypeSelector = ({
    types,
    selectedTypes,
    onChange,
    title,
    icon: Icon
  }: {
    types: typeof INSTRUMENT_TYPE_GROUPS | typeof SINGING_TYPE_GROUPS;
    selectedTypes: string[];
    onChange: (types: string[]) => void;
    title: string;
    icon: React.ElementType;
  }) => {
    const [search, setSearch] = useState('');
    const [customValue, setCustomValue] = useState('');
    const [expanded, setExpanded] = useState(false);

    // Filtered groups based on search
    const filteredGroups = types
      .map(group => ({
        ...group,
        types: group.types.filter(type =>
          type.name.toLowerCase().includes(search.toLowerCase()) ||
          type.description?.toLowerCase().includes(search.toLowerCase())
        )
      }))
      .filter(group => group.types.length > 0);

    // Custom entries (not in any group)
    const customEntries = selectedTypes.filter(id =>
      !types.some(group => group.types.some(type => type.id === id))
    );

    // Helper for selected chip color
    const chipBg = 'bg-[#232b3b]'; // slightly lighter dark blue
    const chipText = 'text-primary-300'; // light blue

    // Remove 'Other' group from filteredGroups for custom input
    const groupsWithoutOther = filteredGroups.filter(group => group.group.toLowerCase() !== 'other');
    const showCustomInput = true;

    // Max 3 rows for chips, then vertical scroll
    const maxChipRows = 3;
    const chipHeight = 38; // px, adjust for your chip size
    const maxChipAreaHeight = maxChipRows * chipHeight + 8; // 8px for padding

    return (
      <div className="space-y-2">
        {/* If no items selected, show label row with icon and chevron, matching screenshot */}
        {selectedTypes.length === 0 && (
          <div className="relative rounded-lg px-4 py-3 flex items-center gap-2 text-base text-gray-200 font-medium cursor-pointer border border-[#232b3b] bg-[#202945]" style={{minHeight:chipHeight}} onClick={() => setExpanded(!expanded)}>
            <Icon className="w-5 h-5 text-primary-400 mr-2" />
            <span className="flex-1 select-none" style={{fontWeight:500}}>{title}</span>
            <ChevronDown className={`w-5 h-5 text-primary-300 transition-transform ${expanded ? '' : 'rotate-180'}`} />
          </div>
        )}
        {/* If items selected, show chips row with chevron, no label */}
        {selectedTypes.length > 0 && (
          <div className="relative pb-2 mb-2 rounded-lg px-2 py-2 flex flex-row flex-wrap gap-2 items-center" style={{background:'#202945', minHeight:chipHeight, maxHeight:maxChipAreaHeight, overflowY:'auto'}}>
            {selectedTypes.map(id => {
              const type = types === INSTRUMENT_TYPE_GROUPS ? getInstrumentTypeById(id) : getSingingTypeById(id);
              return (
                <div key={id} className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${chipBg} ${chipText} font-semibold text-sm`} style={{minHeight:chipHeight-8}}>
                  <span className="text-lg">{type.icon}</span>
                  <span>{type.name}</span>
                  <button
                    type="button"
                    className="ml-1 text-primary-400 hover:text-red-400"
                    onClick={() => onChange(selectedTypes.filter(t => t !== id))}
                    style={{fontWeight:700, fontSize:'1.1em'}}
                  >×</button>
                </div>
              );
            })}
            {/* Chevron/arrow at right for expand/collapse indication */}
            <button
              type="button"
              className="absolute top-1 right-2 p-1 rounded-full hover:bg-[#232b3b] transition-colors"
              style={{background:'transparent'}}
              onClick={() => setExpanded(!expanded)}
              tabIndex={-1}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              <ChevronDown className={`w-5 h-5 text-primary-300 transition-transform ${expanded ? '' : 'rotate-180'}`} />
            </button>
          </div>
        )}
        {/* Search bar */}
        {expanded && (
          <div className="mb-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#232b3b] border border-[#334155] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 text-base shadow-sm"
              style={{fontWeight:500}}
            />
          </div>
        )}
        {/* Grouped list, excluding 'Other' */}
        {expanded && (
          <div className="max-h-64 overflow-y-auto custom-scrollbar rounded-lg" style={{background:'#181e29'}}>
            {groupsWithoutOther.map(group => (
              <div key={group.group} className="mb-2">
                <div className="sticky top-0 z-10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-300 bg-[#181e29]" style={{letterSpacing:'0.08em'}}>
                  {group.group}
                </div>
                <div className="border-b border-[#334155] mx-4 mb-1" />
                {group.types.map(type => {
                  const selected = selectedTypes.includes(type.id);
                  return (
                    <div
                      key={type.id}
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors rounded-md ${selected ? 'bg-primary-500/10 border-l-4 border-primary-400' : 'hover:bg-[#232b3b]'}`}
                      onClick={() => {
                        onChange(
                          selected
                            ? selectedTypes.filter(id => id !== type.id)
                            : [...selectedTypes, type.id]
                        );
                      }}
                      style={{minHeight:40}}
                    >
                      <span className="text-xl w-7 text-center">{type.icon}</span>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={`font-semibold text-base truncate ${selected ? 'text-primary-300' : 'text-white'}`}>{type.name}</span>
                        {type.description && (
                          <span className="text-xs text-gray-400 truncate">{type.description}</span>
                        )}
                      </div>
                      {selected && <span className="ml-2 text-primary-400 font-bold">✓</span>}
                    </div>
                  );
                })}
              </div>
            ))}
            {groupsWithoutOther.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">No results found.</div>
            )}
            {/* Custom input section, styled as a group */}
            {showCustomInput && (
              <div className="mb-2">
                <div className="sticky top-0 z-10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-300 bg-[#181e29]" style={{letterSpacing:'0.08em'}}>
                  Other
                </div>
                <div className="border-b border-[#334155] mx-4 mb-1" />
                <div className="flex gap-2 px-4 pb-2">
                  <input
                    type="text"
                    value={customValue}
                    onChange={e => setCustomValue(e.target.value)}
                    placeholder={`Type your ${title.toLowerCase().replace('what ', '').replace('do you play', '').replace('are your', '').replace('?', '').trim()}...`}
                    className="flex-1 bg-[#232b3b] border border-primary-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 text-base"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-base font-semibold"
                    onClick={() => {
                      const val = customValue.trim();
                      if (val && !selectedTypes.includes(val)) {
                        onChange([...selectedTypes, val]);
                        setCustomValue('');
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Show custom entries as chips (if not already in selectedTypes) */}
        {expanded && (
          <div className="flex flex-row flex-wrap gap-2 mt-2">
            {customEntries.map(id => {
              const type = types === INSTRUMENT_TYPE_GROUPS ? getInstrumentTypeById(id) : getSingingTypeById(id);
              return (
                <div key={id} className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${chipBg} ${chipText} font-semibold text-sm`}>
                  <span className="text-lg">{type.icon}</span>
                  <span>{type.name}</span>
                  <button
                    type="button"
                    className="ml-1 text-primary-400 hover:text-red-400"
                    onClick={() => onChange(selectedTypes.filter(t => t !== id))}
                    style={{fontWeight:700, fontSize:'1.1em'}}
                  >×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const TalentDisplay = ({ 
    types, 
    selectedIds,
    title,
    icon: Icon 
  }: { 
    types: typeof INSTRUMENT_TYPE_GROUPS | typeof SINGING_TYPE_GROUPS;
    selectedIds: string[];
    title: string;
    icon: React.ElementType;
  }) => {
    if (selectedIds.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary-500" />
          <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const type = types === INSTRUMENT_TYPE_GROUPS ? getInstrumentTypeById(id) : getSingingTypeById(id);
            return (
              <div
                key={type.id}
                className="flex items-center gap-2 px-3 py-2 bg-dark-700 rounded-lg"
              >
                <span className="text-xl">{type.icon}</span>
                <span className="text-sm text-gray-300">{type.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Show alert if missing fields
  useEffect(() => {
    // Use editForm if modal is open, otherwise use profile
    const base = showEditModal ? editForm : profile;
    const reminders = getDynamicReminders(base, user);
    setDynamicReminders(reminders);
    setHasMissingFields(reminders.length > 0);
    setShowProfileAlert(reminders.length > 0);
    setShowProfilePictureAlert(reminders.some(msg => msg.includes("profile picture")));
    setCurrentReminderIndex(0); // Reset index when reminders change
  }, [profile, user, showEditModal, editForm]);

  // Add effect to rotate reminders every 5 seconds
  useEffect(() => {
    if (dynamicReminders.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentReminderIndex(idx => (idx + 1) % dynamicReminders.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [dynamicReminders]);

  // --- Google user detection and country auto-set logic ---
  useEffect(() => {
    if (!user) return;
    
    // Detect if Google user
    const isGoogleUser = user.providerData && user.providerData.some((p) => p.providerId === 'google.com');
    
    // If Google user and no country set, try to auto-set from locale
    if (isGoogleUser && (!profile?.country || profile.country === '')) {
      // Try to get locale from providerData
      let googleLocale = '';
      if (user.providerData && user.providerData.length > 0) {
        const googleProfile = user.providerData.find((p) => p.providerId === 'google.com');
        // @ts-ignore: Google UserInfo may have locale, but not typed in Firebase
        if (googleProfile && googleProfile.locale) {
          // @ts-ignore
          googleLocale = googleProfile.locale;
        }
      }
      
      // Extract country code from locale (e.g., en-US -> US)
      let countryCode = '';
      if (googleLocale && typeof googleLocale === 'string' && googleLocale.includes('-')) {
        countryCode = googleLocale.split('-')[1].toUpperCase();
      }
      
      // If we have a valid country code, update Firestore and local state
      if (countryCode && (!profile || profile.country !== countryCode)) {
        setEditForm((prev) => ({ ...prev, country: countryCode }));
        setProfile((prev) => prev ? { ...prev, country: countryCode } : prev);
        if (user.uid) {
          updateDoc(doc(db, 'users', user.uid), { 
            country: countryCode, 
            lastUpdated: new Date() 
          }).catch(error => {
            console.error('Error updating country for Google user:', error);
          });
        }
      }
    }
  }, [user, profile]);
  // --- In the edit modal, conditionally render country selection ---
  // Find the edit modal form section (around line 2764)
  // Replace the country select with conditional logic:
  <div>
    <label className="block text-gray-400 mb-2 text-sm font-medium">Country</label>
    <CountrySelect
      value={editForm.country ?? ''}
      onChange={(value) => setEditForm((prev) => ({ ...prev, country: value }))}
    />
  </div>
  // --- In the profile display, only show country if set ---
  // Find the profile display section (around line 1674)
  // Replace the country display with:
  {profile?.country && profile.country.trim() && (
    <div className="flex items-start p-3 rounded-lg bg-dark-700/50 backdrop-blur-sm">
      <MapPin size={18} className="text-primary-400 mt-0.5 mr-3 flex-shrink-0" />
      <div>
        <p className="text-sm text-gray-400">Location</p>
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="country flag">
            {getCountryInfo(profile.country).flag}
          </span>
          <p className="text-gray-200">
            {getCountryInfo(profile.country).name}
          </p>
        </div>
      </div>
    </div>
  )}

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const userProfileSchema = `{
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "name": "User Profile | SoundAlchemy",
    "description": "View and edit your musician profile on SoundAlchemy. Connect with global musicians, orchestras, and more. Powered by Lehan Kawshila.",
    "url": "https://soundalcmy.com/profile"
  }`;

  return (
    <>
      <SEO
        title="User Profile | SoundAlchemy – Global Musicians & Music Platform"
        description="View and edit your musician profile on SoundAlchemy. Connect with global musicians, orchestras, and more. Powered by Lehan Kawshila."
        keywords="soundalcmy, soundalchemy, music, user profile, global musicians, lehan kawshila, orchestra, guitar, world wide"
        image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
        url="https://soundalcmy.com/profile"
        lang="en"
        schema={userProfileSchema}
      />
      <div className="min-h-screen bg-gray-900">
        {/* Professional Welcome Message Overlay */}
        <AnimatePresence>
          {showWelcome && profile?.fullName && (
            <WelcomeMessage name={profile.fullName} />
          )}
        </AnimatePresence>
        
        {hasMissingFields && showProfileAlert && showEditModal === false && dynamicReminders.length > 0 && (
          <div style={{ position: 'fixed', top: 16, left: 0, right: 0, zIndex: 9999, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div className="flex items-center gap-2 bg-yellow-400 text-gray-900 px-4 py-2 rounded-full shadow-md border border-yellow-300 text-sm min-w-[260px] max-w-full w-fit pointer-events-auto animate-fade-in-down">
              <span className="text-lg">🎉</span>
              <span className="font-medium">{dynamicReminders[currentReminderIndex]}</span>
              <button
                onClick={() => setShowEditModal(true)}
                className="ml-2 px-3 py-1 bg-white text-yellow-700 font-semibold rounded hover:bg-yellow-100 border border-yellow-300 text-xs transition-colors"
                style={{ pointerEvents: 'auto' }}
              >
                Complete Now
              </button>
              <button
                onClick={() => setShowProfileAlert(false)}
                className="ml-1 p-1 rounded hover:bg-yellow-200 text-gray-700 text-xs"
                aria-label="Dismiss"
                style={{ pointerEvents: 'auto' }}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L14 14M6 14L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Profile Picture Alert - Very Important */}
        {showProfilePictureAlert && !profile?.profileImagePath && (
          <div style={{ position: 'fixed', top: 80, left: 0, right: 0, zIndex: 9998, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div className="flex items-center gap-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-xl shadow-2xl border border-red-400 text-sm min-w-[320px] max-w-full w-fit pointer-events-auto animate-fade-in-down profile-picture-alert">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📸</span>
                <div>
                  <div className="font-bold text-base">Profile Picture Required!</div>
                  <div className="text-red-100 text-xs">A professional profile picture is essential for your musician profile</div>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="ml-3 px-4 py-2 bg-white text-red-600 font-bold rounded-lg hover:bg-red-50 border border-white text-sm transition-colors shadow-lg"
                style={{ pointerEvents: 'auto' }}
              >
                Add Photo
              </button>
              <button
                onClick={() => setShowProfilePictureAlert(false)}
                className="ml-2 p-2 rounded-lg hover:bg-red-400 text-white text-sm transition-colors"
                aria-label="Dismiss"
                style={{ pointerEvents: 'auto' }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L14 14M6 14L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        )}
        
        <div className="container mx-auto px-2 sm:px-4 md:px-8 py-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Profile Card */}
            <div className="lg:col-span-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="glass-card rounded-2xl overflow-hidden shadow-2xl border border-primary-500/20 bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800"
              >
                <div className="relative h-40 bg-gradient-to-r from-primary-600 to-secondary-600">
                  <button 
                    onClick={handleEditToggle} 
                    className="absolute top-4 right-4 p-2.5 bg-dark-800/50 rounded-full hover:bg-dark-700/60 transition-colors duration-300 backdrop-blur-sm"
                  >
                    <Edit3 size={18} className="text-white" />
                  </button>
                  <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2">
                    <div className="w-40 h-40 rounded-full border-4 border-dark-700 overflow-hidden shadow-xl">
                      <ProfileImage
                        src={(() => {
                          if (profile?.profileImagePath?.trim()) return profile.profileImagePath;
                          if (user?.photoURL) return user.photoURL;
                          const googleProvider = user?.providerData?.find((p: any) => p.providerId === 'google.com');
                          if (googleProvider?.photoURL) return googleProvider.photoURL;
                          return '';
                        })()}
                        alt={profile?.fullName || 'Profile'}
                        isVerified={profile?.isVerified}
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-24 px-6 pb-6">
                  <div className="flex flex-col items-center mb-6">
                    <h2 className="text-2xl font-bold text-white text-center break-all mb-2 flex items-center justify-center">
                      {profile?.fullName}
                      {profile?.isVerified && (
                        <span className="ml-2 align-middle inline-block">
                          <VerifiedBadge size={18} tooltip="Verified Musician" />
                        </span>
                      )}
                    </h2>
                    {profile?.email && (
                      <div className="text-gray-400 text-sm mb-2 break-all text-center">{profile.email}</div>
                    )}
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-primary-400 font-medium">
                        {getTalentText()}
                      </span>
                      {profile?.verificationStatus === 'pending' && (
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-xs rounded-full">
                          Verification pending
                        </span>
                      )}
                    </div>
                    {/* Improved note for unverified users */}
                    {!profile?.isVerified && (
                      <div className="mt-3 text-yellow-200 text-xs text-center bg-yellow-900/20 rounded-lg px-3 py-2 border border-yellow-400/30">
                        <strong>Note:</strong> Our SoundAlchemy team is reviewing your details. Once verified, all features will be enabled for your account.
                      </div>
                    )}
                  </div>
                  
                  {/* Bio with improved see more/less */}
                  <div className="mb-8 relative">
                    <div 
                      ref={bioRef}
                      className={`text-gray-300 transition-all duration-300 ${
                        showFullBio ? 'max-h-none' : 'max-h-24 overflow-hidden'
                      }`}
                    >
                      <p className="leading-relaxed">{profile?.bio}</p>
                    </div>
                    {bioOverflow && (
                      <button 
                        onClick={() => setShowFullBio(!showFullBio)}
                        className="mt-2 text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center gap-1"
                      >
                        {showFullBio ? (
                          <>Show Less <ChevronUp size={16} /></>
                        ) : (
                          <>Show More <ChevronDown size={16} /></>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Country/Location Display - Only show if country is set */}
                    {profile?.country && profile.country.trim() && (
                      <div className="flex items-start p-3 rounded-lg bg-dark-700/50 backdrop-blur-sm">
                        <MapPin size={18} className="text-primary-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-400">Location</p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl" role="img" aria-label="country flag">
                              {getCountryInfo(profile.country).flag}
                            </span>
                            <p className="text-gray-200">
                              {getCountryInfo(profile.country).name}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Gender Display */}
                    {profile?.gender && getGenderDisplay(profile.gender) && (
                      <div className="flex items-start p-3 rounded-lg bg-dark-700/50 backdrop-blur-sm">
                        <User size={18} className="text-primary-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-400">Gender</p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl" role="img" aria-label="gender">
                              {getGenderDisplay(profile.gender)?.icon}
                            </span>
                            <p className="text-gray-200">
                              {getGenderDisplay(profile.gender)?.label}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Music Culture Display */}
                    {profile?.musicCulture && getMusicCultureDisplay(profile.musicCulture) && (
                      <div className="flex items-start p-3 rounded-lg bg-dark-700/50 backdrop-blur-sm">
                        <Music size={18} className="text-primary-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-400">Music Culture</p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl" role="img" aria-label="music culture">
                              {getMusicCultureDisplay(profile.musicCulture)?.icon}
                            </span>
                            <div>
                              <p className="text-gray-200 font-medium">
                                {getMusicCultureDisplay(profile.musicCulture)?.label}
                              </p>
                              <p className="text-xs text-gray-400">
                                {getMusicCultureDisplay(profile.musicCulture)?.category}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Conditional Phone Number Display */}
                    {profile?.contactNumber && profile.contactNumber.trim() && (
                      <div className="flex items-start p-3 rounded-lg bg-dark-700/50 backdrop-blur-sm">
                        <Phone size={18} className="text-primary-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-400">Contact Number</p>
                          <PhoneNumberDisplay phoneNumber={profile.contactNumber} />
                        </div>
                      </div>
                    )}

                    {profile?.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
                      <motion.div
                        className="mt-4 mb-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      >
                        <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-primary-400" />
                          Social Media
                        </h4>
                        <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                          {SOCIAL_MEDIA.map(({ key, label, icon }) =>
                            profile.socialLinks?.[key] ? (
                              <motion.a
                                key={key}
                                href={profile.socialLinks[key]}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={label}
                                aria-label={label}
                                className="group rounded-full p-2 bg-dark-700 shadow-md flex items-center justify-center touch-manipulation"
                                style={{ minWidth: 44, minHeight: 44 }}
                                whileHover={{ scale: 1.18, boxShadow: '0 0 16px 4px rgba(0,0,0,0.25)', y: -4 }}
                                whileTap={{ scale: 0.95, boxShadow: '0 0 24px 8px rgba(0,0,0,0.30)', y: 2 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileFocus={{ scale: 1.12, boxShadow: '0 0 20px 6px rgba(0,0,0,0.22)' }}
                              >
                                <motion.span
                                  className=""
                                  animate={{ y: [0, -2, 0, 2, 0], transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' } }}
                                >
                                  {icon}
                                </motion.span>
                                <motion.span
                                  className={`hidden md:inline-block ml-2 font-bold text-sm ${
                                    key === 'instagram' ? 'text-pink-500' :
                                    key === 'facebook' ? 'text-blue-600' :
                                    key === 'youtube' ? 'text-red-600' :
                                    key === 'linkedin' ? 'text-blue-700' :
                                    key === 'tiktok' ? 'text-black dark:text-white' :
                                    key === 'spotify' ? 'text-green-500' :
                                    ''
                                  }`}
                                  initial={{ opacity: 0, x: 8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.4, delay: 0.1 }}
                                >
                                  {label}
                                </motion.span>
                              </motion.a>
                            ) : null
                          )}
                        </div>
                      </motion.div>
                    )}

                    {profile?.socialLinks && !Object.values(profile.socialLinks).some(Boolean) && (
                      <div className="mt-4 mb-2">
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-900/20 border border-blue-500/30 shadow-md">
                          <Share2 className="w-5 h-5 text-blue-400" />
                          <div>
                            <div className="font-bold text-blue-300 mb-1">Please add your social media accounts</div>
                            <div className="text-xs text-blue-100">
                              Adding at least one helps build trust, increases discoverability, and makes it easier for others to connect with you.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-dark-700/50 backdrop-blur-sm">
                      <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <BookOpen size={16} className="text-primary-400" />
                        Personal Bio
                      </h4>
                      <div className="relative">
                        <div 
                          ref={bioRef}
                          className={`text-gray-300 transition-all duration-300 prose prose-invert prose-sm max-w-none ${
                            showFullBio ? 'max-h-[300px]' : 'max-h-24'
                          } overflow-y-auto overflow-x-hidden custom-scrollbar`}
                          style={{
                            scrollbarGutter: 'stable',
                            paddingRight: '16px'
                          }}
                        >
                          <p className="leading-relaxed whitespace-pre-line break-words">{profile?.bio}</p>
                        </div>
                        {bioOverflow && (
                          <button 
                            onClick={() => setShowFullBio(!showFullBio)}
                            className="mt-2 text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center gap-1"
                          >
                            {showFullBio ? (
                              <>Show Less <ChevronUp size={16} /></>
                            ) : (
                              <>Show More <ChevronDown size={16} /></>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-dark-700/50 backdrop-blur-sm">
                      <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Star size={16} className="text-primary-400" />
                        Talent Description
                      </h4>
                      <div className="text-gray-300 prose prose-invert prose-sm max-w-none">
                        <p className="leading-relaxed">{profile?.talentDescription || 'No talent description added yet.'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              {/* Friends List Section */}
              {friends.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-2">Friends <span className="text-gray-400 text-base font-normal">({friends.length})</span></h3>
                  {friendsLoading ? (
                    <div className="flex justify-center items-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div></div>
                  ) : (
                    <div className="flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-primary-500/60 scrollbar-track-dark-800 snap-x snap-mandatory py-2">
                      {friends.map(f => (
                        <div
                          key={f.uid}
                          className="min-w-[120px] max-w-[140px] flex-shrink-0 bg-dark-700 rounded-xl p-3 flex flex-col items-center snap-center cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => navigate(`/musician/${f.uid}`)}
                          title={`View ${f.fullName}'s profile`}
                        >
                          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary-400 mb-2">
                            <ProfileImage
                              src={f.profileImagePath || ''}
                              alt={f.fullName}
                            />
                          </div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="font-semibold text-sm truncate max-w-[80px]">{f.fullName}</span>
                            {f.isVerified && <BadgeCheck className="text-green-400 w-4 h-4" />}
                          </div>
                          <div className="text-xs text-gray-400 text-center truncate max-w-[100px]">{Array.isArray(f.instrumentTypes) ? f.instrumentTypes.join(', ') : ''}</div>
                          <div className="text-xs text-gray-400">{f.country}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Content */}
            <div className="lg:col-span-8 space-y-6">
              {/* Welcome Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="glass-card rounded-2xl p-6 shadow-xl bg-gradient-to-br from-purple-900/20 to-red-900/20 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <BookOpen size={28} className="text-primary-400 mr-3" />
                  <h3 className="text-xl sm:text-2xl font-bold">Welcome Message</h3>
                </div>
                <p className="text-gray-300 italic">
                  {profile?.welcomeMessage || "Welcome to SoundAlchemy! Complete your profile to connect with musicians worldwide."}
                </p>
              </motion.div>

              {/* User Details Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="glass-card rounded-2xl p-6 shadow-xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <User size={28} className="text-primary-400 mr-3" />
                    <h3 className="text-2xl font-bold">User Details</h3>
                  </div>
                  <button 
                    onClick={() => setShowEditModal(true)}
                    className="px-4 py-2 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors flex items-center gap-2"
                  >
                    <Edit3 size={16} />
                    Edit Details
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Account Status</h4>
                      <div className="flex items-center gap-2">
                        {getVerificationBadge()}
                        <span className="text-gray-300">
                          {profile?.isVerified ? 'Verified Account' : 'Pending Verification'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Gender</h4>
                      <div className="flex items-center gap-2">
                        {profile?.gender && getGenderDisplay(profile.gender) ? (
                          <>
                            <span className="text-xl" role="img" aria-label="gender">
                              {getGenderDisplay(profile.gender)?.icon}
                            </span>
                            <span className="text-gray-300">
                              {getGenderDisplay(profile.gender)?.label}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400">Not specified</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Join Date</h4>
                      <p className="text-gray-300">
                        {profile?.createdAt ? `Joined: ${formatJoinDate(profile.createdAt)}` : 'Not available'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Music Culture</h4>
                      <div className="flex items-center gap-2">
                        {profile?.musicCulture && getMusicCultureDisplay(profile.musicCulture) ? (
                          <>
                            <span className="text-xl" role="img" aria-label="music culture">
                              {getMusicCultureDisplay(profile.musicCulture)?.icon}
                            </span>
                            <div>
                              <span className="text-gray-300 font-medium">
                                {getMusicCultureDisplay(profile.musicCulture)?.label}
                              </span>
                              <div className="text-xs text-gray-400">
                                {getMusicCultureDisplay(profile.musicCulture)?.category}
                              </div>
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">Not specified</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Last Updated</h4>
                      <p className="text-gray-300">
                        {profile?.lastUpdated ? new Date(profile.lastUpdated).toLocaleDateString() : 'Not available'}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Role</h4>
                      <p className="text-gray-300">{profile?.role || 'Musician'}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Account Type</h4>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-sm">
                          {profile?.isVerified ? 'Professional' : 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Musical Talents Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="glass-card rounded-2xl p-6 shadow-xl bg-gradient-to-br from-red-900/20 to-amber-900/20 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Music size={28} className="text-primary-400 mr-3" />
                    <h3 className="text-2xl font-bold">Musical Talents</h3>
                  </div>
                  <span className="px-4 py-2 rounded-lg bg-primary-500/10 text-primary-400 font-medium">
                    {(() => {
                      const hasInstruments = profile?.instrumentTypes && profile.instrumentTypes.length > 0;
                      const hasSinging = profile?.singingTypes && profile.singingTypes.length > 0;
                      if (hasInstruments && hasSinging) return 'Instrumentalist & Singer';
                      if (hasInstruments) return 'Instrumentalist';
                      if (hasSinging) return 'Singer';
                      return 'Musician';
                    })()}
                  </span>
                </div>

                <div className="space-y-6">
                  {profile?.instrumentTypes && profile.instrumentTypes.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <FileMusic className="w-5 h-5 text-primary-400" />
                        Instruments
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {profile.instrumentTypes.map(id => {
                          const instrument = getInstrumentTypeById(id);
                          return (
                            <div key={id} className="flex items-center gap-2 px-4 py-2 bg-dark-700/50 backdrop-blur-sm rounded-xl">
                              <span className="text-2xl">{instrument.icon}</span>
                              <span className="text-gray-200 font-medium">{instrument.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {profile?.singingTypes && profile.singingTypes.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Mic className="w-5 h-5 text-primary-400" />
                        Singing Styles
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {profile.singingTypes.map(id => {
                          const style = getSingingTypeById(id);
                          return (
                            <div key={id} className="flex items-center gap-2 px-4 py-2 bg-dark-700/50 backdrop-blur-sm rounded-xl">
                              <span className="text-2xl">{style.icon}</span>
                              <span className="text-gray-200 font-medium">{style.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(!profile?.instrumentTypes?.length && !profile?.singingTypes?.length) && (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No musical talents added yet.</p>
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="mt-4 px-6 py-2 bg-primary-500/10 text-primary-400 rounded-lg hover:bg-primary-500/20 transition-colors"
                      >
                        Add Your Talents
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Analytics Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="glass-card rounded-2xl p-6 shadow-xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex items-center mb-6">
                  <BarChart2 size={28} className="text-primary-400 mr-3" />
                  <h3 className="text-2xl font-bold">Profile Analytics</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-dark-700/50 backdrop-blur-sm">
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Profile Views</h4>
                    <p className="text-2xl font-bold text-white">
                      {(analytics?.profileViews ?? profile?.analytics?.profileViews) || 0}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-dark-700/50 backdrop-blur-sm">
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Friends</h4>
                    <p className="text-2xl font-bold text-white">
                      {friends.length}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-dark-700/50 backdrop-blur-sm">
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Collaborations</h4>
                    <p className="text-2xl font-bold text-white">
                      {(analytics?.collaborations ?? profile?.analytics?.collaborations) || 0}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-dark-700/50 backdrop-blur-sm">
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Projects</h4>
                    <p className="text-2xl font-bold text-white">
                      {(analytics?.projects ?? profile?.analytics?.projects) || 0}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Skills & Interests */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="glass-card rounded-2xl p-6 shadow-xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex items-center mb-6">
                  <Star size={28} className="text-primary-400 mr-3" />
                  <h3 className="text-2xl font-bold">Skills & Interests</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Musical Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile?.skills?.map((skill: string, index: number) => (
                        <span key={index} className="text-sm text-gray-300">
                          {skill}
                        </span>
                      )) || (
                        <p className="text-gray-400">No skills added yet</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-4">Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile?.interests?.map((interest: string, index: number) => (
                        <span key={index} className="text-sm text-gray-300">
                          {interest}
                        </span>
                      )) || (
                        <p className="text-gray-400">No interests added yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Collaboration Ideas */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="glass-card rounded-2xl p-6 mb-8 shadow-xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex items-center mb-6">
                  <HandHelping size={28} className="text-secondary-400 mr-3" />
                  <h3 className="text-2xl font-bold">Collaboration Ideas for You</h3>
                </div>
                
                {ideasLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader size={24} className="animate-spin text-secondary-400" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {collaborationIdeas.map((idea, index) => (
                      <div key={index} className="bg-dark-700 p-4 rounded-lg">
                        <p className="text-gray-200">{idea}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {!ideasLoading && collaborationIdeas.length === 0 && (
                  <p className="text-gray-400 text-center py-8 text-lg flex flex-col items-center">
                    <span className="mb-2">🎵</span>
                    Complete your profile to get personalized collaboration ideas.
                  </p>
                )}
              </motion.div>

              {/* Music Portfolio Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="glass-card rounded-2xl p-6 mb-8 shadow-xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FileMusic size={28} className="text-primary-400 mr-3" />
                    <h3 className="text-2xl font-bold mb-4 flex items-center">
                      Music Portfolio
                    </h3>
                  </div>
                  <ComingSoonButton className="btn-primary text-lg px-6 py-2 rounded-lg shadow-lg">
                    Add Track
                  </ComingSoonButton>
                </div>
                
                {portfolio.length > 0 ? (
                  <div className="space-y-4">
                    {portfolio.map((track) => (
                      <div key={track.id} className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-dark-600 rounded flex items-center justify-center">
                            <Music size={24} className="text-primary-400" />
                          </div>
                          <div className="ml-4">
                            <h4 className="font-medium">{track.title}</h4>
                            <p className="text-sm text-gray-400">{track.genre}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">{track.duration}</p>
                          <p className="text-sm text-primary-400">{track.plays} plays</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8 text-lg flex flex-col items-center">
                    <span className="mb-2">🎵</span>
                    No tracks uploaded yet. Start building your portfolio!
                  </p>
                )}
              </motion.div>
              
              {/* Music Analytics Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="glass-card rounded-2xl p-6 mb-8 shadow-xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex items-center mb-4">
                  <BarChart2 size={28} className="text-primary-400 mr-3" />
                  <h3 className="text-2xl font-bold">Music Analytics</h3>
                </div>
                
                {analytics ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-dark-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Total Plays</p>
                      <p className="text-2xl font-semibold">{analytics.totalPlays}</p>
                    </div>
                    <div className="bg-dark-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Followers</p>
                      <p className="text-2xl font-semibold">{analytics.followers}</p>
                    </div>
                    <div className="bg-dark-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Collaborations</p>
                      <p className="text-2xl font-semibold">{analytics.collaborations}</p>
                    </div>
                    <div className="bg-dark-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Projects</p>
                      <p className="text-2xl font-semibold">{analytics.projects}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">
                    Start uploading music to see your analytics!
                  </p>
                )}
              </motion.div>
              
              {/* Learning & Resources Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="glass-card rounded-2xl p-6 mb-8 shadow-xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center">
                    <Book size={28} className="text-primary-400 mr-3" />
                    <h3 className="text-xl sm:text-2xl font-bold">Learning & Resources</h3>
                  </div>
                  <ComingSoonButton className="btn-outline text-sm w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-600 text-gray-300">
                    Browse Courses
                  </ComingSoonButton>
                </div>
                
                {learningProgress ? (
                  <div className="space-y-4">
                    <div className="bg-dark-700 p-4 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <p className="text-sm text-gray-400">Completed Courses</p>
                        <span className="text-primary-400">{learningProgress.completedCourses}</span>
                      </div>
                      <div className="w-full bg-dark-600 rounded-full h-2">
                        <div 
                          className="bg-primary-500 h-2 rounded-full" 
                          style={{ width: `${(learningProgress.completedCourses / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {learningProgress.currentCourses.map((course: { id: string; title: string; progress: number }) => (
                      <div key={course.id} className="bg-dark-700 p-4 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <h4 className="font-medium">{course.title}</h4>
                          <span className="text-primary-400">{course.progress}%</span>
                        </div>
                        <div className="w-full bg-dark-600 rounded-full h-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full" 
                            style={{ width: `${course.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                    
                    {learningProgress.certificates.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Certificates</h4>
                        <div className="space-y-2">
                          {learningProgress.certificates.map((cert: { id: string; title: string; issueDate: string | Date }) => (
                            <div key={cert.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-dark-700 p-3 rounded-lg gap-2">
                              <div className="flex items-center">
                                <Award size={16} className="text-primary-400 mr-2" />
                                <span>{cert.title}</span>
                              </div>
                              <span className="text-sm text-gray-400">
                                {typeof cert.issueDate === 'string' ? cert.issueDate : cert.issueDate.toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">
                    Start your learning journey today!
                  </p>
                )}
              </motion.div>
              
              {/* Collaboration Opportunities Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="glass-card rounded-2xl p-6 mb-8 shadow-xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center">
                    <Users size={28} className="text-primary-400 mr-3" />
                    <h3 className="text-xl sm:text-2xl font-bold">Collaboration Opportunities</h3>
                  </div>
                  <ComingSoonButton className="btn-outline text-sm w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-600 text-gray-300">
                    Find Collaborators
                  </ComingSoonButton>
                </div>
                
                {collaborationOpportunities.length > 0 ? (
                  <div className="space-y-4">
                    {collaborationOpportunities.map((opp) => (
                      <div key={opp.id} className="bg-dark-700 p-4 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium">{opp.title}</h4>
                            <p className="text-sm text-gray-400 mt-1">{opp.description}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center mt-2 gap-2 sm:gap-4">
                              <span className="flex items-center text-sm text-gray-400">
                                <Music size={14} className="mr-1" />
                                {opp.genre}
                              </span>
                              <span className="flex items-center text-sm text-gray-400">
                                <Calendar size={14} className="mr-1" />
                                {opp.deadline}
                              </span>
                            </div>
                          </div>
                          <button className="btn-primary text-sm w-full sm:w-auto px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors">
                            Connect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">
                    No collaboration opportunities found. Update your profile to get matched!
                  </p>
                )}
              </motion.div>

              {/* Music Journey Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
                className="glass-card rounded-2xl p-6 mb-8 shadow-xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center">
                    <Clock size={28} className="text-primary-400 mr-3" />
                    <h3 className="text-xl sm:text-2xl font-bold">Music Journey Timeline</h3>
                  </div>
                  <ComingSoonButton className="btn-outline text-sm w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-600 text-gray-300">
                    Add Milestone
                  </ComingSoonButton>
                </div>
                
                <div className="space-y-4">
                  {musicEvents.map((event) => (
                    <div key={event.id} className="relative pl-8 pb-4 border-l-2 border-primary-500">
                      <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary-500"></div>
                      <div className="bg-dark-700 p-4 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <h4 className="font-medium">{event.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full w-fit ${
                            event.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                            event.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {event.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{event.description}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center mt-2 gap-2 sm:gap-4">
                          <span className="flex items-center text-sm text-gray-400">
                            <Calendar size={14} className="mr-1" />
                            {typeof event.date === 'string' ? event.date : event.date.toLocaleDateString()}
                          </span>
                          <span className="flex items-center text-sm text-gray-400">
                            <MapPin size={14} className="mr-1" />
                            {event.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              
              {/* Skill Progress Tracker */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
                className="glass-card rounded-2xl p-6 mb-8 shadow-xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center">
                    <Target size={28} className="text-primary-400 mr-3" />
                    <h3 className="text-xl sm:text-2xl font-bold">Skill Progress</h3>
                  </div>
                  <ComingSoonButton className="btn-outline text-sm w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-600 text-gray-300">
                    Update Progress
                  </ComingSoonButton>
                </div>
                
                <div className="space-y-4">
                  {skillProgress.map((skill) => (
                    <div key={skill.skill} className="bg-dark-700 p-4 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <h4 className="font-medium">{skill.skill}</h4>
                        <span className="text-primary-400">Level {skill.level}</span>
                      </div>
                      <div className="w-full bg-dark-600 rounded-full h-2 mb-4">
                        <div 
                          className="bg-primary-500 h-2 rounded-full" 
                          style={{ width: `${(skill.level / 10) * 100}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">Short-term Goal</p>
                          <p className="text-sm">{skill.goals.shortTerm}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Long-term Goal</p>
                          <p className="text-sm">{skill.goals.longTerm}</p>
                        </div>
                      </div>
                      {skill.achievements.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-400 mb-2">Recent Achievements</p>
                          <div className="space-y-2">
                            {skill.achievements.map((achievement, index) => (
                              <div key={index} className="flex items-center text-sm">
                                <Star size={14} className="text-yellow-400 mr-2" />
                                {achievement}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
              
              {/* Practice Session Logger */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.8 }}
                className="glass-card rounded-2xl p-6 mb-8 shadow-xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center">
                    <Headphones size={28} className="text-primary-400 mr-3" />
                    <h3 className="text-xl sm:text-2xl font-bold">Practice Sessions</h3>
                  </div>
                  <ComingSoonButton className="btn-outline text-sm w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-600 text-gray-300">
                    Log Session
                  </ComingSoonButton>
                </div>
                
                <div className="space-y-4">
                  {practiceSessions.map((session) => (
                    <div key={session.id} className="bg-dark-700 p-4 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div className="flex items-center">
                          <Clock size={16} className="text-primary-400 mr-2" />
                          <span className="text-sm text-gray-400">
                            {typeof session.date === 'string' ? session.date : session.date.toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-primary-400">{session.duration} minutes</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                        <div>
                          <p className="text-sm text-gray-400">Focus Area</p>
                          <p className="text-sm">{session.focus}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Mood</p>
                          <p className="text-sm">{session.mood}</p>
                        </div>
                      </div>
                      {session.notes && (
                        <p className="text-sm text-gray-400 mt-2">{session.notes}</p>
                      )}
                      {session.achievements.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-400">Achievements</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {session.achievements.map((achievement, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded-full text-xs"
                              >
                                {achievement}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
              
              {/* Music Community Feed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.9 }}
                className="glass-card rounded-2xl p-6 mb-8 shadow-xl bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center">
                    <Users size={28} className="text-primary-400 mr-3" />
                    <h3 className="text-xl sm:text-2xl font-bold">Community Feed</h3>
                  </div>
                  <ComingSoonButton className="btn-outline text-sm w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-600 text-gray-300">
                    Share Update
                  </ComingSoonButton>
                </div>
                
                <div className="space-y-4">
                  {communityFeed.map((post) => (
                    <div key={post.id} className="bg-dark-700 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-full bg-dark-600 overflow-hidden flex-shrink-0">
                          {post.userImage ? (
                            <img src={post.userImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User size={20} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-medium truncate">{post.userName}</h4>
                              <p className="text-sm text-gray-400">
                                {typeof post.timestamp === 'string' ? post.timestamp : post.timestamp.toLocaleDateString()}
                              </p>
                            </div>
                            <button className="text-gray-400 hover:text-white flex-shrink-0">
                              <Share2 size={16} />
                            </button>
                          </div>
                          <p className="mt-2 break-words">{post.content}</p>
                          {post.media && (
                            <div className="mt-3">
                              {post.media.type === 'image' && (
                                <img 
                                  src={post.media.url} 
                                  alt="" 
                                  className="rounded-lg max-h-64 object-cover w-full"
                                />
                              )}
                              {post.media.type === 'video' && (
                                <video 
                                  src={post.media.url} 
                                  controls 
                                  className="rounded-lg max-h-64 w-full"
                                />
                              )}
                              {post.media.type === 'audio' && (
                                <audio 
                                  src={post.media.url} 
                                  controls 
                                  className="w-full"
                                />
                              )}
                            </div>
                          )}
                          <div className="flex items-center space-x-4 mt-3">
                            <button className="flex items-center text-gray-400 hover:text-white">
                              <Heart size={16} className="mr-1" />
                              <span className="text-sm">{post.likes}</span>
                            </button>
                            <button className="flex items-center text-gray-400 hover:text-white">
                              <MessageCircle size={16} className="mr-1" />
                              <span className="text-sm">{post.comments}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Inside the profile view */}
             
            </div>
          </div>
        </div>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {showEditModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }} 
                className="relative bg-dark-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-primary-500/20"
              >
                <div className="sticky top-0 z-10 bg-dark-800 px-6 py-4 border-b border-dark-700 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Edit Profile</h2>
                  <button 
                    onClick={() => setShowEditModal(false)} 
                    className="p-2 hover:bg-dark-700 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-400 hover:text-white" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(90vh - 70px)' }}>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col items-center mb-8">
                      <div className="relative w-32 h-32">
                        <div className="w-full h-full rounded-full border-4 border-dark-700 overflow-hidden bg-dark-600">
                          <ProfileImage
                            src={editForm.previewURL && selectedImage ? editForm.previewURL : profile?.profileImagePath || ''}
                            alt="Profile Preview"
                          />
                        </div>
                        <label className="absolute bottom-0 right-0 p-2 bg-primary-500 rounded-full cursor-pointer hover:bg-primary-600 transition-colors group">
                          <Camera size={18} className="text-white" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageChange} 
                          />
                          <span className="absolute bottom-full right-0 mb-2 whitespace-nowrap bg-dark-900 text-sm text-gray-300 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            Change Photo
                          </span>
                        </label>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">Click the camera icon to change your profile picture</p>
                    </div>

                    {/* Profile Picture Importance Alert */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">📸</span>
                        <div>
                          <h4 className="font-bold text-red-400 mb-1">Profile Picture is Essential!</h4>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            A professional profile picture significantly increases your chances of connecting with other musicians and getting collaboration opportunities. 
                            <strong className="text-red-300"> This is highly recommended for all musicians on SoundAlchemy.</strong>
                          </p>
                          <ul className="text-xs text-gray-400 mt-2 space-y-1">
                            <li>• Shows professionalism and commitment</li>
                            <li>• Makes your profile more trustworthy</li>
                            <li>• Increases profile views and connections</li>
                            <li>• Essential for networking in the music industry</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <TalentTypeSelector
                        types={INSTRUMENT_TYPE_GROUPS}
                        selectedTypes={editForm.instrumentTypes || []}
                        onChange={(types: string[]) => setEditForm(prev => ({ ...prev, instrumentTypes: types }))}
                        title="What instruments do you play?"
                        icon={Music}
                      />
                      <TalentTypeSelector
                        types={SINGING_TYPE_GROUPS}
                        selectedTypes={editForm.singingTypes || []}
                        onChange={(types: string[]) => setEditForm(prev => ({ ...prev, singingTypes: types }))}
                        title="What are your singing styles?"
                        icon={Mic}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-400 mb-2 text-sm font-medium">Full Name</label>
                        <input
                          type="text"
                          name="fullName"
                          value={editForm.fullName}
                          onChange={handleInputChange}
                          className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-2 text-sm font-medium">Country</label>
                        <CountrySelect
                          value={editForm.country ?? ''}
                          onChange={(value) => setEditForm((prev) => ({ ...prev, country: value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-2 text-sm font-medium">Gender</label>
                        <div className="relative">
                          <Select
                            classNamePrefix="gender-select"
                            options={genderOptions}
                            value={genderOptions.find(opt => opt.value === editForm.gender) || genderOptions[0]}
                            onChange={(selected: SingleValue<{ value: string; label: string; icon: string }>) => {
                              setEditForm(prev => ({ ...prev, gender: selected ? selected.value : '' }));
                              setShowGenderAlert(false);
                            }}
                            onBlur={() => {
                              if (!editForm.gender || editForm.gender.trim() === "") setShowGenderAlert(true);
                            }}
                            placeholder="Select Gender"
                            isSearchable={false}
                            formatOptionLabel={formatGenderOptionLabel}
                            styles={{
                              control: (base, state) => ({
                                ...base,
                                backgroundColor: '#23272f',
                                borderColor: state.isFocused ? '#6366f1' : '#374151',
                                minHeight: 48,
                                borderRadius: 8,
                                boxShadow: state.isFocused ? '0 0 0 2px #6366f1' : undefined,
                                color: '#fff',
                              }),
                              menu: base => ({
                                ...base,
                                backgroundColor: '#23272f',
                                borderRadius: 8,
                                zIndex: 9999,
                              }),
                              option: (base, state) => ({
                                ...base,
                                backgroundColor: state.isSelected
                                  ? 'rgba(99,102,241,0.2)'
                                  : state.isFocused
                                  ? 'rgba(99,102,241,0.1)'
                                  : 'transparent',
                                color: state.isSelected ? '#6366f1' : '#fff',
                                padding: '12px 16px',
                                fontSize: 16,
                                cursor: 'pointer',
                              }),
                              singleValue: base => ({ ...base, color: '#fff' }),
                              placeholder: base => ({ ...base, color: '#64748b', fontSize: 16 }),
                              input: base => ({ ...base, color: '#fff', fontSize: 16 }),
                              dropdownIndicator: base => ({ ...base, color: '#64748b' }),
                              indicatorSeparator: base => ({ ...base, display: 'none' }),
                            }}
                            menuPlacement="auto"
                            menuPosition="fixed"
                            maxMenuHeight={220}
                            theme={theme => ({
                              ...theme,
                              borderRadius: 8,
                              colors: {
                                ...theme.colors,
                                primary25: 'rgba(99,102,241,0.1)',
                                primary: '#6366f1',
                                neutral0: '#23272f',
                                neutral80: '#fff',
                              },
                            })}
                          />
                        </div>
                        <div className="relative min-h-[28px]">
                          {showGenderAlert && (
                            <div className="animate-fade-in-down mt-2 px-3 py-2 rounded-lg bg-yellow-500/20 border border-yellow-400 text-yellow-700 text-sm flex items-center gap-2 shadow-lg" style={{boxShadow:'0 2px 12px #facc15cc'}}>
                              <span className="text-lg">⚠️</span>
                              <span>Please select your gender. This is important for your profile!</span>
                              <button onClick={() => setShowGenderAlert(false)} className="ml-auto text-yellow-700 hover:text-yellow-900 text-lg px-2">×</button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-2 text-sm font-medium">Music Culture</label>
                        <div className="relative">
                          <Select
                            classNamePrefix="music-culture-select"
                            options={musicCultureOptions}
                            value={
                              musicCultureOptions
                                .flatMap(group => group.options)
                                .find(opt => opt.value === editForm.musicCulture) || null
                            }
                            onChange={(selected: SingleValue<{ value: string; label: string; icon: string }>) => {
                              setEditForm(prev => ({ ...prev, musicCulture: selected ? selected.value : '' }));
                              setShowMusicCultureAlert(false);
                            }}
                            onBlur={() => {
                              if (!editForm.musicCulture || editForm.musicCulture.trim() === "") setShowMusicCultureAlert(true);
                            }}
                            placeholder="Select Music Culture"
                            isSearchable
                            formatOptionLabel={formatOptionLabel}
                            styles={{
                              control: (base, state) => ({
                                ...base,
                                backgroundColor: '#23272f',
                                borderColor: state.isFocused ? '#6366f1' : '#374151',
                                minHeight: 48,
                                borderRadius: 8,
                                boxShadow: state.isFocused ? '0 0 0 2px #6366f1' : undefined,
                                color: '#fff',
                              }),
                              menu: base => ({
                                ...base,
                                backgroundColor: '#23272f',
                                borderRadius: 8,
                                zIndex: 9999,
                              }),
                              option: (base, state) => ({
                                ...base,
                                backgroundColor: state.isSelected
                                  ? 'rgba(99,102,241,0.2)'
                                  : state.isFocused
                                  ? 'rgba(99,102,241,0.1)'
                                  : 'transparent',
                                color: state.isSelected ? '#6366f1' : '#fff',
                                padding: '12px 16px',
                                fontSize: 16,
                                cursor: 'pointer',
                              }),
                              groupHeading: base => ({
                                ...base,
                                color: '#a1a1aa',
                                fontWeight: 600,
                                fontSize: 13,
                                padding: '8px 16px 4px 16px',
                              }),
                              singleValue: base => ({ ...base, color: '#fff' }),
                              placeholder: base => ({ ...base, color: '#64748b', fontSize: 16 }),
                              input: base => ({ ...base, color: '#fff', fontSize: 16 }),
                              dropdownIndicator: base => ({ ...base, color: '#64748b' }),
                              indicatorSeparator: base => ({ ...base, display: 'none' }),
                            }}
                            menuPlacement="auto"
                            menuPosition="fixed"
                            maxMenuHeight={300}
                            theme={theme => ({
                              ...theme,
                              borderRadius: 8,
                              colors: {
                                ...theme.colors,
                                primary25: 'rgba(99,102,241,0.1)',
                                primary: '#6366f1',
                                neutral0: '#23272f',
                                neutral80: '#fff',
                              },
                            })}
                          />
                        </div>
                        <div className="relative min-h-[28px]">
                          {showMusicCultureAlert && (
                            <div className="animate-fade-in-down mt-2 px-3 py-2 rounded-lg bg-yellow-500/20 border border-yellow-400 text-yellow-700 text-sm flex items-center gap-2 shadow-lg" style={{boxShadow:'0 2px 12px #facc15cc'}}>
                              <span className="text-lg">⚠️</span>
                              <span>Please select your music culture. This helps us personalize your experience!</span>
                              <button onClick={() => setShowMusicCultureAlert(false)} className="ml-auto text-yellow-700 hover:text-yellow-900 text-lg px-2">×</button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">Select your primary music culture or style</p>
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-2 text-sm font-medium">Phone Number</label>
                        <div className="phone-input-dark">
                          <PhoneInput
                            country={'lk'}
                            value={editForm.contactNumber}
                            onChange={(phone) => setEditForm(prev => ({ ...prev, contactNumber: phone }))}
                            inputClass="w-full !bg-[#121212] !border-[#2a2a2a] rounded-lg px-4 py-3 !text-white focus:!outline-none focus:!border-primary-500 transition-colors !text-lg"
                            containerClass="phone-input-dark"
                            buttonClass="!bg-[#121212] !border-[#2a2a2a] !border-r-0"
                            dropdownClass="!bg-[#121212] !border-[#2a2a2a]"
                            searchClass="!bg-[#121212] !text-white !border-[#2a2a2a]"
                            placeholder="+94 XXXXXXXXX (Optional)"
                            preferredCountries={['lk']}
                            enableSearch={true}
                          />
                        </div>
                        <p className="text-sm text-gray-400 mt-1">Phone number is optional - you can skip this field</p>
                      </div>
                    </div>

                    {/* ... inside the edit modal form, above the social media input section ... */}
                    <div className="mb-4 p-3 rounded-lg bg-blue-900/20 border border-blue-500/30 flex items-start gap-3 shadow-md">
                      <span className="text-2xl">🌐</span>
                      <div>
                        <div className="font-bold text-blue-300 mb-1">Why add your social media?</div>
                        <div className="text-sm text-blue-100">
                          Adding at least one social media account helps build trust, increases your discoverability, and makes it easier for other musicians and industry professionals to connect with you. Profiles with social links are seen as more authentic and get more collaboration opportunities.
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-2 text-sm font-medium">Personal Bio</label>
                      <textarea
                        name="bio"
                        value={editForm.bio}
                        onChange={handleInputChange}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors h-32 resize-none custom-scrollbar"
                        required
                      ></textarea>
                      <p className="text-sm text-gray-400 mt-1">Write a brief description about yourself and your musical journey</p>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-2 text-sm font-medium">Talent Description</label>
                      <textarea
                        name="talentDescription"
                        value={editForm.talentDescription}
                        onChange={handleInputChange}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors h-32 resize-none custom-scrollbar"
                        placeholder="Describe your musical talents, specialties, and what makes you unique..."
                      ></textarea>
                    </div>

                    {/* ... after the alert in the edit modal form ... */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-primary-400" />
                        Social Media Links
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SOCIAL_MEDIA.map(({ key, label, icon }) => (
                          <div key={key} className="flex items-center gap-2 w-full">
                            {icon}
                            <input
                              type="url"
                              inputMode="url"
                              autoComplete="off"
                              placeholder={`Your ${label} URL`}
                              value={editForm.socialLinks?.[key] || ''}
                              onChange={e => handleSocialLinkChange(key, e.target.value)}
                              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="sticky bottom-0 bg-dark-800 -mx-6 -mb-6 px-6 py-4 border-t border-dark-700 flex justify-end space-x-3">
                      <button 
                        type="button" 
                        onClick={() => setShowEditModal(false)}
                        className="px-6 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-dark-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-6 py-2.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader size={16} className="mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={16} className="mr-2" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Responsive Footer */}
        
        {/* Highly Important Country Required Modal */}
        <AnimatePresence>
          {showCountryRequiredModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0a0a23] bg-opacity-95 backdrop-blur-xl overflow-x-hidden">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative rounded-2xl shadow-2xl w-full max-w-[98vw] sm:max-w-lg mx-2 p-2 sm:p-6 text-center border-0"
                style={{
                  background: 'linear-gradient(135deg, #18181b 60%, #312e81 100%)',
                  boxShadow: '0 8px 40px 0 #312e81cc, 0 1.5px 8px 0 #0008',
                  border: '2.5px solid #6366f1',
                  outline: '3px solid #0ea5e9',
                  outlineOffset: '2px',
                  filter: 'drop-shadow(0 0 24px #6366f1cc)'
                }}
              >
                <h2 className="text-lg sm:text-2xl font-extrabold mb-4 flex items-center justify-center gap-2" style={{color:'#a5b4fc', textShadow:'0 2px 16px #6366f1'}}>
                  <span className="text-2xl sm:text-4xl">🌐</span>
                  Country Required!
                </h2>
                {/* Guide Section - Why Country is Important */}
                <div
                  className="mb-6 p-2 sm:p-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(90deg, #23272f 60%, #312e81 100%)',
                    boxShadow: '0 2px 16px #6366f1cc',
                    border: '1.5px solid #6366f1',
                    color: '#c7d2fe',
                    textAlign: 'left',
                    maxWidth: 480,
                    margin: '0 auto'
                  }}
                >
                  <div className="flex items-center mb-2 gap-2">
                    <span className="text-xl sm:text-2xl">🎶</span>
                    <span className="font-bold text-sm sm:text-lg" style={{ color: '#a5b4fc' }}>
                      Why do we need your country?
                    </span>
                  </div>
                  <ul className="pl-3 sm:pl-6 mt-2 space-y-1 text-xs sm:text-base">
                    <li>🌍 Unlocks global networking and collaboration features</li>
                    <li>🎵 Connect with musicians in your region and worldwide</li>
                    <li>🛡️ Improves your profile's trust and authenticity</li>
                    <li>📈 Enables personalized opportunities and events</li>
                    <li>📨 Ensures you see relevant content and notifications</li>
                  </ul>
                </div>
                <p className="text-sm sm:text-lg mb-6 font-semibold text-gray-200" style={{textShadow:'0 1px 8px #312e81'}}>
                  For your safety and to unlock all features, please select your country before continuing.
                </p>
                <div className="mb-6">
                  <CountrySelect
                    value={editForm.country ?? ''}
                    onChange={(value) => {
                      setEditForm((prev) => ({ ...prev, country: value }));
                    }}
                  />
                </div>
                <button
                  className="w-full py-3 rounded-xl font-bold text-base sm:text-lg shadow-lg transition-all duration-200 border-0 mt-2 sm:mt-4"
                  style={{
                    background: editForm.country && editForm.country.trim() !== '' ? 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)' : '#23272f',
                    color: editForm.country && editForm.country.trim() !== '' ? '#fff' : '#64748b',
                    boxShadow: editForm.country && editForm.country.trim() !== '' ? '0 0 16px #6366f1cc' : 'none',
                    cursor: editForm.country && editForm.country.trim() !== '' ? 'pointer' : 'not-allowed',
                    border: editForm.country && editForm.country.trim() !== '' ? '2px solid #6366f1' : '2px solid #23272f',
                    filter: editForm.country && editForm.country.trim() !== '' ? 'drop-shadow(0 0 12px #6366f1cc)' : 'none',
                    transition: 'all 0.2s cubic-bezier(.4,0,.2,1)'
                  }}
                  disabled={!editForm.country || editForm.country.trim() === ''}
                  onClick={() => setShowCountryRequiredModal(false)}
                >
                  Continue
                </button>
                {!editForm.country && (
                  <div className="mt-4 text-pink-400 font-semibold animate-pulse text-xs sm:text-lg" style={{textShadow:'0 1px 8px #6366f1'}}>🌟 Please select your country to continue. 🌟</div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default UserProfilePage;

<style>
{`
.phone-input-dark .react-tel-input .form-control {
  background-color: #1a1a1a !important;
  border-color: #333333 !important;
  color: #ffffff !important;
  height: 48px !important;
  font-size: 1.125rem !important;
  width: 100% !important;
}

.phone-input-dark .react-tel-input .selected-flag {
  background-color: #1a1a1a !important;
  border-right: 1px solid #333333 !important;
}

.phone-input-dark .react-tel-input .country-list {
  background-color: #1a1a1a !important;
  border-color: #333333 !important;
  max-height: 300px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

.phone-input-dark .react-tel-input .country-list .country {
  color: #e0e0e0 !important;
  display: flex !important;
  align-items: center !important;
  padding: 12px !important;
  transition: all 0.2s ease !important;
}

.phone-input-dark .react-tel-input .country-list .country .country-name {
  color: #e0e0e0 !important;
  font-size: 0.95rem !important;
  margin-left: 12px !important;
  font-weight: 400 !important;
}

.phone-input-dark .react-tel-input .country-list .country .dial-code {
  color: #888888 !important;
  font-size: 0.9rem !important;
  margin-left: auto !important;
}

.phone-input-dark .react-tel-input .country-list .country:hover {
  background-color: #2c2c2c !important;
}

.phone-input-dark .react-tel-input .country-list .country.highlight {
  background-color: #2c2c2c !important;
}

.phone-input-dark .react-tel-input .country-list .country.active {
  background-color: #333333 !important;
}

.phone-input-dark .react-tel-input .search-box {
  background-color: #1a1a1a !important;
  border-color: #333333 !important;
  color: #ffffff !important;
  font-size: 1rem !important;
  padding: 12px !important;
  margin: 6px !important;
  border-radius: 4px !important;
}

.phone-input-dark .react-tel-input .search-box::placeholder {
  color: #888888 !important;
}

.phone-input-dark .react-tel-input .flag-dropdown {
  border-color: #333333 !important;
  background-color: #1a1a1a !important;
  border-radius: 4px 0 0 4px !important;
}

.phone-input-dark .react-tel-input .selected-flag:hover,
.phone-input-dark .react-tel-input .selected-flag:focus {
  background-color: #2c2c2c !important;
}

.phone-input-dark .react-tel-input .country-list::-webkit-scrollbar {
  width: 8px !important;
}

.phone-input-dark .react-tel-input .country-list::-webkit-scrollbar-track {
  background: #1a1a1a !important;
}

.phone-input-dark .react-tel-input .country-list::-webkit-scrollbar-thumb {
  background: #4d4d4d !important;
  border-radius: 4px !important;
}

.phone-input-dark .react-tel-input .country-list::-webkit-scrollbar-thumb:hover {
  background: #5a5a5a !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #718096;
}

@keyframes fade-in-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-down {
  animation: fade-in-down 0.3s ease-out;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(239, 68, 68, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
  }
}

.profile-picture-alert {
  animation: pulse-glow 2s ease-in-out infinite;
}

/* Music Culture Select Styling */
select optgroup {
  background-color: #1a1a1a !important;
  color: #9ca3af !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  padding: 8px 12px !important;
  border-bottom: 1px solid #374151 !important;
}

select option {
  background-color: #1a1a1a !important;
  color: #e5e7eb !important;
  padding: 8px 16px !important;
  font-size: 0.875rem !important;
}

select option:hover {
  background-color: #374151 !important;
}

select option:checked {
  background-color: #ec4899 !important;
  color: white !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px !important;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #1a1a1a !important;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4d4d4d !important;
  border-radius: 4px !important;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #5a5a5a !important;
}
`}
</style>
