import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import ProductCard from "./ProductCard";

// 🌸 Season Images
import winterImg from "./assets/winter.webp";
import springImg from "./assets/spring2.webp";
import summerImg from "./assets/summer.webp";
import fallImg from "./assets/fall.webp";
import otherseasonsImg from "./assets/otherseasons2.webp"

const seasonImages = {
  Winter: winterImg,
  Spring: springImg,
  Summer: summerImg,
  Fall: fallImg,
};

const seasonOrder = ["Winter", "Spring", "Summer", "Fall"];

function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month <= 1 || month === 11) return "Winter";
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  return "Fall";
}

export default function Seasonal() {
  const [seasonalProducts, setSeasonalProducts] = useState({});
  const [reviewsByProduct, setReviewsByProduct] = useState({});
  const currentSeason = getCurrentSeason();

  useEffect(() => {
    const q = query(collection(db, "products"), where("seasonal", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsBySeason = { Winter: [], Spring: [], Summer: [], Fall: [] };
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.season && productsBySeason[data.season]) {
          productsBySeason[data.season].push({ id: doc.id, ...data });
        } else {
          console.log('Skipped product (invalid or missing season):', { id: doc.id, ...data });
        }
      });
      setSeasonalProducts(productsBySeason);
    });

    return () => unsubscribe();
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
    <div className="flex flex-col min-h-screen bg-orange-50">
      <Navbar />
      <main className="flex-grow max-w-5xl mx-auto px-4 py-10">

        {/* 🌟 Current Season Header + Image */}
        
        <img
          src={seasonImages[currentSeason]}
          alt={currentSeason}
          className="w-full max-h-64 object-cover rounded shadow mb-6"
          style={{ objectPosition: 'center 20%' }}
        />

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">{currentSeason}</h2>
          <Link
            to="/add-item"
            className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="sm:inline hidden">Add New Item</span>
            <span className="inline sm:hidden">+</span>
          </Link>
        </div>
        <ProductGrid products={seasonalProducts[currentSeason] || []} reviewsByProduct={reviewsByProduct} />

        {/* Add gap before other seasons banner */}
        <div className="mb-10"></div>

        <img
          src={otherseasonsImg}
          className="w-full max-h-64 object-cover rounded shadow mb-6"
        />

        <div className="space-y-10">
          {seasonOrder
            .filter((s) => s !== currentSeason)
            .map((season) => (
              <div key={season}>
                <h3 className="text-2xl font-semibold mb-4">{season}</h3>
                <ProductGrid products={seasonalProducts[season] || []} reviewsByProduct={reviewsByProduct} />
              </div>
            ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ProductGrid({ products, reviewsByProduct }) {
  if (products.length === 0) {
    return <p className="text-gray-500 italic">No seasonal products yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          productId={product.id}
          name={product.name}
          description={product.description}
          image={product.image}
          images={product.images}
          thumbnailUrls={product.thumbnailUrls}
          reviews={reviewsByProduct ? (reviewsByProduct[product.id] || []) : []}
          seasonal={product.seasonal}
          season={product.season}
          newUntil={product.newUntil}
        />
      ))}
    </div>
  );
}