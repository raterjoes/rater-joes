export default function ReviewList({ reviews }) {
    if (!reviews.length) return null;
  
    return (
      <div className="mt-4">
        <h4 className="text-md font-semibold mb-2">Reviews:</h4>
        {reviews.map((r, i) => (
          <div key={i} className="bg-gray-100 p-2 rounded mb-2">
            <div className="font-bold">{r.rating} ⭐</div>
            <p className="text-sm mb-1">{r.text}</p>
            {r.nickname ? (
              <p className="text-xs italic text-gray-600">by {r.nickname}</p>
            ) : r.userEmail ? (
              <p className="text-xs italic text-gray-600">by {r.userEmail}</p>
            ) : (
              <p className="text-xs italic text-gray-500">Anonymous</p>
            )}
          </div>
        ))}
      </div>
    );
  }  