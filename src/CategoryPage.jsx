import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ProductCard from "./ProductCard";
import categories from "./categories";
import categoryAssets from "./categoryAssets";

export default function CategoryPage() {
  const { categoryName } = useParams();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const decodedCategory = decodeURIComponent(categoryName);
  const validCategory = categories.includes(decodedCategory);
  const assets = categoryAssets[decodedCategory] || {};

  useEffect(() => {
    const fetchProducts = async () => {
      if (!validCategory) return;
      const q = query(
        collection(db, "products"),
        where("category", "==", decodedCategory),
        where("approved", "==", true)
      );
      const snapshot = await getDocs(q);
      const productList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productList);
    };
    fetchProducts();
  }, [decodedCategory, validCategory]);

  const filteredProducts = products.filter((product) => {
    const q = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(q) ||
      product.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
      <Navbar />

      <div className="flex-grow w-full">
        <main className="w-full max-w-6xl mx-auto px-4 py-6">
          {validCategory ? (
            <>
              {assets.headerImage && (
                <img
                  src={assets.headerImage}
                  alt={`${decodedCategory} banner`}
                  className="w-full aspect-[5/1] object-cover rounded mb-6"
                />
              )}

              <h1 className="text-3xl font-bold mb-4">{decodedCategory}</h1>

              {/* ✅ Search Bar + Add Item */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Search for an item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-grow px-6 py-3 text-lg border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                />
                <Link
                  to={`/add-item?category=${encodeURIComponent(decodedCategory)}`}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
                >
                  + Add New Item
                </Link>
              </div>

              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      productId={product.id}
                      name={product.name}
                      image={product.image}
                      images={product.images}
                      description={product.description}
                      reviews={[]} // optional
                      user={null}
                      seasonal={product.seasonal}
                      season={product.season}
                    />
                  ))}
                </div>
              ) : (
                <p>No matching products found in this category.</p>
              )}

              {assets.footerImage && (
                <img
                  src={assets.footerImage}
                  alt={`${decodedCategory} footer`}
                  className="w-full aspect-[5/1] object-cover rounded mt-8"
                />
              )}
            </>
          ) : (
            <p className="text-red-600 text-lg">Invalid category.</p>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
