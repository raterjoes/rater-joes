import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ProductCard from "./ProductCard";
import newArrivalsHeader from "./assets/category-banners/newarrivals.webp";

export default function NewArrivals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <h1 className="text-3xl font-bold mb-6">🆕 New Arrivals</h1>
        <p className="mb-8">Check out the latest products added to Rater Joe's!</p>
        {loading ? null : products.length === 0 ? (
          <div className="text-center text-lg">No new arrivals at the moment.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} productId={product.id} {...product} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
} 