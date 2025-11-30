import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Construct service account from environment variables
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Handle private key newlines correctly
  privateKey: process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined,
};

let db;

try {
  if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log("Firebase initialized successfully.");
  } else {
    console.warn("Missing Firebase credentials in .env. Firestore operations will be skipped or fail.");
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

/**
 * Saves scholarship data to Firestore, avoiding duplicates based on scheme_id.
 * @param {Array} data - Array of scholarship objects.
 */
export async function saveToFirestore(data) {
  if (!db) {
    console.error("Firestore is not initialized. Cannot save data.");
    return;
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log("No data to save.");
    return;
  }

  const collectionRef = db.collection('scholarships');
  let insertedCount = 0;
  let skippedCount = 0;

  console.log(`Starting Firestore sync for ${data.length} items...`);

  for (const item of data) {
    if (!item.scheme_id) {
      console.warn("Skipping item missing scheme_id:", item.name || 'Unknown');
      continue;
    }

    try {
      const docRef = collectionRef.doc(item.scheme_id);
      const doc = await docRef.get();

      if (!doc.exists) {
        // Create new document
        await docRef.set(item);
        insertedCount++;
      } else {
        // Document exists, skip
        skippedCount++;
      }
    } catch (error) {
      console.error(`Error processing item ${item.scheme_id}:`, error);
    }
  }

  console.log("------------------------------------------------");
  console.log("Firestore Sync Complete");
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Skipped (Duplicate): ${skippedCount}`);
  console.log("------------------------------------------------");
}
