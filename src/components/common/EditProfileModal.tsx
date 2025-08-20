import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader, Save, Music, Mic } from 'lucide-react';
import TalentTypeSelector from './TalentTypeSelector';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
// You may need to adjust the import path for CountrySelect
import { INSTRUMENT_TYPE_GROUPS, SINGING_TYPE_GROUPS } from '../../utils/constants';
import { Country, countries, getCountryInfo } from '../../utils/countries';

// Helper function to get direct download URL from Google Drive
const getGoogleDriveDirectUrl = (url: string): string => {
  if (!url) {
    return '';
  }
  
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
      // Use a CORS proxy to access the Google Drive file, adding a timestamp to prevent caching issues
      const directUrl = `https://images.weserv.nl/?url=drive.google.com/uc?export=view%26id=${fileId}&t=${Date.now()}`;
      return directUrl;
    }
  }
  
  return url;
};

// Helper function to get profile image URL
const getProfileImageUrl = (path?: string): string => {
  if (!path) {
    return '/default-avatar.svg';
  }
  
  if (path.includes('drive.google.com')) {
    return getGoogleDriveDirectUrl(path);
  }
  
  // Handle local paths
  if (path.startsWith('/')) {
    return path;
  }
  
  // Handle full URLs
  if (path.startsWith('http')) {
    return path;
  }
  
  // Handle relative paths
  return path;
};

