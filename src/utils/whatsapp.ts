import { Invoice, Shop, CatalogItem, Language } from '../types';
import { isAndroidNativeApp, nativeShareWhatsApp, nativeSharePngOnly, nativeShareGeneral } from './nativeBridge';
import { downloadImageFromUri } from './invoiceImage';

export const cleanPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.substring(2);
  if (digits.startsWith('968')) return digits;
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.startsWith('966')) return digits;
  if (digits.startsWith('971')) return digits;
  if (digits.startsWith('965')) return digits;
  if (digits.startsWith('974')) return digits;
  if (digits.startsWith('973')) return digits;

  // Local formats:
  // Bangladesh: 01xxxxxxxxx (11 digits) -> 8801xxxxxxxxx
  if (digits.startsWith('01') && digits.length === 11) return `88${digits}`;
  // Bangladesh: 1xxxxxxxxx (10 digits) -> 8801xxxxxxxxx
  if (digits.startsWith('1') && digits.length === 10) return `880${digits}`;
  // Oman 8-digit
  if (digits.length === 8) return `968${digits}`;
  // Gulf 05xxxxxxxx (10 digits)
  if (digits.startsWith('05') && digits.length === 10) return `966${digits.substring(1)}`;
  // India 10-digit
  if (digits.length === 10 && !digits.startsWith('0')) return `91${digits}`;
  return digits;
};

export const createInvoiceWhatsAppMessage = (
  invoice: Invoice,
  shop: Shop,
  lang: Language = 'BN'
): string => {
  const isEn = lang === 'EN';
  const itemsText =
    invoice.items && invoice.items.length > 0
      ? invoice.items
          .map(
            (it, idx) =>
              `   ${idx + 1}. ${it.description} x${it.quantity} = ${shop.currency} ${it.totalPrice.toFixed(2)}`
          )
          .join('\n')
      : `   Custom tailoring work (${invoice.dressType})`;

  if (isEn) {
    return `✨ *${shop.name}* ✨
📍 ${shop.address}
📞 Tel: ${shop.phone} | CR: ${shop.crNumber}

🧾 *INVOICE: #${invoice.id}*
👤 Customer: *${invoice.customerName}*
📱 Phone: ${invoice.customerPhone}
📅 Order Date: ${invoice.orderDate}
🚚 Delivery Date: *${invoice.deliveryDate}*
👗 Dress Type: *${invoice.dressType}*
📌 Status: *${invoice.orderStatus}*

✂️ *Order Items:*
${itemsText}

💰 *Billing Summary:*
   Subtotal: ${shop.currency} ${invoice.subtotal.toFixed(2)}
${invoice.discount > 0 ? `   Discount: -${shop.currency} ${invoice.discount.toFixed(2)}\n` : ''}   *Net Total: ${shop.currency} ${invoice.netTotal.toFixed(2)}*
   Advance Deposit: ${shop.currency} ${invoice.advanceDeposit.toFixed(2)} (${invoice.paymentMethod})
   *Remaining Due: ${shop.currency} ${invoice.remainingDue.toFixed(2)}*
${invoice.notes ? `\n📝 Special Note: ${invoice.notes}` : ''}

🙏 Thank you for choosing ${shop.name}! Please present this invoice receipt at the time of delivery collection.`;
  }

  return `✨ *${shop.name}* ✨
📍 ${shop.address}
📞 ফোন: ${shop.phone} | CR: ${shop.crNumber}

🧾 *ইনভয়েস রশিদ: #${invoice.id}*
👤 কাস্টমার: *${invoice.customerName}*
📱 ফোন: ${invoice.customerPhone}
📅 অর্ডারের তারিখ: ${invoice.orderDate}
🚚 ডেলিভারির তারিখ: *${invoice.deliveryDate}*
👗 পোশাকের ধরন: *${invoice.dressType}*
📌 অবস্থা: *${invoice.orderStatus}*

✂️ *অর্ডার আইটেম:*
${itemsText}

💰 *হিসাব বিবরণ:*
   সাবটোটাল: ${shop.currency} ${invoice.subtotal.toFixed(2)}
${invoice.discount > 0 ? `   ছাড়: -${shop.currency} ${invoice.discount.toFixed(2)}\n` : ''}   *সর্বমোট বিল: ${shop.currency} ${invoice.netTotal.toFixed(2)}*
   অগ্রিম জমা: ${shop.currency} ${invoice.advanceDeposit.toFixed(2)} (${invoice.paymentMethod})
   *বাকি পাওনা (Due): ${shop.currency} ${invoice.remainingDue.toFixed(2)}*
${invoice.notes ? `\n📝 বিশেষ নোট: ${invoice.notes}` : ''}

🙏 ${shop.name}-এ অর্ডার করার জন্য ধন্যবাদ! ডেলিভারি গ্রহণের সময় এই ইনভয়েস রশিদটি প্রদর্শন করুন।`;
};

