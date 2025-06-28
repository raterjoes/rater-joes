import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db, getStorage } from "./firebase";
import { useParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ChevronDown } from "lucide-react";

export default function ReviewForm({ onSubmit }) {
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [includeName, setIncludeName] = useState(true);
  const [imageInputs, setImageInputs] = useState([null]);
  const [inputKey, setInputKey] = useState(0);

  const { id: productId } = useParams();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!user) {
        alert("You must be logged in to submit a review.");
        return;
      }

      let nickname = null;
      if (includeName) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          nickname = userDoc.data().nickname || null;
        }
      }

      const reviewRef = await addDoc(collection(db, "reviews"), {
        productId,
        text,
        rating,
        includeName,
        nickname: includeName ? nickname : null,
        userEmail: includeName ? user.email : null,
        createdAt: serverTimestamp(),
      });

      const imageFiles = imageInputs.filter(Boolean);

      await Promise.all(
        imageFiles.map(async (file) => {
          const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
          const storage = await getStorage();
          const storageRef = ref(storage, `review-images/${uniqueName}-${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);

          await addDoc(collection(db, `reviews/${reviewRef.id}/images`), {
            url,
            approved: false,
            uploadedAt: serverTimestamp(),
          });
        })
      );

      onSubmit?.();
      setText("");
      setRating(5);
      setIncludeName(true);
      setImageInputs([null]);
      setInputKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("Failed to submit review. Please try again.");
    }
  };

  return (
    <div className="bg-green-500/20 border border-gray-300 p-6 rounded shadow mt-6">
      <div
        className="flex justify-between items-center cursor-pointer mb-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-xl font-semibold">Leave a Review</h3>
        <ChevronDown
          className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
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

          <div>
            <label className="block text-sm font-medium mb-1">Upload images:</label>
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

          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Submit Review
          </button>
      </form>
    </div>
    </div>
  );
}