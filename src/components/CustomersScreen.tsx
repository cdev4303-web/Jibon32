import React, { useState, useMemo } from 'react';
import { Shop, Invoice, Measurement, Language } from '../types';
import {
  Users,
  Search,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  PlusCircle,
  MessageCircle,
  Receipt,
  Scissors,
  CheckCircle2,
  Clock,
  ChevronRight,
  Ruler,
  Star,
  Edit3,
  Copy,
  Trash2,
  X,
  Share2,
} from 'lucide-react';
import { sendWhatsAppCustomMessage } from '../utils/whatsapp';
import {
  getCustomerMeasurementProfiles,
  cloneMeasurementSnapshot,
  getMeasurementProfileTitle,
  getFieldsForDressType,
  FIELD_DEFINITIONS,
  formatMeasurementShareText,
} from '../utils/measurementProfiles';
import {
  getStoredMeasurements,
  saveSingleMeasurementProfile,
  deleteStoredMeasurementProfile,
  setStoredDefaultMeasurementProfile,
} from '../utils/storage';
import { MeasurementProfileModal } from './MeasurementProfileModal';

interface CustomersScreenProps {
  shop: Shop;
  invoices: Invoice[];
  measurements?: Measurement[];
  lang?: Language;
  onNavigateToNewOrderWithCustomer: (customerName: string, phone: string, address: string) => void;
  onNavigateToNewOrderWithMeasurement?: (
    measurement: Measurement,
    customerName: string,
    customerPhone: string,
    customerAddress?: string,
    dressType?: string
  ) => void;
  onNavigateToInvoiceDetail: (invoiceId: string) => void;
  onSaveMeasurement?: (measurement: Measurement) => void;
  onDeleteMeasurement?: (measurementId: string) => void;
  onSetDefaultMeasurement?: (profileId: string, customerPhone: string) => void;
}

interface CustomerSummary {
  name: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  totalAdvance: number;
  totalDue: number;
  lastOrderDate: string;
  lastDressType: string;
  invoices: Invoice[];
  measurementProfiles: Measurement[];
}