export const createReadyWhatsAppMessage = (
  invoice: Invoice,
  shop: Shop,
  lang: Language = 'BN'
): string => {
  const isEn = lang === 'EN';
  if (isEn) {
    return `✨ *${shop.name}* ✨
Dear *${invoice.customerName}*,

🎉 *Great news! Your dress is ready for pickup!* 👗✨
Your order (Invoice #${invoice.id} - ${invoice.dressType}) has been tailored and finished with care, and is ready for collection.

📋 *Invoice & Delivery Info:*
• Invoice No: *#${invoice.id}*
• Dress: *${invoice.dressType}*
• Net Total: ${shop.currency} ${invoice.netTotal.toFixed(2)}
• Advance Paid: ${shop.currency} ${invoice.advanceDeposit.toFixed(2)}
• Remaining Due: *${shop.currency} ${invoice.remainingDue.toFixed(2)}*

📍 *Shop Address:*
${shop.address}
📞 Phone: ${shop.phone}

Please visit our shop at your convenience to collect your dress. Thank you!`;
  }

  return `✨ *${shop.name}* ✨
শ্রদ্ধেয় *${invoice.customerName}*,

🎉 *আপনার পোশাকটি সেলাই সম্পন্ন ও সম্পূর্ণ রেডি!* 👗✨
আপনার অর্ডারের পোশাকটি (ইনভয়েস #${invoice.id} - ${invoice.dressType}) তৈরি সম্পন্ন হয়েছে এবং ডেলিভারির জন্য দোকানে সম্পূর্ণ রেডি রয়েছে।

📋 *অর্ডার ও হিসাব বিবরণ:*
• ইনভয়েস নং: *#${invoice.id}*
• পোশাকের ধরন: *${invoice.dressType}*
• মোট বিল: ${shop.currency} ${invoice.netTotal.toFixed(2)}
• অগ্রিম জমা: ${shop.currency} ${invoice.advanceDeposit.toFixed(2)}
• বাকি পাওনা (Due): *${shop.currency} ${invoice.remainingDue.toFixed(2)}*

📍 *দোকানের ঠিকানা:*
${shop.address}
📞 ফোন / যোগাযোগ: ${shop.phone}

আপনার সুবিধাজনক সময়ে দোকানে এসে পোশাকটি সংগ্রহ করার জন্য বিনীত অনুরোধ করা হচ্ছে। ধন্যবাদ!`;
};

export const createCatalogWhatsAppMessage = (
  item: CatalogItem,
  shop: Shop,
  lang: Language = 'BN'
): string => {
  const isEn = lang === 'EN';

  if (isEn) {
    return `✨ *${shop.name} - Catalog Design Collection* ✨

👗 *${item.name}*
🏷️ Catalog Code: *${item.catalogCode}*
📂 Category: ${item.category}
📏 Model Size: ${item.modelSize}
💰 Price: *${shop.currency} ${item.price.toFixed(2)}*

📝 Description: ${item.description || 'Premium custom tailoring with perfect fit and finish.'}

📍 Shop: ${shop.name}, ${shop.address}
📞 Order & WhatsApp inquiries: ${shop.phone}`;
  }

  return `✨ *${shop.name} - Catalog Design Collection* ✨

👗 *${item.name}*
🏷️ ক্যাটালগ কোড: *${item.catalogCode}*
📂 ক্যাটাগরি: ${item.category}
📏 মডেল সাইজ: ${item.modelSize}
💰 মূল্য: *${shop.currency} ${item.price.toFixed(2)}*

📝 বিবরণ: ${item.description || 'কাস্টম সাইজ অনুযায়ী প্রিমিয়াম কোয়ালিটি সেলাই ও নিখুঁত ফিনিশিং।'}

📍 শপ: ${shop.name}, ${shop.address}
📞 অর্ডার ও যোগাযোগের হোয়াটসঅ্যাপ: ${shop.phone}`;
};

