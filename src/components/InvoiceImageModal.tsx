import React, { useEffect, useState } from 'react';
import { Invoice, Shop, Language } from '../types';
import { generateInvoiceImageUriAsync, downloadImageFromUri } from '../utils/invoiceImage';
import { shareInvoicePngToWhatsApp, openWhatsAppUrl, createReadyWhatsAppMessage } from '../utils/whatsapp';
import { Download, X, Share2, CheckCircle2, Image as ImageIcon, Smartphone, Loader2, MessageSquareText } from 'lucide-react';

interface InvoiceImageModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  shop: Shop;
  lang?: Language;
  isReadyMode?: boolean;
  onClose: () => void;
}

export const InvoiceImageModal: React.FC<InvoiceImageModalProps> = ({
  isOpen,
  invoice,
  shop,
  lang = 'BN',
  isReadyMode = false,
  onClose,
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!isOpen || !invoice) {
      setImageUri(null);
      setLoading(false);
      setDownloadSuccess(false);
      return;
    }

    setLoading(true);
    // Generate high resolution image on canvas with photos loaded
    generateInvoiceImageUriAsync(invoice, shop, (lang as 'EN' | 'BN') || 'BN')
      .then((uri) => {
        if (!isMounted) return;
        setImageUri(uri);
        setLoading(false);
      })
      .catch((e) => {
        console.error('Failed to generate invoice image', e);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, invoice, shop, lang]);

  if (!isOpen || !invoice) return null;

  const sanitized = invoice.customerName.replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_');
  const filename = `Invoice_${invoice.id}_${sanitized}.png`;

  const handleManualDownload = () => {
    if (!imageUri) return;
    downloadImageFromUri(imageUri, filename);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleSendReadyTextOnly = () => {
    const msg = createReadyWhatsAppMessage(invoice, shop, (lang as 'EN' | 'BN') || 'BN');
    openWhatsAppUrl(invoice.customerPhone, msg);
  };

  const handleWhatsAppSend = async () => {
    if (!imageUri) return;
    setSharing(true);
    try {
      await shareInvoicePngToWhatsApp(invoice, shop, imageUri, false, (lang as 'EN' | 'BN') || 'BN');
    } catch (e) {
      console.warn(e);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">
                {isReadyMode
                  ? lang === 'EN'
                    ? 'Dress Ready - Digital Invoice Receipt'
                    : 'কাপড় রেডি - ডিজিটাল ইনভয়েস রশিদ'
                  : lang === 'EN'
                  ? 'Digital Invoice PNG Receipt'
                  : 'ইনভয়েস ডিজিটাল PNG রশিদ'}
              </h3>
              <p className="text-[11px] text-emerald-300">
                {lang === 'EN' ? 'Invoice' : 'ইনভয়েস'} #{invoice.id} • {invoice.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Suggestion Bar */}
        <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              {lang === 'EN'
                ? 'Invoice with design photos ready! Share directly to customer WhatsApp.'
                : 'ছবি সহ ইনভয়েস রেডি! সরাসরি কাস্টমারের হোয়াটসঅ্যাপে পাঠান।'}
            </span>
          </div>
        </div>

        {/* Image Preview Container */}
        <div className="overflow-y-auto p-4 flex flex-col items-center bg-slate-100 max-h-[58vh]">
          {imageUri ? (
            <div className="space-y-3 w-full flex flex-col items-center">
              <img
                src={imageUri}
                alt={`Invoice ${invoice.id}`}
                className="w-full max-w-md rounded-xl border border-slate-300 shadow-md object-contain bg-white"
              />

              {/* Mobile Tip */}
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900 w-full">
                <Smartphone className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{lang === 'EN' ? 'Mobile Tip:' : 'মোবাইল টিপস:'}</strong>{' '}
                  {lang === 'EN'
                    ? 'Long press on the image to "Save Image" or use the green button below to share directly via WhatsApp.'
                    : 'ছবিতে চাপ দিয়ে ধরে (Long Press) "Save Image" করতে পারেন অথবা নিচের সবুজ বাটন দিয়ে সরাসরি হোয়াটসঅ্যাপে পাঠান।'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span>{lang === 'EN' ? 'Generating receipt...' : 'রশিদ তৈরি হচ্ছে...'}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 bg-white p-3.5 flex flex-col sm:flex-row items-center gap-2">
          {/* WhatsApp Button - Emerald */}
          <button
            onClick={() => handleWhatsAppSend()}
            disabled={!imageUri || sharing}
            className="w-full sm:flex-[1.5] flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 text-xs font-black text-slate-950 shadow-md transition active:scale-95 disabled:opacity-50"
          >
            <Share2 className="h-4 w-4 text-slate-950" />
            {sharing
              ? lang === 'EN'
                ? 'Sending...'
                : 'পাঠানো হচ্ছে...'
              : lang === 'EN'
              ? 'Send Invoice via WhatsApp'
              : 'WhatsApp এ ইনভয়েস পাঠান'}
          </button>

          {/* Ready Alert Button - Teal (Text Only to customer mobile number) */}
          {invoice.orderStatus === 'Ready for Pickup' && (
            <button
              onClick={handleSendReadyTextOnly}
              className="w-full sm:flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95"
              title={
                lang === 'EN'
                  ? 'Send dress ready alert directly to customer WhatsApp (Text Only)'
                  : 'কাস্টমারের হোয়াটসঅ্যাপে সরাসরি কাপড় রেডি মেসেজ পাঠান (শুধু মেসেজ)'
              }
            >
              <MessageSquareText className="h-4 w-4" />
              {lang === 'EN' ? 'Ready Alert' : 'কাপড় রেডি মেসেজ'}
            </button>
          )}

          {/* Download PNG Button - Sky Blue */}
          <button
            onClick={handleManualDownload}
            disabled={!imageUri}
            className="w-full sm:flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white py-2.5 text-xs font-bold shadow-md transition active:scale-95"
          >
            <Download className="h-4 w-4" />
            {downloadSuccess
              ? lang === 'EN'
                ? 'Downloaded!'
                : 'ডাউনলোড হয়েছে!'
              : lang === 'EN'
              ? 'Download PNG'
              : 'PNG ডাউনলোড'}
          </button>
        </div>
      </div>
    </div>
  );
};
