// scripts/delete-account.js
// Script to delete all data for 01052995980 account using Firebase Admin SDK

// Import Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin with service account credentials
// Note: This requires a service account key file to be downloaded from Firebase console
// https://console.firebase.google.com/project/parent-dailycheck/settings/serviceaccounts/adminsdk
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      // This should be replaced with actual service account credentials
      // This is just a placeholder structure
      project_id: "parent-dailycheck",
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      client_email: process.env.FIREBASE_CLIENT_EMAIL || ''
    }),
    databaseURL: "https://parent-dailycheck.firebaseio.com"
  });
} catch (error) {
  console.error("Firebase initialization error:", error.message);
  process.exit(1);
}

const db = admin.firestore();

// Function to delete all user data
async function deleteUserAccount(phoneNumber) {
  console.log(`Starting deletion process for phone number: ${phoneNumber}`);
  
  // Normalize phone number
  const userId = phoneNumber.replace(/[-\s]/g, '');
  console.log(`Normalized user ID: ${userId}`);
  
  // Collections to check for user data
  const collections = ['users', 'user_data', 'appData', 'verifications'];
  
  try {
    // 1. Delete from 'users' collection directly
    console.log(`Deleting from users collection...`);
    await db.collection('users').doc(userId).delete();
    console.log(`Deleted user document from 'users' collection`);
  } catch (error) {
    console.error(`Error deleting from users collection: ${error.message}`);
  }
  
  try {
    // 2. Delete from 'user_data' collection directly
    console.log(`Deleting from user_data collection...`);
    await db.collection('user_data').doc(userId).delete();
    console.log(`Deleted user document from 'user_data' collection`);
  } catch (error) {
    console.error(`Error deleting from user_data collection: ${error.message}`);
  }
  
  try {
    // 3. Delete from 'appData' collection directly
    console.log(`Deleting from appData collection...`);
    await db.collection('appData').doc(userId).delete();
    console.log(`Deleted user document from 'appData' collection`);
  } catch (error) {
    console.error(`Error deleting from appData collection: ${error.message}`);
  }
  
  try {
    // 4. Delete verification records that match the phone number
    console.log(`Searching for verification records...`);
    const verificationQuery = await db.collection('verifications')
      .where('phoneNumber', '==', userId)
      .get();
    
    if (verificationQuery.empty) {
      console.log('No verification records found');
    } else {
      console.log(`Found ${verificationQuery.size} verification records to delete`);
      
      // Delete all matching documents
      const batch = db.batch();
      verificationQuery.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('All verification records deleted');
    }
  } catch (error) {
    console.error(`Error deleting verification records: ${error.message}`);
  }
  
  console.log(`Account deletion process completed for ${phoneNumber}`);
}

// Run the deletion for 01052995980
deleteUserAccount('01052995980')
  .then(() => {
    console.log('Account deletion completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error in deletion process:', error);
    process.exit(1);
  }); 