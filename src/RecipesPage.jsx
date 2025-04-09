import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    const fetchRecipes = async () => {
      const snapshot = await getDocs(collection(db, "recipes"));
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecipes(list);
    };
    fetchRecipes();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
      <Navbar />
      <main className="flex-grow max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Recipes</h1>
          <Link
            to="/submit-recipe"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + Submit Recipe
          </Link>
        </div>

        {recipes.length === 0 ? (
          <p>No recipes yet. Be the first to submit one!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded shadow p-4">
                {recipe.imageUrl && (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="w-full h-40 object-cover rounded mb-3"
                  />
                )}
                <h2 className="text-xl font-bold mb-1">{recipe.title}</h2>
                {recipe.description && (
                  <p className="text-sm text-gray-700 mb-2">
                    {recipe.description}
                  </p>
                )}
                {recipe.productIds?.length > 0 && (
                  <div className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Tagged Products:</span>
                    <ul className="list-disc list-inside">
                      {recipe.productIds.map((id) => (
                        <li key={id}>
                          <Link
                            to={`/products/${id}`}
                            className="text-blue-600 hover:underline"
                          >
                            View Product
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}