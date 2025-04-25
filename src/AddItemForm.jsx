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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import categories from "./categories";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function AddItemForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const prefillCategory = searchParams.get("category");
  const isValidPrefill = categories.includes(prefillCategory);
  const [category, setCategory] = useState(isValidPrefill ? prefillCategory : categories[0]);

  const [name, setName] = useState("");
  const [imageInputs, setImageInputs] = useState([null]);
  const [fileInputRefs, setFileInputRefs] = useState([useRef(null)]);
  const [description, setDescription] = useState("");
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [season, setSeason] = useState("Winter");
  const [submitted, setSubmitted] = useState(false);

  const [suggestedMatch, setSuggestedMatch] = useState(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

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
    const updated = [...imageInputs];
    updated[index] = file;
    setImageInputs(updated);
  
    if (updated.every((f) => f !== null)) {
      setImageInputs([...updated, null]);
      setFileInputRefs([...fileInputRefs, useRef(null)]); // add new ref
    }
  };  

  const handleRemoveImage = (index) => {
    const updatedInputs = [...imageInputs];
    const updatedRefs = [...fileInputRefs];
    if (fileInputRefs[index]?.current) {
      fileInputRefs[index].current.value = null;
    }    
  
    updatedInputs.splice(index, 1);
    updatedRefs.splice(index, 1);
  
    setImageInputs(
      updatedInputs.length === 0 || updatedInputs.every((f) => f !== null)
        ? [...updatedInputs, null]
        : updatedInputs
    );
    setFileInputRefs(
      updatedRefs.length === 0 || updatedRefs.every((r) => r !== null)
        ? [...updatedRefs, useRef(null)]
        : updatedRefs
    );
  };  

const moveImage = (fromIndex, toIndex) => {
  const updated = [...imageInputs];
  const [moved] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, moved);
  setImageInputs(updated);
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const imageUrls = [];

      for (const file of imageInputs.filter(Boolean)) {
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const imageRef = ref(storage, `product-images/${uniqueSuffix}-${file.name}`);
        await uploadBytes(imageRef, file);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
      }

      await addDoc(collection(db, "products"), {
        name,
        category,
        images: imageUrls,
        description,
        seasonal: isSeasonal,
        season: isSeasonal ? season : null,
        createdAt: serverTimestamp(),
        addedBy: user.email,
        approved: false
      });

      setSubmitted(true);
    } catch (err) {
      console.error("❌ Error submitting product:", err);
      alert("Error adding product");
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
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Another Item
            </button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto mt-10 p-6 bg-white shadow rounded">
            <h2 className="text-2xl font-bold mb-4">Add a New Product</h2>

            {checkingDuplicates && (
              <p className="text-sm text-gray-500 mb-4">
                Checking for similar items...
              </p>
            )}

            {suggestedMatch && (
              <div className="bg-yellow-100 border border-yellow-400 p-3 rounded text-sm mb-4">
                <p className="font-semibold mb-1">Did you mean this item?</p>
                <p>
                  <strong>{suggestedMatch.name}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  {suggestedMatch.description}
                </p>
                <div className="flex gap-4 mt-2">
                  <button
                    type="button"
                    className="px-3 py-1 bg-gray-300 hover:bg-gray-400 rounded"
                    onClick={() =>
                      navigate(`/products/${suggestedMatch.id}`)
                    }
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Product Name"
                className="w-full p-2 border rounded"
                value={name}
                onChange={(e) => {
                  const value = e.target.value;
                  setName(value);
                  checkForSimilarProduct(value);
                }}
                required
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border rounded"
              >
                {categories.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>

              {imageInputs.map((file, index) => {
                const isNextEmptyInput =
                  index > 0 && imageInputs[index] === null && imageInputs[index - 1] !== null;

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
                      ref={fileInputRefs[index]}
                      onChange={(e) => handleImageChange(index, e.target.files[0])}
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
                className="w-full p-2 border rounded"
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

              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Submit Product
              </button>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