// Proper CountrySelect component
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
        className="flex items-center gap-2 p-3 border border-dark-600 rounded-lg cursor-pointer bg-dark-700 hover:bg-dark-600 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xl">{selectedCountry?.flag || '🌍'}</span>
        <span className="flex-grow text-white">{selectedCountry?.name || 'Select Country'}</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-lg max-h-[300px] overflow-hidden">
          <div className="sticky top-0 bg-dark-800 p-2 border-b border-dark-600">
            <input
              type="text"
              placeholder="Search countries..."
              className="w-full p-2 rounded-md bg-dark-700 border border-dark-600 text-white focus:outline-none focus:border-primary-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto max-h-[250px] custom-scrollbar">
            {filteredCountries.map((country: Country) => (
              <div
                key={country.code}
                className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-dark-700 transition-colors ${
                  value === country.code ? 'bg-primary-500 text-white' : 'text-gray-300'
                }`}
                onClick={() => {
                  onChange(country.code);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
              >
                <span className="text-xl">{country.flag}</span>
                <span>{country.name}</span>
                <span className="text-sm text-gray-400 ml-auto">{country.phoneCode}</span>
              </div>
            ))}
            {filteredCountries.length === 0 && (
              <div className="p-4 text-center text-gray-400">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface EditProfileModalProps {
  open: boolean;
  user: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ open, user, onSave, onCancel }) => {
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [previewURL, setPreviewURL] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (user) {
      const imageUrl = getProfileImageUrl(user.profileImagePath);
      // Merge socialLinks and top-level fields for compatibility
      const socialLinks = user.socialLinks || {};
      setEditForm({
        ...user,
        instrumentTypes: user.instrumentTypes || [],
        singingTypes: user.singingTypes || [],
        interests: Array.isArray(user.interests) ? user.interests.join(', ') : (user.interests || ''),
        profileImage: null,
        previewURL: imageUrl,
        instagram: user.instagram || socialLinks.instagram || '',
        facebook: user.facebook || socialLinks.facebook || '',
        youtube: user.youtube || socialLinks.youtube || '',
        linkedin: user.linkedin || socialLinks.linkedin || '',
        tiktok: user.tiktok || socialLinks.tiktok || '',
        spotify: user.spotify || socialLinks.spotify || '',
        socialLinks: {
          instagram: user.instagram || socialLinks.instagram || '',
          facebook: user.facebook || socialLinks.facebook || '',
          youtube: user.youtube || socialLinks.youtube || '',
          linkedin: user.linkedin || socialLinks.linkedin || '',
          tiktok: user.tiktok || socialLinks.tiktok || '',
          spotify: user.spotify || socialLinks.spotify || '',
        },
      });
      setPreviewURL(imageUrl);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev: any) => {
      // If it's a social media field, update both top-level and socialLinks
      if (["instagram","facebook","youtube","linkedin","tiktok","spotify"].includes(name)) {
        return {
          ...prev,
          [name]: value,
          socialLinks: {
            ...prev.socialLinks,
            [name]: value,
          },
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditForm((prev: any) => ({ ...prev, profileImage: file }));
    setPreviewURL(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Convert interests string back to array
    const interestsArray = editForm.interests 
      ? editForm.interests.split(',').map((interest: string) => interest.trim()).filter((interest: string) => interest.length > 0)
      : [];
    // Always save social media to both top-level and socialLinks
    const socialLinks = {
      instagram: editForm.instagram || '',
      facebook: editForm.facebook || '',
      youtube: editForm.youtube || '',
      linkedin: editForm.linkedin || '',
      tiktok: editForm.tiktok || '',
      spotify: editForm.spotify || '',
    };
    onSave({ 
      ...editForm, 
      interests: interestsArray,
      instagram: socialLinks.instagram,
      facebook: socialLinks.facebook,
      youtube: socialLinks.youtube,
      linkedin: socialLinks.linkedin,
      tiktok: socialLinks.tiktok,
      spotify: socialLinks.spotify,
      socialLinks,
      previewURL 
    });
    setLoading(false);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.95, opacity: 0 }} 
          className="relative bg-dark-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-primary-500/20"
        >
          <div className="sticky top-0 z-10 bg-dark-800 px-6 py-4 border-b border-dark-700 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Edit Profile</h2>
            <button onClick={onCancel} className="p-2 hover:bg-dark-700 rounded-full transition-colors">
              <X size={20} className="text-gray-400 hover:text-white" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(90vh - 70px)' }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center mb-8">
                <div className="relative w-32 h-32">
                  <div className="w-full h-full rounded-full border-4 border-dark-700 overflow-hidden bg-dark-600">
                    {previewURL ? (
                      <img 
                        src={previewURL}
                        alt="Profile Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/default-avatar.svg';
                        }}
                        onLoad={() => {
                          // Image loaded successfully
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <img 
                          src="/default-avatar.svg"
                          alt="Default Avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
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
                  groups={INSTRUMENT_TYPE_GROUPS}
                  selectedTypes={editForm.instrumentTypes || []}
                  onChange={(types: string[]) => setEditForm((prev: any) => ({ ...prev, instrumentTypes: types }))}
                  title="What instruments do you play?"
                  icon={Music}
                />
                <TalentTypeSelector
                  groups={SINGING_TYPE_GROUPS}
                  selectedTypes={editForm.singingTypes || []}
                  onChange={(types: string[]) => setEditForm((prev: any) => ({ ...prev, singingTypes: types }))}
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
                    value={editForm.fullName || ''}
                    onChange={handleInputChange}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 text-sm font-medium">Country</label>
                  <CountrySelect 
                    value={editForm.country ?? 'US'} 
                    onChange={(value: string) => setEditForm((prev: any) => ({ ...prev, country: value }))} 
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 text-sm font-medium">Gender</label>
                  <select
                    name="gender"
                    value={editForm.gender || ''}
                    onChange={handleInputChange}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">👨 Male</option>
                    <option value="female">👩 Female</option>
                    <option value="non_binary">⚧ Non-Binary</option>
                    <option value="prefer_not_to_say">🤐 Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 text-sm font-medium">Music Culture</label>
                  <select
                    name="musicCulture"
                    value={editForm.musicCulture || ''}
                    onChange={handleInputChange}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="">Select Music Culture</option>
                    <optgroup label="Western Classical">
                      <option value="baroque">🎼 Baroque</option>
                      <option value="classical">🎼 Classical</option>
                      <option value="romantic">🎼 Romantic</option>
                      <option value="contemporary_classical">🎼 Contemporary Classical</option>
                    </optgroup>
                    <optgroup label="Jazz & Blues">
                      <option value="traditional_jazz">🎷 Traditional Jazz</option>
                      <option value="bebop">🎷 Bebop</option>
                      <option value="fusion">🎷 Jazz Fusion</option>
                      <option value="blues">🎸 Blues</option>
                      <option value="jazz">🎷 Jazz</option>
                    </optgroup>
                    <optgroup label="World Music">
                      <option value="african">🥁 African</option>
                      <option value="latin">🪘 Latin American</option>
                      <option value="indian">🎼 Indian</option>
                      <option value="middle_eastern">🎼 Middle Eastern</option>
                      <option value="asian">🎼 Asian</option>
                      <option value="world">🌍 World Music</option>
                    </optgroup>
                    <optgroup label="Contemporary">
                      <option value="pop">🎤 Pop</option>
                      <option value="rock">🎸 Rock</option>
                      <option value="electronic">🎛️ Electronic</option>
                      <option value="hip_hop">🎤 Hip-Hop</option>
                      <option value="indie">🎸 Indie</option>
                    </optgroup>
                    <optgroup label="Folk & Traditional">
                      <option value="celtic">🪕 Celtic</option>
                      <option value="bluegrass">🪕 Bluegrass</option>
                      <option value="folk">🎸 Folk</option>
                      <option value="country">🎸 Country</option>
                      <option value="traditional">🪕 Traditional</option>
                    </optgroup>
                    <option value="other">🎵 Other</option>
                  </select>
                  <p className="text-sm text-gray-400 mt-1">Select your primary music culture or style</p>
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 text-sm font-medium">Phone Number</label>
                  <div className="phone-input-dark">
                    <PhoneInput
                      country={'lk'}
                      value={editForm.contactNumber || ''}
                      onChange={(phone: string) => setEditForm((prev: any) => ({ ...prev, contactNumber: phone }))}
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

              {/* Social Media Section */}
              <div>
                <div className="mb-4 p-3 bg-blue-900/40 border border-blue-500/30 rounded-lg flex items-start gap-3">
                  <span className="text-xl mt-0.5">💡</span>
                  <div>
                    <h4 className="font-bold text-blue-300 mb-1">Why add your social media?</h4>
                    <p className="text-sm text-blue-100 leading-relaxed">
                      Adding at least one social media account helps build trust, increases your discoverability, and makes it easier for other musicians and industry professionals to connect with you. Profiles with social links are seen as more authentic and get more collaboration opportunities.
                    </p>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                  <span className="text-lg">🔗</span> Social Media Links
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400">
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.2 2.4.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.5.3 1.2.4 2.4.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.9-.4 2.4-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.5.2-1.2.3-2.4.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.2-2.4-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.5-.3-1.2-.4-2.4C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.9.4-2.4.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.5-.2 1.2-.3 2.4-.4C8.4 2.2 8.8 2.2 12 2.2zm0-2.2C8.7 0 8.3 0 7 .1 5.7.2 4.7.4 3.9.7c-.9.3-1.6.7-2.3 1.4C.4 3.1 0 3.8.7 4.7c.3.9.5 1.8.6 3.1C1.2 8.3 1.2 8.7 1.2 12c0 3.3 0 3.7.1 5 .1 1.3.3 2.2.6 3.1.3.9.7 1.6 1.4 2.3.7.7 1.4 1.1 2.3 1.4.9.3 1.8.5 3.1.6 1.3.1 1.7.1 5 .1s3.7 0 5-.1c1.3-.1 2.2-.3 3.1-.6.9-.3 1.6-.7 2.3-1.4.7-.7 1.1-1.4 1.4-2.3.3-.9.5-1.8.6-3.1.1-1.3.1-1.7.1-5s0-3.7-.1-5c-.1-1.3-.3-2.2-.6-3.1-.3-.9-.7-1.6-1.4-2.3-.7-.7-1.4-1.1-2.3-1.4-.9-.3-1.8-.5-3.1-.6C15.7 0 15.3 0 12 0z"/><circle cx="12" cy="12" r="3.6"/><circle cx="18.4" cy="5.6" r="1.1"/></svg>
                    </span>
                    <input
                      type="text"
                      name="instagram"
                      value={editForm.instagram || ''}
                      onChange={handleInputChange}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-10 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                      placeholder="Instagram username or link"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.6 0 0 .6 0 1.326v21.348C0 23.4.6 24 1.326 24h11.495v-9.294H9.691v-3.622h3.13V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.4 24 24 23.4 24 22.674V1.326C24 .6 23.4 0 22.675 0"/></svg>
                    </span>
                    <input
                      type="text"
                      name="facebook"
                      value={editForm.facebook || ''}
                      onChange={handleInputChange}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-10 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                      placeholder="Facebook username or link"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500">
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a2.994 2.994 0 0 0-2.112-2.112C19.163 3.5 12 3.5 12 3.5s-7.163 0-9.386.574A2.994 2.994 0 0 0 .502 6.186C0 8.409 0 12 0 12s0 3.591.502 5.814a2.994 2.994 0 0 0 2.112 2.112C4.837 20.5 12 20.5 12 20.5s7.163 0 9.386-.574a2.994 2.994 0 0 0 2.112-2.112C24 15.591 24 12 24 12s0-3.591-.502-5.814zM9.545 15.568V8.432l6.545 3.568-6.545 3.568z"/></svg>
                    </span>
                    <input
                      type="text"
                      name="youtube"
                      value={editForm.youtube || ''}
                      onChange={handleInputChange}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-10 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                      placeholder="YouTube channel or link"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-700">
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.327-.025-3.037-1.849-3.037-1.851 0-2.132 1.445-2.132 2.939v5.667H9.358V9h3.414v1.561h.049c.476-.899 1.637-1.849 3.369-1.849 3.602 0 4.267 2.369 4.267 5.455v6.285zM5.337 7.433c-1.144 0-2.069-.926-2.069-2.068 0-1.143.925-2.069 2.069-2.069 1.143 0 2.068.926 2.068 2.069 0 1.142-.925 2.068-2.068 2.068zm1.777 13.019H3.56V9h3.554v11.452zM22.225 0H1.771C.792 0 0 .771 0 1.723v20.549C0 23.229.792 24 1.771 24h20.451C23.2 24 24 23.229 24 22.271V1.723C24 .771 23.2 0 22.225 0z"/></svg>
                    </span>
                    <input
                      type="text"
                      name="linkedin"
                      value={editForm.linkedin || ''}
                      onChange={handleInputChange}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-10 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                      placeholder="LinkedIn username or link"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black dark:text-white">
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.25c-5.376 0-9.75 4.374-9.75 9.75s4.374 9.75 9.75 9.75 9.75-4.374 9.75-9.75-4.374-9.75-9.75-9.75zm0 18c-4.556 0-8.25-3.694-8.25-8.25s3.694-8.25 8.25-8.25 8.25 3.694 8.25 8.25-3.694 8.25-8.25 8.25zm2.25-8.25c0-1.242-1.008-2.25-2.25-2.25s-2.25 1.008-2.25 2.25 1.008 2.25 2.25 2.25 2.25-1.008 2.25-2.25zm-2.25 3.75c-2.071 0-3.75-1.679-3.75-3.75s1.679-3.75 3.75-3.75 3.75 1.679 3.75 3.75-1.679 3.75-3.75 3.75z"/></svg>
                    </span>
                    <input
                      type="text"
                      name="tiktok"
                      value={editForm.tiktok || ''}
                      onChange={handleInputChange}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-10 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                      placeholder="TikTok username or link"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500">
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-6.627-5.373-12-12-12zm3.707 17.293c-.391.391-1.023.391-1.414 0l-2.293-2.293-2.293 2.293c-.391.391-1.023.391-1.414 0s-.391-1.023 0-1.414l2.293-2.293-2.293-2.293c-.391-.391-.391-1.023 0-1.414s1.023-.391 1.414 0l2.293 2.293 2.293-2.293c.391-.391 1.023-.391 1.414 0s.391 1.023 0 1.414l-2.293 2.293 2.293 2.293c.391.391.391 1.023 0 1.414z"/></svg>
                    </span>
                    <input
                      type="text"
                      name="spotify"
                      value={editForm.spotify || ''}
                      onChange={handleInputChange}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-10 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                      placeholder="Spotify artist link or ID"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm font-medium">Personal Bio</label>
                <textarea
                  name="bio"
                  value={editForm.bio || ''}
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
                  value={editForm.talentDescription || ''}
                  onChange={handleInputChange}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors h-32 resize-none custom-scrollbar"
                  placeholder="Describe your musical talents, specialties, and what makes you unique..."
                ></textarea>
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm font-medium">Interests</label>
                <textarea
                  name="interests"
                  value={editForm.interests || ''}
                  onChange={handleInputChange}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors h-24 resize-none custom-scrollbar"
                  placeholder="List your musical interests, genres you enjoy, or any other relevant interests..."
                ></textarea>
                <p className="text-sm text-gray-400 mt-1">Separate multiple interests with commas</p>
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm font-medium">Experience</label>
                <textarea
                  name="experience"
                  value={editForm.experience || ''}
                  onChange={handleInputChange}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors h-24 resize-none custom-scrollbar"
                  placeholder="Describe your musical experience, performances, collaborations, or any relevant background..."
                ></textarea>
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm font-medium">Goals</label>
                <textarea
                  name="goals"
                  value={editForm.goals || ''}
                  onChange={handleInputChange}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors h-24 resize-none custom-scrollbar"
                  placeholder="What are your musical goals? What do you hope to achieve through SoundAlchemy?"
                ></textarea>
              </div>

              <div className="sticky bottom-0 bg-dark-800 -mx-6 -mb-6 px-6 py-4 border-t border-dark-700 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={onCancel}
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
    </AnimatePresence>
  );
};

export default EditProfileModal; 