import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ProductCard from "./ProductCard";
import newArrivalsHeader from "./assets/category-banners/newarrivals.webp";

export default function NewArrivals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsByProduct, setReviewsByProduct] = useState({});

  useEffect(() => {
    const fetchNewArrivals = async () => {
      setLoading(true);
      const now = new Date().toISOString();
      const q = query(
        collection(db, "products"),
        where("approved", "==", true),
        where("newUntil", ">", now)
      );
      const snapshot = await getDocs(q);
      const productList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(productList);
      setLoading(false);
    };
    fetchNewArrivals();
  }, []);

  useEffect(() => {
    // Fetch all reviews and group by productId
    const fetchReviews = async () => {
      const snap = await getDocs(collection(db, "reviews"));
      const reviews = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const grouped = {};
      for (const review of reviews) {
        if (!grouped[review.productId]) grouped[review.productId] = [];
        grouped[review.productId].push(review);
      }
      setReviewsByProduct(grouped);
    };
    fetchReviews();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-orange-50 text-black">
      <Navbar />
      <main className="flex-grow max-w-5xl mx-auto px-4 py-10">
        <img
          src={newArrivalsHeader}
          alt="New Arrivals Header"
          className="w-full max-h-64 object-cover rounded shadow mb-6"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">🆕 New Arrivals</h1>
          <Link
            to="/add-item"
            className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="sm:inline hidden">Add New Item</span>
            <span className="inline sm:hidden">+</span>
          </Link>
        </div>
        <p className="mb-8">Check out the latest products added to Rater Joe's!</p>
        {loading ? null : products.length === 0 ? (
          <div className="text-center text-lg">No new arrivals at the moment.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} productId={product.id} {...product} reviews={reviewsByProduct[product.id] || []} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
} 