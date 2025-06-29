import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { db, getStorage } from "./firebase";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function PendingRecipes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingRecipes, setPendingRecipes] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

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
    if (adminCheckComplete && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, adminCheckComplete, navigate]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const q = query(collection(db, "recipes"), where("approved", "==", false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPendingRecipes(list);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const approveRecipe = async (id) => {
    await updateDoc(doc(db, "recipes", id), { approved: true });
    alert("✅ Recipe approved!");
  };

  const rejectRecipe = async (id) => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    try {
      const recipeRef = doc(db, "recipes", id);
      const recipeSnap = await getDoc(recipeRef);

      if (recipeSnap.exists()) {
        const recipe = recipeSnap.data();
        const allImages = recipe.images || [];

        for (const url of allImages) {
          try {
            const path = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
            const fileRef = storageRef(storage, path);
            await deleteObject(fileRef);
          } catch (err) {
            console.warn("⚠️ Failed to delete image from storage:", err);
          }
        }
      }

      await deleteDoc(recipeRef);
      alert("❌ Recipe deleted.");
    } catch (err) {
      console.error("Error deleting recipe:", err);
      alert("Failed to delete recipe.");
    }
  };

  if (!user || !isAdmin) {
    return <p className="text-center mt-10 text-red-600">Access denied</p>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-orange-50 text-gray-900">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Pending Recipes</h1>

        {pendingRecipes.length === 0 ? (
          <p>No recipes pending approval.</p>
        ) : (
          <div className="space-y-6">
            {pendingRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="border rounded-lg p-4 bg-white shadow space-y-2"
              >
                <h2 className="text-xl font-semibold">{recipe.title}</h2>
                {recipe.description && (
                  <p className="text-sm text-gray-700">{recipe.description}</p>
                )}
                <p className="text-sm whitespace-pre-line">{recipe.steps}</p>

                {recipe.images?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-2">
                    {recipe.images.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`${recipe.title} ${index + 1}`}
                        className="w-40 h-32 object-cover rounded"
                      />
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => approveRecipe(recipe.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => rejectRecipe(recipe.id)}
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