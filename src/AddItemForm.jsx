import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { ref, uploadBytes, getDownloadURL, listAll } from "firebase/storage";
import { getStorage } from "./firebase";
import categories from "./categories";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { addMonths } from 'date-fns';

export default function AddItemForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const prefillCategory = searchParams.get("category");
  const isValidPrefill = categories.includes(prefillCategory);
  const [category, setCategory] = useState(isValidPrefill ? prefillCategory : categories[0]);

  const [name, setName] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const debounceTimeout = useRef();
  const [imageInputs, setImageInputs] = useState([null]);
  const fileInputRefs = useRef([]);
  const [description, setDescription] = useState("");
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [season, setSeason] = useState("Winter");
  const [submitted, setSubmitted] = useState(false);

  const [suggestedMatch, setSuggestedMatch] = useState(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const [loading, setLoading] = useState(false);

  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (imageInputs.length === 0 || imageInputs.every((f) => f !== null)) {
      setImageInputs((prev) => [...prev, null]);
    }
  }, [imageInputs]);  

  // Debounce the name input for similarity check
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedName(name);
    }, 300);
    return () => clearTimeout(debounceTimeout.current);
  }, [name]);

  // Only check for similar product if 3+ characters
  useEffect(() => {
    if (debouncedName.length >= 3) {
      checkForSimilarProduct(debouncedName);
    } else {
      setSuggestedMatch(null);
    }
    // eslint-disable-next-line
  }, [debouncedName]);

  const checkForSimilarProduct = async (inputName) => {
    setCheckingDuplicates(true);
    const snapshot = await getDocs(collection(db, "products"));
    const normalizedInput = inputName.toLowerCase();

    let bestMatch = null;
    snapshot.forEach((doc) => {
      const p = doc.data();
      const name = p.name.toLowerCase();
      const similarity =
        normalizedInput.includes(name) || name.includes(normalizedInput);
      if (similarity && name !== normalizedInput) {
        bestMatch = { id: doc.id, ...p };
      }
    });

    setSuggestedMatch(bestMatch);
    setCheckingDuplicates(false);
  };

  const handleImageChange = (index, file) => {
    const updatedInputs = [...imageInputs];
    updatedInputs[index] = file;
    setImageInputs(updatedInputs);
  };    

  const handleRemoveImage = (index) => {
    // Clear the file input field
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = null;
    }
  
    // Remove image and ref at index
    const updatedInputs = [...imageInputs];
    updatedInputs.splice(index, 1);
    fileInputRefs.current.splice(index, 1);
  
    // If all are filled, add a new empty slot
    if (updatedInputs.length === 0 || updatedInputs.every((f) => f !== null)) {
      updatedInputs.push(null);
    }
  
    setImageInputs(updatedInputs);
  };  

