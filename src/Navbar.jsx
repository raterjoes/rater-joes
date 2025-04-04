import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getDoc, doc, getDocs, collection } from "firebase/firestore";
import { db } from "./firebase";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [nickname, setNickname] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
        const adminEmails = snapshot.docs.map(doc => doc.data().email);
        setIsAdmin(adminEmails.includes(user.email));
      }
    };

    fetchNickname();
    checkAdmin();
  }, [user]);

  const getInitial = (str) => {
    return str?.charAt(0)?.toUpperCase() || "";
  };

  return (
    <header className="bg-gray-100 shadow p-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold text-red-700 hover:underline">
        Rater Joe’s
      </Link>

      <div className="flex items-center gap-4">
        <nav className="space-x-4 flex items-center">
          {user ? (
            <>
              <span className="text-sm text-gray-600 italic">
                Hi, {nickname || user.email}
              </span>
              {isAdmin && (
                <Link to="/pending-products" className="text-blue-600 hover:underline">
                  Pending Products
                </Link>
              )}
              <button
                onClick={logout}
                className="text-blue-600 hover:underline"
              >
                Log Out
              </button>
            </>
          ) : (
            <Link to="/login" className="text-blue-600 hover:underline">
              Log In
            </Link>
          )}
          <Link to="/contact" className="text-blue-600 hover:underline">
            Contact
          </Link>
          <Link to="/chat" className="text-blue-600 hover:underline">
            Chat
          </Link>
          <Link to="/seasonal" className="text-blue-600 hover:underline">
            Seasonal
          </Link>
        </nav>

        {/* ✅ Initial icon (1 letter) */}
        {user && (
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-sm">
            {getInitial(nickname || user.email)}
          </div>
        )}
      </div>
    </header>
  );
}
