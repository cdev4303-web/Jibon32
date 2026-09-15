import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Invoice, Language } from '../types';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  lang?: Language;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  invoice,
  lang = 'BN',
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !invoice) return null;
  const isEn = lang === 'EN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <Trash2 className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {isEn ? 'Delete Invoice?' : 'ইনভয়েস মুছে ফেলতে চান?'}
          </h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            {isEn
              ? `Are you sure you want to permanently delete Invoice #${invoice.id} for ${invoice.customerName}? This cannot be undone.`
              : `আপনি কি নিশ্চিতভাবে ${invoice.customerName}-এর ইনভয়েস #${invoice.id} স্থায়ীভাবে মুছে ফেলতে চান?`}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isEn ? 'Cancel' : 'বাতিল'}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow hover:bg-rose-700 active:scale-95 transition"
            >
              {isEn ? 'Delete' : 'মুছে ফেলুন'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
