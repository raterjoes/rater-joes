import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { db, storage } from "./firebase";
import { useParams } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ReviewForm({ onSubmit }) {
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [includeName, setIncludeName] = useState(true);
  const [imageInputs, setImageInputs] = useState([null]);
  const [inputKey, setInputKey] = useState(0); // ✅ force input re-render on reset

  const { id: productId } = useParams();
  const { user } = useAuth();

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

      const reviewRef = await addDoc(collection(db, "reviews"), {
        productId,
        text,
        rating,
        includeName,
        nickname: includeName ? (user.displayName || user.email || null) : null,
        userEmail: user.email,
        createdAt: serverTimestamp(),
      });

      const imageFiles = imageInputs.filter(Boolean);

      await Promise.all(
        imageFiles.map(async (file) => {
          const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
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
      setInputKey((prev) => prev + 1); // ✅ force input reset
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("Failed to submit review. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                key={`${index}-${inputKey}`} // ✅ forces input to reset
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
  );
}
