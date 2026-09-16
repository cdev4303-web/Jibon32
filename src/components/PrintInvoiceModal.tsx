import React, { useState, useEffect } from 'react';
import { Invoice, Shop, Language } from '../types';
import { Printer, X, Image as ImageIcon, Send, MessageSquareText, QrCode, FileDown, Download, Loader2, Share2 } from 'lucide-react';
import { InvoiceImageModal } from './InvoiceImageModal';
import { Logo } from './Logo';
import { openWhatsAppUrl, createInvoiceWhatsAppMessage, createReadyWhatsAppMessage, shareInvoicePngOnly } from '../utils/whatsapp';
import { generateInvoiceQrDataUrl } from '../utils/qrcode';
import { printHtmlElement, exportElementToPdf } from '../utils/print';
import { captureElementToPng } from '../utils/domCapture';
import { downloadImageFromUri, generateInvoiceImageUriAsync } from '../utils/invoiceImage';

interface PrintInvoiceModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  shop: Shop;
  lang?: Language;
  onClose: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  isOpen,
  invoice,
  shop,
  lang = 'BN',
  onClose,
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isReadyMode, setIsReadyMode] = useState(false);
  const [qrUri, setQrUri] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [isSharingPng, setIsSharingPng] = useState(false);

  useEffect(() => {
    if (invoice && isOpen) {
      generateInvoiceQrDataUrl(invoice, shop, { size: 140, darkColor: '#064E3B' })
        .then((uri) => setQrUri(uri))
        .catch((e) => console.warn(e));
    }
  }, [invoice, shop, isOpen]);

  if (!isOpen || !invoice) return null;

  const pdfFilename = `Invoice_${invoice.id}_${invoice.customerName.replace(/\s+/g, '_')}.pdf`;
  const pngFilename = `Invoice_${invoice.id}_${invoice.customerName.replace(/\s+/g, '_')}.png`;

  const handlePrint = () => {
    printHtmlElement('printable-area', `Invoice #${invoice.id} - ${shop.name}`);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await exportElementToPdf('printable-area', {
        filename: pdfFilename,
        title: `Invoice #${invoice.id} - ${shop.name}`,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPng = async () => {
    try {
      setIsGeneratingPng(true);
      let dataUri: string | null = null;
      try {
        dataUri = await captureElementToPng('printable-area', {
          pixelRatio: 2.0,
          backgroundColor: '#ffffff',
        });
      } catch (domErr) {
        console.warn('DOM capture error, falling back to canvas renderer:', domErr);
      }

      // If DOM capture returned an empty or invalid image, fall back to the canvas template
      if (!dataUri || !dataUri.startsWith('data:image/png') || dataUri.length < 2500) {
        dataUri = await generateInvoiceImageUriAsync(invoice, shop, (lang as 'EN' | 'BN') || 'BN');
      }

      downloadImageFromUri(dataUri, pngFilename);
    } catch (err) {
      console.error('Failed to download invoice PNG:', err);
    } finally {
      setIsGeneratingPng(false);
    }
  };

  const handleSharePngDirect = async () => {
    try {
      setIsSharingPng(true);
      let dataUri: string | null = null;
      try {
        dataUri = await captureElementToPng('printable-area', {
          pixelRatio: 2.0,
          backgroundColor: '#ffffff',
        });
      } catch (domErr) {
        console.warn('DOM capture error, falling back to canvas renderer:', domErr);
      }

      if (!dataUri || !dataUri.startsWith('data:image/png') || dataUri.length < 2500) {
        dataUri = await generateInvoiceImageUriAsync(invoice, shop, (lang as 'EN' | 'BN') || 'BN');
      }

      if (dataUri) {
        await shareInvoicePngOnly(invoice, dataUri);
      }
    } catch (err) {
      console.error('Failed to share invoice PNG:', err);
    } finally {
      setIsSharingPng(false);
    }
  };

  const m = invoice.measurement;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm print:p-0 print:bg-white">
        <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl print:max-h-none print:w-full print:shadow-none print:rounded-none">
          {/* Modal Action Bar (hidden in print) with Unique Color Buttons */}
          <div className="border-b border-slate-200 bg-slate-900 px-4 sm:px-6 py-3.5 text-white print:hidden">
            {/* Top Row: Title + Close Button */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Printer className="h-5 w-5 text-emerald-400 shrink-0" />
                <span className="font-bold text-xs sm:text-sm truncate">
                  {lang === 'EN'
                    ? `Invoice Receipt #${invoice.id} Print Preview`
                    : `ইনভয়েস রশিদ #${invoice.id} প্রিন্ট প্রিভিউ`}
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition shrink-0"
                title={lang === 'EN' ? 'Close' : 'বন্ধ করুন'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Action Buttons Row: Prominent Print Button first, followed by HD PNG and A4 PDF */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Print Button - Royal Indigo (Always visible, first button!) */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition active:scale-95"
                title={lang === 'EN' ? 'Print or Save via Browser Dialog' : 'সরাসরি প্রিন্ট বা ডায়ালগ বক্স'}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{lang === 'EN' ? 'Print' : 'প্রিন্ট'}</span>
              </button>

              {/* Direct HD PNG Image Download Button - Sky Blue */}
              <button
                onClick={handleDownloadPng}
                disabled={isGeneratingPng}
                className="flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md transition active:scale-95 disabled:opacity-50"
                title={lang === 'EN' ? 'Download High-Resolution PNG Image' : 'হাই-রেজোলিউশন PNG ছবি ডাউনলোড'}
              >
                {isGeneratingPng ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>{isGeneratingPng ? (lang === 'EN' ? 'Saving...' : 'সেভ হচ্ছে...') : (lang === 'EN' ? 'Download PNG' : 'PNG ডাউনলোড')}</span>
              </button>

              {/* Direct A4 PDF Download Button - Amber */}
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md transition active:scale-95 disabled:opacity-50"
                title={lang === 'EN' ? 'Download A4 PDF Document' : 'A4 PDF ফাইল ডাউনলোড'}
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                <span>{isGeneratingPdf ? (lang === 'EN' ? 'Creating...' : 'তৈরি হচ্ছে...') : (lang === 'EN' ? 'Download PDF' : 'PDF ডাউনলোড')}</span>
              </button>

              {/* Share PNG Button - Direct share pure PNG to all platforms (Zero text) */}
              <button
                onClick={handleSharePngDirect}
                disabled={isSharingPng}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50"
                title={lang === 'EN' ? 'Share pure PNG to any app (WhatsApp, Messenger, Bluetooth, etc.)' : 'সব অ্যাপে শুধু PNG ছবি শেয়ার করুন (লিখা ছাড়া)'}
              >
                {isSharingPng ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
                <span>{isSharingPng ? (lang === 'EN' ? 'Sharing...' : 'শেয়ার হচ্ছে...') : (lang === 'EN' ? 'Share PNG' : 'শেয়ার PNG')}</span>
              </button>

              {/* Ready Alert Button - Vibrant Teal */}
              {invoice.orderStatus === 'Ready for Pickup' && (
                <button
                  onClick={() => {
                    const msg = createReadyWhatsAppMessage(invoice, shop, (lang as 'EN' | 'BN') || 'BN');
                    openWhatsAppUrl(invoice.customerPhone, msg);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition active:scale-95"
                >
                  <MessageSquareText className="h-3.5 w-3.5" />
                  <span>{lang === 'EN' ? 'Ready Alert' : 'কাপড় রেডি মেসেজ'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Printable Sheet */}
          <div className="overflow-y-auto p-6 sm:p-8 text-slate-800 print:overflow-visible print:p-0 print-invoice" id="printable-area">
            {/* Header: Signature Emerald Green Letterhead Banner */}
            <div
              className="rounded-2xl bg-[#064e3b] p-4 sm:p-5 text-white flex items-center justify-between gap-4 border-b-4 border-amber-400 print-invoice-header-emerald print-section-header print-avoid-break shadow-md print:rounded-none"
              style={{
                backgroundColor: '#064e3b',
                background: '#064e3b',
                backgroundImage: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #064e3b 100%)',
                boxShadow: 'inset 0 0 0 1000px #064e3b',
                color: '#ffffff',
                border: '2px solid #064e3b',
                borderBottom: '4px solid #f59e0b',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div className="flex items-center gap-3.5">
                <Logo size="lg" />
                <div className="text-left text-white">
                  <h1
                    className="text-2xl sm:text-3xl font-black tracking-wide text-white leading-tight uppercase drop-shadow-xs"
                    style={{
                      color: '#ffffff',
                      WebkitTextFillColor: '#ffffff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  >
                    {shop.name}
                  </h1>
                  <p
                    className="text-xs text-emerald-100 mt-1 leading-normal font-medium"
                    style={{
                      color: '#d1fae5',
                      WebkitTextFillColor: '#d1fae5',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  >
                    {shop.address} | Tel: {shop.phone}
                  </p>
                  <p
                    className="text-[11px] font-bold text-amber-200 mt-1 leading-normal tracking-wide"
                    style={{
                      color: '#fde68a',
                      WebkitTextFillColor: '#fde68a',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  >
                    Commercial Registration (CR): {shop.crNumber}
                  </p>
                </div>
              </div>
              {qrUri && (
                <div
                  className="text-center shrink-0 border border-emerald-700/50 rounded-xl p-2 bg-white text-slate-900 print-avoid-break shadow-sm"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <img src={qrUri} alt="Invoice QR" className="h-16 w-16 mx-auto object-contain" />
                  <span
                    className="text-[8px] font-black text-emerald-950 block mt-1 uppercase tracking-wider"
                    style={{ color: '#064e3b' }}
                  >
                    Scan to Verify
                  </span>
                </div>
              )}
            </div>

            {/* Meta Info Grid */}
            <div className="mt-3.5 grid grid-cols-2 gap-3.5 text-xs print-section-meta print-avoid-break">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-emerald-900 uppercase text-[10px] block mb-1">Customer Details:</span>
                <p className="font-bold text-sm text-slate-900 leading-snug">{invoice.customerName}</p>
                <p className="text-slate-700 mt-1 leading-normal">Phone: {invoice.customerPhone}</p>
                {invoice.customerAddress && <p className="text-slate-600 mt-0.5 leading-normal">Address: {invoice.customerAddress}</p>}
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-right">
                <span className="font-bold text-emerald-900 uppercase text-[10px] block mb-1">Order Information:</span>
                <p className="font-black text-sm text-slate-900 leading-snug">INVOICE #{invoice.id}</p>
                <p className="text-slate-700 mt-1 leading-normal">Date: {invoice.orderDate}</p>
                <p className="font-bold text-emerald-800 mt-0.5 leading-normal">Delivery: {invoice.deliveryDate}</p>
                <p className="text-slate-600 mt-0.5 leading-normal">Dress: {invoice.dressType} ({invoice.orderStatus})</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="mt-4 w-full border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-800 text-white">
                  <th className="py-2 px-3 text-center w-10">#</th>
                  <th className="py-2 px-3 text-left">Item Description</th>
                  <th className="py-2 px-3 text-center w-14">Qty</th>
                  <th className="py-2 px-3 text-right w-24">Rate ({shop.currency})</th>
                  <th className="py-2 px-3 text-right w-28">Total ({shop.currency})</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-200 print-avoid-break">
                      <td className="py-2 px-3 text-center text-slate-500">{index + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{item.description}</td>
                      <td className="py-2 px-3 text-center font-bold">{item.quantity}</td>
                      <td className="py-2 px-3 text-right">{item.unitPrice.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{item.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-slate-200 print-avoid-break">
                    <td className="py-2 px-3 text-center">1</td>
                    <td className="py-2 px-3 font-medium">Custom Tailoring Work ({invoice.dressType})</td>
                    <td className="py-2 px-3 text-center font-bold">1</td>
                    <td className="py-2 px-3 text-right">{invoice.subtotal.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-bold">{invoice.subtotal.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Sizing & Totals Split */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              {/* Measurement Snapshot (Blue Accent) */}
              <div className="text-xs print-card-measurement print-avoid-break">
                {m ? (
                  <div className="rounded-xl border-2 border-blue-200 p-3 bg-blue-50/60 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-blue-200 pb-1.5 mb-2">
                      <span className="font-bold text-blue-950 uppercase text-[10px]">
                        {lang === 'EN' ? 'Measurements' : 'মাপের বিবরণ'} ({m.unit || 'inches'})
                      </span>
                      {m.profileName && (
                        <span className="rounded bg-blue-200 px-1.5 py-0.5 text-[9px] font-bold text-blue-900">
                          {m.profileName}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] leading-normal">
                      <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Length: ' : 'লম্বা: '}</span><span className="font-black text-blue-950">{m.length}"</span></div>
                      <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Chest: ' : 'বডি: '}</span><span className="font-black text-blue-950">{m.bodyChest}"</span></div>
                      <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Waist: ' : 'কোমর: '}</span><span className="font-black text-blue-950">{m.waist}"</span></div>
                      <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Hip: ' : 'হিপ: '}</span><span className="font-black text-blue-950">{m.hip}"</span></div>
                      <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Shoulder: ' : 'কাঁধ: '}</span><span className="font-black text-blue-950">{m.shoulder}"</span></div>
                      <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Sleeve: ' : 'হাতা: '}</span><span className="font-black text-blue-950">{m.sleeve}"</span></div>
                      <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Neck: ' : 'গলা: '}</span><span className="font-black text-blue-950">{m.neck}"</span></div>
                      <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Flare: ' : 'ঘের: '}</span><span className="font-black text-blue-950">{m.flareBottom}"</span></div>
                      {m.cuff ? <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Cuff: ' : 'কাফ: '}</span><span className="font-black text-blue-950">{m.cuff}"</span></div> : null}
                      {m.thigh ? <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Thigh: ' : 'রান: '}</span><span className="font-black text-blue-950">{m.thigh}"</span></div> : null}
                      {m.bottom ? <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Bottom: ' : 'বটম: '}</span><span className="font-black text-blue-950">{m.bottom}"</span></div> : null}
                      {m.inseam ? <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Inseam: ' : 'হাই: '}</span><span className="font-black text-blue-950">{m.inseam}"</span></div> : null}
                      {m.collar ? <div><span className="text-blue-700 font-semibold">{lang === 'EN' ? 'Collar: ' : 'কলার: '}</span><span className="font-black text-blue-950">{m.collar}</span></div> : null}
                      {m.customFields && m.customFields.map((cf) => (
                        <div key={cf.id}><span className="text-blue-700 font-semibold">{cf.name}: </span><span className="font-black text-blue-950">{cf.value}</span></div>
                      ))}
                    </div>
                    {m.designNotes && <p className="mt-2 text-[10px] text-blue-900 border-t border-blue-200 pt-1.5 italic leading-normal"><strong>{lang === 'EN' ? 'Notes: ' : 'নোট: '}</strong>{m.designNotes}</p>}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-3.5 text-slate-400 text-center">
                    {lang === 'EN' ? 'Standard measurements applied' : 'স্ট্যান্ডার্ড মাপ প্রযোজ্য'}
                  </div>
                )}
              </div>

              {/* Financials Summary - SOLID TABULAR STRUCTURE (NEVER OVERLAPS) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs print-card-financials print-avoid-break">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="py-1 text-left text-slate-600 font-medium">Subtotal:</td>
                      <td className="py-1 text-right font-semibold text-slate-900">{shop.currency} {invoice.subtotal.toFixed(2)}</td>
                    </tr>
                    {invoice.discount > 0 && (
                      <tr>
                        <td className="py-1 text-left text-emerald-700 font-medium">Discount:</td>
                        <td className="py-1 text-right text-emerald-700 font-semibold">-{shop.currency} {invoice.discount.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="border-t border-slate-300">
                      <td className="pt-2 pb-1 text-left font-bold text-sm text-emerald-950">Net Total:</td>
                      <td className="pt-2 pb-1 text-right font-black text-sm text-emerald-950">{shop.currency} {invoice.netTotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-left text-slate-700 font-medium">Advance Paid ({invoice.paymentMethod}):</td>
                      <td className="py-1 text-right font-bold text-slate-800">{shop.currency} {invoice.advanceDeposit.toFixed(2)}</td>
                    </tr>
                    <tr className="border-t border-dashed border-slate-300">
                      <td className="pt-2 pb-1 text-left font-black text-sm text-rose-600">Remaining Due:</td>
                      <td className="pt-2 pb-1 text-right font-black text-sm text-rose-600">{shop.currency} {invoice.remainingDue.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attached Photos (Fabric / Design / Sketch / Extra) */}
            {(invoice.clothPhotoUri || invoice.dressDesignPhotoUri || invoice.customerDesignPhotoUri || invoice.extraPhotoUri) && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3 print-section-photos print-avoid-break">
                <span className="font-bold text-emerald-900 uppercase text-[10px] block mb-2">
                  Attached Photos & Designs
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
                  {invoice.clothPhotoUri && (
                    <div className="text-center print-photo-item print-avoid-break">
                      <img
                        src={invoice.clothPhotoUri}
                        alt="Cloth Fabric"
                        crossOrigin="anonymous"
                        className="h-28 w-full object-contain rounded border border-slate-300 bg-white"
                      />
                      <span className="text-[10px] font-semibold text-slate-700 block mt-1">Cloth Fabric</span>
                    </div>
                  )}
                  {invoice.dressDesignPhotoUri && (
                    <div className="text-center print-photo-item print-avoid-break">
                      <img
                        src={invoice.dressDesignPhotoUri}
                        alt="Dress Design"
                        crossOrigin="anonymous"
                        className="h-28 w-full object-contain rounded border border-slate-300 bg-white"
                      />
                      <span className="text-[10px] font-semibold text-slate-700 block mt-1">Dress Model</span>
                    </div>
                  )}
                  {invoice.customerDesignPhotoUri && (
                    <div className="text-center print-photo-item print-avoid-break">
                      <img
                        src={invoice.customerDesignPhotoUri}
                        alt="Customer Sketch"
                        crossOrigin="anonymous"
                        className="h-28 w-full object-contain rounded border border-slate-300 bg-white"
                      />
                      <span className="text-[10px] font-semibold text-slate-700 block mt-1">Customer Sketch</span>
                    </div>
                  )}
                  {invoice.extraPhotoUri && (
                    <div className="text-center print-photo-item print-avoid-break">
                      <img
                        src={invoice.extraPhotoUri}
                        alt="Extra Reference"
                        crossOrigin="anonymous"
                        className="h-28 w-full object-contain rounded border border-slate-300 bg-white"
                      />
                      <span className="text-[10px] font-semibold text-slate-700 block mt-1">Extra Reference</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Terms */}
            <div className="mt-6 border-t border-slate-200 pt-3.5 text-center text-[10px] text-slate-500 print-section-footer print-avoid-break">
              <p className="leading-normal mb-1">1. Please present this invoice receipt at the time of dress delivery/collection.</p>
              <p className="font-bold text-emerald-900 leading-normal">Thank you for your business with {shop.name}!</p>
            </div>
          </div>

          {/* Bottom Action Buttons Bar (Two Lines Layout) - Print Hidden */}
          <div className="border-t border-slate-200 bg-slate-900 p-4 print:hidden space-y-2.5">
            {/* Line 1: Primary Print & WhatsApp Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 px-3 text-xs font-bold text-white shadow-md transition active:scale-95 border border-indigo-400"
                title={lang === 'EN' ? 'Print or Save via Browser Dialog' : 'সরাসরি প্রিন্ট করুন'}
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>{lang === 'EN' ? 'Print Slip' : 'রসিদ প্রিন্ট করুন'}</span>
              </button>

              {invoice.orderStatus === 'Ready for Pickup' ? (
                <button
                  onClick={() => {
                    const msg = createReadyWhatsAppMessage(invoice, shop, (lang as 'EN' | 'BN') || 'BN');
                    openWhatsAppUrl(invoice.customerPhone, msg);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 py-2.5 px-3 text-xs font-black text-slate-950 shadow-md transition active:scale-95 border border-teal-300"
                  title={lang === 'EN' ? 'Send Ready alert to customer' : 'কাস্টমারকে কাপড় রেডি মেসেজ পাঠান'}
                >
                  <MessageSquareText className="h-4 w-4 shrink-0" />
                  <span>{lang === 'EN' ? 'Ready Alert WhatsApp' : 'কাপড় রেডি মেসেজ'}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsReadyMode(false);
                    setIsImageModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 px-3 text-xs font-bold text-white shadow-md transition active:scale-95 border border-emerald-400"
                >
                  <ImageIcon className="h-4 w-4 shrink-0" />
                  <span>{lang === 'EN' ? 'WhatsApp Image' : 'WhatsApp PNG'}</span>
                </button>
              )}

              <button
                onClick={handleSharePngDirect}
                disabled={isSharingPng}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 px-3 text-xs font-bold text-white shadow-md transition active:scale-95 border border-emerald-400 disabled:opacity-50"
                title={lang === 'EN' ? 'Share pure PNG to any app (zero text)' : 'সব অ্যাপে শুধু PNG ছবি শেয়ার করুন (লিখা ছাড়া)'}
              >
                {isSharingPng ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <Share2 className="h-4 w-4 shrink-0" />
                )}
                <span>{isSharingPng ? (lang === 'EN' ? 'Sharing...' : 'শেয়ার হচ্ছে...') : (lang === 'EN' ? 'Share PNG' : 'ইনভয়েস শেয়ার (PNG)')}</span>
              </button>
            </div>

            {/* Line 2: Download HD PNG, A4 PDF & Close */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleDownloadPng}
                disabled={isGeneratingPng}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 py-2 px-3 text-xs font-black text-slate-950 shadow-md transition active:scale-95 disabled:opacity-50 border border-sky-300"
                title={lang === 'EN' ? 'Download High-Resolution PNG Image' : 'PNG ছবি ডাউনলোড'}
              >
                {isGeneratingPng ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span className="truncate">{isGeneratingPng ? (lang === 'EN' ? 'Saving...' : 'সেভ হচ্ছে...') : (lang === 'EN' ? 'Download PNG' : 'PNG ডাউনলোড')}</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 py-2 px-3 text-xs font-black text-slate-950 shadow-md transition active:scale-95 disabled:opacity-50 border border-amber-300"
                title={lang === 'EN' ? 'Download A4 PDF Document' : 'A4 PDF ডাউনলোড'}
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                <span className="truncate">{isGeneratingPdf ? (lang === 'EN' ? 'Creating...' : 'তৈরি হচ্ছে...') : (lang === 'EN' ? 'Download PDF' : 'PDF ডাউনলোড')}</span>
              </button>

              <button
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 py-2 px-3 text-xs font-bold text-slate-300 hover:text-white transition active:scale-95 border border-slate-700"
              >
                <X className="h-3.5 w-3.5" />
                <span>{lang === 'EN' ? 'Close' : 'বন্ধ করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <InvoiceImageModal
        isOpen={isImageModalOpen}
        invoice={invoice}
        shop={shop}
        lang={lang}
        isReadyMode={isReadyMode}
        onClose={() => setIsImageModalOpen(false)}
      />
    </>
  );
};
