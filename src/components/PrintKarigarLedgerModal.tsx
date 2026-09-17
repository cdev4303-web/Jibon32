import React, { useState, useMemo } from 'react';
import { Shop, TailorRecord, KarigarSummary, Language } from '../types';
import { strings } from '../utils/strings';
import { printHtmlElement, exportElementToPdf } from '../utils/print';
import { openWhatsAppUrl, createKarigarStatementWhatsAppMessage } from '../utils/whatsapp';
import { downloadImageFromUri } from '../utils/invoiceImage';
import { captureElementToPng } from '../utils/domCapture';
import { Logo } from './Logo';
import {
  Printer,
  X,
  Users,
  Scissors,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  Filter,
  UserCheck,
  Download,
  FileDown,
  MessageSquare,
  Loader2,
} from 'lucide-react';

interface PrintKarigarLedgerModalProps {
  isOpen: boolean;
  shop: Shop;
  tailorRecords: TailorRecord[];
  groupedKarigars: KarigarSummary[];
  initialTailorName?: string;
  initialTailorPhone?: string;
  initialMode?: 'individual' | 'all_summary';
  lang?: Language;
  onClose: () => void;
}

export const PrintKarigarLedgerModal: React.FC<PrintKarigarLedgerModalProps> = ({
  isOpen,
  shop,
  tailorRecords,
  groupedKarigars,
  initialTailorName,
  initialTailorPhone,
  initialMode = 'all_summary',
  lang = 'BN',
  onClose,
}) => {
  const isEn = lang === 'EN';
  const t = strings[lang];

  // Mode: 'individual' | 'all_summary'
  const [mode, setMode] = useState<'individual' | 'all_summary'>(
    initialTailorName ? 'individual' : initialMode
  );

  // Selected tailor for individual view
  const [selectedTailorKey, setSelectedTailorKey] = useState<string>(
    initialTailorName
      ? `${initialTailorName.trim().toLowerCase()}___${(initialTailorPhone || '').trim().toLowerCase()}`
      : groupedKarigars.length > 0
      ? `${groupedKarigars[0].tailorName.trim().toLowerCase()}___${groupedKarigars[0].tailorPhone.trim().toLowerCase()}`
      : ''
  );

  // Date Filter
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'this_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isDownloading, setIsDownloading] = useState(false);

  // Selected Karigar Object
  const currentKarigar = useMemo(() => {
    if (!selectedTailorKey) return groupedKarigars[0] || null;
    return (
      groupedKarigars.find(
        (k) =>
          `${k.tailorName.trim().toLowerCase()}___${k.tailorPhone.trim().toLowerCase()}` ===
          selectedTailorKey
      ) || groupedKarigars[0] || null
    );
  }, [groupedKarigars, selectedTailorKey]);

  // Filter individual tailor's records by date
  const filteredIndividualRecords = useMemo(() => {
    if (!currentKarigar) return [];
    const todayStr = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];

    return currentKarigar.records
      .filter((r) => {
        if (dateRange === 'today') return r.assignedDate === todayStr;
        if (dateRange === 'this_month')
          return r.assignedDate >= firstDayOfMonth && r.assignedDate <= todayStr;
        if (dateRange === 'custom') {
          if (customStartDate && r.assignedDate < customStartDate) return false;
          if (customEndDate && r.assignedDate > customEndDate) return false;
        }
        return true;
      })
      .sort((a, b) => (a.assignedDate > b.assignedDate ? 1 : -1));
  }, [currentKarigar, dateRange, customStartDate, customEndDate]);

  // Compute individual stats from filtered records
  const individualStats = useMemo(() => {
    let cutting = 0;
    let sewing = 0;
    let pieces = 0;
    let wage = 0;
    let paid = 0;

    filteredIndividualRecords.forEach((r) => {
      const cPcs = r.cuttingPieces || (r.workType === 'Cutting' ? r.pieces : 0);
      const sPcs = r.sewingPieces || (r.workType === 'Sewing' ? r.pieces : 0);
      const tPcs = r.pieces || cPcs + sPcs || 1;
      const w = r.totalWage || tPcs * (r.ratePerPiece || 0);
      const p = r.paidAmount || 0;

      cutting += cPcs;
      sewing += sPcs;
      pieces += tPcs;
      wage += w;
      paid += p;
    });

    return {
      cutting,
      sewing,
      pieces,
      wage,
      paid,
      due: wage - paid,
      count: filteredIndividualRecords.length,
    };
  }, [filteredIndividualRecords]);

  // Overall shop grand totals for all karigars
  const overallTotals = useMemo(() => {
    let cutting = 0;
    let sewing = 0;
    let pieces = 0;
    let wage = 0;
    let paid = 0;
    let due = 0;

    groupedKarigars.forEach((kg) => {
      cutting += kg.totalCuttingPieces;
      sewing += kg.totalSewingPieces;
      pieces += kg.totalPieces;
      wage += kg.totalWage;
      paid += kg.totalPaid;
      due += kg.totalDue;
    });

    return {
      karigarCount: groupedKarigars.length,
      cutting,
      sewing,
      pieces,
      wage,
      paid,
      due,
    };
  }, [groupedKarigars]);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen) return null;

  const getPdfFilename = () =>
    mode === 'individual' && currentKarigar
      ? `Karigar_${currentKarigar.tailorName.replace(/\s+/g, '_')}_Statement.pdf`
      : `Karigars_Master_Payroll_Sheet_${shop.name.replace(/\s+/g, '_')}.pdf`;

  const handlePrint = async () => {
    const title =
      mode === 'individual' && currentKarigar
        ? `${currentKarigar.tailorName} - Karigar Statement`
        : `${shop.name} - Karigars Payroll Master Sheet`;
    try {
      setIsPrinting(true);
      await printHtmlElement('printable-karigar-area', title);
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    const title =
      mode === 'individual' && currentKarigar
        ? `${currentKarigar.tailorName} - Karigar Statement`
        : `${shop.name} - Karigars Payroll Master Sheet`;
    try {
      setIsDownloadingPdf(true);
      await exportElementToPdf('printable-karigar-area', {
        filename: getPdfFilename(),
        title,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    const el = document.getElementById('printable-karigar-area');
    if (!el) return;

    try {
      setIsDownloading(true);
      const uri = await captureElementToPng(el, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const filename =
        mode === 'individual' && currentKarigar
          ? `Karigar_${currentKarigar.tailorName.replace(/\s+/g, '_')}_Statement.png`
          : `Karigars_Master_Payroll_Sheet_${shop.name.replace(/\s+/g, '_')}.png`;

      downloadImageFromUri(uri, filename);
    } catch (err) {
      console.error('Failed to capture statement image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!currentKarigar) return;

    const message = createKarigarStatementWhatsAppMessage(
      currentKarigar.tailorName,
      {
        pieces: individualStats.pieces,
        cutting: individualStats.cutting,
        sewing: individualStats.sewing,
        wage: individualStats.wage,
        paid: individualStats.paid,
        due: individualStats.due,
        period: getPeriodLabel(),
      },
      shop,
      lang as 'EN' | 'BN'
    );

    openWhatsAppUrl(currentKarigar.tailorPhone || '', message);
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
              <Printer className="h-5 w-5 text-indigo-400 shrink-0" />
              <span className="font-bold text-xs sm:text-sm truncate">
                {isEn ? 'Karigar Ledger Printable Statement' : 'কারিগর কাজের খাতা ও মজুরি প্রিন্ট শিট'}
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
            {/* Direct Print Button - Royal Indigo */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition active:scale-95 disabled:opacity-60 cursor-pointer"
              title={isEn ? 'Print or Save via Browser Dialog' : 'সরাসরি প্রিন্ট বা ডায়ালগ বক্স'}
            >
              {isPrinting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5" />
              )}
              <span>{isPrinting ? (isEn ? 'Printing...' : 'প্রিন্ট হচ্ছে...') : (isEn ? 'Print' : 'প্রিন্ট')}</span>
            </button>

            {/* Download HD Image - Sky/Slate */}
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

            {/* WhatsApp Share (for individual karigar) - Emerald */}
            {mode === 'individual' && currentKarigar && (
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition active:scale-95"
                title={isEn ? 'Share on WhatsApp' : 'হোয়াটসঅ্যাপে পাঠান'}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{isEn ? 'WhatsApp' : 'হোয়াটসঅ্যাপ'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Toolbar & Filter Bar (Hidden when printing) */}
        <div className="border-b border-slate-200 bg-slate-50 p-4 print:hidden space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMode('all_summary')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  mode === 'all_summary'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>{isEn ? 'All Karigars Summary' : 'সকল কারিগরের সমন্বিত শিট'}</span>
              </button>

              <button
                onClick={() => setMode('individual')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  mode === 'individual'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>{isEn ? 'Single Karigar Statement' : 'একক কারিগরের হিসাব খাতা'}</span>
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
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                {isEn ? 'All' : 'সব'}
              </button>
              <button
                onClick={() => setDateRange('today')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  dateRange === 'today'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                {isEn ? 'Today' : 'আজ'}
              </button>
              <button
                onClick={() => setDateRange('this_month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  dateRange === 'this_month'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                {isEn ? 'This Month' : 'চলতি মাস'}
              </button>
              <button
                onClick={() => setDateRange('custom')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  dateRange === 'custom'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                {isEn ? 'Custom' : 'কাস্টম'}
              </button>
            </div>
          </div>

          {/* Individual Karigar Selection (Shown when mode is 'individual') */}
          {mode === 'individual' && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">
                  {isEn ? 'Select Tailor:' : 'কারিগরের নাম সিলেক্ট করুন:'}
                </span>
                <select
                  value={selectedTailorKey}
                  onChange={(e) => setSelectedTailorKey(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                >
                  {groupedKarigars.map((k) => (
                    <option
                      key={`${k.tailorName}_${k.tailorPhone}`}
                      value={`${k.tailorName.trim().toLowerCase()}___${k.tailorPhone.trim().toLowerCase()}`}
                    >
                      {k.tailorName} ({k.tailorPhone || 'No Phone'}) — Due: {shop.currency}{' '}
                      {k.totalDue.toFixed(0)}
                    </option>
                  ))}
                </select>
              </div>

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
            </div>
          )}
        </div>

        {/* Printable Statement Sheet Area */}
        <div
          id="printable-karigar-area"
          className="overflow-y-auto p-6 sm:p-8 text-slate-900 print:overflow-visible print:p-0 print-invoice"
        >
          {/* Shop Letterhead Header */}
          <div className="border-b-2 border-indigo-900 pb-3.5 flex items-center justify-between gap-4 print-section-header print-avoid-break">
            <div className="flex items-center gap-3">
              <Logo size="lg" />
              <div>
                <h1 className="text-2xl font-black tracking-wide text-indigo-950">{shop.name}</h1>
                <p className="text-xs text-slate-700 mt-0.5">
                  {shop.address} | Tel: {shop.phone} | {shop.crNumber.trim().toUpperCase().startsWith('CR') ? shop.crNumber.trim() : `CR: ${shop.crNumber.trim()}`}
                </p>
              </div>
            </div>
            <div className="text-right border-l border-slate-300 pl-4 print-avoid-break">
              <span className="inline-block rounded-md bg-indigo-950 text-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wider">
                {mode === 'individual'
                  ? isEn
                    ? 'Karigar Account Statement'
                    : 'কারিগর কাজের হিসাব খাতা ও রশিদ'
                  : isEn
                  ? 'Karigars Payroll & Work Master Sheet'
                  : 'সকল কারিগরদের মজুরি ও কাজের মাস্টার শিট'}
              </span>
              <p className="text-xs text-slate-700 mt-1 font-semibold">
                {isEn ? 'Period: ' : 'সময়কাল: '} <span className="font-bold text-slate-950">{getPeriodLabel()}</span>
              </p>
              <p className="text-[11px] text-slate-600">
                {isEn ? 'Generated on: ' : 'প্রস্তুতের তারিখ: '} {new Date().toLocaleString()}
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MODE 1: INDIVIDUAL KARIGAR STATEMENT                                     */}
          {/* ========================================================================= */}
          {mode === 'individual' && currentKarigar && (
            <div className="mt-4 space-y-4">
              {/* Karigar Profile Box */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                    {isEn ? 'Karigar / Tailor Details' : 'কারিগরের পরিচিতি ও তথ্য'}
                  </span>
                  <h2 className="text-base font-black text-slate-950 mt-0.5">{currentKarigar.tailorName}</h2>
                  <p className="text-xs text-slate-700 font-semibold">
                    {isEn ? 'Mobile: ' : 'মোবাইল: '} {currentKarigar.tailorPhone || (isEn ? 'N/A' : 'উল্লেখ নেই')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    {isEn ? 'Account Status' : 'হিসাবের স্থিতি'}
                  </span>
                  <span
                    className={`inline-block rounded-full px-3 py-0.5 text-xs font-black border mt-1 ${
                      individualStats.due > 0
                        ? 'bg-rose-100 text-rose-950 border-rose-300'
                        : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    }`}
                  >
                    {individualStats.due > 0
                      ? `${isEn ? 'Due Payable: ' : 'বাকি পাওনা: '} ${shop.currency} ${individualStats.due.toFixed(2)}`
                      : isEn
                      ? 'Fully Settled (পরিশোধিত)'
                      : 'সম্পূর্ণ পরিশোধিত'}
                  </span>
                </div>
              </div>

              {/* KPI Summary Grid */}
              <div className="grid grid-cols-4 gap-2.5 text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold text-slate-600 block">
                    {isEn ? 'Total Work Pieces' : 'মোট পোশাক (পিস)'}
                  </span>
                  <p className="text-base font-black text-slate-900 mt-0.5">{individualStats.pieces} pcs</p>
                  <span className="text-[9px] text-slate-500">
                    ({individualStats.cutting} Cut + {individualStats.sewing} Sew)
                  </span>
                </div>

                <div className="rounded-xl border border-blue-300 bg-blue-50/70 p-2.5">
                  <span className="text-[10px] font-bold text-blue-950 block">
                    {isEn ? 'Total Wages Earned' : 'মোট অর্জিত মজুরি'}
                  </span>
                  <p className="text-base font-black text-blue-950 mt-0.5">
                    {shop.currency} {individualStats.wage.toFixed(2)}
                  </p>
                  <span className="text-[9px] text-blue-800 font-medium">
                    {individualStats.count} {isEn ? 'tasks' : 'টি কাজ'}
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-2.5">
                  <span className="text-[10px] font-bold text-emerald-950 block">
                    {isEn ? 'Money Paid / Advance' : 'টাকা নেওয়া / পরিশোধ'}
                  </span>
                  <p className="text-base font-black text-emerald-950 mt-0.5">
                    {shop.currency} {individualStats.paid.toFixed(2)}
                  </p>
                  <span className="text-[9px] text-emerald-800 font-medium">
                    {isEn ? 'Advance given' : 'অগ্রিম প্রদান'}
                  </span>
                </div>

                <div className="rounded-xl border-2 border-rose-400 bg-rose-50/90 p-2.5">
                  <span className="text-[10px] font-black text-rose-950 block">
                    {isEn ? 'Net Due Balance' : 'মোট বাকি পাওনা'}
                  </span>
                  <p className="text-base font-black text-rose-950 mt-0.5">
                    {shop.currency} {individualStats.due.toFixed(2)}
                  </p>
                  <span className="text-[9px] text-rose-900 font-bold">
                    {isEn ? 'To be paid' : 'প্রদেয় বকেয়া'}
                  </span>
                </div>
              </div>

              {/* Itemized Work & Advance Table */}
              <div className="mt-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  {isEn ? 'Itemized Work Record & Advance Entries' : 'কাজের বিস্তারিত তালিকা ও টাকা নেওয়ার বিবরণ'}
                </h3>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-indigo-950 text-white font-bold">
                      <th className="py-2 px-2.5 text-center w-8">#</th>
                      <th className="py-2 px-3 text-left w-24">{t.date}</th>
                      <th className="py-2 px-3 text-left">{isEn ? 'Dress / Task' : 'পোশাক ও অর্ডার'}</th>
                      <th className="py-2 px-3 text-left w-28">{isEn ? 'Work Type' : 'কাজের ধরন'}</th>
                      <th className="py-2 px-3 text-center w-16">{isEn ? 'Pcs' : 'পরিমাণ'}</th>
                      <th className="py-2 px-3 text-right w-20">{isEn ? 'Rate' : 'রেট'}</th>
                      <th className="py-2 px-3 text-right w-24">{isEn ? 'Wage (+)' : 'মজুরি (+)'}</th>
                      <th className="py-2 px-3 text-right w-24">{isEn ? 'Paid (-)' : 'পরিশোধ (-)'}</th>
                      <th className="py-2 px-3 text-right w-24">{isEn ? 'Balance' : 'বকেয়া'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIndividualRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-8 text-center text-slate-500 font-semibold border-b border-slate-200"
                        >
                          {isEn ? 'No records found for this tailor.' : 'এই কারিগরের কোনো কাজের রেকর্ড পাওয়া যায়নি।'}
                        </td>
                      </tr>
                    ) : (
                      filteredIndividualRecords.map((r, idx) => {
                        const cPcs = r.cuttingPieces || 0;
                        const sPcs = r.sewingPieces || 0;
                        const w = r.totalWage || r.pieces * r.ratePerPiece;
                        const p = r.paidAmount || 0;
                        const d = r.balanceDue !== undefined ? r.balanceDue : w - p;
                        return (
                          <tr key={r.id || idx} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="py-2 px-2.5 text-center font-semibold text-slate-600">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{r.assignedDate}</td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-900 block">{r.dressType}</span>
                              {r.invoiceId && (
                                <span className="text-[10px] text-slate-600">
                                  Inv #{r.invoiceId} {r.customerName ? `• ${r.customerName}` : ''}
                                </span>
                              )}
                              {r.notes && (
                                <span className="text-[10px] text-slate-500 italic block">{r.notes}</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <span className="inline-block rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-bold text-indigo-900">
                                {r.workType || 'Cutting & Sewing'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-black text-slate-900">
                              {r.pieces}
                              {(cPcs > 0 || sPcs > 0) && (
                                <span className="block text-[9px] text-slate-500 font-normal">
                                  (C:{cPcs}/S:{sPcs})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-700 font-medium">
                              {r.ratePerPiece.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-blue-900">
                              {shop.currency} {w.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-emerald-900">
                              {p > 0 ? `${shop.currency} ${p.toFixed(2)}` : '—'}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-black ${
                                d > 0 ? 'text-rose-900' : 'text-slate-600'
                              }`}
                            >
                              {shop.currency} {d.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredIndividualRecords.length > 0 && (
                    <tfoot>
                      <tr className="bg-indigo-50 font-black text-indigo-950 border-t-2 border-indigo-400">
                        <td colSpan={4} className="py-2.5 px-3 text-right text-xs uppercase">
                          {isEn ? 'Total Aggregate:' : 'সর্বমোট হিসাব:'}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs font-black">
                          {individualStats.pieces} pcs
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs">—</td>
                        <td className="py-2.5 px-3 text-right text-blue-950 font-black">
                          {shop.currency} {individualStats.wage.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-950 font-black">
                          {shop.currency} {individualStats.paid.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-950 font-black text-sm">
                          {shop.currency} {individualStats.due.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Tailor & Owner Signature Blocks */}
              <div className="mt-10 pt-4 border-t border-slate-300 grid grid-cols-2 gap-12 text-center text-xs text-slate-700 print-section-footer print-avoid-break">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1"></div>
                  <p className="font-bold text-slate-900">{isEn ? "Karigar's Signature" : 'কারিগরের স্বাক্ষর'}</p>
                  <p className="text-[10px] text-slate-500">
                    {currentKarigar.tailorName} ({isEn ? 'Received & Agreed' : 'হিসাব বুঝিয়া পাইলাম'})
                  </p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1"></div>
                  <p className="font-bold text-slate-900">
                    {isEn ? "Shop Owner / Manager Signature" : 'দোকান মালিক / ম্যানেজার স্বাক্ষর'}
                  </p>
                  <p className="text-[10px] text-slate-500">{shop.name}</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: ALL KARIGARS MASTER SUMMARY SHEET                                */}
          {/* ========================================================================= */}
          {mode === 'all_summary' && (
            <div className="mt-4 space-y-4">
              {/* Overall KPI Boxes */}
              <div className="grid grid-cols-4 gap-2.5 text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold text-slate-600 block">
                    {isEn ? 'Total Karigars' : 'মোট কারিগর সংখ্যা'}
                  </span>
                  <p className="text-base font-black text-slate-900 mt-0.5">{overallTotals.karigarCount}</p>
                  <span className="text-[9px] text-slate-500">
                    {overallTotals.pieces} {isEn ? 'total pcs' : 'মোট পিস'}
                  </span>
                </div>

                <div className="rounded-xl border border-blue-300 bg-blue-50/70 p-2.5">
                  <span className="text-[10px] font-bold text-blue-950 block">
                    {isEn ? 'Gross Wages Earned' : 'মোট অর্জিত মজুরি'}
                  </span>
                  <p className="text-base font-black text-blue-950 mt-0.5">
                    {shop.currency} {overallTotals.wage.toFixed(2)}
                  </p>
                  <span className="text-[9px] text-blue-800 font-medium">
                    {overallTotals.cutting} Cut + {overallTotals.sewing} Sew
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-2.5">
                  <span className="text-[10px] font-bold text-emerald-950 block">
                    {isEn ? 'Total Advances Paid' : 'মোট টাকা পরিশোধ'}
                  </span>
                  <p className="text-base font-black text-emerald-950 mt-0.5">
                    {shop.currency} {overallTotals.paid.toFixed(2)}
                  </p>
                  <span className="text-[9px] text-emerald-800 font-medium">
                    {isEn ? 'Advances given' : 'অগ্রিম প্রদান'}
                  </span>
                </div>

                <div className="rounded-xl border-2 border-rose-400 bg-rose-50/90 p-2.5">
                  <span className="text-[10px] font-black text-rose-950 block">
                    {isEn ? 'Total Balance Payable' : 'মোট বকেয়া পাওনা'}
                  </span>
                  <p className="text-base font-black text-rose-950 mt-0.5">
                    {shop.currency} {overallTotals.due.toFixed(2)}
                  </p>
                  <span className="text-[9px] text-rose-900 font-bold">
                    {isEn ? 'Total due to tailors' : 'কারিগরদের প্রদেয়'}
                  </span>
                </div>
              </div>

              {/* Master Summary Table of All Karigars */}
              <div className="mt-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  {isEn
                    ? 'Karigar Payroll & Due Summary Table (Grouped by Tailor Name & Phone)'
                    : 'সকল কারিগরের সমন্বিত কাজের হিসাব ও বকেয়া তালিকা (নাম ও ফোন অনুযায়ী)'}
                </h3>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-indigo-950 text-white font-bold">
                      <th className="py-2 px-2.5 text-center w-8">#</th>
                      <th className="py-2 px-3 text-left">{isEn ? 'Karigar Name' : 'কারিগরের নাম'}</th>
                      <th className="py-2 px-3 text-left w-28">{isEn ? 'Mobile Phone' : 'মোবাইল নম্বর'}</th>
                      <th className="py-2 px-2.5 text-center w-16">{isEn ? 'Cut Pcs' : 'কাটিং'}</th>
                      <th className="py-2 px-2.5 text-center w-16">{isEn ? 'Sew Pcs' : 'সেলাই'}</th>
                      <th className="py-2 px-2.5 text-center w-16">{isEn ? 'Total Pcs' : 'মোট পিস'}</th>
                      <th className="py-2 px-3 text-right w-28">{isEn ? 'Total Wage' : 'মোট মজুরি'}</th>
                      <th className="py-2 px-3 text-right w-28">{isEn ? 'Total Paid' : 'টাকা পরিশোধ'}</th>
                      <th className="py-2 px-3 text-right w-28">{isEn ? 'Balance Due' : 'বকেয়া পাওনা'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedKarigars.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-8 text-center text-slate-500 font-semibold border-b border-slate-200"
                        >
                          {isEn ? 'No karigar records found.' : 'কোনো কারিগর রেকর্ড পাওয়া যায়নি।'}
                        </td>
                      </tr>
                    ) : (
                      groupedKarigars.map((kg, idx) => (
                        <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-2.5 px-2.5 text-center font-semibold text-slate-600">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {kg.tailorName}
                            <span className="block text-[10px] text-slate-500 font-normal">
                              {kg.recordCount} {isEn ? 'work entries' : 'টি কাজের এন্ট্রি'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {kg.tailorPhone || '—'}
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-slate-800 font-semibold">
                            {kg.totalCuttingPieces}
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-slate-800 font-semibold">
                            {kg.totalSewingPieces}
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-black text-slate-950">
                            {kg.totalPieces}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-blue-950">
                            {shop.currency} {kg.totalWage.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-950">
                            {shop.currency} {kg.totalPaid.toFixed(2)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-black ${
                              kg.totalDue > 0 ? 'text-rose-950' : 'text-slate-600'
                            }`}
                          >
                            {shop.currency} {kg.totalDue.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {groupedKarigars.length > 0 && (
                    <tfoot>
                      <tr className="bg-indigo-50 font-black text-indigo-950 border-t-2 border-indigo-400">
                        <td colSpan={3} className="py-2.5 px-3 text-right text-xs uppercase">
                          {isEn ? 'Master Grand Totals:' : 'সর্বমোট গ্র্যান্ড টোটাল:'}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-black">{overallTotals.cutting}</td>
                        <td className="py-2.5 px-2.5 text-center font-black">{overallTotals.sewing}</td>
                        <td className="py-2.5 px-2.5 text-center font-black">{overallTotals.pieces}</td>
                        <td className="py-2.5 px-3 text-right text-blue-950 font-black">
                          {shop.currency} {overallTotals.wage.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-950 font-black">
                          {shop.currency} {overallTotals.paid.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-950 font-black text-sm">
                          {shop.currency} {overallTotals.due.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Master Sheet Signatures */}
              <div className="mt-10 pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs text-slate-700 print-section-footer print-avoid-break">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1"></div>
                  <p className="font-bold text-slate-900">{isEn ? 'Prepared By' : 'হিসাব প্রস্তুতকারী'}</p>
                  <p className="text-[10px] text-slate-500">{isEn ? 'Accountant / Cashier' : 'ক্যাশিয়ার / হিসাবরক্ষক'}</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1"></div>
                  <p className="font-bold text-slate-900">{isEn ? 'Cutting Master / Foreman' : 'কাটিং মাস্টার / ফোরম্যান'}</p>
                  <p className="text-[10px] text-slate-500">{isEn ? 'Work Supervisor' : 'কাজের তদারককারী'}</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-3/4 mb-1"></div>
                  <p className="font-bold text-slate-900">{isEn ? 'Proprietor Signature' : 'স্বত্বাধিকারী স্বাক্ষর'}</p>
                  <p className="text-[10px] text-slate-500">{shop.name}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
