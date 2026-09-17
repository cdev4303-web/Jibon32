import * as htmlToImage from 'html-to-image';
import html2canvas from 'html2canvas';

export interface CaptureOptions {
  pixelRatio?: number;
  backgroundColor?: string;
  quality?: number;
  width?: number;
}

/**
 * High-fidelity DOM to PNG Data URL capture.
 * Mounts an unconstrained clone into an offscreen sandbox at standard document width
 * (800px for invoices, 880px for ledgers) with height:auto and overflow:visible.
 * 
 * Safety & Quality Guarantees:
 * - Never modifies original DOM elements, images, or files in memory or gallery
 * - Completely preserves original image colors, aspect ratios, and orientations
 * - Ensures sRGB color space output without JPEG lossy artifacts
 * - Eliminates scroll-viewport cutoff (পূর্ণাঙ্গ ইনভয়েস ক্যাপচার)
 */
export async function captureElementToPng(
  elementIdOrElement: string | HTMLElement,
  options: CaptureOptions = {}
): Promise<string> {
  const el =
    typeof elementIdOrElement === 'string'
      ? document.getElementById(elementIdOrElement)
      : elementIdOrElement;

  if (!el) {
    throw new Error(`Target element "${elementIdOrElement}" not found.`);
  }

  // Determine standard target width for optimal high-resolution document layout
  let defaultWidth = 800;
  if (el.id === 'printable-karigar-area' || el.id === 'printable-expense-area') {
    defaultWidth = 880;
  }
  const targetWidth = options.width || defaultWidth;
  const pixelRatio = options.pixelRatio || 2.0;
  const backgroundColor = options.backgroundColor || '#ffffff';

  // 1. Create a clean offscreen mount sandbox attached to document.body
  // Positioned at top-left with opacity 0 so html2canvas and getComputedStyle work reliably
  const sandbox = document.createElement('div');
  sandbox.style.position = 'fixed';
  sandbox.style.left = '0';
  sandbox.style.top = '0';
  sandbox.style.width = `${targetWidth}px`;
  sandbox.style.minWidth = `${targetWidth}px`;
  sandbox.style.maxWidth = `${targetWidth}px`;
  sandbox.style.height = 'auto';
  sandbox.style.overflow = 'visible';
  sandbox.style.zIndex = '-99999';
  sandbox.style.opacity = '0';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.visibility = 'visible';
  sandbox.style.backgroundColor = backgroundColor;
  sandbox.style.boxSizing = 'border-box';

  // 2. Deep clone the target element so original DOM is 100% untouched
  const clone = el.cloneNode(true) as HTMLElement;
  clone.id = `${el.id || 'printable'}-export-clone`;

  // Strip layout/scroll clipping classes ONLY on clone
  clone.classList.remove(
    'overflow-y-auto',
    'overflow-x-auto',
    'overflow-hidden',
    'max-h-[95vh]',
    'max-h-[96vh]',
    'h-full'
  );
  clone.style.width = `${targetWidth}px`;
  clone.style.minWidth = `${targetWidth}px`;
  clone.style.maxWidth = `${targetWidth}px`;
  clone.style.height = 'auto';
  clone.style.minHeight = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.position = 'relative';
  clone.style.boxSizing = 'border-box';
  clone.style.backgroundColor = backgroundColor;

  // Ensure scrollable children in clone also expand naturally
  clone.querySelectorAll('.overflow-y-auto, .overflow-auto, .overflow-hidden').forEach((child) => {
    const htmlChild = child as HTMLElement;
    htmlChild.style.overflow = 'visible';
    htmlChild.style.maxHeight = 'none';
    htmlChild.style.height = 'auto';
  });

  // Explicitly guarantee emerald green header color styling on clone
  const emeraldHeaders = clone.querySelectorAll('.print-invoice-header-emerald');
  emeraldHeaders.forEach((headerEl) => {
    const h = headerEl as HTMLElement;
    h.style.backgroundColor = '#064e3b';
    h.style.background = '#064e3b';
    h.style.backgroundImage = 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #064e3b 100%)';
    h.style.boxShadow = 'inset 0 0 0 1000px #064e3b';
    h.style.color = '#ffffff';
    h.style.border = '2px solid #064e3b';
    h.style.borderBottom = '4px solid #f59e0b';
    (h.style as any).webkitPrintColorAdjust = 'exact';
    (h.style as any).printColorAdjust = 'exact';

    const h1 = h.querySelector('h1');
    if (h1) {
      h1.style.color = '#ffffff';
      (h1.style as any).webkitTextFillColor = '#ffffff';
    }
    h.querySelectorAll('div, p, span').forEach((el) => {
      const htmlEl = el as HTMLElement;
      (htmlEl.style as any).webkitPrintColorAdjust = 'exact';
      (htmlEl.style as any).printColorAdjust = 'exact';
    });
  });

  // Ensure all images in clone preserve CORS credentials and aspect ratio
  clone.querySelectorAll('img').forEach((img) => {
    img.crossOrigin = 'anonymous';
    img.style.objectFit = 'contain';
  });

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    // 3. Ensure any <img> tags inside the clone are fully decoded before capture
    const imgs = Array.from(clone.querySelectorAll('img'));
    if (imgs.length > 0) {
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 300);
          });
        })
      );
    }

    // 4. Measure exact full content height without any cutoff
    const fullHeight = Math.max(
      clone.scrollHeight,
      clone.offsetHeight,
      Math.ceil(clone.getBoundingClientRect().height)
    );

    // Primary Capture: html-to-image (Native browser SVG foreignObject engine)
    try {
      const dataUrl = await htmlToImage.toPng(clone, {
        pixelRatio,
        backgroundColor,
        width: targetWidth,
        height: fullHeight,
        canvasWidth: Math.round(targetWidth * pixelRatio),
        canvasHeight: Math.round(fullHeight * pixelRatio),
        cacheBust: false,
        skipFonts: true,
        style: {
          width: `${targetWidth}px`,
          height: `${fullHeight}px`,
          maxHeight: 'none',
          overflow: 'visible',
          transform: 'none',
          margin: '0',
          backgroundColor,
        },
      });

      if (dataUrl && dataUrl.startsWith('data:image/png') && dataUrl.length > 2000) {
        return dataUrl;
      }
    } catch (primaryErr) {
      console.warn('[DOM Capture] html-to-image capture fallback trigger:', primaryErr);
    }

    // Secondary Method: html2canvas fallback with exact coordinate mapping
    try {
      const canvas = await html2canvas(clone, {
        scale: pixelRatio,
        backgroundColor,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: targetWidth,
        height: fullHeight,
        windowWidth: targetWidth,
        windowHeight: fullHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      });

      const fallbackUrl = canvas.toDataURL('image/png');
      if (fallbackUrl && fallbackUrl.startsWith('data:image/png') && fallbackUrl.length > 2000) {
        return fallbackUrl;
      }
      throw new Error('Canvas produced empty or invalid image');
    } catch (fallbackErr) {
      console.error('[DOM Capture] html2canvas fallback also failed:', fallbackErr);
      throw fallbackErr;
    }
  } finally {
    // 5. Always cleanly clean up the offscreen sandbox
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }
}

/**
 * Captures an element directly into a temporary HTMLCanvasElement in sRGB color space.
 * Cleans up temporary image references to prevent memory leaks.
 */
export async function captureElementToCanvas(
  elementIdOrElement: string | HTMLElement,
  options: CaptureOptions = {}
): Promise<HTMLCanvasElement> {
  const dataUrl = await captureElementToPng(elementIdOrElement, options);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  // Use sRGB color space to preserve exact original photo colors and prevent color shifts
  const ctx = canvas.getContext('2d', {
    willReadFrequently: true,
    colorSpace: 'srgb',
  });
  if (!ctx) {
    throw new Error('Could not get 2d context for canvas.');
  }
  ctx.drawImage(img, 0, 0);

  // Clear temporary image src
  img.src = '';

  return canvas;
}
