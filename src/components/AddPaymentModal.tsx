import React, { useState } from 'react';
import { Invoice, Shop, Language } from '../types';
import { DollarSign, X, Check } from 'lucide-react';

interface AddPaymentModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  shop: Shop;
  lang?: Language;
  onClose: () => void;
  onSubmit: (
    invoiceId: string,
    amount: number,
    paymentMethod: 'Cash' | 'Bank',
    bankReference?: string,
    notes?: string
  ) => void;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  invoice,
  shop,
  lang = 'BN',
  onClose,
  onSubmit,
}) => {
  if (!isOpen || !invoice) return null;

  const isEn = lang === 'EN';
  const [amount, setAmount] = useState<string>(
    invoice.remainingDue > 0 ? invoice.remainingDue.toString() : ''
  );
  const [method, setMethod] = useState<'Cash' | 'Bank'>('Cash');
  const [bankRef, setBankRef] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!isNaN(num) && num > 0) {
      onSubmit(invoice.id, num, method, bankRef, notes);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-300" />
            <h3 className="text-base font-bold">
              {isEn ? 'Collect Customer Due Payment' : 'কাস্টমার বকেয়া জমা নিন'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{isEn ? `Invoice #${invoice.id}` : `ইনভয়েস #${invoice.id}`}</span>
              <span>{invoice.dressType}</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">{invoice.customerName}</div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 text-xs">
              <span className="font-medium text-slate-600">
                {isEn ? 'Current Remaining Due:' : 'বর্তমান বকেয়া বাকি:'}
              </span>
              <span className="font-bold text-rose-600 text-base">
                {shop.currency} {invoice.remainingDue.toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? `Payment Amount (${shop.currency}) *` : `জমা টাকার পরিমাণ (${shop.currency}) *`}
            </label>
            <input
              type="number"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Payment Method' : 'পরিশোধের মাধ্যম'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('Cash')}
                className={`rounded-xl border py-2 text-xs font-bold transition ${
                  method === 'Cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                💵 {isEn ? 'Cash' : 'নগদ (Cash)'}
              </button>
              <button
                type="button"
                onClick={() => setMethod('Bank')}
                className={`rounded-xl border py-2 text-xs font-bold transition ${
                  method === 'Bank'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                🏦 {isEn ? 'Bank Transfer' : 'ব্যাংক / বিকাশ'}
              </button>
            </div>
          </div>

          {method === 'Bank' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {isEn ? 'Bank / Transaction Reference ID' : 'ব্যাংক বা ট্রানজেকশন রেফারেন্স ID'}
              </label>
              <input
                type="text"
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
                placeholder={isEn ? 'e.g. Bank Muscat / Trx #12345' : 'যেমন: Bank Muscat / Trx #12345'}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isEn ? 'Notes / Remarks (Optional)' : 'নোট / মন্তব্য (ঐচ্ছিক)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEn ? 'Payment remarks' : 'পেমেন্ট সম্পর্কিত মন্তব্য'}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {isEn ? 'Cancel' : 'বাতিল'}
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-800"
            >
              <Check className="h-4 w-4" />
              {isEn ? 'Save Payment' : 'জমা সেভ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
