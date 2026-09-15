import React, { useState, useMemo } from 'react';
import { Shop, Invoice, Expense, TailorRecord, Language } from '../types';
import {
  DollarSign,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Wallet,
  Clock,
  TrendingUp,
  CreditCard,
  FileDown,
  Loader2,
} from 'lucide-react';
import { printHtmlElement, exportElementToPdf } from '../utils/print';

interface DailyAccountsScreenProps {
  shop: Shop;
  invoices: Invoice[];
  expenses: Expense[];
  tailorRecords: TailorRecord[];
  lang?: Language;
  onNavigateToInvoiceDetail?: (id: string) => void;
}

export const DailyAccountsScreen: React.FC<DailyAccountsScreenProps> = ({
  shop,
  invoices,
  expenses,
  tailorRecords,
  lang = 'BN',
  onNavigateToInvoiceDetail,
}) => {
  const isEn = lang === 'EN';
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // 1. Orders placed on selected date
  const dayInvoices = useMemo(() => {
    return invoices.filter((i) => i.orderDate === selectedDate);
  }, [invoices, selectedDate]);

  // Advance collected from day orders
  const dayAdvanceTotal = useMemo(() => {
    return dayInvoices.reduce((sum, i) => sum + (i.advanceDeposit || 0), 0);
  }, [dayInvoices]);

  // 2. Payments collected on selected date from all invoices (due collection)
  const dayPayments = useMemo(() => {
    const list: { invoiceId: string; customerName: string; amount: number; method: string; time: number }[] = [];
    invoices.forEach((inv) => {
      if (inv.payments && inv.payments.length > 0) {
        inv.payments.forEach((p) => {
          if (p.paymentDate === selectedDate) {
            list.push({
              invoiceId: inv.id,
              customerName: inv.customerName,
              amount: p.amount,
              method: p.paymentMethod,
              time: p.createdAt,
            });
          }
        });
      }
    });
    return list;
  }, [invoices, selectedDate]);

  const dayDueCollectedTotal = useMemo(() => {
    return dayPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [dayPayments]);

  // 3. Deposits on selected date
  const dayDeposits = useMemo(() => {
    return expenses.filter((e) => e.date === selectedDate && e.type === 'Deposit');
  }, [expenses, selectedDate]);

  const dayDepositTotal = useMemo(() => {
    return dayDeposits.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [dayDeposits]);

  // 4. Expenses on selected date
  const dayExpensesList = useMemo(() => {
    return expenses.filter((e) => e.date === selectedDate && (e.type === 'Expense' || !e.type));
  }, [expenses, selectedDate]);

  const dayExpenseTotal = useMemo(() => {
    return dayExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [dayExpensesList]);

  // Calculations
  const totalCashIn = dayAdvanceTotal + dayDueCollectedTotal + dayDepositTotal;
  const totalCashOut = dayExpenseTotal;
  const netCashClosing = totalCashIn - totalCashOut;

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const pdfFilename = `Daily_Accounts_${shop.name.replace(/\s+/g, '_')}_${selectedDate}.pdf`;

  const handlePrintDaily = () => {
    printHtmlElement(
      'printable-daily-accounts-area',
      `${shop.name} - Daily Accounts (${selectedDate})`
    );
  };

  const handleDownloadPdfDaily = async () => {
    try {
      setIsDownloadingPdf(true);
      await exportElementToPdf('printable-daily-accounts-area', {
        filename: pdfFilename,
        title: `${shop.name} - Daily Accounts (${selectedDate})`,
      });
    } catch (err) {
      console.error('Failed to download daily accounts PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 print-invoice" id="printable-daily-accounts-area">
      {/* Print-Only Formal Shop Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4 print-section-header print-avoid-break">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-950">{shop.name}</h1>
            <p className="text-xs text-slate-700">{shop.address} | Tel: {shop.phone}</p>
            <p className="text-[11px] font-semibold text-slate-800">Commercial Registration (CR): {shop.crNumber}</p>
          </div>
          <div className="text-right">
            <span className="inline-block rounded bg-slate-900 text-white px-2.5 py-1 text-[11px] font-black uppercase">
              {isEn ? 'Daily Cash & Accounts Register' : 'দৈনিক হিসাব ও ক্যাশ রেজিস্টার'}
            </span>
            <p className="text-xs text-slate-800 font-bold mt-1">
              {isEn ? 'Date: ' : 'তারিখ: '} {selectedDate}
            </p>
          </div>
        </div>
      </div>

      {/* Header Banner (Screen Only) */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="rounded-2xl bg-amber-400 p-2.5 text-slate-950 shadow-md">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {isEn ? 'Daily Accounts & Cash Register' : 'দৈনিক হিসাব ও ক্যাশ রেজিস্টার'}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-300">
              {isEn
                ? 'Track daily advance receipts, due collection, shop expenses, and cash-in-hand closing'
                : 'দৈনিক অগ্রিম জমা, বাকি আদায়, দোকান খরচ ও ক্যাশ জমার স্বয়ংক্রিয় হিসাব খাতা'}
            </p>
          </div>
        </div>

        {/* Date Selector & Print Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/10 backdrop-blur-xs">
            <button
              onClick={handlePrevDay}
              className="rounded-xl p-2 hover:bg-white/20 text-white transition active:scale-95"
              title="Previous Day"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 px-2">
              <Calendar className="h-4 w-4 text-amber-300" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-black text-sm focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
            <button
              onClick={handleNextDay}
              className="rounded-xl p-2 hover:bg-white/20 text-white transition active:scale-95"
              title="Next Day"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="rounded-xl bg-amber-400 text-slate-950 px-2.5 py-1 text-xs font-black hover:bg-amber-300 transition"
            >
              {isEn ? 'Today' : 'আজ'}
            </button>
          </div>

          {/* Action Buttons: PDF Download & Direct Print */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleDownloadPdfDaily}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3.5 py-2 text-xs shadow-md transition active:scale-95 disabled:opacity-50"
              title={isEn ? 'Download A4 PDF Statement' : 'A4 PDF স্টেটমেন্ট ডাউনলোড'}
            >
              {isDownloadingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 text-slate-950" />
              )}
              <span>{isDownloadingPdf ? (isEn ? 'Saving...' : 'সেভ হচ্ছে...') : (isEn ? 'PDF Download' : 'PDF ডাউনলোড')}</span>
            </button>

            <button
              onClick={handlePrintDaily}
              className="flex items-center gap-1.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/20 font-black px-3.5 py-2 text-xs shadow-md transition active:scale-95"
              title={isEn ? 'Print Daily Accounts Sheet' : 'দৈনিক হিসাব শিট প্রিন্ট'}
            >
              <Printer className="h-4 w-4 text-amber-300" />
              <span>{isEn ? 'Print' : 'প্রিন্ট'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print-avoid-break">
        {/* Total Inflow */}
        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm print:rounded-xl print:p-3 print-avoid-break">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              {isEn ? 'Total Cash In' : 'মোট ক্যাশ জমা (In)'}
            </span>
            <div className="rounded-full bg-emerald-200 p-1.5 text-emerald-800 print:hidden">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-950 mt-2 print:text-xl">
            {shop.currency} {totalCashIn.toFixed(2)}
          </p>
          <p className="text-[11px] font-semibold text-emerald-700 mt-1">
            {isEn
              ? `Advance ${shop.currency} ${dayAdvanceTotal.toFixed(0)} + Due Coll. ${shop.currency} ${dayDueCollectedTotal.toFixed(0)}`
              : `অগ্রিম ${shop.currency} ${dayAdvanceTotal.toFixed(0)} + বকেয়া আদায় ${shop.currency} ${dayDueCollectedTotal.toFixed(0)}`}
          </p>
        </div>

        {/* Total Outflow */}
        <div className="rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 p-5 shadow-sm print:rounded-xl print:p-3 print-avoid-break">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
              {isEn ? 'Total Expense' : 'মোট খরচ (Out)'}
            </span>
            <div className="rounded-full bg-rose-200 p-1.5 text-rose-800 print:hidden">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-950 mt-2 print:text-xl">
            {shop.currency} {totalCashOut.toFixed(2)}
          </p>
          <p className="text-[11px] font-semibold text-rose-700 mt-1">
            {isEn ? `${dayExpensesList.length} voucher entries` : `${dayExpensesList.length} টি ভাউচার এন্ট্রি`}
          </p>
        </div>

        {/* Net Cash in Hand */}
        <div className="rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 shadow-sm print:rounded-xl print:p-3 print-avoid-break">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              {isEn ? 'Net Cash In Hand' : 'আজকের ক্যাশ উদ্বৃত্ত'}
            </span>
            <div className="rounded-full bg-amber-200 p-1.5 text-amber-900 print:hidden">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-950 mt-2 print:text-xl">
            {shop.currency} {netCashClosing.toFixed(2)}
          </p>
          <p className="text-[11px] font-semibold text-amber-800 mt-1">
            {isEn ? '(Inflow - Expense = Net Balance)' : '(জমা - খরচ = নিট ব্যালেন্স)'}
          </p>
        </div>

        {/* Orders Booked */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:rounded-xl print:p-3 print-avoid-break">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {isEn ? 'Orders Booked' : 'আজকের নতুন অর্ডার'}
            </span>
            <div className="rounded-full bg-slate-100 p-1.5 text-slate-800 print:hidden">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 print:text-xl">
            {dayInvoices.length} <span className="text-sm font-bold text-slate-500">{isEn ? 'orders' : 'টি'}</span>
          </p>
          <p className="text-[11px] font-semibold text-slate-600 mt-1">
            {isEn ? 'Total Sales: ' : 'মোট সেলস: '} {shop.currency}{' '}
            {dayInvoices.reduce((s, i) => s + (i.netTotal || 0), 0).toFixed(0)}
          </p>
        </div>
      </div>

      {/* Itemized Transactions Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print-avoid-break">
        {/* Left Column: Cash Inflows */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 print:rounded-xl print:p-3 print-avoid-break">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 print:hidden"></span>
              {isEn ? 'Cash Inflow Records' : 'আজকের ক্যাশ জমা তালিকা'}
            </h3>
            <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-black text-emerald-900">
              {shop.currency} {totalCashIn.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
            {/* New Orders Advances */}
            {dayInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => onNavigateToInvoiceDetail(inv.id)}
                className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-100 transition cursor-pointer print:rounded-lg print:p-2 print-avoid-break"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-950">#{inv.id}</span>
                    <span className="text-xs font-bold text-slate-800">{inv.customerName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isEn ? `Dress: ${inv.dressType} • Bill: ${shop.currency} ${inv.netTotal}` : `পোশাক: ${inv.dressType} • বিল: ${shop.currency} ${inv.netTotal}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-900 text-sm">
                    +{shop.currency} {inv.advanceDeposit.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-bold uppercase">{inv.paymentMethod}</p>
                </div>
              </div>
            ))}

            {/* Due collections */}
            {dayPayments.map((p, idx) => (
              <div
                key={idx}
                onClick={() => onNavigateToInvoiceDetail(p.invoiceId)}
                className="flex items-center justify-between p-3 rounded-2xl bg-teal-50/60 hover:bg-teal-100/70 border border-teal-100 transition cursor-pointer print:rounded-lg print:p-2 print-avoid-break"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-teal-950">#{p.invoiceId}</span>
                    <span className="text-xs font-bold text-slate-800">{p.customerName}</span>
                    <span className="rounded bg-teal-200 px-1.5 py-0.2 text-[9px] font-black text-teal-900">
                      {isEn ? 'Due Collected' : 'বাকি আদায়'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-teal-900 text-sm">
                    +{shop.currency} {p.amount.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-teal-700 font-bold uppercase">{p.method}</p>
                </div>
              </div>
            ))}

            {/* Direct Deposits */}
            {dayDeposits.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/60 border border-amber-100 transition print:rounded-lg print:p-2 print-avoid-break"
              >
                <div>
                  <p className="text-xs font-black text-amber-950">{dep.category}</p>
                  <p className="text-[11px] text-slate-600">{dep.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-amber-900 text-sm">
                    +{shop.currency} {dep.amount.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-amber-700 font-bold">{isEn ? 'Cash Deposit' : 'ক্যাশ ডিপোজিট'}</span>
                </div>
              </div>
            ))}

            {dayInvoices.length === 0 && dayPayments.length === 0 && dayDeposits.length === 0 && (
              <p className="text-center py-8 text-xs text-slate-400 font-medium">
                {isEn ? 'No cash inflows recorded on this date.' : 'এই তারিখে কোন ক্যাশ জমার রেকর্ড নেই।'}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Expenses & Cash Out */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 print:rounded-xl print:p-3 print-avoid-break">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600 print:hidden"></span>
              {isEn ? 'Expense & Payout Records' : 'আজকের খরচ তালিকা'}
            </h3>
            <span className="rounded-full bg-rose-100 px-3 py-0.5 text-xs font-black text-rose-900">
              {shop.currency} {totalCashOut.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
            {dayExpensesList.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/50 border border-rose-100 transition print:rounded-lg print:p-2 print-avoid-break"
              >
                <div>
                  <p className="text-xs font-black text-slate-900">{exp.category}</p>
                  <p className="text-[11px] text-slate-600">{exp.description}</p>
                  {exp.person && <p className="text-[10px] text-slate-400">{isEn ? 'Person: ' : 'ব্যক্তি: '}{exp.person}</p>}
                </div>
                <div className="text-right">
                  <p className="font-black text-rose-900 text-sm">
                    -{shop.currency} {exp.amount.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-rose-700 font-bold uppercase">{exp.paymentMethod || 'Cash'}</p>
                </div>
              </div>
            ))}

            {dayExpensesList.length === 0 && (
              <p className="text-center py-8 text-xs text-slate-400 font-medium">
                {isEn ? 'No expenses recorded on this date.' : 'এই তারিখে কোন খরচের ভাউচার নেই।'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Daily Accounts Print Verification Signatures */}
      <div className="hidden print:grid grid-cols-3 gap-6 text-center text-xs text-slate-700 pt-6 border-t border-slate-300 print-section-footer print-avoid-break">
        <div>
          <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1"></div>
          <p className="font-bold text-slate-900">{isEn ? 'Cashier / Accountant' : 'ক্যাশিয়ার / হিসাবরক্ষক'}</p>
          <p className="text-[10px] text-slate-500">{isEn ? 'Prepared closing balance' : 'দৈনিক ক্যাশ প্রস্তুতকারী'}</p>
        </div>
        <div>
          <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1"></div>
          <p className="font-bold text-slate-900">{isEn ? 'Store Manager' : 'স্টোর ম্যানেজার'}</p>
          <p className="text-[10px] text-slate-500">{isEn ? 'Verified receipts & vouchers' : 'যাচাই ও অনুমোদনকারী'}</p>
        </div>
        <div>
          <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1"></div>
          <p className="font-bold text-slate-900">{isEn ? 'Proprietor Signature' : 'স্বত্বাধিকারী স্বাক্ষর'}</p>
          <p className="text-[10px] text-slate-500">{shop.name}</p>
        </div>
      </div>
    </div>
  );
};
