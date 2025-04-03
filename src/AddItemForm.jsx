import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [imageFile, setImageFile] = useState(null);
  const [description, setDescription] = useState("");

  const [isSeasonal, setIsSeasonal] = useState(false);
  const [season, setSeason] = useState("Winter");

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let imageUrl = "";

      if (imageFile) {
        const imageRef = ref(storage, `product-images/${Date.now()}-${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      const docRef = await addDoc(collection(db, "products"), {
        name,
        category,
        image: imageUrl,
        description,
        seasonal: isSeasonal,
        season: isSeasonal ? season : null,
        createdAt: serverTimestamp(),
        addedBy: user.email,
        approved: false
      });

      alert("Product added!");
      navigate("/");
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
              <Link to="/" className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">🏠 Home</Link>
              <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">🔐 Log In</Link>
              <Link to="/login" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">📝 Sign Up</Link>
            </div>
          </div>
        ) : (
          <div className="max-w-lg mx-auto mt-10 p-6 bg-white shadow rounded">
            <h2 className="text-2xl font-bold mb-4">Add a New Product</h2>

            {checkingDuplicates && (
              <p className="text-sm text-gray-500 mb-4">Checking for similar items...</p>
            )}

            {suggestedMatch && (
              <div className="bg-yellow-100 border border-yellow-400 p-3 rounded text-sm mb-4">
                <p className="font-semibold mb-1">Did you mean this item?</p>
                <p><strong>{suggestedMatch.name}</strong></p>
                <p className="text-sm text-gray-600 mb-2">{suggestedMatch.description}</p>
                <div className="flex gap-4 mt-2">
                  <button type="button" className="px-3 py-1 bg-gray-300 hover:bg-gray-400 rounded" onClick={() => navigate(`/products/${suggestedMatch.id}`)}>Yes, that's it</button>
                  <button type="button" className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded" onClick={() => setSuggestedMatch(null)}>No, continue adding</button>
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

              <input
                type="file"
                accept="image/*"
                className="w-full p-2 border rounded"
                onChange={(e) => setImageFile(e.target.files[0])}
              />

              <textarea
                placeholder="Description"
                className="w-full p-2 border rounded"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              {/* ✅ Seasonal checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="seasonal"
                  checked={isSeasonal}
                  onChange={(e) => setIsSeasonal(e.target.checked)}
                />
                <label htmlFor="seasonal" className="text-sm">Limited/Seasonal?</label>
              </div>

              {/* ✅ Season dropdown (if seasonal) */}
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

              {imageFile && (
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded"
                />
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