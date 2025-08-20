import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { 
  Collaboration, 
  CollaborationApplication, 
  CollaborationFilter, 
  CollaborationSearchResult,
  CollaborationTemplate,
  CollaborationStats,
  CostItem
} from '../types/collaboration';

// Default collaboration templates
export const defaultTemplates: CollaborationTemplate[] = [
  {
    id: 'cover-song',
    name: 'Cover Song Collaboration',
    description: 'Create a cover version of a popular song with multiple musicians',
    category: 'Cover',
    isPopular: true,
    usageCount: 0,
    steps: [
      {
        id: 'basic-info',
        title: 'Basic Information',
        description: 'Set up the basic details of your collaboration',
        order: 1,
        isRequired: true,
        isCompleted: false,
        fields: [
          {
            id: 'title',
            label: 'Collaboration Title',
            type: 'text',
            required: true,
            placeholder: 'e.g., "We Are The World" Cover Collaboration',
            validation: { minLength: 5, maxLength: 100 }
          },
          {
            id: 'description',
            label: 'Description',
            type: 'textarea',
            required: true,
            placeholder: 'Describe your collaboration idea, goals, and vision...',
            validation: { minLength: 20, maxLength: 1000 }
          },
          {
            id: 'genre',
            label: 'Genre',
            type: 'select',
            required: true,
            options: ['Pop', 'Rock', 'Jazz', 'Classical', 'Hip Hop', 'Country', 'Electronic', 'Folk', 'R&B', 'Blues', 'Reggae', 'World Music', 'Other']
          }
        ]
      },
      {
        id: 'instruments',
        title: 'Required Instruments',
        description: 'Specify which instruments you need for this collaboration',
        order: 2,
        isRequired: true,
        isCompleted: false,
        fields: [
          {
            id: 'instruments',
            label: 'Instruments Needed',
            type: 'multiselect',
            required: true,
            options: ['Vocals', 'Guitar', 'Piano', 'Drums', 'Bass', 'Violin', 'Saxophone', 'Trumpet', 'Flute', 'Clarinet', 'Cello', 'Viola', 'Harp', 'Accordion', 'Harmonica', 'Ukulele', 'Banjo', 'Mandolin', 'Other']
          },
          {
            id: 'maxParticipants',
            label: 'Maximum Participants',
            type: 'number',
            required: false,
            placeholder: 'Leave empty for unlimited',
            validation: { min: 1, max: 50 }
          }
        ]
      },
      {
        id: 'timeline',
        title: 'Timeline & Milestones',
        description: 'Set up the timeline and key milestones for your collaboration',
        order: 3,
        isRequired: true,
        isCompleted: false,
        fields: [
          {
            id: 'startDate',
            label: 'Start Date',
            type: 'date',
            required: true
          },
          {
            id: 'endDate',
            label: 'End Date (Optional)',
            type: 'date',
            required: false
          },
          {
            id: 'requirements',
            label: 'Requirements & Expectations',
            type: 'textarea',
            required: false,
            placeholder: 'List any specific requirements, skill levels, or expectations for participants...'
          }
        ]
      },
      {
        id: 'attachments',
        title: 'Reference Materials',
        description: 'Upload reference materials like original songs, sheet music, or inspiration',
        order: 4,
        isRequired: false,
        isCompleted: false,
        fields: [
          {
            id: 'attachments',
            label: 'Upload Files',
            type: 'file',
            required: false,
            placeholder: 'Upload audio files, sheet music, or reference materials'
          },
          {
            id: 'referenceLinks',
            label: 'Reference Links',
            type: 'text',
            required: false,
            placeholder: 'Add YouTube, Facebook, Spotify, or other reference links (one per line)'
          }
        ]
      },
      {
        id: 'settings',
        title: 'Collaboration Settings',
        description: 'Configure privacy, compensation, and other settings',
        order: 5,
        isRequired: true,
        isCompleted: false,
        fields: [
          {
            id: 'privacy',
            label: 'Privacy Setting',
            type: 'select',
            required: true,
            options: ['Public', 'Private', 'Invite Only']
          },
          {
            id: 'compensation',
            label: 'Compensation Type',
            type: 'select',
            required: true,
            options: ['Free', 'Paid', 'Revenue Share', 'Exposure']
          },
          {
            id: 'location',
            label: 'Location Type',
            type: 'select',
            required: true,
            options: ['Online', 'Offline', 'Hybrid']
          }
        ]
      }
    ]
  },
  {
    id: 'original-composition',
    name: 'Original Composition',
    description: 'Create an original piece of music from scratch',
    category: 'Original',
    isPopular: true,
    usageCount: 0,
    steps: [
      {
        id: 'basic-info',
        title: 'Basic Information',
        description: 'Set up the basic details of your original composition',
        order: 1,
        isRequired: true,
        isCompleted: false,
        fields: [
          {
            id: 'title',
            label: 'Composition Title',
            type: 'text',
            required: true,
            placeholder: 'e.g., "Symphony of Dreams" Original Composition',
            validation: { minLength: 5, maxLength: 100 }
          },
          {
            id: 'description',
            label: 'Concept & Vision',
            type: 'textarea',
            required: true,
            placeholder: 'Describe your musical concept, inspiration, and artistic vision...',
            validation: { minLength: 20, maxLength: 1000 }
          },
          {
            id: 'genre',
            label: 'Genre',
            type: 'select',
            required: true,
            options: ['Classical', 'Jazz', 'Contemporary', 'Fusion', 'Experimental', 'Film Score', 'Orchestral', 'Chamber Music', 'Solo', 'Other']
          }
        ]
      },
      {
        id: 'instruments',
        title: 'Required Instruments',
        description: 'Specify which instruments you need for this composition',
        order: 2,
        isRequired: true,
        isCompleted: false,
        fields: [
          {
            id: 'instruments',
            label: 'Instruments Needed',
            type: 'multiselect',
            required: true,
            options: ['Vocals', 'Guitar', 'Piano', 'Drums', 'Bass', 'Violin', 'Saxophone', 'Trumpet', 'Flute', 'Clarinet', 'Cello', 'Viola', 'Harp', 'Accordion', 'Harmonica', 'Ukulele', 'Banjo', 'Mandolin', 'Other']
          }
        ]
      },
      {
        id: 'structure',
        title: 'Musical Structure',
        description: 'Define the structure and sections of your composition',
        order: 3,
        isRequired: false,
        isCompleted: false,
        fields: [
          {
            id: 'structure',
            label: 'Musical Structure',
            type: 'textarea',
            required: false,
            placeholder: 'Describe the structure (e.g., Intro, Verse, Chorus, Bridge, Outro) or leave blank for free-form...'
          }
        ]
      },
      {
        id: 'timeline',
        title: 'Timeline & Milestones',
        description: 'Set up the timeline and key milestones for your composition',
        order: 4,
        isRequired: true,
        isCompleted: false,
        fields: [
          {
            id: 'startDate',
            label: 'Start Date',
            type: 'date',
            required: true
          },
          {
            id: 'endDate',
            label: 'End Date (Optional)',
            type: 'date',
            required: false
          }
        ]
      },
      {
        id: 'settings',
        title: 'Collaboration Settings',
        description: 'Configure privacy, compensation, and other settings',
        order: 5,
        isRequired: true,
        isCompleted: false,
        fields: [
          {
            id: 'privacy',
            label: 'Privacy Setting',
            type: 'select',
            required: true,
            options: ['Public', 'Private', 'Invite Only']
          },
          {
            id: 'compensation',
            label: 'Compensation Type',
            type: 'select',
            required: true,
            options: ['Free', 'Paid', 'Revenue Share', 'Exposure']
          },
          {
            id: 'location',
            label: 'Location Type',
            type: 'select',
            required: true,
            options: ['Online', 'Offline', 'Hybrid']
          }
        ]
      }
    ]
  },
  {
    id: 'jam-session',
    name: 'Jam Session',
    description: 'Organize an impromptu or structured jam session',
    category: 'Jam',
    isPopular: true,
    usageCount: 0,
    steps: [
      {
        id: 'basic-info',
        title: 'Basic Information',
        description: 'Set up the basic details of your jam session',
        order: 1,
        isRequired: true,
        isCompleted: false,
        fields: [
          {
            id: 'title',
            label: 'Jam Session Title',
            type: 'text',
            required: true,
            placeholder: 'e.g., "Jazz Fusion Jam Session"',
            validation: { minLength: 5, maxLength: 100 }
          },
          {
            id: 'description',
            label: 'Session Description',
            type: 'textarea',
            required: true,
            placeholder: 'Describe the jam session style, vibe, and what to expect...',
            validation: { minLength: 20, maxLength: 1000 }
          },
          {
            id: 'genre',
            label: 'Genre',
            type: 'select',
            required: true,
            options: ['Jazz', 'Blues', 'Rock', 'Funk', 'Fusion', 'Latin', 'World Music', 'Electronic', 'Acoustic', 'Experimental', 'Other']
          }
        ]
      },
      {
        id: 'instruments',
        title: 'Open to All Instruments',
        description: 'Specify which instruments are welcome',
        order: 2,
        isRequired: true,
        isCompleted: false,
        fields: [
          {
            id: 'instruments',
            label: 'Instruments Welcome',
            type: 'multiselect',
            required: true,
            options: ['All Instruments', 'Vocals', 'Guitar', 'Piano', 'Drums', 'Bass', 'Violin', 'Saxophone', 'Trumpet', 'Flute', 'Clarinet', 'Cello', 'Viola', 'Harp', 'Accordion', 'Harmonica', 'Ukulele', 'Banjo', 'Mandolin', 'Other']
          },
          {
            id: 'maxParticipants',
            label: 'Maximum Participants',
            type: 'number',
            required: false,
            placeholder: 'Leave empty for unlimited',
            validation: { min: 1, max: 100 }
          }
        ]
      },
      {
        id: 'schedule',
        title: 'Schedule & Duration',
        description: 'Set the schedule and duration of the jam session',
        order: 3,
        isRequired: true,
        isCompleted: false,
        fields: [
          {
            id: 'startDate',
            label: 'Start Date & Time',
            type: 'date',
            required: true
          },
          {
            id: 'duration',
            label: 'Duration (hours)',
            type: 'number',
            required: true,
            validation: { min: 1, max: 24 }
          }
        ]
      },
      {
        id: 'settings',
        title: 'Jam Session Settings',
        description: 'Configure privacy and other settings',
        order: 4,
        isRequired: true,
        isCompleted: false,
        fields: [
          {
            id: 'privacy',
            label: 'Privacy Setting',
            type: 'select',
            required: true,
            options: ['Public', 'Private', 'Invite Only']
          },
          {
            id: 'location',
            label: 'Location Type',
            type: 'select',
            required: true,
            options: ['Online', 'Offline', 'Hybrid']
          }
        ]
      }
    ]
  }
];

