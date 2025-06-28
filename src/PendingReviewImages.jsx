import { useEffect, useState } from "react";
import {
  collectionGroup,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  getDoc,
  collection,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { getStorage } from "./firebase";
import { ref as storageRef, deleteObject } from "firebase/storage";

export default function PendingReviewImages() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pendingImages, setPendingImages] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

  // ✅ Separate admin redirect logic
  useEffect(() => {
    if (adminCheckComplete && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, adminCheckComplete, navigate]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      const snapshot = await getDocs(collection(db, "admins"));
      const emails = snapshot.docs.map((doc) => doc.data().email);
      const admin = emails.includes(user.email);
      setIsAdmin(admin);
      setAdminCheckComplete(true);
    };
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchPendingImages = async () => {
      const snapshot = await getDocs(
        collectionGroup(db, "images") // 🔍 get all /reviews/{reviewId}/images
      );

      const images = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (!data.approved) {
          const path = docSnap.ref.path; // reviews/{reviewId}/images/{imageId}
          const [_, reviewId] = path.split("/");

          const reviewSnap = await getDoc(doc(db, "reviews", reviewId));
          const review = reviewSnap.exists() ? reviewSnap.data() : null;

          images.push({
            id: docSnap.id,
            ref: docSnap.ref,
            url: data.url,
            reviewId,
            reviewText: review?.text || "",
            reviewBy: review?.nickname || review?.userEmail || "Anonymous",
          });
        }
      }

      setPendingImages(images);
    };

    fetchPendingImages();
  }, [user, isAdmin]);

  const approveImage = async (ref) => {
    await updateDoc(ref, { approved: true });
    setPendingImages((prev) => prev.filter((img) => img.ref.id !== ref.id));
  };

  const deleteImage = async (ref) => {
    if (confirm("Are you sure you want to delete this image?")) {
      try {
        // Step 1: Delete from storage
        const docSnap = await getDoc(ref);
        const { url } = docSnap.data() || {};
        if (url) {
          const path = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
          const storage = await getStorage();
          const fileRef = storageRef(storage, path);
          await deleteObject(fileRef);
        }
  
        // Step 2: Delete Firestore doc
        await deleteDoc(ref);
  
        // Step 3: Update UI
        setPendingImages((prev) => prev.filter((img) => img.ref.id !== ref.id));
      } catch (err) {
        console.error("❌ Failed to delete image:", err);
        alert("Failed to delete image.");
      }
    }
  };

  if (!adminCheckComplete) {
    return <p className="text-center mt-10 text-gray-500">Checking admin status...</p>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">🖼️ Review Images Pending Approval</h1>

        {pendingImages.length === 0 ? (
          <p className="text-gray-500">No images awaiting moderation.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {pendingImages.map((img) => (
              <div key={img.id} className="bg-white p-4 rounded shadow border space-y-2">
                <img
                  src={img.url}
                  alt="Pending review image"
                  className="w-full h-48 object-cover rounded"
                />
                <p className="text-sm text-gray-700">{img.reviewText}</p>
                <p className="text-xs italic text-gray-500">by {img.reviewBy}</p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => approveImage(img.ref)}
                    className="px-4 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => deleteImage(img.ref)}
                    className="px-4 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    ❌ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
