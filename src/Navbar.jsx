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
  const [menuOpen, setMenuOpen] = useState(false);
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
        const snapshot = await getDocs(collection(db, "admins"));
        const adminEmails = snapshot.docs.map((doc) => doc.data().email);
        setIsAdmin(adminEmails.includes(user.email));
      }
    };

    fetchNickname();
    checkAdmin();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitial = (str) => str?.charAt(0)?.toUpperCase() || "";

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);
  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-rose-800/80 shadow px-4 py-4 relative z-20">
      <div className="w-full flex justify-between items-center">
        {/* Left: Site logo */}
        <Link to="/" className="text-xl font-bold text-white hover:underline">
          Rater Joe’s
        </Link>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {/* Hamburger for mobile */}
          <button
            className="sm:hidden text-white"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Desktop nav links */}
          <nav className="hidden sm:flex items-center space-x-4 text-white text-base">
            {user && (
              <span className="text-sm italic">Hi, {nickname || user.email}</span>
            )}
            {user && isAdmin && (
              <>
                <Link to="/pending-products" className="hover:underline">
                  Pending Products
                </Link>
                <Link to="/pending-review-images" className="hover:underline">
                  Pending Review Images
                </Link>
              </>
            )}
            <Link to="/contact" className="hover:underline">
              Contact
            </Link>
            <Link to="/chat" className="hover:underline">
              Chat
            </Link>
            <Link to="/seasonal" className="hover:underline">
              Seasonal
            </Link>
            {!user && (
              <Link to="/login" className="hover:underline">
                Log In
              </Link>
            )}
          </nav>

          {/* User avatar dropdown (always visible when logged in) */}
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={(e) => {
                  if (window.innerWidth >= 640) {
                    toggleMenu();
                  }
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-green-600 text-white font-semibold text-sm focus:outline-none"
              >
                {getInitial(nickname || user.email)}
              </button>

              {/* Desktop dropdown */}
              <div
                className={`hidden sm:block absolute right-0 mt-2 bg-white border shadow rounded text-sm z-50 transform transition-all duration-200 ease-out ${
                  menuOpen
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

      {/* Mobile dropdown menu */}
      <div
        className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        } mt-3 space-y-2 text-white`}
      >
        {user && (
          <div className="italic">Hi, {nickname || user.email}</div>
        )}
        {user && isAdmin && (
          <>
            <Link to="/pending-products" className="block hover:underline">
              Pending Products
            </Link>
            <Link to="/pending-review-images" className="block hover:underline">
              Pending Review Images
            </Link>
          </>
        )}
        <Link to="/contact" className="block hover:underline">
          Contact
        </Link>
        <Link to="/chat" className="block hover:underline">
          Chat
        </Link>
        <Link to="/seasonal" className="block hover:underline">
          Seasonal
        </Link>
        {user && (
          <button
            onClick={handleLogout}
            className="block text-left text-red-300 hover:underline mt-2"
          >
            Log Out
          </button>
        )}
        {!user && (
          <Link to="/login" className="block hover:underline">
            Log In
          </Link>
        )}
      </div>
    </header>
  );
}