// Create a new collaboration
export const createCollaboration = async (collaborationData: Partial<Collaboration>): Promise<string> => {
  try {
    // Ensure required fields are present
    const collaboration = {
      ...collaborationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      views: 0,
      applications: 0,
      currentParticipants: 1,
      participants: collaborationData.participants || [],
      attachments: collaborationData.attachments || [],
      tags: collaborationData.tags || [],
      milestones: [],
      // Ensure all required fields have defaults
      status: collaborationData.status || 'open',
      privacy: collaborationData.privacy || 'public',
      location: collaborationData.location || 'online',
      compensation: collaborationData.compensation || 'free',
      instruments: collaborationData.instruments || [],
      requirements: collaborationData.requirements || [],
      timeline: collaborationData.timeline || {
        startDate: new Date().toISOString(),
        endDate: undefined,
        milestones: []
      }
    };

    console.log('Creating collaboration with data:', collaboration);
    
    // Validate required fields
    if (!collaboration.title || !collaboration.description || !collaboration.genre) {
      throw new Error('Missing required fields: title, description, or genre');
    }
    
    const collaborationRef = await addDoc(collection(db, 'collaborations'), collaboration);
    console.log('Collaboration created with ID:', collaborationRef.id);
    return collaborationRef.id;
  } catch (error) {
    console.error('Error creating collaboration:', error);
    throw new Error('Failed to create collaboration');
  }
};

