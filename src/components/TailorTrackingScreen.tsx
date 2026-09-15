import React, { useState, useMemo } from 'react';
import { Shop, TailorRecord, KarigarSummary, Language } from '../types';
import { strings } from '../utils/strings';
import {
  Plus,
  Users,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  X,
  Check,
  Scissors,
  DollarSign,
  Phone,
  FileText,
  Printer,
  ChevronRight,
  Filter,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  UserCheck,
  MessageSquareText,
  ArrowLeft,
} from 'lucide-react';
import { PrintKarigarLedgerModal } from './PrintKarigarLedgerModal';
import { createKarigarStatementWhatsAppMessage, openWhatsAppUrl } from '../utils/whatsapp';

interface TailorTrackingScreenProps {
  shop: Shop;
  tailorRecords: TailorRecord[];
  lang: Language;
  onSaveRecord: (record: TailorRecord) => void;
  onDeleteRecord: (record: TailorRecord) => void;
}

export const TailorTrackingScreen: React.FC<TailorTrackingScreenProps> = ({
  shop,
  tailorRecords,
  lang,
  onSaveRecord,
  onDeleteRecord,
}) => {
  const t = strings[lang] || strings.BN;
  const [activeTab, setActiveTab] = useState<'grouped' | 'all'>('grouped');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for adding/editing record
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TailorRecord | null>(null);

  // Statement View Modal State
  const [selectedKarigar, setSelectedKarigar] = useState<KarigarSummary | null>(null);

  // Printable Statement Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'individual' | 'all_summary'>('all_summary');
  const [printTailorName, setPrintTailorName] = useState<string | undefined>(undefined);
  const [printTailorPhone, setPrintTailorPhone] = useState<string | undefined>(undefined);

  // Delete Confirmation State
  const [karigarToDelete, setKarigarToDelete] = useState<KarigarSummary | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<TailorRecord | null>(null);

  const confirmDeleteEntireKarigar = (kg: KarigarSummary) => {
    setKarigarToDelete(kg);
  };

  const executeDeleteEntireKarigar = () => {
    if (!karigarToDelete) return;
    karigarToDelete.records.forEach((r) => {
      onDeleteRecord(r);
    });
    if (selectedKarigar && selectedKarigar.tailorName.toLowerCase() === karigarToDelete.tailorName.toLowerCase()) {
      setSelectedKarigar(null);
    }
    setKarigarToDelete(null);
  };

  const confirmDeleteSingleRecord = (r: TailorRecord) => {
    setRecordToDelete(r);
  };

  const executeDeleteSingleRecord = () => {
    if (!recordToDelete) return;
    onDeleteRecord(recordToDelete);
    if (selectedKarigar) {
      setSelectedKarigar((prev) => {
        if (!prev) return null;
        const nextRecs = prev.records.filter((item) => item.id !== recordToDelete.id);
        if (nextRecs.length === 0) return null;
        const totalWageSum = nextRecs.reduce((acc, it) => acc + (it.totalWage || it.pieces * it.ratePerPiece), 0);
        const totalPaidSum = nextRecs.reduce((acc, it) => acc + (it.paidAmount || 0), 0);
        return {
          ...prev,
          records: nextRecs,
          totalPieces: nextRecs.reduce((acc, it) => acc + it.pieces, 0),
          totalCuttingPieces: nextRecs.reduce((acc, it) => acc + (it.cuttingPieces || 0), 0),
          totalSewingPieces: nextRecs.reduce((acc, it) => acc + (it.sewingPieces || 0), 0),
          totalWage: totalWageSum,
          totalPaid: totalPaidSum,
          totalDue: totalWageSum - totalPaidSum,
          recordCount: nextRecs.length,
        };
      });
    }
    setRecordToDelete(null);
  };

  const openPrintModal = (mode: 'individual' | 'all_summary' = 'all_summary', tailorName?: string, tailorPhone?: string) => {
    setPrintMode(mode);
    setPrintTailorName(tailorName);
    setPrintTailorPhone(tailorPhone);
    setIsPrintModalOpen(true);
  };

  // Direct WhatsApp calculation message to Karigar's mobile number
  const handleSendKarigarWhatsApp = (kg: KarigarSummary) => {
    const message = createKarigarStatementWhatsAppMessage(
      kg.tailorName,
      {
        pieces: kg.totalPieces,
        cutting: kg.totalCuttingPieces,
        sewing: kg.totalSewingPieces,
        wage: kg.totalWage,
        paid: kg.totalPaid,
        due: kg.totalDue,
        period: lang === 'EN' ? 'All-Time Records' : 'সর্বকালীন মোট হিসাব',
      },
      shop,
      lang as 'EN' | 'BN'
    );
    openWhatsAppUrl(kg.tailorPhone || '', message);
  };

  // Form Fields
  const [tailorName, setTailorName] = useState('');
  const [tailorPhone, setTailorPhone] = useState('');
  const [workType, setWorkType] = useState<string>('Cutting & Sewing');
  const [cuttingPiecesStr, setCuttingPiecesStr] = useState('');
  const [sewingPiecesStr, setSewingPiecesStr] = useState('');
  const [piecesStr, setPiecesStr] = useState('');
  const [ratePerPieceStr, setRatePerPieceStr] = useState('');
  const [paidAmountStr, setPaidAmountStr] = useState('');
  const [dressType, setDressType] = useState('Abaya / Borka');
  const [invoiceId, setInvoiceId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<TailorRecord['status']>('Assigned');
  const [notes, setNotes] = useState('');

  // 1. Group records by Name + Phone: "নাম এবং মোবাইল নম্বর একই হলে মোট হিসাব হবে"
  const groupedKarigars: KarigarSummary[] = useMemo(() => {
    const groups: { [key: string]: KarigarSummary } = {};

    tailorRecords.forEach((rec) => {
      const cleanName = (rec.tailorName || '').trim();
      const cleanPhone = (rec.tailorPhone || '').trim();
      const key = `${cleanName.toLowerCase()}___${cleanPhone.toLowerCase()}`;

      const cuttingPcs = rec.cuttingPieces || (rec.workType === 'Cutting' ? rec.pieces : 0);
      const sewingPcs = rec.sewingPieces || (rec.workType === 'Sewing' ? rec.pieces : 0);
      const totalPcs = rec.pieces || (cuttingPcs + sewingPcs) || 1;
      const wage = rec.totalWage || totalPcs * (rec.ratePerPiece || 0);
      const paid = rec.paidAmount || 0;
      const due = rec.balanceDue !== undefined ? rec.balanceDue : wage - paid;

      if (!groups[key]) {
        groups[key] = {
          tailorName: cleanName,
          tailorPhone: cleanPhone,
          totalCuttingPieces: 0,
          totalSewingPieces: 0,
          totalPieces: 0,
          totalWage: 0,
          totalPaid: 0,
          totalDue: 0,
          recordCount: 0,
          lastActiveDate: rec.assignedDate || '',
          records: [],
        };
      }

      groups[key].totalCuttingPieces += cuttingPcs;
      groups[key].totalSewingPieces += sewingPcs;
      groups[key].totalPieces += totalPcs;
      groups[key].totalWage += wage;
      groups[key].totalPaid += paid;
      groups[key].totalDue += due;
      groups[key].recordCount += 1;
      groups[key].records.push(rec);

      if (rec.assignedDate && rec.assignedDate > groups[key].lastActiveDate) {
        groups[key].lastActiveDate = rec.assignedDate;
      }
    });

    return Object.values(groups).sort((a, b) => b.totalDue - a.totalDue);
  }, [tailorRecords]);

  // Existing Tailor names for quick autocomplete
  const existingTailors = useMemo(() => {
    const map = new Map<string, string>();
    tailorRecords.forEach((r) => {
      if (r.tailorName && !map.has(r.tailorName)) {
        map.set(r.tailorName, r.tailorPhone || '');
      }
    });
    return Array.from(map.entries()).map(([name, phone]) => ({ name, phone }));
  }, [tailorRecords]);

  // Summary Totals
  const overallTotals = useMemo(() => {
    let cutting = 0;
    let sewing = 0;
    let pieces = 0;
    let wage = 0;
    let paid = 0;
    let due = 0;

    tailorRecords.forEach((r) => {
      const cPcs = r.cuttingPieces || (r.workType === 'Cutting' ? r.pieces : 0);
      const sPcs = r.sewingPieces || (r.workType === 'Sewing' ? r.pieces : 0);
      const tPcs = r.pieces || (cPcs + sPcs) || 1;
      const w = r.totalWage || tPcs * (r.ratePerPiece || 0);
      const p = r.paidAmount || 0;
      const d = r.balanceDue !== undefined ? r.balanceDue : w - p;

      cutting += cPcs;
      sewing += sPcs;
      pieces += tPcs;
      wage += w;
      paid += p;
      due += d;
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
  }, [tailorRecords, groupedKarigars]);

  // Open Add Record
  const openAdd = (prefillName?: string, prefillPhone?: string) => {
    setEditingRecord(null);
    setTailorName(prefillName || '');
    setTailorPhone(prefillPhone || '');
    setWorkType('Cutting & Sewing');
    setCuttingPiecesStr('');
    setSewingPiecesStr('');
    setPiecesStr('');
    setRatePerPieceStr('');
    setPaidAmountStr('');
    setDressType('Abaya / Borka');
    setInvoiceId('');
    setCustomerName('');
    setAssignedDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setStatus('Assigned');
    setNotes('');
    setIsModalOpen(true);
  };

  // Open Edit Record
  const openEdit = (rec: TailorRecord) => {
    setEditingRecord(rec);
    setTailorName(rec.tailorName);
    setTailorPhone(rec.tailorPhone || '');
    setWorkType(rec.workType || 'Cutting & Sewing');
    setCuttingPiecesStr(rec.cuttingPieces ? rec.cuttingPieces.toString() : '');
    setSewingPiecesStr(rec.sewingPieces ? rec.sewingPieces.toString() : '');
    setPiecesStr(rec.pieces ? rec.pieces.toString() : '');
    setRatePerPieceStr(rec.ratePerPiece ? rec.ratePerPiece.toString() : '');
    setPaidAmountStr(rec.paidAmount ? rec.paidAmount.toString() : '');
    setDressType(rec.dressType);
    setInvoiceId(rec.invoiceId || '');
    setCustomerName(rec.customerName || '');
    setAssignedDate(rec.assignedDate);
    setDueDate(rec.dueDate || '');
    setStatus(rec.status);
    setNotes(rec.notes || '');
    setIsModalOpen(true);
  };

  // Auto calculate total pieces when cutting or sewing changes
  const handlePiecesChange = (cStr: string, sStr: string, currentWorkType: string) => {
    const c = parseInt(cStr, 10) || 0;
    const s = parseInt(sStr, 10) || 0;
    if (currentWorkType === 'Cutting') {
      setPiecesStr(c > 0 ? c.toString() : (cStr ? cStr : ''));
    } else if (currentWorkType === 'Sewing') {
      setPiecesStr(s > 0 ? s.toString() : (sStr ? sStr : ''));
    } else {
      const sum = c + s;
      setPiecesStr(sum > 0 ? sum.toString() : '');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tailorName.trim()) return;

    const cuttingPieces = parseInt(cuttingPiecesStr, 10) || 0;
    const sewingPieces = parseInt(sewingPiecesStr, 10) || 0;
    const pieces = parseInt(piecesStr, 10) || (cuttingPieces + sewingPieces) || 1;
    const rate = parseFloat(ratePerPieceStr) || 0;
    const totalWage = pieces * rate;
    const paidAmount = parseFloat(paidAmountStr) || 0;
    const balanceDue = totalWage - paidAmount;

    const rec: TailorRecord = {
      id: editingRecord?.id || `tr-${Date.now()}`,
      shopId: shop.id,
      tailorName: tailorName.trim(),
      tailorPhone: tailorPhone.trim(),
      workType,
      cuttingPieces,
      sewingPieces,
      dressType: dressType.trim(),
      invoiceId: invoiceId.trim(),
      customerName: customerName.trim(),
      pieces,
      ratePerPiece: rate,
      totalWage,
      paidAmount,
      balanceDue,
      assignedDate,
      dueDate,
      status,
      notes: notes.trim(),
      createdAt: editingRecord?.createdAt || Date.now(),
    };

    onSaveRecord(rec);
    setIsModalOpen(false);

    // Refresh active statement if opened
    if (selectedKarigar && selectedKarigar.tailorName.toLowerCase() === rec.tailorName.toLowerCase()) {
      const updatedList = tailorRecords.map((r) => (r.id === rec.id ? rec : r));
      if (!editingRecord) updatedList.push(rec);
      const cleanName = rec.tailorName.trim();
      const cleanPhone = (rec.tailorPhone || '').trim();
      const filtered = updatedList.filter(
        (r) => r.tailorName.trim().toLowerCase() === cleanName.toLowerCase() && (r.tailorPhone || '').trim().toLowerCase() === cleanPhone.toLowerCase()
      );
      const totalWageSum = filtered.reduce((acc, r) => acc + (r.totalWage || r.pieces * r.ratePerPiece), 0);
      const totalPaidSum = filtered.reduce((acc, r) => acc + (r.paidAmount || 0), 0);
      setSelectedKarigar({
        tailorName: cleanName,
        tailorPhone: cleanPhone,
        totalCuttingPieces: filtered.reduce((acc, r) => acc + (r.cuttingPieces || 0), 0),
        totalSewingPieces: filtered.reduce((acc, r) => acc + (r.sewingPieces || 0), 0),
        totalPieces: filtered.reduce((acc, r) => acc + r.pieces, 0),
        totalWage: totalWageSum,
        totalPaid: totalPaidSum,
        totalDue: totalWageSum - totalPaidSum,
        recordCount: filtered.length,
        lastActiveDate: rec.assignedDate,
        records: filtered,
      });
    }
  };

  // Filtered grouped karigars
  const filteredGrouped = useMemo(() => {
    if (!searchQuery.trim()) return groupedKarigars;
    const q = searchQuery.toLowerCase();
    return groupedKarigars.filter(
      (k) => k.tailorName.toLowerCase().includes(q) || k.tailorPhone.toLowerCase().includes(q)
    );
  }, [groupedKarigars, searchQuery]);

  // Filtered all entries
  const filteredAllEntries = useMemo(() => {
    if (!searchQuery.trim()) return tailorRecords;
    const q = searchQuery.toLowerCase();
    return tailorRecords.filter(
      (r) =>
        r.tailorName.toLowerCase().includes(q) ||
        (r.tailorPhone && r.tailorPhone.toLowerCase().includes(q)) ||
        r.dressType.toLowerCase().includes(q) ||
        (r.invoiceId && r.invoiceId.toLowerCase().includes(q)) ||
        (r.customerName && r.customerName.toLowerCase().includes(q))
    );
  }, [tailorRecords, searchQuery]);

  const printKarigarStatement = () => {
    window.print();
  };

  return (
    <div className="pb-24 max-w-5xl mx-auto">
      <div className={`space-y-6 ${isPrintModalOpen ? 'print:hidden' : ''}`}>
        {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{t.karigarLedgerTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.karigarSubTitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Print Master Sheet Button */}
          <button
            onClick={() => openPrintModal('all_summary')}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95"
            title={lang === 'EN' ? 'Print All Karigars Summary' : 'সকল কারিগরের হিসাব শিট প্রিন্ট'}
          >
            <Printer className="h-4 w-4 text-indigo-400" />
            <span>{lang === 'EN' ? 'Print Master Sheet' : 'হিসাব খাতা প্রিন্ট'}</span>
          </button>

          <button
            onClick={() => openAdd()}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>{t.addWorkRecord}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Karigars */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">{t.totalKarigars}</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{overallTotals.karigarCount}</p>
          <span className="text-[11px] font-semibold text-slate-500">
            {overallTotals.pieces} {t.totalPiecesCount}
          </span>
        </div>

        {/* Total Wage */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-900">
            <span className="text-xs font-bold">{t.totalKarigarWage}</span>
            <Scissors className="h-4 w-4 text-blue-700" />
          </div>
          <p className="mt-2 text-xl font-black text-blue-950">
            {shop.currency} {overallTotals.wage.toFixed(2)}
          </p>
          <span className="text-[11px] font-semibold text-blue-800">
            {overallTotals.cutting} {lang === 'EN' ? 'Cut' : 'কাটিং'} • {overallTotals.sewing} {lang === 'EN' ? 'Sewn' : 'সেলাই'}
          </span>
        </div>

        {/* Total Paid */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-900">
            <span className="text-xs font-bold">{t.totalKarigarPaid}</span>
            <ArrowDownCircle className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 text-xl font-black text-emerald-950">
            {shop.currency} {overallTotals.paid.toFixed(2)}
          </p>
          <span className="text-[11px] font-semibold text-emerald-800">
            {lang === 'EN' ? 'Total advances paid' : 'অগ্রিম/টাকা প্রদান'}
          </span>
        </div>

        {/* Total Due */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-rose-900">
            <span className="text-xs font-bold">{t.totalKarigarDue}</span>
            <ArrowUpCircle className="h-4 w-4 text-rose-700" />
          </div>
          <p className="mt-2 text-xl font-black text-rose-950">
            {shop.currency} {overallTotals.due.toFixed(2)}
          </p>
          <span className="text-[11px] font-semibold text-rose-800">
            {lang === 'EN' ? 'Net balance payable' : 'মোট বকেয়া পাওনা'}
          </span>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('grouped')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'grouped'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>{t.groupedKarigarTab}</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{t.allEntriesTab} ({tailorRecords.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'EN' ? 'Search Karigar name or phone...' : 'কারিগরের নাম বা ফোন নম্বর খুঁজুন...'}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white outline-none focus:border-slate-500"
          />
        </div>
      </div>

      {/* VIEW 1: GROUPED KARIGAR SUMMARY (নাম এবং মোবাইল নম্বর একই হলে মোট হিসাব) */}
      {activeTab === 'grouped' && (
        <div className="space-y-3">
          {filteredGrouped.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 font-bold">
              {t.noKarigarFound}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGrouped.map((kg) => (
                <div
                  key={`${kg.tailorName}_${kg.tailorPhone}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between"
                >
                  <div>
                    {/* Karigar Name & Phone Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900">{kg.tailorName}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-semibold">{kg.tailorPhone || (lang === 'EN' ? 'No Mobile' : 'মোবাইল নেই')}</span>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-black border ${
                          kg.totalDue > 0
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {kg.totalDue > 0
                          ? `${lang === 'EN' ? 'Due: ' : 'বকেয়া: '} ${shop.currency} ${kg.totalDue.toFixed(2)}`
                          : lang === 'EN'
                          ? 'Settled'
                          : 'পরিশোধিত'}
                      </span>
                    </div>

                    {/* Work Pieces & Financial Breakdown */}
                    <div className="grid grid-cols-3 gap-2 py-3.5 text-center bg-slate-50 rounded-xl my-3">
                      <div className="p-1">
                        <span className="text-[11px] font-bold text-slate-500 block">
                          {lang === 'EN' ? 'Pieces Cut/Sewn' : 'কাটিং ও সেলাই'}
                        </span>
                        <p className="text-sm font-black text-slate-900 mt-0.5">
                          {kg.totalPieces} <span className="text-[10px] font-normal">{lang === 'EN' ? 'pcs' : 'পিস'}</span>
                        </p>
                        <span className="text-[10px] text-slate-500">
                          ({kg.totalCuttingPieces} {lang === 'EN' ? 'Cut' : 'কাট'} + {kg.totalSewingPieces} {lang === 'EN' ? 'Sew' : 'সেলাই'})
                        </span>
                      </div>

                      <div className="p-1 border-x border-slate-200">
                        <span className="text-[11px] font-bold text-blue-900 block">
                          {lang === 'EN' ? 'Total Wage' : 'মোট মজুরি'}
                        </span>
                        <p className="text-sm font-black text-blue-950 mt-0.5">
                          {shop.currency} {kg.totalWage.toFixed(2)}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {kg.recordCount} {lang === 'EN' ? 'jobs' : 'টি কাজ'}
                        </span>
                      </div>

                      <div className="p-1">
                        <span className="text-[11px] font-bold text-emerald-900 block">
                          {lang === 'EN' ? 'Money Taken' : 'টাকা নেওয়া'}
                        </span>
                        <p className="text-sm font-black text-emerald-950 mt-0.5">
                          {shop.currency} {kg.totalPaid.toFixed(2)}
                        </p>
                        <span className="text-[10px] text-emerald-800">
                          {lang === 'EN' ? 'Paid advance' : 'পরিশোধ'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this specific karigar */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => openAdd(kg.tailorName, kg.tailorPhone)}
                      className="flex-1 min-w-[90px] flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{lang === 'EN' ? '+ Add Work' : '+ কাজ যোগ'}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (kg.records.length > 0) {
                          openEdit(kg.records[kg.records.length - 1]);
                        } else {
                          openAdd(kg.tailorName, kg.tailorPhone);
                        }
                      }}
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition"
                      title={lang === 'EN' ? 'Edit Karigar Entry' : 'কারিগর এন্ট্রি এডিট'}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>{lang === 'EN' ? 'Edit' : 'এডিট'}</span>
                    </button>
                    <button
                      onClick={() => setSelectedKarigar(kg)}
                      className="flex-1 min-w-[90px] flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>{lang === 'EN' ? 'Statement' : 'হিসাব খাতা'}</span>
                    </button>
                    <button
                      onClick={() => handleSendKarigarWhatsApp(kg)}
                      className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
                      title={lang === 'EN' ? 'Send Statement directly to Karigar WhatsApp' : 'কারিগরের নাম্বারে ডিরেক্ট হিসাব পাঠান (WhatsApp)'}
                    >
                      <MessageSquareText className="h-3.5 w-3.5" />
                      <span>{lang === 'EN' ? 'WhatsApp' : 'হোয়াটসঅ্যাপ'}</span>
                    </button>
                    <button
                      onClick={() => openPrintModal('individual', kg.tailorName, kg.tailorPhone)}
                      className="flex items-center justify-center p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                      title={lang === 'EN' ? 'Print Statement' : 'স্টেটমেন্ট প্রিন্ট'}
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => confirmDeleteEntireKarigar(kg)}
                      className="flex items-center justify-center p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition"
                      title={lang === 'EN' ? 'Delete Karigar & all records' : 'কারিগরের সমস্ত হিসাব ও রেকর্ড মুছে ফেলুন'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ITEMIZED ALL WORK ENTRIES TABLE */}
      {activeTab === 'all' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-black border-b border-slate-200">
                  <th className="py-3 px-4">{t.date}</th>
                  <th className="py-3 px-4">{t.tailorName}</th>
                  <th className="py-3 px-4">{t.workType}</th>
                  <th className="py-3 px-4">{lang === 'EN' ? 'Dress / Order' : 'পোশাক ও অর্ডার'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'EN' ? 'Pieces (Cut/Sew)' : 'পরিমাণ (পিস)'}</th>
                  <th className="py-3 px-4 text-right">{t.ratePerPiece}</th>
                  <th className="py-3 px-4 text-right">{t.totalWorkValue}</th>
                  <th className="py-3 px-4 text-right">{t.paidAmount}</th>
                  <th className="py-3 px-4 text-right">{t.balanceDue}</th>
                  <th className="py-3 px-4 text-center">{lang === 'EN' ? 'Status' : 'অবস্থা'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'EN' ? 'Action' : 'একশন'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllEntries.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-slate-500 font-bold">
                      {t.noKarigarFound}
                    </td>
                  </tr>
                ) : (
                  filteredAllEntries.map((r) => {
                    const cPcs = r.cuttingPieces || 0;
                    const sPcs = r.sewingPieces || 0;
                    const w = r.totalWage || r.pieces * r.ratePerPiece;
                    const p = r.paidAmount || 0;
                    const d = r.balanceDue !== undefined ? r.balanceDue : w - p;
                    return (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-semibold text-slate-700">{r.assignedDate}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{r.tailorName}</span>
                          {r.tailorPhone && (
                            <span className="text-[11px] font-semibold text-slate-500">{r.tailorPhone}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-900">
                            {r.workType || (lang === 'EN' ? 'Cutting & Sewing' : 'কাটিং ও সেলাই')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{r.dressType}</span>
                          {r.invoiceId && (
                            <span className="block text-[11px] text-slate-500">
                              Inv #{r.invoiceId} {r.customerName ? `• ${r.customerName}` : ''}
                            </span>
                          )}
                          {r.notes && (
                            <span className="inline-block mt-1 text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              📝 {r.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-black text-slate-900">{r.pieces} pcs</span>
                          {(cPcs > 0 || sPcs > 0) && (
                            <span className="block text-[10px] text-slate-500">
                              (C:{cPcs} / S:{sPcs})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          {shop.currency} {r.ratePerPiece.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-blue-900">
                          {shop.currency} {w.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-800">
                          {shop.currency} {p.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-right font-black ${d > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                          {shop.currency} {d.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                              r.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                : r.status === 'In Progress'
                                ? 'bg-blue-100 text-blue-950 border-blue-300'
                                : 'bg-amber-100 text-amber-950 border-amber-300'
                            }`}
                          >
                            {r.status === 'Completed'
                              ? lang === 'EN'
                                ? 'Completed'
                                : 'সম্পন্ন'
                              : r.status === 'In Progress'
                              ? lang === 'EN'
                                ? 'In Progress'
                                : 'চলমান'
                              : lang === 'EN'
                              ? 'Assigned'
                              : 'বরাদ্দকৃত'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(r)}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-700 font-bold text-xs transition border border-indigo-200"
                              title={lang === 'EN' ? 'Edit Record' : 'রেকর্ড এডিট করুন'}
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>{lang === 'EN' ? 'Edit' : 'এডিট'}</span>
                            </button>
                            <button
                              onClick={() => confirmDeleteSingleRecord(r)}
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
      )}

      {/* KARIGAR STATEMENT MODAL (পূর্ণাঙ্গ কারিগর খাতা ও স্টেটমেন্ট শিট) */}
      {selectedKarigar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="bg-slate-900 px-4 sm:px-6 py-3.5 text-white">
              {/* Top Row: Back button, Title & Close button */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => setSelectedKarigar(null)}
                    className="flex items-center justify-center h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 shrink-0"
                    title={lang === 'EN' ? 'Back' : 'ফিরে যান'}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black flex items-center gap-1.5 truncate">
                      <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span className="truncate">{t.karigarStatement}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {selectedKarigar.tailorName} • {selectedKarigar.tailorPhone || 'N/A'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedKarigar(null)}
                  className="flex items-center justify-center h-8 w-8 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition shrink-0"
                  title={lang === 'EN' ? 'Close' : 'বন্ধ করুন'}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Action Buttons Row (WhatsApp, Print, Delete) */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleSendKarigarWhatsApp(selectedKarigar)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 px-1.5 text-xs font-bold text-white transition shadow-xs active:scale-95"
                  title={lang === 'EN' ? 'Send Statement directly to Karigar WhatsApp' : 'কারিগরের নাম্বারে ডিরেক্ট হিসাব পাঠান (WhatsApp)'}
                >
                  <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{lang === 'EN' ? 'WhatsApp' : 'হোয়াটসঅ্যাপ'}</span>
                </button>

                <button
                  onClick={() => openPrintModal('individual', selectedKarigar.tailorName, selectedKarigar.tailorPhone)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2 px-1.5 text-xs font-bold text-white transition shadow-xs active:scale-95"
                  title={lang === 'EN' ? 'Print Statement' : 'স্টেটমেন্ট প্রিন্ট'}
                >
                  <Printer className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{lang === 'EN' ? 'Print' : 'প্রিন্ট'}</span>
                </button>

                <button
                  onClick={() => confirmDeleteEntireKarigar(selectedKarigar)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 py-2 px-1.5 text-xs font-bold text-white transition shadow-xs active:scale-95"
                  title={lang === 'EN' ? 'Delete Karigar & all records' : 'কারিগরের সমস্ত হিসাব ও রেকর্ড মুছে ফেলুন'}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{lang === 'EN' ? 'Delete All' : 'সব মুছুন'}</span>
                </button>
              </div>
            </div>

            {/* Statement Body */}
            <div className="overflow-y-auto p-6 space-y-5">
              {/* Summary Header Box */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">
                      {lang === 'EN' ? 'Total Work Pieces' : 'মোট কাজের পরিমাণ'}
                    </span>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {selectedKarigar.totalPieces} <span className="text-xs">{lang === 'EN' ? 'pcs' : 'পিস'}</span>
                    </p>
                    <span className="text-[10px] text-slate-500">
                      ({selectedKarigar.totalCuttingPieces} {lang === 'EN' ? 'Cut' : 'কাটিং'} + {selectedKarigar.totalSewingPieces} {lang === 'EN' ? 'Sew' : 'সেলাই'})
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-blue-900 block">
                      {lang === 'EN' ? 'Total Wage Earned' : 'মোট অর্জিত মজুরি'}
                    </span>
                    <p className="text-lg font-black text-blue-950 mt-0.5">
                      {shop.currency} {selectedKarigar.totalWage.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-emerald-900 block">
                      {lang === 'EN' ? 'Total Money Taken' : 'মোট টাকা নেওয়া'}
                    </span>
                    <p className="text-lg font-black text-emerald-950 mt-0.5">
                      {shop.currency} {selectedKarigar.totalPaid.toFixed(2)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-2 border border-rose-200">
                    <span className="text-[11px] font-black text-rose-800 block">
                      {lang === 'EN' ? 'Net Balance Due' : 'মোট বাকি পাওনা'}
                    </span>
                    <p className="text-lg font-black text-rose-900 mt-0.5">
                      {shop.currency} {selectedKarigar.totalDue.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Itemized Transactions of this tailor */}
              <div>
                <h4 className="text-xs font-black text-slate-900 mb-2">
                  {lang === 'EN' ? 'All Work & Advance Entries' : 'সকল কাজের তালিকা ও টাকা নেওয়ার হিস্ট্রি'}
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">{t.date}</th>
                        <th className="py-2.5 px-3">{lang === 'EN' ? 'Dress / Task' : 'পোশাক ও কাজ'}</th>
                        <th className="py-2.5 px-3 text-center">{lang === 'EN' ? 'Pieces' : 'পিস'}</th>
                        <th className="py-2.5 px-3 text-right">{t.ratePerPiece}</th>
                        <th className="py-2.5 px-3 text-right">{t.totalWorkValue}</th>
                        <th className="py-2.5 px-3 text-right">{t.paidAmount}</th>
                        <th className="py-2.5 px-3 text-right">{t.balanceDue}</th>
                        <th className="py-2.5 px-3 text-right">{lang === 'EN' ? 'Action' : 'একশন'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedKarigar.records.map((r) => {
                        const w = r.totalWage || r.pieces * r.ratePerPiece;
                        const p = r.paidAmount || 0;
                        const d = r.balanceDue !== undefined ? r.balanceDue : w - p;
                        return (
                          <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                            <td className="py-2 px-3 text-slate-600 font-semibold">{r.assignedDate}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              <div>{r.dressType} ({r.workType || 'Cutting & Sewing'})</div>
                              {r.notes && (
                                <div className="mt-0.5 inline-block text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  📝 {r.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-bold">{r.pieces}</td>
                            <td className="py-2 px-3 text-right">{shop.currency} {r.ratePerPiece.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-bold text-blue-900">{shop.currency} {w.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-800">{shop.currency} {p.toFixed(2)}</td>
                            <td className={`py-2 px-3 text-right font-black ${d > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                              {shop.currency} {d.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedKarigar(null);
                                    openEdit(r);
                                  }}
                                  className="flex items-center gap-1 rounded-md px-2 py-1 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-700 font-bold text-[11px] transition border border-indigo-200"
                                  title={lang === 'EN' ? 'Edit Entry' : 'এন্ট্রি এডিট'}
                                >
                                  <Edit2 className="h-3 w-3" />
                                  <span>{lang === 'EN' ? 'Edit' : 'এডিট'}</span>
                                </button>
                                <button
                                  onClick={() => confirmDeleteSingleRecord(r)}
                                  className="p-1 rounded text-rose-600 hover:bg-rose-100 transition"
                                  title={lang === 'EN' ? 'Delete' : 'মুছুন'}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT RECORD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-indigo-900 px-6 py-4 text-white">
              <h3 className="text-base font-black flex items-center gap-2">
                <Scissors className="h-5 w-5 text-indigo-300" />
                <span>{editingRecord ? t.editWorkRecord : t.addWorkRecord}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4">
              {/* Karigar Name with Auto-Suggest */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.tailorName} *</label>
                <input
                  type="text"
                  required
                  list="tailor-name-list"
                  value={tailorName}
                  onChange={(e) => {
                    setTailorName(e.target.value);
                    const match = existingTailors.find((t) => t.name.toLowerCase() === e.target.value.toLowerCase());
                    if (match && match.phone && !tailorPhone) {
                      setTailorPhone(match.phone);
                    }
                  }}
                  placeholder={lang === 'EN' ? 'e.g. Master Rafiq / Tailor Rahim' : 'যেমন: মাস্টার রফিক / কারিগর রহিম'}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 font-bold outline-none focus:border-indigo-600"
                />
                <datalist id="tailor-name-list">
                  {existingTailors.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.phone ? `(${t.phone})` : ''}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Mobile Number & Work Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.tailorPhone}</label>
                  <input
                    type="tel"
                    value={tailorPhone}
                    onChange={(e) => setTailorPhone(e.target.value)}
                    placeholder="017... / +968..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.workType}</label>
                  <select
                    value={workType}
                    onChange={(e) => {
                      setWorkType(e.target.value);
                      handlePiecesChange(cuttingPiecesStr, sewingPiecesStr, e.target.value);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-600"
                  >
                    <option value="Cutting & Sewing">{t.cuttingAndSewing}</option>
                    <option value="Cutting">{t.cutting}</option>
                    <option value="Sewing">{t.sewing}</option>
                    <option value="Other">{t.otherWork}</option>
                  </select>
                </div>
              </div>

              {/* Cutting Pieces & Sewing Pieces */}
              <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{t.cuttingPieces}</label>
                  <input
                    type="number"
                    min="0"
                    value={cuttingPiecesStr}
                    placeholder="0"
                    onChange={(e) => {
                      setCuttingPiecesStr(e.target.value);
                      handlePiecesChange(e.target.value, sewingPiecesStr, workType);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{t.sewingPieces}</label>
                  <input
                    type="number"
                    min="0"
                    value={sewingPiecesStr}
                    placeholder="0"
                    onChange={(e) => {
                      setSewingPiecesStr(e.target.value);
                      handlePiecesChange(cuttingPiecesStr, e.target.value, workType);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-indigo-900 mb-1">{t.totalPiecesCount} *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={piecesStr}
                    placeholder="1"
                    onChange={(e) => setPiecesStr(e.target.value)}
                    className="w-full rounded-lg border border-indigo-300 bg-indigo-50/70 px-2.5 py-1.5 text-sm font-black text-indigo-950 outline-none placeholder:text-indigo-300"
                  />
                </div>
              </div>

              {/* Rate per piece & Paid Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.ratePerPiece} ({shop.currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={ratePerPieceStr}
                    placeholder="0.00"
                    onChange={(e) => setRatePerPieceStr(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-black text-blue-900 outline-none focus:border-indigo-600 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.paidAmount} ({shop.currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={paidAmountStr}
                    onChange={(e) => setPaidAmountStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-black text-emerald-800 outline-none focus:border-indigo-600 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Live Calculated Total & Due Preview */}
              {(() => {
                const pcs = parseInt(piecesStr, 10) || 0;
                const r = parseFloat(ratePerPieceStr) || 0;
                const tot = pcs * r;
                const pd = parseFloat(paidAmountStr) || 0;
                const due = tot - pd;
                return (
                  <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100 rounded-xl text-xs">
                    <span className="font-bold text-slate-700">
                      {t.totalWorkValue}: <strong className="text-blue-900">{shop.currency} {tot.toFixed(2)}</strong>
                    </span>
                    <span className="font-bold text-slate-700">
                      {t.balanceDue}: <strong className={due > 0 ? 'text-rose-700' : 'text-emerald-700'}>{shop.currency} {due.toFixed(2)}</strong>
                    </span>
                  </div>
                );
              })()}

              {/* Dress Type & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.dressType}</label>
                  <input
                    type="text"
                    value={dressType}
                    onChange={(e) => setDressType(e.target.value)}
                    placeholder="Abaya / Borka / Kamiz"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.date}</label>
                  <input
                    type="date"
                    value={assignedDate}
                    onChange={(e) => setAssignedDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Status & Optional Invoice ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'EN' ? 'Work Status' : 'কাজের স্ট্যাটাস'}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TailorRecord['status'])}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 outline-none"
                  >
                    <option value="Assigned">{t.statusPending}</option>
                    <option value="In Progress">{t.statusInProgress}</option>
                    <option value="Completed">{t.statusDelivered}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.invoiceId}</label>
                  <input
                    type="text"
                    value={invoiceId}
                    onChange={(e) => setInvoiceId(e.target.value)}
                    placeholder="JT-1001"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Note / Remarks Field (নোট / মন্তব্য) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'EN' ? 'Note / Remarks' : 'নোট / মন্তব্য'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={lang === 'EN' ? 'Special notes, alteration details or comments...' : 'কাজের বিশেষ নোট, বিবরণ বা অতিরিক্ত মন্তব্য...'}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-600 placeholder:text-slate-400 resize-none font-medium"
                />
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
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-black text-white shadow-md"
                >
                  <Check className="h-4 w-4" />
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DELETE ENTIRE KARIGAR CONFIRMATION MODAL */}
      {karigarToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-rose-700 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-200" />
                <span>{lang === 'EN' ? 'Delete Karigar Account & Records?' : 'কারিগরের সম্পূর্ণ হিসাব মুছে ফেলবেন?'}</span>
              </h3>
              <button
                onClick={() => setKarigarToDelete(null)}
                className="rounded-full p-1 text-white/80 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-950">
                <p className="font-bold text-sm mb-1 text-rose-900">
                  {karigarToDelete.tailorName} {karigarToDelete.tailorPhone ? `(${karigarToDelete.tailorPhone})` : ''}
                </p>
                <p className="text-slate-700">
                  {lang === 'EN'
                    ? `Are you sure you want to delete all records for this Karigar? Total ${karigarToDelete.records.length} records (${karigarToDelete.totalPieces} pcs) will be permanently removed.`
                    : `আপনি কি নিশ্চিত যে এই কারিগরের সমস্ত খাতার হিসাব ও রেকর্ড মুছে ফেলতে চান? মোট ${karigarToDelete.records.length} টি কাজের এন্ট্রি (${karigarToDelete.totalPieces} পিস) স্থায়ীভাবে মুছে যাবে।`}
                </p>
                <div className="mt-2 pt-2 border-t border-rose-200/60 flex justify-between font-black text-rose-900">
                  <span>{lang === 'EN' ? 'Total Balance Due:' : 'বর্তমান মোট বাকি পাওনা:'}</span>
                  <span>{shop.currency} {karigarToDelete.totalDue.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setKarigarToDelete(null)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={executeDeleteEntireKarigar}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-black text-white shadow-sm transition"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{lang === 'EN' ? 'Yes, Delete All' : 'হ্যাঁ, সব মুছে ফেলুন'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SINGLE RECORD CONFIRMATION MODAL */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-rose-700 px-5 py-3 text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-rose-200" />
                <span>{lang === 'EN' ? 'Delete Work Entry?' : 'কাজের এন্ট্রি মুছবেন?'}</span>
              </h3>
              <button
                onClick={() => setRecordToDelete(null)}
                className="rounded-full p-1 text-white/80 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-700">
                {lang === 'EN'
                  ? `Delete entry for "${recordToDelete.dressType}" assigned on ${recordToDelete.assignedDate}?`
                  : `আপনি কি ${recordToDelete.assignedDate} তারিখের "${recordToDelete.dressType}" (${recordToDelete.pieces} পিস) কাজের এন্ট্রি মুছে ফেলতে চান?`}
              </p>
              {recordToDelete.notes && (
                <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                  📝 {recordToDelete.notes}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={executeDeleteSingleRecord}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 py-2 text-xs font-black text-white shadow-sm transition"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{lang === 'EN' ? 'Delete' : 'মুছে ফেলুন'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Printable Karigar Ledger Modal */}
      <PrintKarigarLedgerModal
        isOpen={isPrintModalOpen}
        shop={shop}
        tailorRecords={tailorRecords}
        groupedKarigars={groupedKarigars}
        initialTailorName={printTailorName}
        initialTailorPhone={printTailorPhone}
        initialMode={printMode}
        lang={lang}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
