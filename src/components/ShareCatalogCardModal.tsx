import React, { useEffect, useState } from 'react';
import { CatalogItem, Shop, Language } from '../types';
import { generateCatalogImageUriAsync } from '../utils/catalogImage';
import { shareCatalogPngToWhatsApp } from '../utils/whatsapp';
import { downloadImageFromUri } from '../utils/invoiceImage';
import { Share2, Download, X, Loader2, Send } from 'lucide-react';

interface ShareCatalogCardModalProps {
  isOpen: boolean;
  item: CatalogItem | null;
  shop: Shop;
  lang?: Language;
  onClose: () => void;
}

export const ShareCatalogCardModal: React.FC<ShareCatalogCardModalProps> = ({
  isOpen,
  item,
  shop,
  lang = 'BN',
  onClose,
}) => {
  const isEn = lang === 'EN';
  const [cardImageUri, setCardImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [customPhone, setCustomPhone] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (!isOpen || !item) {
      setCardImageUri(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    generateCatalogImageUriAsync(item, shop)
      .then((uri) => {
        if (!isMounted) return;
        setCardImageUri(uri);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, item, shop]);

  if (!isOpen || !item) return null;

  const downloadCard = () => {
    if (!cardImageUri) return;
    const filename = `Catalog_${item.catalogCode}_${item.name.replace(/\s+/g, '_')}.png`;
    downloadImageFromUri(cardImageUri, filename);
  };

  const handleWhatsAppSend = async () => {
    if (!cardImageUri) return;
    setSharing(true);
    try {
      await shareCatalogPngToWhatsApp(item, shop, cardImageUri, customPhone || undefined, (lang as 'EN' | 'BN') || 'BN');
    } catch (e) {
      console.warn(e);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[95vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">
                {isEn ? 'Catalog Design Card (PNG)' : 'ক্যাটালগ ডিজাইন কার্ড (ছবি সহ PNG)'}
              </h3>
              <p className="text-[11px] text-emerald-300">
                {item.name} ({item.catalogCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Card View */}
        <div className="overflow-y-auto p-4 flex flex-col items-center bg-slate-100 max-h-[55vh]">
          {cardImageUri ? (
            <div className="space-y-3 w-full flex flex-col items-center">
              <img
                src={cardImageUri}
                alt="Catalog Share Card"
                className="w-full rounded-xl border border-slate-300 shadow-md object-contain bg-white"
              />
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span>{isEn ? 'Generating design card...' : 'কার্ড তৈরি হচ্ছে...'}</span>
            </div>
          )}
        </div>

        {/* Quick Customer Phone Input */}
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            {isEn ? 'Customer Phone Number (Optional):' : 'কাস্টমারের মোবাইল নাম্বার (ঐচ্ছিক):'}
          </label>
          <input
            type="tel"
            value={customPhone}
            onChange={(e) => setCustomPhone(e.target.value)}
            placeholder={isEn ? 'Customer Phone (e.g. +88017... or +968...)' : 'কাস্টমার নাম্বার লিখুন (যেমন: +88017... বা +968...)'}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-600"
          />
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 bg-white p-3 flex gap-2">
          <button
            onClick={handleWhatsAppSend}
            disabled={!cardImageUri || sharing}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow transition active:scale-95 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sharing
              ? isEn
                ? 'Sending...'
                : 'পাঠানো হচ্ছে...'
              : isEn
              ? 'Send via WhatsApp'
              : 'WhatsApp এ ছবি সহ পাঠান'}
          </button>
          <button
            onClick={downloadCard}
            disabled={!cardImageUri}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition active:scale-95"
          >
            <Download className="h-4 w-4" />
            {isEn ? 'Download PNG' : 'PNG ডাউনলোড'}
          </button>
        </div>
      </div>
    </div>
  );
};
