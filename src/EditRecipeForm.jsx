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
import { db, getStorage } from "./firebase";
import { useAuth } from "./AuthContext";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import Cropper from "react-cropper";
import "./assets/cropper.css";

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
  const [includeName, setIncludeName] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropIndex, setCropIndex] = useState(null);
  const [cropperInstance, setCropperInstance] = useState(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [existingCropModalOpen, setExistingCropModalOpen] = useState(false);
  const [existingCropIndex, setExistingCropIndex] = useState(null);
  const [existingCropperInstance, setExistingCropperInstance] = useState(null);
  const [existingLightboxOpen, setExistingLightboxOpen] = useState(false);
  const [existingLightboxIndex, setExistingLightboxIndex] = useState(0);

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
        setIncludeName(!!data.nickname); // Default checked if nickname exists
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

  const handleRemoveExistingImage = (index) => {
    const updated = [...existingImages];
    updated.splice(index, 1);
    setExistingImages(updated);
  };

  const handleRemoveNewImage = (index) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !steps || !user) return;
  
    const newImageUrls = [];
  
    // Upload new image files
    const uploadPromises = imageInputs.filter(Boolean).map(async (file) => {
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const imageRef = ref(await getStorage(), `recipe-images/${uniqueSuffix}-${file.name}`);
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
        await deleteObject(ref(await getStorage(), path));
      } catch (err) {
        console.warn("Failed to delete image from storage:", url, err);
      }
    }
  
    // Fetch nickname if includeName is checked
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
  
    // ✅ Update Firestore recipe document
    await updateDoc(doc(db, "recipes", id), {
      title,
      description,
      steps,
      productIds: selectedProducts,
      images: updatedImages,
      nickname: includeName ? nickname : null,
    });
  
    alert("Recipe updated!");
    navigate(`/recipes/${id}`);
  };  

  const handleProductToggle = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
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

  if (!recipe) return <p className="p-4">Loading recipe...</p>;

  return (
    <div className="flex flex-col min-h-screen bg-orange-50 text-gray-900">
      <Navbar />
  
      <main className="flex-grow">
        <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow rounded">
          <form onSubmit={handleSubmit} className="space-y-4">
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
  
            {/* Tagged Products */}
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
  
            {/* Existing Images */}
            <div>
              <p className="font-semibold">Existing Images:</p>
              <div className="flex flex-wrap gap-2">
                {existingImages.map((url, index) => (
                  <div key={index} className="relative inline-block">
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-24 h-24 object-cover rounded border cursor-pointer"
                      onClick={() => {
                        setExistingLightboxIndex(index);
                        setExistingLightboxOpen(true);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(index)}
                      className="absolute top-[-8px] right-[-8px] bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ✖
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExistingCropIndex(index);
                        setExistingCropModalOpen(true);
                      }}
                      className="absolute bottom-[-8px] right-[-8px] bg-blue-600 text-white rounded px-2 py-1 text-xs"
                    >
                      Crop/Rotate
                    </button>
                  </div>
                ))}
              </div>
            </div>
  
            {/* New image upload UI with preview, crop, rotate, and lightbox */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-1">Upload new images:</label>
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
                          onClick={() => handleRemoveNewImage(index)}
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
  
            {/* Username checkbox */}
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
              Save Changes
            </button>
          </form>
        </div>
      </main>
  
      <Footer />
  
      {/* Lightbox and Crop Modal INSIDE the return */}
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
  
      {/* Lightbox for existing images */}
      {existingLightboxOpen && (
        <Lightbox
          open={existingLightboxOpen}
          close={() => setExistingLightboxOpen(false)}
          index={existingLightboxIndex}
          slides={existingImages.map((src) => ({ src }))}
          plugins={[Zoom]}
          zoom={{ maxZoomPixelRatio: 4 }}
        />
      )}
  
      {/* Crop modal for existing images */}
      {existingCropModalOpen && existingCropIndex != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full flex flex-col items-center">
            <Cropper
              src={existingImages[existingCropIndex]}
              style={{ height: 300, width: "100%" }}
              guides={true}
              viewMode={1}
              dragMode="move"
              scalable={true}
              cropBoxResizable={true}
              cropBoxMovable={true}
              rotatable={true}
              onInitialized={setExistingCropperInstance}
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={async () => {
                  if (!existingCropperInstance || existingCropIndex == null) return;
                  existingCropperInstance.getCroppedCanvas().toBlob(async (blob) => {
                    if (blob) {
                      // Upload new image
                      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                      const fileName = `cropped-${uniqueSuffix}.png`;
                      const imageRef = ref(await getStorage(), `recipe-images/${fileName}`);
                      await uploadBytes(imageRef, blob);
                      const url = await getDownloadURL(imageRef);
                      // Delete old image from storage
                      try {
                        const path = decodeURIComponent(
                          new URL(existingImages[existingCropIndex]).pathname.split("/o/")[1].split("?")[0]
                        );
                        await deleteObject(ref(await getStorage(), path));
                      } catch (err) {
                        console.warn("Failed to delete old image from storage:", err);
                      }
                      // Update state
                      setExistingImages((prev) => {
                        const updated = [...prev];
                        updated[existingCropIndex] = url;
                        return updated;
                      });
                    }
                    setExistingCropModalOpen(false);
                    setExistingCropIndex(null);
                  }, "image/png");
                }}
              >
                Crop & Save
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                onClick={() => setExistingCropModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-blue-200 text-blue-800 rounded hover:bg-blue-300"
                onClick={() => existingCropperInstance && existingCropperInstance.rotate(90)}
              >
                Rotate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );  
}