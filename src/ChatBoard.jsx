import { useState, useEffect, useRef, useMemo } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  doc,
  getDoc,
  deleteDoc,
  getDocs,
  setDoc
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { db, getStorage } from "./firebase";
import { useAuth } from "./AuthContext";
import Navbar from "./Navbar";
import Footer from "./Footer";
import chatboardImg from "./assets/chatboard2.webp";
import { Link, useSearchParams } from "react-router-dom";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import LikePopover from "./LikePopover";


function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now - date;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString();
}

function renderPostText(text, taggedProducts) {
  // Regex to match [Product Name]
  return text.split(/(\[[^\]]+\])/g).map((part, i) => {
    const match = part.match(/^\[(.+)\]$/);
    if (match) {
      const name = match[1];
      const product = (taggedProducts || []).find(p => p.name === name);
      if (product) {
        return (
          <Link key={i} to={`/products/${product.id}`} className="text-blue-700 underline">
            {product.name}
          </Link>
        );
      }
    }
    return part;
  });
}

export default function ChatBoard() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImages, setNewPostImages] = useState([null]);
  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});
  const [commentLikes, setCommentLikes] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentImages, setCommentImages] = useState({});
  const [expandedPosts, setExpandedPosts] = useState({});
  const [highlightedPostId, setHighlightedPostId] = useState(null);
  const [searchParams] = useSearchParams();
  const postRefs = useRef({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [likerNicknames, setLikerNicknames] = useState({});
  const [commentLikerNicknames, setCommentLikerNicknames] = useState({});
  const [products, setProducts] = useState([]);
  const [newPostProductIds, setNewPostProductIds] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [taggedProducts, setTaggedProducts] = useState([]);
  const [commentTaggedProducts, setCommentTaggedProducts] = useState({});
  const [commentProductSearch, setCommentProductSearch] = useState({});

  useEffect(() => {
    const param = searchParams.get("post");
    if (param) {
      setHighlightedPostId(param);
    }
  }, [searchParams]);  

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          setIsAdmin(userDoc.exists() && userDoc.data().isAdmin === true);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, "chat_posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let nickname = null;
          if (data.userId) {
            const userDoc = await getDoc(doc(db, "users", data.userId));
            if (userDoc.exists()) {
              nickname = userDoc.data().nickname;
            }
          }
          return {
            id: docSnap.id,
            ...data,
            nickname: nickname || "Anonymous",
          };
        })
      );
      setPosts(list);          

      // Expand all posts initially
      const initialExpanded = {};
      list.forEach((post) => {
        initialExpanded[post.id] = true;
      });
      setExpandedPosts(initialExpanded);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (highlightedPostId && postRefs.current[highlightedPostId]) {
      const timeout = setTimeout(() => {
        postRefs.current[highlightedPostId]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
  
        // Fade the highlight after 3 seconds
        setTimeout(() => {
          setHighlightedPostId(null);
        }, 3000);
      }, 90);
  
      return () => clearTimeout(timeout);
    }
  }, [highlightedPostId, posts]);  

  useEffect(() => {
    posts.forEach((post) => {
      const commentQuery = query(
        collection(db, "chat_posts", post.id, "comments"),
        orderBy("createdAt", "asc")
      );

      onSnapshot(commentQuery, async (snapshot) => {
        const commentList = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            let nickname = null;
            if (data.userId) {
              const userDoc = await getDoc(doc(db, "users", data.userId));
              if (userDoc.exists()) {
                nickname = userDoc.data().nickname;
              }
            }
            return {
              id: docSnap.id,
              ...data,
              nickname: nickname || "Anonymous",
            };
          })
        );
        setComments((prev) => ({ ...prev, [post.id]: commentList }));
      });

      // Listen for post likes
      const likesRef = collection(db, "chat_posts", post.id, "likes");
      onSnapshot(likesRef, (snapshot) => {
        setLikes((prev) => ({
          ...prev,
          [post.id]: snapshot.docs.map((doc) => doc.id)
        }));
      });
    });
  }, [posts]);

  // Set up comment likes listeners
  useEffect(() => {
    const unsubscribers = [];
    
    Object.entries(comments).forEach(([postId, commentList]) => {
      commentList.forEach((comment) => {
        const commentLikesRef = collection(db, "chat_posts", postId, "comments", comment.id, "likes");
        const unsubscribe = onSnapshot(commentLikesRef, (snapshot) => {
          setCommentLikes((prev) => ({
            ...prev,
            [`${postId}-${comment.id}`]: snapshot.docs.map((doc) => doc.id)
          }));
        });
        unsubscribers.push(unsubscribe);
      });
    });

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [comments]);

  useEffect(() => {
    // Fetch nicknames for all likers of all posts
    async function fetchNicknames() {
      const allLikerIds = new Set();
      Object.values(likes).forEach((ids) => ids && ids.forEach((id) => allLikerIds.add(id)));
      const nicknameMap = {};
      await Promise.all(
        Array.from(allLikerIds).map(async (uid) => {
          if (!uid) return;
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            nicknameMap[uid] = userDoc.exists() ? (userDoc.data().nickname || userDoc.data().email || "Anonymous") : "Anonymous";
          } catch {
            nicknameMap[uid] = "Anonymous";
          }
        })
      );
      setLikerNicknames(nicknameMap);
    }
    if (Object.keys(likes).length > 0) fetchNicknames();
  }, [likes]);

  useEffect(() => {
    // Fetch nicknames for all likers of all comments
    async function fetchCommentNicknames() {
      const allCommentLikerIds = new Set();
      Object.values(commentLikes).forEach((ids) => ids && ids.forEach((id) => allCommentLikerIds.add(id)));
      const nicknameMap = {};
      await Promise.all(
        Array.from(allCommentLikerIds).map(async (uid) => {
          if (!uid) return;
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            nicknameMap[uid] = userDoc.exists() ? (userDoc.data().nickname || userDoc.data().email || "Anonymous") : "Anonymous";
          } catch {
            nicknameMap[uid] = "Anonymous";
          }
        })
      );
      setCommentLikerNicknames(nicknameMap);
    }
    if (Object.keys(commentLikes).length > 0) fetchCommentNicknames();
  }, [commentLikes]);

  useEffect(() => {
    // Fetch products for tagging
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, "products"));
      setProducts(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    };
    fetchProducts();
  }, []);

  // Add product tag to the list
  const addProductTag = (product) => {
    if (!taggedProducts.find(p => p.id === product.id)) {
      setTaggedProducts([...taggedProducts, product]);
      setNewPostText(prev => prev + ` [${product.name}]`);
    }
    setProductSearch("");
  };

  // Remove product tag from the list
  const removeProductTag = (productId) => {
    const product = taggedProducts.find(p => p.id === productId);
    if (product) {
      setTaggedProducts(taggedProducts.filter(p => p.id !== productId));
      setNewPostText(prev => prev.replace(` [${product.name}]`, ''));
    }
  };



  const handleNewPost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim() && newPostImages.every((img) => !img)) return;
  
    const imageUrls = [];
  
    const uploadPromises = newPostImages
      .filter(Boolean)
      .map(async (file) => {
        const imageRef = ref(await getStorage(), `chat-images/${Date.now()}-${file.name}`);
        await uploadBytes(imageRef, file);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
      });
  
    await Promise.all(uploadPromises);
  
    await addDoc(collection(db, "chat_posts"), {
      text: newPostText,
      images: imageUrls,
      productIds: taggedProducts.map(p => p.id),
      taggedProducts: taggedProducts.map(p => ({ id: p.id, name: p.name })),
      createdAt: serverTimestamp(),
      userEmail: user.email,
      userId: user.uid,
    });
  
    setNewPostText("");
    setTaggedProducts([]);
    setNewPostImages([null]);
    setProductSearch("");
  };  

  const handleNewComment = async (postId) => {
    const text = commentInputs[postId];
    const image = commentImages[postId];
    const taggedProducts = commentTaggedProducts[postId] || [];
    if (!text?.trim() && !image) return;

    let imageUrl = "";
    if (image) {
      const imageRef = ref(await getStorage(), `chat-images/${Date.now()}-${image.name}`);
      await uploadBytes(imageRef, image);
      imageUrl = await getDownloadURL(imageRef);
    }

    await addDoc(collection(db, "chat_posts", postId, "comments"), {
      text,
      image: imageUrl,
      productIds: taggedProducts.map(p => p.id),
      taggedProducts: taggedProducts.map(p => ({ id: p.id, name: p.name })),
      createdAt: serverTimestamp(),
      userEmail: user.email,
      userId: user.uid,
    });

    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setCommentImages((prev) => ({ ...prev, [postId]: null }));
    setCommentTaggedProducts((prev) => ({ ...prev, [postId]: [] }));
    setCommentProductSearch((prev) => ({ ...prev, [postId]: "" }));
  };

  const toggleLike = async (postId) => {
    if (!user) return;
    const likeRef = doc(db, "chat_posts", postId, "likes", user.uid);
    const userHasLiked = likes[postId]?.includes(user.uid);

    if (userHasLiked) {
      await deleteDoc(likeRef);
    } else {
      await setDoc(likeRef, { likedAt: serverTimestamp() });
    }
  };

  const toggleCommentLike = async (postId, commentId) => {
    if (!user) return;
    
    try {
      const likeRef = doc(db, "chat_posts", postId, "comments", commentId, "likes", user.uid);
      const userHasLiked = commentLikes[`${postId}-${commentId}`]?.includes(user.uid);

      if (userHasLiked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, { likedAt: serverTimestamp() });
      }
    } catch (error) {
      console.error("Error toggling comment like:", error);
    }
  };

  const deletePost = async (postId, imageUrls = []) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
  
    try {
      const commentsSnapshot = await getDocs(collection(db, "chat_posts", postId, "comments"));
      for (const docSnap of commentsSnapshot.docs) {
        const data = docSnap.data();
        if (data.image) {
          const imageRef = ref(await getStorage(), data.image);
          await deleteObject(imageRef).catch(() => {});
        }
        await deleteDoc(docSnap.ref);
      }
  
      // 🔁 Delete all images in the post
      if (Array.isArray(imageUrls)) {
        for (const url of imageUrls) {
          const imageRef = ref(await getStorage(), url);
          await deleteObject(imageRef).catch(() => {});
        }
      }
  
      await deleteDoc(doc(db, "chat_posts", postId));
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post.");
    }
  };  

  const deleteComment = async (postId, commentId, imageUrl) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      if (imageUrl) {
        const imageRef = ref(await getStorage(), imageUrl);
        await deleteObject(imageRef).catch(() => {});
      }
      await deleteDoc(doc(db, "chat_posts", postId, "comments", commentId));
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert("Failed to delete comment.");
    }
  };

  const toggleComments = (postId) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handlePostImageChange = (index, file) => {
    const updated = [...newPostImages];
    updated[index] = file;
    setNewPostImages(updated);
  
    if (updated.every((f) => f !== null)) {
      setNewPostImages([...updated, null]);
    }
  };
  
  const handleRemovePostImage = (index) => {
    const updated = [...newPostImages];
    updated.splice(index, 1);
  
    if (updated.length === 0 || updated.every((f) => f !== null)) {
      updated.push(null);
    }
  
    setNewPostImages(updated);
  };  

  function addCommentProductTag(postId, product) {
    setCommentTaggedProducts(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), product]
    }));
    setCommentInputs(prev => ({
      ...prev,
      [postId]: (prev[postId] || "") + ` [${product.name}]`
    }));
    setCommentProductSearch(prev => ({ ...prev, [postId]: "" }));
  }

  function removeCommentProductTag(postId, productId) {
    setCommentTaggedProducts(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).filter(p => p.id !== productId)
    }));
    // Optionally remove from text as well
    // (not strictly necessary, but can be added for UX)
  }

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-orange-50">
      <Navbar />
      <main className="flex-grow max-w-3xl mx-auto px-4 py-10">
        <img
          src={chatboardImg}
          className="w-full max-h-64 object-cover rounded shadow mb-6"
          alt="Chat board header"
        />

        {user ? (
          <form onSubmit={handleNewPost} className="mb-6 space-y-2">
            <div className="w-full p-2 border rounded bg-white mb-2">
              {/* Product Tagging Autocomplete */}
              {products.length > 0 && (
                <div className="mb-2">
                  <label className="block text-xs font-medium mb-1 text-gray-500">Tag products (optional):</label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full p-2 border rounded text-sm"
                  />
                  {productSearch && (
                    <div className="max-h-40 overflow-y-auto border rounded bg-white shadow z-10 relative">
                      {products
                        .filter(p =>
                          p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
                          !taggedProducts.find(tp => tp.id === p.id)
                        )
                        .slice(0, 10)
                        .map(product => (
                          <div
                            key={product.id}
                            className="px-2 py-1 cursor-pointer hover:bg-blue-100 text-sm"
                            onClick={() => addProductTag(product)}
                          >
                            {product.name}
                          </div>
                        ))}
                      {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && !taggedProducts.find(tp => tp.id === p.id)).length === 0 && (
                        <div className="px-2 py-1 text-gray-400 text-xs">No products found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Product Tag Chips */}
              {taggedProducts.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {taggedProducts.map(product => (
                    <span
                      key={product.id}
                      className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                    >
                      {product.name}
                      <button
                        type="button"
                        className="ml-1 text-blue-800 hover:text-red-600"
                        onClick={() => removeProductTag(product.id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Textarea for post content */}
              <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Write a new post..."
                className="w-full min-h-[60px] p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                spellCheck
              />
            </div>
            {newPostImages.map((file, index) => {
              const isNextEmptyInput =
                index > 0 && newPostImages[index] === null && newPostImages[index - 1] !== null;

              return (
                <div key={index} className="relative mt-2">
                  {isNextEmptyInput && (
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Add another image?
                    </p>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePostImageChange(index, e.target.files[0])}
                    className="w-full max-w-xs p-2 border rounded text-sm"
                  />
                  {file && (
                    <div className="relative inline-block mt-2">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-24 h-24 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePostImage(index)}
                        className="absolute top-[-8px] right-[-8px] bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ✖
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              type="submit"
              className="px-4 py-2 bg-rose-800/80 text-white rounded hover:bg-blue-700"
            >
              Post
            </button>
          </form>
        ) : (
          <p className="mb-6 text-red-500">
            Please{" "}
            <Link
              to="/login"
              className="text-red-600 underline hover:text-blue-800"
            >
              log in
            </Link>{" "}
            to post.
          </p>
        )}

        {posts.map((post) => (
          <div
            key={post.id}
            ref={(el) => (postRefs.current[post.id] = el)}
            className={`
              mb-8 border rounded p-4 bg-white shadow transition
              ${highlightedPostId === post.id ? "ring-2 ring-rose-500 animate-pulse-once" : ""}
            `}
          >
            <p className="text-sm text-gray-800 mb-1">
              {renderPostText(
                post.text,
                post.taggedProducts && post.taggedProducts.length > 0
                  ? post.taggedProducts
                  : (post.productIds || []).map(pid => {
                      const product = products.find(p => p.id === pid);
                      return product ? { id: product.id, name: product.name } : null;
                    }).filter(Boolean)
              )}
            </p>
            {post.images?.length > 0 &&
              post.images.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Post image ${index + 1}`}
                  onClick={() => {
                    setLightboxImages(post.images.map((url) => ({ src: url })));
                    setLightboxIndex(index);
                    setLightboxOpen(true);
                  }}
                  className="w-full max-w-full sm:max-w-sm mb-2 rounded cursor-pointer hover:opacity-90 transition"
                />
            ))}
            <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
              <p>
                by {post.nickname} • {formatTimestamp(post.createdAt)}
              </p>
              <LikePopover
                likers={(likes[post.id] || []).map((uid) => likerNicknames[uid] || "Anonymous")}
                onClick={() => toggleLike(post.id)}
              />
            </div>

            {(isAdmin || user?.uid === post.userId) && (
              <button
                onClick={() => deletePost(post.id, post.images)}
                className="text-red-500 text-sm mb-2 hover:underline"
              >
                Delete Post
              </button>
            )}

            <button
              onClick={() => toggleComments(post.id)}
              className="text-blue-600 text-sm mb-2 hover:underline block"
            >
              {expandedPosts[post.id]
                ? "Hide Comments"
                : `Show Comments (${(comments[post.id] || []).length})`}
            </button>

            <div
              className={`transition-all duration-300 ease-in-out ${
                expandedPosts[post.id] ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
              }`}
            >
              <div className="space-y-2 mt-2">
                {(comments[post.id] || []).map((comment) => (
                  <div key={comment.id} className="ml-4 p-2 bg-gray-50 border rounded">
                    <p className="text-sm text-gray-800">{renderPostText(comment.text, comment.taggedProducts && comment.taggedProducts.length > 0 ? comment.taggedProducts : (comment.productIds || []).map(pid => { const product = products.find(p => p.id === pid); return product ? { id: product.id, name: product.name } : null; }).filter(Boolean))}</p>
                    {comment.image && (
                      <img
                        src={comment.image}
                        alt="Comment"
                        className="mt-1 max-w-full sm:w-40 h-auto rounded"
                      />
                    )}
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                      <p>
                        by {comment.nickname} • {formatTimestamp(comment.createdAt)}
                        {(isAdmin || user?.uid === comment.userId) && (
                          <button
                            onClick={() =>
                              deleteComment(post.id, comment.id, comment.image)
                            }
                            className="ml-2 text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </p>
                      <div className="relative z-20">
                        <LikePopover
                          likers={(commentLikes[`${post.id}-${comment.id}`] || []).map((uid) => commentLikerNicknames[uid] || "Anonymous")}
                          onClick={() => toggleCommentLike(post.id, comment.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {user ? (
                <div className="mt-4 space-y-1">
                  {/* Product Tagging Autocomplete for comments */}
                  {products.length > 0 && (
                    <div className="mb-1">
                      <input
                        type="text"
                        value={commentProductSearch[post.id] || ""}
                        onChange={e => setCommentProductSearch(prev => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Tag products in comment..."
                        className="w-full p-2 border rounded text-sm"
                      />
                      {commentProductSearch[post.id] && (
                        <div className="max-h-40 overflow-y-auto border rounded bg-white shadow z-10 relative">
                          {products
                            .filter(p =>
                              p.name.toLowerCase().includes((commentProductSearch[post.id] || "").toLowerCase()) &&
                              !(commentTaggedProducts[post.id] || []).find(tp => tp.id === p.id)
                            )
                            .slice(0, 10)
                            .map(product => (
                              <div
                                key={product.id}
                                className="px-2 py-1 cursor-pointer hover:bg-blue-100 text-sm"
                                onClick={() => addCommentProductTag(post.id, product)}
                              >
                                {product.name}
                              </div>
                            ))}
                          {products.filter(p => p.name.toLowerCase().includes((commentProductSearch[post.id] || "").toLowerCase()) && !(commentTaggedProducts[post.id] || []).find(tp => tp.id === p.id)).length === 0 && (
                            <div className="px-2 py-1 text-gray-400 text-xs">No products found</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Product Tag Chips for comments */}
                  {(commentTaggedProducts[post.id] || []).length > 0 && (
                    <div className="mb-1 flex flex-wrap gap-1">
                      {(commentTaggedProducts[post.id] || []).map(product => (
                        <span
                          key={product.id}
                          className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                        >
                          {product.name}
                          <button
                            type="button"
                            className="ml-1 text-blue-800 hover:text-red-600"
                            onClick={() => removeCommentProductTag(post.id, product.id)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Textarea for comment content */}
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentInputs[post.id] || ""}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                    className="w-full p-2 border rounded"
                  />
                  <button
                    onClick={() => handleNewComment(post.id)}
                    className="mt-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Comment
                  </button>
                </div>
              ) : (
                <p className="text-sm text-red-500 mt-4">
                  Please{" "}
                  <Link
                    to="/login"
                    className="text-red-600 underline hover:text-blue-800"
                  >
                    log in
                  </Link>{" "}
                  to comment.
                </p>
              )}
            </div>
          </div>
        ))}
      </main>
      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={lightboxImages}
          plugins={[Zoom]}
          zoom={{ maxZoomPixelRatio: 4 }}
        />
      )}
      <Footer />
    </div>
  );
}