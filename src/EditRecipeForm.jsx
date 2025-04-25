import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import { useAuth } from "./AuthContext";

export default function EditRecipeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [imageInputs, setImageInputs] = useState([null]);
  const [existingImages, setExistingImages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return; // Wait for user to load
  
    const fetchData = async () => {
      const snapshot = await getDoc(doc(db, "recipes", id));
      if (snapshot.exists()) {
        const data = snapshot.data();
  
        if (user.uid !== data.userId) {
          alert("You are not authorized to edit this recipe.");
          navigate("/recipes");
          return;
        }
  
        setRecipe(data);
        setTitle(data.title);
        setDescription(data.description || "");
        setSteps(data.steps);
        setSelectedProducts(data.productIds || []);
        setExistingImages(data.images || []);
      }
  
      const productSnap = await getDocs(collection(db, "products"));
      const productList = productSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setProducts(productList);
    };
  
    fetchData();
  }, [id, user, navigate]);  

  const handleImageChange = (index, file) => {
    const updated = [...imageInputs];
    updated[index] = file;
    setImageInputs(updated);

    if (updated.every((f) => f !== null)) {
      setImageInputs([...updated, null]);
    }
  };

  const handleRemoveExistingImage = (index) => {
    const updated = [...existingImages];
    updated.splice(index, 1);
    setExistingImages(updated);
  };

  const handleRemoveNewImage = (index) => {
    const updated = [...imageInputs];
    updated.splice(index, 1);

    if (updated.length === 0 || updated.every((f) => f !== null)) {
      updated.push(null);
    }

    setImageInputs(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !steps || !user) return;
  
    const newImageUrls = [];
  
    // Upload new image files
    const uploadPromises = imageInputs.filter(Boolean).map(async (file) => {
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const imageRef = ref(storage, `recipe-images/${uniqueSuffix}-${file.name}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      newImageUrls.push(url);
    });
  
    await Promise.all(uploadPromises);
  
    const updatedImages = [...existingImages, ...newImageUrls];
  
    // ✅ Compare original recipe images to updated images to find which ones were deleted
    const deletedImages = (recipe.images || []).filter(
      (originalUrl) => !updatedImages.includes(originalUrl)
    );
  
    // ✅ Delete removed images from Firebase Storage
    for (const url of deletedImages) {
      try {
        const path = decodeURIComponent(
          new URL(url).pathname.split("/o/")[1].split("?")[0]
        );
        await deleteObject(ref(storage, path));
      } catch (err) {
        console.warn("Failed to delete image from storage:", url, err);
      }
    }
  
    // ✅ Update Firestore recipe document
    await updateDoc(doc(db, "recipes", id), {
      title,
      description,
      steps,
      productIds: selectedProducts,
      images: updatedImages,
    });
  
    alert("Recipe updated!");
    navigate(`/recipes/${id}`);
  };  

  const handleProductToggle = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  if (!recipe) return <p className="p-4">Loading recipe...</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 bg-white shadow rounded space-y-4">
      <h2 className="text-2xl font-bold mb-2">Edit Recipe</h2>

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
        <p className="font-semibold">Tagged Products:</p>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products..."
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
                    setSearchQuery("");
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
        <p className="font-semibold">Existing Images:</p>
        <div className="flex flex-wrap gap-2">
          {existingImages.map((url, index) => (
            <div key={index} className="relative inline-block">
              <img
                src={url}
                alt={`Image ${index + 1}`}
                className="w-24 h-24 object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => handleRemoveExistingImage(index)}
                className="absolute top-[-8px] right-[-8px] bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ✖
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="font-semibold">Upload New Images:</p>
        {imageInputs.map((file, index) => (
          <div key={index} className="relative mt-2">
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
                  onClick={() => handleRemoveNewImage(index)}
                  className="absolute top-[-8px] right-[-8px] bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  ✖
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Save Changes
      </button>
    </form>
  );
}