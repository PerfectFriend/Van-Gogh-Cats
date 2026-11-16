// Robust utility to download artworks reliably as real images (.jpg / .png)
// Works seamlessly for:
// 1. Vite asset bundled URLs (e.g. /@fs/... or /assets/van_gogh_cat-*.jpg)
// 2. Base64 data URLs (e.g. data:image/png;base64,...)
// 3. Blob URLs and remote URLs
// 4. Handles cross-origin/sandboxed iframes via fetch -> blob or canvas fallback

export async function downloadArtworkImage(imageUrl: string, filenameBase: string = 'vangogh_cat'): Promise<void> {
  // Sanitize filename to be clean and safe
  const safeBase = filenameBase
    .replace(/[^\w\u0400-\u04FF\s-_]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 50) || 'vangogh_cat';

  try {
    // If it's a data: URL, determine format or convert to blob
    if (imageUrl.startsWith('data:image/')) {
      const mimeMatch = imageUrl.match(/^data:image\/([a-zA-Z0-9+]+);/);
      let ext = 'jpg';
      if (mimeMatch && mimeMatch[1]) {
        const format = mimeMatch[1].toLowerCase();
        if (format === 'png') ext = 'png';
        else if (format === 'webp') ext = 'webp';
        else if (format === 'jpeg' || format === 'jpg') ext = 'jpg';
      }

      const res = await fetch(imageUrl);
      const blob = await res.blob();
      triggerBlobDownload(blob, `${safeBase}.${ext}`);
      return;
    }

    // For standard URLs (bundled asset paths, local static paths, http/https URLs):
    // Fetch as blob to guarantee the browser respects the filename and downloads real binary data
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      // Detect extension from blob mime type if available
      let ext = 'jpg';
      if (blob.type === 'image/png') ext = 'png';
      else if (blob.type === 'image/webp') ext = 'webp';
      else if (imageUrl.includes('.png')) ext = 'png';
      else if (imageUrl.includes('.webp')) ext = 'webp';

      triggerBlobDownload(blob, `${safeBase}.${ext}`);
      return;
    }
  } catch (err) {
    console.warn('[downloadArtworkImage] Direct fetch/blob failed, using canvas fallback:', err);
  }

  // Fallback: load into an HTML Image element and render onto a canvas to export a pristine JPEG blob
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 1024;
    canvas.height = img.naturalHeight || img.height || 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          triggerBlobDownload(blob, `${safeBase}.jpg`);
        } else {
          fallbackDirectAnchor(imageUrl, `${safeBase}.jpg`);
        }
      }, 'image/jpeg', 0.95);
      return;
    }
  } catch (canvasErr) {
    console.warn('[downloadArtworkImage] Canvas rendering fallback failed:', canvasErr);
  }

  // Final fallback
  fallbackDirectAnchor(imageUrl, `${safeBase}.jpg`);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

function fallbackDirectAnchor(href: string, filename: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 1000);
}
