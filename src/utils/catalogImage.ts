import { CatalogItem, Shop } from '../types';

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
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

/**
 * Generates an ultra clean, attractive Catalog Design Card in PNG format
 */
export async function generateCatalogImageUriAsync(item: CatalogItem, shop: Shop): Promise<string> {
  const canvas = document.createElement('canvas');
  const width = 800;
  const height = 1000;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // Header Banner
  ctx.fillStyle = '#064E3B';
  ctx.fillRect(0, 0, width, 140);

  // Decorative Line
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(0, 136, width, 4);

  // Shop Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(shop.name.toUpperCase(), width / 2, 60);

  ctx.fillStyle = '#A7F3D0';
  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('PREMIUM TAILORING & DRESS COLLECTION', width / 2, 100);

  // Main Image Area
  const imgX = 50;
  const imgY = 170;
  const imgW = 700;
  const imgH = 500;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(imgX, imgY, imgW, imgH, 16);
  ctx.fill();

  let imgLoaded: HTMLImageElement | null = null;
  if (item.imageUri) {
    try {
      imgLoaded = await loadImage(item.imageUri);
    } catch (e) {
      console.warn(e);
    }
  }

  if (imgLoaded) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, 16);
    ctx.clip();

    const imgAspect = imgLoaded.width / imgLoaded.height;
    const targetAspect = imgW / imgH;
    let drawW = imgW;
    let drawH = imgH;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > targetAspect) {
      drawW = imgH * imgAspect;
      offsetX = -(drawW - imgW) / 2;
    } else {
      drawH = imgW / imgAspect;
      offsetY = -(drawH - imgH) / 2;
    }

    ctx.drawImage(imgLoaded, imgX + offsetX, imgY + offsetY, drawW, drawH);
    ctx.restore();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, 16);
    ctx.stroke();
  } else {
    // Stylized Graphic Placeholder
    ctx.fillStyle = '#ECFDF5';
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, 16);
    ctx.fill();

    ctx.fillStyle = '#064E3B';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.category.toUpperCase(), width / 2, imgY + imgH / 2 - 15);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Custom Tailored Collection Design', width / 2, imgY + imgH / 2 + 25);
  }

  // Details Card
  const cardY = 690;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(50, cardY, 700, 210, 16);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(item.name, 80, cardY + 45);

  // Code Badge
  ctx.fillStyle = '#FEF3C7';
  ctx.beginPath();
  ctx.roundRect(80, cardY + 65, 140, 32, 6);
  ctx.fill();
  ctx.fillStyle = '#92400E';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`CODE: ${item.catalogCode}`, 150, cardY + 87);

  // Category Badge
  ctx.fillStyle = '#E0F2F1';
  ctx.beginPath();
  ctx.roundRect(230, cardY + 65, 140, 32, 6);
  ctx.fill();
  ctx.fillStyle = '#004D40';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(item.category, 300, cardY + 87);

  // Model Size
  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Model Size: ${item.modelSize}`, 80, cardY + 130);

  // Price
  ctx.textAlign = 'right';
  ctx.fillStyle = '#064E3B';
  ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${shop.currency} ${item.price.toFixed(2)}`, 720, cardY + 130);

  // Description
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const desc = item.description || 'Custom tailored to exact measurements with premium fabric & finishing.';
  ctx.fillText(desc.length > 70 ? desc.slice(0, 67) + '...' : desc, 80, cardY + 175);

  // Footer
  ctx.fillStyle = '#064E3B';
  ctx.fillRect(0, height - 70, width, 70);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`📞 WhatsApp & Orders: ${shop.phone}  |  📍 ${shop.address}`, width / 2, height - 30);

  return canvas.toDataURL('image/png', 1.0);
}
