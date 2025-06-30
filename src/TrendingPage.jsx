import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import Navbar from './Navbar';
import Footer from './Footer';
import { Link } from 'react-router-dom';

function get14DaysAgo() {
  const now = new Date();
  now.setDate(now.getDate() - 14);
  return Timestamp.fromDate(now);
}

export default function TrendingPage() {
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      setLoading(true);
      const since = get14DaysAgo();

      // 1. Fetch recent high reviews
      let reviewsSnap;
      try {
        const reviewsQ = query(
          collection(db, 'reviews'),
          where('createdAt', '>=', since),
          where('rating', '>=', 4)
        );
        reviewsSnap = await getDocs(reviewsQ);
        console.log('Fetched reviews:', reviewsSnap.docs.map(d => d.data()));
      } catch (e) {
        console.error('Failed to fetch reviews:', e);
        setLoading(false);
        return;
      }
      const reviewCounts = {};
      reviewsSnap.forEach(doc => {
        const data = doc.data();
        if (data.productId) {
          reviewCounts[data.productId] = (reviewCounts[data.productId] || 0) + 1;
        }
      });
      console.log('Review counts by productId:', reviewCounts);

      // 2. Fetch recent recipes and count product mentions
      let recipesSnap;
      try {
        const recipesQ = query(
          collection(db, 'recipes'),
          where('createdAt', '>=', since),
          where('approved', '==', true)
        );
        recipesSnap = await getDocs(recipesQ);
      } catch (e) {
        console.error('Failed to fetch recipes:', e);
        setLoading(false);
        return;
      }
      const recipeCounts = {};
      recipesSnap.forEach(doc => {
        const data = doc.data();
        if (Array.isArray(data.productIds)) {
          data.productIds.forEach(pid => {
            recipeCounts[pid] = (recipeCounts[pid] || 0) + 1;
          });
        }
      });

      // 3. Combine scores
      const productScores = {};
      const allProductIds = new Set([
        ...Object.keys(reviewCounts),
        ...Object.keys(recipeCounts)
      ]);
      allProductIds.forEach(pid => {
        productScores[pid] = (reviewCounts[pid] || 0) * 2 + (recipeCounts[pid] || 0);
      });

      // 4. Fetch product details
      const productDetails = await Promise.all(
        Array.from(allProductIds).map(async (pid) => {
          const snap = await getDocs(query(collection(db, 'products'), where('__name__', '==', pid)));
          if (!snap.empty) {
            const productData = { id: pid, ...snap.docs[0].data(), score: productScores[pid], reviewCount: reviewCounts[pid] || 0, recipeCount: recipeCounts[pid] || 0 };
            console.log('Trending product:', productData);
            return productData;
          }
          return null;
        })
      );
      const trending = productDetails.filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 12);
      setTrendingProducts(trending);
      setLoading(false);
    }
    fetchTrending();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 to-orange-100 text-gray-900">
      <Navbar />
      <main className="flex-grow max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold mb-10 text-center tracking-tight text-orange-800 drop-shadow">Trending Products</h1>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-5xl animate-spin-slow mb-4">🔥</span>
            <p className="text-lg text-orange-700 font-semibold">Loading trending products...</p>
          </div>
        ) : trendingProducts.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <span className="text-5xl mb-2">🕵️‍♂️</span>
            <p className="text-gray-500 text-center">No trending products found for the last 14 days.</p>
          </div>
        ) : (
          <ul className="space-y-6">
            {trendingProducts.map((product, idx) => (
              <li key={product.id} className="flex items-center gap-5 bg-white/90 rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-5 group">
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-orange-600">#{idx + 1}</span>
                  <img
                    src={product.images?.[0] || product.image || ''}
                    alt={product.name}
                    className="w-24 h-24 object-cover rounded-full border-4 border-orange-200 shadow group-hover:scale-105 transition-transform mt-2"
                  />
                </div>
                <div className="flex-1">
                  <Link to={`/products/${product.id}`} className="text-2xl font-bold text-orange-800 hover:underline">
                    {product.name}
                  </Link>
                  <div className="text-xs text-gray-500 mt-1 bg-orange-50 inline-block px-2 py-0.5 rounded-full">
                    {product.category}
                  </div>
                  <div className="mt-2 flex gap-3 items-center">
                    <span className="inline-flex items-center text-sm bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      <span className="mr-1">⭐</span> {product.reviewCount} high reviews
                    </span>
                    <span className="inline-flex items-center text-sm bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                      <span className="mr-1">🍽️</span> {product.recipeCount} new recipes
                    </span>
                  </div>
                </div>
                <span className="text-3xl">🔥</span>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
} 