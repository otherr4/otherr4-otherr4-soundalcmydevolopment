import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc,
  collection,
  getDocs
} from 'firebase/firestore';

// Firebase configuration (you'll need to add your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyBvVqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXq",
  authDomain: "soundalcmy.firebaseapp.com",
  projectId: "soundalcmy",
  storageBucket: "soundalcmy.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUserFriends() {
  console.log('🔍 Checking User Friends Data...\n');

  try {
    // Test user ID (replace with actual user ID)
    const testUserId = 'GTb0ZJJY9wPk2IYX5mh2Xs9XX2d2'; // NeureX user ID
    
    console.log('📋 Checking user document...');
    const userDoc = await getDoc(doc(db, 'users', testUserId));
    
    if (!userDoc.exists()) {
      console.log('❌ User document does not exist');
      return;
    }

    const userData = userDoc.data();
    console.log('✅ User document found');
    console.log('User data:', {
      fullName: userData.fullName,
      email: userData.email,
      friends: userData.friends,
      friendsType: typeof userData.friends,
      friendsLength: userData.friends?.length
    });

    if (!userData.friends || !Array.isArray(userData.friends)) {
      console.log('❌ Friends field is not an array or is missing');
      return;
    }

    console.log(`\n📋 Found ${userData.friends.length} friends`);
    console.log('Friend UIDs:', userData.friends);

    // Check each friend document
    console.log('\n🔍 Checking friend documents...');
    let existingFriends = 0;
    let missingFriends = 0;

    for (const friendUid of userData.friends) {
      try {
        const friendDoc = await getDoc(doc(db, 'users', friendUid));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          console.log(`✅ ${friendData.fullName || friendData.displayName || 'Unknown'} (${friendUid})`);
          existingFriends++;
        } else {
          console.log(`❌ Friend document missing for UID: ${friendUid}`);
          missingFriends++;
        }
      } catch (error) {
        console.log(`❌ Error loading friend ${friendUid}:`, error.message);
        missingFriends++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`Total friends in array: ${userData.friends.length}`);
    console.log(`Existing friend documents: ${existingFriends}`);
    console.log(`Missing friend documents: ${missingFriends}`);

    if (existingFriends === 0) {
      console.log('\n⚠️  No existing friend documents found!');
      console.log('This could be the reason why only 1 friend is showing.');
    }

  } catch (error) {
    console.error('❌ Error checking user friends:', error);
  }
}

// Run the check
checkUserFriends(); 