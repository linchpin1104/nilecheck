// scripts/delete-user-data.js
// Script to delete all data for a specific phone number

// Import Firebase modules
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, deleteDoc, collection, query, where, getDocs } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Standardize phone number by removing hyphens and whitespace
function standardizePhoneNumber(phoneNumber) {
  return phoneNumber.replace(/[-\s]/g, '');
}

async function deleteUserData(phoneNumber) {
  console.log(`Starting deletion process for phone number: ${phoneNumber}`);
  
  // Standardize the phone number
  const standardizedPhoneNumber = standardizePhoneNumber(phoneNumber);
  console.log(`Standardized phone number: ${standardizedPhoneNumber}`);
  
  // This phone number likely serves as the user ID
  const userId = standardizedPhoneNumber;
  
  // 1. Delete from 'users' collection
  try {
    console.log(`Attempting to delete user document with ID: ${userId}`);
    await deleteDoc(doc(db, 'users', userId));
    console.log(`Successfully deleted user document from 'users' collection`);
  } catch (error) {
    console.error(`Error deleting user document: ${error.message}`);
  }
  
  // 2. Delete from 'user_data' collection
  try {
    console.log(`Attempting to delete user data document with ID: ${userId}`);
    await deleteDoc(doc(db, 'user_data', userId));
    console.log(`Successfully deleted document from 'user_data' collection`);
  } catch (error) {
    console.error(`Error deleting user data document: ${error.message}`);
  }
  
  // 3. Delete from 'appData' collection
  try {
    console.log(`Attempting to delete app data document with ID: ${userId}`);
    await deleteDoc(doc(db, 'appData', userId));
    console.log(`Successfully deleted document from 'appData' collection`);
  } catch (error) {
    console.error(`Error deleting app data document: ${error.message}`);
  }
  
  // 4. Delete verification records
  try {
    const verificationsRef = collection(db, 'verifications');
    const q = query(verificationsRef, where('phoneNumber', '==', standardizedPhoneNumber));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No verification documents found for this phone number`);
    } else {
      console.log(`Found ${querySnapshot.size} verification documents to delete`);
      
      const deletePromises = querySnapshot.docs.map(document => 
        deleteDoc(doc(db, 'verifications', document.id))
      );
      
      await Promise.all(deletePromises);
      console.log(`Successfully deleted all verification documents`);
    }
  } catch (error) {
    console.error(`Error deleting verification documents: ${error.message}`);
  }
  
  console.log(`Deletion process completed for phone number: ${phoneNumber}`);
}

// Run the deletion for the specified phone number
deleteUserData('01052995980')
  .then(() => {
    console.log('Data deletion completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error in deletion process:', error);
    process.exit(1);
  }); 