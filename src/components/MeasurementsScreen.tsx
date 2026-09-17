import React, { useState, useMemo } from 'react';
import { Shop, Invoice, Measurement, Language } from '../types';
import {
  Ruler,
  Search,
  Phone,
  Copy,
  Check,
  PlusCircle,
  HelpCircle,
  Edit3,
  Calendar,
  Sparkles,
  Trash2,
  User,
  Tag,
  Star,
  Share2,
  FileText,
  MapPin,
  Scissors,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getStoredMeasurements,
  saveSingleMeasurementProfile,
  deleteStoredMeasurementProfile,
  setStoredDefaultMeasurementProfile,
} from '../utils/storage';
import {
  STANDARD_MEASUREMENT_TYPES,
  cloneMeasurementSnapshot,
  formatMeasurementShareText,
  getMeasurementProfileTitle,
  getFieldsForDressType,
  FIELD_DEFINITIONS,
} from '../utils/measurementProfiles';
import { MeasurementProfileModal } from './MeasurementProfileModal';

interface MeasurementsScreenProps {
  shop: Shop;
  invoices: Invoice[];
  measurements?: Measurement[];
  lang?: Language;
  onNavigateToNewOrderWithMeasurement: (
    measurement: Measurement,
    customerName: string,
    customerPhone: string,
    customerAddress?: string,
    dressType?: string
  ) => void;
  onOpenVisualGuide: () => void;
  onNavigateToInvoiceDetail: (invoiceId: string) => void;
  onUpdateInvoiceMeasurement?: (invoiceId: string, measurement: Measurement) => void;
  onSaveStandaloneMeasurement?: (measurement: Measurement) => void;
  onDeleteStandaloneMeasurement?: (measurementId: string) => void;
  onSetDefaultMeasurementProfile?: (profileId: string, customerPhone: string) => void;
}

