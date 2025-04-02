import { useState } from "react";

export default function ReviewForm({ onSubmit }) {
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ text, rating, includeName });
    setText("");
    setRating(5);
  };

  const [includeName, setIncludeName] = useState(true);

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your review..."
        className="w-full p-2 border rounded"
        required
      />
      <div>
        <label className="mr-2">Rating:</label>
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5].map((r) => (
            <option key={r} value={r}>
              {r} ⭐
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="includeName"
          checked={includeName}
          onChange={(e) => setIncludeName(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="includeName" className="text-sm">
          Include my username in this review
        </label>
      </div>

      <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
        Submit Review
      </button>
    </form>
  );
}