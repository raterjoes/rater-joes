// Updated App.jsx with performance improvements
// - Replaced onSnapshot with getDocs for products
// - Removed global reviews listener
// - Reviews now load per ProductCard (recommended)
// - Nickname lookup removed from homepage
// - Updated CategorySection to preview first 6 products and show a "View All" button

import { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import "./index.css";

import { useAuth } from "./AuthContext";
import categories from "./categories";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Contact from "./Contact";
import groceriesImage from "./assets/groceries.webp";
import ProductCard from "./ProductCard";
import NewActivityWindow from "./NewActivityWindow";
import usePageTracking from "./usePageTracking";

export default function App() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimeout = useRef();

  usePageTracking();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const q = query(collection(db, "products"), where("approved", "==", true));
        const snapshot = await getDocs(q);
        const loaded = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProducts(loaded);
      } catch (err) {
        console.error("Error loading products:", err);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    // Debounce search input
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(debounceTimeout.current);
  }, [searchQuery]);

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
        createdAt: serverTimestamp(),
      });
      if (window.gtag) {
        window.gtag("event", "submit_review", {
          category: "engagement",
          label: productId,
          value: rating,
        });
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Failed to submit review.");
    }
  };

  const filtered = products.filter((p) => {
    const q = debouncedQuery.toLowerCase();
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
    <div className="flex flex-col min-h-screen bg-orange-50 text-gray-900 font-sans">
      <Navbar />

      <main className="flex-grow">
        <section
          className="relative bg-cover bg-center bg-no-repeat h-[16rem] sm:h-[24rem] md:h-[28rem]"
          style={{ backgroundImage: `url(${groceriesImage})` }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-rose-800/80 w-[90%] sm:w-[70%] md:w-[60%] text-white text-center p-4 sm:p-6 rounded shadow-lg">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">
                Explore Trader Joe's Reviews
              </h2>
              <p className="text-base sm:text-lg mb-3 sm:mb-4">
                Find the top-rated products and share your own feedback with the community.
              </p>
              {user ? (
                <button
                  onClick={() => {
                    const searchSection = document.getElementById("search-section");
                    if (searchSection) {
                      searchSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="inline-block px-6 py-3 bg-rose-900 rounded text-white hover:bg-red-700"
                >
                  Browse
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-block px-6 py-3 bg-rose-900 rounded text-white hover:bg-red-700"
                >
                  Log In
                </Link>
              )}
            </div>
          </div>
        </section>

        <div id="search-section" className="max-w-2xl mx-auto px-4 mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <input
              type="text"
              placeholder="Search for a product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            />
            <Link
              to="/add-item"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
            >
              + Add New Item
            </Link>
          </div>
        </div>

        <div className="hidden sm:flex w-full max-w-5xl mx-auto px-4 mt-4 flex-wrap justify-center gap-3">
          {categories.map((cat) => {
            const catProducts = categorized[cat] || [];
            if (catProducts.length === 0) return null;
            return (
              <a
                key={cat}
                href={`#${cat.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-4 py-2 bg-rose-800/30 text-rose-800 rounded hover:bg-rose-200"
              >
                {cat}
              </a>
            );
          })}
        </div>

        <div className="sm:hidden flex justify-center mt-4">
          <Link
            to="/categories"
            className="px-4 py-2 bg-rose-800 text-white rounded hover:bg-rose-900"
          >
            Browse Categories
          </Link>
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
                  onReviewSubmit={handleReviewSubmit}
                  user={user}
                />
              );
            })
          )}
        </div>
      </main>

      <NewActivityWindow />
      <Footer />
    </div>
  );
}

function CategorySection({ id, title, products, onReviewSubmit, user }) {
  const preview = products.slice(0, 6);
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section id={id} className="bg-gray-50 border shadow rounded p-3 transition mb-6">
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
      </div>

      {isOpen && (
        <div className="transition-all duration-300 ease-in-out">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {preview.map((product) => (
              <ProductCard
                key={product.id}
                productId={product.id}
                name={product.name}
                image={product.image}
                images={product.images}
                description={product.description}
                onReviewSubmit={onReviewSubmit}
                user={user}
                seasonal={product.seasonal}
                season={product.season}
                newUntil={product.newUntil}
              />
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link
              to={`/category/${encodeURIComponent(title)}`}
              className="inline-block px-4 py-2 bg-rose-800 text-white rounded hover:bg-rose-900"
            >
              View All
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}