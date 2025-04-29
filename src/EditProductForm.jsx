import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import categories from "./categories";
import { useAuth } from "./AuthContext";

function EditProductForm({ product, onCancel, onSave }) {
  const { user } = useAuth();

  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [existingImages, setExistingImages] = useState(product.images || []);
  const [newImageFiles, setNewImageFiles] = useState([null]);
  const [description, setDescription] = useState(product.description);
  const [isSeasonal, setIsSeasonal] = useState(product.seasonal || false);
  const [season, setSeason] = useState(product.season || "Winter");

  const [loading, setLoading] = useState(false); // ✅ Add loading state

  const handleImageRemove = (urlToRemove) => {
    setExistingImages((prev) => prev.filter((url) => url !== urlToRemove));
  };

  const handleNewImageChange = (index, file) => {
    const updated = [...newImageFiles];
    updated[index] = file;
    setNewImageFiles(updated);

    if (updated.every((f) => f !== null)) {
      setNewImageFiles([...updated, null]);
    }
  };

  const handleRemoveNewImage = (index) => {
    const updated = [...newImageFiles];
    updated.splice(index, 1);

    if (updated.length === 0 || updated.every((f) => f !== null)) {
      updated.push(null);
    }

    setNewImageFiles(updated);
  };

  const moveNewImage = (fromIndex, toIndex) => {
    const updated = [...newImageFiles];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setNewImageFiles(updated);
  };

  const moveExistingImage = (fromIndex, toIndex) => {
    const updated = [...existingImages];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setExistingImages(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // ✅ Start loading

    try {
      const uploadedImageUrls = [];

      for (const file of newImageFiles.filter(Boolean)) {
        const imageRef = ref(
          storage,
          `product-images/${Date.now()}-${file.name}`
        );
        await uploadBytes(imageRef, file);
        const url = await getDownloadURL(imageRef);
        uploadedImageUrls.push(url);
      }

      const allImages = [...existingImages, ...uploadedImageUrls];

      await addDoc(collection(db, "product_edits"), {
        productId: product.id,
        name,
        category,
        images: allImages,
        description,
        seasonal: isSeasonal,
        season: isSeasonal ? season : null,
        approved: false,
        editedBy: user.email,
        createdAt: serverTimestamp(),
      });

      onSave("✅ Edit submitted for admin review.");
    } catch (err) {
      console.error("Error submitting edit:", err);
      alert("Error submitting edit");
    } finally {
      setLoading(false); // ✅ Always stop loading
    }
  };

  return loading ? (
    <div className="flex flex-col items-center justify-center mt-10 space-y-2 text-gray-700">
      <div className="text-4xl animate-spin-slow">🛒</div>
      <p className="text-lg font-semibold">Uploading your edit...</p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      {/* Form content stays here! */}
      <input
        type="text"
        value={name}
        className="w-full p-2 border rounded"
        onChange={(e) => setName(e.target.value)}
        required
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full p-2 border rounded"
      >
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>

      {/* Existing images */}
      {existingImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Current Images:</p>
          {existingImages.map((url, index) => (
            <div key={index} className="relative inline-block mr-2">
              <img
                src={url}
                alt={`Existing ${index + 1}`}
                className="w-24 h-24 object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => handleImageRemove(url)}
                className="absolute top-[-8px] right-[-8px] bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ✖
              </button>

              <div className="absolute bottom-[-10px] right-0 flex gap-1 text-xs">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveExistingImage(index, index - 1)}
                    className="px-1 py-0.5 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    ←
                  </button>
                )}
                {index < existingImages.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveExistingImage(index, index + 1)}
                    className="px-1 py-0.5 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New image uploads */}
      {newImageFiles.map((file, index) => {
        const showAddLabel =
          newImageFiles[index] === null &&
          (index > 0
            ? newImageFiles[index - 1] !== null
            : existingImages.length > 0);

        return (
          <div key={index} className="relative mt-2">
            {showAddLabel && (
              <p className="text-sm font-medium text-gray-700 mb-1">
                Add another image?
              </p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleNewImageChange(index, e.target.files[0])}
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
                  onClick={() => handleRemoveNewImage(index)}
                  className="absolute top-[-8px] right-[-8px] bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  ✖
                </button>

                <div className="absolute bottom-[-10px] right-0 flex gap-1 text-xs">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveNewImage(index, index - 1)}
                      className="px-1 py-0.5 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      ←
                    </button>
                  )}
                  {index < newImageFiles.length - 1 && newImageFiles[index + 1] !== null && (
                    <button
                      type="button"
                      onClick={() => moveNewImage(index, index + 1)}
                      className="px-1 py-0.5 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full p-2 border rounded"
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
          Seasonal?
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

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Submit for Review
        </button>
      </div>
    </form>
  );
}

export default EditProductForm;
