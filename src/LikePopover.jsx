import { useState } from "react";

export default function LikePopover({ likers = [], onClick }) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={onClick}
    >
      <span className="cursor-pointer text-sm text-gray-700 hover:text-blue-600 select-none">
        👍 {likers.length}
      </span>

      {show && likers.length > 0 && (
        <div className="absolute z-10 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-gray-300 rounded shadow p-2 text-xs text-gray-800 w-max max-w-xs">
          <p className="font-semibold mb-1">Liked by:</p>
          <ul className="space-y-0.5 max-h-40 overflow-y-auto">
            {likers.map((name, idx) => (
              <li key={idx}>• {name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
