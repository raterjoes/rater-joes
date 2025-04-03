import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function PendingProducts() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ Check if current user is in /admins list
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      const snapshot = await getDocs(collection(db, "admins"));
      const emails = snapshot.docs.map((doc) => doc.data().email);
      setIsAdmin(emails.includes(user.email));
    };

    checkAdminStatus();
  }, [user]);

  // 🔄 Load unapproved products
  useEffect(() => {
    if (!user || !isAdmin) return;

    const q = query(collection(db, "products"), where("approved", "==", false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPending(list);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const approveProduct = async (id) => {
    await updateDoc(doc(db, "products", id), { approved: true });
  };

  const rejectProduct = async (id) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await deleteDoc(doc(db, "products", id));
    }
  };

  if (!user || !isAdmin) {
    return <p className="text-center mt-10 text-red-600">Access denied</p>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Pending Product Approvals</h1>

        {pending.length === 0 ? (
          <p className="text-gray-600">No pending submissions.</p>
        ) : (
          <div className="space-y-6">
            {pending.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 bg-white shadow space-y-2"
              >
                <h2 className="text-xl font-semibold">{item.name}</h2>
                <p className="text-sm text-gray-500">{item.category}</p>
                {item.seasonal && item.season && (
                  <p className="text-sm italic text-green-700">
                    Seasonal: {item.season}
                  </p>
                )}
                <p className="text-sm">{item.description}</p>
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-40 object-cover rounded"
                  />
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => approveProduct(item.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => rejectProduct(item.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    ❌ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}