import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ProductCard from "./ProductCard";
import categories from "./categories";

export default function CategoryPage() {
  const { categoryName } = useParams();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const q = query(
        collection(db, "products"),
        where("category", "==", categoryName),
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
  }, [categoryName]);

  const decodedCategory = decodeURIComponent(categoryName);
  const validCategory = categories.includes(decodedCategory);

  return (
    <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
      <Navbar />
      <main className="flex-grow max-w-6xl mx-auto px-4 py-6">
        {validCategory ? (
          <>
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
                    reviews={[]} // optional if needed
                    user={null}
                    seasonal={product.seasonal}
                    season={product.season}
                  />
                ))}
              </div>
            ) : (
              <p>No products found in this category.</p>
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
