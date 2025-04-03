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
  addDoc,
  serverTimestamp,
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

    const { text, rating, includeName } = review;

    let nickname = null;
    let userEmail = null;

    if (includeName) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          nickname = userDoc.data().nickname || null;
        }
        userEmail = user.email;
      } catch (err) {
        console.error("Error fetching nickname:", err);
      }
    }

    try {
      await addDoc(collection(db, "reviews"), {
        productId: id,
        text,
        rating,
        nickname: includeName ? nickname : null,
        userEmail: includeName ? userEmail : null,
        createdAt: serverTimestamp(),
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
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* ✅ NAV BAR (same as homepage) */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-red-700 hover:underline">
          Rater Joe’s
        </Link>
        <nav className="space-x-4 flex items-center">
          {user ? (
            <>
              <span className="text-sm text-gray-600 italic">
                Hi, {user.displayName || user.email}
              </span>
              <button
                onClick={() => window.location.href = "/login"}
                className="ml-2 text-blue-600 hover:underline"
              >
                Log Out
              </button>
            </>
          ) : (
            <Link to="/login" className="text-blue-600 hover:underline">
              Log In
            </Link>
          )}
        </nav>
      </header>
  
      <div className="max-w-3xl mx-auto px-6 py-8">
  
        {/* Grid: Info + Image */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-8">
          {/* Left: Text Info */}
          <div>
            <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2">
              {product.name}
            </h1>
  
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">
              {product.category}
            </p>
  
            {average ? (
              <div className="flex items-center text-yellow-500 mb-2">
                {"⭐".repeat(Math.round(average))}
                <span className="ml-2 text-sm text-gray-700">({average})</span>
              </div>
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
              className="inline-block text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200 transition"
            >
              ✏️ Edit Product
            </button>
          </div>
  
          {/* Right: Image */}
          <div className="overflow-hidden rounded-lg shadow">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-64 object-cover"
            />
          </div>
        </div>
  
        {/* Description or Edit Form */}
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
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            {product.description}
          </p>
        )}
  
        {/* Review Form */}
        {user ? (
          <ReviewForm onSubmit={handleReviewSubmit} productId={id} />
        ) : (
          <p className="text-sm italic text-gray-600 mb-4">
            Please log in to leave a review.
          </p>
        )}
  
        {/* Reviews Section */}
        <section className="bg-gray-50 p-6 rounded shadow-md mt-10">
          <h2 className="text-2xl font-semibold mb-4">Reviews</h2>
  
          {reviews.length ? (
            reviews.map((r, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded border border-gray-200 shadow-sm mb-4"
              >
                <div className="font-bold text-yellow-500 text-lg mb-1">
                  {r.rating} ⭐
                </div>
                <p className="text-gray-800">{r.text}</p>
                <p className="text-xs italic text-gray-500 mt-2">
                  by {r.nickname || r.userEmail || "Anonymous"}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-600">No reviews yet.</p>
          )}
        </section>
      </div>
    </div>
  );      
}