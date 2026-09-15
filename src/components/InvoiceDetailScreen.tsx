import React, { useState, useRef } from 'react';
import { Invoice, Shop, Language } from '../types';
import { strings } from '../utils/strings';
import { openWhatsAppUrl, createInvoiceWhatsAppMessage, createReadyWhatsAppMessage, shareInvoicePngToWhatsApp } from '../utils/whatsapp';
import { generateInvoiceImageUriAsync, downloadImageFromUri } from '../utils/invoiceImage';
import { generateInvoiceQrDataUrl } from '../utils/qrcode';
import { InvoiceImageModal } from './InvoiceImageModal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { Logo } from './Logo';
import {
  ArrowLeft,
  Printer,
  Share2,
  DollarSign,
  Edit2,
  Trash2,
  Phone,
  Ruler,
  Image as ImageIcon,
  ZoomIn,
  X,
  Download,
  Camera,
  Upload,
  MessageSquareText,
  CheckCircle2,
  Sparkles,
  QrCode,
  Loader2,
  ChevronDown,
} from 'lucide-react';

interface InvoiceDetailScreenProps {
  invoice: Invoice | null;
  shop: Shop;
  lang: Language;
  onBack: () => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onOpenPaymentModal: (invoice: Invoice) => void;
  onOpenPrintModal: (invoice: Invoice) => void;
  onUpdateStatus: (invoiceId: string, newStatus: Invoice['orderStatus']) => void;
  onUpdateInvoice?: (invoice: Invoice) => void;
}

