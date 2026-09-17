/**
 * High-performance image compressor for tailoring invoice photos and catalog items.
 * Shrinks multi-megabyte camera / gallery photos (3MB - 15MB) down to 50KB - 90KB
 * with high visual clarity for fabric textures, patterns, and measurements.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  maxSizeBytes?: number; // Target max size (e.g. 200KB)
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1080,
  maxHeight: 1080,
  quality: 0.72,
  maxSizeBytes: 200 * 1024, // 200 KB
};

/**
 * Compresses an image File or Blob to a lightweight JPEG Data URI.
 */
export async function compressImageFile(
  fileOrBlob: File | Blob,
  options: CompressionOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = async (e) => {
      try {
        const rawUri = e.target?.result as string;
        if (!rawUri) {
          throw new Error('Empty image file');
        }
        const compressed = await compressDataUri(rawUri, options);
        resolve(compressed);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Compresses a Data URI or image URL to a lightweight JPEG Data URI.
 */
export async function compressDataUri(
  dataUri: string,
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    // If it's already a tiny string or SVG, return as is
    if (dataUri.startsWith('data:image/svg+xml') || (dataUri.length < 50000 && !dataUri.startsWith('data:image/png'))) {
      if (dataUri.length < 50000) {
        return resolve(dataUri);
      }
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let { width, height } = img;

        // Calculate scaled dimensions maintaining aspect ratio
        let scale = 1;
        if (width > opts.maxWidth || height > opts.maxHeight) {
          scale = Math.min(opts.maxWidth / width, opts.maxHeight / height);
        }

        let targetWidth = Math.max(1, Math.round(width * scale));
        let targetHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(dataUri); // Fallback
        }

        // Draw background white for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        let quality = opts.quality;
        let resultUri = canvas.toDataURL('image/jpeg', quality);

        // If result is still over max size, iteratively reduce scale and quality
        let attempts = 0;
        while (resultUri.length > opts.maxSizeBytes * 1.37 && attempts < 3) {
          attempts++;
          quality = Math.max(0.45, quality - 0.15);
          targetWidth = Math.round(targetWidth * 0.85);
          targetHeight = Math.round(targetHeight * 0.85);
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          resultUri = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(resultUri);
      } catch (drawErr) {
        console.warn('Canvas compression error, using original:', drawErr);
        resolve(dataUri);
      }
    };

    img.onerror = () => {
      console.warn('Failed to load image for compression');
      resolve(dataUri);
    };

    img.src = dataUri;
  });
}
