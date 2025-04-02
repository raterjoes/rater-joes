import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { Link } from "react-router-dom";

export default function AddItemForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Produce");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");

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

  if (!user) {
    return (
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
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, "products"), {
        name,
        category,
        image,
        description,
        createdAt: serverTimestamp(),
        addedBy: user.email,
      });
      alert("Product added!");
      navigate("/");
    } catch (err) {
      alert("Error adding product");
      console.error(err);
    }
  };

  return (
    <>
      <div className="absolute top-4 left-4">
        <Link to="/" className="text-blue-600 hover:underline font-medium">
          ← Back to Home
        </Link>
      </div>

      <div className="max-w-lg mx-auto mt-10 p-6 bg-white shadow rounded">
        <h2 className="text-2xl font-bold mb-4">Add a New Product</h2>

        {/* ✅ Duplicate suggestion */}
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
                onClick={() => {
                  setName(suggestedMatch.name);
                  setSuggestedMatch(null);
                }}
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
            <option>Produce</option>
            <option>Frozen Foods</option>
            <option>Desserts</option>
          </select>

          <input
            type="url"
            placeholder="Image URL"
            className="w-full p-2 border rounded"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />

          <textarea
            placeholder="Description"
            className="w-full p-2 border rounded"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Submit Product
          </button>
        </form>
      </div>
    </>
  );
}