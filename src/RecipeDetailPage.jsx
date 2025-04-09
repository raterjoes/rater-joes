import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      const docRef = doc(db, "recipes", id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setRecipe(snapshot.data());
      }
    };
    fetchRecipe();
  }, [id]);

  if (!recipe) {
    return (
      <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
        <Navbar />
        <main className="flex-grow max-w-3xl mx-auto px-4 py-10">
          <p>Loading recipe...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
      <Navbar />
      <main className="flex-grow max-w-3xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-3xl font-bold">{recipe.title}</h1>

        {recipe.images?.length > 0 && (
          <div className="flex gap-3 overflow-x-auto">
            {recipe.images.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`${recipe.title} ${index + 1}`}
                className="w-48 h-36 object-cover rounded"
              />
            ))}
          </div>
        )}

        {recipe.description && (
          <p className="text-lg text-gray-700">{recipe.description}</p>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-1">Steps / Ingredients</h2>
          <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">
            {recipe.steps}
          </pre>
        </div>

        {recipe.productIds?.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-1">Tagged Products</h2>
            <ul className="list-disc list-inside text-blue-600">
              {recipe.productIds.map((id) => (
                <li key={id}>
                  <Link to={`/products/${id}`} className="hover:underline">
                    View Product
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}