export const MeasurementsScreen: React.FC<MeasurementsScreenProps> = ({
  shop,
  invoices,
  measurements: propMeasurements,
  lang = 'BN',
  onNavigateToNewOrderWithMeasurement,
  onOpenVisualGuide,
  onNavigateToInvoiceDetail,
  onUpdateInvoiceMeasurement,
  onSaveStandaloneMeasurement,
  onDeleteStandaloneMeasurement,
  onSetDefaultMeasurementProfile,
}) => {
  const isEn = lang === 'EN';

  // Standalone list from props or local storage
  const [internalList, setInternalList] = useState<Measurement[]>(() => getStoredMeasurements());
  const activeMeasurements = propMeasurements || internalList;

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [viewGrouping, setViewGrouping] = useState<'customer' | 'flat'>('customer');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'duplicate'>('add');
  const [modalTargetMeasurement, setModalTargetMeasurement] = useState<Measurement | null>(null);
  const [modalInitialCustomer, setModalInitialCustomer] = useState<{ name: string; phone: string; address?: string } | null>(null);

  // Compile list of known customers from invoices and measurements
  const existingCustomers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; address?: string }>();
    invoices.forEach((inv) => {
      const phone = inv.customerPhone.trim();
      if (phone && !map.has(phone)) {
        map.set(phone, { name: inv.customerName, phone, address: inv.customerAddress });
      }
    });
    activeMeasurements.forEach((m) => {
      const phone = m.customerPhone?.trim();
      if (phone && !map.has(phone)) {
        map.set(phone, { name: m.customerName, phone, address: m.customerAddress });
      }
    });
    return Array.from(map.values());
  }, [invoices, activeMeasurements]);

  // Unified list of all measurement profiles (standalone profiles + invoice measurements)
  const allProfiles = useMemo(() => {
    const list: Measurement[] = [...activeMeasurements];

    // Also include any invoice measurements if they are not already in standalone
    invoices.forEach((inv) => {
      if (inv.measurement) {
        const alreadyExists = list.some(
          (m) =>
            m.id === inv.measurement!.id ||
            (m.invoiceId && m.invoiceId === inv.id)
        );
        if (!alreadyExists) {
          list.push({
            ...inv.measurement,
            id: `inv-${inv.id}`,
            invoiceId: inv.id,
            customerName: inv.customerName,
            customerPhone: inv.customerPhone,
            customerAddress: inv.customerAddress,
            profileName: inv.measurement.profileName || `${inv.measurement.dressType || inv.dressType || 'Order'} (Invoice #${inv.id})`,
            dressType: inv.measurement.dressType || inv.dressType || 'Other',
          });
        }
      }
    });

    return list;
  }, [activeMeasurements, invoices]);

  // Filter profiles based on search and type
  const filteredProfiles = useMemo(() => {
    return allProfiles.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (p.customerName || '').toLowerCase().includes(q) ||
        (p.customerPhone || '').toLowerCase().includes(q) ||
        (p.profileName || '').toLowerCase().includes(q) ||
        (p.dressType || '').toLowerCase().includes(q) ||
        (p.invoiceId && p.invoiceId.toLowerCase().includes(q));

      const matchesType =
        selectedTypeFilter === 'all' ||
        (p.dressType || '').toLowerCase() === selectedTypeFilter.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [allProfiles, searchQuery, selectedTypeFilter]);

  // Group profiles by customer
  const groupedByCustomer = useMemo(() => {
    const map = new Map<string, { customerName: string; customerPhone: string; customerAddress?: string; profiles: Measurement[] }>();

    filteredProfiles.forEach((p) => {
      const phoneKey = (p.customerPhone || '').trim() || (p.customerName || '').trim() || 'Unknown';
      if (!map.has(phoneKey)) {
        map.set(phoneKey, {
          customerName: p.customerName || 'Unnamed Customer',
          customerPhone: p.customerPhone || '',
          customerAddress: p.customerAddress,
          profiles: [],
        });
      }
      map.get(phoneKey)!.profiles.push(p);
    });

    return Array.from(map.values()).sort((a, b) => b.profiles.length - a.profiles.length);
  }, [filteredProfiles]);

  // Copy text to clipboard
  const handleCopyProfileText = (profile: Measurement) => {
    const text = formatMeasurementShareText(profile, shop.name, lang);
    navigator.clipboard.writeText(text);
    setCopiedId(profile.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Open Add Modal
  const handleOpenAdd = (customer?: { name: string; phone: string; address?: string }) => {
    setModalMode('add');
    setModalTargetMeasurement(null);
    setModalInitialCustomer(customer || null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (profile: Measurement) => {
    setModalMode('edit');
    setModalTargetMeasurement(profile);
    setModalInitialCustomer({
      name: profile.customerName,
      phone: profile.customerPhone,
      address: profile.customerAddress,
    });
    setIsModalOpen(true);
  };

  // Open Duplicate Modal
  const handleOpenDuplicate = (profile: Measurement) => {
    setModalMode('duplicate');
    setModalTargetMeasurement(profile);
    setModalInitialCustomer({
      name: profile.customerName,
      phone: profile.customerPhone,
      address: profile.customerAddress,
    });
    setIsModalOpen(true);
  };

  // Handle Save from Modal
  const handleSaveModalProfile = (savedProfile: Measurement) => {
    // If it's linked to an invoice and being edited, also trigger invoice measurement update
    if (savedProfile.invoiceId && onUpdateInvoiceMeasurement) {
      onUpdateInvoiceMeasurement(savedProfile.invoiceId, savedProfile);
    }

    const updated = saveSingleMeasurementProfile(savedProfile);
    setInternalList(updated);
    if (onSaveStandaloneMeasurement) {
      onSaveStandaloneMeasurement(savedProfile);
    }
  };

  // Handle Delete Profile
  const handleDelete = (profile: Measurement) => {
    const confirmMsg = isEn
      ? `Are you sure you want to delete profile "${profile.profileName || profile.dressType}" for ${profile.customerName}?`
      : `আপনি কি নিশ্চিত যে "${profile.profileName || profile.dressType}" পরিমাপ প্রোফাইলটি মুছে ফেলতে চান?`;

    if (window.confirm(confirmMsg)) {
      const updated = deleteStoredMeasurementProfile(profile.id);
      setInternalList(updated);
      if (onDeleteStandaloneMeasurement) {
        onDeleteStandaloneMeasurement(profile.id);
      }
    }
  };

  // Handle Toggle Default Profile
  const handleToggleDefault = (profile: Measurement) => {
    if (!profile.customerPhone) return;
    const updated = setStoredDefaultMeasurementProfile(profile.id, profile.customerPhone);
    setInternalList(updated);
    if (onSetDefaultMeasurementProfile) {
      onSetDefaultMeasurementProfile(profile.id, profile.customerPhone);
    }
  };

  // Handle Copy to New Order
  const handleCopyToNewOrder = (profile: Measurement) => {
    const independentSnapshot = cloneMeasurementSnapshot(profile);
    onNavigateToNewOrderWithMeasurement(
      independentSnapshot,
      profile.customerName,
      profile.customerPhone,
      profile.customerAddress,
      profile.dressType
    );
  };

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Top Header Card */}
      <div className="rounded-3xl border-2 border-slate-700/60 bg-slate-950 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="rounded-2xl bg-amber-400 p-2.5 text-slate-950 font-black shadow-md shrink-0 flex items-center justify-center ring-2 ring-amber-300/40">
              <Ruler className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-amber-400 drop-shadow-sm">
                {isEn ? 'Measurement System & Profiles' : 'পরিমাপ ও গ্রাহক প্রোফাইল ব্যবস্থাপনা'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 font-medium mt-0.5">
                {isEn
                  ? 'One customer can have multiple measurement profiles (e.g. Panjabi Regular, Panjabi Slim, Shirt, Pant, Pajama).'
                  : 'একই গ্রাহকের একাধিক পরিমাপ প্রোফাইল (যেমন: পাঞ্জাবি রেগুলার, পাঞ্জাবি স্লিম, শার্ট, প্যান্ট, পায়জামা) সংরক্ষণ ও পরিচালনা করুন।'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenVisualGuide}
            className="flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800/90 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-bold text-white transition cursor-pointer active:scale-95 shadow-sm"
          >
            <HelpCircle className="h-4 w-4 text-amber-400" />
            <span>{isEn ? 'Visual Measurement Guide' : 'পরিমাপ গাইড'}</span>
          </button>

          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 text-xs font-black shadow-lg transition cursor-pointer active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{isEn ? '+ Add Measurement Profile' : '+ নতুন পরিমাপ যোগ করুন'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isEn
                  ? 'Search by customer name, phone, profile name, dress type...'
                  : 'কাস্টমারের নাম, ফোন, প্রোফাইলের নাম (যেমন: পাঞ্জাবি স্লিম), পোশাক দিয়ে খুঁজুন...'
              }
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewGrouping('customer')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                  viewGrouping === 'customer'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>{isEn ? 'By Customer' : 'গ্রাহক অনুযায়ী'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewGrouping('flat')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                  viewGrouping === 'flat'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>{isEn ? 'All Profiles' : 'সকল প্রোফাইল'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Garment Type Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setSelectedTypeFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              selectedTypeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isEn ? 'All Types' : 'সব ধরণ'} ({allProfiles.length})
          </button>
          {STANDARD_MEASUREMENT_TYPES.map((type) => {
            const count = allProfiles.filter((p) => (p.dressType || '').toLowerCase() === type.toLowerCase()).length;
            if (count === 0 && selectedTypeFilter !== type) return null;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedTypeFilter(type)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  selectedTypeFilter === type
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {type} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {viewGrouping === 'customer' ? (
        /* 1. Grouped by Customer View */
        <div className="space-y-4">
          {groupedByCustomer.map((group, gIdx) => (
            <div
              key={gIdx}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
            >
              {/* Customer Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-base shadow-2xs">
                    {group.customerName.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-base">{group.customerName}</h3>
                      <span className="rounded-full bg-blue-100 text-blue-800 font-bold px-2 py-0.5 text-[11px]">
                        {group.profiles.length} {isEn ? 'Profiles' : 'টি প্রোফাইল'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 text-emerald-600" />
                      <span>{group.customerPhone || 'No Phone'}</span>
                      {group.customerAddress && (
                        <>
                          <span className="text-slate-300">•</span>
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[200px]">{group.customerAddress}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleOpenAdd({
                      name: group.customerName,
                      phone: group.customerPhone,
                      address: group.customerAddress,
                    })
                  }
                  className="flex items-center gap-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 px-3 py-2 text-xs font-bold transition active:scale-95 self-start sm:self-auto"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-emerald-700" />
                  <span>{isEn ? '+ Add Measurement for' : '+ আরও পরিমাপ যোগ করুন'} {group.customerName.split(' ')[0]}</span>
                </button>
              </div>

              {/* Profiles Grid for this Customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-4">
                {group.profiles.map((profile) => (
                  <MeasurementCard
                    key={profile.id}
                    profile={profile}
                    isEn={isEn}
                    shop={shop}
                    copiedId={copiedId}
                    onCopyText={handleCopyProfileText}
                    onCopyToNewOrder={handleCopyToNewOrder}
                    onEdit={handleOpenEdit}
                    onDuplicate={handleOpenDuplicate}
                    onToggleDefault={handleToggleDefault}
                    onDelete={handleDelete}
                    onViewInvoice={onNavigateToInvoiceDetail}
                  />
                ))}
              </div>
            </div>
          ))}

          {groupedByCustomer.length === 0 && (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
              <Ruler className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700 text-sm">
                {isEn ? 'No measurement profiles found matching your search.' : 'কোন পরিমাপ প্রোফাইল পাওয়া যায়নি।'}
              </p>
              <button
                onClick={() => handleOpenAdd()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 text-white px-4 py-2 text-xs font-bold shadow-sm hover:bg-emerald-700 transition"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{isEn ? '+ Add First Measurement Profile' : '+ নতুন পরিমাপ যোগ করুন'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 2. Flat Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProfiles.map((profile) => (
            <MeasurementCard
              key={profile.id}
              profile={profile}
              isEn={isEn}
              shop={shop}
              copiedId={copiedId}
              onCopyText={handleCopyProfileText}
              onCopyToNewOrder={handleCopyToNewOrder}
              onEdit={handleOpenEdit}
              onDuplicate={handleOpenDuplicate}
              onToggleDefault={handleToggleDefault}
              onDelete={handleDelete}
              onViewInvoice={onNavigateToInvoiceDetail}
            />
          ))}

          {filteredProfiles.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
              <Ruler className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700 text-sm">
                {isEn ? 'No measurement profiles found.' : 'কোন পরিমাপ প্রোফাইল পাওয়া যায়নি।'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Measurement Add / Edit / Duplicate Modal */}
      <MeasurementProfileModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialMeasurement={modalTargetMeasurement}
        initialCustomer={modalInitialCustomer}
        existingCustomers={existingCustomers}
        lang={lang}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModalProfile}
      />
    </div>
  );
};

interface MeasurementCardProps {
  profile: Measurement;
  isEn: boolean;
  shop: Shop;
  copiedId: string | null;
  onCopyText: (profile: Measurement) => void;
  onCopyToNewOrder: (profile: Measurement) => void;
  onEdit: (profile: Measurement) => void;
  onDuplicate: (profile: Measurement) => void;
  onToggleDefault: (profile: Measurement) => void;
  onDelete: (profile: Measurement) => void;
  onViewInvoice: (invoiceId: string) => void;
}

const MeasurementCard: React.FC<MeasurementCardProps> = ({
  profile,
  isEn,
  shop,
  copiedId,
  onCopyText,
  onCopyToNewOrder,
  onEdit,
  onDuplicate,
  onToggleDefault,
  onDelete,
  onViewInvoice,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const relevantFields = getFieldsForDressType(profile.dressType);
  const isCopied = copiedId === profile.id;
  const isInvoiceSnapshot = !!profile.invoiceId;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 hover:bg-white hover:border-blue-300 transition shadow-2xs flex flex-col justify-between">
      <div>
        {/* Profile Header */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-black text-slate-900 text-sm">
                {getMeasurementProfileTitle(profile)}
              </h4>
              <span className="rounded-md bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] font-bold">
                {profile.dressType}
              </span>
              {profile.isDefault && (
                <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 text-[10px] font-black flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-600" />
                  {isEn ? 'Default' : 'প্রধান'}
                </span>
              )}
            </div>

            <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-1">
              <User className="h-3 w-3 text-slate-400" />
              <span>{profile.customerName}</span>
              <span className="text-slate-300">•</span>
              <Phone className="h-3 w-3 text-emerald-600" />
              <span>{profile.customerPhone}</span>
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleDefault(profile)}
              title={profile.isDefault ? (isEn ? 'Default Profile' : 'ডিফল্ট প্রোফাইল') : (isEn ? 'Set as Default' : 'ডিফল্ট করুন')}
              className={`p-1.5 rounded-lg border transition ${
                profile.isDefault
                  ? 'bg-amber-100 border-amber-300 text-amber-600'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-amber-500'
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${profile.isDefault ? 'fill-amber-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => onCopyText(profile)}
              title={isEn ? 'Copy formatted text / WhatsApp' : 'কপি করুন'}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Core Dimensions Preview */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-center mt-2.5">
          {relevantFields.slice(0, 6).map((fKey) => {
            const def = FIELD_DEFINITIONS[fKey];
            const val = (profile as any)[fKey];
            if (val === undefined || val === null || val === 0 || val === '') return null;
            return (
              <div key={fKey} className="rounded-lg bg-white border border-slate-200 p-1.5">
                <span className="text-[10px] text-slate-500 font-bold block truncate">
                  {isEn ? def.labelEn : def.labelBn.split(' ')[0]}
                </span>
                <span className="text-xs font-black text-slate-900">
                  {val}{typeof val === 'number' ? `"` : ''}
                </span>
              </div>
            );
          })}
        </div>

        {/* Collapsible details for extra fields, custom fields & notes */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
            {/* Remaining Fields */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-center">
              {relevantFields.slice(6).map((fKey) => {
                const def = FIELD_DEFINITIONS[fKey];
                const val = (profile as any)[fKey];
                if (val === undefined || val === null || val === 0 || val === '') return null;
                return (
                  <div key={fKey} className="rounded-lg bg-white border border-slate-200 p-1.5">
                    <span className="text-[10px] text-slate-500 font-bold block truncate">
                      {isEn ? def.labelEn : def.labelBn.split(' ')[0]}
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      {val}{typeof val === 'number' ? `"` : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Custom User Fields */}
            {profile.customFields && profile.customFields.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-2 text-xs space-y-1">
                <span className="font-black text-[10px] text-purple-700 uppercase">
                  {isEn ? 'Custom Fields' : 'কাস্টম ফিল্ড'}:
                </span>
                <div className="flex flex-wrap gap-2">
                  {profile.customFields.map((cf) => (
                    <span key={cf.id} className="rounded-md bg-purple-50 px-2 py-0.5 font-bold text-purple-900 border border-purple-100">
                      {cf.name}: {cf.value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {profile.designNotes && (
              <p className="text-[11px] text-slate-700 bg-white p-2 rounded-xl border border-slate-200">
                <strong className="text-slate-900">{isEn ? 'Notes: ' : 'নোট: '}</strong>
                {profile.designNotes}
              </p>
            )}

            {profile.specialInstructions && (
              <p className="text-[11px] text-slate-700 bg-white p-2 rounded-xl border border-slate-200">
                <strong className="text-slate-900">{isEn ? 'Special: ' : 'নির্দেশ: '}</strong>
                {profile.specialInstructions}
              </p>
            )}

            {isInvoiceSnapshot && profile.invoiceId && (
              <div className="flex items-center justify-between text-[11px] text-blue-700 bg-blue-50 p-2 rounded-xl border border-blue-200">
                <span>{isEn ? `Attached to Invoice #${profile.invoiceId}` : `ইনভয়েস #${profile.invoiceId} এর সাথে যুক্ত`}</span>
                <button
                  type="button"
                  onClick={() => onViewInvoice(profile.invoiceId!)}
                  className="font-bold underline hover:text-blue-900"
                >
                  {isEn ? 'View Invoice' : 'ইনভয়েস দেখুন'}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
        >
          {isExpanded ? (
            <>
              <span>{isEn ? 'Show Less' : 'সংক্ষেপ করুন'}</span>
              <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              <span>{isEn ? 'View Full Dimensions & Notes' : 'সম্পূর্ণ পরিমাপ ও নোট দেখুন'}</span>
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      </div>

      {/* Action Buttons Footer */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => onCopyToNewOrder(profile)}
          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-2 text-xs font-black shadow-2xs transition active:scale-95 cursor-pointer"
        >
          <Scissors className="h-3.5 w-3.5" />
          <span>{isEn ? 'Copy to New Order' : 'এই মাপে নতুন অর্ডার'}</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(profile)}
            title={isEn ? 'Edit Profile' : 'সম্পাদনা'}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDuplicate(profile)}
            title={isEn ? 'Duplicate / Copy Profile' : 'কপি করুন'}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(profile)}
            title={isEn ? 'Delete Profile' : 'মুছে ফেলুন'}
            className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
