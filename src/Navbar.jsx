import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [nickname, setNickname] = useState(null);

  useEffect(() => {
    const fetchNickname = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setNickname(userDoc.data().nickname || null);
        }
      }
    };

    fetchNickname();
  }, [user]);

  return (
    <header className="bg-gray-100 shadow p-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold text-red-700 hover:underline">
        Rater Joe’s
      </Link>

      <nav className="space-x-4 flex items-center">

        {user ? (
          <>
            <span className="text-sm text-gray-600 italic">
              Hi, {nickname || user.email}
            </span>
            <button
              onClick={logout}
              className="ml-2 text-blue-600 hover:underline"
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
      </nav>
    </header>
  );
}
