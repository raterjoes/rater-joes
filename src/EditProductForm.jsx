import { useState } from "react";
import { addDoc, collection, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, getStorage } from "./firebase";
import categories from "./categories";
import { useAuth } from "./AuthContext";
import Cropper from "react-cropper";
import "./assets/cropper.css";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

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
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropIndex, setCropIndex] = useState(null);
  const [cropperInstance, setCropperInstance] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isCroppingExisting, setIsCroppingExisting] = useState(false);

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
    setLoading(true);

    try {
      // 1. Upload new images
      const storage = await getStorage();
      const uploadTasks = newImageFiles
        .map((file, index) => {
          if (!file) return null;
          return (async () => {
            const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            const imageRef = ref(storage, `product-images/${uniqueSuffix}-${file.name}`);
            await uploadBytes(imageRef, file);
            const url = await getDownloadURL(imageRef);
            return { index, url };
          })();
        })
        .filter(Boolean);

      const uploadResults = await Promise.all(uploadTasks);
      const newImageUrls = uploadResults
        .sort((a, b) => a.index - b.index)
        .map((result) => result.url);
      const allImages = [...existingImages, ...newImageUrls];

      // 2. Save edit with all images
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
      setLoading(false);
    }
  };

  return (
    <>
      {loading ? (
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
                    className="w-24 h-24 object-cover rounded border cursor-pointer"
                    onClick={() => {
                      setLightboxIndex(index);
                      setLightboxOpen(true);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCropIndex(index);
                      setIsCroppingExisting(true);
                      setCropModalOpen(true);
                    }}
                    className="absolute bottom-[-10px] left-0 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    title="Crop"
                  >
                    ✂️
                  </button>
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
                      className="w-24 h-24 object-cover rounded border cursor-pointer"
                      onClick={() => {
                        setLightboxIndex(newImageFiles.filter(Boolean).indexOf(file));
                        setLightboxOpen(true);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCropIndex(index);
                        setCropModalOpen(true);
                      }}
                      className="absolute bottom-[-10px] left-0 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      title="Crop"
                    >
                      ✂️
                    </button>
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
      )}

      {/* Lightbox for new image previews */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={newImageFiles.filter(Boolean).map((file) => ({ src: URL.createObjectURL(file) }))}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio: 4 }}
      />

      {/* Lightbox for existing images */}
      <Lightbox
        open={lightboxOpen && cropIndex === null && isCroppingExisting === false}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={existingImages.map((url) => ({ src: url }))}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio: 4 }}
      />

      {/* Crop/Rotate Modal (support both existing and new images) */}
      {cropModalOpen && cropIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-4 relative w-full max-w-2xl h-[80vh] flex flex-col items-center justify-center mx-2">
            <div className="relative w-full h-[50vh] max-h-[60vw] bg-gray-100 rounded">
              <Cropper
                src={isCroppingExisting ? existingImages[cropIndex] : URL.createObjectURL(newImageFiles[cropIndex])}
                style={{ height: '100%', width: '100%' }}
                initialAspectRatio={NaN}
                aspectRatio={undefined}
                guides={true}
                viewMode={1}
                dragMode="move"
                background={false}
                responsive={true}
                autoCropArea={0.5}
                checkOrientation={false}
                onInitialized={setCropperInstance}
              />
            </div>
            <div className="flex gap-2 mt-4 justify-end w-full">
              <button
                type="button"
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                title="Rotate Left"
                onClick={() => cropperInstance && cropperInstance.rotate(-90)}
              >
                ⟲
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                title="Rotate Right"
                onClick={() => cropperInstance && cropperInstance.rotate(90)}
              >
                ⟳
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => { setCropModalOpen(false); setIsCroppingExisting(false); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={async () => {
                  if (cropperInstance) {
                    const canvas = cropperInstance.getCroppedCanvas();
                    canvas.toBlob((blob) => {
                      if (isCroppingExisting) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const updated = [...existingImages];
                          updated[cropIndex] = reader.result;
                          setExistingImages(updated);
                          setCropModalOpen(false);
                          setIsCroppingExisting(false);
                        };
                        reader.readAsDataURL(blob);
                      } else {
                        const croppedFile = new File([blob], newImageFiles[cropIndex].name, { type: newImageFiles[cropIndex].type });
                        const updated = [...newImageFiles];
                        updated[cropIndex] = croppedFile;
                        setNewImageFiles(updated);
                        setCropModalOpen(false);
                      }
                    }, isCroppingExisting ? 'image/png' : newImageFiles[cropIndex].type);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default EditProductForm;
