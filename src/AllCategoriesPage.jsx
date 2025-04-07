import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import categories from "./categories";
import categoryAssets from "./categoryAssets"; // optional for images

export default function AllCategoriesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
      <Navbar />
      <main className="flex-grow max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center">Browse All Categories</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {categories.map((category) => {
            const assets = categoryAssets[category] || {};
            const image = assets.headerImage;

            return (
              <Link
                key={category}
                to={`/category/${encodeURIComponent(category)}`}
                className="group block bg-white rounded-lg shadow hover:shadow-md transition p-3 text-center"
              >
                {image ? (
                  <img
                    src={image}
                    alt={category}
                    className="w-full h-32 object-cover rounded mb-3"
                  />
                ) : (
                  <div className="w-full h-32 bg-rose-100 rounded mb-3 flex items-center justify-center text-4xl">
                    🛒
                  </div>
                )}
                <h2 className="text-lg font-semibold group-hover:text-rose-700 transition">{category}</h2>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}