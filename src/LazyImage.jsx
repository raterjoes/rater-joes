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
        rootMargin: '50px', // Start loading 50px before the image comes into view
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

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`} style={{minHeight:0}}>
      {/* Loading placeholder */}
      {!isInView && (
        <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center animate-pulse">
          <div className="text-4xl opacity-50">{placeholder}</div>
        </div>
      )}

      {/* Error placeholder */}
      {isInView && hasError && (
        <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">📷</div>
            <div className="text-sm text-gray-500">Image unavailable</div>
          </div>
        </div>
      )}

      {/* Images (only render when in view and not error) */}
      {isInView && !hasError && (
        <>
          {/* Thumbnail (low-res) */}
          {thumbnailSrc && (
            <img
              src={thumbnailSrc}
              alt={alt}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              style={{opacity: (thumbnailLoaded && !isLoaded) ? 1 : 0, zIndex: 1}}
              onLoad={handleThumbnailLoad}
              onError={handleError}
              loading="lazy"
            />
          )}

          {/* High-res image */}
          <img
            src={src}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{opacity: isLoaded ? 1 : 0, zIndex: 2}}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
          />
        </>
      )}
    </div>
  );
} 