import { useState, useRef, useEffect } from 'react';

export default function LazyImage({ 
  src, 
  alt, 
  className = "", 
  placeholder = "🛒",
  thumbnailSrc = null, // Low-res thumbnail URL
  onLoad,
  onError 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const containerRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          // Once in view, we can stop observing
          if (containerRef.current) {
            observerRef.current.unobserve(containerRef.current);
          }
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before the image comes into view
        threshold: 0.01
      }
    );

    // Start observing
    if (containerRef.current) {
      observerRef.current.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setHasError(true);
    if (onError) onError();
  };

  const handleThumbnailLoad = () => {
    setThumbnailLoaded(true);
  };

  // Show placeholder until we have either a thumbnail or the full image loaded
  const showPlaceholder = !isInView || (!thumbnailLoaded && !isLoaded) || hasError;

  return (
    <div ref={containerRef} className={`lazy-image-container ${className}`} style={{minHeight:0}}>
      {/* Loading placeholder - stays until we have content */}
      {showPlaceholder && (
        <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center animate-pulse z-10">
          <div className="text-4xl opacity-50">{placeholder}</div>
        </div>
      )}

      {/* Error placeholder */}
      {hasError && (
        <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="text-4xl mb-2">📷</div>
            <div className="text-sm text-gray-500">Image unavailable</div>
          </div>
        </div>
      )}

      {/* Images (only render when in view and not error) */}
      {isInView && !hasError && (
        <>
          {/* Thumbnail (low-res) - loads first */}
          {thumbnailSrc && (
            <img
              src={thumbnailSrc}
              alt={alt}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: thumbnailLoaded ? 1 : 0,
                zIndex: 1
              }}
              onLoad={handleThumbnailLoad}
              onError={() => setThumbnailLoaded(false)} // Don't show error for thumbnail
              loading="lazy"
            />
          )}

          {/* High-res image - fades in over thumbnail */}
          <img
            src={src}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: isLoaded ? 1 : 0,
              zIndex: 2
            }}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
          />
        </>
      )}
    </div>
  );
} 