export const InvoiceDetailScreen: React.FC<InvoiceDetailScreenProps> = ({
  invoice,
  shop,
  lang,
  onBack,
  onEdit,
  onDelete,
  onOpenPaymentModal,
  onOpenPrintModal,
  onUpdateStatus,
  onUpdateInvoice,
}) => {
  const t = strings[lang] || strings.BN;
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isReadyMode, setIsReadyMode] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ uri: string; label: string } | null>(null);

  // Direct WhatsApp sending state
  const [sendingWhatsAppPng, setSendingWhatsAppPng] = useState(false);

  // Camera & File upload state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activePhotoSlot, setActivePhotoSlot] = useState<1 | 2 | 3 | 4>(1);
  const clothFileInputRef = useRef<HTMLInputElement | null>(null);
  const dressFileInputRef = useRef<HTMLInputElement | null>(null);
  const sketchFileInputRef = useRef<HTMLInputElement | null>(null);
  const extraFileInputRef = useRef<HTMLInputElement | null>(null);

  // QR Code Modal state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeUri, setQrCodeUri] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);

  const handleOpenQrModal = async () => {
    setIsQrModalOpen(true);
    if (!qrCodeUri && invoice) {
      setQrLoading(true);
      const uri = await generateInvoiceQrDataUrl(invoice, shop, { size: 320 });
      setQrCodeUri(uri);
      setQrLoading(false);
    }
  };

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-slate-500 font-medium">ইনভয়েস পাওয়া যায়নি।</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
        >
          ড্যাশবোর্ডে ফিরুন
        </button>
      </div>
    );
  }

  // 1. Ready Notification: Text-only message directly to customer's WhatsApp (no photo)
  const handleSendReadyWhatsApp = () => {
    const msg = createReadyWhatsAppMessage(invoice, shop, lang);
    openWhatsAppUrl(invoice.customerPhone, msg);
  };

  // 2. Invoice Send: Prepares PNG image and sends directly to customer's WhatsApp
  const handleSendInvoicePng = async () => {
    setSendingWhatsAppPng(true);
    try {
      const uri = await generateInvoiceImageUriAsync(invoice, shop, lang);
      if (uri) {
        await shareInvoicePngToWhatsApp(invoice, shop, uri, false, lang);
      }
    } catch (e) {
      console.warn(e);
      const msg = createInvoiceWhatsAppMessage(invoice, shop, lang);
      openWhatsAppUrl(invoice.customerPhone, msg);
    } finally {
      setSendingWhatsAppPng(false);
    }
  };

  const handlePhotoCaptured = (uri: string) => {
    if (!invoice) return;
    const updated = { ...invoice };
    if (activePhotoSlot === 1) updated.clothPhotoUri = uri;
    if (activePhotoSlot === 2) updated.dressDesignPhotoUri = uri;
    if (activePhotoSlot === 3) updated.customerDesignPhotoUri = uri;
    if (activePhotoSlot === 4) updated.extraPhotoUri = uri;
    updated.updatedAt = Date.now();
    if (onUpdateInvoice) {
      onUpdateInvoice(updated);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2 | 3 | 4) => {
    const file = e.target.files?.[0];
    if (file && invoice) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const uri = event.target?.result as string;
        if (uri) {
          const updated = { ...invoice };
          if (slot === 1) updated.clothPhotoUri = uri;
          if (slot === 2) updated.dressDesignPhotoUri = uri;
          if (slot === 3) updated.customerDesignPhotoUri = uri;
          if (slot === 4) updated.extraPhotoUri = uri;
          updated.updatedAt = Date.now();
          if (onUpdateInvoice) {
            onUpdateInvoice(updated);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (slot: 1 | 2 | 3 | 4) => {
    if (!invoice) return;
    const updated = { ...invoice };
    if (slot === 1) updated.clothPhotoUri = undefined;
    if (slot === 2) updated.dressDesignPhotoUri = undefined;
    if (slot === 3) updated.customerDesignPhotoUri = undefined;
    if (slot === 4) updated.extraPhotoUri = undefined;
    updated.updatedAt = Date.now();
    if (onUpdateInvoice) {
      onUpdateInvoice(updated);
    }
  };

  const openCamera = (slot: 1 | 2 | 3 | 4) => {
    setActivePhotoSlot(slot);
    setIsCameraOpen(true);
  };

  const getStatusBadge = (status: Invoice['orderStatus']) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Ready for Pickup':
        return 'bg-teal-100 text-teal-900 border-teal-300 ring-2 ring-teal-400';
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-900 border-slate-300';
    }
  };

  const m = invoice.measurement;

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto relative">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-800 transition active:scale-95 shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4 text-slate-700" />
          {lang === 'EN' ? 'Back' : 'পেছনে যান'}
        </button>
        <div className="flex items-center gap-2">
          {/* Top QR Code Button */}
          <button
            onClick={handleOpenQrModal}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-2 text-xs font-bold text-white transition active:scale-95 shadow-xs"
            title={lang === 'EN' ? 'View Invoice QR Code' : 'ইনভয়েস QR কোড দেখুন'}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>{lang === 'EN' ? 'QR Code' : 'QR কোড'}</span>
          </button>
          <button
            onClick={() => onEdit(invoice)}
            className="flex items-center gap-1 rounded-xl bg-purple-600 hover:bg-purple-500 px-3 py-2 text-xs font-bold text-white transition active:scale-95 shadow-xs"
          >
            <Edit2 className="h-3.5 w-3.5" />
            {t.edit}
          </button>
          <button
            onClick={() => onDelete(invoice)}
            className="flex items-center gap-1 rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-2 text-xs font-bold text-white transition active:scale-95 shadow-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t.delete}
          </button>
        </div>
      </div>

      {/* Ready Alert Prompt Banner (If order status is Ready) */}
      {invoice.orderStatus === 'Ready for Pickup' && (
        <div className="rounded-2xl bg-teal-50 border-2 border-teal-500 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5 text-teal-950">
            <div className="rounded-full bg-teal-600 p-2 text-white shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-teal-950">
                {lang === 'EN'
                  ? 'Dress tailoring completed & ready! 👗✨'
                  : 'পোশাক সেলাই সম্পন্ন ও সম্পূর্ণ রেডি! 👗✨'}
              </p>
              <p className="text-xs text-teal-800 mt-0.5">
                {lang === 'EN' ? (
                  <>
                    Send WhatsApp pickup notification to customer{' '}
                    <strong>{invoice.customerName}</strong>.
                  </>
                ) : (
                  <>
                    কাস্টমার <strong>{invoice.customerName}</strong>-কে WhatsApp-এ প্রস্তুত থাকার নোটিফিকেশন পাঠান।
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendReadyWhatsApp}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black px-3.5 py-2 text-xs shadow-md transition active:scale-95 whitespace-nowrap"
              title={lang === 'EN' ? 'Send Ready Notification to Customer WhatsApp' : 'কাস্টমারের হোয়াটসঅ্যাপে সরাসরি কাপড় রেডি মেসেজ পাঠান'}
            >
              <MessageSquareText className="h-4 w-4" />
              <span>
                {lang === 'EN'
                  ? 'Send Ready WhatsApp'
                  : 'কাপড় রেডি WhatsApp'}
              </span>
            </button>
            <a
              href="#invoice-bottom-actions"
              className="flex items-center justify-center gap-1 rounded-xl bg-teal-100 hover:bg-teal-200 text-teal-900 font-bold px-3 py-2 text-xs transition active:scale-95 whitespace-nowrap"
              title={lang === 'EN' ? 'Scroll down to all action buttons' : 'নিচের সকল অ্যাকশন বাটন দেখুন'}
            >
              <ChevronDown className="h-3.5 w-3.5" />
              <span>{lang === 'EN' ? 'Buttons Below' : 'নিচের বাটন'}</span>
            </a>
          </div>
        </div>
      )}

      {/* Main Invoice Header Card */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Logo size="lg" className="shrink-0" />
            <div>
              <span className="inline-block rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold text-emerald-300 border border-white/10">
                {shop.name}
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white mt-1">
                INVOICE #{invoice.id}
              </h1>
              <p className="text-xs text-slate-300">
                {lang === 'EN' ? 'Order Date: ' : 'অর্ডারের তারিখ: '}
                {invoice.orderDate} • {lang === 'EN' ? 'Delivery: ' : 'ডেলিভারি: '}
                <span className="font-bold text-amber-300">{invoice.deliveryDate}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadge(
                invoice.orderStatus
              )}`}
            >
              ● {invoice.orderStatus}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-slate-300 font-semibold">
                {lang === 'EN' ? 'Change Status:' : 'স্ট্যাটাস পরিবর্তন:'}
              </span>
              <select
                value={invoice.orderStatus}
                onChange={(e) => onUpdateStatus(invoice.id, e.target.value as Invoice['orderStatus'])}
                className="rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-white px-2 py-1 outline-none"
              >
                <option value="Pending">{lang === 'EN' ? 'Pending' : 'Pending (পেন্ডিং)'}</option>
                <option value="In Progress">
                  {lang === 'EN' ? 'In Progress' : 'In Progress (কাজ চলছে)'}
                </option>
                <option value="Ready for Pickup">
                  {lang === 'EN' ? 'Ready for Pickup' : 'Ready for Pickup (কাপড় রেডি)'}
                </option>
                <option value="Delivered">
                  {lang === 'EN' ? 'Delivered' : 'Delivered (ডেলিভারি সম্পন্ন)'}
                </option>
                <option value="Cancelled">{lang === 'EN' ? 'Cancelled' : 'Cancelled (বাতিল)'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Top Header Card Info Bar with Direct Link to Bottom Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/10 print:hidden text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>
              {lang === 'EN'
                ? 'Action buttons (Ready WhatsApp, PNG, Print, Payment) are located at the bottom of the invoice.'
                : 'কাপড় রেডি মেসেজ, WhatsApp PNG, প্রিন্ট ও পেমেন্ট বাটন ইনভয়েসের নিচে সাজানো রয়েছে।'}
            </span>
          </div>
          <a
            href="#invoice-bottom-actions"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-1.5 transition active:scale-95 shadow-md"
          >
            <span>{lang === 'EN' ? 'Action Buttons Below ↓' : 'নিচের বাটনসমূহ ↓'}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Customer & Garment Details Card */}
      <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-emerald-950 border-b border-slate-200 pb-2">
          {lang === 'EN' ? 'Customer & Garment Details' : 'কাস্টমার ও পোশাকের বিবরণ'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-700 font-bold">{lang === 'EN' ? 'Customer Name:' : 'কাস্টমারের নাম:'}</span>
            <p className="text-base font-black text-slate-950 mt-0.5">{invoice.customerName}</p>
          </div>
          <div>
            <span className="text-slate-700 font-bold">{lang === 'EN' ? 'Mobile Number (WhatsApp):' : 'মোবাইল নাম্বার (WhatsApp):'}</span>
            <p className="text-sm font-bold text-slate-950 mt-0.5 flex items-center gap-1">
              <Phone className="h-4 w-4 text-emerald-800" />
              {invoice.customerPhone}
            </p>
          </div>
          {invoice.customerAddress && (
            <div>
              <span className="text-slate-700 font-bold">{lang === 'EN' ? 'Address / Location:' : 'ঠিকানা / লোকেশন:'}</span>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{invoice.customerAddress}</p>
            </div>
          )}
          <div>
            <span className="text-slate-700 font-bold">{lang === 'EN' ? 'Dress Type:' : 'পোশাকের ধরন:'}</span>
            <p className="text-sm font-black text-emerald-950 mt-0.5">{invoice.dressType}</p>
          </div>
        </div>

        {invoice.notes && (
          <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-300 text-xs text-amber-950">
            <span className="font-black block mb-0.5">{lang === 'EN' ? 'Order Note & Special Instructions:' : 'অর্ডার নোট ও বিশেষ নির্দেশনা:'}</span>
            <p className="font-semibold">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Items Breakdown Table */}
      <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-xs space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-emerald-950 border-b border-slate-200 pb-2">
          {t.orderItems}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">{lang === 'EN' ? 'Work / Item Description' : 'কাজের বিবরণ'}</th>
                <th className="py-2.5 px-3 text-center">{lang === 'EN' ? 'Qty' : 'পরিমাণ'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'EN' ? `Rate (${shop.currency})` : `দর (${shop.currency})`}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'EN' ? `Total (${shop.currency})` : `মোট টাকা (${shop.currency})`}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-600 font-bold">{index + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-950">{item.description}</td>
                    <td className="py-2.5 px-3 text-center font-black text-slate-950">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-800">{item.unitPrice.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-950">{item.totalPrice.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-slate-200">
                  <td className="py-2.5 px-3 text-slate-600 font-bold">1</td>
                  <td className="py-2.5 px-3 font-bold text-slate-950">Custom Tailoring ({invoice.dressType})</td>
                  <td className="py-2.5 px-3 text-center font-black text-slate-950">1</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-800">{invoice.subtotal.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-950">{invoice.subtotal.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Totals Block */}
        <div className="mt-4 rounded-xl bg-slate-100/90 p-4 border border-slate-300 space-y-2 text-xs">
          <div className="flex justify-between text-slate-800 font-bold">
            <span>{lang === 'EN' ? 'Subtotal:' : 'সাবটোটাল:'}</span>
            <span className="font-black">{shop.currency} {invoice.subtotal.toFixed(2)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-emerald-800 font-bold">
              <span>{lang === 'EN' ? 'Discount:' : 'ডিসকাউন্ট:'}</span>
              <span className="font-black">-{shop.currency} {invoice.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-300 pt-2 text-sm font-black text-slate-950">
            <span>{t.netTotal}:</span>
            <span className="text-emerald-950">{shop.currency} {invoice.netTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-800 font-bold">
            <span>{lang === 'EN' ? `Advance Paid (${invoice.paymentMethod}):` : `অগ্রিম গ্রহণ (${invoice.paymentMethod}):`}</span>
            <span className="font-black text-emerald-800">{shop.currency} {invoice.advanceDeposit.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-slate-300 pt-2 text-sm font-black">
            <span className="text-slate-950">{t.remainingDue}:</span>
            <span className={invoice.remainingDue > 0 ? 'text-rose-700 font-black' : 'text-emerald-800 font-black'}>
              {shop.currency} {invoice.remainingDue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Attached Photos & Designs (Expanded 4-Slot Gallery with ID attributes) */}
      <div
        id="invoice-attached-photos-container"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
              <Camera className="h-4 w-4 text-emerald-600" />
              {t.attachPhotos} {lang === 'EN' ? '(Attached Photos & Samples)' : '(সংযুক্ত ছবি ও স্যাম্পল)'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'EN'
                ? 'Attach or update reference photos and fabric samples anytime via camera or gallery upload.'
                : 'ক্যামেরা বা ফাইল আপলোড দিয়ে ইনভয়েসে যেকোনো সময় নতুন ছবি যুক্ত বা পরিবর্তন করতে পারেন।'}
            </p>
          </div>
          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 font-semibold px-2.5 py-1 rounded-full">
            {[(invoice.clothPhotoUri ? 1 : 0), (invoice.dressDesignPhotoUri ? 1 : 0), (invoice.customerDesignPhotoUri ? 1 : 0), (invoice.extraPhotoUri ? 1 : 0)].reduce((a, b) => a + b, 0)}/4 {lang === 'EN' ? 'Photos' : 'ছবি'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Slot 1: Cloth Fabric */}
          <div
            id="invoice-photo-slot-cloth"
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">{t.clothPhoto}</span>
                {invoice.clothPhotoUri && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(1)}
                    className="text-[10px] text-rose-600 hover:underline font-semibold"
                  >
                    {lang === 'EN' ? 'Remove' : 'মুছুন'}
                  </button>
                )}
              </div>
              {invoice.clothPhotoUri ? (
                <div
                  onClick={() => setPreviewPhoto({ uri: invoice.clothPhotoUri!, label: t.clothPhoto })}
                  className="group relative h-40 w-full cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-black shadow-sm mb-2.5"
                >
                  <img
                    src={invoice.clothPhotoUri}
                    alt="Cloth Fabric"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                    <ZoomIn className="h-4 w-4" /> {lang === 'EN' ? 'View Large' : 'বড় দেখুন'}
                  </div>
                </div>
              ) : (
                <div className="h-40 w-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-400 text-xs mb-2.5 p-3 text-center">
                  <Camera className="h-6 w-6 text-slate-300 mb-1" />
                  <span>{lang === 'EN' ? 'No Photo' : 'ছবি নেই'}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => openCamera(1)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 active:scale-95 transition"
              >
                <Camera className="h-3.5 w-3.5" />
                {lang === 'EN' ? 'CAMERA' : 'ক্যামেরা'}
              </button>
              <button
                type="button"
                onClick={() => clothFileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                {lang === 'EN' ? 'GALLERY' : 'গ্যালারি'}
              </button>
            </div>
            <input
              type="file"
              ref={clothFileInputRef}
              onChange={(e) => handleFileSelected(e, 1)}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Slot 2: Dress Design */}
          <div
            id="invoice-photo-slot-design"
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">{t.dressDesignPhoto}</span>
                {invoice.dressDesignPhotoUri && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(2)}
                    className="text-[10px] text-rose-600 hover:underline font-semibold"
                  >
                    {lang === 'EN' ? 'Remove' : 'মুছুন'}
                  </button>
                )}
              </div>
              {invoice.dressDesignPhotoUri ? (
                <div
                  onClick={() => setPreviewPhoto({ uri: invoice.dressDesignPhotoUri!, label: t.dressDesignPhoto })}
                  className="group relative h-40 w-full cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-black shadow-sm mb-2.5"
                >
                  <img
                    src={invoice.dressDesignPhotoUri}
                    alt="Dress Design"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                    <ZoomIn className="h-4 w-4" /> {lang === 'EN' ? 'View Large' : 'বড় দেখুন'}
                  </div>
                </div>
              ) : (
                <div className="h-40 w-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-400 text-xs mb-2.5 p-3 text-center">
                  <Camera className="h-6 w-6 text-slate-300 mb-1" />
                  <span>{lang === 'EN' ? 'No Photo' : 'ছবি নেই'}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => openCamera(2)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 active:scale-95 transition"
              >
                <Camera className="h-3.5 w-3.5" />
                {lang === 'EN' ? 'CAMERA' : 'ক্যামেরা'}
              </button>
              <button
                type="button"
                onClick={() => dressFileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                {lang === 'EN' ? 'GALLERY' : 'গ্যালারি'}
              </button>
            </div>
            <input
              type="file"
              ref={dressFileInputRef}
              onChange={(e) => handleFileSelected(e, 2)}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Slot 3: Customer Sketch */}
          <div
            id="invoice-photo-slot-sketch"
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">{t.customerDesignPhoto}</span>
                {invoice.customerDesignPhotoUri && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(3)}
                    className="text-[10px] text-rose-600 hover:underline font-semibold"
                  >
                    {lang === 'EN' ? 'Remove' : 'মুছুন'}
                  </button>
                )}
              </div>
              {invoice.customerDesignPhotoUri ? (
                <div
                  onClick={() => setPreviewPhoto({ uri: invoice.customerDesignPhotoUri!, label: t.customerDesignPhoto })}
                  className="group relative h-40 w-full cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-black shadow-sm mb-2.5"
                >
                  <img
                    src={invoice.customerDesignPhotoUri}
                    alt="Customer Sketch"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                    <ZoomIn className="h-4 w-4" /> {lang === 'EN' ? 'View Large' : 'বড় দেখুন'}
                  </div>
                </div>
              ) : (
                <div className="h-40 w-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-400 text-xs mb-2.5 p-3 text-center">
                  <Camera className="h-6 w-6 text-slate-300 mb-1" />
                  <span>{lang === 'EN' ? 'No Photo' : 'ছবি নেই'}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => openCamera(3)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 active:scale-95 transition"
              >
                <Camera className="h-3.5 w-3.5" />
                {lang === 'EN' ? 'CAMERA' : 'ক্যামেরা'}
              </button>
              <button
                type="button"
                onClick={() => sketchFileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                {lang === 'EN' ? 'GALLERY' : 'গ্যালারি'}
              </button>
            </div>
            <input
              type="file"
              ref={sketchFileInputRef}
              onChange={(e) => handleFileSelected(e, 3)}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Slot 4: Extra Sample */}
          <div
            id="invoice-photo-slot-extra"
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">{t.extraPhoto}</span>
                {invoice.extraPhotoUri && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(4)}
                    className="text-[10px] text-rose-600 hover:underline font-semibold"
                  >
                    {lang === 'EN' ? 'Remove' : 'মুছুন'}
                  </button>
                )}
              </div>
              {invoice.extraPhotoUri ? (
                <div
                  onClick={() => setPreviewPhoto({ uri: invoice.extraPhotoUri!, label: t.extraPhoto })}
                  className="group relative h-40 w-full cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-black shadow-sm mb-2.5"
                >
                  <img
                    src={invoice.extraPhotoUri}
                    alt="Extra Sample"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                    <ZoomIn className="h-4 w-4" /> {lang === 'EN' ? 'View Large' : 'বড় দেখুন'}
                  </div>
                </div>
              ) : (
                <div className="h-40 w-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-400 text-xs mb-2.5 p-3 text-center">
                  <Camera className="h-6 w-6 text-slate-300 mb-1" />
                  <span>{lang === 'EN' ? 'No Photo' : 'ছবি নেই'}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => openCamera(4)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 active:scale-95 transition"
              >
                <Camera className="h-3.5 w-3.5" />
                {lang === 'EN' ? 'CAMERA' : 'ক্যামেরা'}
              </button>
              <button
                type="button"
                onClick={() => extraFileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                {lang === 'EN' ? 'GALLERY' : 'গ্যালারি'}
              </button>
            </div>
            <input
              type="file"
              ref={extraFileInputRef}
              onChange={(e) => handleFileSelected(e, 4)}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Measurements Card (Rich Blue theme styling) */}
      {m && (
        <div className="rounded-2xl border-2 border-blue-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <div className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-blue-950">
                  {t.measurements} ({m.unit || 'inches'})
                </h2>
                {m.profileName && (
                  <p className="text-xs font-bold text-blue-700">
                    {lang === 'EN' ? 'Profile: ' : 'প্রোফাইল: '}
                    <span className="text-blue-950 font-black">{m.profileName}</span>
                  </p>
                )}
              </div>
            </div>
            <span className="rounded-lg bg-blue-100 text-blue-950 font-black px-2.5 py-1 text-xs border border-blue-200">
              {m.dressType || invoice.dressType}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
              <span className="text-[11px] text-blue-700 font-bold block">{t.length}</span>
              <p className="text-lg font-black text-blue-950 mt-0.5">{m.length > 0 ? `${m.length}"` : '-'}</p>
            </div>
            <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
              <span className="text-[11px] text-blue-700 font-bold block">{t.bodyChest}</span>
              <p className="text-lg font-black text-blue-950 mt-0.5">{m.bodyChest > 0 ? `${m.bodyChest}"` : '-'}</p>
            </div>
            <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
              <span className="text-[11px] text-blue-700 font-bold block">{t.waist}</span>
              <p className="text-lg font-black text-blue-950 mt-0.5">{m.waist > 0 ? `${m.waist}"` : '-'}</p>
            </div>
            <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
              <span className="text-[11px] text-blue-700 font-bold block">{t.hip}</span>
              <p className="text-lg font-black text-blue-950 mt-0.5">{m.hip > 0 ? `${m.hip}"` : '-'}</p>
            </div>
            <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
              <span className="text-[11px] text-blue-700 font-bold block">{t.shoulder}</span>
              <p className="text-lg font-black text-blue-950 mt-0.5">{m.shoulder > 0 ? `${m.shoulder}"` : '-'}</p>
            </div>
            <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
              <span className="text-[11px] text-blue-700 font-bold block">{t.sleeve}</span>
              <p className="text-lg font-black text-blue-950 mt-0.5">{m.sleeve > 0 ? `${m.sleeve}"` : '-'}</p>
            </div>
            <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
              <span className="text-[11px] text-blue-700 font-bold block">{t.neck}</span>
              <p className="text-lg font-black text-blue-950 mt-0.5">{m.neck > 0 ? `${m.neck}"` : '-'}</p>
            </div>
            {m.cuff && m.cuff > 0 ? (
              <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
                <span className="text-[11px] text-blue-700 font-bold block">{lang === 'EN' ? 'Cuff / Mohori' : 'কাফ/মোহরী'}</span>
                <p className="text-lg font-black text-blue-950 mt-0.5">{m.cuff}"</p>
              </div>
            ) : null}
            {m.thigh && m.thigh > 0 ? (
              <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
                <span className="text-[11px] text-blue-700 font-bold block">{lang === 'EN' ? 'Thigh' : 'রান/থাই'}</span>
                <p className="text-lg font-black text-blue-950 mt-0.5">{m.thigh}"</p>
              </div>
            ) : null}
            {m.bottom && m.bottom > 0 ? (
              <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
                <span className="text-[11px] text-blue-700 font-bold block">{lang === 'EN' ? 'Bottom Opening' : 'পায়ের মোহরী'}</span>
                <p className="text-lg font-black text-blue-950 mt-0.5">{m.bottom}"</p>
              </div>
            ) : null}
            {m.inseam && m.inseam > 0 ? (
              <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
                <span className="text-[11px] text-blue-700 font-bold block">{lang === 'EN' ? 'Inseam / High' : 'ইনসিম/হাই'}</span>
                <p className="text-lg font-black text-blue-950 mt-0.5">{m.inseam}"</p>
              </div>
            ) : null}
            {m.flareBottom && m.flareBottom > 0 ? (
              <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
                <span className="text-[11px] text-blue-700 font-bold block">{t.flareBottom}</span>
                <p className="text-lg font-black text-blue-950 mt-0.5">{m.flareBottom}"</p>
              </div>
            ) : null}
            {m.collar ? (
              <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 shadow-2xs">
                <span className="text-[11px] text-blue-700 font-bold block">{lang === 'EN' ? 'Collar' : 'কলার'}</span>
                <p className="text-base font-black text-blue-950 mt-0.5">{m.collar}</p>
              </div>
            ) : null}
          </div>

          {/* Custom Fields if any */}
          {m.customFields && m.customFields.length > 0 && (
            <div className="bg-purple-50/60 rounded-xl border border-purple-200 p-3 text-xs space-y-1.5">
              <span className="font-black text-[11px] text-purple-900 uppercase">
                {lang === 'EN' ? 'Custom Tailoring Fields:' : 'কাস্টম পরিমাপ ফিল্ড:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {m.customFields.map((cf) => (
                  <span key={cf.id} className="rounded-lg bg-white px-2.5 py-1 font-bold text-purple-950 border border-purple-200 shadow-2xs">
                    {cf.name}: <span className="font-black">{cf.value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {m.designNotes && (
            <div className="text-xs text-blue-900 bg-blue-50/60 p-3 rounded-xl border border-blue-200">
              <span className="font-bold text-blue-950">
                {lang === 'EN' ? 'Design Notes: ' : 'ডিজাইন নোট: '}
              </span>
              {m.designNotes}
            </div>
          )}
          {m.specialInstructions && (
            <div className="text-xs text-blue-950 bg-blue-100/70 p-3 rounded-xl border border-blue-300">
              <span className="font-bold text-blue-950">
                {lang === 'EN' ? 'Special Instructions: ' : 'বিশেষ নির্দেশনা: '}
              </span>
              {m.specialInstructions}
            </div>
          )}
        </div>
      )}

      {/* Payment History Receipts */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-900 border-b border-slate-100 pb-2">
            {lang === 'EN'
              ? `Payment & Deposit Receipts History (${invoice.payments.length})`
              : `পেমেন্ট ও জমা রশিদের ইতিহাস (${invoice.payments.length})`}
          </h2>
          <div className="space-y-2">
            {invoice.payments.map((p, idx) => (
              <div
                key={p.id || idx}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs border border-slate-100"
              >
                <div>
                  <span className="font-bold text-slate-800">{p.paymentDate}</span>
                  <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {p.paymentMethod}
                  </span>
                  {p.bankReference && (
                    <p className="text-[11px] text-slate-500 mt-0.5">Ref: {p.bankReference}</p>
                  )}
                  {p.notes && <p className="text-[11px] text-slate-400 italic">{p.notes}</p>}
                </div>
                <div className="text-right font-black text-emerald-700 text-sm">
                  +{shop.currency} {p.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* READY INVOICE / INVOICE PROFILE ACTION BUTTONS (TWO-LINE ORGANIZED LAYOUT) */}
      {/* ========================================================================= */}
      <div
        id="invoice-bottom-actions"
        className={`rounded-2xl border-2 p-5 text-white shadow-xl space-y-4 print:hidden transition-all ${
          invoice.orderStatus === 'Ready for Pickup'
            ? 'border-teal-400 bg-gradient-to-b from-slate-900 via-teal-950/80 to-slate-950 ring-2 ring-teal-500/30'
            : 'border-emerald-600/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950'
        }`}
      >
        {/* Action Panel Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-xl p-2.5 text-white shadow-md ${
                invoice.orderStatus === 'Ready for Pickup'
                  ? 'bg-teal-500 text-slate-950 ring-2 ring-teal-300 animate-pulse'
                  : 'bg-emerald-600'
              }`}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  {invoice.orderStatus === 'Ready for Pickup'
                    ? (lang === 'EN' ? 'Ready Invoice Action Center' : 'রেডি ইনভয়েস অ্যাকশন বাটনসমূহ')
                    : (lang === 'EN' ? 'Invoice Action Center' : 'ইনভয়েস অ্যাকশন বাটনসমূহ')}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                    invoice.orderStatus === 'Ready for Pickup'
                      ? 'bg-teal-900 text-teal-200 border-teal-400'
                      : 'bg-emerald-900 text-emerald-200 border-emerald-500'
                  }`}
                >
                  ● {invoice.orderStatus}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {lang === 'EN'
                  ? `Customer: ${invoice.customerName} • Mobile: ${invoice.customerPhone}`
                  : `কাস্টমার: ${invoice.customerName} • মোবাইল: ${invoice.customerPhone}`}
              </p>
            </div>
          </div>

          {/* Quick Status Dropdown */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-slate-300 font-semibold">
              {lang === 'EN' ? 'Status:' : 'স্ট্যাটাস:'}
            </span>
            <select
              value={invoice.orderStatus}
              onChange={(e) => onUpdateStatus(invoice.id, e.target.value as Invoice['orderStatus'])}
              className="rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-white px-3 py-1.5 outline-none focus:border-teal-400 cursor-pointer shadow-inner"
            >
              <option value="Pending">{lang === 'EN' ? 'Pending' : 'পেন্ডিং'}</option>
              <option value="In Progress">{lang === 'EN' ? 'In Progress' : 'কাজ চলছে'}</option>
              <option value="Ready for Pickup">{lang === 'EN' ? 'Ready for Pickup (কাপড় রেডি)' : 'কাপড় রেডি (Ready)'}</option>
              <option value="Delivered">{lang === 'EN' ? 'Delivered (ডেলিভারি)' : 'ডেলিভারি সম্পন্ন'}</option>
              <option value="Cancelled">{lang === 'EN' ? 'Cancelled' : 'বাতিল'}</option>
            </select>
          </div>
        </div>

        {/* The Action Buttons Organized Strictly in Two Lines */}
        <div className="space-y-4 pt-1">
          {/* ========================================================================= */}
          {/* LINE 1: Primary Delivery, Customer WhatsApp & Payment Actions (Top Line) */}
          {/* ========================================================================= */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-teal-300 font-bold px-1">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-teal-400"></span>
                {lang === 'EN' ? 'Line 1: Primary WhatsApp & Payment Actions' : '১ম লাইন: কাস্টমার WhatsApp ও পেমেন্ট অ্যাকশন'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* Button 1.1: If Ready for Pickup -> Send Ready WhatsApp Message */}
              {invoice.orderStatus === 'Ready for Pickup' ? (
                <button
                  type="button"
                  onClick={handleSendReadyWhatsApp}
                  className="flex items-center justify-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3 px-4 text-xs shadow-lg transition active:scale-95 border-2 border-teal-300"
                  title={lang === 'EN' ? 'Send Ready Notification to Customer WhatsApp' : 'কাস্টমারের হোয়াটসঅ্যাপে কাপড় রেডি মেসেজ পাঠান'}
                >
                  <MessageSquareText className="h-4 w-4 shrink-0 text-slate-950" />
                  <span className="font-black">
                    {lang === 'EN' ? 'Send Ready WhatsApp' : 'কাপড় রেডি WhatsApp মেসেজ'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(invoice.id, 'Ready for Pickup')}
                  className="flex items-center justify-center gap-2 rounded-xl bg-teal-900/80 hover:bg-teal-800 text-teal-200 font-bold py-3 px-4 text-xs border border-teal-600 shadow-sm transition active:scale-95"
                  title={lang === 'EN' ? 'Mark order as Ready for Pickup' : 'অর্ডারটি কাপড় রেডি হিসেবে চিহ্নিত করুন'}
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-teal-300" />
                  <span>
                    {lang === 'EN' ? 'Mark as Ready' : 'কাপড় রেডি চিহ্নিত করুন'}
                  </span>
                </button>
              )}

              {/* Button 1.2: Send Invoice PNG to WhatsApp */}
              <button
                type="button"
                onClick={handleSendInvoicePng}
                disabled={sendingWhatsAppPng}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 px-4 text-xs shadow-lg transition active:scale-95 border-2 border-emerald-300 disabled:opacity-50"
                title={lang === 'EN' ? 'Send invoice receipt image directly to customer WhatsApp' : 'ইনভয়েসটি PNG ছবি আকারে সরাসরি কাস্টমারের হোয়াটসঅ্যাপে পাঠান'}
              >
                {sendingWhatsAppPng ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0 text-slate-950" />
                    <span>{lang === 'EN' ? 'Generating PNG...' : 'ছবি তৈরি হচ্ছে...'}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 shrink-0 text-slate-950" />
                    <span className="font-black">
                      {lang === 'EN' ? 'Send Invoice (PNG)' : 'WhatsApp এ ইনভয়েস (PNG)'}
                    </span>
                  </>
                )}
              </button>

              {/* Button 1.3: Collect Due Payment OR Mark Delivered */}
              {invoice.remainingDue > 0 ? (
                <button
                  type="button"
                  onClick={() => onOpenPaymentModal(invoice)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black py-3 px-4 text-xs shadow-lg transition active:scale-95 border-2 border-amber-300"
                  title={lang === 'EN' ? 'Record Due Payment' : 'বকেয়া টাকা জমা নিন'}
                >
                  <DollarSign className="h-4 w-4 shrink-0" />
                  <span className="font-black">
                    {lang === 'EN'
                      ? `Collect Due (${shop.currency} ${invoice.remainingDue.toFixed(0)})`
                      : `বাকি জমা (${shop.currency} ${invoice.remainingDue.toFixed(0)})`}
                  </span>
                </button>
              ) : invoice.orderStatus === 'Ready for Pickup' ? (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(invoice.id, 'Delivered')}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-black py-3 px-4 text-xs shadow-lg transition active:scale-95 border-2 border-blue-300"
                  title={lang === 'EN' ? 'Mark dress as Delivered to customer' : 'পোশাক ডেলিভারি সম্পন্ন চিহ্নিত করুন'}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="font-black">
                    {lang === 'EN' ? 'Mark Delivered' : 'ডেলিভারি সম্পন্ন করুন'}
                  </span>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-300 font-bold py-3 px-4 text-xs text-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{lang === 'EN' ? 'All Dues Paid' : 'সব টাকা পরিশোধিত'}</span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LINE 2: Print, Download, QR Code & Management Tools (Bottom Line)          */}
          {/* ========================================================================= */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-400"></span>
                {lang === 'EN' ? 'Line 2: Print, Download & Edit Tools' : '২য় লাইন: প্রিন্ট, ডাউনলোড ও অন্যান্য অপশন'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Button 2.1: Print Slip */}
              <button
                type="button"
                onClick={() => onOpenPrintModal(invoice)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-3 text-xs shadow-md transition active:scale-95 border border-indigo-400"
                title={lang === 'EN' ? 'Print Slip' : 'রসিদ প্রিন্ট করুন'}
              >
                <Printer className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t.printInvoice}</span>
              </button>

              {/* Button 2.2: Save / View PNG Modal */}
              <button
                type="button"
                onClick={() => {
                  setIsReadyMode(invoice.orderStatus === 'Ready for Pickup');
                  setIsImageModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-2.5 px-3 text-xs shadow-md transition active:scale-95 border border-sky-300"
                title={lang === 'EN' ? 'Save PNG image to phone gallery' : 'PNG ছবি ভিউ ও গ্যালারিতে সেভ'}
              >
                <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-950" />
                <span className="truncate">{t.saveToGallery}</span>
              </button>

              {/* Button 2.3: QR Code Verification */}
              <button
                type="button"
                onClick={handleOpenQrModal}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-2.5 px-3 text-xs shadow-md transition active:scale-95 border border-fuchsia-400"
                title={lang === 'EN' ? 'Show Invoice Verification QR Code' : 'ইনভয়েস ভেরিফিকেশন QR কোড দেখুন'}
              >
                <QrCode className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{lang === 'EN' ? 'QR Code' : 'QR কোড'}</span>
              </button>

              {/* Button 2.4: Edit Invoice */}
              <button
                type="button"
                onClick={() => onEdit(invoice)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-3 text-xs shadow-md transition active:scale-95 border border-slate-600"
                title={lang === 'EN' ? 'Edit Invoice' : 'ইনভয়েস এডিট করুন'}
              >
                <Edit2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t.edit}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Canvas Image Modal for Instant Download & Gallery Save */}
      <InvoiceImageModal
        isOpen={isImageModalOpen}
        invoice={invoice}
        shop={shop}
        lang={lang}
        isReadyMode={isReadyMode}
        onClose={() => setIsImageModalOpen(false)}
      />

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        title={
          lang === 'EN'
            ? `Take Live Photo (${
                activePhotoSlot === 1
                  ? '1. Cloth Fabric'
                  : activePhotoSlot === 2
                  ? '2. Dress Design'
                  : activePhotoSlot === 3
                  ? '3. Customer Sketch'
                  : '4. Extra Sample'
              })`
            : `ছবি তুলুন (${
                activePhotoSlot === 1
                  ? '১. কাপড়ের স্যাম্পল'
                  : activePhotoSlot === 2
                  ? '২. ড্রেস ডিজাইন'
                  : activePhotoSlot === 3
                  ? '৩. কাস্টমার স্কেচ'
                  : '৪. অতিরিক্ত স্যাম্পল'
              })`
        }
        onClose={() => setIsCameraOpen(false)}
        onCapture={handlePhotoCaptured}
      />

      {/* Full Resolution Photo Lightbox Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 text-white">
              <span className="text-sm font-bold text-emerald-400">{previewPhoto.label}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewPhoto.uri}
                  download={`Photo_${invoice.id}_${previewPhoto.label.replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_')}.png`}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 p-1.5 text-white transition flex items-center gap-1 text-xs"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">{lang === 'EN' ? 'Download' : 'ডাউনলোড'}</span>
                </a>
                <button
                  onClick={() => setPreviewPhoto(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/60 overflow-auto">
              <img
                src={previewPhoto.uri}
                alt={previewPhoto.label}
                className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Official Invoice QR Code Verification Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-900 to-slate-900 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-white/10 p-1.5 text-amber-400">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-white">
                    {lang === 'EN' ? 'Invoice QR Verification' : 'ইনভয়েস QR ভেরিফিকেশন'}
                  </h3>
                  <p className="text-[11px] text-emerald-300">#{invoice.id} • {shop.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* QR Card Content */}
            <div className="p-6 text-center space-y-4">
              <div className="inline-block rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/50 p-4 shadow-inner">
                {qrLoading ? (
                  <div className="flex h-56 w-56 items-center justify-center">
                    <span className="text-xs text-slate-400 font-semibold animate-pulse">
                      {lang === 'EN' ? 'Generating QR Code...' : 'QR কোড তৈরি হচ্ছে...'}
                    </span>
                  </div>
                ) : qrCodeUri ? (
                  <img
                    src={qrCodeUri}
                    alt={`QR Code for invoice #${invoice.id}`}
                    className="h-56 w-56 rounded-xl object-contain mx-auto shadow-xs bg-white p-2"
                  />
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center text-rose-500 text-xs">
                    QR Code generation error
                  </div>
                )}
              </div>

              {/* Order Quick Snapshot */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'EN' ? 'Customer:' : 'কাস্টমার:'}</span>
                  <span className="font-bold text-slate-900">{invoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'EN' ? 'Dress:' : 'পোশাক:'}</span>
                  <span className="font-bold text-emerald-950">{invoice.dressType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'EN' ? 'Total / Due:' : 'মোট / বকেয়া:'}</span>
                  <span className="font-black text-slate-950">
                    {shop.currency} {invoice.netTotal} /{' '}
                    <span className={invoice.remainingDue > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                      {invoice.remainingDue > 0 ? `${shop.currency} ${invoice.remainingDue}` : 'PAID'}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'EN' ? 'Delivery Date:' : 'ডেলিভারি:'}</span>
                  <span className="font-bold text-amber-800">{invoice.deliveryDate}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                {lang === 'EN'
                  ? 'Scan with any smartphone camera to instantly verify invoice details.'
                  : 'যেকোনো স্মার্টফোন ক্যামেরা বা স্ক্যানার দিয়ে স্ক্যান করলে ইনভয়েসের সত্যতা মিলবে।'}
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {qrCodeUri && (
                  <button
                    onClick={() => downloadImageFromUri(qrCodeUri, `QR_Invoice_${invoice.id}.png`)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95"
                  >
                    <Download className="h-4 w-4" />
                    <span>{lang === 'EN' ? 'Save QR' : 'QR সেভ করুন'}</span>
                  </button>
                )}
                <button
                  onClick={() => setIsQrModalOpen(false)}
                  className="flex items-center justify-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95"
                >
                  <span>{lang === 'EN' ? 'Close' : 'বন্ধ করুন'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
