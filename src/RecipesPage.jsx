import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import LazyImage from "./LazyImage";
import recipesHeader from "./assets/recipes-header.webp";
import recipesFooter from "./assets/recipes-footer.webp"

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [searchParams] = useSearchParams();
  const productFilter = searchParams.get("product");

  useEffect(() => {
    const fetchData = async () => {
      const productSnap = await getDocs(collection(db, "products"));
      const productList = productSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setProducts(productList);

      const recipeSnap = await getDocs(
        query(collection(db, "recipes"), where("approved", "==", true))
      );
      const recipeList = recipeSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecipes(recipeList);
    };

    fetchData();
  }, []);

  const filteredRecipes = recipes.filter((recipe) => {
    const lowerQuery = searchQuery.toLowerCase();
    const titleMatch = recipe.title.toLowerCase().includes(lowerQuery);

    const taggedProductNames = recipe.productIds
      ?.map((id) => products.find((p) => p.id === id)?.name || "")
      .join(" ")
      .toLowerCase();

    const productMatch = taggedProductNames.includes(lowerQuery);

    const matchesSearch = titleMatch || productMatch;
    const matchesFilter = productFilter
      ? recipe.productIds?.includes(productFilter)
      : true;

    return matchesSearch && matchesFilter;
  });

  const productName = products.find((p) => p.id === productFilter)?.name;

  return (
    <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
      <Navbar />
      <main className="flex-grow max-w-5xl mx-auto px-4 py-4">
        <img
          src={recipesHeader}
          className="w-full max-h-40 object-cover rounded shadow mb-2"
          alt="Recipes header"
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div className="flex-1 sm:max-w-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by recipe name or product..."
              className="w-full p-2 border border-gray-300 rounded shadow-sm"
            />
          </div>
          <Link
            to="/submit-recipe"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
          >
            + Submit Recipe
          </Link>
        </div>

        {/* Filter Heading and Clear Button */}
        {productFilter && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">
              Recipes with{" "}
              <span className="text-rose-700">
                {productName || "this product"}
              </span>
            </h2>
            <Link
              to="/recipes"
              className="text-sm px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Clear Filter
            </Link>
          </div>
        )}

        {filteredRecipes.length === 0 ? (
          <p>No recipes match your search.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <Link
                to={`/recipes/${recipe.id}`}
                key={recipe.id}
                className="bg-white rounded shadow p-4 block hover:shadow-lg transition"
              >
                {recipe.images?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mb-3">
                    {recipe.images.map((url, index) => (
                      <LazyImage
                        key={index}
                        src={url}
                        alt={`${recipe.title} ${index + 1}`}
                        className="w-40 h-32 object-cover rounded cursor-pointer hover:opacity-90"
                        placeholder="🍳"
                        thumbnailSrc={recipe.thumbnailUrls?.[index] || null}
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
                      {recipe.productIds.map((id) => {
                        const product = products.find((p) => p.id === id);
                        return (
                          <li key={id}>
                            <Link
                              to={`/products/${id}`}
                              state={{ fromRecipe: `/recipes/${recipe.id}` }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:underline"
                            >
                              {product?.name || "View Product"}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      <img
        src={recipesFooter}
        className="w-full max-h-40 object-cover rounded shadow mb-2 mt-6"
        alt="Recipes footer"
      />
      </main>
      <Footer />
    </div>
  );
}
