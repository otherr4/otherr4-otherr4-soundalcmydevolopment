// Simple script to check collaborations in the database
// Run this in the browser console on the collaborations page

console.log('🔍 Checking collaborations in database...');

// Check all collaborations
async function checkCollaborations() {
  try {
    // Get all collaborations
    const collaborationsRef = collection(db, 'collaborations');
    const snapshot = await getDocs(collaborationsRef);
    
    console.log(`📊 Found ${snapshot.size} total collaborations`);
    
    if (snapshot.size > 0) {
      console.log('\n📋 Collaboration details:');
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`\n🎵 ${data.title || 'Untitled'}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Creator: ${data.creatorId || 'Unknown'}`);
        console.log(`   Creator Name: ${data.creatorName || 'Unknown'}`);
        console.log(`   Privacy: ${data.privacy || 'Unknown'}`);
        console.log(`   Status: ${data.status || 'Unknown'}`);
        console.log(`   Genre: ${data.genre || 'Unknown'}`);
        console.log(`   Instruments: ${data.instruments?.join(', ') || 'None'}`);
        console.log(`   Participants: ${data.participants?.length || 0}`);
        console.log(`   Views: ${data.views || 0}`);
        console.log(`   Applications: ${data.applications || 0}`);
        console.log(`   Created: ${data.createdAt?.toDate?.() || 'Unknown'}`);
      });
    } else {
      console.log('❌ No collaborations found in database');
    }
    
    // Check for specific user collaborations
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log(`\n👤 Checking collaborations for user: ${currentUser.uid}`);
      
      const userCollaborationsQuery = query(
        collection(db, 'collaborations'),
        where('creatorId', '==', currentUser.uid)
      );
      
      const userSnapshot = await getDocs(userCollaborationsQuery);
      console.log(`Found ${userSnapshot.size} collaborations created by current user`);
      
      userSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`- ${data.title} (${data.status})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking collaborations:', error);
  }
}

// Run the check
checkCollaborations(); 