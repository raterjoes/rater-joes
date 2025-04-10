import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const prefillProductId = searchParams.get("product");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [imageInputs, setImageInputs] = useState([null]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      const snapshot = await getDocs(collection(db, "products"));
      const productList = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setProducts(productList);

      // ✅ Pre-fill product if valid
      if (prefillProductId && productList.some((p) => p.id === prefillProductId)) {
        setSelectedProducts([prefillProductId]);
      }
    };
    fetchProducts();
  }, [prefillProductId]);

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
    if (!user || !title || !steps) return;

    const imageUrls = [];

    const uploadPromises = imageInputs
      .filter(Boolean)
      .map(async (file) => {
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const imageRef = ref(storage, `recipe-images/${uniqueSuffix}-${file.name}`);
        await uploadBytes(imageRef, file);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
      });

    await Promise.all(uploadPromises);

    await addDoc(collection(db, "recipes"), {
      title,
      description,
      steps,
      productIds: selectedProducts,
      images: imageUrls,
      createdAt: serverTimestamp(),
      userId: user.uid,
      approved: false,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setSteps("");
    setSelectedProducts([]);
    setImageInputs([null]);
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

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Type to search products..."
          className="w-full p-2 border rounded"
        />

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
                      setSelectedProducts((prev) =>
                        prev.filter((pid) => pid !== id)
                      )
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
        <p className="font-semibold">Upload image(s):</p>
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

      <button
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Submit Recipe
      </button>
    </form>
  );
}