export const CustomersScreen: React.FC<CustomersScreenProps> = ({
  shop,
  invoices,
  measurements: propMeasurements,
  lang = 'BN',
  onNavigateToNewOrderWithCustomer,
  onNavigateToNewOrderWithMeasurement,
  onNavigateToInvoiceDetail,
  onSaveMeasurement,
  onDeleteMeasurement,
  onSetDefaultMeasurement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);
  const [internalMeasurements, setInternalMeasurements] = useState<Measurement[]>(() => getStoredMeasurements());
  const activeMeasurements = propMeasurements || internalMeasurements;
  const isEn = lang === 'EN';

  // Modal for Add / Edit / Duplicate Measurement
  const [isMeasModalOpen, setIsMeasModalOpen] = useState(false);
  const [measModalMode, setMeasModalMode] = useState<'add' | 'edit' | 'duplicate'>('add');
  const [targetMeasurement, setTargetMeasurement] = useState<Measurement | null>(null);
  const [targetCustomerForMeas, setTargetCustomerForMeas] = useState<{ name: string; phone: string; address?: string } | null>(null);

  // Aggregate customers from invoices AND standalone measurements
  const customerList = useMemo(() => {
    const map = new Map<string, CustomerSummary>();

    // 1. From invoices
    invoices.forEach((inv) => {
      const phoneKey = inv.customerPhone.trim() || inv.customerName.trim() || 'Unknown';
      if (!map.has(phoneKey)) {
        map.set(phoneKey, {
          name: inv.customerName,
          phone: inv.customerPhone,
          address: inv.customerAddress,
          totalOrders: 0,
          totalSpent: 0,
          totalAdvance: 0,
          totalDue: 0,
          lastOrderDate: inv.orderDate,
          lastDressType: inv.dressType,
          invoices: [],
          measurementProfiles: [],
        });
      }

      const cust = map.get(phoneKey)!;
      cust.totalOrders += 1;
      cust.totalSpent += inv.netTotal || 0;
      cust.totalAdvance += inv.advanceDeposit || 0;
      cust.totalDue += inv.remainingDue || 0;
      cust.invoices.push(inv);
      if (inv.customerAddress && !cust.address) {
        cust.address = inv.customerAddress;
      }
    });

    // 2. From measurements
    activeMeasurements.forEach((m) => {
      const phoneKey = (m.customerPhone || '').trim() || (m.customerName || '').trim() || 'Unknown';
      if (!map.has(phoneKey)) {
        map.set(phoneKey, {
          name: m.customerName,
          phone: m.customerPhone,
          address: m.customerAddress || '',
          totalOrders: 0,
          totalSpent: 0,
          totalAdvance: 0,
          totalDue: 0,
          lastOrderDate: m.updatedAt ? new Date(m.updatedAt).toISOString().split('T')[0] : '',
          lastDressType: m.dressType,
          invoices: [],
          measurementProfiles: [],
        });
      }

      const cust = map.get(phoneKey)!;
      if (!cust.measurementProfiles.some((p) => p.id === m.id)) {
        cust.measurementProfiles.push(m);
      }
      if (m.customerAddress && !cust.address) {
        cust.address = m.customerAddress;
      }
    });

    // Also attach invoice measurements as profiles if not present
    invoices.forEach((inv) => {
      if (inv.measurement) {
        const phoneKey = inv.customerPhone.trim() || inv.customerName.trim();
        const cust = map.get(phoneKey);
        if (cust && !cust.measurementProfiles.some((p) => p.id === inv.measurement!.id || (p.invoiceId && p.invoiceId === inv.id))) {
          cust.measurementProfiles.push({
            ...inv.measurement,
            id: `inv-${inv.id}`,
            invoiceId: inv.id,
            profileName: inv.measurement.profileName || `${inv.measurement.dressType || inv.dressType} (Invoice #${inv.id})`,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalOrders - a.totalOrders);
  }, [invoices, activeMeasurements]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customerList;
    const q = searchQuery.toLowerCase();
    return customerList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.measurementProfiles.some((p) => (p.profileName || p.dressType).toLowerCase().includes(q))
    );
  }, [customerList, searchQuery]);

  const activeCustomer = useMemo(() => {
    if (!selectedCustomerPhone) return null;
    return customerList.find((c) => c.phone === selectedCustomerPhone) || null;
  }, [customerList, selectedCustomerPhone]);

  // Handlers for measurement operations
  const handleOpenAddMeas = (cust: { name: string; phone: string; address?: string }) => {
    setMeasModalMode('add');
    setTargetMeasurement(null);
    setTargetCustomerForMeas(cust);
    setIsMeasModalOpen(true);
  };

  const handleOpenEditMeas = (meas: Measurement) => {
    setMeasModalMode('edit');
    setTargetMeasurement(meas);
    setTargetCustomerForMeas({
      name: meas.customerName,
      phone: meas.customerPhone,
      address: meas.customerAddress,
    });
    setIsMeasModalOpen(true);
  };

  const handleOpenDuplicateMeas = (meas: Measurement) => {
    setMeasModalMode('duplicate');
    setTargetMeasurement(meas);
    setTargetCustomerForMeas({
      name: meas.customerName,
      phone: meas.customerPhone,
      address: meas.customerAddress,
    });
    setIsMeasModalOpen(true);
  };

  const handleSaveModalMeas = (saved: Measurement) => {
    const updated = saveSingleMeasurementProfile(saved);
    setInternalMeasurements(updated);
    if (onSaveMeasurement) {
      onSaveMeasurement(saved);
    }
  };

  const handleDeleteMeas = (meas: Measurement) => {
    const confirmMsg = isEn
      ? `Delete measurement profile "${meas.profileName || meas.dressType}"?`
      : `আপনি কি নিশ্চিত "${meas.profileName || meas.dressType}" প্রোফাইলটি মুছে ফেলতে চান?`;

    if (window.confirm(confirmMsg)) {
      const updated = deleteStoredMeasurementProfile(meas.id);
      setInternalMeasurements(updated);
      if (onDeleteMeasurement) {
        onDeleteMeasurement(meas.id);
      }
    }
  };

  const handleToggleDefaultMeas = (meas: Measurement) => {
    if (!meas.customerPhone) return;
    const updated = setStoredDefaultMeasurementProfile(meas.id, meas.customerPhone);
    setInternalMeasurements(updated);
    if (onSetDefaultMeasurement) {
      onSetDefaultMeasurement(meas.id, meas.customerPhone);
    }
  };

  const handleNewOrderWithProfile = (profile: Measurement) => {
    const independentSnapshot = cloneMeasurementSnapshot(profile);
    if (onNavigateToNewOrderWithMeasurement) {
      onNavigateToNewOrderWithMeasurement(
        independentSnapshot,
        profile.customerName,
        profile.customerPhone,
        profile.customerAddress,
        profile.dressType
      );
    } else {
      onNavigateToNewOrderWithCustomer(
        profile.customerName,
        profile.customerPhone,
        profile.customerAddress || ''
      );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="rounded-3xl bg-linear-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl bg-amber-400 p-2.5 text-slate-950 shadow-md">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isEn ? 'Customer Directory & Profiles' : 'কাস্টমার তালিকা ও প্রোফাইল'}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200 mt-0.5">
                {isEn
                  ? 'Manage customers, their multiple measurement profiles, and order histories.'
                  : 'সকল কাস্টমারের বিস্তারিত হিসাব, একাধিক পরিমাপ প্রোফাইল ও অর্ডার ইতিহাস।'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddMeas({ name: '', phone: '', address: '' })}
            className="flex items-center gap-1.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2.5 text-xs shadow-md transition active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{isEn ? '+ Add New Customer / Measurement' : '+ নতুন কাস্টমার / মাপ যুক্ত'}</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            isEn
              ? 'Search customer by name, mobile number, address, or measurement profile...'
              : 'কাস্টমারের নাম, ফোন নম্বর, ঠিকানা বা পরিমাপ প্রোফাইল দিয়ে খুঁজুন...'
          }
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-xs sm:text-sm font-bold text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none"
        />
      </div>

      {/* Customers List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.phone || cust.name}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between"
          >
            <div>
              {/* Header Info */}
              <div className="flex items-start justify-between gap-2">
                <div
                  onClick={() => setSelectedCustomerPhone(cust.phone)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-lg group-hover:bg-emerald-200 transition">
                    {cust.name.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base leading-tight group-hover:text-emerald-700 transition">
                      {cust.name || 'Unnamed Customer'}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 text-emerald-600" />
                      <span>{cust.phone || 'No phone'}</span>
                    </p>
                  </div>
                </div>

                {cust.totalDue > 0 ? (
                  <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-800 border border-rose-200 whitespace-nowrap">
                    বাকি {shop.currency} {cust.totalDue.toFixed(0)}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800 border border-emerald-200 whitespace-nowrap">
                    পরিশোধিত
                  </span>
                )}
              </div>

              {cust.address && (
                <p className="text-xs text-slate-600 flex items-center gap-1 mt-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{cust.address}</span>
                </p>
              )}

              {/* Measurement Profiles Pill Chips Preview */}
              <div className="mt-3 bg-blue-50/60 p-2.5 rounded-2xl border border-blue-100">
                <div className="flex items-center justify-between text-[11px] font-black text-blue-900 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Ruler className="h-3.5 w-3.5 text-blue-700" />
                    {isEn ? 'Measurements' : 'পরিমাপ প্রোফাইল'} ({cust.measurementProfiles.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenAddMeas({ name: cust.name, phone: cust.phone, address: cust.address })}
                    className="text-[10px] text-blue-700 hover:text-blue-900 underline font-bold"
                  >
                    {isEn ? '+ Add' : '+ যোগ করুন'}
                  </button>
                </div>

                {cust.measurementProfiles.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {cust.measurementProfiles.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        onClick={() => setSelectedCustomerPhone(cust.phone)}
                        className="cursor-pointer rounded-lg bg-white border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-950 flex items-center gap-1 hover:bg-blue-100 transition"
                      >
                        {p.isDefault && <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />}
                        <span>{getMeasurementProfileTitle(p)}</span>
                      </span>
                    ))}
                    {cust.measurementProfiles.length > 3 && (
                      <span
                        onClick={() => setSelectedCustomerPhone(cust.phone)}
                        className="cursor-pointer rounded-lg bg-blue-200/70 px-1.5 py-0.5 text-[10px] font-bold text-blue-950"
                      >
                        +{cust.measurementProfiles.length - 3} more
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    {isEn ? 'No measurement profile saved yet' : 'কোন পরিমাপ সংরক্ষিত নেই'}
                  </p>
                )}
              </div>

              {/* Order Stats */}
              <div className="grid grid-cols-3 gap-2 text-center mt-3 p-2.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs">
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">{isEn ? 'Orders' : 'অর্ডার'}</p>
                  <p className="font-black text-slate-900">{cust.totalOrders} টি</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">{isEn ? 'Total Spent' : 'মোট বিল'}</p>
                  <p className="font-black text-emerald-900">
                    {shop.currency} {cust.totalSpent.toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">{isEn ? 'Last Dress' : 'পোশাক'}</p>
                  <p className="font-bold text-slate-800 truncate">{cust.lastDressType || '-'}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedCustomerPhone(cust.phone)}
                className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 text-xs font-bold transition active:scale-95"
              >
                <span>{isEn ? 'View Details' : 'বিস্তারিত দেখুন'}</span>
                <ChevronRight className="h-3 w-3" />
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    sendWhatsAppCustomMessage(
                      cust.phone,
                      `Hello *${cust.name}*, greeting from *${shop.name}*!`
                    )
                  }
                  className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-700" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onNavigateToNewOrderWithCustomer(cust.name, cust.phone, cust.address)
                  }
                  className="flex items-center gap-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-2 text-xs font-black shadow-xs transition active:scale-95"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>{isEn ? '+ Order' : '+ অর্ডার'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700 text-sm">
              {isEn ? 'No customer found matching your search.' : 'কোন কাস্টমার পাওয়া যায়নি।'}
            </p>
          </div>
        )}
      </div>

      {/* Customer Details Modal with Measurements Section */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto backdrop-blur-xs">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 my-6 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 text-white p-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xl">
                  {activeCustomer.name.charAt(0).toUpperCase() || 'C'}
                </div>
                <div>
                  <h3 className="font-black text-lg text-white leading-tight">
                    {activeCustomer.name}
                  </h3>
                  <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-emerald-400" />
                      {activeCustomer.phone}
                    </span>
                    {activeCustomer.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {activeCustomer.address}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerPhone(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Financial Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-center">
                  <span className="text-[11px] font-bold text-slate-500 block">{isEn ? 'Total Orders' : 'মোট অর্ডার'}</span>
                  <span className="text-base font-black text-slate-900">{activeCustomer.totalOrders} টি</span>
                </div>
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <span className="text-[11px] font-bold text-emerald-700 block">{isEn ? 'Total Billed' : 'মোট বিল'}</span>
                  <span className="text-base font-black text-emerald-950">{shop.currency} {activeCustomer.totalSpent.toFixed(0)}</span>
                </div>
                <div className="rounded-2xl bg-teal-50 border border-teal-200 p-3 text-center">
                  <span className="text-[11px] font-bold text-teal-700 block">{isEn ? 'Advance Paid' : 'অগ্রিম জমা'}</span>
                  <span className="text-base font-black text-teal-950">{shop.currency} {activeCustomer.totalAdvance.toFixed(0)}</span>
                </div>
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-center">
                  <span className="text-[11px] font-bold text-rose-700 block">{isEn ? 'Remaining Due' : 'মোট বাকি'}</span>
                  <span className="text-base font-black text-rose-900">{shop.currency} {activeCustomer.totalDue.toFixed(0)}</span>
                </div>
              </div>

              {/* ============================================================ */}
              {/* MEASUREMENTS SECTION (Required: Multiple profiles per customer) */}
              {/* ============================================================ */}
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-blue-600 p-2 text-white">
                      <Ruler className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-blue-950 text-sm">
                        {isEn ? 'Measurements' : 'পরিমাপ (Measurements)'}
                      </h4>
                      <p className="text-[11px] text-blue-700 font-medium">
                        {isEn
                          ? `Saved measurement profiles for ${activeCustomer.name}`
                          : `${activeCustomer.name}-এর সংরক্ষিত পরিমাপ প্রোফাইল`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleOpenAddMeas({
                        name: activeCustomer.name,
                        phone: activeCustomer.phone,
                        address: activeCustomer.address,
                      })
                    }
                    className="flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white px-3.5 py-2 text-xs font-black shadow-xs transition active:scale-95"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>{isEn ? '+ Add New Measurement' : '+ নতুন পরিমাপ যোগ করুন'}</span>
                  </button>
                </div>

                {/* List of profiles belonging to this customer */}
                {activeCustomer.measurementProfiles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {activeCustomer.measurementProfiles.map((p) => {
                      const relevantFields = getFieldsForDressType(p.dressType);
                      return (
                        <div
                          key={p.id}
                          className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-2xs hover:border-blue-400 transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h5 className="font-black text-slate-900 text-sm">
                                    {getMeasurementProfileTitle(p)}
                                  </h5>
                                  <span className="rounded-md bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] font-bold">
                                    {p.dressType}
                                  </span>
                                </div>
                                {p.isDefault && (
                                  <span className="mt-1 inline-flex items-center gap-0.5 rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-black border border-amber-200">
                                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
                                    {isEn ? 'Default' : 'প্রধান পরিমাপ'}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDefaultMeas(p)}
                                  title={isEn ? 'Toggle Default' : 'ডিফল্ট করুন'}
                                  className={`p-1.5 rounded-lg border text-xs transition ${
                                    p.isDefault
                                      ? 'bg-amber-100 border-amber-300 text-amber-600'
                                      : 'bg-white border-slate-200 text-slate-400 hover:text-amber-500'
                                  }`}
                                >
                                  <Star className={`h-3 w-3 ${p.isDefault ? 'fill-amber-400' : ''}`} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMeas(p)}
                                  title={isEn ? 'Edit' : 'সম্পাদনা'}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDuplicateMeas(p)}
                                  title={isEn ? 'Duplicate' : 'কপি করুন'}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMeas(p)}
                                  title={isEn ? 'Delete' : 'মুছুন'}
                                  className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            {/* Dimension values */}
                            <div className="grid grid-cols-3 gap-1 text-center my-2">
                              {relevantFields.slice(0, 6).map((fKey) => {
                                const def = FIELD_DEFINITIONS[fKey];
                                const val = (p as any)[fKey];
                                if (val === undefined || val === null || val === 0 || val === '') return null;
                                return (
                                  <div key={fKey} className="rounded-lg bg-blue-50/50 p-1 border border-blue-100">
                                    <span className="text-[9px] text-blue-800 font-bold block truncate">
                                      {isEn ? def.labelEn : def.labelBn.split(' ')[0]}
                                    </span>
                                    <span className="text-xs font-black text-slate-900">
                                      {val}{typeof val === 'number' ? `"` : ''}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomerPhone(null);
                                handleNewOrderWithProfile(p);
                              }}
                              className="w-full flex items-center justify-center gap-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 py-1.5 text-xs font-black transition active:scale-95 shadow-2xs"
                            >
                              <Scissors className="h-3 w-3" />
                              <span>{isEn ? 'Create Order With This Profile' : 'এই মাপে নতুন অর্ডার'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-white rounded-2xl border border-blue-200">
                    <Ruler className="h-8 w-8 text-blue-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">
                      {isEn ? 'No measurement profile saved for this customer.' : 'এই কাস্টমারের কোন পরিমাপ সংরক্ষিত নেই।'}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenAddMeas({
                          name: activeCustomer.name,
                          phone: activeCustomer.phone,
                          address: activeCustomer.address,
                        })
                      }
                      className="mt-2.5 inline-flex items-center gap-1 rounded-xl bg-blue-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs hover:bg-blue-600"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>{isEn ? '+ Add First Measurement' : '+ প্রথম পরিমাপ যোগ করুন'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Order History Section */}
              <div className="space-y-3">
                <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-emerald-700" />
                  <span>{isEn ? 'Order History' : 'অর্ডার ইতিহাস'} ({activeCustomer.invoices.length})</span>
                </h4>

                {activeCustomer.invoices.length > 0 ? (
                  <div className="space-y-2">
                    {activeCustomer.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => {
                          setSelectedCustomerPhone(null);
                          onNavigateToInvoiceDetail(inv.id);
                        }}
                        className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-slate-900">#{inv.id}</span>
                            <span className="text-[10px] rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                              {inv.dressType}
                            </span>
                            <span className="text-[10px] rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold">
                              {inv.orderStatus}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {isEn ? 'Date' : 'তারিখ'}: {inv.orderDate} | {isEn ? 'Delivery' : 'ডেলিভারি'}: {inv.deliveryDate}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-xs text-slate-900">
                            {shop.currency} {inv.netTotal.toFixed(0)}
                          </p>
                          {inv.remainingDue > 0 && (
                            <p className="text-[10px] font-black text-rose-700">
                              বাকি: {shop.currency} {inv.remainingDue.toFixed(0)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl text-center">
                    {isEn ? 'No previous orders found for this customer.' : 'কোন পূর্ববর্তী অর্ডার নেই।'}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  sendWhatsAppCustomMessage(
                    activeCustomer.phone,
                    `Hello *${activeCustomer.name}*, greeting from *${shop.name}*!`
                  )
                }
                className="flex items-center gap-1 rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-200 px-3.5 py-2 text-xs font-black transition"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-700" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerPhone(null);
                  onNavigateToNewOrderWithCustomer(
                    activeCustomer.name,
                    activeCustomer.phone,
                    activeCustomer.address
                  );
                }}
                className="flex items-center gap-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2 text-xs font-black shadow-md transition active:scale-95"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>{isEn ? '+ Create New Order' : '+ নতুন অর্ডার তৈরি'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Measurement Add / Edit Modal */}
      <MeasurementProfileModal
        isOpen={isMeasModalOpen}
        mode={measModalMode}
        initialMeasurement={targetMeasurement}
        initialCustomer={targetCustomerForMeas}
        existingCustomers={customerList.map((c) => ({ name: c.name, phone: c.phone, address: c.address }))}
        lang={lang}
        onClose={() => setIsMeasModalOpen(false)}
        onSave={handleSaveModalMeas}
      />
    </div>
  );
};
