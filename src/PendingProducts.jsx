import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function PendingProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newProducts, setNewProducts] = useState([]);
  const [editProposals, setEditProposals] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

  useEffect(() => {
    if (adminCheckComplete && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, adminCheckComplete, navigate]);

  // ✅ Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      const snapshot = await getDocs(collection(db, "admins"));
      const emails = snapshot.docs.map((doc) => doc.data().email);
      setIsAdmin(emails.includes(user.email));
      setAdminCheckComplete(true);
    };
    checkAdminStatus();
  }, [user]);

  // 🔄 Load unapproved new products
  useEffect(() => {
    if (!user || !isAdmin) return;
    const q = query(collection(db, "products"), where("approved", "==", false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "new" }));
      setNewProducts(list);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  // 🔄 Load unapproved product edits
  useEffect(() => {
    if (!user || !isAdmin) return;
    const q = query(collection(db, "product_edits"), where("approved", "==", false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "edit" }));
      setEditProposals(list);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  // ✅ Approve edit: copy data into products, mark edit approved
  const approveEdit = async (edit) => {
    const refToProduct = doc(db, "products", edit.productId);
    await updateDoc(refToProduct, {
      name: edit.name,
      category: edit.category,
      image: edit.image,
      description: edit.description,
      seasonal: edit.seasonal,
      season: edit.season || null,
    });
    await updateDoc(doc(db, "product_edits", edit.id), { approved: true });
  };

  const rejectEdit = async (id) => {
    if (confirm("Delete this proposed edit?")) {
      await deleteDoc(doc(db, "product_edits", id));
    }
  };

  // ✅ Approve new product
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
        <h1 className="text-3xl font-bold mb-6">Pending Product Submissions</h1>

        {newProducts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">🆕 New Products</h2>
            <div className="space-y-6">
              {newProducts.map((item) => (
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
          </section>
        )}

        {editProposals.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">✏️ Proposed Edits</h2>
            <div className="space-y-6">
              {editProposals.map((item) => (
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
                      onClick={() => approveEdit(item)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      ✅ Apply Edit
                    </button>
                    <button
                      onClick={() => rejectEdit(item.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      ❌ Discard
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
