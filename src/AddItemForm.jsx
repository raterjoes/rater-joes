import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
        <Link
          to="/"
          className="text-blue-600 hover:underline font-medium"
        >
          ← Back to Home
        </Link>
      </div>
  
      <div className="max-w-lg mx-auto mt-10 p-6 bg-white shadow rounded">
        <h2 className="text-2xl font-bold mb-4">Add a New Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Product Name"
            className="w-full p-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
