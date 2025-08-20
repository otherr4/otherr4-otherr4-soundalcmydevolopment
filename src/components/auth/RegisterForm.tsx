import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  RegistrationFormData, 
  MUSIC_CULTURES, 
  INTERESTS 
} from '../../types/user';
import LoadingSpinner from '../common/LoadingSpinner';

interface FormErrors {
  [key: string]: string;
}

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FormErrors | null>(null);
  const [formData, setFormData] = useState<RegistrationFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    country: '',
    instrumentType: '',
    instrumentDetails: '',
    singingType: '',
    musicCulture: '',
    aboutMe: '',
    interests: [],
    experience: '',
    goals: '',
    termsAccepted: false
  });

  // Add password requirements state
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  // Update password requirements when password changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setPasswordRequirements({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(value)
    });
    handleChange(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleInterestChange = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else {
      if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
      if (!/[A-Z]/.test(formData.password)) {
        errors.password = 'Password must contain at least one uppercase letter';
      }
      if (!/[a-z]/.test(formData.password)) {
        errors.password = 'Password must contain at least one lowercase letter';
      }
      if (!/[0-9]/.test(formData.password)) {
        errors.password = 'Password must contain at least one number';
      }
      if (!/[^A-Za-z0-9]/.test(formData.password)) {
        errors.password = 'Password must contain at least one special character';
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Full name validation
    if (!formData.fullName) {
      errors.fullName = 'Full name is required';
    }

    // Phone number validation
    if (!formData.phoneNumber) {
      errors.phoneNumber = 'Phone number is required';
    }

    // Country validation
    if (!formData.country) {
      errors.country = 'Country is required';
    }

    // Instrument type validation
    if (!formData.instrumentType) {
      errors.instrumentType = 'Instrument type is required';
    }

    // Music culture validation
    if (!formData.musicCulture) {
      errors.musicCulture = 'Music culture is required';
    }

    // About me validation
    if (!formData.aboutMe) {
      errors.aboutMe = 'About me is required';
    } else if (formData.aboutMe.length < 50) {
      errors.aboutMe = 'About me must be at least 50 characters';
    }

    // Interests validation
    if (!formData.interests || formData.interests.length === 0) {
      errors.interests = 'Please select at least one interest';
    }

    // Experience validation
    if (!formData.experience) {
      errors.experience = 'Musical experience is required';
    }

    // Goals validation
    if (!formData.goals) {
      errors.goals = 'Musical goals are required';
    }

    // Terms validation
    if (!formData.termsAccepted) {
      errors.termsAccepted = 'You must accept the terms and conditions';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setError(validationErrors);
      return;
    }

    try {
      setLoading(true);
      // Ensure all required fields are present and properly formatted
      const registrationData = {
        ...formData,
        // Ensure interests is an array
        interests: Array.isArray(formData.interests) ? formData.interests : [],
        // Ensure aboutMe is at least 50 characters
        aboutMe: formData.aboutMe.trim(),
        // Ensure experience and goals are provided
        experience: formData.experience.trim(),
        goals: formData.goals.trim(),
        // Ensure musicCulture is provided
        musicCulture: formData.musicCulture,
        // Ensure termsAccepted is true
        termsAccepted: true,
        // Ensure phone number is properly formatted
        phoneNumber: formData.phoneNumber.replace(/\D/g, ''),
        // Ensure country is provided
        country: formData.country.trim(),
        // Ensure instrument type is provided
        instrumentType: formData.instrumentType,
        // Ensure password meets requirements
        password: formData.password,
        confirmPassword: formData.confirmPassword
      };

      // Log the registration data for debugging
      console.log('Submitting registration data:', registrationData);

      // Call the register function
      await register(registrationData);
      
      // If registration is successful, navigate to the dashboard
      window.location.href = '/profile';
    } catch (error: any) {
      console.error('Registration error:', error);
      // Set error message from the error object
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors.reduce((acc: any, err: any) => {
          acc[err.field] = err.message;
          return acc;
        }, {});
        setError(validationErrors);
        // Log each validation error
        Object.entries(validationErrors).forEach(([field, message]) => {
          console.log(`Validation error for ${field}:`, message);
        });
      } else {
        setError({ general: error.message || 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-8 py-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Create Your Account</h2>
          
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 whitespace-pre-line">{Object.values(error).join('\n')}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Create a password"
                  />
                  <div className="mt-2 text-sm text-gray-600">
                    <p className="font-medium mb-1">Password Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li className={passwordRequirements.length ? 'text-green-600' : 'text-gray-600'}>
                        At least 8 characters
                      </li>
                      <li className={passwordRequirements.uppercase ? 'text-green-600' : 'text-gray-600'}>
                        At least one uppercase letter
                      </li>
                      <li className={passwordRequirements.lowercase ? 'text-green-600' : 'text-gray-600'}>
                        At least one lowercase letter
                      </li>
                      <li className={passwordRequirements.number ? 'text-green-600' : 'text-gray-600'}>
                        At least one number
                      </li>
                      <li className={passwordRequirements.special ? 'text-green-600' : 'text-gray-600'}>
                        At least one special character
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Confirm your password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your country"
                  />
                </div>
              </div>
            </div>

            {/* Musical Background Section */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Musical Background</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Instrument</label>
                  <select
                    name="instrumentType"
                    value={formData.instrumentType}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select an instrument</option>
                    {/* Assuming INSTRUMENT_TYPE_GROUPS is defined elsewhere or will be added */}
                    {/* For now, using a placeholder or assuming it's available */}
                    {/* Example: */}
                    {/* {INSTRUMENT_TYPE_GROUPS.map(group => ( */}
                    {/*   <optgroup key={group.label} label={group.label}> */}
                    {/*     {group.options.map(instrument => ( */}
                    {/*       <option key={instrument.value} value={instrument.value}> */}
                    {/*         {instrument.label} */}
                    {/*       </option> */}
                    {/*     ))} */}
                    {/*   </optgroup> */}
                    {/* ))} */}
                  </select>
                </div>

                {formData.instrumentType === 'other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instrument Details</label>
                    <input
                      type="text"
                      name="instrumentDetails"
                      value={formData.instrumentDetails}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Specify your instrument"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Singing Type (if applicable)</label>
                  <select
                    name="singingType"
                    value={formData.singingType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select singing type</option>
                    {/* Assuming SINGING_TYPE_GROUPS is defined elsewhere or will be added */}
                    {/* For now, using a placeholder or assuming it's available */}
                    {/* Example: */}
                    {/* {SINGING_TYPE_GROUPS.map(group => ( */}
                    {/*   <optgroup key={group.label} label={group.label}> */}
                    {/*     {group.options.map(type => ( */}
                    {/*       <option key={type.value} value={type.value}> */}
                    {/*         {type.label} */}
                    {/*       </option> */}
                    {/*     ))} */}
                    {/*   </optgroup> */}
                    {/* ))} */}
                  </select>
                </div>

                <div>
                  <label htmlFor="musicCulture" className="block text-sm font-medium text-gray-700">
                    Music Culture *
                  </label>
                  <select
                    id="musicCulture"
                    name="musicCulture"
                    value={formData.musicCulture}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      error?.musicCulture ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    required
                  >
                    <option value="">Select a music culture</option>
                    {MUSIC_CULTURES.map(culture => (
                      <option key={culture.value} value={culture.value}>
                        {culture.label}
                      </option>
                    ))}
                  </select>
                  {error?.musicCulture && (
                    <p className="mt-1 text-sm text-red-600">{error.musicCulture}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">Please select your primary music culture</p>
                </div>
              </div>

              <div className="mt-6">
                <label htmlFor="aboutMe" className="block text-sm font-medium text-gray-700">
                  About Me *
                </label>
                <textarea
                  id="aboutMe"
                  name="aboutMe"
                  value={formData.aboutMe}
                  onChange={handleChange}
                  rows={4}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    error?.aboutMe ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  required
                  minLength={50}
                  placeholder="Tell us about yourself, your musical journey, and what brings you to SoundAlchemy..."
                />
                <div className="mt-1 flex justify-between">
                  <p className="text-sm text-gray-500">Minimum 50 characters required</p>
                  <p className={`text-sm ${formData.aboutMe.length < 50 ? 'text-red-600' : 'text-green-600'}`}>
                    {formData.aboutMe.length}/50 characters
                  </p>
                </div>
                {error?.aboutMe && (
                  <p className="mt-1 text-sm text-red-600">{error.aboutMe}</p>
                )}
              </div>

              <div className="mt-6">
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700">
                  Musical Experience *
                </label>
                <textarea
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows={3}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    error?.experience ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  required
                  placeholder="Tell us about your musical journey, training, and experience..."
                />
                {error?.experience && (
                  <p className="mt-1 text-sm text-red-600">{error.experience}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">Share your musical background, training, and experience</p>
              </div>

              <div className="mt-6">
                <label htmlFor="goals" className="block text-sm font-medium text-gray-700">
                  Musical Goals *
                </label>
                <textarea
                  id="goals"
                  name="goals"
                  value={formData.goals}
                  onChange={handleChange}
                  rows={3}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    error?.goals ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  required
                  placeholder="What are your musical aspirations and goals?"
                />
                {error?.goals && (
                  <p className="mt-1 text-sm text-red-600">{error.goals}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">Share your musical aspirations and what you hope to achieve</p>
              </div>
            </div>

            {/* Interests Section */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Interests</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {INTERESTS.map(interest => (
                  <label key={interest.value} className="inline-flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.interests.includes(interest.value)}
                      onChange={() => handleInterestChange(interest.value)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{interest.label}</span>
                  </label>
                ))}
              </div>
              {error?.interests && (
                <p className="mt-2 text-sm text-red-600">{error.interests}</p>
              )}
              <p className="mt-2 text-sm text-gray-500">Select at least one interest</p>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                    required
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <label className="text-sm text-gray-700">
                    I agree to the{' '}
                    <a href="/terms" className="text-indigo-600 hover:text-indigo-500">
                      Terms and Conditions
                    </a>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="small" />
                    <span className="ml-2">Creating Account...</span>
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm; 