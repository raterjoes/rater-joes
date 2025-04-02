import { useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import categories from "./categories"; // ✅ import the shared categories list

function EditProductForm({ product, onCancel, onSave }) {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [image, setImage] = useState(product.image);
  const [description, setDescription] = useState(product.description);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const ref = doc(db, "products", product.id);
      await updateDoc(ref, {
        name,
        category,
        image,
        description,
      });
      onSave();
    } catch (err) {
      alert("Error updating product");
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

      <input
        type="text"
        value={image}
        className="w-full p-2 border rounded"
        onChange={(e) => setImage(e.target.value)}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />

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
          Save Changes
        </button>
      </div>
    </form>
  );
}

export default EditProductForm;