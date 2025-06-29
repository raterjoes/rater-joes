import { useState } from "react";
import LazyImage from "./LazyImage";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

export default function ReviewList({ reviews }) {
    if (!reviews.length) return null;
  
    const [lightboxImages, setLightboxImages] = useState([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
  
    return (
      <>
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
              {r.images && r.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mt-2">
                  {r.images.map((img, index) => (
                    <LazyImage
                      key={index}
                      src={img.url}
                      alt={`Review image ${index + 1}`}
                      className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-90"
                      placeholder="📷"
                      onClick={() => {
                        setLightboxImages(r.images.map(img => img.url));
                        setLightboxIndex(index);
                        setLightboxOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Lightbox for review images */}
        {lightboxOpen && (
          <Lightbox
            open={lightboxOpen}
            close={() => setLightboxOpen(false)}
            index={lightboxIndex}
            slides={lightboxImages.map((url) => ({ src: url }))}
            plugins={[Zoom]}
            zoom={{ maxZoomPixelRatio: 4 }}
          />
        )}
      </>
    );
}  