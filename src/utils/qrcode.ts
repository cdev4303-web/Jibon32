import QRCode from 'qrcode';
import { Invoice, Shop, CatalogItem } from '../types';

/**
 * Builds standard verification payload text for an invoice QR code
 */
export function getInvoiceQrPayloadText(invoice: Invoice, shop: Shop): string {
  const paid = (invoice.netTotal - invoice.remainingDue).toFixed(2);
  const lines = [
    `--- ${shop.name.toUpperCase()} INVOICE ---`,
    `Invoice #: ${invoice.id}`,
    `Customer: ${invoice.customerName} (${invoice.customerPhone})`,
    `Dress Type: ${invoice.dressType}`,
    `Order Date: ${invoice.orderDate}`,
    `Delivery Date: ${invoice.deliveryDate}`,
    `Total Amount: ${shop.currency} ${invoice.netTotal}`,
    `Paid Amount: ${shop.currency} ${paid}`,
    `Remaining Due: ${shop.currency} ${invoice.remainingDue}`,
    `Status: ${invoice.orderStatus}`,
    `C.R. No: ${shop.crNumber}`,
    `Shop Phone: ${shop.phone}`,
  ];
  return lines.join('\n');
}

/**
 * Generates a high-quality Data URI string for an invoice QR code
 */
export async function generateInvoiceQrDataUrl(
  invoice: Invoice,
  shop: Shop,
  options?: { size?: number; darkColor?: string; lightColor?: string }
): Promise<string> {
  const text = getInvoiceQrPayloadText(invoice, shop);
  try {
    return await QRCode.toDataURL(text, {
      width: options?.size || 250,
      margin: 1,
      color: {
        dark: options?.darkColor || '#064E3B',
        light: options?.lightColor || '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.warn('Failed to generate invoice QR data URL:', err);
    return '';
  }
}

/**
 * Generates QR code for a dress catalog item
 */
export async function generateCatalogItemQrDataUrl(
  item: CatalogItem,
  shop: Shop
): Promise<string> {
  const text = [
    `--- ${shop.name.toUpperCase()} CATALOG ---`,
    `Dress: ${item.name}`,
    `Category: ${item.category}`,
    `Making Charge: ${shop.currency} ${item.price}`,
    `Code: ${item.catalogCode || item.id}`,
    `Contact: ${shop.phone}`,
  ].join('\n');

  try {
    return await QRCode.toDataURL(text, {
      width: 250,
      margin: 1,
      color: {
        dark: '#1E1B4B',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.warn('Failed to generate catalog QR code:', err);
    return '';
  }
}
