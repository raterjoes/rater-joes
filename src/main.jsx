import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './index.css'
import { AuthProvider } from "./AuthContext";

// Lazy load all major route components
const App = lazy(() => import('./App.jsx'));
const AuthForm = lazy(() => import('./AuthForm.jsx'));
const AddItemForm = lazy(() => import('./AddItemForm'));
const ProductPage = lazy(() => import('./ProductPage'));
const Contact = lazy(() => import('./Contact'));
const PendingProducts = lazy(() => import('./PendingProducts.jsx'));
const ChatBoard = lazy(() => import('./ChatBoard.jsx'));
const Seasonal = lazy(() => import('./Seasonal.jsx'));
const PendingReviewImages = lazy(() => import('./PendingReviewImages.jsx'));
const CategoryPage = lazy(() => import('./CategoryPage'));
const AllCategoriesPage = lazy(() => import('./AllCategoriesPage'));
const SubmitRecipePage = lazy(() => import('./SubmitRecipePage'));
const RecipesPage = lazy(() => import('./RecipesPage'));
const PendingRecipes = lazy(() => import('./PendingRecipes'));
const RecipeDetailPage = lazy(() => import('./RecipeDetailPage'));
const EditRecipeForm = lazy(() => import('./EditRecipeForm.jsx'));
const NewArrivals = lazy(() => import('./NewArrivals.jsx'));
const ProductNotFound = lazy(() => import('./ProductNotFound.jsx'));

function Loader() {
  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <div className="text-4xl animate-spin-slow mx-auto mb-4">🛒</div>
      <span className="text-rose-700 font-semibold">Loading...</span>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<AuthForm />} />
            <Route path="/add-item" element={<AddItemForm />} />
            <Route path="/products/:id" element={<ProductPage />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/pending-products" element={<PendingProducts />} />
            <Route path="/chat" element={<ChatBoard />} />
            <Route path="/seasonal" element={<Seasonal />} />
            <Route path="/new-arrivals" element={<NewArrivals />} />
            <Route path="/pending-review-images" element={<PendingReviewImages />} />
            <Route path="/category/:categoryName" element={<CategoryPage />} />
            <Route path="/categories" element={<AllCategoriesPage />} />
            <Route path="/submit-recipe" element={<SubmitRecipePage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/pending-recipes" element={<PendingRecipes />} />
            <Route path="/recipes/:id" element={<RecipeDetailPage />} />
            <Route path="/edit-recipe/:id" element={<EditRecipeForm />} />
            <Route path="/products/:id/not-found" element={<ProductNotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
