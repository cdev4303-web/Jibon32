import React, { useState, useMemo } from 'react';
import { Shop, Invoice, Expense, TailorRecord, Language } from '../types';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  ShoppingBag,
  Scissors,
  Users,
  Printer,
  Calendar,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface ReportsScreenProps {
  shop: Shop;
  invoices: Invoice[];
  expenses: Expense[];
  tailorRecords: TailorRecord[];
  lang?: Language;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  shop,
  invoices,
  expenses,
  tailorRecords,
  lang = 'BN',
}) => {
  const isEn = lang === 'EN';
  const [filterPeriod, setFilterPeriod] = useState<'thisMonth' | 'lastMonth' | 'all'>('thisMonth');

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Filter invoices based on period
  const filteredInvoices = useMemo(() => {
    if (filterPeriod === 'all') return invoices;
    const targetMonth = filterPeriod === 'thisMonth' ? currentMonthStr : lastMonthStr;
    return invoices.filter((inv) => inv.orderDate.startsWith(targetMonth));
  }, [invoices, filterPeriod, currentMonthStr, lastMonthStr]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    if (filterPeriod === 'all') return expenses;
    const targetMonth = filterPeriod === 'thisMonth' ? currentMonthStr : lastMonthStr;
    return expenses.filter((e) => e.date.startsWith(targetMonth));
  }, [expenses, filterPeriod, currentMonthStr, lastMonthStr]);

  // Filter tailor records
  const filteredTailors = useMemo(() => {
    if (filterPeriod === 'all') return tailorRecords;
    const targetMonth = filterPeriod === 'thisMonth' ? currentMonthStr : lastMonthStr;
    return tailorRecords.filter((t) => t.assignedDate && t.assignedDate.startsWith(targetMonth));
  }, [tailorRecords, filterPeriod, currentMonthStr, lastMonthStr]);

  // Metrics
  const totalSales = filteredInvoices.reduce((s, i) => s + (i.netTotal || 0), 0);
  const totalAdvanceCollected = filteredInvoices.reduce((s, i) => s + (i.advanceDeposit || 0), 0);
  const totalRemainingDue = filteredInvoices.reduce((s, i) => s + (i.remainingDue || 0), 0);
  const totalPieces = filteredInvoices.reduce((s, i) => {
    if (i.items && i.items.length > 0) {
      return s + i.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    }
    return s + 1;
  }, 0);

  const totalExpenseAmount = filteredExpenses
    .filter((e) => e.type === 'Expense' || !e.type)
    .reduce((s, e) => s + (e.amount || 0), 0);

  const totalKarigarWage = filteredTailors.reduce((s, t) => s + (t.totalWage || 0), 0);
  const totalKarigarPaid = filteredTailors.reduce((s, t) => s + (t.paidAmount || 0), 0);

  const estimatedGrossProfit = totalSales - totalExpenseAmount;

  // Dress category distribution
  const dressDistribution = useMemo(() => {
    const counts: { [key: string]: { count: number; totalSales: number } } = {};
    filteredInvoices.forEach((inv) => {
      const type = inv.dressType || 'Other';
      if (!counts[type]) {
        counts[type] = { count: 0, totalSales: 0 };
      }
      counts[type].count += 1;
      counts[type].totalSales += inv.netTotal || 0;
    });

    return Object.entries(counts)
      .map(([type, val]) => ({ type, ...val }))
      .sort((a, b) => b.count - a.count);
  }, [filteredInvoices]);

  // Order status distribution
  const statusCounts = useMemo(() => {
    return {
      Pending: filteredInvoices.filter((i) => i.orderStatus === 'Pending').length,
      InProgress: filteredInvoices.filter((i) => i.orderStatus === 'In Progress').length,
      Ready: filteredInvoices.filter((i) => i.orderStatus === 'Ready for Pickup').length,
      Delivered: filteredInvoices.filter((i) => i.orderStatus === 'Delivered').length,
      Cancelled: filteredInvoices.filter((i) => i.orderStatus === 'Cancelled').length,
    };
  }, [filteredInvoices]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-2xl bg-amber-400 p-2.5 text-slate-950 shadow-md">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {isEn ? 'Business Reports & Analytics' : 'ব্যবসায়িক রিপোর্ট ও হিসাব বিবরণী'}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-300">
              {isEn
                ? 'Overview of revenue, operational expenses, profit analysis, and order volume'
                : 'মাসিক বিক্রি, দোকান খরচ, লাভ-ক্ষতির সারাংশ ও পোশাকের চাহিদার বিস্তারিত বিশ্লেষণ'}
            </p>
          </div>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-white/10 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xs">
          <button
            onClick={() => setFilterPeriod('thisMonth')}
            className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
              filterPeriod === 'thisMonth'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-white hover:bg-white/10'
            }`}
          >
            {isEn ? 'This Month' : 'চলতি মাস'}
          </button>
          <button
            onClick={() => setFilterPeriod('lastMonth')}
            className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
              filterPeriod === 'lastMonth'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-white hover:bg-white/10'
            }`}
          >
            {isEn ? 'Last Month' : 'গত মাস'}
          </button>
          <button
            onClick={() => setFilterPeriod('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
              filterPeriod === 'all'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-white hover:bg-white/10'
            }`}
          >
            {isEn ? 'All Time' : 'সব সময়'}
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {isEn ? 'Total Order Value' : 'মোট বিক্রি (অর্ডার)'}
            </span>
            <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-800">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-950 mt-2">
            {shop.currency} {totalSales.toFixed(2)}
          </p>
          <p className="text-[11px] font-semibold text-emerald-700 mt-1">
            {filteredInvoices.length} টি অর্ডারে {totalPieces} পিস
          </p>
        </div>

        {/* Total Expenses */}
        <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {isEn ? 'Total Shop Expense' : 'দোকানের মোট খরচ'}
            </span>
            <div className="rounded-full bg-rose-100 p-1.5 text-rose-800">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-950 mt-2">
            {shop.currency} {totalExpenseAmount.toFixed(2)}
          </p>
          <p className="text-[11px] font-semibold text-rose-700 mt-1">
            ভাড়া, মালামাল ও পরিচালন ব্যয়
          </p>
        </div>

        {/* Estimated Gross Balance */}
        <div className="rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              {isEn ? 'Estimated Profit' : 'আনুমানিক লাভ / মার্জিন'}
            </span>
            <div className="rounded-full bg-amber-200 p-1.5 text-amber-900">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-950 mt-2">
            {shop.currency} {estimatedGrossProfit.toFixed(2)}
          </p>
          <p className="text-[11px] font-semibold text-amber-800 mt-1">
            (বিক্রি মাইনাস দোকান খরচ)
          </p>
        </div>

        {/* Customer Due */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {isEn ? 'Customer Remaining Due' : 'কাস্টমার মোট বাকি'}
            </span>
            <div className="rounded-full bg-slate-100 p-1.5 text-slate-800">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {shop.currency} {totalRemainingDue.toFixed(2)}
          </p>
          <p className="text-[11px] font-semibold text-emerald-800 mt-1">
            জমা আদায় হয়েছে: {shop.currency} {totalAdvanceCollected.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Breakdown Section: Dress Popularity & Order Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Dress Categories */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-700" />
              {isEn ? 'Top Dress Categories' : 'পোশাকের ধরন অনুযায়ী বিক্রি'}
            </h3>
            <span className="text-xs font-bold text-slate-500">অর্ডার সংখ্যা</span>
          </div>

          <div className="space-y-3">
            {dressDistribution.map((item, idx) => {
              const percentage =
                filteredInvoices.length > 0
                  ? Math.round((item.count / filteredInvoices.length) * 100)
                  : 0;

              return (
                <div key={item.type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800 font-black">
                      {idx + 1}. {item.type}
                    </span>
                    <span className="text-slate-600">
                      {item.count} টি ({percentage}%) • {shop.currency} {item.totalSales.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {dressDistribution.length === 0 && (
              <p className="text-center py-8 text-xs text-slate-400 font-medium">
                {isEn ? 'No order data available for this period.' : 'এই সময়ের কোন অর্ডার ডাটা নেই।'}
              </p>
            )}
          </div>
        </div>

        {/* Order Status Pipeline */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-700" />
              {isEn ? 'Order Delivery Pipeline' : 'অর্ডারের চলমান অবস্থা'}
            </h3>
            <span className="text-xs font-bold text-slate-500">স্ট্যাটাস বিভাজন</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center">
              <Clock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-amber-900">{isEn ? 'Pending' : 'পেন্ডিং অর্ডার'}</p>
              <p className="text-2xl font-black text-amber-950 mt-1">{statusCounts.Pending}</p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-center">
              <Scissors className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-blue-900">{isEn ? 'In Progress' : 'কাটিং/সেলাই চলছে'}</p>
              <p className="text-2xl font-black text-blue-950 mt-1">{statusCounts.InProgress}</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-emerald-900">{isEn ? 'Ready for Pickup' : 'রেডি (ডেলিভারি প্রস্তুত)'}</p>
              <p className="text-2xl font-black text-emerald-950 mt-1">{statusCounts.Ready}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <ShoppingBag className="h-5 w-5 text-slate-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-900">{isEn ? 'Delivered' : 'ডেলিভারি সম্পন্ন'}</p>
              <p className="text-2xl font-black text-slate-950 mt-1">{statusCounts.Delivered}</p>
            </div>
          </div>

          {/* Karigar Wage Summary in Reports */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50 p-3 rounded-2xl">
            <span className="font-bold text-slate-700">কারিগর মোট মজুরি বিল:</span>
            <span className="font-black text-slate-900">
              {shop.currency} {totalKarigarWage.toFixed(2)} (পরিশোধ {shop.currency}{' '}
              {totalKarigarPaid.toFixed(0)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
