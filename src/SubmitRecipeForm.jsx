import { useState, useEffect } from "react";
import { db, storage } from "./firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "./AuthContext";

export default function SubmitRecipeForm() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [image, setImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      const snapshot = await getDocs(collection(db, "products"));
      const productList = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setProducts(productList);
    };
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !title || !steps) return;

    let imageUrl = "";
    if (image) {
      const storageRef = ref(storage, `recipe-images/${Date.now()}-${image.name}`);
      await uploadBytes(storageRef, image);
      imageUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, "recipes"), {
      title,
      description,
      steps,
      productIds: selectedProducts,
      imageUrl,
      createdAt: serverTimestamp(),
      userId: user.uid,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setSteps("");
    setSelectedProducts([]);
    setImage(null);
    alert("Recipe submitted!");
  };

  const handleProductToggle = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 bg-white shadow rounded space-y-4">
      <h2 className="text-2xl font-bold mb-2">Submit a Recipe</h2>

      <input
        type="text"
        placeholder="Recipe title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />

      <textarea
        placeholder="Short description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full p-2 border rounded"
        rows={2}
      />

      <textarea
        placeholder="Steps / ingredients"
        value={steps}
        onChange={(e) => setSteps(e.target.value)}
        className="w-full p-2 border rounded"
        rows={5}
        required
      />

        <div className="space-y-2">
        <p className="font-semibold">Tag Trader Joe's products:</p>

        {/* Search input */}
        <input
            type="text"
            placeholder="Type to search products..."
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border rounded"
        />

        {/* Filtered options */}
        {searchQuery && (
            <ul className="bg-white border rounded shadow max-h-40 overflow-y-auto">
            {products
                .filter(
                (p) =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                    !selectedProducts.includes(p.id)
                )
                .map((p) => (
                <li
                    key={p.id}
                    onClick={() => {
                    setSelectedProducts([...selectedProducts, p.id]);
                    setSearchQuery(""); // Clear search after select
                    }}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                >
                    {p.name}
                </li>
                ))}
            </ul>
        )}

        {/* Selected products */}
        {selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2">
            {selectedProducts.map((id) => {
                const product = products.find((p) => p.id === id);
                return (
                <span
                    key={id}
                    className="bg-rose-200 text-rose-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"
                >
                    {product?.name}
                    <button
                    type="button"
                    onClick={() =>
                        setSelectedProducts((prev) => prev.filter((pid) => pid !== id))
                    }
                    className="text-rose-800 hover:text-red-600"
                    >
                    ×
                    </button>
                </span>
                );
            })}
            </div>
        )}
        </div>

      <div>
        <p className="font-semibold">Upload a photo:</p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />
        {image && (
          <img
            src={URL.createObjectURL(image)}
            alt="preview"
            className="w-32 h-32 object-cover mt-2 rounded border"
          />
        )}
      </div>

      <button
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Submit Recipe
      </button>
    </form>
  );
}