import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { Link } from "react-router-dom";

import ProductCard from "./ProductCard";

// 🌸 Season Images
import winterImg from "./assets/winter.jpg";
import springImg from "./assets/spring2.jpg";
import summerImg from "./assets/summer.jpg";
import fallImg from "./assets/fall.jpg";
import otherseasonsImg from "./assets/otherseasons2.jpg"

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
  const currentSeason = getCurrentSeason();

  useEffect(() => {
    const q = query(collection(db, "products"), where("seasonal", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsBySeason = { Winter: [], Spring: [], Summer: [], Fall: [] };
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.season && productsBySeason[data.season]) {
          productsBySeason[data.season].push({ id: doc.id, ...data });
        }
      });
      setSeasonalProducts(productsBySeason);
    });

    return () => unsubscribe();
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
        />

        <h2 className="text-2xl font-semibold mb-4">{currentSeason}</h2>
        <ProductGrid products={seasonalProducts[currentSeason] || []} />

        <h2 className="text-3xl font-bold text-center mt-16 mb-6">Other Seasons</h2>

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
                <ProductGrid products={seasonalProducts[season] || []} />
              </div>
            ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ProductGrid({ products }) {
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
          reviews={product.reviews || []}
          seasonal={product.seasonal}
          season={product.season}
        />
      ))}
    </div>
  );
}