/**
 * Generate a thumbnail URL from a Firebase Storage URL
 * This creates a smaller version of the image for progressive loading
 */
export function generateThumbnailUrl(originalUrl, width = 200) {
  if (!originalUrl) return null;
  
  try {
    // For Firebase Storage URLs, we can add query parameters for resizing
    // This is a simple approach - in production you might want to use a CDN or image service
    const url = new URL(originalUrl);
    
    // Add resize parameters if supported by your storage/CDN
    // For now, we'll return the original URL as fallback
    // You can implement actual thumbnail generation based on your setup
    
    return originalUrl;
  } catch (error) {
    console.warn('Failed to generate thumbnail URL:', error);
    return originalUrl;
  }
}

/**
 * Create a data URL for a very small placeholder
 * This can be used as an immediate placeholder while thumbnails load
 */
export function createPlaceholderDataUrl(width = 10, height = 10, color = '#f3f4f6') {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  return canvas.toDataURL();
}

/**
 * Preload an image and return a promise
 */
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Check if an image URL is valid
 */
export function isValidImageUrl(url) {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
} 