import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  doc,
  query,
  where
} from "firebase/firestore";
import { db } from "./firebase";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import "./index.css";

import { useAuth } from "./AuthContext";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";
import categories from "./categories";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Contact from "./Contact";

export default function App() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState({});
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [nickname, setNickname] = useState(null);

  useEffect(() => {
    const fetchNickname = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setNickname(userDoc.data().nickname || null);
        }
      }
    };
    fetchNickname();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "products"), where("approved", "==", true)),
      (snapshot) => {
      const loaded = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(loaded);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "reviews"), (snapshot) => {
      const all = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const pid = data.productId;
        if (!all[pid]) all[pid] = [];
        all[pid].push({
          text: data.text,
          rating: data.rating,
          userEmail: data.userEmail || null,
          nickname: data.nickname || null,
          createdAt: data.createdAt?.toDate()
        });
      });
      setReviews(all);
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
      } catch (err) {
        console.error("Error getting nickname:", err);
      }
    }

    try {
      await addDoc(collection(db, "reviews"), {
        productId,
        text,
        rating,
        nickname: includeName ? nickname : null,
        userEmail: includeName ? userEmail : null,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Submit error:", err);
      alert("Failed to submit review.");
    }
  };

  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const categorized = categories.reduce((acc, cat) => {
    acc[cat] = filtered.filter((p) => p.category === cat);
    return acc;
  }, {});

  const totalFiltered = Object.values(categorized).flat().length;

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900 font-sans">
      <Navbar />

      <main className="flex-grow">
        <section className="bg-black text-white text-center py-12">
          <h2 className="text-4xl font-bold mb-4">Explore Trader Joe's Reviews</h2>
          <p className="text-lg">
            Find the top-rated products and share your own feedback with the community.
          </p>
          <Link
            to="/login"
            className="inline-block mt-6 px-6 py-3 bg-red-600 rounded text-white hover:bg-red-700"
          >
            Log In
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
          {categories.map((cat) => {
            const catProducts = categorized[cat] || [];
            if (catProducts.length === 0) return null;

            return (
              <a
                key={cat}
                href={`#${cat.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                {cat}
              </a>
            );
          })}
        </div>

        <div className="p-6 space-y-12">
          {totalFiltered === 0 ? (
            <p className="text-center text-gray-500 text-lg mt-10">
              No products match your search.
            </p>
          ) : (
            categories.map((cat) => {
              const catProducts = categorized[cat] || [];
              if (catProducts.length === 0) return null;

              return (
                <CategorySection
                  key={cat}
                  id={cat.toLowerCase().replace(/\s+/g, "-")}
                  title={cat}
                  products={catProducts}
                  reviews={reviews}
                  onReviewSubmit={handleReviewSubmit}
                  user={user}
                />
              );
            })
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ⬇️ Category Section
function CategorySection({ id, title, products, reviews, onReviewSubmit, user }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section id={id} className="bg-gray-50 border shadow rounded p-4 transition mb-6">
      <div
        className="flex justify-between items-center cursor-pointer mb-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-2xl font-semibold">{title}</h2>
        <ChevronDown
          className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
        {/* Or use: <ChevronDown className={isOpen ? "rotate-180" : ""} /> */}
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-4">
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
            seasonal={product.seasonal}
            season={product.season}
            />
          ))}
        </div>
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
  seasonal,
  season,
}) {
  const averageRating = reviews.length
    ? (
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      ).toFixed(1)
    : null;

  // ✅ Map emoji and color by season
  const seasonStyles = {
    Winter: { emoji: "❄️", bg: "bg-blue-100", text: "text-blue-700" },
    Spring: { emoji: "🌱", bg: "bg-green-100", text: "text-green-700" },
    Summer: { emoji: "☀️", bg: "bg-yellow-100", text: "text-yellow-700" },
    Fall:   { emoji: "🍂", bg: "bg-orange-100", text: "text-orange-700" },
  };

  const style = seasonStyles[season] || {};

  return (
    <Link
      to={`/products/${productId}`}
      className="relative block bg-white rounded-lg shadow p-2 hover:shadow-lg transition text-sm"
    >
      {/* ✅ Seasonal tag */}
      {seasonal && season && (
        <span
          className={`absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded-full shadow-sm ${style.bg} ${style.text}`}
        >
          {style.emoji} Limited time: {season}
        </span>
      )}

      <img
        src={image}
        alt={name}
        className="w-full h-36 object-cover rounded mb-2"
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
