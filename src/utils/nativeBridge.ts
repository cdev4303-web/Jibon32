/**
 * Native Android JavaScript Interface Bridge Helper
 * Seamlessly routes Print, Image Save, PDF Save, and WhatsApp Image Sharing
 * to Native Android APIs when running inside the Android APK WebView,
 * while falling back transparently to standard browser APIs when running in Chrome/Safari.
 */

export interface AndroidNativeInterface {
  isNativeApp?: () => boolean;
  printDocument?: (jobName: string) => void;
  printHtml?: (htmlContent: string, jobName: string) => void;
  saveImageBase64?: (base64Data: string, filename: string, title?: string) => boolean;
  savePdfBase64?: (base64Data: string, filename: string) => boolean;
  saveBackupJson?: (jsonContent: string, filename: string) => boolean;
  shareImageWhatsApp?: (
    base64Data: string,
    filename: string,
    phoneNumber?: string,
    captionText?: string
  ) => boolean;
  shareImageGeneral?: (
    base64Data: string,
    filename: string,
    captionText?: string
  ) => boolean;
}

declare global {
  interface Window {
    AndroidNativeApp?: AndroidNativeInterface;
    AndroidBridge?: AndroidNativeInterface;
  }
}

/**
 * Checks if the application is currently running inside the native Android APK WebView
 */
export function isAndroidNativeApp(): boolean {
  if (typeof window === 'undefined') return false;

  const hasNativeBridge = Boolean(
    (window.AndroidNativeApp && typeof window.AndroidNativeApp.printDocument === 'function') ||
    (window.AndroidBridge && typeof window.AndroidBridge.printDocument === 'function')
  );

  const hasUserAgent = Boolean(
    typeof navigator !== 'undefined' &&
    navigator.userAgent &&
    navigator.userAgent.includes('JibonTailorApp')
  );

  return hasNativeBridge || hasUserAgent;
}

/**
 * Retrieves the active native bridge instance
 */
function getNativeBridge(): AndroidNativeInterface | null {
  if (typeof window === 'undefined') return null;
  return window.AndroidNativeApp || window.AndroidBridge || null;
}

/**
 * 1. Native Android Printing
 * Triggers Android PrintManager and WebView.createPrintDocumentAdapter()
 */
export function nativePrint(jobName?: string): boolean {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.printDocument === 'function') {
    try {
      bridge.printDocument(jobName || 'Jibon_Tailor_Print');
      return true;
    } catch (e) {
      console.warn('[NativeBridge] Print error:', e);
    }
  }
  return false;
}

/**
 * 1b. Native Android Isolated HTML Printing
 * Sends dedicated HTML content directly to native PrintManager via offscreen WebView.
 */
export function nativePrintHtml(htmlContent: string, jobName?: string): boolean {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.printHtml === 'function') {
    try {
      bridge.printHtml(htmlContent, jobName || 'Jibon_Tailor_Print');
      return true;
    } catch (e) {
      console.warn('[NativeBridge] PrintHtml error:', e);
    }
  }
  return false;
}

/**
 * 2. Native PNG Saving to Android MediaStore
 */
export function nativeSaveImage(base64Data: string, filename: string, title?: string): boolean {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.saveImageBase64 === 'function') {
    try {
      return bridge.saveImageBase64(base64Data, filename, title || filename);
    } catch (e) {
      console.warn('[NativeBridge] Save image error:', e);
    }
  }
  return false;
}

/**
 * 3. Native PDF Saving to Android Downloads folder
 */
export function nativeSavePdf(base64Data: string, filename: string): boolean {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.savePdfBase64 === 'function') {
    try {
      return bridge.savePdfBase64(base64Data, filename);
    } catch (e) {
      console.warn('[NativeBridge] Save PDF error:', e);
    }
  }
  return false;
}

/**
 * 4 & 5. Native WhatsApp Image Sharing with Attachment via FileProvider & Intent.ACTION_SEND
 */
export function nativeShareWhatsApp(
  base64Data: string,
  filename: string,
  phoneNumber?: string,
  captionText?: string
): boolean {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.shareImageWhatsApp === 'function') {
    try {
      return bridge.shareImageWhatsApp(base64Data, filename, phoneNumber || '', captionText || '');
    } catch (e) {
      console.warn('[NativeBridge] WhatsApp share error:', e);
    }
  }
  return false;
}

/**
 * Native General Image Sharing via Android System Chooser
 */
export function nativeShareGeneral(
  base64Data: string,
  filename: string,
  captionText?: string
): boolean {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.shareImageGeneral === 'function') {
    try {
      return bridge.shareImageGeneral(base64Data, filename, captionText || '');
    } catch (e) {
      console.warn('[NativeBridge] General share error:', e);
    }
  }
  return false;
}

/**
 * 6. Native Data Backup Save to Android Downloads folder
 * Saves JSON file into Downloads/JibonTailor and initiates system share
 */
export function nativeSaveBackup(jsonContent: string, filename: string): boolean {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.saveBackupJson === 'function') {
    try {
      return bridge.saveBackupJson(jsonContent, filename);
    } catch (e) {
      console.warn('[NativeBridge] Save backup JSON error:', e);
    }
  }
  return false;
}
