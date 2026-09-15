import { exportElementToPdf, PdfExportOptions } from './pdf';
import { isAndroidNativeApp, nativePrint, nativePrintHtml } from './nativeBridge';

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
 * Builds a standalone, self-contained HTML document containing the target element
 * and all active page stylesheets to ensure 100% typographic and layout fidelity.
 */
function buildIsolatedPrintHtml(el: HTMLElement, docTitle: string): string {
  const styles: string[] = [];

  // Collect all stylesheet links and style tags
  const styleNodes = document.querySelectorAll('link[rel="stylesheet"], style');
  styleNodes.forEach((node) => {
    styles.push(node.outerHTML);
  });

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle}</title>
  ${styles.join('\n')}
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
      text-shadow: none !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      overflow: visible !important;
      height: auto !important;
      width: 100% !important;
      font-size: 11pt !important;
    }
    .print\\:hidden,
    .no-print,
    .print-hidden,
    button:not(.allow-print-button) {
      display: none !important;
    }
    #print-root-container {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto !important;
      padding: 0 !important;
      display: block !important;
      background: #ffffff !important;
      overflow: visible !important;
    }
  </style>
</head>
<body>
  <div id="print-root-container">
    ${el.outerHTML}
  </div>
</body>
</html>`;
}

/**
 * Prints via hidden off-screen iframe.
 * Ideal for desktop Chrome, Safari, Edge, Firefox — isolates target without page flicker.
 */
function printViaHiddenIframe(html: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.id = 'active-print-job-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      let finished = false;
      const done = (success: boolean) => {
        if (!finished) {
          finished = true;
          resolve(success);
        }
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 30000);
      };

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        resolve(false);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      const executePrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          done(true);
        } catch (err) {
          console.warn('[Print] iframe print blocked:', err);
          done(false);
        }
      };

      // Wait for images inside the iframe before triggering print
      const images = iframeDoc.images;
      if (images.length > 0) {
        let loaded = 0;
        const checkDone = () => {
          loaded++;
          if (loaded >= images.length) {
            setTimeout(executePrint, 250);
          }
        };
        for (let i = 0; i < images.length; i++) {
          if (images[i].complete) {
            checkDone();
          } else {
            images[i].onload = checkDone;
            images[i].onerror = checkDone;
          }
        }
        setTimeout(executePrint, 1200); // Safety fallback timeout
      } else {
        setTimeout(executePrint, 250);
      }
    } catch (e) {
      console.warn('[Print] Failed to create print iframe:', e);
      resolve(false);
    }
  });
}

/**
 * Fallback DOM Isolation print for environments where iframes cannot spawn print dialogs
 * (e.g. mobile Safari, certain Android WebViews, Native Android PrintManager).
 */
function printViaDomIsolation(el: HTMLElement, docTitle: string): Promise<boolean> {
  return new Promise((resolve) => {
    const containerId = 'isolated-print-target-root';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    container.innerHTML = el.innerHTML;
    container.className = el.className;

    document.body.classList.add('is-printing-active');

    const cleanup = () => {
      document.body.classList.remove('is-printing-active');
      if (container) {
        container.innerHTML = '';
      }
    };

    let printed = false;
    try {
      if (isAndroidNativeApp()) {
        printed = nativePrint(docTitle);
      }
      if (!printed) {
        window.focus();
        window.print();
        printed = true;
      }
    } catch (err) {
      console.warn('[Print] DOM isolation print error:', err);
      printed = false;
    } finally {
      setTimeout(cleanup, 2000);
      resolve(printed);
    }
  });
}

/**
 * Universal cross-device printing execution.
 * 1. Checks Android APK WebView -> Uses Native Android PrintManager with isolated HTML or PrintDocumentAdapter.
 * 2. If in regular browser (desktop/laptop) -> Uses clean isolated iframe to print strictly the receipt/ledger.
 * 3. If in mobile browser -> Uses DOM isolation with direct system print dialog.
 * 4. Fallback -> If system print dialog is blocked/unavailable (e.g. sandboxed iframe), exports high-res A4 PDF.
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

  const printHtml = buildIsolatedPrintHtml(el, docTitle);

  // 1. Android APK Native Bridge check (dedicated HTML printing)
  if (isAndroidNativeApp()) {
    const nativeHtmlSuccess = nativePrintHtml(printHtml, docTitle);
    if (nativeHtmlSuccess) {
      if (title) setTimeout(() => { document.title = origTitle; }, 1500);
      return true;
    }

    // Android APK Native Bridge check (PrintDocumentAdapter fallback)
    const nativeSuccess = await printViaDomIsolation(el, docTitle);
    if (nativeSuccess) {
      if (title) setTimeout(() => { document.title = origTitle; }, 1500);
      return true;
    }
  }

  // 2. Desktop Browsers & Supporting WebViews: Try isolated invisible iframe
  let printed = false;
  if (!isMobileBrowser()) {
    printed = await printViaHiddenIframe(printHtml);
  }

  // 3. Mobile Browsers or if iframe printing did not trigger: Try DOM isolation print
  if (!printed) {
    printed = await printViaDomIsolation(el, docTitle);
  }

  // 4. Ultimate Fallback: If printing is blocked by browser sandbox or iframe restrictions,
  // export high-fidelity A4 PDF so the user can immediately view/print via their system PDF viewer.
  if (!printed) {
    try {
      console.info('[Print] Direct print unavailable, launching PDF print export');
      const filename = `${docTitle.replace(/[^\w\d-_]/g, '_')}.pdf`;
      printed = await exportElementToPdf(el, {
        filename,
        title: docTitle,
      });
    } catch (pdfErr) {
      console.error('[Print] PDF fallback export failed:', pdfErr);
    }
  }

  if (title) {
    setTimeout(() => {
      document.title = origTitle;
    }, 1500);
  }

  return printed;
}

export { exportElementToPdf };
export type { PdfExportOptions };