// Get collaboration by ID
export const getCollaboration = async (id: string): Promise<Collaboration | null> => {
  try {
    const docRef = doc(db, 'collaborations', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Collaboration;
    }
    return null;
  } catch (error) {
    console.error('Error getting collaboration:', error);
    throw new Error('Failed to get collaboration');
  }
};

// Update collaboration
export const updateCollaboration = async (id: string, updates: Partial<Collaboration>): Promise<void> => {
  try {
    const docRef = doc(db, 'collaborations', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating collaboration:', error);
    throw new Error('Failed to update collaboration');
  }
};

// Delete collaboration
export const deleteCollaboration = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'collaborations', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting collaboration:', error);
    throw new Error('Failed to delete collaboration');
  }
};

// Search collaborations
export const searchCollaborations = async (
  filters: CollaborationFilter = {},
  page: number = 1,
  limit: number = 10
): Promise<CollaborationSearchResult> => {
  try {
    const constraints = [];

    // Add filters
    if (filters.genre) {
      constraints.push(where('genre', '==', filters.genre));
    }
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.type) {
      constraints.push(where('collaborationType', '==', filters.type));
    }
    if (filters.location) {
      constraints.push(where('location', '==', filters.location));
    }
    if (filters.compensation) {
      constraints.push(where('compensation', '==', filters.compensation));
    }

    // Add ordering
    constraints.push(orderBy('createdAt', 'desc'));

    // Add pagination
    constraints.push(limit(Number(limit)));

    // Create query
    const q = query(collection(db, 'collaborations'), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const collaborations = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date()
      };
    }) as Collaboration[];

    return {
      collaborations,
      total: collaborations.length,
      page,
      limit,
      hasMore: collaborations.length === limit
    };
  } catch (error) {
    console.error('Error searching collaborations:', error);
    // Return empty result instead of throwing
    return {
      collaborations: [],
      total: 0,
      page,
      limit,
      hasMore: false
    };
  }
};

