import { auth, realtimeDb } from '../config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, set, serverTimestamp, get } from 'firebase/database';
import { toast } from 'sonner';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  country?: string;
  instrumentType?: string;
  singingType?: string;
  musicCulture?: string;
  aboutMe?: string;
  interests?: string[];
  isVerified: boolean;
  verificationStatus: string;
  createdAt: number;
  updatedAt: number;
  role: string;
  settings: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    twoFactorAuth: boolean;
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
  };
  socialLinks?: {
    website?: string;
    youtube?: string;
    soundcloud?: string;
    spotify?: string;
    instagram?: string;
    twitter?: string;
  };
  stats: {
    followers: number;
    following: number;
    collaborations: number;
    projects: number;
    views: number;
  };
  profileImage?: string;
  profileImagePath?: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phoneNumber: string;
  country: string;
  instrumentType: string;
  singingType?: string;
  musicCulture: string;
  aboutMe: string;
  interests: string[];
  termsAccepted: boolean;
}

class AuthService {
  async registerWithEmail(userData: RegistrationData): Promise<UserProfile> {
    try {
      // Validate terms acceptance
      if (!userData.termsAccepted) {
        throw new Error('You must accept the terms and conditions');
      }

      // Check if email already exists
      const emailSnapshot = await get(ref(realtimeDb, 'users'));
      const users = emailSnapshot.val();
      if (users) {
        const emailExists = Object.values(users).some((user: any) => user.email === userData.email);
        if (emailExists) {
          throw new Error('Email already registered');
        }
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Create user profile in Realtime Database
      const userProfile: UserProfile = {
        uid: userCredential.user.uid,
        email: userData.email,
        fullName: userData.fullName,
        phoneNumber: userData.phoneNumber,
        country: userData.country,
        instrumentType: userData.instrumentType,
        singingType: userData.singingType,
        musicCulture: userData.musicCulture,
        aboutMe: userData.aboutMe,
        interests: userData.interests,
        isVerified: false,
        verificationStatus: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        role: 'user',
        settings: {
          emailNotifications: true,
          pushNotifications: true,
          twoFactorAuth: false,
          theme: 'system',
          language: 'en'
        },
        privacy: {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false,
          showLocation: true
        },
        stats: {
          followers: 0,
          following: 0,
          collaborations: 0,
          projects: 0,
          views: 0
        }
      };

      // Save to Firebase Realtime Database
      const userRef = ref(realtimeDb, `users/${userCredential.user.uid}`);
      await set(userRef, {
        ...userProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Save to verification queue
      const verificationRef = ref(realtimeDb, `verificationQueue/${userCredential.user.uid}`);
      await set(verificationRef, {
        userId: userCredential.user.uid,
        email: userData.email,
        fullName: userData.fullName,
        instrumentType: userData.instrumentType,
        musicCulture: userData.musicCulture,
        submittedAt: serverTimestamp(),
        status: 'pending',
        termsAccepted: true,
        termsAcceptedAt: serverTimestamp()
      });

      // Save login history
      const loginHistoryRef = ref(realtimeDb, `loginHistory/${userCredential.user.uid}/${Date.now()}`);
      await set(loginHistoryRef, {
        timestamp: serverTimestamp(),
        type: 'registration',
        method: 'email',
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`
        },
        location: {
          country: userData.country
        }
      });

      // Create user preferences
      const preferencesRef = ref(realtimeDb, `userPreferences/${userCredential.user.uid}`);
      await set(preferencesRef, {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          collaboration: true,
          messages: true,
          updates: true
        },
        visibility: {
          profile: 'public',
          email: false,
          phone: false,
          location: true
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return userProfile;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message);
    }
  }

  async registerWithGoogle(): Promise<UserProfile> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!result.user.email) {
        throw new Error('No email found in Google account');
      }

      // Check if user already exists
      const userRef = ref(realtimeDb, `users/${result.user.uid}`);
      const userSnapshot = await get(userRef);

      if (userSnapshot.exists()) {
        // Update last login
        const loginHistoryRef = ref(realtimeDb, `loginHistory/${result.user.uid}/${Date.now()}`);
        await set(loginHistoryRef, {
          timestamp: serverTimestamp(),
          type: 'login',
          method: 'google',
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`
          }
        });

        return userSnapshot.val();
      }

      // Create new user profile
      const userProfile: UserProfile = {
        uid: result.user.uid,
        email: result.user.email,
        fullName: result.user.displayName || '',
        phoneNumber: result.user.phoneNumber || '',
        isVerified: false, // Always false for new users, regardless of Google auth
        verificationStatus: 'pending', // Always pending for new users
        createdAt: Date.now(),
        updatedAt: Date.now(),
        role: 'user',
        settings: {
          emailNotifications: true,
          pushNotifications: true,
          twoFactorAuth: false,
          theme: 'system',
          language: 'en'
        },
        privacy: {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false,
          showLocation: true
        },
        stats: {
          followers: 0,
          following: 0,
          collaborations: 0,
          projects: 0,
          views: 0
        },
        ...(result.user.photoURL ? { profileImage: result.user.photoURL, profileImagePath: result.user.photoURL } : {})
      };

      // Save to Firebase Realtime Database
      await set(userRef, {
        ...userProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create user preferences
      const preferencesRef = ref(realtimeDb, `userPreferences/${result.user.uid}`);
      await set(preferencesRef, {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          collaboration: true,
          messages: true,
          updates: true
        },
        visibility: {
          profile: 'public',
          email: false,
          phone: false,
          location: true
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Save login history
      const loginHistoryRef = ref(realtimeDb, `loginHistory/${result.user.uid}/${Date.now()}`);
      await set(loginHistoryRef, {
        timestamp: serverTimestamp(),
        type: 'registration',
        method: 'google',
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`
        }
      });

      return userProfile;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw new Error(error.message);
    }
  }

  async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
    try {
      const updates = {
        ...profileData,
        updatedAt: serverTimestamp()
      };

      await set(ref(realtimeDb, `users/${userId}`), updates);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Profile update error:', error);
      throw new Error(error.message);
    }
  }

  async checkVerificationStatus(userId: string): Promise<string> {
    try {
      const snapshot = await get(ref(realtimeDb, `users/${userId}`));
      const userData = snapshot.val();
      return userData?.verificationStatus || 'pending';
    } catch (error: any) {
      console.error('Verification status check error:', error);
      throw new Error(error.message);
    }
  }
}

export default new AuthService(); 