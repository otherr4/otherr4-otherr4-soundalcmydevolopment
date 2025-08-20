import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD--lieggygBJNj-GSrmIwtCY0vtEmopns",
  authDomain: "soundalchemy-577b4.firebaseapp.com",
  databaseURL: "https://soundalchemy-577b4-default-rtdb.firebaseio.com",
  projectId: "soundalchemy-577b4",
  storageBucket: "soundalchemy-577b4.appspot.com",
  messagingSenderId: "772996673219",
  appId: "1:772996673219:web:c530d8e2f9f97f8f687c76",
  measurementId: "G-CGF7DJNT79"
};



// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const realtimeDb = getDatabase(app);

// Create a reference to the users profile photos storage
const userProfilePhotosRef = (userId: string) => 
  `public/usersproflesphotos/${userId}`;

// Function to get the full storage path
const getStoragePath = (userId: string, fileName: string) => 
  `${userProfilePhotosRef(userId)}/${fileName}`;

// Function to handle storage errors
const handleStorageError = (error: any) => {
  console.error('Storage Error:', error);
  if (error.code === 'storage/unauthorized') {
    throw new Error('You are not authorized to perform this action');
  } else if (error.code === 'storage/canceled') {
    throw new Error('Upload was canceled');
  } else if (error.code === 'storage/unknown') {
    throw new Error('An unknown error occurred');
  } else {
    throw error;
  }
};

// Database schema
export const collections = {
  users: 'users',
  portfolios: 'portfolios',
  analytics: 'analytics',
  learning: 'learning',
  collaborations: 'collaborations',
  courses: 'courses',
  certificates: 'certificates',
  practice_sessions: 'practice_sessions',
  music_events: 'music_events',
  skill_progress: 'skill_progress',
  community_feed: 'community_feed'
};

// Collection schemas
export const schemas = {
  users: {
    uid: 'string',
    fullName: 'string',
    email: 'string',
    contactNumber: 'string',
    country: 'string',
    instrumentType: 'string',
    singingType: 'string',
    musicCulture: 'string',
    bio: 'string',
    profileImagePath: 'string',
    isVerified: 'boolean',
    verificationStatus: 'string',
    role: 'string',
    welcomeMessage: 'string',
    createdAt: 'timestamp',
    lastUpdated: 'timestamp'
  },
  portfolios: {
    userId: 'string',
    tracks: [{
      id: 'string',
      title: 'string',
      genre: 'string',
      duration: 'string',
      uploadDate: 'timestamp',
      plays: 'number',
      filePath: 'string',
      coverImagePath: 'string',
      description: 'string',
      tags: ['string']
    }]
  },
  analytics: {
    userId: 'string',
    totalPlays: 'number',
    followers: 'number',
    collaborations: 'number',
    monthlyGrowth: 'number',
    topTracks: [{
      trackId: 'string',
      plays: 'number'
    }],
    audienceDemographics: {
      countries: ['string'],
      ageGroups: ['string'],
      interests: ['string']
    },
    lastUpdated: 'timestamp'
  },
  learning: {
    userId: 'string',
    completedCourses: 'number',
    currentCourses: [{
      id: 'string',
      title: 'string',
      progress: 'number',
      startDate: 'timestamp',
      lastAccessed: 'timestamp'
    }],
    certificates: [{
      id: 'string',
      title: 'string',
      issueDate: 'timestamp',
      issuer: 'string',
      credentialUrl: 'string'
    }],
    learningGoals: [{
      id: 'string',
      title: 'string',
      targetDate: 'timestamp',
      progress: 'number'
    }]
  },
  collaborations: {
    userId: 'string',
    opportunities: [{
      id: 'string',
      title: 'string',
      description: 'string',
      genre: 'string',
      deadline: 'timestamp',
      status: 'string',
      collaborators: [{
        userId: 'string',
        role: 'string',
        status: 'string'
      }],
      requirements: ['string'],
      expectedOutcomes: ['string']
    }]
  },
  courses: {
    id: 'string',
    title: 'string',
    description: 'string',
    instructor: 'string',
    level: 'string',
    duration: 'string',
    topics: ['string'],
    price: 'number',
    rating: 'number',
    enrolledStudents: 'number',
    createdAt: 'timestamp',
    updatedAt: 'timestamp'
  },
  certificates: {
    id: 'string',
    userId: 'string',
    courseId: 'string',
    title: 'string',
    issueDate: 'timestamp',
    issuer: 'string',
    credentialUrl: 'string',
    verificationCode: 'string'
  },
  practice_sessions: {
    userId: 'string',
    sessions: [{
      id: 'string',
      date: 'timestamp',
      duration: 'number',
      focus: 'string',
      notes: 'string',
      mood: 'string',
      achievements: ['string'],
      goals: {
        completed: ['string'],
        next: ['string']
      }
    }]
  },
  music_events: {
    userId: 'string',
    events: [{
      id: 'string',
      title: 'string',
      type: 'string',
      date: 'timestamp',
      location: 'string',
      description: 'string',
      status: 'string',
      participants: ['string'],
      media: {
        type: 'string',
        url: 'string'
      },
      notes: 'string'
    }]
  },
  skill_progress: {
    userId: 'string',
    skills: [{
      skill: 'string',
      level: 'number',
      lastPracticed: 'timestamp',
      goals: {
        shortTerm: 'string',
        longTerm: 'string'
      },
      achievements: ['string'],
      practiceHistory: [{
        date: 'timestamp',
        duration: 'number',
        focus: 'string'
      }],
      resources: [{
        type: 'string',
        title: 'string',
        url: 'string'
      }]
    }]
  },
  community_feed: {
    userId: 'string',
    posts: [{
      id: 'string',
      userId: 'string',
      userName: 'string',
      userImage: 'string',
      content: 'string',
      timestamp: 'timestamp',
      media: {
        type: 'string',
        url: 'string'
      },
      likes: 'number',
      comments: 'number',
      shares: 'number',
      tags: ['string'],
      visibility: 'string'
    }]
  }
};

export { 
  app, 
  auth, 
  db, 
  realtimeDb, 
  storage, 
  analytics, 
  userProfilePhotosRef, 
  getStoragePath,
  handleStorageError 
};

export const rtdb = getDatabase(app);