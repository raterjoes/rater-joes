import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import EditProductForm from "./EditProductForm";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        } else {
          // Product doesn't exist, redirect to not found page
          navigate(`/products/${id}/not-found`);
          return;
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        navigate(`/products/${id}/not-found`);
        return;
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  const handleSave = async (message) => {
    alert(message);
    navigate(`/products/${id}`);
  };

  const handleCancel = () => {
    navigate(`/products/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl animate-spin-slow mb-4">🛒</div>
            <p className="text-lg font-semibold">Loading product...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Edit Product: {product.name}</h1>
          <EditProductForm
            product={product}
            onCancel={handleCancel}
            onSave={handleSave}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
} 