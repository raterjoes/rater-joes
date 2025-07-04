import { useState, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, updateDoc, doc, getDoc, addDoc, deleteDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db, getStorage } from "./firebase";
import { useAuth } from "./AuthContext";

export default function EditReviewForm({ review, onCancel, onSave }) {
  const { user } = useAuth();
  const [text, setText] = useState(review.text || "");
  const [rating, setRating] = useState(review.rating || 5);
  const [includeName, setIncludeName] = useState(!!review.nickname);
  const [imageInputs, setImageInputs] = useState([null]);
  const [existingImages, setExistingImages] = useState(review.images || []);
  const [loading, setLoading] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  useEffect(() => {
    // Load existing images from the review's images subcollection
    const loadExistingImages = async () => {
      try {
        const imageDocs = await getDocs(collection(db, `reviews/${review.id}/images`));
        const allImages = imageDocs.docs.map((imgDoc) => imgDoc.data());
        const approvedImages = allImages.filter((img) => img.approved);
        setExistingImages(approvedImages);
      } catch (err) {
        console.error("Error loading existing images:", err);
      }
    };
    loadExistingImages();
  }, [review.id]);

  const handleImageChange = (index, file) => {
    const updated = [...imageInputs];
    updated[index] = file;
    setImageInputs(updated);

    if (updated.every((f) => f !== null)) {
      setImageInputs([...updated, null]);
    }
  };

  const handleRemoveImage = (index) => {
    const updated = [...imageInputs];
    updated.splice(index, 1);

    if (updated.length === 0 || updated.every((f) => f !== null)) {
      updated.push(null);
    }

    setImageInputs(updated);
  };

  const handleRemoveExistingImage = async (imageUrl) => {
    if (!confirm("Are you sure you want to remove this image?")) return;
    
    try {
      // Find the image document in the subcollection
      const imageDocs = await getDocs(collection(db, `reviews/${review.id}/images`));
      const imageDoc = imageDocs.docs.find(doc => doc.data().url === imageUrl);
      
      if (imageDoc) {
        // Delete from storage
        const path = decodeURIComponent(imageUrl.split("/o/")[1].split("?")[0]);
        const storage = await getStorage();
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
        
        // Delete from Firestore
        await deleteDoc(imageDoc.ref);
      }
      
      setExistingImages(prev => prev.filter(img => img.url !== imageUrl));
    } catch (err) {
      console.error("Error removing image:", err);
      alert("Failed to remove image.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        alert("You must be logged in to edit a review.");
        return;
      }

      let nickname = null;
      if (includeName) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          nickname = userDoc.data().nickname || null;
        }
      }

      // Upload new images
      const newImageFiles = imageInputs.filter(Boolean);
      const newImagePromises = newImageFiles.map(async (file) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const storage = await getStorage();
        const storageRef = ref(storage, `review-images/${uniqueName}-${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        return addDoc(collection(db, `reviews/${review.id}/images`), {
          url,
          approved: false,
          uploadedAt: serverTimestamp(),
        });
      });

      await Promise.all(newImagePromises);

      // Update the review document
      await updateDoc(doc(db, "reviews", review.id), {
        text,
        rating,
        nickname: includeName ? nickname : null,
        userEmail: includeName ? user.email : null,
        updatedAt: serverTimestamp(),
      });

      onSave?.();
    } catch (err) {
      console.error("Error updating review:", err);
      alert("Failed to update review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-500/20 border border-gray-300 p-6 rounded shadow mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Edit Review</h3>
        <button
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-800"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your review..."
          className="w-full p-2 border rounded"
          required
        />

        <div>
          <label className="mr-2">Rating:</label>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="p-2 border rounded"
          >
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                {r} ⭐
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeName"
            checked={includeName}
            onChange={(e) => setIncludeName(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="includeName" className="text-sm">
            Include my username in this review
          </label>
        </div>

        {/* Existing Images */}
        {existingImages.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Current images:</label>
            <div className="flex gap-2 flex-wrap">
              {existingImages.map((img, index) => (
                <div key={index} className="relative">
                  <img
                    src={img.url}
                    alt={`Review image ${index + 1}`}
                    className="w-24 h-24 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(img.url)}
                    className="absolute top-[-8px] right-[-8px] bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ✖
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Images */}
        <div>
          <label className="block text-sm font-medium mb-1">Add new images:</label>
          {imageInputs.map((file, index) => {
            const isNextEmptyInput =
              index > 0 && imageInputs[index] === null && imageInputs[index - 1] !== null;

            return (
              <div key={`${index}-${inputKey}`} className="relative mt-2">
                {isNextEmptyInput && (
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Add another image?
                  </p>
                )}
                <input
                  key={`${index}-${inputKey}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(index, e.target.files[0])}
                  className="w-full p-2 border rounded"
                />
                {file && (
                  <div className="relative inline-block mt-2">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-24 h-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-[-8px] right-[-8px] bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ✖
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Review"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 