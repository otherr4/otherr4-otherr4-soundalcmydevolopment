// Test script to verify collaboration functionality
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } = require('firebase/firestore');

// Firebase configuration (you'll need to add your actual config)
const firebaseConfig = {
  // Add your Firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testCollaborations() {
  try {
    console.log('Testing collaborations...');
    
    // Test 1: Check if there are any existing collaborations
    console.log('\n1. Checking existing collaborations...');
    const collaborationsQuery = query(collection(db, 'collaborations'));
    const collaborationsSnapshot = await getDocs(collaborationsQuery);
    
    console.log(`Found ${collaborationsSnapshot.size} total collaborations`);
    
    collaborationsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}`);
      console.log(`  Title: ${data.title}`);
      console.log(`  Creator ID: ${data.creatorId}`);
      console.log(`  Privacy: ${data.privacy}`);
      console.log(`  Status: ${data.status}`);
      console.log('  ---');
    });
    
    // Test 2: Create a test collaboration
    console.log('\n2. Creating test collaboration...');
    const testCollaboration = {
      title: 'Test Collaboration - Debug Script',
      description: 'This is a test collaboration created by the debug script.',
      creatorId: 'test-user-id',
      creatorName: 'Test User',
      genre: 'Pop',
      instruments: ['Vocals', 'Guitar'],
      collaborationType: 'cover',
      status: 'open',
      privacy: 'public',
      maxParticipants: 5,
      currentParticipants: 1,
      participants: [],
      requirements: ['Must be able to sing'],
      timeline: {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        milestones: []
      },
      attachments: [],
      tags: ['test', 'debug'],
      location: 'online',
      locationDetails: 'Online collaboration',
      compensation: 'free',
      compensationDetails: 'Free collaboration for testing',
      isVerified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      views: 0,
      applications: 0
    };
    
    const docRef = await addDoc(collection(db, 'collaborations'), testCollaboration);
    console.log(`Test collaboration created with ID: ${docRef.id}`);
    
    // Test 3: Fetch collaborations by creator ID
    console.log('\n3. Fetching collaborations by creator ID...');
    const userCollaborationsQuery = query(
      collection(db, 'collaborations'),
      where('creatorId', '==', 'test-user-id'),
      orderBy('createdAt', 'desc')
    );
    
    try {
      const userCollaborationsSnapshot = await getDocs(userCollaborationsQuery);
      console.log(`Found ${userCollaborationsSnapshot.size} collaborations for test-user-id`);
      
      userCollaborationsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`- ID: ${doc.id}`);
        console.log(`  Title: ${data.title}`);
        console.log(`  Creator ID: ${data.creatorId}`);
        console.log('  ---');
      });
    } catch (error) {
      console.log('Error fetching by creatorId:', error.message);
      
      // Try without orderBy
      console.log('Trying without orderBy...');
      const simpleQuery = query(
        collection(db, 'collaborations'),
        where('creatorId', '==', 'test-user-id')
      );
      
      const simpleSnapshot = await getDocs(simpleQuery);
      console.log(`Found ${simpleSnapshot.size} collaborations for test-user-id (simple query)`);
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testCollaborations(); 