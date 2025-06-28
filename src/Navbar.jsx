import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getDoc, doc, getDocs, collection } from "firebase/firestore";
import { db } from "./firebase";
import { useEffect, useState, useRef } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [nickname, setNickname] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchNickname = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setNickname(userDoc.data().nickname || null);
        }
      }
    };

    const checkAdmin = async () => {
      if (user) {
        try {
          console.log("Checking admin status for:", user.email);
          const adminDoc = await getDoc(doc(db, "admins", user.email));
          const isAdminUser = adminDoc.exists();
          console.log("Admin document exists:", isAdminUser);
          setIsAdmin(isAdminUser);
        } catch (err) {
          console.error("Error checking admin status:", err);
          setIsAdmin(false);
        }
      }
    };
    
    fetchNickname();
    checkAdmin();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitial = (str) => str?.charAt(0)?.toUpperCase() || "";

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);
  const handleLogout = () => {
    logout();
    setAvatarMenuOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-rose-800/80 shadow px-4 py-4 relative z-20">
      <div className="w-full flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-white hover:underline">
          Rater Joe's
        </Link>

        <div className="flex items-center gap-4">
          <button
            className="sm:hidden text-white"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <nav className="hidden sm:flex items-center space-x-4 text-white text-base">
            {user && (
              <span className="text-sm italic">Hi, {nickname || user.email}</span>
            )}

            {user && isAdmin && (
              <div className="relative group">
                <button className="hover:underline">Admin</button>
                <div
                  className="absolute right-0 mt-2 bg-white text-gray-800 border rounded shadow w-48 z-50
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out"
                >
                  <Link to="/pending-products" className="block px-4 py-2 hover:bg-gray-100">
                    Pending Products
                  </Link>
                  <Link to="/pending-review-images" className="block px-4 py-2 hover:bg-gray-100">
                    Pending Review Images
                  </Link>
                  <Link to="/pending-recipes" className="block px-4 py-2 hover:bg-gray-100">
                    Pending Recipes
                  </Link>
                </div>
              </div>
            )}

            <Link to="/contact" className="hover:underline">Contact</Link>
            <Link to="/chat" className="hover:underline">Chat</Link>
            <Link to="/seasonal" className="hover:underline">Seasonal</Link>
            <Link to="/new-arrivals" className="hover:underline">New Arrivals</Link>
            <Link to="/categories" className="hover:underline">Categories</Link>
            <Link to="/recipes" className="hover:underline">Recipes</Link>

            {!user && (
              <Link to="/login" className="hover:underline">Log In</Link>
            )}
          </nav>

          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  if (window.innerWidth >= 640) {
                    setAvatarMenuOpen((prev) => !prev);
                  }
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-green-600 text-white font-semibold text-sm focus:outline-none"
              >
                {getInitial(nickname || user.email)}
              </button>

              <div
                className={`hidden sm:block absolute right-0 mt-2 bg-white border shadow rounded text-sm z-50 transform transition-all duration-200 ease-out ${
                  avatarMenuOpen
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-95 pointer-events-none"
                }`}
              >
                <button
                  onClick={handleLogout}
                  className="block px-4 py-2 w-full text-left text-red-600 whitespace-nowrap hover:bg-gray-100"
                >
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        } mt-3 space-y-2 text-white`}
      >
        {user && (
          <div className="italic">Hi, {nickname || user.email}</div>
        )}
        {user && isAdmin && (
          <div className="space-y-1">
            <p className="font-semibold mt-2">Admin</p>
            <Link to="/pending-products" className="block hover:underline ml-2">
              Pending Products
            </Link>
            <Link to="/pending-review-images" className="block hover:underline ml-2">
              Pending Review Images
            </Link>
            <Link to="/pending-recipes" className="block hover:underline ml-2">
              Pending Recipes
            </Link>
          </div>
        )}
        <Link to="/contact" className="block hover:underline">Contact</Link>
        <Link to="/chat" className="block hover:underline">Chat</Link>
        <Link to="/seasonal" className="block hover:underline">Seasonal</Link>
        <Link to="/new-arrivals" className="block hover:underline">New Arrivals</Link>
        <Link to="/categories" className="block hover:underline">Categories</Link>
        <Link to="/recipes" className="block hover:underline">Recipes</Link>
        {user && (
          <button
            onClick={handleLogout}
            className="block text-left text-red-300 hover:underline mt-2"
          >
            Log Out
          </button>
        )}
        {!user && (
          <Link to="/login" className="block hover:underline">Log In</Link>
        )}
      </div>
    </header>
  );
}