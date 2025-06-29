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
  getDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { getStorage } from "./firebase";
import { ref as storageRef, deleteObject } from "firebase/storage";

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

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      setIsAdmin(userDoc.exists() && userDoc.data().isAdmin === true);
      setAdminCheckComplete(true);
    };
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    const q = query(collection(db, "products"), where("approved", "==", false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "new" }));
      setNewProducts(list);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    const q = query(collection(db, "product_edits"), where("approved", "==", false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "edit" }));
      setEditProposals(list);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  const approveEdit = async (edit) => {
    const refToProduct = doc(db, "products", edit.productId);
    const existingSnap = await getDoc(refToProduct);
  
    if (!existingSnap.exists()) {
      alert("The original product no longer exists.");
      return;
    }
  
    try {
      const existing = existingSnap.data();

      // Only use edit.images/thumbnailUrls if they are defined, otherwise preserve existing
      const images = Array.isArray(edit.images) ? edit.images : existing.images || [];
      const thumbnailUrls = Array.isArray(edit.thumbnailUrls) ? edit.thumbnailUrls : existing.thumbnailUrls || [];

      const updatePayload = {
        name: edit.name ?? existing.name ?? "",
        category: edit.category ?? existing.category ?? "",
        image: edit.image ?? existing.image ?? "",
        images,
        description: edit.description ?? existing.description ?? "",
        seasonal: edit.seasonal ?? existing.seasonal ?? false,
        season: edit.season ?? existing.season ?? null,
        thumbnailUrls,
        newUntil: edit.newUntil ?? existing.newUntil ?? null,
        createdAt: existing.createdAt ?? null,
        addedBy: existing.addedBy ?? null,
        approved: true
      };
      await updateDoc(refToProduct, updatePayload);

      await updateDoc(doc(db, "product_edits", edit.id), { approved: true });

      alert("✅ Edit applied!");
      setEditProposals((prev) => prev.filter((e) => e.id !== edit.id));
    } catch (err) {
      console.error("❌ Failed to apply edit:", err);
      alert("Failed to apply edit.");
    }
  };  

  const rejectEdit = async (id) => {
    if (confirm("Delete this proposed edit?")) {
      try {
        const editRef = doc(db, "product_edits", id);
        const editSnap = await getDoc(editRef);
  
        if (editSnap.exists()) {
          const edit = editSnap.data();
          const allImages = [...(edit.images || []), ...(edit.image ? [edit.image] : [])];
  
          for (const url of allImages) {
            try {
              const path = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
              const storage = await getStorage();
              const fileRef = storageRef(storage, path);
              await deleteObject(fileRef);
            } catch (err) {
              console.warn("Failed to delete edit image from storage:", err);
            }
          }
        }
  
        await deleteDoc(editRef);
      } catch (err) {
        console.error("❌ Failed to delete proposed edit:", err);
        alert("Failed to delete edit.");
      }
    }
  };  

  const approveProduct = async (id) => {
    await updateDoc(doc(db, "products", id), { approved: true });
  };

  const rejectProduct = async (id) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        // Step 1: Get the product doc
        const productRef = doc(db, "products", id);
        const productSnap = await getDoc(productRef);
  
        if (productSnap.exists()) {
          const product = productSnap.data();
  
          // Step 2: Delete all image URLs (single or multiple)
          const allImages = [...(product.images || []), ...(product.image ? [product.image] : [])];
  
          for (const url of allImages) {
            try {
              const path = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
              const storage = await getStorage();
              const fileRef = storageRef(storage, path);
              await deleteObject(fileRef);
            } catch (err) {
              console.warn("Failed to delete image from storage:", err);
            }
          }
        }
  
        // Step 3: Delete the product document
        await deleteDoc(productRef);
      } catch (err) {
        console.error("❌ Failed to delete product and images:", err);
        alert("Failed to delete product.");
      }
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

                  {/* ✅ Show multiple images if available */}
                  {item.images?.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pt-2">
                      {item.images.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`${item.name} ${index + 1}`}
                          className="w-40 h-32 object-cover rounded"
                        />
                      ))}
                    </div>
                  ) : item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-40 object-cover rounded"
                    />
                  ) : null}

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

                  {/* ✅ Show multiple images if available */}
                  {item.images?.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pt-2">
                      {item.images.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`${item.name} ${index + 1}`}
                          className="w-40 h-32 object-cover rounded"
                        />
                      ))}
                    </div>
                  ) : item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-40 object-cover rounded"
                    />
                  ) : null}

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
