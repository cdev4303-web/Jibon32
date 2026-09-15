import React, { useState, useMemo } from 'react';
import { Shop, Expense, Language } from '../types';
import { strings } from '../utils/strings';
import { printHtmlElement, exportElementToPdf } from '../utils/print';
import { downloadImageFromUri } from '../utils/invoiceImage';
import { captureElementToPng } from '../utils/domCapture';
import { Logo } from './Logo';
import {
  Printer,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Calendar,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  FileDown,
  Loader2,
} from 'lucide-react';

interface PrintExpenseLedgerModalProps {
  isOpen: boolean;
  shop: Shop;
  expenses: Expense[];
  lang?: Language;
  initialFilterType?: 'all' | 'deposit' | 'expense';
  onClose: () => void;
}

export const PrintExpenseLedgerModal: React.FC<PrintExpenseLedgerModalProps> = ({
  isOpen,
  shop,
  expenses,
  lang = 'BN',
  initialFilterType = 'all',
  onClose,
}) => {
  const isEn = lang === 'EN';
  const t = strings[lang];

  // Filter States
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'expense'>(initialFilterType);
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'this_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDownloading, setIsDownloading] = useState(false);

  const isDeposit = (e: Expense) =>
    e.type === 'Deposit' ||
    e.category === 'Cash Deposit' ||
    e.category === 'Owner Capital' ||
    e.category === 'Direct Sales' ||
    e.category === 'Customer Advance';

  // Get unique categories for filter
  const uniqueCategories = Array.from(new Set(expenses.map((e) => e.category).filter(Boolean)));

  // Filter expenses by date, type, and category
  const filteredList = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];

    return expenses
      .filter((e) => {
        const dep = isDeposit(e);
        if (filterType === 'deposit' && !dep) return false;
        if (filterType === 'expense' && dep) return false;

        if (selectedCategory !== 'all' && e.category !== selectedCategory) {
          return false;
        }

        if (dateRange === 'today') {
          return e.date === todayStr;
        } else if (dateRange === 'this_month') {
          return e.date >= firstDayOfMonth && e.date <= todayStr;
        } else if (dateRange === 'custom') {
          if (customStartDate && e.date < customStartDate) return false;
          if (customEndDate && e.date > customEndDate) return false;
        }
        return true;
      })
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [expenses, filterType, dateRange, customStartDate, customEndDate, selectedCategory]);

  // Compute Totals
  const totalDeposits = filteredList.filter(isDeposit).reduce((acc, e) => acc + e.amount, 0);
  const totalExpenses = filteredList.filter((e) => !isDeposit(e)).reduce((acc, e) => acc + e.amount, 0);
  const netBalance = totalDeposits - totalExpenses;

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: { [key: string]: { count: number; total: number; isDep: boolean } } = {};
    filteredList.forEach((e) => {
      const dep = isDeposit(e);
      const cat = e.category || (dep ? 'Deposit' : 'Expense');
      if (!map[cat]) {
        map[cat] = { count: 0, total: 0, isDep: dep };
      }
      map[cat].count += 1;
      map[cat].total += e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filteredList]);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!isOpen) return null;

  const pdfFilename = `Expense_Ledger_${shop.name.replace(/\s+/g, '_')}_${dateRange}.pdf`;

  const handlePrint = () => {
    printHtmlElement('printable-expense-area', `${shop.name} - Expense & Deposit Statement`);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await exportElementToPdf('printable-expense-area', {
        filename: pdfFilename,
        title: `${shop.name} - Expense & Deposit Statement`,
      });
    } catch (err) {
      console.error('Failed to generate expense PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    const el = document.getElementById('printable-expense-area');
    if (!el) return;

    try {
      setIsDownloading(true);
      const uri = await captureElementToPng(el, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const filename = `Expense_Ledger_${shop.name.replace(/\s+/g, '_')}_${dateRange}.png`;
      downloadImageFromUri(uri, filename);
    } catch (err) {
      console.error('Failed to capture expense statement image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const getPeriodLabel = () => {
    if (dateRange === 'today') return isEn ? 'Today Only' : 'আজকের হিসাব';
    if (dateRange === 'this_month') return isEn ? 'Current Month' : 'চলতি মাস';
    if (dateRange === 'custom') {
      return `${customStartDate} ${isEn ? 'to' : 'থেকে'} ${customEndDate}`;
    }
    return isEn ? 'All-Time Records' : 'সর্বকালীন রেকর্ড';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="relative flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl print:max-h-none print:w-full print:shadow-none print:rounded-none">
        {/* Modal Action Bar (Hidden when printing) */}
        <div className="border-b border-slate-200 bg-slate-900 px-4 sm:px-6 py-3 text-white print:hidden">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Printer className="h-5 w-5 text-emerald-400 shrink-0" />
              <span className="font-bold text-xs sm:text-sm truncate">
                {isEn ? 'Expenses & Cash Deposit Printable Statement' : 'দোকান খরচ ও ক্যাশ জমা প্রিন্ট শিট'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition shrink-0"
              title={isEn ? 'Close' : 'বন্ধ করুন'}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Print Button - Emerald */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition active:scale-95"
              title={isEn ? 'Print or Save via Browser Dialog' : 'সরাসরি প্রিন্ট বা ডায়ালগ বক্স'}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{isEn ? 'Print' : 'প্রিন্ট'}</span>
            </button>

            {/* Download HD Image - Sky */}
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md transition active:scale-95 disabled:opacity-50"
              title={isEn ? 'Download HD Image' : 'ছবি হিসেবে ডাউনলোড'}
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{isDownloading ? (isEn ? 'Saving...' : 'সেভ হচ্ছে...') : (isEn ? 'Download Image' : 'ছবি ডাউনলোড')}</span>
            </button>

            {/* Direct A4 PDF Download Button - Amber */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md transition active:scale-95 disabled:opacity-50"
              title={isEn ? 'Download A4 PDF Statement' : 'A4 PDF স্টেটমেন্ট ডাউনলোড'}
            >
              {isDownloadingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              <span>{isDownloadingPdf ? (isEn ? 'Creating...' : 'তৈরি হচ্ছে...') : (isEn ? 'Download PDF' : 'PDF ডাউনলোড')}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar (Hidden when printing) */}
        <div className="border-b border-slate-200 bg-slate-50 p-4 print:hidden space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Type Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" />
                {isEn ? 'Type:' : 'ধরন:'}
              </span>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterType === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {isEn ? 'All (Both)' : 'সকল হিসাব'}
              </button>
              <button
                onClick={() => setFilterType('deposit')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  filterType === 'deposit'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <ArrowDownCircle className="h-3 w-3" />
                {isEn ? 'Deposits Only' : 'শুধু জমা'}
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  filterType === 'expense'
                    ? 'bg-rose-700 text-white'
                    : 'bg-white text-rose-800 border border-rose-300 hover:bg-rose-50'
                }`}
              >
                <ArrowUpCircle className="h-3 w-3" />
                {isEn ? 'Expenses Only' : 'শুধু খরচ'}
              </button>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {isEn ? 'Period:' : 'সময়কাল:'}
              </span>
              <button
                onClick={() => setDateRange('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  dateRange === 'all'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                {isEn ? 'All-Time' : 'সব'}
              </button>
              <button
                onClick={() => setDateRange('today')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  dateRange === 'today'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                {isEn ? 'Today' : 'আজ'}
              </button>
              <button
                onClick={() => setDateRange('this_month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  dateRange === 'this_month'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                {isEn ? 'This Month' : 'চলতি মাস'}
              </button>
              <button
                onClick={() => setDateRange('custom')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  dateRange === 'custom'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                {isEn ? 'Custom Range' : 'কাস্টম'}
              </button>
            </div>
          </div>

          {/* Custom Date Pickers & Category Dropdown */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200 text-xs">
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">{isEn ? 'From:' : 'হতে:'}</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                />
                <span className="font-semibold text-slate-600">{isEn ? 'To:' : 'পর্যন্ত:'}</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                />
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <span className="font-semibold text-slate-600">{isEn ? 'Category:' : 'ক্যাটাগরি:'}</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
              >
                <option value="all">{isEn ? 'All Categories' : 'সকল ক্যাটাগরি'}</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Printable Statement Sheet Area */}
        <div
          id="printable-expense-area"
          className="overflow-y-auto p-6 sm:p-8 text-slate-900 print:overflow-visible print:p-0 print-invoice"
        >
          {/* Shop Letterhead Header */}
          <div className="border-b-2 border-emerald-800 pb-3.5 flex items-center justify-between gap-4 print-section-header print-avoid-break">
            <div className="flex items-center gap-3">
              <Logo size="lg" />
              <div>
                <h1 className="text-2xl font-black tracking-wide text-emerald-950">{shop.name}</h1>
                <p className="text-xs text-slate-700 mt-0.5">
                  {shop.address} | Tel: {shop.phone}
                </p>
                <p className="text-[11px] font-semibold text-emerald-900">
                  Commercial Registration (CR): {shop.crNumber}
                </p>
              </div>
            </div>
            <div className="text-right border-l border-slate-300 pl-4 print-avoid-break">
              <span className="inline-block rounded-md bg-emerald-900 text-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wider">
                {isEn ? 'Cash & Expense Statement' : 'দোকান ক্যাশ ও খরচ স্টেটমেন্ট'}
              </span>
              <p className="text-xs text-slate-700 mt-1 font-semibold">
                {isEn ? 'Period: ' : 'সময়কাল: '} <span className="font-bold text-slate-950">{getPeriodLabel()}</span>
              </p>
              <p className="text-[11px] text-slate-600">
                {isEn ? 'Printed on: ' : 'প্রিন্ট তারিখ: '} {new Date().toLocaleString()}
              </p>
            </div>
          </div>

          {/* Statement Summary KPI Cards */}
          <div className="mt-4 grid grid-cols-3 gap-3 print-avoid-break">
            {/* Total Deposits */}
            <div className="rounded-xl border border-emerald-400 bg-emerald-50/80 p-3 text-center">
              <span className="text-[11px] font-bold text-emerald-950 block">
                {isEn ? 'TOTAL CASH DEPOSITS' : 'মোট নগদ ক্যাশ জমা (+)'}
              </span>
              <p className="text-lg font-black text-emerald-950 mt-1">
                +{shop.currency} {totalDeposits.toFixed(2)}
              </p>
              <span className="text-[10px] font-semibold text-emerald-800">
                {filteredList.filter(isDeposit).length} {isEn ? 'entries' : 'টি জমার এন্ট্রি'}
              </span>
            </div>

            {/* Total Expenses */}
            <div className="rounded-xl border border-rose-400 bg-rose-50/80 p-3 text-center">
              <span className="text-[11px] font-bold text-rose-950 block">
                {isEn ? 'TOTAL SHOP EXPENSES' : 'মোট দোকান খরচ (-)'}
              </span>
              <p className="text-lg font-black text-rose-950 mt-1">
                -{shop.currency} {totalExpenses.toFixed(2)}
              </p>
              <span className="text-[10px] font-semibold text-rose-800">
                {filteredList.filter((e) => !isDeposit(e)).length} {isEn ? 'entries' : 'টি খরচের এন্ট্রি'}
              </span>
            </div>

            {/* Net Balance */}
            <div className="rounded-xl border-2 border-indigo-400 bg-indigo-50/90 p-3 text-center">
              <span className="text-[11px] font-black text-indigo-950 block">
                {isEn ? 'NET CASH BALANCE (IN HAND)' : 'অবশিষ্ট ক্যাশ ব্যালেন্স (জমা - খরচ)'}
              </span>
              <p
                className={`text-lg font-black mt-1 ${
                  netBalance >= 0 ? 'text-indigo-950' : 'text-rose-700'
                }`}
              >
                {shop.currency} {netBalance.toFixed(2)}
              </p>
              <span className="text-[10px] font-semibold text-indigo-900">
                {filteredList.length} {isEn ? 'total records' : 'টি মোট লেনদেন'}
              </span>
            </div>
          </div>

          {/* Itemized Transactions Table */}
          <div className="mt-5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1 flex justify-between items-center">
              <span>{isEn ? 'Itemized Transaction Ledger' : 'লেনদেনের বিস্তারিত বিবরণী ও হিসাব খাতা'}</span>
              <span className="text-[11px] font-normal text-slate-600">
                {filteredList.length} {isEn ? 'records found' : 'টি রেকর্ড পাওয়া গেছে'}
              </span>
            </h3>

            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800 text-white font-bold">
                  <th className="py-2 px-2.5 text-center w-10">#</th>
                  <th className="py-2 px-3 text-left w-24">{t.date}</th>
                  <th className="py-2 px-3 text-left w-28">{t.entryType}</th>
                  <th className="py-2 px-3 text-left">{t.category}</th>
                  <th className="py-2 px-3 text-left">{t.description}</th>
                  <th className="py-2 px-3 text-left w-24">{isEn ? 'Staff / Person' : 'গ্রহীতা / ব্যক্তি'}</th>
                  <th className="py-2 px-3 text-right w-28">{isEn ? 'Inflow (+)' : 'জমা (+)'}</th>
                  <th className="py-2 px-3 text-right w-28">{isEn ? 'Outflow (-)' : 'খরচ (-)'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-semibold border-b border-slate-200">
                      {isEn ? 'No transactions found for the selected period.' : 'নির্বাচিত সময়কালে কোনো লেনদেন পাওয়া যায়নি।'}
                    </td>
                  </tr>
                ) : (
                  filteredList.map((exp, idx) => {
                    const dep = isDeposit(exp);
                    return (
                      <tr
                        key={exp.id || idx}
                        className={`border-b border-slate-200 print-avoid-break ${
                          dep ? 'bg-emerald-50/30' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2 px-2.5 text-center font-semibold text-slate-600">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{exp.date}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-black ${
                              dep
                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                : 'bg-rose-100 text-rose-950 border border-rose-300'
                            }`}
                          >
                            {dep ? (isEn ? 'Deposit' : 'ক্যাশ জমা') : (isEn ? 'Expense' : 'খরচ')}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">{exp.category}</td>
                        <td className="py-2 px-3 text-slate-800">
                          <span className="font-semibold block">{exp.description}</span>
                          {exp.notes && (
                            <span className="text-[10px] text-slate-500 italic block">{exp.notes}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{exp.person || '—'}</td>
                        <td className="py-2 px-3 text-right font-black text-emerald-900">
                          {dep ? `${shop.currency} ${exp.amount.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-rose-900">
                          {!dep ? `${shop.currency} ${exp.amount.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredList.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                    <td colSpan={6} className="py-2.5 px-3 text-right text-xs uppercase">
                      {isEn ? 'Grand Totals:' : 'সর্বমোট:'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-950 font-black">
                      +{shop.currency} {totalDeposits.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-950 font-black">
                      -{shop.currency} {totalExpenses.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-indigo-50 font-black text-indigo-950 border-t border-indigo-200">
                    <td colSpan={6} className="py-2 px-3 text-right text-xs uppercase">
                      {isEn ? 'Net Balance In Hand:' : 'মোট অবশিষ্ট নগদ ক্যাশ:'}
                    </td>
                    <td colSpan={2} className="py-2 px-3 text-right text-sm font-black">
                      {shop.currency} {netBalance.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Category Breakdown (Compact Summary Box) */}
          {categoryBreakdown.length > 0 && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 print-avoid-break">
              <span className="text-[11px] font-black text-slate-800 uppercase block mb-1.5">
                {isEn ? 'Category-wise Breakdown' : 'খাতভিত্তিক মোট হিসাব সারসংক্ষেপ'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {categoryBreakdown.map(([cat, data]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200"
                  >
                    <div className="truncate pr-2">
                      <span className="font-bold text-slate-800 block truncate">{cat}</span>
                      <span className="text-[10px] text-slate-500">
                        {data.count} {isEn ? 'entries' : 'টি'}
                      </span>
                    </div>
                    <span
                      className={`font-black shrink-0 ${
                        data.isDep ? 'text-emerald-900' : 'text-rose-900'
                      }`}
                    >
                      {data.isDep ? '+' : '-'}
                      {shop.currency} {data.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification & Signature Block */}
          <div className="mt-10 pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs text-slate-700 print-section-footer print-avoid-break">
            <div>
              <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1"></div>
              <p className="font-bold text-slate-900">{isEn ? 'Prepared By' : 'হিসাব প্রস্তুতকারী'}</p>
              <p className="text-[10px] text-slate-500">{isEn ? 'Accountant / Cashier' : 'ক্যাশিয়ার / হিসাবরক্ষক'}</p>
            </div>
            <div>
              <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1"></div>
              <p className="font-bold text-slate-900">{isEn ? 'Verified By' : 'যাচাইকারী'}</p>
              <p className="text-[10px] text-slate-500">{isEn ? 'Shop Manager' : 'দোকান ম্যানেজার'}</p>
            </div>
            <div>
              <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1"></div>
              <p className="font-bold text-slate-900">{isEn ? 'Authorized Signature' : 'স্বত্বাধিকারী স্বাক্ষর'}</p>
              <p className="text-[10px] text-slate-500">{isEn ? 'Owner / Proprietor' : 'মালিক / প্রোপ্রাইটর'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
