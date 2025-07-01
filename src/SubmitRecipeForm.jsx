import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db, getStorage } from "./firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "./AuthContext";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import Cropper from "react-cropper";
import "./assets/cropper.css";

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
  const [includeName, setIncludeName] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropIndex, setCropIndex] = useState(null);
  const [cropperInstance, setCropperInstance] = useState(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);

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
    if (!file) return;
    const updated = [...imageInputs];
    updated[index] = file;
    setImageInputs(updated);

    // Update preview URLs
    const previewUrls = [...imagePreviewUrls];
    previewUrls[index] = URL.createObjectURL(file);
    setImagePreviewUrls(previewUrls);

    if (updated.every((f) => f !== null)) {
      setImageInputs([...updated, null]);
      setImagePreviewUrls([...previewUrls, null]);
    }
  };

  const handleRemoveImage = (index) => {
    const updated = [...imageInputs];
    updated.splice(index, 1);
    const previewUrls = [...imagePreviewUrls];
    previewUrls.splice(index, 1);

    if (updated.length === 0 || updated.every((f) => f !== null)) {
      updated.push(null);
      previewUrls.push(null);
    }

    setImageInputs(updated);
    setImagePreviewUrls(previewUrls);
  };

  const openCropModal = (index) => {
    setCropIndex(index);
    setCropModalOpen(true);
  };

  const handleCrop = () => {
    if (!cropperInstance || cropIndex == null) return;
    cropperInstance.getCroppedCanvas().toBlob((blob) => {
      if (blob) {
        const file = new File([blob], imageInputs[cropIndex].name, { type: blob.type });
        const updated = [...imageInputs];
        updated[cropIndex] = file;
        setImageInputs(updated);
        // Update preview
        const previewUrls = [...imagePreviewUrls];
        previewUrls[cropIndex] = URL.createObjectURL(file);
        setImagePreviewUrls(previewUrls);
      }
      setCropModalOpen(false);
      setCropIndex(null);
    }, imageInputs[cropIndex].type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !title || !steps) return;

    const imageUrls = [];

    const uploadPromises = imageInputs
      .filter(Boolean)
      .map(async (file) => {
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const imageRef = ref(await getStorage(), `recipe-images/${uniqueSuffix}-${file.name}`);
        await uploadBytes(imageRef, file);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
      });

    await Promise.all(uploadPromises);

    let nickname = null;
    if (includeName) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          nickname = userDoc.data().nickname || null;
        }
      } catch (err) {
        nickname = null;
      }
    }

    await addDoc(collection(db, "recipes"), {
      title,
      description,
      steps,
      productIds: selectedProducts,
      images: imageUrls,
      createdAt: serverTimestamp(),
      userId: user.uid,
      nickname: includeName ? nickname : null,
      approved: false,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setSteps("");
    setSelectedProducts([]);
    setImageInputs([null]);
    setIncludeName(true);
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

      <div className="space-y-2">
        <label className="block text-sm font-medium mb-1">Upload images:</label>
        {imageInputs.map((file, index) => {
          const isNextEmptyInput =
            index > 0 && imageInputs[index] === null && imageInputs[index - 1] !== null;
          return (
            <div key={index} className="relative mt-2 flex items-center gap-4">
              {isNextEmptyInput && (
                <p className="text-sm font-medium text-gray-700 mb-1">Add another image?</p>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(index, e.target.files[0])}
                className="w-full max-w-xs p-2 border rounded text-sm"
              />
              {file && (
                <>
                  <img
                    src={imagePreviewUrls[index]}
                    alt={`Preview ${index + 1}`}
                    className="w-24 h-24 object-cover rounded border cursor-pointer"
                    onClick={() => {
                      setLightboxIndex(index);
                      setLightboxOpen(true);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="ml-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ✖
                  </button>
                  <button
                    type="button"
                    onClick={() => openCropModal(index)}
                    className="ml-2 bg-blue-600 text-white rounded px-2 py-1 text-xs"
                  >
                    Crop/Rotate
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="includeName"
          checked={includeName}
          onChange={e => setIncludeName(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="includeName" className="text-sm">
          Include my username in this recipe
        </label>
      </div>

      <button
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Submit Recipe
      </button>

      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={imagePreviewUrls.filter(Boolean).map((src) => ({ src }))}
          plugins={[Zoom]}
          zoom={{ maxZoomPixelRatio: 4 }}
        />
      )}

      {cropModalOpen && cropIndex != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full flex flex-col items-center">
            <Cropper
              src={imagePreviewUrls[cropIndex]}
              style={{ height: 300, width: "100%" }}
              // aspectRatio={1}
              guides={true}
              viewMode={1}
              dragMode="move"
              scalable={true}
              cropBoxResizable={true}
              cropBoxMovable={true}
              rotatable={true}
              onInitialized={setCropperInstance}
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleCrop}
              >
                Crop & Save
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                onClick={() => setCropModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-blue-200 text-blue-800 rounded hover:bg-blue-300"
                onClick={() => cropperInstance && cropperInstance.rotate(90)}
              >
                Rotate 90°
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}