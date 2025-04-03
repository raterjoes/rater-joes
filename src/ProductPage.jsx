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
import EditProductForm from "./EditProductForm";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ProductPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [sortOption, setSortOption] = useState("newest");
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

  let sortedReviews = [...reviews];
  if (sortOption === "newest") {
    sortedReviews.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sortOption === "oldest") {
    sortedReviews.sort((a, b) => a.createdAt - b.createdAt);
  } else if (sortOption === "high-to-low") {
    sortedReviews.sort((a, b) => b.rating - a.rating);
  } else if (sortOption === "low-to-high") {
    sortedReviews.sort((a, b) => a.rating - b.rating);
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900 font-sans">
      <Navbar />

      <main className="flex-grow">
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

              {product.seasonal && product.season && (() => {
                const seasonStyles = {
                  Winter: { emoji: "❄️", bg: "bg-blue-100", text: "text-blue-700" },
                  Spring: { emoji: "🌱", bg: "bg-green-100", text: "text-green-700" },
                  Summer: { emoji: "☀️", bg: "bg-yellow-100", text: "text-yellow-700" },
                  Fall:   { emoji: "🍂", bg: "bg-orange-100", text: "text-orange-700" },
                };

                const style = seasonStyles[product.season] || {};
                return (
                  <div className="mb-2">
                    <span
                      className={`inline-block text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${style.bg} ${style.text}`}
                    >
                      {style.emoji} Limited time: {product.season}
                    </span>
                  </div>
                );
              })()}

              <div className="mb-4">
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
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
              <h2 className="text-2xl font-semibold">Reviews</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Sort by:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="high-to-low">Rating: High to Low</option>
                  <option value="low-to-high">Rating: Low to High</option>
                </select>
              </div>
            </div>

            {sortedReviews.length ? (
              sortedReviews.map((r, i) => (
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
      </main>

      <Footer />
    </div>
  );
}