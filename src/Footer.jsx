// src/Footer.jsx
import { Link } from "react-router-dom";
import logo from "./assets/logo.png"; // adjust if your logo path is different

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t mt-12 text-center py-6 text-sm text-gray-600">
      <div className="max-w-5xl mx-auto px-4 flex flex-col items-center space-y-4 sm:flex-row sm:justify-between sm:space-y-0">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="w-8 h-8" />
          <span className="font-semibold text-gray-700">Rater Joe’s</span>
        </div>

        <nav className="flex gap-4 text-gray-600 text-sm">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/login" className="hover:underline">Log In</Link>
          <Link to="/contact" className="hover:underline">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}