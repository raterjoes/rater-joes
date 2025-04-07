import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ProductCard from "./ProductCard";
import categories from "./categories";
import categoryAssets from "./categoryAssets"; // ✅ make sure this file exists and is imported

export default function CategoryPage() {
  const { categoryName } = useParams();
  const [products, setProducts] = useState([]);

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

  return (
    <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
      <Navbar />
      <main className="flex-grow max-w-6xl mx-auto px-4 py-6">
        {validCategory ? (
          <>
            {assets.headerImage && (
              <img
                src={assets.headerImage}
                alt={`${decodedCategory} banner`}
                className="w-full h-48 object-cover rounded mb-6"
              />
            )}

            <h1 className="text-3xl font-bold mb-6">{decodedCategory}</h1>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
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
              <p>No products found in this category.</p>
            )}

            {assets.footerImage && (
              <img
                src={assets.footerImage}
                alt={`${decodedCategory} footer`}
                className="w-full h-48 object-cover rounded mt-8"
              />
            )}
          </>
        ) : (
          <p className="text-red-600 text-lg">Invalid category.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
