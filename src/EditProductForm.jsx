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
  const [imageUrl, setImageUrl] = useState(product.image);
  const [newImageFile, setNewImageFile] = useState(null);
  const [description, setDescription] = useState(product.description);
  const [isSeasonal, setIsSeasonal] = useState(product.seasonal || false);
  const [season, setSeason] = useState(product.season || "Winter");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let finalImageUrl = imageUrl;

      if (newImageFile) {
        const imageRef = ref(
          storage,
          `product-images/${Date.now()}-${newImageFile.name}`
        );
        await uploadBytes(imageRef, newImageFile);
        finalImageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "product_edits"), {
        productId: product.id,
        name,
        category,
        image: finalImageUrl,
        description,
        seasonal: isSeasonal,
        season: isSeasonal ? season : null,
        approved: false,
        editedBy: user.email,
        createdAt: serverTimestamp(),
      });

      onSave("✅ Edit submitted for admin review."); // Pass message to parent
    } catch (err) {
      alert("Error submitting edit");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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

      {newImageFile ? (
        <img
          src={URL.createObjectURL(newImageFile)}
          alt="Preview"
          className="w-full h-48 object-cover rounded"
        />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt="Current"
          className="w-full h-48 object-cover rounded"
        />
      ) : null}

      <input
        type="file"
        accept="image/*"
        className="w-full p-2 border rounded"
        onChange={(e) => setNewImageFile(e.target.files[0])}
      />

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