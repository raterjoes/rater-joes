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
import {
  FacebookShareButton,
  TwitterShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon
} from "react-share";
import { useState as useCopyState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import React from "react";
import { Helmet } from "react-helmet-async";

function UniversalWhatsappShareButton({ url, title }) {
  const handleClick = (e) => {
    e.preventDefault();
    const text = encodeURIComponent(title + " " + url);
    const appUrl = `whatsapp://send?text=${text}`;
    const webUrl = `https://wa.me/?text=${text}`;
    // Try to open the app
    window.location.href = appUrl;
    // Fallback to web after 1 second if app not opened
    setTimeout(() => {
      window.open(webUrl, "_blank");
    }, 1000);
  };
  return (
    <button onClick={handleClick} className="focus:outline-none" title="Share on WhatsApp">
      <WhatsappIcon size={32} round />
    </button>
  );
}

export default function RecipeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState(null);
  const [products, setProducts] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useCopyState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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
      const userDoc = await getDoc(doc(db, "users", user.uid));
      setIsAdmin(userDoc.exists() && userDoc.data().isAdmin === true);
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
        <Helmet>
          <title>{recipe?.title || 'Recipe'}</title>
          <meta property="og:title" content={recipe?.title || ''} />
          <meta property="og:description" content={recipe?.description || ''} />
          <meta property="og:image" content={recipe?.images?.[0] || ''} />
          <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
          <meta property="og:type" content="website" />
        </Helmet>
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
      <Helmet>
        <title>{recipe?.title || 'Recipe'}</title>
        <meta property="og:title" content={recipe?.title || ''} />
        <meta property="og:description" content={recipe?.description || ''} />
        <meta property="og:image" content={recipe?.images?.[0] || ''} />
        <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
        <meta property="og:type" content="website" />
      </Helmet>
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
                className="w-48 h-36 object-cover rounded cursor-pointer"
                onClick={() => {
                  setLightboxIndex(index);
                  setLightboxOpen(true);
                }}
              />
            ))}
            <Lightbox
              open={lightboxOpen}
              close={() => setLightboxOpen(false)}
              index={lightboxIndex}
              slides={recipe.images.map((url) => ({ src: url }))}
              plugins={[Zoom]}
              zoom={{ maxZoomPixelRatio: 4 }}
            />
          </div>
        )}

        <div className="flex items-center gap-2 mt-1 mb-0">
          <FacebookShareButton url={window.location.href} quote={recipe.title}>
            <FacebookIcon size={32} round />
          </FacebookShareButton>
          <TwitterShareButton url={window.location.href} title={recipe.title}>
            <TwitterIcon size={32} round />
          </TwitterShareButton>
          <UniversalWhatsappShareButton url={window.location.href} title={recipe.title} />
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="focus:outline-none"
            title="Copy link"
          >
            <span className="inline-block w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 text-lg font-bold">🔗</span>
          </button>
          {copied && <span className="text-green-600 text-xs ml-1">Copied!</span>}
        </div>

        {recipe.description && (
          <p className="text-lg text-gray-700 mt-0">{recipe.description}</p>
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