// Get all collaborations (for display purposes)
export const getAllCollaborations = async (): Promise<Collaboration[]> => {
  try {
    const q = query(
      collection(db, 'collaborations'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date()
      };
    }) as Collaboration[];
  } catch (error) {
    console.error('Error getting all collaborations:', error);
    return [];
  }
};

// Apply to collaboration
export const applyToCollaboration = async (
  collaborationId: string,
  applicationData: Partial<CollaborationApplication>
): Promise<string> => {
  try {
    const applicationRef = await addDoc(collection(db, 'collaborationApplications'), {
      ...applicationData,
      collaborationId,
      status: 'pending',
      appliedAt: serverTimestamp()
    });

    // Increment application count on collaboration
    const collaborationRef = doc(db, 'collaborations', collaborationId);
    await updateDoc(collaborationRef, {
      applications: increment(1)
    });

    return applicationRef.id;
  } catch (error) {
    console.error('Error applying to collaboration:', error);
    throw new Error('Failed to apply to collaboration');
  }
};

// Get applications for a collaboration
export const getCollaborationApplications = async (collaborationId: string): Promise<CollaborationApplication[]> => {
  try {
    const q = query(
      collection(db, 'collaborationApplications'),
      where('collaborationId', '==', collaborationId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CollaborationApplication[];
  } catch (error) {
    console.error('Error getting applications:', error);
    throw new Error('Failed to get applications');
  }
};

// Update application status
export const updateApplicationStatus = async (
  applicationId: string,
  status: 'accepted' | 'rejected' | 'withdrawn',
  responseMessage?: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'collaborationApplications', applicationId);
    await updateDoc(docRef, {
      status,
      respondedAt: serverTimestamp(),
      responseMessage
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    throw new Error('Failed to update application status');
  }
};

// Get user's collaborations (where user is the creator)
export const getUserCollaborations = async (userId: string): Promise<Collaboration[]> => {
  try {
    console.log('Fetching collaborations for user:', userId);
    
    // First try to get collaborations with creatorId field
    let q = query(
      collection(db, 'collaborations'),
      where('creatorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    let querySnapshot;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      console.log('No collaborations found with creatorId, trying alternative fields...');
      // If that fails, try without the orderBy clause first
      q = query(
        collection(db, 'collaborations'),
        where('creatorId', '==', userId)
      );
      querySnapshot = await getDocs(q);
    }
    
    const collaborations = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Collaboration data:', data); // Debug log
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        participants: data.participants || [],
        instruments: data.instruments || [],
        requirements: data.requirements || [],
        attachments: data.attachments || [],
        tags: data.tags || [],
        views: data.views || 0,
        applications: data.applications || 0,
        currentParticipants: data.currentParticipants || 0
      };
    }) as Collaboration[];
    
    console.log('Found collaborations:', collaborations.length);
    console.log('Collaborations:', collaborations); // Debug log
    return collaborations;
  } catch (error) {
    console.error('Error getting user collaborations:', error);
    return [];
  }
};

