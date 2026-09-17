import { Invoice, Shop, Language } from '../types';
import { generateInvoiceQrDataUrl } from './qrcode';
import { captureElementToPng } from './domCapture';
import { isAndroidNativeApp, nativeSaveImage } from './nativeBridge';

/**
 * Safely loads an image from data URI or URL
 */
const loadImage = (src: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    if (!src || src.length < 10) {
      resolve(null);
      return;
    }
    const img = new Image();
    // Only set crossOrigin for external http(s) URLs, never for data/blob URIs
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (err) => {
      console.warn('Failed to load invoice image asset:', src?.slice(0, 35), err);
      resolve(null);
    };
    img.src = src;
  });
};

/**
 * Draws rounded image on canvas
 */
const drawRoundedImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 8
) => {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();

  // Object-cover calculation
  const imgAspect = img.width / img.height;
  const targetAspect = w / h;
  let drawW = w;
  let drawH = h;
  let offsetX = 0;
  let offsetY = 0;

  if (imgAspect > targetAspect) {
    drawW = h * imgAspect;
    offsetX = -(drawW - w) / 2;
  } else {
    drawH = w / imgAspect;
    offsetY = -(drawH - h) / 2;
  }

  ctx.drawImage(img, x + offsetX, y + offsetY, drawW, drawH);
  ctx.restore();

  // Outer border
  ctx.strokeStyle = '#047857';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();
};

/**
 * Draws a complete, ultra-crisp, professional tailor receipt onto an HTML5 Canvas
 * including attached camera photos, measurements, and financial receipts.
 */
