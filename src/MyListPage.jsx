import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getSavedProductIds, getSavedRecipeIds } from './utils/savedListUtils';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import Navbar from './Navbar';
import Footer from './Footer';
import { Link } from 'react-router-dom';

export default function MyListsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      // Fetch saved product IDs
      const productIds = await getSavedProductIds(user.uid);
      // Fetch product details
      const productDetails = await Promise.all(
        productIds.map(async (id) => {
          const snap = await getDoc(doc(db, 'products', id));
          return snap.exists() ? { id, ...snap.data() } : null;
        })
      );
      setProducts(productDetails.filter(Boolean));

      // Fetch saved recipe IDs
      const recipeIds = await getSavedRecipeIds(user.uid);
      // Fetch recipe details
      const recipeDetails = await Promise.all(
        recipeIds.map(async (id) => {
          const snap = await getDoc(doc(db, 'recipes', id));
          return snap.exists() ? { id, ...snap.data() } : null;
        })
      );
      setRecipes(recipeDetails.filter(Boolean));
      setLoading(false);
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
        <Navbar />
        <main className="flex-grow max-w-2xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">My List</h1>
          <p className="text-lg text-red-600">Please log in to view your saved products and recipes in My Lists.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 to-yellow-100 text-gray-900">
      <Navbar />
      <main className="flex-grow max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold mb-10 text-center tracking-tight text-rose-800 drop-shadow">My Lists</h1>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-5xl animate-spin-slow mb-4">🛒</span>
            <p className="text-lg text-rose-700 font-semibold">Loading your saved items...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-white/80 rounded-2xl shadow-lg p-6 flex flex-col">
              <h2 className="text-2xl font-bold mb-4 text-blue-800 flex items-center gap-2">
                <span className="text-3xl">🛍️</span> My Saved Products
              </h2>
              {products.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <span className="text-5xl mb-2">🗂️</span>
                  <p className="text-gray-500 text-center">No saved products yet.<br/>Start adding your favorites!</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {products.map((product) => (
                    <li key={product.id} className="flex items-center gap-4 bg-white rounded-xl shadow hover:shadow-xl transition-shadow p-3 group">
                      <img
                        src={product.images?.[0] || product.image || ''}
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded-full border-4 border-blue-100 shadow group-hover:scale-105 transition-transform"
                      />
                      <div className="flex-1">
                        <Link to={`/products/${product.id}`} className="text-lg font-bold text-blue-700 hover:underline">
                          {product.name}
                        </Link>
                        <div className="text-xs text-gray-500 mt-1 bg-blue-50 inline-block px-2 py-0.5 rounded-full">
                          {product.category}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="bg-white/80 rounded-2xl shadow-lg p-6 flex flex-col">
              <h2 className="text-2xl font-bold mb-4 text-green-800 flex items-center gap-2">
                <span className="text-3xl">🍽️</span> My Saved Recipes
              </h2>
              {recipes.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <span className="text-5xl mb-2">📖</span>
                  <p className="text-gray-500 text-center">No saved recipes yet.<br/>Find something delicious to save!</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {recipes.map((recipe) => (
                    <li key={recipe.id} className="flex items-center gap-4 bg-white rounded-xl shadow hover:shadow-xl transition-shadow p-3 group">
                      <img
                        src={recipe.images?.[0] || ''}
                        alt={recipe.title}
                        className="w-20 h-20 object-cover rounded-full border-4 border-green-100 shadow group-hover:scale-105 transition-transform"
                      />
                      <div className="flex-1">
                        <Link to={`/recipes/${recipe.id}`} className="text-lg font-bold text-green-700 hover:underline">
                          {recipe.title}
                        </Link>
                        <div className="text-xs text-gray-500 mt-1 bg-green-50 inline-block px-2 py-0.5 rounded-full">
                          {recipe.description?.slice(0, 60)}...</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
} 