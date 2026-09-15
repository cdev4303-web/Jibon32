import { jsPDF } from 'jspdf';
import { captureElementToCanvas } from './domCapture';
import { isAndroidNativeApp, nativeSavePdf } from './nativeBridge';

export interface PdfExportOptions {
  filename?: string;
  title?: string;
  quality?: number;
  scale?: number;
}

/**
 * High-fidelity A4 PDF exporter from DOM element using native capture and jsPDF.
 * Maintains 100% exact preview colors, borders, logos, and Bengali typography.
 * Automatically utilizes Native Android MediaStore Downloads bridge when inside APK WebView.
 */
export async function exportElementToPdf(
  elementIdOrElement: string | HTMLElement,
  options: PdfExportOptions = {}
): Promise<boolean> {
  try {
    const el =
      typeof elementIdOrElement === 'string'
        ? document.getElementById(elementIdOrElement)
        : elementIdOrElement;

    if (!el) {
      console.error('[PDF] Target element not found:', elementIdOrElement);
      return false;
    }

    const filename = (options.filename || 'document.pdf').endsWith('.pdf')
      ? options.filename || 'document.pdf'
      : `${options.filename || 'document'}.pdf`;

    const scale = options.scale || 2;

    // Capture the target element with 100% authentic color rendering & typography
    const canvas = await captureElementToCanvas(el, {
      pixelRatio: scale,
      backgroundColor: '#ffffff',
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Rendered canvas is invalid or empty.');
    }

    // Standard A4 dimensions in mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8; // 8mm margin
    const contentWidth = pageWidth - margin * 2; // 194mm
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
    const pageUsableHeight = pageHeight - margin * 2; // 281mm

    // Use lossless PNG to preserve 100% authentic color fidelity and razor-sharp text
    const imgData = canvas.toDataURL('image/png');

    if (options.title) {
      pdf.setProperties({
        title: options.title,
        creator: 'Jibon Tailor ERP',
      });
    }

    if (contentHeight <= pageUsableHeight) {
      // Single A4 page
      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');
    } else {
      // Multi-page A4 document
      let remainingHeight = contentHeight;
      let yOffset = margin;

      // Page 1
      pdf.addImage(imgData, 'PNG', margin, yOffset, contentWidth, contentHeight, undefined, 'FAST');
      remainingHeight -= pageUsableHeight;

      // Subsequent pages
      while (remainingHeight > 0) {
        pdf.addPage();
        yOffset = margin - (contentHeight - remainingHeight);
        pdf.addImage(imgData, 'PNG', margin, yOffset, contentWidth, contentHeight, undefined, 'FAST');
        remainingHeight -= pageUsableHeight;
      }
    }

    // 1. If running inside Android Native APK WebView, save directly via Native MediaStore/Downloads
    if (isAndroidNativeApp()) {
      try {
        const dataUriString = pdf.output('datauristring');
        const nativeSaved = nativeSavePdf(dataUriString, filename);
        if (nativeSaved) {
          return true;
        }
      } catch (bridgeErr) {
        console.warn('[PDF] Native bridge save failed, falling back to browser download:', bridgeErr);
      }
    }

    // 2. Standard Browser Fallback (Chrome, Safari, Edge, Desktop)
    try {
      pdf.save(filename);
    } catch (saveErr) {
      console.warn('[PDF] Standard save failed, trying blob download:', saveErr);
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    }

    return true;
  } catch (err) {
    console.error('[PDF] Export failed:', err);
    return false;
  }
}
