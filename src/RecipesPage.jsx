import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const fetchRecipes = async () => {
      const q = query(collection(db, "recipes"), where("approved", "==", true));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecipes(list);
    };
    fetchRecipes();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
              <Link
                to={`/recipes/${recipe.id}`}
                key={recipe.id}
                className="bg-white rounded shadow p-4 block hover:shadow-lg transition"
              >
                {recipe.images?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mb-3">
                    {recipe.images.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`${recipe.title} ${index + 1}`}
                        className="w-40 h-32 object-cover rounded cursor-pointer hover:opacity-90"
                        onClick={(e) => {
                          e.preventDefault(); // prevent link from navigating
                          setLightboxImages(recipe.images);
                          setLightboxIndex(index);
                          setLightboxOpen(true);
                        }}
                      />
                    ))}
                  </div>
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
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:underline"
                          >
                            View Product
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-red-400"
          >
            ×
          </button>

          <div className="max-w-3xl w-full px-4 text-center">
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`Recipe ${lightboxIndex + 1}`}
              className="max-h-[80vh] mx-auto object-contain rounded"
            />

            {lightboxImages.length > 1 && (
              <div className="flex justify-between mt-4 text-white text-xl font-semibold">
                <button
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === 0 ? lightboxImages.length - 1 : prev - 1
                    )
                  }
                  className="px-4 py-2 hover:text-rose-400"
                >
                  ⬅ Prev
                </button>
                <button
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === lightboxImages.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="px-4 py-2 hover:text-rose-400"
                >
                  Next ➡
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
