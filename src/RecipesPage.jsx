import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import recipesHeader from "./assets/recipes-header.webp";
import recipesFooter from "./assets/recipes-footer.webp"

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Recipes</h1>
          <Link
            to="/submit-recipe"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + Submit Recipe
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by recipe name or product..."
            className="w-full sm:w-[34rem] p-2 border border-gray-300 rounded shadow-sm"
          />
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
                      <img
                        key={index}
                        src={url}
                        alt={`${recipe.title} ${index + 1}`}
                        className="w-40 h-32 object-cover rounded cursor-pointer hover:opacity-90"
                        onClick={(e) => {
                          e.preventDefault();
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
                      {recipe.productIds.map((id) => {
                        const product = products.find((p) => p.id === id);
                        return (
                          <li key={id}>
                            <Link
                              to={`/products/${id}`}
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
