import { Link, useParams, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ProductNotFound() {
  const { id } = useParams();
  const location = useLocation();
  const fromRecipe = location.state?.fromRecipe;

  return (
    <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-10 text-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-3xl font-bold mb-4 text-gray-800">Product Not Found</h1>
          <p className="text-lg text-gray-600 mb-6">
            This product may have been deleted or is no longer available.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {fromRecipe && (
              <Link
                to={fromRecipe}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                ← Return to Recipe
              </Link>
            )}
            <Link
              to="/"
              className="px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
            >
              Keep Browsing
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 