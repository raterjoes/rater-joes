import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  doc
} from "firebase/firestore";
import { db } from "./firebase";
import { Link } from "react-router-dom";
import "./index.css";

import AuthForm from "./AuthForm";
import { useAuth } from "./AuthContext";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";
import categories from "./categories";

export default function App() {
  const { user, logout } = useAuth();
  const [reviews, setReviews] = useState({});
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // 🔄 Load products from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const loadedProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(loadedProducts);
    });

    return () => unsubscribe();
  }, []);

  // 🔄 Load reviews from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "reviews"), (snapshot) => {
      const loadedReviews = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const pid = data.productId;
        if (!loadedReviews[pid]) loadedReviews[pid] = [];
        loadedReviews[pid].push({
          text: data.text,
          rating: data.rating,
          userEmail: data.userEmail || null,
          nickname: data.nickname || null,
          createdAt: data.createdAt?.toDate(),
        });        
      });
      setReviews(loadedReviews);
    });

    return () => unsubscribe();
  }, []);

  const handleReviewSubmit = async (productId, review) => {
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
      } catch (error) {
        console.error("Error fetching user nickname:", error);
      }
    }
  
    try {
      await addDoc(collection(db, "reviews"), {
        productId,
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

  // 🔍 Filter products by search
  const filtered = products.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
  });

  const categorized = categories.reduce((acc, cat) => {
    acc[cat] = filtered.filter((p) => p.category === cat);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-red-700">Rater Joe’s</h1>
        <nav className="space-x-4 flex items-center">
          {user ? (
            <>
              <span className="text-sm text-gray-600 italic">Hi, {user.email}</span>
              <button
                onClick={logout}
                className="ml-2 text-blue-600 hover:underline"
              >
                Log Out
              </button>
            </>
          ) : (
            <Link to="/login" className="text-blue-600 hover:underline">Log In</Link>
          )}
        </nav>
      </header>

      <section className="bg-black text-white text-center py-12">
        <h2 className="text-4xl font-bold mb-4">Explore Trader Joe's Reviews</h2>
        <p className="text-lg">
          Find the top-rated products and share your own feedback with the community.
        </p>
        <Link
          to="/login"
          className="inline-block mt-6 px-6 py-3 bg-red-600 rounded text-white hover:bg-red-700"
        >
          Join the Reviews
        </Link>
      </section>

      <div className="max-w-xl mx-auto px-4 mt-6">
        <input
          type="text"
          placeholder="Search for a product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="max-w-xl mx-auto px-4 mt-4 text-right">
        <Link
          to="/add-item"
          className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Add New Item
        </Link>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 mt-4 flex flex-wrap justify-center gap-3">
        {categories.map((cat) => (
          <a
            key={cat}
            href={`#${cat.toLowerCase().replace(/\s+/g, "-")}`}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            {cat}
          </a>
        ))}
      </div>

      <main className="p-6 space-y-12">
        {categories.map((cat) => (
          <CategorySection
            key={cat}
            id={cat.toLowerCase().replace(/\s+/g, "-")}
            title={cat}
            products={categorized[cat] || []}
            reviews={reviews}
            onReviewSubmit={handleReviewSubmit}
            user={user}
          />
        ))}
      </main>
    </div>
  );
}

// ⬇️ Category Section
function CategorySection({ id, title, products, reviews, onReviewSubmit, user }) {
  return (
    <section id={id}>
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            productId={product.id}
            name={product.name}
            image={product.image}
            description={product.description}
            reviews={reviews[product.id] || []}
            onReviewSubmit={onReviewSubmit}
            user={user}
          />
        ))}
      </div>
    </section>
  );
}

// ⬇️ Product Card
function ProductCard({
  name,
  image,
  description,
  productId,
  reviews,
}) {
  const averageRating = reviews.length
    ? (
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      ).toFixed(1)
    : null;

  return (
    <Link to={`/products/${productId}`} className="block bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
      <img
        src={image}
        alt={name}
        className="w-full h-48 object-cover rounded mb-2"
      />
      <h3 className="text-lg font-bold">{name}</h3>

      {averageRating ? (
        <div className="text-yellow-500 text-sm mb-2">
          {"⭐".repeat(Math.round(averageRating))} ({averageRating})
        </div>
      ) : (
        <div className="text-gray-400 text-sm mb-2">Not yet rated</div>
      )}

      <p className="text-sm text-gray-700">{description}</p>
    </Link>
  );
}