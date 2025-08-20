import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Function to create admin user for initial setup
export const setupAdminUser = async () => {
  try {
    // Admin credentials - in a real app, these would be environment variables
    const adminEmail = 'admin@soundalchemy.com';
    const adminPassword = 'soundalchemy@admin2025';
    
    // Check if admin already exists
    const adminDoc = await getDoc(doc(db, 'admin', 'setup'));
    
    if (adminDoc.exists()) {
      console.log('Admin already set up');
      return;
    }
    
    // Create admin user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      adminEmail,
      adminPassword
    );
    
    const user = userCredential.user;
    
    // Set up admin in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      fullName: 'System Administrator',
      email: adminEmail,
      role: 'admin',
      isVerified: true,
      createdAt: new Date(),
    });
    
    // Mark admin as set up
    await setDoc(doc(db, 'admin', 'setup'), {
      initialized: true,
      adminId: user.uid,
      createdAt: new Date()
    });
    
    console.log('Admin user created successfully');
    
    return {
      email: adminEmail,
      password: adminPassword
    };
  } catch (error) {
    console.error('Error setting up admin:', error);
    throw error;
  }
};