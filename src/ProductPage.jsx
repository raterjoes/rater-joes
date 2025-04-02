import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  addDoc
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import ReviewForm from "./ReviewForm";
import { Link } from "react-router-dom";
import EditProductForm from "./EditProductForm";

export default function ProductPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);

  const [editing, setEditing] = useState(false);
  const [showLoginMessage, setShowLoginMessage] = useState(false);

  const handleReviewSubmit = async (review) => {
    if (!user) return;
  
    try {
      await addDoc(collection(db, "reviews"), {
        productId: id,
        text: review.text,
        rating: review.rating,
        userEmail: user.email,
        createdAt: new Date()
      });
    } catch (err) {
      console.error("Failed to submit review:", err);
      alert("Failed to submit review.");
    }
  };  

  useEffect(() => {
    const fetchProduct = async () => {
      const docRef = doc(db, "products", id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setProduct({ id: snapshot.id, ...snapshot.data() });
      }
    };

    fetchProduct();

    const q = query(collection(db, "reviews"), where("productId", "==", id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());
      setReviews(data);
    });

    return () => unsubscribe();
  }, [id]);

  if (!product) return <div className="text-center mt-10">Loading...</div>;

  const average =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : null;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Clean top-aligned back link */}
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:underline font-medium">
          ← Back to Home
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
      <p className="text-sm text-gray-500 mb-2">{product.category}</p>

      {average ? (
        <p className="text-yellow-500 mb-2">
          {"⭐".repeat(Math.round(average))} ({average})
        </p>
      ) : (
        <p className="text-gray-400 mb-2">Not yet rated</p>
      )}

      <button
        onClick={() => {
          if (user) {
            setEditing(true);
            setShowLoginMessage(false);
          } else {
            setShowLoginMessage(true);
          }
        }}
        className="text-sm text-blue-600 underline ml-2"
      >
        ✏️ Edit
      </button>

      <img
        src={product.image}
        alt={product.name}
        className="w-full h-64 object-cover rounded mb-4"
      />

      {editing ? (
        <EditProductForm
          product={product}
          onCancel={() => setEditing(false)}
          onSave={() => setEditing(false)}
        />
      ) : showLoginMessage ? (
        <p className="text-sm text-red-600 italic mb-6">
          You must be logged in to edit this product.
        </p>
      ) : (
        <p className="mb-6">{product.description}</p>
      )}

      {user ? (
        <ReviewForm onSubmit={handleReviewSubmit} />
      ) : (
        <p className="text-sm italic text-gray-600 mb-4">
          Please log in to leave a review.
        </p>
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold mb-2">Reviews</h2>
        {reviews.length ? (
          reviews.map((r, i) => (
            <div key={i} className="bg-gray-100 p-3 rounded">
              <div className="font-bold">{r.rating} ⭐</div>
              <p>{r.text}</p>
              {r.userEmail && (
                <p className="text-xs italic text-gray-600">by {r.userEmail}</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No reviews yet.</p>
        )}
      </div>
    </div>
  );
}