// Get collaborations where user is a participant
export const getUserParticipatingCollaborations = async (userId: string): Promise<Collaboration[]> => {
  try {
    console.log('Fetching participating collaborations for user:', userId);
    // First get all collaborations
    const q = query(
      collection(db, 'collaborations'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    // Filter collaborations where user is a participant
    const collaborations = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        participants: data.participants || [],
        instruments: data.instruments || [],
        requirements: data.requirements || [],
        attachments: data.attachments || [],
        tags: data.tags || [],
        views: data.views || 0,
        applications: data.applications || 0,
        currentParticipants: data.currentParticipants || 0
      };
    }) as Collaboration[];
    
    const participatingCollaborations = collaborations.filter(collab => 
      collab.participants && Array.isArray(collab.participants) && 
      collab.participants.some(participant => 
        participant && typeof participant === 'object' && participant.userId === userId
      )
    );
    
    console.log('Found participating collaborations:', participatingCollaborations.length);
    return participatingCollaborations;
  } catch (error) {
    console.error('Error getting user participating collaborations:', error);
    return [];
  }
};

// Get collaboration templates
export const getCollaborationTemplates = async (): Promise<CollaborationTemplate[]> => {
  try {
    const q = query(collection(db, 'collaborationTemplates'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Return default templates if none exist in database
      return defaultTemplates;
    }
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CollaborationTemplate[];
  } catch (error) {
    console.error('Error getting templates:', error);
    return defaultTemplates;
  }
};

// Get collaboration statistics
export const getCollaborationStats = async (userId?: string): Promise<CollaborationStats> => {
  try {
    let q = collection(db, 'collaborations');
    
    if (userId) {
      const userQuery = query(q, where('creatorId', '==', userId));
      const querySnapshot = await getDocs(userQuery);
      const collaborations = querySnapshot.docs.map(doc => doc.data()) as Collaboration[];
      
      const stats: CollaborationStats = {
        totalCollaborations: collaborations.length,
        activeCollaborations: collaborations.filter(c => c.status === 'open' || c.status === 'in_progress').length,
        completedCollaborations: collaborations.filter(c => c.status === 'completed').length,
        totalApplications: collaborations.reduce((sum, c) => sum + c.applications, 0),
        acceptedApplications: 0, // This would need to be calculated from applications
        averageCompletionTime: 0, // This would need to be calculated
        topGenres: [],
        topInstruments: []
      };
      
      // Calculate top genres and instruments
      const genreCount: { [key: string]: number } = {};
      const instrumentCount: { [key: string]: number } = {};
      
      collaborations.forEach(collab => {
        genreCount[collab.genre] = (genreCount[collab.genre] || 0) + 1;
        collab.instruments.forEach(instrument => {
          instrumentCount[instrument] = (instrumentCount[instrument] || 0) + 1;
        });
      });
      
      stats.topGenres = Object.entries(genreCount)
        .sort(([,a], [,b]) => Number(b) - Number(a))
        .slice(0, 5)
        .map(([genre]) => genre);
        
      stats.topInstruments = Object.entries(instrumentCount)
        .sort(([,a], [,b]) => Number(b) - Number(a))
        .slice(0, 5)
        .map(([instrument]) => instrument);
      
      return stats;
    }
    
    const querySnapshot = await getDocs(q);
    const collaborations = querySnapshot.docs.map(doc => doc.data()) as Collaboration[];
    
    const stats: CollaborationStats = {
      totalCollaborations: collaborations.length,
      activeCollaborations: collaborations.filter(c => c.status === 'open' || c.status === 'in_progress').length,
      completedCollaborations: collaborations.filter(c => c.status === 'completed').length,
      totalApplications: collaborations.reduce((sum, c) => sum + c.applications, 0),
      acceptedApplications: 0, // This would need to be calculated from applications
      averageCompletionTime: 0, // This would need to be calculated
      topGenres: [],
      topInstruments: []
    };
    
    // Calculate top genres and instruments
    const genreCount: { [key: string]: number } = {};
    const instrumentCount: { [key: string]: number } = {};
    
    collaborations.forEach(collab => {
      genreCount[collab.genre] = (genreCount[collab.genre] || 0) + 1;
      collab.instruments.forEach(instrument => {
        instrumentCount[instrument] = (instrumentCount[instrument] || 0) + 1;
      });
    });
    
    stats.topGenres = Object.entries(genreCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([genre]) => genre);
      
    stats.topInstruments = Object.entries(instrumentCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([instrument]) => instrument);
    
    return stats;
  } catch (error) {
    console.error('Error getting collaboration stats:', error);
    throw new Error('Failed to get collaboration stats');
  }
};

// Increment collaboration views
export const incrementCollaborationViews = async (collaborationId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'collaborations', collaborationId);
    await updateDoc(docRef, {
      views: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing views:', error);
  }
};

// Add participant to collaboration
export const addParticipant = async (
  collaborationId: string,
  participant: {
    userId: string;
    userName: string;
    userAvatar?: string;
    role: string;
    instrument: string;
  }
): Promise<void> => {
  try {
    const docRef = doc(db, 'collaborations', collaborationId);
    await updateDoc(docRef, {
      participants: arrayUnion({
        ...participant,
        joinedAt: new Date(),
        status: 'active'
      }),
      currentParticipants: increment(1)
    });
  } catch (error) {
    console.error('Error adding participant:', error);
    throw new Error('Failed to add participant');
  }
};

// Remove participant from collaboration
export const removeParticipant = async (
  collaborationId: string,
  userId: string
): Promise<void> => {
  try {
    const collaboration = await getCollaboration(collaborationId);
    if (!collaboration) throw new Error('Collaboration not found');
    
    const updatedParticipants = collaboration.participants.filter(p => p.userId !== userId);
    
    const docRef = doc(db, 'collaborations', collaborationId);
    await updateDoc(docRef, {
      participants: updatedParticipants,
      currentParticipants: increment(-1)
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    throw new Error('Failed to remove participant');
  }
};

// Add cost item to collaboration
export const addCollaborationCost = async (
  collaborationId: string,
  costItem: Omit<CostItem, 'id' | 'date'>
): Promise<void> => {
  try {
    const docRef = doc(db, 'collaborations', collaborationId);
    const collaboration = await getCollaboration(collaborationId);
    
    if (!collaboration) throw new Error('Collaboration not found');
    
    const newCostItem: CostItem = {
      ...costItem,
      id: `cost_${Date.now()}`,
      date: new Date()
    };
    
    const updatedBudget = {
      ...collaboration.budget,
      items: [...(collaboration.budget?.items || []), newCostItem],
      spent: (collaboration.budget?.spent || 0) + costItem.amount
    };
    
    await updateDoc(docRef, {
      budget: updatedBudget,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding cost item:', error);
    throw new Error('Failed to add cost item');
  }
};

// Remove cost item from collaboration budget
export const removeCollaborationCost = async (
  collaborationId: string,
  costItemId: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'collaborations', collaborationId);
    const collaboration = await getCollaboration(collaborationId);
    if (!collaboration || !collaboration.budget) return;
    const existingItems = collaboration.budget.items || [];
    const removed = existingItems.find(i => i.id === costItemId);
    const remaining = existingItems.filter(i => i.id !== costItemId);
    await updateDoc(docRef, {
      'budget.items': remaining,
      'budget.spent': Math.max(0, (collaboration.budget.spent || 0) - (removed?.amount || 0)),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error removing cost item:', error);
    throw new Error('Failed to remove cost item');
  }
};

// Update collaboration budget
export const updateCollaborationBudget = async (
  collaborationId: string,
  budget: {
    total: number;
    currency: string;
  }
): Promise<void> => {
  try {
    const docRef = doc(db, 'collaborations', collaborationId);
    await updateDoc(docRef, {
      'budget.total': budget.total,
      'budget.currency': budget.currency,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    throw new Error('Failed to update budget');
  }
};

// Update detailed requirements
export const updateDetailedRequirements = async (
  collaborationId: string,
  requirements: {
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    experience: string;
    equipment: string[];
    availability: string;
    commitment: string;
    additionalNotes: string;
  }
): Promise<void> => {
  try {
    const docRef = doc(db, 'collaborations', collaborationId);
    await updateDoc(docRef, {
      detailedRequirements: requirements,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating detailed requirements:', error);
    throw new Error('Failed to update detailed requirements');
  }
};

// Update studio costs
export const updateStudioCosts = async (
  collaborationId: string,
  studioCosts: {
    studioTime: number;
    equipmentRental: number;
    engineer: number;
    additionalServices: CostItem[];
  }
): Promise<void> => {
  try {
    const docRef = doc(db, 'collaborations', collaborationId);
    await updateDoc(docRef, {
      studioCosts: studioCosts,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating studio costs:', error);
    throw new Error('Failed to update studio costs');
  }
};

// Update mixing costs
export const updateMixingCosts = async (
  collaborationId: string,
  mixingCosts: {
    mixing: number;
    mastering: number;
    additionalEdits: number;
    revisions: number;
  }
): Promise<void> => {
  try {
    const docRef = doc(db, 'collaborations', collaborationId);
    await updateDoc(docRef, {
      mixingCosts: mixingCosts,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating mixing costs:', error);
    throw new Error('Failed to update mixing costs');
  }
};