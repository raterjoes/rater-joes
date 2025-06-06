import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";

export default function NewActivityWindow() {
  const [posts, setPosts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [minimized, setMinimized] = useState(() => window.innerWidth < 640);
  const navigate = useNavigate();

  useEffect(() => {
    const postQuery = query(
      collection(db, "chat_posts"),
      where("createdAt", "!=", null)
    );
    const unsubscribePosts = onSnapshot(postQuery, (snapshot) => {
      const postList = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: "post",
        createdAt: doc.data().createdAt?.toDate(),
        text: doc.data().text,
      }));
      setPosts(postList);
    });

    const recipeQuery = query(
      collection(db, "recipes"),
      where("approved", "==", true)
    );
    const unsubscribeRecipes = onSnapshot(recipeQuery, (snapshot) => {
      const recipeList = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: "recipe",
        createdAt: doc.data().createdAt?.toDate(),
        title: doc.data().title,
      }));
      setRecipes(recipeList);
    });

    return () => {
      unsubscribePosts();
      unsubscribeRecipes();
    };
  }, []);

  const combined = [...posts, ...recipes]
    .filter((item) => item.createdAt)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12);

  const handleClick = (item) => {
    if (item.type === "recipe") {
      navigate(`/recipes/${item.id}`);
    } else if (item.type === "post") {
      navigate(`/chat?post=${item.id}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[90vw] sm:w-[360px] text-sm font-sans drop-shadow-lg">
      {minimized ? (
        window.innerWidth < 640 ? (
          // 🔹 On mobile: small floating button
          <button
            onClick={() => setMinimized(false)}
            className="bg-rose-100 text-rose-800 border border-rose-800 px-5 py-2 text-sm font-semibold rounded-full shadow-sm hover:bg-rose-50 transition"
          >
            New Activity
          </button>
        ) : (
          // 🔹 On desktop: minimized bar with "Expand"
          <button
                onClick={() => setMinimized(false)}
                className="w-full text-left bg-white border border-gray-300 rounded-lg overflow-hidden shadow-xl hover:bg-rose-50 transition"
                >
                <div className="flex justify-between items-center px-4 py-2 bg-rose-100 border-b border-rose-200">
                    <h3 className="text-base font-semibold text-rose-800">📝 Live Activity</h3>
                    <span className="text-xs text-rose-700 underline">Expand</span>
                </div>
         </button>
        )
      ) : (
        // 🔹 Fully expanded version
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-xl">
          <div className="flex justify-between items-center px-4 py-2 bg-rose-100 border-b border-rose-200">
            <h3 className="text-base font-semibold text-rose-800">📝 Live Activity</h3>
            <button
              onClick={() => setMinimized(true)}
              className="text-xs text-rose-700 hover:underline transition"
            >
              Minimize
            </button>
          </div>
  
          <ul className="max-h-72 overflow-y-auto text-gray-800 text-sm divide-y divide-gray-200">
            {combined.map((item) => (
              <li
                key={item.id}
                onClick={() => handleClick(item)}
                className="px-4 py-2 hover:bg-gray-50 transition cursor-pointer"
              >
                {item.type === "post" ? (
                  <span>💬 New post: {item.text.slice(0, 60)}...</span>
                ) : (
                  <span>🍽️ New recipe: {item.title}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );  
}