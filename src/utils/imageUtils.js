/**
 * Generate a thumbnail URL from a Firebase Storage URL
 * This creates a smaller version of the image for progressive loading
 */
export function generateThumbnailUrl(originalUrl, width = 200) {
  if (!originalUrl) return null;
  try {
    // Parse the original URL
    const url = new URL(originalUrl);
    // Extract the path after '/o/' and before any query params
    const match = url.pathname.match(/\/o\/(.+)$/);
    if (!match) return originalUrl;
    let path = decodeURIComponent(match[1]);
    // Example: product-images/myphoto.jpg
    // Get filename and extension
    const lastSlash = path.lastIndexOf("/");
    const folder = lastSlash !== -1 ? path.slice(0, lastSlash) : "";
    const filename = lastSlash !== -1 ? path.slice(lastSlash + 1) : path;
    const dot = filename.lastIndexOf(".");
    if (dot === -1) return originalUrl;
    const name = filename.slice(0, dot);
    const ext = filename.slice(dot);
    // Build thumbnail path: product-images/thumbs/myphoto_200x200.jpg
    const thumbPath = folder ? `${folder}/thumbs/${name}_${width}x${width}${ext}` : `thumbs/${name}_${width}x${width}${ext}`;
    // Extract token from original URL if present
    const token = url.searchParams.get('token');
    // Use the full bucket name (url.hostname)
    let thumbUrl = `${url.origin}/v0/b/${url.hostname}/o/${encodeURIComponent(thumbPath)}?alt=media`;
    if (token) {
      thumbUrl += `&token=${token}`;
    }
    return thumbUrl;
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