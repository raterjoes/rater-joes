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
      className="relative block bg-white rounded-lg shadow p-2 hover:shadow-lg transition text-sm"
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
        className="w-full h-36 object-cover rounded mb-2"
      />
      <h3 className="text-lg font-bold">{name}</h3>

      {averageRating ? (
        <div className="text-yellow-500 text-sm mb-2">
          {"⭐".repeat(Math.round(averageRating))} ({averageRating})
        </div>
      ) : (
        <div className="text-gray-400 text-sm mb-2">Not yet rated</div>
      )}

      <p className="text-sm text-gray-700">{description}</p>
    </Link>
  );
}
