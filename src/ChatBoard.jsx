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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { useAuth } from "./AuthContext";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ChatBoard() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState(null);
  const [comments, setComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentImages, setCommentImages] = useState({});

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
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    posts.forEach((post) => {
      const q = query(
        collection(db, "chat_posts", post.id, "comments"),
        orderBy("createdAt", "asc")
      );
      onSnapshot(q, async (snapshot) => {
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

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">💬 Chat Board</h1>

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
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Post
          </button>
        </form>

        {posts.map((post) => (
          <div key={post.id} className="mb-8 border rounded p-4 bg-white shadow">
            <p className="text-sm text-gray-800 mb-1">{post.text}</p>
            {post.image && (
              <img src={post.image} alt="Post" className="w-full max-w-sm mb-2" />
            )}
            <p className="text-xs text-gray-500 mb-3">by {post.nickname}</p>

            <div className="space-y-2">
              {(comments[post.id] || []).map((comment) => (
                <div
                  key={comment.id}
                  className="ml-4 p-2 bg-gray-50 border rounded"
                >
                  <p className="text-sm text-gray-800">{comment.text}</p>
                  {comment.image && (
                    <img
                      src={comment.image}
                      alt="Comment"
                      className="mt-1 w-40 h-auto rounded"
                    />
                  )}
                  <p className="text-xs text-gray-500">by {comment.nickname}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1">
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentInputs[post.id] || ""}
                onChange={(e) =>
                  setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                }
                className="w-full p-2 border rounded"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setCommentImages((prev) => ({ ...prev, [post.id]: e.target.files[0] }))
                }
              />
              <button
                onClick={() => handleNewComment(post.id)}
                className="mt-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Comment
              </button>
            </div>
          </div>
        ))}
      </main>
      <Footer />
    </div>
  );
}