export async function generateInvoiceImageUriAsync(
  invoice: Invoice,
  shop: Shop,
  lang: Language = 'BN'
): Promise<string> {
  // 1. High-Fidelity Capture: If live preview element (#printable-area) exists in the DOM,
  // capture it directly for 100% exact colors, typography, and styling parity.
  const liveEl = document.getElementById('printable-area');
  if (liveEl) {
    try {
      const liveDataUri = await captureElementToPng(liveEl, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
      });
      if (liveDataUri && liveDataUri.startsWith('data:image/png') && liveDataUri.length > 2500) {
        return liveDataUri;
      }
    } catch (captureErr) {
      console.warn('[InvoiceImage] Live DOM capture failed, falling back to canvas template:', captureErr);
    }
  }

  const isEn = lang === 'EN';
  const canvas = document.createElement('canvas');
  const width = 900;

  const attachedPhotos = [
    {
      uri: invoice.clothPhotoUri,
      label: isEn ? '1. Cloth Fabric Sample' : '১. কাপড়ের স্যাম্পল (Cloth)',
    },
    {
      uri: invoice.dressDesignPhotoUri,
      label: isEn ? '2. Dress Design / Model' : '২. ড্রেস ডিজাইন (Design)',
    },
    {
      uri: invoice.customerDesignPhotoUri,
      label: isEn ? '3. Customer Sketch' : '৩. কাস্টমার স্কেচ (Sketch)',
    },
    {
      uri: invoice.extraPhotoUri,
      label: isEn ? '4. Additional Sample' : '৪. অতিরিক্ত ছবি (Sample)',
    },
  ].filter((p): p is { uri: string; label: string } => Boolean(p.uri && p.uri.length > 5));

  // Calculate dynamic height based on items & photos
  const itemsCount = Math.max(invoice.items?.length || 1, 1);
  const baseHeight = 1260;
  const extraItemsHeight = (itemsCount - 1) * 36;
  const extraPhotosHeight = attachedPhotos.length > 0 ? 250 : 0;
  const height = baseHeight + extraItemsHeight + extraPhotosHeight;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. Top Header Brand Bar (Signature Emerald Green with Gold Accent)
  const headerGrad = ctx.createLinearGradient(0, 0, width, 150);
  headerGrad.addColorStop(0, '#064E3B');
  headerGrad.addColorStop(0.5, '#047857');
  headerGrad.addColorStop(1, '#064E3B');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, 150);

  // Decorative Accent Line
  ctx.fillStyle = '#F59E0B'; // Amber Gold
  ctx.fillRect(0, 146, width, 4);

  // Logo Emblem on left
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(85, 75, 45, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#F59E0B'; // Amber Gold
  ctx.stroke();

  // Inner circle
  ctx.fillStyle = '#064E3B';
  ctx.beginPath();
  ctx.arc(85, 75, 38, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FDE68A';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('JT', 85, 74);
  ctx.restore();

  // Shop Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(shop.name.toUpperCase(), (width + 50) / 2, 52);

  // Shop Info
  ctx.fillStyle = '#A7F3D0';
  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${shop.address}`, (width + 50) / 2, 84);

  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const crText = shop.crNumber.trim().toUpperCase().startsWith('CR')
    ? shop.crNumber.trim()
    : `CR: ${shop.crNumber.trim()}`;
  ctx.fillText(`📞 Tel: ${shop.phone}   •   ${crText}`, (width + 50) / 2, 114);

  // 3. Invoice Header Card
  const metaY = 175;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(40, metaY, width - 80, 110, 10);
  ctx.fill();
  ctx.stroke();

  // Left side: Invoice # & Badge
  ctx.textAlign = 'left';
  ctx.fillStyle = '#064E3B';
  ctx.font = '900 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`INVOICE #${invoice.id}`, 65, metaY + 42);

  const isPaid = invoice.remainingDue <= 0;
  const isDelivered = invoice.orderStatus === 'Delivered';
  const isReady = invoice.orderStatus === 'Ready for Pickup';
  const badgeColor = isDelivered ? '#059669' : isReady ? '#0D9488' : isPaid ? '#10B981' : '#D97706';
  const badgeText = isDelivered
    ? 'DELIVERED'
    : isReady
    ? 'READY FOR PICKUP'
    : isPaid
    ? 'PAID'
    : `DUE: ${shop.currency} ${invoice.remainingDue.toFixed(2)}`;

  ctx.fillStyle = isPaid ? '#DCFCE7' : isReady ? '#CCFBF1' : '#FEF3C7';
  ctx.beginPath();
  ctx.roundRect(65, metaY + 55, 230, 32, 6);
  ctx.fill();
  ctx.fillStyle = badgeColor;
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`●  ${badgeText}`, 80, metaY + 76);

  // Middle: Dates
  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Order Date: ${invoice.orderDate}`, 380, metaY + 36);

  ctx.fillStyle = '#064E3B';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Delivery: ${invoice.deliveryDate}`, 380, metaY + 62);

  ctx.fillStyle = '#64748B';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Dress: ${invoice.dressType}`, 380, metaY + 86);

  // Right side: Real Scannable Invoice QR Code
  try {
    const qrUri = await generateInvoiceQrDataUrl(invoice, shop, { size: 120, darkColor: '#064E3B' });
    const qrImg = await loadImage(qrUri);
    if (qrImg) {
      const qrX = width - 150;
      const qrY = metaY + 10;
      // White container box
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(qrX, qrY, 90, 90, 8);
      ctx.fill();
      ctx.stroke();

      ctx.drawImage(qrImg, qrX + 5, qrY + 5, 80, 80);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#064E3B';
      ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('SCAN TO VERIFY', qrX + 45, qrY + 88);
    }
  } catch (err) {
    console.warn('QR drawing failed', err);
  }

  // 4. Customer Details Box
  const custY = 305;
  ctx.fillStyle = '#F0FDF4'; // Light green
  ctx.strokeStyle = '#BBF7D0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(40, custY, width - 80, 80, 10);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(isEn ? 'CUSTOMER DETAILS' : 'CUSTOMER DETAILS (কাস্টমার তথ্য)', 60, custY + 25);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(invoice.customerName, 60, custY + 54);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`📞 ${invoice.customerPhone}`, width - 60, custY + 45);

  if (invoice.customerAddress) {
    ctx.fillStyle = '#64748B';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`📍 ${invoice.customerAddress}`, width - 60, custY + 68);
  }

  // 5. Items Table Header
  const tableY = 405;
  const tableW = width - 80; // 820px wide (from x = 40 to x = 860)
  ctx.fillStyle = '#064E3B';
  ctx.beginPath();
  ctx.roundRect(40, tableY, tableW, 40, [8, 8, 0, 0]);
  ctx.fill();

  // Column X coordinates carefully calculated to prevent any text overlap:
  // Col 1 (#): Center at 65 (span 40 to 90)
  // Col 2 (Description): Left at 100 (span 90 to 505)
  // Col 3 (QTY): Center at 535 (span 510 to 565)
  // Col 4 (RATE): Right-aligned at 705 (span 575 to 705, width 130px)
  // Col 5 (TOTAL): Right-aligned at 845 (span 715 to 845, width 130px)
  const col1X = 65;
  const col2X = 100;
  const col3X = 535;
  const col4X = 705;
  const col5X = 845;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  ctx.textAlign = 'center';
  ctx.fillText('#', col1X, tableY + 25);

  ctx.textAlign = 'left';
  ctx.fillText(isEn ? 'ITEM / WORK DESCRIPTION' : 'আইটেম / কাজের বিবরণ (DESCRIPTION)', col2X, tableY + 25);

  ctx.textAlign = 'center';
  ctx.fillText(isEn ? 'QTY' : 'পরিমাণ (QTY)', col3X, tableY + 25);

  ctx.textAlign = 'right';
  ctx.fillText(`RATE (${shop.currency})`, col4X, tableY + 25);

  ctx.fillText(`TOTAL (${shop.currency})`, col5X, tableY + 25);

  // Table Body Rows
  let currY = tableY + 40;
  const items =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : [
          {
            id: '1',
            invoiceId: invoice.id,
            description: `Custom Tailoring Work (${invoice.dressType})`,
            quantity: 1,
            unitPrice: invoice.subtotal,
            totalPrice: invoice.subtotal,
          },
        ];

  items.forEach((item, index) => {
    const rowH = 42;
    ctx.fillStyle = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    ctx.fillRect(40, currY, tableW, rowH);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, currY + rowH);
    ctx.lineTo(width - 40, currY + rowH);
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((index + 1).toString(), col1X, currY + 26);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1E293B';
    ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const desc = item.description || `Tailoring Item #${index + 1}`;
    ctx.fillText(desc.length > 42 ? desc.slice(0, 39) + '...' : desc, col2X, currY + 26);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText((item.quantity || 1).toString(), col3X, currY + 26);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#475569';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(item.unitPrice.toFixed(2), col4X, currY + 26);

    ctx.fillStyle = '#064E3B';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(item.totalPrice.toFixed(2), col5X, currY + 26);

    currY += rowH;
  });

  // 6. Measurements & Financial Summary Section
  const midY = currY + 25;

  // Measurements Box (Left side - Styled in blue)
  ctx.fillStyle = '#F0F7FF';
  ctx.strokeStyle = '#BFDBFE';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(40, midY, 410, 245, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    isEn ? '📏 MEASUREMENTS (Inches)' : '📏 MEASUREMENTS (মাপের বিবরণ - ইঞ্চি)',
    60,
    midY + 30
  );

  const m = invoice.measurement;
  const meas = isEn
    ? [
        { label: 'Length:', val: m?.length || '56' },
        { label: 'Chest:', val: m?.bodyChest || '38' },
        { label: 'Waist:', val: m?.waist || '34' },
        { label: 'Hip:', val: m?.hip || '42' },
        { label: 'Shoulder:', val: m?.shoulder || '15' },
        { label: 'Sleeve:', val: m?.sleeve || '22.5' },
        { label: 'Neck:', val: m?.neck || '7' },
        { label: 'Flare:', val: m?.flareBottom || '48' },
      ]
    : [
        { label: 'লম্বা (Length):', val: m?.length || '56' },
        { label: 'বডি (Chest):', val: m?.bodyChest || '38' },
        { label: 'কোমর (Waist):', val: m?.waist || '34' },
        { label: 'হিপ (Hip):', val: m?.hip || '42' },
        { label: 'পুঁট (Shoulder):', val: m?.shoulder || '15' },
        { label: 'হাতা (Sleeve):', val: m?.sleeve || '22.5' },
        { label: 'গলা (Neck):', val: m?.neck || '7' },
        { label: 'ঘের (Flare):', val: m?.flareBottom || '48' },
      ];

  let measGridY = midY + 65;
  meas.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? 60 : 255;
    const y = measGridY + row * 40;

    ctx.fillStyle = '#2563EB';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(item.label, x, y);

    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${item.val}"`, x + 115, y);
  });

  // Financials Box (Right side)
  const finX = 475;
  const finW = width - 475 - 40;
  const finBoxH = 245;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(finX, midY, finW, finBoxH, 10);
  ctx.fill();
  ctx.stroke();

  let finRowY = midY + 34;
  const drawFinRow = (label: string, value: string, isBold: boolean = false, color: string = '#1E293B', fontSize: number = 14) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = isBold
      ? `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      : `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(label, finX + 20, finRowY);

    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.font = isBold
      ? `bold ${fontSize + 2}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      : `500 ${fontSize + 1}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(value, finX + finW - 20, finRowY);

    finRowY += 32;
  };

  drawFinRow(isEn ? 'Subtotal:' : 'সাবটোটাল (Subtotal):', `${shop.currency} ${invoice.subtotal.toFixed(2)}`);

  if (invoice.discount > 0) {
    drawFinRow(isEn ? 'Discount:' : 'ডিসকাউন্ট (Discount):', `-${shop.currency} ${invoice.discount.toFixed(2)}`, false, '#059669');
  }

  // Clean Divider between Subtotal/Discount and Net Total (never cuts through text)
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(finX + 15, finRowY - 6);
  ctx.lineTo(finX + finW - 15, finRowY - 6);
  ctx.stroke();

  finRowY += 8;
  drawFinRow(isEn ? 'Net Total:' : 'মোট প্রদেয় (Net Total):', `${shop.currency} ${invoice.netTotal.toFixed(2)}`, true, '#064E3B', 15);
  drawFinRow(
    isEn ? `Advance Paid (${invoice.paymentMethod}):` : `অগ্রিম জমা (${invoice.paymentMethod}):`,
    `${shop.currency} ${invoice.advanceDeposit.toFixed(2)}`,
    false,
    '#047857'
  );

  // Due Highlight Bar - perfectly positioned with zero overlap
  finRowY += 4;
  const dueBoxH = 48;
  ctx.fillStyle = invoice.remainingDue > 0 ? '#FFF1F2' : '#F0FDF4';
  ctx.beginPath();
  ctx.roundRect(finX + 10, finRowY, finW - 20, dueBoxH, 8);
  ctx.fill();

  ctx.strokeStyle = invoice.remainingDue > 0 ? '#FECDD3' : '#BBF7D0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = invoice.remainingDue > 0 ? '#E11D48' : '#166534';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    invoice.remainingDue > 0
      ? isEn
        ? 'Remaining Due:'
        : 'বকেয়া বাকি (Due):'
      : isEn
      ? 'Payment Status:'
      : 'পরিশোধ অবস্থা:',
    finX + 25,
    finRowY + 30
  );

  ctx.textAlign = 'right';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    invoice.remainingDue > 0
      ? `${shop.currency} ${invoice.remainingDue.toFixed(2)}`
      : 'FULL PAID',
    finX + finW - 25,
    finRowY + 31
  );

  let nextSectionY = midY + 265;

  // 7. Attached Photos Section (If any photos were taken via camera or gallery)
  if (attachedPhotos.length > 0) {
    const photoBoxY = nextSectionY;
    const photoBoxH = 220;

    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(40, photoBoxY, width - 80, photoBoxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#064E3B';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      isEn
        ? '📷 ATTACHED PHOTOS & DESIGNS'
        : '📷 ATTACHED PHOTOS & DESIGNS (সংযুক্ত কাপড়ের স্যাম্পল ও ডিজাইন)',
      60,
      photoBoxY + 28
    );

    const availableW = width - 80 - 40; // 780
    const photoCount = attachedPhotos.length;
    const photoGap = 16;
    const singlePhotoW = Math.min(220, (availableW - (photoCount - 1) * photoGap) / photoCount);
    const photoH = 140;
    const startX = 60;

    for (let pIdx = 0; pIdx < attachedPhotos.length; pIdx++) {
      const p = attachedPhotos[pIdx];
      const pX = startX + pIdx * (singlePhotoW + photoGap);
      const pY = photoBoxY + 45;

      try {
        const loadedImg = await loadImage(p.uri);
        if (loadedImg) {
          drawRoundedImage(ctx, loadedImg, pX, pY, singlePhotoW, photoH, 8);
        } else {
          // Placeholder box
          ctx.fillStyle = '#E2E8F0';
          ctx.beginPath();
          ctx.roundRect(pX, pY, singlePhotoW, photoH, 8);
          ctx.fill();

          ctx.fillStyle = '#64748B';
          ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Photo Attached', pX + singlePhotoW / 2, pY + photoH / 2);
        }
      } catch (err) {
        console.warn('Could not draw photo onto invoice canvas', err);
      }

      // Caption label under photo
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, pX + singlePhotoW / 2, pY + photoH + 18);
    }

    nextSectionY += photoBoxH + 20;
  }

  // 8. Notes & Terms
  const footerY = nextSectionY;
  if (invoice.notes) {
    ctx.fillStyle = '#FFFBEB';
    ctx.strokeStyle = '#FDE68A';
    ctx.beginPath();
    ctx.roundRect(40, footerY, width - 80, 40, 6);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#92400E';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(isEn ? `📝 Special Note: ${invoice.notes}` : `📝 বিশেষ নোট: ${invoice.notes}`, 55, footerY + 25);
  }

  // 9. Bottom Footer Bar
  const btmY = height - 100;
  ctx.fillStyle = '#064E3B';
  ctx.fillRect(0, btmY, width, 100);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`THANK YOU FOR CHOOSING ${shop.name.toUpperCase()}!`, width / 2, btmY + 38);

  ctx.fillStyle = '#A7F3D0';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    isEn
      ? 'Please present this digital invoice receipt at the time of dress delivery/collection  •  Thank You'
      : 'পোশাক ডেলিভারি নেওয়ার সময় অনুগ্রহ করে এই ডিজিটাল রশিদ সাথে রাখুন  •  ধন্যবাদ',
    width / 2,
    btmY + 68
  );

  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Triggers direct browser download of the image data URI
 * Uses Blob object URLs to ensure 100% reliable downloads on mobile and sandboxed browsers
 */
export function downloadImageFromUri(dataUri: string, filename: string) {
  try {
    // 1. Android APK WebView native MediaStore saving
    if (isAndroidNativeApp()) {
      const saved = nativeSaveImage(dataUri, filename);
      if (saved) {
        return;
      }
    }

    let url = dataUri;
    let isBlobUrl = false;

    if (dataUri.startsWith('data:')) {
      const parts = dataUri.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const binaryStr = atob(parts[1]);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mime });
      url = URL.createObjectURL(blob);
      isBlobUrl = true;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (isBlobUrl) {
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    }
  } catch (err) {
    console.warn('[Download] Blob download failed, falling back to direct link:', err);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
