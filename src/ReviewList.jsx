import { useState } from "react";
import LazyImage from "./LazyImage";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { useAuth } from "./AuthContext";
import { db, getStorage } from "./firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";

export default function ReviewList({ reviews: initialReviews }) {
    if (!initialReviews.length) return null;
  
    const [lightboxImages, setLightboxImages] = useState([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [reviews, setReviews] = useState(initialReviews);
    const { user } = useAuth();

    // Debug: log user and reviews
    console.log('Current user:', user);
    console.log('Reviews:', reviews);

    const handleDeleteReview = async (review) => {
      if (!window.confirm("Are you sure you want to delete this review?")) return;
      try {
        // Delete all images in the review's images subcollection
        if (review.images && review.images.length > 0) {
          const imagesSnap = await getDocs(collection(db, `reviews/${review.id}/images`));
          for (const docSnap of imagesSnap.docs) {
            const { url } = docSnap.data();
            if (url) {
              try {
                const path = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
                const imgRef = storageRef(getStorage(), path);
                await deleteObject(imgRef);
              } catch (err) {
                console.warn("Failed to delete image from storage:", err);
              }
            }
            await deleteDoc(docSnap.ref);
          }
        }
        // Delete the review document
        await deleteDoc(doc(db, "reviews", review.id));
        setReviews((prev) => prev.filter((r) => r.id !== review.id));
      } catch (err) {
        console.error("Failed to delete review:", err);
        alert("Could not delete review.");
      }
    };

    return (
      <>
        <div style={{ color: 'red', fontWeight: 'bold' }}>DEBUG: ReviewList is rendering</div>
        <div className="mt-4">
          <h4 className="text-md font-semibold mb-2">Reviews:</h4>
          {reviews.map((r, i) => (
            <div key={i} className="bg-gray-100 p-2 rounded mb-2">
              <div className="font-bold">{r.rating} ⭐</div>
              <p className="text-sm mb-1">{r.text}</p>
              {r.nickname ? (
                <p className="text-xs italic text-gray-600">by {r.nickname}</p>
              ) : r.userEmail ? (
                <p className="text-xs italic text-gray-600">by {r.userEmail}</p>
              ) : (
                <p className="text-xs italic text-gray-500">Anonymous</p>
              )}
              {r.images && r.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mt-2">
                  {r.images.map((img, index) => (
                    <LazyImage
                      key={index}
                      src={img.url}
                      alt={`Review image ${index + 1}`}
                      className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-90"
                      placeholder="📷"
                      onClick={() => {
                        setLightboxImages(r.images.map(img => img.url));
                        setLightboxIndex(index);
                        setLightboxOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
              {user && (user.email === r.userEmail || user.uid === r.userId) && (
                <button
                  onClick={() => handleDeleteReview(r)}
                  className="text-red-600 text-xs mt-2 hover:underline"
                >
                  🗑️ Delete Review
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Lightbox for review images */}
        {lightboxOpen && (
          <Lightbox
            open={lightboxOpen}
            close={() => setLightboxOpen(false)}
            index={lightboxIndex}
            slides={lightboxImages.map((url) => ({ src: url }))}
            plugins={[Zoom]}
            zoom={{ maxZoomPixelRatio: 4 }}
          />
        )}
      </>
    );
}  