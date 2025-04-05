import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from './App.jsx'
import AuthForm from "./AuthForm.jsx";
import './index.css'
import { AuthProvider } from "./AuthContext";
import AddItemForm from "./AddItemForm";
import ProductPage from "./ProductPage";
import Contact from "./Contact";
import PendingProducts from './PendingProducts.jsx';
import ChatBoard from './ChatBoard.jsx'
import Seasonal from './Seasonal.jsx';
import PendingReviewImages from './PendingReviewImages.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<AuthForm />} />
          <Route path="/add-item" element={<AddItemForm />} />
          <Route path="/products/:id" element={<ProductPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/pending-products" element={<PendingProducts />} />
          <Route path="/chat" element={<ChatBoard />} />
          <Route path="/seasonal" element={<Seasonal />} />
          <Route path="/pending-review-images" element={<PendingReviewImages />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
