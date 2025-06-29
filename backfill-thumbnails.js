// backfill-thumbnails.js
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

initializeApp({
  credential: applicationDefault(),
  projectId: "rater-joes",
  storageBucket: "rater-joes.firebasestorage.app"
});

const db = getFirestore();
const bucket = getStorage().bucket();

async function backfillThumbnails() {
  const productsSnapshot = await db.collection("products").get();
  for (const doc of productsSnapshot.docs) {
    const data = doc.data();
    if (!data.images || !Array.isArray(data.images)) continue;
    const thumbnailUrls = [];
    for (const imageUrl of data.images) {
      // Extract filename from image URL
      const match = imageUrl.match(/product-images%2F([^?]+)/);
      if (!match) {
        thumbnailUrls.push(null);
        continue;
      }
      const filename = decodeURIComponent(match[1]);
      const ext = filename.slice(filename.lastIndexOf("."));
      const name = filename.replace(ext, "");
      const thumbPath = `product-images/thumbs/${name}_200x200${ext}`;
      try {
        const [thumbFile] = await bucket.file(thumbPath).get();
        const [thumbnailUrl] = await thumbFile.getSignedUrl({
          action: "read",
          expires: "03-09-2491"
        });
        thumbnailUrls.push(thumbnailUrl);
      } catch (err) {
        console.warn(`Could not find thumbnail for ${doc.id}:`, err.message);
        thumbnailUrls.push(null);
      }
    }
    await doc.ref.update({ thumbnailUrls });
    console.log(`Updated ${doc.id} with thumbnail URLs`);
  }
}

backfillThumbnails().then(() => {
  console.log("Backfill complete!");
  process.exit();
}); 