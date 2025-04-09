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

  useEffect(() => {
    const fetchData = async () => {
      // Fetch recipe
      const docRef = doc(db, "recipes", id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setRecipe(snapshot.data());
      }

      // Fetch products
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
      <main className="flex-grow max-w-3xl mx-auto px-4 py-10 space-y-6">
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
                    <Link to={`/products/${id}`} className="hover:underline">
                      {product?.name || "View Product"}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

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
                className="bg-white p-3 rounded shadow text-sm"
              >
                <p className="text-gray-800">{comment.text}</p>
                <p className="text-xs text-gray-500 mt-1">
                    — {comment.nickname || "Anonymous"}
                </p>
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
