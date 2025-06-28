import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { db, getStorage } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { useAuth } from "./AuthContext";
import ReviewForm from "./ReviewForm";
import EditProductForm from "./EditProductForm";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { Link } from "react-router-dom";

export default function ProductPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [sortOption, setSortOption] = useState("newest");
  const [editing, setEditing] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [showLoginMessage, setShowLoginMessage] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [reviewLightboxOpen, setReviewLightboxOpen] = useState(false);
  const [reviewLightboxImages, setReviewLightboxImages] = useState([]);
  const [reviewLightboxIndex, setReviewLightboxIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProduct = async () => {
    const docRef = doc(db, "products", id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      setProduct({ id: snapshot.id, ...snapshot.data() });
    }
  };  

  const handleReviewSubmit = async (review) => {
    if (!user) return;

    const { text, rating, includeName } = review;
    let nickname = null;
    let userEmail = null;

    if (includeName) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          nickname = userDoc.data().nickname || null;
        }
        userEmail = user.email;
      } catch (err) {
        console.error("Error fetching nickname:", err);
      }
    }

    try {
      await addDoc(collection(db, "reviews"), {
        productId: id,
        text,
        rating,
        nickname: includeName ? nickname : null,
        userEmail: includeName ? userEmail : null,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to submit review:", err);
      alert("Failed to submit review.");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    const confirmed = window.confirm("Are you sure you want to delete this review?");
    if (!confirmed) return;

    try {
      const imagesSnap = await getDocs(collection(db, `reviews/${reviewId}/images`));
      for (const docSnap of imagesSnap.docs) {
        const { url } = docSnap.data();
        if (url) {
          try {
            const path = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
            const imgRef = storageRef(storage, path);
            await deleteObject(imgRef);
          } catch (err) {
            console.warn("Failed to delete image from storage:", err);
          }
        }
        await deleteDoc(docSnap.ref);
      }

      await deleteDoc(doc(db, "reviews", reviewId));
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      console.error("Failed to delete review:", err);
      alert("Could not delete review.");
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm("Are you sure you want to delete this product, its reviews, and all images?")) return;
  
    try {
      // 1. Delete product images
      const allImages = [...(product.images || []), ...(product.image ? [product.image] : [])];
      for (const url of allImages) {
        const path = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
        const imgRef = storageRef(storage, path);
        await deleteObject(imgRef).catch(() => {});
      }
  
      // 2. Delete all reviews and their images
      const reviewSnap = await getDocs(query(collection(db, "reviews"), where("productId", "==", id)));
      for (const reviewDoc of reviewSnap.docs) {
        const reviewId = reviewDoc.id;
  
        // delete subcollection images
        const imageSnap = await getDocs(collection(db, `reviews/${reviewId}/images`));
        for (const imgDoc of imageSnap.docs) {
          const imgData = imgDoc.data();
          if (imgData.url) {
            const path = decodeURIComponent(imgData.url.split("/o/")[1].split("?")[0]);
            await deleteObject(storageRef(storage, path)).catch(() => {});
          }
          await deleteDoc(imgDoc.ref);
        }
  
        await deleteDoc(reviewDoc.ref);
      }
  
      // 3. Delete product doc
      await deleteDoc(doc(db, "products", id));
  
      // 4. Navigate away
      alert("✅ Product deleted.");
      window.location.href = "/";
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Failed to delete product.");
    }
  };  

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const snapshot = await getDocs(collection(db, "admins"));
      const emails = snapshot.docs.map((doc) => doc.data().email);
      setIsAdmin(emails.includes(user.email));
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    fetchProduct();

    const q = query(collection(db, "reviews"), where("productId", "==", id));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const reviewsWithImages = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const review = { id: docSnap.id, ...docSnap.data() };

          const imageDocs = await getDocs(collection(db, `reviews/${docSnap.id}/images`));
          const allImages = imageDocs.docs.map((imgDoc) => imgDoc.data());
          const approvedImages = allImages.filter((img) => img.approved);

          review.images = approvedImages;
          review._hasPendingImages = allImages.length > 0 && approvedImages.length === 0;

          return review;
        })
      );

      setReviews(reviewsWithImages);
    });

    return () => unsubscribe();
  }, [id]);

  if (!product) return <div className="text-center mt-10">Loading...</div>;

  const average =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : null;

  let sortedReviews = [...reviews];
  if (sortOption === "newest") {
    sortedReviews.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sortOption === "oldest") {
    sortedReviews.sort((a, b) => a.createdAt - b.createdAt);
  } else if (sortOption === "high-to-low") {
    sortedReviews.sort((a, b) => b.rating - a.rating);
  } else if (sortOption === "low-to-high") {
    sortedReviews.sort((a, b) => a.rating - b.rating);
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900 font-sans">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Product Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-8">
            <div>
              <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2">
                {product.name}
              </h1>
              <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                {product.category}
              </p>
              {average ? (
                <div className="flex items-center text-yellow-500 mb-2">
                  {"⭐".repeat(Math.round(average))}
                  <span className="ml-2 text-sm text-gray-700">({average})</span>
                </div>
              ) : (
                <p className="text-gray-400 mb-2">Not yet rated</p>
              )}
              {product.seasonal && product.season && (() => {
                const seasonStyles = {
                  Winter: { emoji: "❄️", bg: "bg-blue-100", text: "text-blue-700" },
                  Spring: { emoji: "🌱", bg: "bg-green-100", text: "text-green-700" },
                  Summer: { emoji: "☀️", bg: "bg-yellow-100", text: "text-yellow-700" },
                  Fall: { emoji: "🍂", bg: "bg-orange-100", text: "text-orange-700" },
                };
                const style = seasonStyles[product.season] || {};
                return (
                  <div className="mb-2">
                    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${style.bg} ${style.text}`}>
                      {style.emoji} Limited time: {product.season}
                    </span>
                  </div>
                );
              })()}
              <div className="mb-4 space-y-2">
                <button
                  onClick={() => {
                    if (user) {
                      setEditing(true);
                      setShowLoginMessage(false);
                    } else {
                      setShowLoginMessage(true);
                    }
                  }}
                  className="block text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200 transition"
                >
                  ✏️ Edit Product
                </button>

                {isAdmin && (
                  <button
                    onClick={handleDeleteProduct}
                    className="block text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition"
                  >
                    🗑️ Delete Product
                  </button>
                )}

                <div className="flex flex-col items-start gap-2">
                  <Link
                    to={`/recipes?product=${encodeURIComponent(id)}`}
                    className="inline-flex items-center text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 transition"
                  >
                    📖 See Recipes
                  </Link>

                  <Link
                    to={`/submit-recipe?product=${encodeURIComponent(id)}`}
                    className="inline-flex items-center text-sm bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200 transition"
                  >
                    ➕ Add New Recipe
                  </Link>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg shadow">
              {product.images?.length ? (
                <>
                  <Swiper
                    modules={[Navigation, Pagination]}
                    spaceBetween={10}
                    slidesPerView={1}
                    navigation
                    pagination={{ clickable: true }}
                  >
                    {product.images.map((url, i) => (
                      <SwiperSlide key={i}>
                        <img
                          src={url}
                          alt={`Image ${i + 1}`}
                          onClick={() => {
                            setLightboxIndex(i);
                            setLightboxOpen(true);
                          }}
                          className="w-full h-64 object-cover cursor-pointer rounded"
                        />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                  <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    index={lightboxIndex}
                    slides={product.images.map((url) => ({ src: url }))}
                    plugins={[Zoom]}
                    zoom={{ maxZoomPixelRatio: 4 }}
                  />
                </>
              ) : (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-64 object-cover"
                />
              )}
            </div>
          </div>

          {editing ? (
            <EditProductForm
              product={product}
              onCancel={() => setEditing(false)}
              onSave={async () => {
                setEditing(false);
                setEditSuccess(true);
                await fetchProduct(); // ⬅️ refetch product data
                setTimeout(() => setEditSuccess(false), 4000);
              }}              
            />
          ) : showLoginMessage ? (
            <p className="text-sm text-red-600 italic mb-6">
              You must be logged in to edit this product.
            </p>
          ) : (
            <p className="text-lg text-gray-700 leading-relaxed mb-2">
              {product.description}
            </p>
          )}

          {editSuccess && (
            <p className="text-green-700 text-sm bg-green-100 p-2 rounded shadow inline-block mb-6">
              ✅ Edit submitted for admin review.
            </p>
          )}

          {user ? (
            <ReviewForm onSubmit={handleReviewSubmit} productId={id} />
          ) : (
            <p className="text-sm text-red-500 mt-2">
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

          {/* Reviews Section */}
          <section className="bg-gray-50 p-6 rounded shadow-md mt-10">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
              <h2 className="text-2xl font-semibold">Reviews</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Sort by:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="high-to-low">Rating: High to Low</option>
                  <option value="low-to-high">Rating: Low to High</option>
                </select>
              </div>
            </div>

            {sortedReviews.length ? (
              sortedReviews.map((r) => (
                <div
                  key={r.id}
                  className="bg-white p-4 rounded border border-gray-200 shadow-sm mb-4"
                >
                  <div className="font-bold text-yellow-500 text-lg mb-1">
                    {r.rating} ⭐
                  </div>
                  <p className="text-gray-800">{r.text}</p>

                  {r.images?.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {r.images.map((img, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={img.url}
                          alt={`Review Image ${imgIdx + 1}`}
                          onClick={() => {
                            setReviewLightboxImages(r.images.map((img) => img.url));
                            setReviewLightboxIndex(imgIdx);
                            setReviewLightboxOpen(true);
                          }}
                          className="w-24 h-24 object-cover rounded cursor-pointer border"
                        />
                      ))}
                    </div>
                  )}

                  {user && user.email === r.userEmail && r._hasPendingImages && (
                    <p className="text-xs text-yellow-600 italic mt-2">
                      🕓 Images pending review
                    </p>
                  )}

                  <p className="text-xs italic text-gray-500 mt-2">
                    by {r.nickname || r.userEmail || "Anonymous"}
                  </p>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      className="text-red-600 text-xs mt-2 hover:underline"
                    >
                      🗑️ Delete Review
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-600">No reviews yet.</p>
            )}
          </section>

          {reviewLightboxOpen && (
            <Lightbox
              open={reviewLightboxOpen}
              close={() => setReviewLightboxOpen(false)}
              index={reviewLightboxIndex}
              slides={reviewLightboxImages.map((src) => ({ src }))}
              plugins={[Zoom]}
              zoom={{ maxZoomPixelRatio: 4 }}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
