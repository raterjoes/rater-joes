import { Link } from "react-router-dom";
import LazyImage from "./LazyImage";

export default function ProductCard({
  name,
  image,
  images,
  thumbnailUrls,
  description,
  productId,
  reviews = [],
  seasonal,
  season,
  newUntil,
}) {
  const averageRating = reviews.length
    ? (
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      ).toFixed(1)
    : null;

  const displayImage = images?.length ? images[0] : image;
  const displayThumbnail = thumbnailUrls?.length ? thumbnailUrls[0] : null;

  const seasonStyles = {
    Winter: { emoji: "❄️", bg: "bg-blue-100", text: "text-blue-700" },
    Spring: { emoji: "🌱", bg: "bg-green-100", text: "text-green-700" },
    Summer: { emoji: "☀️", bg: "bg-yellow-100", text: "text-yellow-700" },
    Fall:   { emoji: "🍂", bg: "bg-orange-100", text: "text-orange-700" },
  };

  const style = seasonStyles[season] || {};

  const isNew = newUntil && new Date() < new Date(newUntil);

  return (
    <Link
      to={`/products/${productId}`}
      className="relative block bg-white rounded-md shadow p-2 transform hover:scale-105 hover:shadow-xl hover:ring-1 hover:ring-rose-300 transition-all duration-300 text-xs"
    >
      {isNew && (
        <span className="absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded-full shadow-sm bg-blue-100 text-blue-700 z-10">
          🆕 New
        </span>
      )}
      {seasonal && season && (
        <span
          className={`absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded-full shadow-sm ${style.bg} ${style.text}`}
        >
          {style.emoji} Limited time: {season}
        </span>
      )}

      <div className="relative mb-3 w-full h-32 overflow-hidden rounded">
        {images && images.length > 0 ? (
          <LazyImage
            src={images[0]}
            alt={name}
            className="w-full h-full object-cover"
            placeholder="🛒"
            thumbnailSrc={displayThumbnail}
          />
        ) : image ? (
          <LazyImage
            src={image}
            alt={name}
            className="w-full h-full object-cover"
            placeholder="🛒"
            thumbnailSrc={displayThumbnail}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">📷</span>
          </div>
        )}
      </div>
      <h3 className="text-lg font-semibold leading-tight">{name}</h3>

      {averageRating ? (
        <div className="text-yellow-500 text-sm mb-1">
          {"⭐".repeat(Math.round(averageRating))} ({averageRating})
        </div>
      ) : (
        <div className="text-gray-400 text-sm mb-1">Not yet rated</div>
      )}

      <p className="text-sm text-gray-700 line-clamp-2 overflow-hidden">
        {description}
      </p>
    </Link>
  );
}