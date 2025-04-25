import { Link } from "react-router-dom";

export default function ProductCard({
  name,
  image,
  images,
  description,
  productId,
  reviews,
  seasonal,
  season,
}) {
  const averageRating = reviews.length
    ? (
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      ).toFixed(1)
    : null;

  const displayImage = images?.length ? images[0] : image;

  const seasonStyles = {
    Winter: { emoji: "❄️", bg: "bg-blue-100", text: "text-blue-700" },
    Spring: { emoji: "🌱", bg: "bg-green-100", text: "text-green-700" },
    Summer: { emoji: "☀️", bg: "bg-yellow-100", text: "text-yellow-700" },
    Fall:   { emoji: "🍂", bg: "bg-orange-100", text: "text-orange-700" },
  };

  const style = seasonStyles[season] || {};

  return (
    <Link
      to={`/products/${productId}`}
      className="relative block bg-white rounded-md shadow p-2 hover:shadow-md transition text-xs"
    >
      {seasonal && season && (
        <span
          className={`absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded-full shadow-sm ${style.bg} ${style.text}`}
        >
          {style.emoji} Limited time: {season}
        </span>
      )}

      <img
        src={displayImage}
        alt={name}
        className="w-full h-28 object-cover rounded mb-1"
      />
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
