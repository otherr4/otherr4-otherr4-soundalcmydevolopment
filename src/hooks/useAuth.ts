import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '@/firebase/config';
import { UserProfile } from '@/services/authService';

interface AuthState {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userProfile: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, get their profile from the database
        const userRef = ref(db, `users/${user.uid}`);
        const unsubscribeProfile = onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setAuthState({
              user,
              userProfile: snapshot.val() as UserProfile,
              loading: false,
              error: null
            });
          } else {
            setAuthState({
              user,
              userProfile: null,
              loading: false,
              error: 'User profile not found'
            });
          }
        }, (error) => {
          setAuthState({
            user,
            userProfile: null,
            loading: false,
            error: error.message
          });
        });

        return () => unsubscribeProfile();
      } else {
        // User is signed out
        setAuthState({
          user: null,
          userProfile: null,
          loading: false,
          error: null
        });
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const isVerified = authState.userProfile?.isVerified ?? false;
  const verificationStatus = authState.userProfile?.verificationStatus ?? 'pending';

  return {
    ...authState,
    isVerified,
    verificationStatus,
    isAdmin: authState.userProfile?.email?.endsWith('@soundalchemy.com') ?? false
  };
}; 