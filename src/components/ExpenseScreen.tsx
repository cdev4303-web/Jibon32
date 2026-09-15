import React, { useState } from 'react';
import { Shop, Expense, Language } from '../types';
import { strings } from '../utils/strings';
import { getStoredExpenseCategories } from '../utils/storage';
import {
  Plus,
  DollarSign,
  Trash2,
  Edit2,
  X,
  Check,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Filter,
  Search,
  Printer,
} from 'lucide-react';
import { PrintExpenseLedgerModal } from './PrintExpenseLedgerModal';

interface ExpenseScreenProps {
  shop: Shop;
  expenses: Expense[];
  lang: Language;
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
}

export const ExpenseScreen: React.FC<ExpenseScreenProps> = ({
  shop,
  expenses,
  lang,
  onSaveExpense,
  onDeleteExpense,
}) => {
  const t = strings[lang] || strings.BN;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form State
  const [entryType, setEntryType] = useState<'Expense' | 'Deposit'>('Expense');
  const [category, setCategory] = useState<string>('Fabric');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [person, setPerson] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptPhotoUri, setReceiptPhotoUri] = useState<string | undefined>(undefined);

  // Filter State
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const storedCats = getStoredExpenseCategories();

  const expenseCategories = [
    ...storedCats.map((c) => ({ en: c, bn: c })),
    { en: 'Fabric', bn: 'কাপড় ক্রয় (Fabric)' },
    { en: 'Thread & Buttons', bn: 'সুতা ও বোতাম (Thread & Buttons)' },
    { en: 'Lace & Accessories', bn: 'লেস ও এক্সেসরিজ (Lace & Accessories)' },
    { en: 'Tailor Wages', bn: 'কারিগর মজুরি (Tailor Wages)' },
    { en: 'Shop Rent', bn: 'দোকান / কারখানা ভাড়া (Shop Rent)' },
    { en: 'Electricity & Utility', bn: 'বিদ্যুৎ ও অন্যান্য বিল (Electricity & Utility)' },
    { en: 'Tea & Refreshment', bn: 'নাস্তা ও আপ্যায়ন (Tea & Refreshment)' },
    { en: 'Maintenance & Repairs', bn: 'মেরামত ও রক্ষণাবেক্ষণ (Maintenance)' },
    { en: 'Other Expense', bn: 'অন্যান্য খরচ (Other Expense)' },
  ].filter((v, idx, arr) => arr.findIndex((t) => t.en === v.en) === idx);

  const depositCategories = [
    { en: 'Cash Deposit (Register)', bn: 'দোকানে নগদ ক্যাশ জমা (Cash Deposit)' },
    { en: 'Owner Capital', bn: 'মালিকের মূলধন জমা (Owner Capital)' },
    { en: 'Direct Cash Sales', bn: 'সরাসরি ক্যাশ বিক্রি জমা (Direct Cash Sales)' },
    { en: 'Customer Advance', bn: 'কাস্টমার অগ্রিম জমা (Customer Advance)' },
    { en: 'Bank Withdrawal to Cash', bn: 'ব্যাংক থেকে ক্যাশ তোলা (Bank Withdrawal)' },
    { en: 'Other Deposit', bn: 'অন্যান্য জমা (Other Deposit)' },
  ];

  const openAdd = (type: 'Expense' | 'Deposit' = 'Expense') => {
    setEditingExpense(null);
    setEntryType(type);
    setCategory(type === 'Deposit' ? 'Cash Deposit (Register)' : 'Fabric');
    setDescription('');
    setAmountStr('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Cash');
    setPerson('');
    setNotes('');
    setReceiptPhotoUri(undefined);
    setIsModalOpen(true);
  };

  const openEdit = (exp: Expense) => {
    const isDep = exp.type === 'Deposit' || exp.category === 'Cash Deposit' || exp.category === 'Owner Capital' || exp.category === 'Direct Sales' || exp.category === 'Customer Advance';
    setEditingExpense(exp);
    setEntryType(isDep ? 'Deposit' : 'Expense');
    setCategory(exp.category);
    setDescription(exp.description);
    setAmountStr(exp.amount.toString());
    setDate(exp.date);
    setPaymentMethod(exp.paymentMethod || 'Cash');
    setPerson(exp.person || '');
    setNotes(exp.notes || '');
    setReceiptPhotoUri(exp.receiptPhotoUri);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const amount = parseFloat(amountStr) || 0;
    const exp: Expense = {
      id: editingExpense?.id || `exp-${Date.now()}`,
      shopId: shop.id,
      type: entryType,
      category,
      description: description.trim(),
      amount,
      date,
      paymentMethod,
      person: person.trim(),
      notes: notes.trim(),
      receiptPhotoUri,
      createdAt: editingExpense?.createdAt || Date.now(),
    };

    onSaveExpense(exp);
    setIsModalOpen(false);
  };

  // Helper calculation
  const isDeposit = (e: Expense) => e.type === 'Deposit' || e.category === 'Cash Deposit' || e.category === 'Owner Capital' || e.category === 'Direct Sales' || e.category === 'Customer Advance';

  const totalDeposits = expenses.filter(isDeposit).reduce((acc, e) => acc + e.amount, 0);
  const totalExpenses = expenses.filter((e) => !isDeposit(e)).reduce((acc, e) => acc + e.amount, 0);
  const netCashBalance = totalDeposits - totalExpenses;

  // Filtered List
  const filteredExpenses = expenses.filter((e) => {
    const dep = isDeposit(e);
    if (filterType === 'deposit' && !dep) return false;
    if (filterType === 'expense' && dep) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = e.description?.toLowerCase().includes(q);
      const matchCat = e.category?.toLowerCase().includes(q);
      const matchPerson = e.person?.toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchPerson) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{t.expenses}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'EN'
              ? 'Keep record of daily shop expenses and cash deposits in the cash register.'
              : 'দোকানের কাপড় কেনা, সুতা, বোতাম, কারখানা ভাড়া এবং ক্যাশ বাক্সে নগদ ক্যাশ জমার নির্ভুল হিসাব রাখুন।'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Print Statement Button */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95"
            title={lang === 'EN' ? 'Print Statement' : 'হিসাব প্রিন্ট করুন'}
          >
            <Printer className="h-4 w-4 text-emerald-400" />
            <span>{lang === 'EN' ? 'Print Statement' : 'হিসাব প্রিন্ট'}</span>
          </button>

          {/* Add Cash Deposit Button */}
          <button
            onClick={() => openAdd('Deposit')}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95"
          >
            <ArrowDownCircle className="h-4 w-4" />
            <span>{lang === 'EN' ? '+ Cash Deposit' : '+ ক্যাশ জমা'}</span>
          </button>

          {/* Add Expense Button */}
          <button
            onClick={() => openAdd('Expense')}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95"
          >
            <ArrowUpCircle className="h-4 w-4" />
            <span>{lang === 'EN' ? '+ Shop Expense' : '+ দোকান খরচ'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Cash Deposits */}
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">{t.totalDeposits}</span>
            <ArrowDownCircle className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">
            +{shop.currency} {totalDeposits.toFixed(2)}
          </p>
          <span className="text-[11px] text-emerald-800 font-semibold">
            {expenses.filter(isDeposit).length} {lang === 'EN' ? 'deposit entries' : 'টি জমার এন্ট্রি'}
          </span>
        </div>

        {/* Total Expenses */}
        <div className="rounded-2xl border border-rose-300 bg-rose-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900">{t.totalExpenses}</span>
            <ArrowUpCircle className="h-4 w-4 text-rose-700" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-950">
            -{shop.currency} {totalExpenses.toFixed(2)}
          </p>
          <span className="text-[11px] text-rose-800 font-semibold">
            {expenses.filter((e) => !isDeposit(e)).length} {lang === 'EN' ? 'expense entries' : 'টি খরচের এন্ট্রি'}
          </span>
        </div>

        {/* Net Cash Balance in Hand */}
        <div className="rounded-2xl border border-indigo-300 bg-indigo-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900">{t.netCashBalance}</span>
            <Wallet className="h-4 w-4 text-indigo-700" />
          </div>
          <p className={`mt-2 text-2xl font-black ${netCashBalance >= 0 ? 'text-indigo-950' : 'text-rose-700'}`}>
            {shop.currency} {netCashBalance.toFixed(2)}
          </p>
          <span className="text-[11px] text-indigo-800 font-semibold">
            {lang === 'EN' ? 'Deposits minus Expenses' : 'জমা থেকে খরচ বাদ দিয়ে অবশিষ্ট'}
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t.allTransactions} ({expenses.length})
          </button>
          <button
            onClick={() => setFilterType('deposit')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              filterType === 'deposit'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <ArrowDownCircle className="h-3.5 w-3.5" />
            {t.onlyDeposits} ({expenses.filter(isDeposit).length})
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              filterType === 'expense'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            <ArrowUpCircle className="h-3.5 w-3.5" />
            {t.onlyExpenses} ({expenses.filter((e) => !isDeposit(e)).length})
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'EN' ? 'Search description, category...' : 'বিবরণ বা ক্যাটাগরি খুঁজুন...'}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none focus:border-slate-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-black border-b border-slate-200">
                <th className="py-3 px-4">{t.date}</th>
                <th className="py-3 px-4">{t.entryType}</th>
                <th className="py-3 px-4">{t.category}</th>
                <th className="py-3 px-4">{t.description}</th>
                <th className="py-3 px-4">{t.paymentMethodLabel}</th>
                <th className="py-3 px-4 text-right">{t.amount} ({shop.currency})</th>
                <th className="py-3 px-4 text-right">{lang === 'EN' ? 'Action' : 'একশন'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 font-bold">
                    {t.noTransactionsFound}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const dep = isDeposit(exp);
                  return (
                    <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-semibold text-slate-700">{exp.date}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black border ${
                            dep
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                              : 'bg-rose-100 text-rose-950 border-rose-300'
                          }`}
                        >
                          {dep ? <ArrowDownCircle className="h-3 w-3 text-emerald-700" /> : <ArrowUpCircle className="h-3 w-3 text-rose-700" />}
                          {dep ? (lang === 'EN' ? 'Cash Deposit' : 'ক্যাশ জমা') : (lang === 'EN' ? 'Expense' : 'দোকান খরচ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-800">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {exp.description}
                        {exp.person && (
                          <span className="block text-[11px] font-medium text-slate-500">
                            {lang === 'EN' ? 'By:' : 'মারফত:'} {exp.person}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{exp.paymentMethod || 'Cash'}</td>
                      <td className={`py-3 px-4 text-right font-black text-sm ${dep ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {dep ? '+' : '-'}{shop.currency} {exp.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(exp)}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 font-bold text-xs transition border border-slate-200"
                            title={lang === 'EN' ? 'Edit Transaction' : 'লেনদেন এডিট করুন'}
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>{lang === 'EN' ? 'Edit' : 'এডিট'}</span>
                          </button>
                          <button
                            onClick={() => onDeleteExpense(exp)}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-100 transition"
                            title={lang === 'EN' ? 'Delete' : 'মুছুন'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Expense & Deposit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between px-6 py-4 text-white ${
                entryType === 'Deposit' ? 'bg-emerald-900' : 'bg-rose-950'
              }`}
            >
              <div className="flex items-center gap-2">
                {entryType === 'Deposit' ? (
                  <ArrowDownCircle className="h-5 w-5 text-emerald-400" />
                ) : (
                  <ArrowUpCircle className="h-5 w-5 text-rose-400" />
                )}
                <h3 className="text-base font-black">
                  {editingExpense
                    ? lang === 'EN'
                      ? 'Edit Entry'
                      : 'হিসাব সম্পাদন'
                    : entryType === 'Deposit'
                    ? lang === 'EN'
                      ? 'New Cash Deposit'
                      : 'নতুন ক্যাশ জমা এন্ট্রি'
                    : lang === 'EN'
                    ? 'New Shop Expense'
                    : 'নতুন দোকান খরচ এন্ট্রি'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4">
              {/* Type Switcher Toggle (Expense vs Cash Deposit) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.entryType}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('Expense');
                      setCategory('Fabric');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition ${
                      entryType === 'Expense'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    <span>{lang === 'EN' ? 'Expense' : 'দোকান খরচ'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('Deposit');
                      setCategory('Cash Deposit (Register)');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition ${
                      entryType === 'Deposit'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                    <span>{lang === 'EN' ? 'Cash Deposit' : 'ক্যাশ জমা'}</span>
                  </button>
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.category} *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-500"
                >
                  {entryType === 'Deposit'
                    ? depositCategories.map((c) => (
                        <option key={c.en} value={c.en}>
                          {lang === 'EN' ? c.en : c.bn}
                        </option>
                      ))
                    : expenseCategories.map((c) => (
                        <option key={c.en} value={c.en}>
                          {lang === 'EN' ? c.en : c.bn}
                        </option>
                      ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.description} *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    entryType === 'Deposit'
                      ? lang === 'EN'
                        ? 'e.g. Cash in Hand Deposit / Owner Capital'
                        : 'যেমন: ক্যাশ বাক্সে প্রারম্ভিক নগদ জমা'
                      : lang === 'EN'
                      ? 'e.g. Purchased Thread & Zippers'
                      : 'যেমন: সুতা, বোতাম ও জিপার ক্রয়'
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 font-medium"
                />
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.amount} ({shop.currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0.00"
                    className={`w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-black outline-none focus:border-slate-500 ${
                      entryType === 'Deposit' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.date}</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 font-medium"
                  />
                </div>
              </div>

              {/* Payment Method & Person */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.paymentMethodLabel}</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 outline-none focus:border-slate-500"
                  >
                    <option value="Cash">{lang === 'EN' ? 'Cash' : 'Cash (নগদ)'}</option>
                    <option value="bKash / Nagad">bKash / Nagad</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'EN' ? 'Person / Reference' : 'ব্যক্তি / মারফত'}
                  </label>
                  <input
                    type="text"
                    value={person}
                    onChange={(e) => setPerson(e.target.value)}
                    placeholder={lang === 'EN' ? 'e.g. Shop Manager' : 'যেমন: ম্যানেজার / কাটিং মাস্টার'}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 font-medium"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black text-white shadow-md ${
                    entryType === 'Deposit'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Print Statement Modal */}
      <PrintExpenseLedgerModal
        isOpen={isPrintModalOpen}
        shop={shop}
        expenses={expenses}
        lang={lang}
        initialFilterType={filterType}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