const moveImage = (fromIndex, toIndex) => {
  const updated = [...imageInputs];
  const [moved] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, moved);
  setImageInputs(updated);
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get lazy-loaded storage
      const storage = await getStorage();
      
      // 🔥 Create upload tasks with original index attached
      const uploadTasks = imageInputs
        .map((file, index) => {
          if (!file) return null;
          return (async () => {
            const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            const imageRef = ref(storage, `product-images/${uniqueSuffix}-${file.name}`);
            await uploadBytes(imageRef, file);
            const url = await getDownloadURL(imageRef);

            // Poll for the thumbnail in thumbs/ (wait up to 10s)
            const thumbName = `${uniqueSuffix}-${file.name}`.replace(/\.[^/.]+$/, '') + `_200x200` + file.name.slice(file.name.lastIndexOf('.'));
            const thumbRef = ref(storage, `product-images/thumbs/${thumbName}`);
            let thumbUrl = null;
            for (let i = 0; i < 20; i++) { // Try for up to 10s
              try {
                thumbUrl = await getDownloadURL(thumbRef);
                break;
              } catch (err) {
                await new Promise(res => setTimeout(res, 500));
              }
            }
            return { index, url, thumbUrl };
          })();
        })
        .filter(Boolean);

      // 🔥 Run all uploads in parallel
      const uploadResults = await Promise.all(uploadTasks);

      // 🔥 Sort the uploaded images by original index
      const imageUrls = uploadResults
        .sort((a, b) => a.index - b.index)
        .map((result) => result.url);
      const thumbnailUrls = uploadResults
        .sort((a, b) => a.index - b.index)
        .map((result) => result.thumbUrl || null);

      // ✅ Save product with images and thumbnails in correct order
      await addDoc(collection(db, "products"), {
        name,
        category,
        images: imageUrls,
        thumbnailUrls,
        description,
        seasonal: isSeasonal,
        season: isSeasonal ? season : null,
        newUntil: isNew ? addMonths(new Date(), 6).toISOString() : null,
        createdAt: serverTimestamp(),
        addedBy: user.email,
        approved: false
      });

      setSubmitted(true);
      setIsNew(false);
    } catch (err) {
      console.error("❌ Error submitting product:", err);
      alert("Error adding product");
    } finally {
    setLoading(false); // ✅ Always stop loading at the end
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow">
        {!user ? (
          <div className="text-center mt-10 space-y-4">
            <p className="text-red-600 font-medium text-lg">
              You must be logged in to add a new item.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="/"
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                🏠 Home
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                🔐 Log In
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                📝 Sign Up
              </Link>
            </div>
          </div>
        ) : submitted ? (
          <div className="max-w-lg mx-auto mt-10 p-6 bg-white shadow rounded text-center">
            <h2 className="text-2xl font-bold mb-4 text-green-700">
              ✅ Product submitted for admin review!
            </h2>
            <button
              onClick={() => {
                setSubmitted(false);
                setName("");
                setCategory(isValidPrefill ? prefillCategory : categories[0]);
                setImageInputs([null]);
                setDescription("");
                setIsSeasonal(false);
                setSeason("Winter");
                setSuggestedMatch(null);
                setCheckingDuplicates(false);
                setIsNew(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Another Item
            </button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto mt-10 p-6 bg-white shadow rounded">
            <h2 className="text-2xl font-bold mb-4">Add a New Product</h2>

            <form onSubmit={handleSubmit}>
              {/* Only show suggestion area and reserve space if checking or suggestion exists */}
              {(checkingDuplicates || suggestedMatch) && (
                <div style={{ minHeight: '40px' }}>
                  {checkingDuplicates && (
                    <p className="text-sm text-gray-500 mb-2">
                      Checking for similar items...
                    </p>
                  )}

                  {suggestedMatch && (
                    <div className="bg-yellow-100 border border-yellow-400 p-3 rounded text-sm mb-2">
                      <p className="font-semibold mb-1">Did you mean this item?</p>
                      <p>
                        <strong>{suggestedMatch.name}</strong>
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        {suggestedMatch.description}
                      </p>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          className="px-3 py-1 bg-gray-300 hover:bg-gray-400 rounded"
                          onClick={() => navigate(`/products/${suggestedMatch.id}`)}
                        >
                          Yes, that's it
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded"
                          onClick={() => setSuggestedMatch(null)}
                        >
                          No, continue adding
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <input
                type="text"
                placeholder="Product Name"
                className="w-full p-2 border rounded mt-4"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border rounded mt-2"
              >
                {categories.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>

              {imageInputs.map((file, index) => {
                const isNextEmptyInput =
                  index > 0 &&
                  imageInputs[index] === null &&
                  imageInputs[index - 1] !== null;

                return (
                  <div key={index} className="relative mt-2">
                    {isNextEmptyInput && (
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Add another image?
                      </p>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => (fileInputRefs.current[index] = el)}
                      onChange={(e) =>
                        handleImageChange(index, e.target.files[0])
                      }
                      className="w-full p-2 border rounded"
                    />
                    {file && (
                      <div className="relative inline-block mt-2 mr-2">
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

                        {/* Reorder buttons */}
                        <div className="absolute bottom-[-10px] right-0 flex gap-1 text-xs">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveImage(index, index - 1)}
                              className="px-1 py-0.5 bg-gray-200 rounded hover:bg-gray-300"
                            >
                              ↑
                            </button>
                          )}
                          {index < imageInputs.length - 2 && (
                            <button
                              type="button"
                              onClick={() => moveImage(index, index + 1)}
                              className="px-1 py-0.5 bg-gray-200 rounded hover:bg-gray-300"
                            >
                              ↓
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <textarea
                placeholder="Description"
                className="w-full p-2 border rounded mt-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="seasonal"
                  checked={isSeasonal}
                  onChange={(e) => setIsSeasonal(e.target.checked)}
                />
                <label htmlFor="seasonal" className="text-sm">
                  Limited/Seasonal?
                </label>
              </div>

              {isSeasonal && (
                <div className="flex items-center gap-2">
                  <label htmlFor="season" className="text-sm font-medium">
                    Season:
                  </label>
                  <select
                    id="season"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="flex-grow p-2 border rounded"
                  >
                    <option>Winter</option>
                    <option>Spring</option>
                    <option>Summer</option>
                    <option>Fall</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="new"
                  checked={isNew}
                  onChange={(e) => setIsNew(e.target.checked)}
                />
                <label htmlFor="new" className="text-sm">
                  New Item?
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 mt-4"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Product"}
              </button>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
