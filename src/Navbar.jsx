import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getDoc, doc, getDocs, collection } from "firebase/firestore";
import { db } from "./firebase";
import { useEffect, useState, useRef } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [nickname, setNickname] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  // ✅ Detect click outside to close menu
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

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  return (
    <header className="bg-rose-800/80 shadow p-4 flex justify-between items-center relative z-10">
      <Link to="/" className="text-xl font-bold text-white hover:underline">
        Rater Joe’s
      </Link>

      <div className="flex items-center gap-4">
        <nav className="space-x-4 flex items-center">
          {user ? (
            <>
              <span className="text-sm text-white italic">
                Hi, {nickname || user.email}
              </span>
              {isAdmin && (
                <Link to="/pending-products" className="text-white hover:underline">
                  Pending Products
                </Link>
              )}
            </>
          ) : (
            <Link to="/login" className="text-white hover:underline">
              Log In
            </Link>
          )}
          <Link to="/contact" className="text-white hover:underline">
            Contact
          </Link>
          <Link to="/chat" className="text-white hover:underline">
            Chat
          </Link>
          <Link to="/seasonal" className="text-white hover:underline">
            Seasonal
          </Link>
        </nav>

        {/* ✅ Initial icon with dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleMenu}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-green-600 text-white font-semibold text-sm focus:outline-none"
            >
              {getInitial(nickname || user.email)}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 bg-white border shadow rounded text-sm z-50">
                <button
                  onClick={handleLogout}
                  className="block px-4 py-2 w-full text-left text-red-600 whitespace-nowrap hover:bg-gray-100"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