export const openWhatsAppUrl = (phone: string, text: string) => {
  const clean = cleanPhoneNumber(phone);
  const encoded = encodeURIComponent(text);
  const url = clean
    ? `https://api.whatsapp.com/send?phone=${clean}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
  try {
    const win = window.open(url, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
};

export const sendWhatsAppCustomMessage = (phone: string, message: string) => {
  openWhatsAppUrl(phone, message);
};

/**
 * Converts a data URI to a File object for sharing
 */
export const dataUriToFile = async (dataUri: string, filename: string): Promise<File> => {
  const res = await fetch(dataUri);
  const blob = await res.blob();
  return new File([blob], filename, { type: 'image/png' });
};

/**
 * Shares an invoice PNG image directly to WhatsApp or native share sheet
 */
export const shareInvoicePngToWhatsApp = async (
  invoice: Invoice,
  shop: Shop,
  imageUri: string,
  isReadyAlert: boolean = false,
  lang: Language = 'BN'
): Promise<boolean> => {
  const sanitized = invoice.customerName.replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_');
  const filename = `Invoice_${invoice.id}_${sanitized}.png`;
  const message = isReadyAlert
    ? createReadyWhatsAppMessage(invoice, shop, lang)
    : createInvoiceWhatsAppMessage(invoice, shop, lang);

  // 1. Android APK Native WhatsApp Image Sharing via FileProvider & Intent.ACTION_SEND
  if (isAndroidNativeApp()) {
    try {
      const shared = nativeShareWhatsApp(imageUri, filename, invoice.customerPhone, message);
      if (shared) {
        return true;
      }
    } catch (bridgeErr) {
      console.warn('[WhatsApp] Native share failed, falling back to web flow:', bridgeErr);
    }
  }

  try {
    const file = await dataUriToFile(imageUri, filename);
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Invoice #${invoice.id} - ${shop.name}`,
        text: message,
      });
      return true;
    }
  } catch (err) {
    console.warn('Native file share failed or canceled, falling back to direct WhatsApp link and download:', err);
  }

  // Fallback: trigger download and open WhatsApp web/app
  const link = document.createElement('a');
  link.href = imageUri;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  openWhatsAppUrl(invoice.customerPhone, message);
  return true;
};

/**
 * Shares an invoice PNG image strictly without any text/caption to all platforms
 * (WhatsApp, Messenger, Facebook, IMO, Telegram, Bluetooth, Google Drive, Email, etc.)
 * via Android System Chooser (Intent.createChooser) or Web Share API (navigator.share).
 * Fully satisfies user requirement: "শেয়ার pngবাটনে ট্যাপ করলে যেন অন্য প্লাটফর্মে শেয়ার করা যায় শুধু png ,লিখা ছাড়া।"
 */
export const shareInvoicePngOnly = async (
  invoice: Invoice,
  imageUri: string
): Promise<boolean> => {
  const sanitized = (invoice.customerName || 'Customer').replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_');
  const filename = `Invoice_${invoice.id}_${sanitized}.png`;

  // 1. Android APK Native Chooser: Pure PNG file, ZERO text/caption to all platforms
  if (isAndroidNativeApp()) {
    try {
      const shared = nativeSharePngOnly(imageUri, filename);
      if (shared) {
        return true;
      }
    } catch (bridgeErr) {
      console.warn('[SharePngOnly] Native share failed, falling back to web flow:', bridgeErr);
    }
  }

  // 2. Web Share API: Pure PNG file ONLY, zero text/caption
  try {
    const file = await dataUriToFile(imageUri, filename);
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
      });
      return true;
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return true; // User intentionally dismissed the share sheet
    }
    console.warn('Native file share failed or canceled, falling back to download:', err);
  }

  // 3. Fallback: Save/Download the clean PNG file directly
  try {
    downloadImageFromUri(imageUri, filename);
    return true;
  } catch (downloadErr) {
    console.warn('Download fallback failed:', downloadErr);
    return false;
  }
};

/**
 * Shares a catalog item PNG image strictly without any text/caption to all platforms
 */
