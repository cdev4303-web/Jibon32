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
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Robust cross-device printing execution.
 * 1. Checks if running in Android APK WebView -> Uses Native Android PrintManager via bridge.
 * 2. If in regular browser (Chrome, Edge, Safari) -> Uses standard window.print().
 * 3. Does NOT trigger unintended PDF downloads when Print is clicked.
 * 4. Prepares document title for clean print spooler naming.
 */
export async function printHtmlElement(
  elementIdOrElement: string | HTMLElement,
  title?: string
): Promise<boolean> {
  const origTitle = document.title;
  const docTitle = title || origTitle || 'Document Print';

  if (title) {
    document.title = docTitle;
  }

  // 1. Check Native Android APK WebView
  if (isAndroidNativeApp()) {
    const success = nativePrint(docTitle);
    if (success) {
      if (title) {
        setTimeout(() => {
          document.title = origTitle;
        }, 1500);
      }
      return true;
    }
  }

  // 2. Standard Browser Fallback (Chrome, Safari, Firefox, Desktop)
  let directPrintSucceeded = false;

  try {
    window.focus();
    window.print();
    directPrintSucceeded = true;
  } catch (err) {
    console.warn('[Print] Direct window.print() was blocked or failed:', err);
    directPrintSucceeded = false;
  } finally {
    if (title) {
      setTimeout(() => {
        document.title = origTitle;
      }, 2000);
    }
  }

  return directPrintSucceeded;
}

export { exportElementToPdf };
export type { PdfExportOptions };
