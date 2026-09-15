import React, { useState } from 'react';
import { CatalogItem, Language } from '../types';
import { Search, X, Sparkles } from 'lucide-react';

interface CatalogSelectModalProps {
  isOpen: boolean;
  catalogItems: CatalogItem[];
  currency: string;
  lang?: Language;
  onClose: () => void;
  onSelect: (item: CatalogItem) => void;
}

export const CatalogSelectModal: React.FC<CatalogSelectModalProps> = ({
  isOpen,
  catalogItems,
  currency,
  lang = 'BN',
  onClose,
  onSelect,
}) => {
  const isEn = lang === 'EN';
  const [query, setQuery] = useState('');
  if (!isOpen) return null;

  const filtered = catalogItems.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.catalogCode.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-300" />
            <h3 className="text-base font-bold">
              {isEn ? 'Select Design from Catalog' : 'ক্যাটালগ থেকে ডিজাইন সিলেক্ট করুন'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isEn
                  ? 'Search design name or code (e.g. AB-101)...'
                  : 'ডিজাইনের নাম বা কোড দিয়ে খুঁজুন (যেমন: AB-101)...'
              }
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-2.5 max-h-[50vh]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {isEn ? 'No catalog designs found.' : 'কোনো ক্যাটালগ ডিজাইন পাওয়া যায়নি।'}
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-emerald-500 hover:bg-emerald-50/40 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  {item.imageUri ? (
                    <img
                      src={item.imageUri}
                      alt={item.name}
                      className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                      {item.category.slice(0, 3)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-emerald-800">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
                        {item.catalogCode}
                      </span>
                      <span className="text-xs text-slate-500">
                        {item.category} • {isEn ? 'Size:' : 'সাইজ:'} {item.modelSize}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-800">
                    {currency} {item.price.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            {isEn ? 'Cancel' : 'বাতিল'}
          </button>
        </div>
      </div>
    </div>
  );
};
