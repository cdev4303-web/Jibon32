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
 * Collect all active style and stylesheet link tags from document.head and document.body.
 */
function collectAllStyles(): string {
  const styles: string[] = [];
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((tag) => {
    styles.push(tag.outerHTML);
  });
  return styles.join('\n');
}

/**
 * Prepares an isolated DOM container directly on document.body containing a deep clone of the printable element.
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
  clone.style.overflow = 'visible';
  clone.style.maxHeight = 'none';
  clone.style.height = 'auto';
  container.appendChild(clone);

  return container;
}

/**
 * Strategy 1: Open a clean popup window specifically dedicated to printing.
 * This completely bypasses iframe sandbox restrictions (e.g. without 'allow-modals'),
 * providing a pristine top-level window where window.print() opens the native printer dialog 100% reliably.
 */
function printViaDedicatedWindow(el: HTMLElement, title: string): boolean {
  try {
    const printWin = window.open(
      '',
      '_blank',
      'width=880,height=920,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
    );
    if (!printWin) return false;

    const stylesHtml = collectAllStyles();
    const cleanTitle = title || document.title || 'Print';

    printWin.document.open();
    printWin.document.write(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle}</title>
  ${stylesHtml}
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif !important;
    }
    .print\\:hidden, .print-hidden, .no-print, button:not(.allow-print-button) {
      display: none !important;
    }
    .print-invoice-sheet {
      max-width: 820px;
      margin: 0 auto;
      padding: 16px;
    }
  </style>
</head>
<body class="bg-white text-slate-800">
  <div class="print-invoice-sheet">
    ${el.outerHTML}
  </div>
</body>
</html>`);
    printWin.document.close();

    const triggerPrint = () => {
      try {
        printWin.focus();
        printWin.print();
      } catch (err) {
        console.warn('[Print] printWin.print error:', err);
      }
    };

    if (printWin.document.readyState === 'complete') {
      setTimeout(triggerPrint, 300);
    } else {
      printWin.onload = () => setTimeout(triggerPrint, 300);
    }
    return true;
  } catch (err) {
    console.warn('[Print] Dedicated window print failed or blocked:', err);
    return false;
  }
}

/**
 * Strategy 2: Print via an invisible isolated iframe within the page.
 */
function printViaHiddenIframe(el: HTMLElement, title: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.id = 'app-isolated-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '1000px';
      iframe.style.height = '1000px';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc || !iframe.contentWindow) {
        iframe.remove();
        resolve(false);
        return;
      }

      const stylesHtml = collectAllStyles();
      const cleanTitle = title || document.title || 'Print';

      frameDoc.open();
      frameDoc.write(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>${cleanTitle}</title>
  ${stylesHtml}
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
    }
    .print\\:hidden, .print-hidden, .no-print, button {
      display: none !important;
    }
  </style>
</head>
<body class="bg-white text-slate-800 p-4">
  ${el.outerHTML}
</body>
</html>`);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (printErr) {
          console.warn('[Print] iframe.print failed:', printErr);
          resolve(false);
        } finally {
          setTimeout(() => {
            iframe.remove();
          }, 60000);
        }
      }, 350);
    } catch (e) {
      console.warn('[Print] Failed to set up hidden iframe:', e);
      resolve(false);
    }
  });
}

/**
 * Universal cross-device printing execution.
 * Guaranteed to open the native printer dialog box!
 * 1. Android APK WebView -> Uses Native Android PrintManager via nativePrint()
 * 2. Dedicated print window popup -> Opens native print dialog in top-level window
 * 3. Hidden iframe printing -> Opens printer dialog targeting only the printable element
 * 4. Direct window.print() fallback
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

  // Step 1: Check Android Native App (APK)
  if (isAndroidNativeApp()) {
    prepareIsolatedPrintDom(el);
    document.body.classList.add('is-printing-active');
    const nativeSuccess = nativePrint(docTitle);
    if (nativeSuccess) {
      setTimeout(() => {
        document.body.classList.remove('is-printing-active');
        document.title = origTitle;
      }, 12000);
      return true;
    }
    document.body.classList.remove('is-printing-active');
  }

  // Step 2: Attempt dedicated print window popup first
  // This opens a clean top-level window and triggers the native printer dialog box,
  // preventing any iframe sandbox modal blockage and giving the user their system printer interface!
  const windowPrintSuccess = printViaDedicatedWindow(el, docTitle);
  if (windowPrintSuccess) {
    document.title = origTitle;
    return true;
  }

  // Step 3: If popup was blocked or window couldn't open, try hidden iframe printing
  const iframePrintSuccess = await printViaHiddenIframe(el, docTitle);
  if (iframePrintSuccess) {
    document.title = origTitle;
    return true;
  }

  // Step 4: Direct window.print() on the current window
  const container = prepareIsolatedPrintDom(el);
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

  window.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(cleanup, 30000);

  try {
    window.focus();
    window.print();
    return true;
  } catch (printErr) {
    console.warn('[Print] Direct window.print() was blocked or failed:', printErr);
    cleanup();
    return false;
  }
}

export { exportElementToPdf };
export type { PdfExportOptions };
