import { useState, useEffect } from "react";
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
import { db, storage } from "./firebase";
import { useAuth } from "./AuthContext";
import Navbar from "./Navbar";
import Footer from "./Footer";
import chatboardImg from "./assets/chatboard2.jpg";
import { Link } from "react-router-dom";

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

export default function ChatBoard() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState(null);
  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentImages, setCommentImages] = useState({});
  const [expandedPosts, setExpandedPosts] = useState({});

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const snapshot = await getDocs(collection(db, "admins"));
        const adminEmails = snapshot.docs.map((doc) => doc.data().email);
        setIsAdmin(adminEmails.includes(user.email));
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

      // Listen for likes
      const likesRef = collection(db, "chat_posts", post.id, "likes");
      onSnapshot(likesRef, (snapshot) => {
        setLikes((prev) => ({
          ...prev,
          [post.id]: snapshot.docs.map((doc) => doc.id)
        }));
      });
    });
  }, [posts]);

  const handleNewPost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim() && !newPostImage) return;

    let imageUrl = "";
    if (newPostImage) {
      const imageRef = ref(storage, `chat-images/${Date.now()}-${newPostImage.name}`);
      await uploadBytes(imageRef, newPostImage);
      imageUrl = await getDownloadURL(imageRef);
    }

    await addDoc(collection(db, "chat_posts"), {
      text: newPostText,
      image: imageUrl,
      createdAt: serverTimestamp(),
      userEmail: user.email,
      userId: user.uid,
    });

    setNewPostText("");
    setNewPostImage(null);
  };

  const handleNewComment = async (postId) => {
    const text = commentInputs[postId];
    const image = commentImages[postId];
    if (!text?.trim() && !image) return;

    let imageUrl = "";
    if (image) {
      const imageRef = ref(storage, `chat-images/${Date.now()}-${image.name}`);
      await uploadBytes(imageRef, image);
      imageUrl = await getDownloadURL(imageRef);
    }

    await addDoc(collection(db, "chat_posts", postId, "comments"), {
      text,
      image: imageUrl,
      createdAt: serverTimestamp(),
      userEmail: user.email,
      userId: user.uid,
    });

    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setCommentImages((prev) => ({ ...prev, [postId]: null }));
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

  const deletePost = async (postId, imageUrl) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const commentsSnapshot = await getDocs(collection(db, "chat_posts", postId, "comments"));
      for (const docSnap of commentsSnapshot.docs) {
        const data = docSnap.data();
        if (data.image) {
          const imageRef = ref(storage, data.image);
          await deleteObject(imageRef).catch(() => {});
        }
        await deleteDoc(docSnap.ref);
      }

      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(() => {});
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
        const imageRef = ref(storage, imageUrl);
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

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-gray-50">
      <Navbar />
      <main className="flex-grow max-w-3xl mx-auto px-4 py-10">
        <img
          src={chatboardImg}
          className="w-full max-h-64 object-cover rounded shadow mb-6"
          alt="Chat board header"
        />

        {user && (
          <form onSubmit={handleNewPost} className="mb-6 space-y-2">
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="Write a new post..."
              className="w-full p-2 border rounded"
              rows={3}
            />
            <input
              type="file"
              accept="image/*"
              className="block w-full max-w-xs text-sm"
              onChange={(e) => setNewPostImage(e.target.files[0])}
            />
            {newPostImage && (
              <img
                src={URL.createObjectURL(newPostImage)}
                alt="preview"
                className="w-32 h-32 object-cover rounded border"
              />
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-rose-800/80 text-white rounded hover:bg-blue-700"
            >
              Post
            </button>
          </form>
        )}

        {posts.map((post) => (
          <div key={post.id} className="mb-8 border rounded p-4 bg-white shadow">
            <p className="text-sm text-gray-800 mb-1">{post.text}</p>
            {post.image && (
              <img
                src={post.image}
                alt="Post"
                className="w-full max-w-full sm:max-w-sm mb-2 rounded"
              />
            )}
            <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
              <p>
                by {post.nickname} • {formatTimestamp(post.createdAt)}
              </p>
              <button
                onClick={() => toggleLike(post.id)}
                className={`text-sm ${likes[post.id]?.includes(user?.uid) ? "text-blue-600 font-semibold" : ""}`}
              >
                👍 {likes[post.id]?.length || 0}
              </button>
            </div>

            {(isAdmin || user?.uid === post.userId) && (
              <button
                onClick={() => deletePost(post.id, post.image)}
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
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                expandedPosts[post.id] ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="space-y-2 mt-2">
                {(comments[post.id] || []).map((comment) => (
                  <div key={comment.id} className="ml-4 p-2 bg-gray-50 border rounded">
                    <p className="text-sm text-gray-800">{comment.text}</p>
                    {comment.image && (
                      <img
                        src={comment.image}
                        alt="Comment"
                        className="mt-1 max-w-full sm:w-40 h-auto rounded"
                      />
                    )}
                    <p className="text-xs text-gray-500">
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
                  </div>
                ))}
              </div>

              {user ? (
                <div className="mt-4 space-y-1">
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
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full max-w-xs text-sm"
                    onChange={(e) =>
                      setCommentImages((prev) => ({
                        ...prev,
                        [post.id]: e.target.files[0],
                      }))
                    }
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
      <Footer />
    </div>
  );
}