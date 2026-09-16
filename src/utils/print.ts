import { exportElementToPdf, PdfExportOptions } from './pdf';
import { isAndroidNativeApp, nativePrint } from './nativeBridge';

export function isIframeEnvironment(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Prepares an isolated DOM container directly on document.body containing a deep clone of the printable element.
 * This guarantees that only the target element (Invoice or Karigar ledger) is rendered during print,
 * avoiding any bleed-through from background dashboards, sidebars, or modals.
 */
function prepareIsolatedPrintDom(el: HTMLElement): HTMLElement {
  const containerId = 'isolated-print-target-root';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }

  container.innerHTML = '';
  const clone = el.cloneNode(true) as HTMLElement;
  // Ensure unconstrained layout on the cloned target
  clone.style.overflow = 'visible';
  clone.style.maxHeight = 'none';
  clone.style.height = 'auto';
  container.appendChild(clone);

  return container;
}

/**
 * Universal cross-device printing execution.
 * 1. Clones target element into #isolated-print-target-root on document.body.
 * 2. Activates .is-printing-active on document.body so CSS isolates ONLY the target element.
 * 3. In Android APK WebView -> Uses Native Android PrintManager via nativePrint() for native A4 / thermal printing.
 * 4. In Web Browsers -> Triggers window.print() directly with system print dialog.
 * 5. Fallback -> If system print dialog is blocked by iframe sandbox, automatically exports high-resolution A4 PDF.
 */
export async function printHtmlElement(
  elementIdOrElement: string | HTMLElement,
  title?: string
): Promise<boolean> {
  const origTitle = document.title;
  const docTitle = title || origTitle || 'Jibon_Tailor_Print';

  const el =
    typeof elementIdOrElement === 'string'
      ? document.getElementById(elementIdOrElement)
      : elementIdOrElement;

  if (!el) {
    console.error('[Print] Target element not found:', elementIdOrElement);
    return false;
  }

  if (title) {
    document.title = docTitle;
  }

  // Step 1: Clone target element to isolated DOM root
  const container = prepareIsolatedPrintDom(el);

  // Step 2: Set printing active flag on body
  document.body.classList.add('is-printing-active');

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove('is-printing-active');
    if (container) {
      container.innerHTML = '';
    }
    document.title = origTitle;
  };

  // Step 3: Check Android Native App (APK)
  if (isAndroidNativeApp()) {
    const nativeSuccess = nativePrint(docTitle);
    if (nativeSuccess) {
      // Keep DOM isolated for 12s to give Android print spooler time to render pages
      setTimeout(cleanup, 12000);
      return true;
    }
  }

  // Step 4: Web Browser (Desktop or Mobile)
  // Listen for afterprint event to clean up once user prints or cancels
  window.addEventListener('afterprint', cleanup, { once: true });
  // Fallback cleanup timer in case afterprint does not fire
  setTimeout(cleanup, 7000);

  try {
    window.focus();
    window.print();
    return true;
  } catch (printErr) {
    console.warn('[Print] window.print() was blocked or failed, falling back to PDF export:', printErr);
    cleanup();
    try {
      const filename = `${docTitle.replace(/[^\w\d-_]/g, '_')}.pdf`;
      return await exportElementToPdf(el, {
        filename,
        title: docTitle,
      });
    } catch (pdfErr) {
      console.error('[Print] PDF export fallback failed:', pdfErr);
      return false;
    }
  }
}

export { exportElementToPdf };
export type { PdfExportOptions };
