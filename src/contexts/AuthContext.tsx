import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, rtdb } from '../config/firebase';
import { logUserActivity } from '../utils/logUserActivity';
import { ref as dbRef, onDisconnect, set, serverTimestamp, onValue } from "firebase/database";

interface AuthContextType {
  user: User | null;
  userProfile: any | null; // Firestore user data
  isAdmin: boolean;
  isVerified: boolean;
  loading: boolean;
  register: (email: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  adminLogin: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  getUserProfile: (userId: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

function setupPresence(userId: string) {
  const userStatusRef = dbRef(rtdb, '/status/' + userId);
  const connectedRef = dbRef(rtdb, '.info/connected');
  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      onDisconnect(userStatusRef).set({
        state: 'offline',
        last_changed: serverTimestamp(),
      }).then(() => {
        set(userStatusRef, {
          state: 'online',
          last_changed: serverTimestamp(),
        });
      });
    }
  });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null); // Firestore user data
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (unsubscribeProfile) unsubscribeProfile();
      if (currentUser) {
        try {
          // Real-time Firestore user profile sync
          const { onSnapshot, doc: docFS } = await import('firebase/firestore');
          unsubscribeProfile = onSnapshot(docFS(db, 'users', currentUser.uid), (userDoc) => {
            if (userDoc.exists()) {
              setUserProfile({ ...userDoc.data(), uid: currentUser.uid });
              setIsAdmin(userDoc.data().role === 'admin');
            } else {
              setUserProfile(null);
              setIsAdmin(false);
            }
          });
        } catch (error) {
          console.error('Error checking admin status:', error);
          setUserProfile(null);
          setIsAdmin(false);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  useEffect(() => {
    if (user?.uid) {
      setupPresence(user.uid);
    }
  }, [user?.uid]);

  const register = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const adminLogin = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Check if the user is an admin
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'admin') {
      await signOut(auth);
      throw new Error('Unauthorized access: Not an admin account');
    }
    
    return userCredential.user;
  };

  const logout = async () => {
    if (user) {
      await logUserActivity(user.uid, 'logout');
    }
    return signOut(auth);
  };

  const getUserProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    isAdmin,
    isVerified: !!userProfile?.isVerified,
    loading,
    register,
    login,
    adminLogin,
    logout,
    getUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};