import React, { useState, useMemo } from 'react';
import { Shop, Invoice, Language } from '../types';
import { strings } from '../utils/strings';
import { openWhatsAppUrl, createInvoiceWhatsAppMessage, createReadyWhatsAppMessage, shareInvoicePngToWhatsApp } from '../utils/whatsapp';
import { generateInvoiceImageUriAsync } from '../utils/invoiceImage';
import {
  FileText,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Download,
  Upload,
  Ruler,
  Phone,
  Calendar,
  MessageSquareText,
  Share2,
  FolderTree,
  Settings,
  Sparkles,
  Users,
  Clock,
  CheckCircle2,
  Wallet,
  Receipt,
  LayoutGrid,
  Table as TableIcon,
  Check,
  Smartphone,
} from 'lucide-react';

interface DashboardScreenProps {
  shop: Shop;
  invoices: Invoice[];
  catalogItems?: any[];
  tailorRecords?: any[];
  expenses?: any[];
  lang: Language;
  onNavigateToAiManager?: () => void;
  onNavigateToNewOrder: () => void;
  onNavigateToInvoiceDetail: (id: string) => void;
  onNavigateToEditInvoice?: (invoice: Invoice) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onNavigateToSettings?: () => void;
  onOpenPaymentModal: (invoice: Invoice) => void;
  onOpenPrintModal?: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  onOpenVisualGuide?: () => void;
  onOpenInstallGuide?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  onUpdateStatus?: (invoiceId: string, status: Invoice['orderStatus']) => void;
  onSaveInvoice?: (invoice: Invoice) => void;
  onNavigateToNewOrderWithDraft?: (draftInvoice: Invoice) => void;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  shop,
  invoices,
  catalogItems = [],
  tailorRecords = [],
  expenses = [],
  lang,
  onNavigateToAiManager,
  onNavigateToNewOrder,
  onNavigateToInvoiceDetail,
  onNavigateToEditInvoice,
  onEditInvoice,
  onNavigateToSettings,
  onOpenPaymentModal,
  onOpenPrintModal,
  onDeleteInvoice,
  onOpenVisualGuide,
  onOpenInstallGuide,
  onExportBackup,
  onImportBackup,
  onUpdateStatus,
  onSaveInvoice,
  onNavigateToNewOrderWithDraft,
  onShowNotification,
}) => {
  const t = strings[lang] || strings.BN;
  const isEn = lang === 'EN';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);

  const restoreFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleRestoreClick = () => {
    if (restoreFileInputRef.current) {
      restoreFileInputRef.current.click();
    }
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportBackup) {
      onImportBackup(file);
      e.target.value = '';
    }
  };

  const handleSendReadyWhatsApp = (inv: Invoice) => {
    const msg = createReadyWhatsAppMessage(inv, shop, lang);
    openWhatsAppUrl(inv.customerPhone, msg);
  };

  const handleSendInvoicePng = async (inv: Invoice) => {
    setSendingInvoiceId(inv.id);
    try {
      const uri = await generateInvoiceImageUriAsync(inv, shop, lang);
      if (uri) {
        await shareInvoicePngToWhatsApp(inv, shop, uri, false, lang);
      }
    } catch (e) {
      console.warn(e);
      const msg = createInvoiceWhatsAppMessage(inv, shop, lang);
      openWhatsAppUrl(inv.customerPhone, msg);
    } finally {
      setSendingInvoiceId(null);
    }
  };

  // Reliable calculations strictly from existing data
  const totalInvoices = invoices.length;
  const totalPieces = invoices.reduce(
    (acc, inv) => acc + (inv.items ? inv.items.reduce((s, it) => s + it.quantity, 0) : 1),
    0
  );
  const totalSales = invoices.reduce((acc, inv) => acc + (Number(inv.netTotal) || 0), 0);
  const totalAdvance = invoices.reduce((acc, inv) => acc + (Number(inv.advanceDeposit) || 0), 0);
  const remainingDue = invoices.reduce((acc, inv) => acc + (Number(inv.remainingDue) || 0), 0);

  // 1. Total Customers (Unique by phone or name)
  const totalCustomers = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.customerPhone && inv.customerPhone.trim()) {
        set.add(inv.customerPhone.trim());
      } else if (inv.customerName && inv.customerName.trim()) {
        set.add(inv.customerName.trim().toLowerCase());
      }
    });
    return set.size;
  }, [invoices]);

  // 2. Today's Orders & Today's Sales
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDateStr = new Date().toDateString();

  const { todayOrdersCount, todaySales } = useMemo(() => {
    let count = 0;
    let sales = 0;
    invoices.forEach((inv) => {
      const isToday =
        inv.orderDate === todayStr ||
        (inv.createdAt && new Date(inv.createdAt).toDateString() === todayDateStr);
      if (isToday) {
        count += 1;
        sales += Number(inv.advanceDeposit) || 0;
      }
      // Also count any due collection made today
      if (inv.payments && Array.isArray(inv.payments)) {
        inv.payments.forEach((p) => {
          if (
            p.paymentDate === todayStr ||
            (p.createdAt && new Date(p.createdAt).toDateString() === todayDateStr)
          ) {
            if (!isToday) sales += Number(p.amount) || 0;
          }
        });
      }
    });
    return { todayOrdersCount: count, todaySales: sales };
  }, [invoices, todayStr, todayDateStr]);

  // 3. Pending and In Progress Orders
  const pendingOrdersCount = useMemo(() => {
    return invoices.filter((inv) => inv.orderStatus === 'Pending' || inv.orderStatus === 'In Progress')
      .length;
  }, [invoices]);

  // 4. Ready for Pickup
  const readyOrdersCount = useMemo(() => {
    return invoices.filter((inv) => inv.orderStatus === 'Ready for Pickup').length;
  }, [invoices]);

  // 5. Total Expenses
  const totalExpensesSum = useMemo(() => {
    return (expenses || []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [expenses]);

  // 6. Reliable Cash Balance
  const cashBalance = useMemo(() => {
    let totalCashCollected = 0;
    invoices.forEach((inv) => {
      if (inv.payments && inv.payments.length > 0) {
        totalCashCollected += inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      } else {
        totalCashCollected += Number(inv.advanceDeposit) || 0;
      }
    });
    const tailorPaid = (tailorRecords || []).reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);
    return totalCashCollected - totalExpensesSum - tailorPaid;
  }, [invoices, totalExpensesSum, tailorRecords]);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerPhone.includes(searchQuery) ||
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.dressType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'All' || inv.orderStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Invoice['orderStatus']) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Ready for Pickup':
        return 'bg-teal-100 text-teal-900 border-teal-300 ring-1 ring-teal-400 font-black';
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-900 border-slate-300';
    }
  };

  const getStatusLabel = (status: Invoice['orderStatus']) => {
    if (isEn) {
      return status;
    }
    switch (status) {
      case 'Pending':
        return 'পেন্ডিং';
      case 'In Progress':
        return 'কাজ চলছে';
      case 'Ready for Pickup':
        return '✨ কাপড় রেডি';
      case 'Delivered':
        return 'ডেলিভারি সম্পন্ন';
      case 'Cancelled':
        return 'বাতিল';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Shop Banner (Pure Shop Profile - No Buttons) */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-400/30">
                {isEn ? `${shop.currency} Official Tailoring Management` : `${shop.currency} অফিসিয়াল টেইলার্স ম্যানেজমেন্ট`}
              </span>
            </div>
            <h1
              className="mt-2 text-2xl font-black tracking-tight sm:text-3xl"
              style={{ color: shop.profileTextColor || '#ffffff' }}
            >
              {shop.name}
            </h1>
            <p className="text-xs text-slate-300 sm:text-sm">{shop.address} • 📞 {shop.phone}</p>
            <p className="text-xs font-semibold text-amber-300/90">
              {isEn ? `Trade License / CR No: ${shop.crNumber}` : `ট্রেড লাইসেন্স / CR নং: ${shop.crNumber}`}
            </p>
          </div>
        </div>
      </div>

      {/* Professional Desktop Dashboard: 2-Tier KPI Metrics Grid with large, vibrant colorful typography */}
      <div className="space-y-4">
        {/* Tier 1: Today & Active Operations */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Customers */}
          <div className="rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-100/90 via-white to-purple-50/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-purple-400 transition">
            <div className="flex items-center justify-between text-purple-950">
              <span className="text-sm sm:text-base font-black tracking-tight">{isEn ? "Total Customers" : "মোট কাস্টমার"}</span>
              <div className="rounded-xl bg-purple-600 p-2.5 text-white shadow-xs">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-black text-purple-800 tracking-tight">{totalCustomers}</div>
            <span className="text-xs sm:text-sm text-purple-900 font-extrabold mt-1 block">{isEn ? "Active contacts" : "মোট গ্রাহক সংখ্যা"}</span>
          </div>

          {/* Today's Orders */}
          <div className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-100/90 via-white to-sky-50/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-blue-400 transition">
            <div className="flex items-center justify-between text-blue-950">
              <span className="text-sm sm:text-base font-black tracking-tight">{isEn ? "Today's Orders" : "আজকের অর্ডার"}</span>
              <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-black text-blue-800 tracking-tight">{todayOrdersCount}</div>
            <span className="text-xs sm:text-sm text-blue-900 font-extrabold mt-1 block">{isEn ? "Placed today" : "আজ বুকিং হয়েছে"}</span>
          </div>

          {/* Today's Sales */}
          <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-100/90 via-white to-teal-50/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-emerald-400 transition">
            <div className="flex items-center justify-between text-emerald-950">
              <span className="text-sm sm:text-base font-black tracking-tight">{isEn ? "Today's Sales" : "আজকের কালেকশন"}</span>
              <div className="rounded-xl bg-emerald-600 p-2.5 text-white shadow-xs">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-800 tracking-tight">
              {shop.currency} {todaySales.toFixed(2)}
            </div>
            <span className="text-xs sm:text-sm text-emerald-900 font-extrabold mt-1 block">{isEn ? "Cash received today" : "আজ ক্যাশ জমা"}</span>
          </div>

          {/* Pending Orders */}
          <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-100/90 via-white to-yellow-50/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-amber-400 transition">
            <div className="flex items-center justify-between text-amber-950">
              <span className="text-sm sm:text-base font-black tracking-tight">{isEn ? "Pending Orders" : "চলমান কাজ"}</span>
              <div className="rounded-xl bg-amber-500 p-2.5 text-slate-950 shadow-xs font-black">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-black text-amber-800 tracking-tight">{pendingOrdersCount}</div>
            <span className="text-xs sm:text-sm text-amber-900 font-extrabold mt-1 block">{isEn ? "In production" : "পেন্ডিং ও কাটিং চলছে"}</span>
          </div>

          {/* Ready for Pickup */}
          <div className="col-span-2 sm:col-span-1 rounded-2xl border-2 border-teal-300 bg-gradient-to-br from-teal-100/90 via-white to-cyan-50/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-teal-400 transition">
            <div className="flex items-center justify-between text-teal-950">
              <span className="text-sm sm:text-base font-black tracking-tight">{isEn ? "Ready for Pickup" : "কাপড় রেডি"}</span>
              <div className="rounded-xl bg-teal-600 p-2.5 text-white shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-black text-teal-800 tracking-tight">{readyOrdersCount}</div>
            <span className="text-xs sm:text-sm text-teal-900 font-extrabold mt-1 block">{isEn ? "Ready for delivery" : "ডেলিভারির জন্য প্রস্তুত"}</span>
          </div>
        </div>

        {/* Tier 2: Financial Overview & Shop Balance */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Total Invoices */}
          <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-indigo-100/60 p-4 shadow-xs hover:shadow-md hover:border-indigo-400 transition">
            <div className="flex items-center justify-between text-indigo-950">
              <span className="text-xs sm:text-sm font-black">{t.totalInvoices}</span>
              <div className="rounded-lg bg-indigo-600 p-1.5 text-white shadow-xs">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-indigo-800">{totalInvoices}</div>
            <span className="text-xs text-indigo-900 font-bold mt-0.5 block">{totalPieces} {isEn ? "pieces" : "পিস পোশাক"}</span>
          </div>

          {/* Total Sales Value */}
          <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-green-100/60 p-4 shadow-xs hover:shadow-md hover:border-emerald-400 transition">
            <div className="flex items-center justify-between text-emerald-950">
              <span className="text-xs sm:text-sm font-black">{t.totalSales}</span>
              <div className="rounded-lg bg-emerald-600 p-1.5 text-white shadow-xs">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-800">
              {shop.currency} {totalSales.toFixed(0)}
            </div>
            <span className="text-xs text-emerald-900 font-bold mt-0.5 block">{isEn ? "Total order value" : "মোট বিক্রয় মূল্য"}</span>
          </div>

          {/* Total Advance */}
          <div className="rounded-2xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 via-white to-sky-100/60 p-4 shadow-xs hover:shadow-md hover:border-cyan-400 transition">
            <div className="flex items-center justify-between text-cyan-950">
              <span className="text-xs sm:text-sm font-black">{t.totalAdvance}</span>
              <div className="rounded-lg bg-cyan-600 p-1.5 text-white shadow-xs">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-cyan-800">
              {shop.currency} {totalAdvance.toFixed(0)}
            </div>
            <span className="text-xs text-cyan-900 font-bold mt-0.5 block">{isEn ? "Advance deposit" : "মোট অগ্রিম জমা"}</span>
          </div>

          {/* Total Expenses */}
          <div className="rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 via-white to-amber-100/60 p-4 shadow-xs hover:shadow-md hover:border-orange-400 transition">
            <div className="flex items-center justify-between text-orange-950">
              <span className="text-xs sm:text-sm font-black">{isEn ? "Total Expenses" : "মোট খরচ"}</span>
              <div className="rounded-lg bg-orange-600 p-1.5 text-white shadow-xs">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-orange-800">
              {shop.currency} {totalExpensesSum.toFixed(0)}
            </div>
            <span className="text-xs text-orange-900 font-bold mt-0.5 block">{isEn ? "Shop expenses" : "দোকানের সর্বমোট ব্যয়"}</span>
          </div>

          {/* Cash Balance */}
          <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-100/90 via-white to-teal-100/80 p-4 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-emerald-950">
              <span className="text-xs sm:text-sm font-black">{isEn ? "Cash Balance" : "ক্যাশ ব্যালেন্স"}</span>
              <div className="rounded-lg bg-emerald-700 p-1.5 text-white shadow-xs">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className={`mt-2 text-xl sm:text-2xl font-black ${cashBalance >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
              {shop.currency} {cashBalance.toFixed(0)}
            </div>
            <span className="text-xs text-emerald-900 font-bold mt-0.5 block">{isEn ? "Net cash in hand" : "হাতে নগদ ব্যালেন্স"}</span>
          </div>

          {/* Remaining Due (Total Due) - Placed side-by-side with Cash Balance */}
          <div className="rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-white to-pink-100/70 p-4 shadow-xs hover:shadow-md hover:border-rose-400 transition">
            <div className="flex items-center justify-between text-rose-950">
              <span className="text-xs sm:text-sm font-black">{t.remainingDue}</span>
              <div className="rounded-lg bg-rose-600 p-1.5 text-white shadow-xs">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-rose-800">
              {shop.currency} {remainingDue.toFixed(0)}
            </div>
            <span className="text-xs text-rose-900 font-bold mt-0.5 block">{isEn ? "Total receivable" : "কাস্টমারদের বকেয়া"}</span>
          </div>
        </div>
      </div>

      {/* Orders List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2.5">
              <span>{t.recentOrders}</span>
              <span className="rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 px-3 py-0.5 text-xs sm:text-sm font-black">
                {filteredInvoices.length}
              </span>
            </h2>

            {/* View Mode Toggle: Grid vs Table */}
            <div className="hidden sm:flex items-center rounded-2xl bg-slate-100 p-1 border-2 border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black transition ${
                  viewMode === 'grid'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
                title={isEn ? "Card Grid View" : "কার্ড ভিউ"}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>{isEn ? "Cards" : "কার্ড"}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black transition ${
                  viewMode === 'table'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
                title={isEn ? "Desktop Table View" : "টেবিল ভিউ"}
              >
                <TableIcon className="h-4 w-4" />
                <span>{isEn ? "Table" : "টেবিল"}</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-700" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className="w-full rounded-2xl border-2 border-slate-300 bg-white py-2.5 pl-11 pr-4 text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 shadow-sm"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {['All', 'Pending', 'In Progress', 'Ready for Pickup', 'Delivered', 'Cancelled'].map(
            (st) => {
              const isSelected = statusFilter === st;
              let selectedClass = 'bg-slate-900 text-white shadow-xs ring-2 ring-slate-700';
              if (st === 'Pending') selectedClass = 'bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400 font-black';
              else if (st === 'In Progress') selectedClass = 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400 font-black';
              else if (st === 'Ready for Pickup') selectedClass = 'bg-teal-600 text-white shadow-xs ring-2 ring-teal-400 font-black';
              else if (st === 'Delivered') selectedClass = 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400 font-black';
              else if (st === 'Cancelled') selectedClass = 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400 font-black';

              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`whitespace-nowrap rounded-2xl px-4 sm:px-5 py-2 text-xs sm:text-sm font-black transition ${
                    isSelected
                      ? selectedClass
                      : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:text-slate-950 shadow-2xs'
                  }`}
                >
                  {st === 'All'
                    ? isEn
                      ? 'All Orders'
                      : 'সকল অর্ডার'
                    : st === 'Pending'
                    ? isEn
                      ? 'Pending'
                      : 'পেন্ডিং'
                    : st === 'In Progress'
                    ? isEn
                      ? 'In Progress'
                      : 'কাজ চলছে'
                    : st === 'Ready for Pickup'
                    ? isEn
                      ? '✨ Ready'
                      : '✨ কাপড় রেডি'
                    : st === 'Delivered'
                    ? isEn
                      ? 'Delivered'
                      : 'ডেলিভারি'
                    : isEn
                    ? 'Cancelled'
                    : 'বাতিল'}
                </button>
              );
            }
          )}
        </div>

        {/* Invoices List Display */}
        {filteredInvoices.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center text-slate-600">
            <FileText className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <p className="font-black text-slate-900 text-lg">{t.noOrdersFound}</p>
            <p className="text-sm text-slate-600 font-bold mt-1">
              {isEn ? 'Click on "+ New Order" to create a new invoice.' : '+ নতুন অর্ডার বাটনে চাপ দিয়ে ইনভয়েস তৈরি করুন।'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Desktop Table View with large, high-contrast colorful typography */
          <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-b-2 border-slate-200 text-slate-800 font-black">
                  <th className="py-4 px-4">{isEn ? 'Invoice #' : 'ইনভয়েস #'}</th>
                  <th className="py-4 px-4">{isEn ? 'Customer' : 'কাস্টমার'}</th>
                  <th className="py-4 px-4">{isEn ? 'Dress Type' : 'পোশাক'}</th>
                  <th className="py-4 px-4">{isEn ? 'Order Date' : 'অর্ডার তারিখ'}</th>
                  <th className="py-4 px-4">{isEn ? 'Delivery Date' : 'ডেলিভারি তারিখ'}</th>
                  <th className="py-4 px-4 text-right">{isEn ? 'Total' : 'মোট মূল্য'}</th>
                  <th className="py-4 px-4 text-right">{isEn ? 'Due' : 'বকেয়া'}</th>
                  <th className="py-4 px-4 text-center">{isEn ? 'Status' : 'স্ট্যাটাস'}</th>
                  <th className="py-4 px-4 text-right">{isEn ? 'Actions' : 'অ্যাকশন'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-black text-sm sm:text-base text-emerald-800">
                      #{inv.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-black text-sm sm:text-base text-slate-950">{inv.customerName}</div>
                      <div className="text-xs text-slate-600 font-bold flex items-center gap-1 mt-0.5">
                        <Phone className="h-3.5 w-3.5 text-emerald-600" />
                        {inv.customerPhone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-xl bg-purple-50 px-3 py-1 text-xs font-black text-purple-900 border border-purple-200">
                        {inv.dressType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-xs sm:text-sm font-bold">
                      {inv.orderDate}
                    </td>
                    <td className="py-3.5 px-4 text-slate-950 whitespace-nowrap font-black text-xs sm:text-sm">
                      {inv.deliveryDate}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-sm sm:text-base text-slate-950 whitespace-nowrap">
                      {shop.currency} {inv.netTotal.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className={`font-black text-sm sm:text-base ${inv.remainingDue > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                        {shop.currency} {inv.remainingDue.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusBadge(inv.orderStatus)}`}>
                        {getStatusLabel(inv.orderStatus)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onNavigateToInvoiceDetail(inv.id)}
                          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 transition"
                          title={t.view}
                        >
                          <Eye className="h-4 w-4 text-emerald-800" />
                        </button>
                        <button
                          onClick={() => {
                            if (onNavigateToEditInvoice) onNavigateToEditInvoice(inv);
                            else if (onEditInvoice) onEditInvoice(inv);
                          }}
                          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 transition"
                          title={t.edit}
                        >
                          <Edit2 className="h-4 w-4 text-blue-700" />
                        </button>
                        {inv.remainingDue > 0 && (
                          <button
                            onClick={() => onOpenPaymentModal(inv)}
                            className="rounded-lg bg-amber-400 hover:bg-amber-500 px-2.5 py-1 text-xs font-black text-slate-950 transition shadow-2xs"
                            title={isEn ? "Record Due Payment" : "বকেয়া জমা নিন"}
                          >
                            + বকেয়া
                          </button>
                        )}
                        {inv.orderStatus === 'Ready for Pickup' ? (
                          <button
                            onClick={() => handleSendReadyWhatsApp(inv)}
                            className="rounded-lg p-2 text-teal-700 hover:bg-teal-50 transition"
                            title={isEn ? 'Send Dress Ready WhatsApp Message' : 'কাপড় রেডি WhatsApp মেসেজ পাঠান'}
                          >
                            <MessageSquareText className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendInvoicePng(inv)}
                            disabled={sendingInvoiceId === inv.id}
                            className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50 transition"
                            title={isEn ? 'Send PNG Invoice to WhatsApp' : 'WhatsApp এ PNG ইনভয়েস পাঠান'}
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteInvoice(inv)}
                          className="rounded-lg p-2 text-rose-700 hover:bg-rose-100 transition"
                          title={isEn ? 'Delete Invoice' : 'মুছুন'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Responsive Cards Grid (1 col mobile, 2 col tablet, 3 col desktop) */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                className="group relative flex flex-col justify-between rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs transition hover:border-emerald-500 hover:shadow-md"
              >
                <div>
                  {/* Top Bar: ID + Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-800 text-lg">#{inv.id}</span>
                      <span className="rounded-xl bg-purple-50 px-3 py-0.5 text-xs font-black text-purple-900 border border-purple-200">
                        {inv.dressType}
                      </span>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-0.5 text-xs font-black ${getStatusBadge(
                        inv.orderStatus
                      )}`}
                    >
                      {getStatusLabel(inv.orderStatus)}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="mt-3">
                    <h3 className="text-lg font-black text-slate-950 group-hover:text-emerald-800 transition">
                      {inv.customerName}
                    </h3>
                    <p className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 mt-0.5">
                      <Phone className="h-4 w-4 text-emerald-600" />
                      {inv.customerPhone}
                    </p>
                  </div>

                  {/* Dates & Financials Grid */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3.5 border-2 border-slate-100 text-xs sm:text-sm">
                    <div>
                      <span className="text-xs text-slate-500 font-bold block">{t.deliveryDateLabel}</span>
                      <p className="font-black text-slate-950 mt-0.5 flex items-center gap-1 text-xs sm:text-sm">
                        <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                        {inv.deliveryDate}
                      </p>
                    </div>
                    <div className="text-center border-x-2 border-slate-200 px-1">
                      <span className="text-xs text-slate-500 font-bold block">{t.netTotal}</span>
                      <p className="font-black text-slate-950 mt-0.5 text-xs sm:text-sm">
                        {shop.currency} {inv.netTotal.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-bold block">{t.remainingDue}</span>
                      <p
                        className={`font-black mt-0.5 text-xs sm:text-sm ${
                          inv.remainingDue > 0 ? 'text-rose-700' : 'text-emerald-800'
                        }`}
                      >
                        {shop.currency} {inv.remainingDue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t-2 border-slate-100 pt-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onNavigateToInvoiceDetail(inv.id)}
                      className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black text-slate-800 hover:bg-slate-100 transition"
                    >
                      <Eye className="h-4 w-4 text-emerald-800" />
                      {t.view}
                    </button>
                    <button
                      onClick={() => {
                        if (onNavigateToEditInvoice) onNavigateToEditInvoice(inv);
                        else if (onEditInvoice) onEditInvoice(inv);
                      }}
                      className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black text-slate-800 hover:bg-slate-100 transition"
                    >
                      <Edit2 className="h-4 w-4 text-blue-700" />
                      {t.edit}
                    </button>
                    <button
                      onClick={() => onDeleteInvoice(inv)}
                      className="rounded-xl p-2 text-rose-600 hover:bg-rose-50 transition"
                      title={isEn ? 'Delete Invoice' : 'মুছুন'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {inv.remainingDue > 0 && (
                      <button
                        onClick={() => onOpenPaymentModal(inv)}
                        className="rounded-xl bg-amber-400 hover:bg-amber-500 px-3 py-1.5 text-xs sm:text-sm font-black text-slate-950 transition shadow-2xs"
                        title={isEn ? "Record Due Payment" : "বকেয়া জমা নিন"}
                      >
                        {isEn ? '+ Due Pay' : '+ বকেয়া'}
                      </button>
                    )}
                    {inv.orderStatus === 'Ready for Pickup' ? (
                      <button
                        onClick={() => handleSendReadyWhatsApp(inv)}
                        className="flex items-center gap-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 px-3 py-1.5 text-xs sm:text-sm font-black border border-teal-200 transition"
                        title={isEn ? 'Send Dress Ready WhatsApp Message' : 'কাপড় রেডি WhatsApp মেসেজ পাঠান'}
                      >
                        <MessageSquareText className="h-4 w-4 text-teal-600" />
                        <span>Ready</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSendInvoicePng(inv)}
                        disabled={sendingInvoiceId === inv.id}
                        className="flex items-center gap-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs sm:text-sm font-black border border-emerald-200 transition"
                        title={isEn ? 'Send PNG Invoice to WhatsApp' : 'WhatsApp এ PNG ইনভয়েস পাঠান'}
                      >
                        <Share2 className="h-4 w-4 text-emerald-600" />
                        <span>{sendingInvoiceId === inv.id ? '...' : 'WhatsApp'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
