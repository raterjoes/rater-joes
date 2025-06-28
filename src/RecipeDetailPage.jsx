import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useAuth } from "./AuthContext";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState(null);
  const [products, setProducts] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const docRef = doc(db, "recipes", id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setRecipe(snapshot.data());
      }

      const productSnap = await getDocs(collection(db, "products"));
      const productList = productSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setProducts(productList);
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, "recipes", id, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(list);
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const adminDoc = await getDoc(doc(db, "admins", user.email));
      setIsAdmin(adminDoc.exists());
    };
    checkAdmin();
  }, [user]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    let nickname = null;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        nickname = userDoc.data().nickname || null;
      }
    } catch (err) {
      console.error("Failed to fetch nickname:", err);
    }

    await addDoc(collection(db, "recipes", id, "comments"), {
      text: commentText.trim(),
      createdAt: serverTimestamp(),
      userId: user.uid,
      userEmail: user.email,
      nickname,
    });

    setCommentText("");
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteDoc(doc(db, "recipes", id, "comments", commentId));
    } catch (err) {
      console.error("Failed to delete comment:", err);
      alert("Failed to delete comment.");
    }
  };

  if (!recipe) {
    return (
      <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
        <Navbar />
        <main className="flex-grow max-w-3xl mx-auto px-4 py-10">
          <p>Loading recipe...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
      <Navbar />
      <main className="flex-grow w-full max-w-3xl sm:max-w-3xl md:max-w-4xl lg:max-w-4xl mx-auto px-6 py-10 space-y-8">
        <h1 className="text-3xl font-bold">{recipe.title}</h1>

        {recipe.images?.length > 0 && (
          <div className="flex gap-3 overflow-x-auto">
            {recipe.images.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`${recipe.title} ${index + 1}`}
                className="w-48 h-36 object-cover rounded"
              />
            ))}
          </div>
        )}

        {recipe.description && (
          <p className="text-lg text-gray-700">{recipe.description}</p>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-1">Steps / Ingredients</h2>
          <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">
            {recipe.steps}
          </pre>
        </div>

        {recipe.productIds?.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-1">Tagged Products</h2>
            <ul className="list-disc list-inside text-blue-600">
              {recipe.productIds.map((id) => {
                const product = products.find((p) => p.id === id);
                return (
                  <li key={id}>
                    <Link 
                      to={`/products/${id}`} 
                      state={{ fromRecipe: `/recipes/${id}` }}
                      className="hover:underline"
                    >
                      {product?.name || "View Product"}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

<div className="flex gap-3 mt-2">
          {user?.uid === recipe.userId && (
            <button
              onClick={() => (window.location.href = `/edit-recipe/${id}`)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit Recipe
            </button>
          )}

          {isAdmin && (
            <button
            onClick={async () => {
              if (!confirm("Are you sure you want to delete this recipe?")) return;
            
              try {
                const { ref, deleteObject } = await import("firebase/storage");
                const { storage } = await import("./firebase");
            
                // 1. Delete all recipe images
                if (recipe.images?.length > 0) {
                  for (const url of recipe.images) {
                    const path = decodeURIComponent(
                      new URL(url).pathname.split("/o/")[1].split("?")[0]
                    );
                    await deleteObject(ref(storage, path));
                  }
                }
            
                // 2. Delete all comments in subcollection
                const commentsRef = collection(db, "recipes", id, "comments");
                const commentSnap = await getDocs(commentsRef);
                const commentDeletePromises = commentSnap.docs.map((docSnap) =>
                  deleteDoc(docSnap.ref)
                );
                await Promise.all(commentDeletePromises);
            
                // 3. Delete the main recipe document
                await deleteDoc(doc(db, "recipes", id));
            
                alert("Recipe and all related data deleted.");
                window.location.href = "/recipes";
              } catch (err) {
                console.error("Failed to delete everything:", err);
                alert("Failed to delete recipe.");
              }
            }}            
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete Recipe
            </button>
          )}
        </div>

        {/* Comments Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Comments</h2>

          {comments.length === 0 && (
            <p className="text-sm text-gray-500">
              No comments yet. Be the first!
            </p>
          )}

          <ul className="space-y-2">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className="bg-white p-3 rounded shadow text-sm relative"
              >
                <p className="text-gray-800">{comment.text}</p>
                <p className="text-xs text-gray-500 mt-1">
                  — {comment.nickname || "Anonymous"}
                </p>
                {(user?.uid === comment.userId || isAdmin) && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="absolute top-2 right-2 text-red-500 text-xs hover:underline"
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>

          {user ? (
            <form onSubmit={handleSubmitComment} className="mt-4">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                placeholder="Write a comment..."
                className="w-full p-2 border rounded mb-2"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Post Comment
              </button>
            </form>
          ) : (
            <p className="text-sm text-red-600 mt-4">
              Please <Link to="/login" className="underline">log in</Link> to post a comment.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}