export const shareCatalogPngOnly = async (
  item: CatalogItem,
  imageUri: string
): Promise<boolean> => {
  const sanitized = item.name.replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_');
  const filename = `Catalog_${item.catalogCode}_${sanitized}.png`;

  if (isAndroidNativeApp()) {
    try {
      const shared = nativeSharePngOnly(imageUri, filename);
      if (shared) {
        return true;
      }
    } catch (bridgeErr) {
      console.warn('[CatalogShare] Native share failed, falling back to web flow:', bridgeErr);
    }
  }

  try {
    const file = await dataUriToFile(imageUri, filename);
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
      });
      return true;
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') return true;
    console.warn('Native file share for catalog failed, falling back:', err);
  }

  try {
    downloadImageFromUri(imageUri, filename);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Shares a catalog item PNG image directly to WhatsApp or native share sheet
 */
export const shareCatalogPngToWhatsApp = async (
  item: CatalogItem,
  shop: Shop,
  imageUri: string,
  customerPhone?: string,
  lang: Language = 'BN'
): Promise<boolean> => {
  const sanitized = item.name.replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_');
  const filename = `Catalog_${item.catalogCode}_${sanitized}.png`;
  const message = createCatalogWhatsAppMessage(item, shop, lang);

  // 1. Android APK Native WhatsApp Image Sharing
  if (isAndroidNativeApp()) {
    try {
      const shared = nativeShareWhatsApp(imageUri, filename, customerPhone, message);
      if (shared) {
        return true;
      }
    } catch (bridgeErr) {
      console.warn('[WhatsApp] Native catalog share failed, falling back to web flow:', bridgeErr);
    }
  }

  try {
    const file = await dataUriToFile(imageUri, filename);
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `${item.name} (${item.catalogCode}) - ${shop.name}`,
        text: message,
      });
      return true;
    }
  } catch (err) {
    console.warn('Native file share for catalog failed, falling back:', err);
  }

  // Fallback: trigger download and open WhatsApp
  const link = document.createElement('a');
  link.href = imageUri;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  openWhatsAppUrl(customerPhone || shop.phone, message);
  return true;
};

/**
 * Creates a formatted WhatsApp statement message for Karigar
 */
export const createKarigarStatementWhatsAppMessage = (
  karigarName: string,
  stats: {
    pieces: number;
    cutting: number;
    sewing: number;
    wage: number;
    paid: number;
    due: number;
    period: string;
  },
  shop: Shop,
  lang: Language = 'BN'
): string => {
  const isEn = lang === 'EN';
  if (isEn) {
    return `🧵 *${shop.name} - Karigar Work & Wage Statement* 🧵
👤 Karigar: *${karigarName}*
📅 Period: *${stats.period}*
📍 Shop: ${shop.name} | 📞 ${shop.phone}

📋 *Work Summary:*
• Total Pieces: *${stats.pieces} pcs* (${stats.cutting} Cut + ${stats.sewing} Sew)
• Total Earned Wage: *${shop.currency} ${stats.wage.toFixed(2)}*
• Advance / Paid: ${shop.currency} ${stats.paid.toFixed(2)}
• *Net Due Balance: ${shop.currency} ${stats.due.toFixed(2)}*

🙏 Generated from ${shop.name} Tailor ERP.`;
  }

  return `🧵 *${shop.name} - কারিগর কাজের হিসাব খাতা* 🧵
👤 কারিগরের নাম: *${karigarName}*
📅 সময়কাল: *${stats.period}*
📍 দোকান: ${shop.name} | 📞 ${shop.phone}

📋 *কাজের হিসাব ও মজুরি বিবরণ:*
• মোট পোশাক (পিস): *${stats.pieces} টি* (কাটিং: ${stats.cutting}, সেলাই: ${stats.sewing})
• মোট অর্জিত মজুরি: *${shop.currency} ${stats.wage.toFixed(2)}*
• টাকা নেওয়া / পরিশোধ: ${shop.currency} ${stats.paid.toFixed(2)}
• *মোট বাকি পাওনা (Due): ${shop.currency} ${stats.due.toFixed(2)}*

🙏 ${shop.name} টেইলার্স ম্যানেজমেন্ট সফটওয়্যার হতে প্রস্তুতকৃত।`;
};
