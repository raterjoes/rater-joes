// backfill-reviews-userId.js
// One-time script to backfill userId on all reviews in Firestore

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();
const auth = getAuth();

async function backfillUserIdOnReviews() {
  const reviewsSnap = await db.collection('reviews').get();
  let updated = 0;
  for (const reviewDoc of reviewsSnap.docs) {
    const data = reviewDoc.data();
    if (!data.userId && data.userEmail) {
      // Try to find user by email in users collection
      const usersSnap = await db.collection('users').where('email', '==', data.userEmail).get();
      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        const userId = userDoc.id;
        await reviewDoc.ref.update({ userId });
        updated++;
        console.log(`Updated review ${reviewDoc.id} with userId ${userId}`);
      } else {
        // Try to find user by email in Firebase Auth (fallback)
        try {
          const userRecord = await auth.getUserByEmail(data.userEmail);
          if (userRecord && userRecord.uid) {
            await reviewDoc.ref.update({ userId: userRecord.uid });
            updated++;
            console.log(`Updated review ${reviewDoc.id} with userId ${userRecord.uid} (from Auth)`);
          } else {
            console.warn(`No user found for email ${data.userEmail}`);
          }
        } catch (err) {
          console.warn(`No user found for email ${data.userEmail}`);
        }
      }
    }
  }
  console.log(`Backfill complete. Updated ${updated} reviews.`);
}

backfillUserIdOnReviews().catch(console.error); 