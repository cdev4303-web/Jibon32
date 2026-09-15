import React, { useState, useEffect } from 'react';
import { Measurement, CustomMeasurementField, Language } from '../types';
import {
  STANDARD_MEASUREMENT_TYPES,
  getFieldsForDressType,
  FIELD_DEFINITIONS,
  cloneMeasurementSnapshot,
} from '../utils/measurementProfiles';
import {
  X,
  Save,
  Ruler,
  User,
  Phone,
  Tag,
  Plus,
  Trash2,
  Star,
  Sparkles,
  MapPin,
  Check,
} from 'lucide-react';

interface MeasurementProfileModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'duplicate';
  initialMeasurement?: Measurement | null;
  initialCustomer?: { name: string; phone: string; address?: string } | null;
  existingCustomers?: { name: string; phone: string; address?: string }[];
  lang?: Language;
  onClose: () => void;
  onSave: (measurement: Measurement) => void;
}

export const MeasurementProfileModal: React.FC<MeasurementProfileModalProps> = ({
  isOpen,
  mode,
  initialMeasurement,
  initialCustomer,
  existingCustomers = [],
  lang = 'BN',
  onClose,
  onSave,
}) => {
  const isEn = lang === 'EN';

  // Customer state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedCustomerMode, setSelectedCustomerMode] = useState<'select' | 'new'>('new');

  // Profile details
  const [dressType, setDressType] = useState('Panjabi');
  const [customDressTypeName, setCustomDressTypeName] = useState('');
  const [profileName, setProfileName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [unit, setUnit] = useState('inches');

  // Core & garment fields
  const [lengthVal, setLengthVal] = useState('');
  const [chestVal, setChestVal] = useState('');
  const [waistVal, setWaistVal] = useState('');
  const [hipVal, setHipVal] = useState('');
  const [shoulderVal, setShoulderVal] = useState('');
  const [sleeveVal, setSleeveVal] = useState('');
  const [neckVal, setNeckVal] = useState('');
  const [cuffVal, setCuffVal] = useState('');
  const [thighVal, setThighVal] = useState('');
  const [bottomVal, setBottomVal] = useState('');
  const [inseamVal, setInseamVal] = useState('');
  const [flareVal, setFlareVal] = useState('');
  const [collarVal, setCollarVal] = useState('');

  // Custom user-defined fields
  const [customFields, setCustomFields] = useState<CustomMeasurementField[]>([]);
  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const [newCustomFieldValue, setNewCustomFieldValue] = useState('');
  const [showAllFields, setShowAllFields] = useState(false);

  // Notes
  const [designNotes, setDesignNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [formError, setFormError] = useState('');

  // Synchronize when modal opens or initialMeasurement changes
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && initialMeasurement) {
      setCustomerName(initialMeasurement.customerName || '');
      setCustomerPhone(initialMeasurement.customerPhone || '');
      setCustomerAddress(initialMeasurement.customerAddress || '');
      setDressType(initialMeasurement.dressType || 'Panjabi');
      setProfileName(initialMeasurement.profileName || '');
      setIsDefault(!!initialMeasurement.isDefault);
      setUnit(initialMeasurement.unit || 'inches');
      setLengthVal(initialMeasurement.length ? String(initialMeasurement.length) : '');
      setChestVal(initialMeasurement.bodyChest ? String(initialMeasurement.bodyChest) : '');
      setWaistVal(initialMeasurement.waist ? String(initialMeasurement.waist) : '');
      setHipVal(initialMeasurement.hip ? String(initialMeasurement.hip) : '');
      setShoulderVal(initialMeasurement.shoulder ? String(initialMeasurement.shoulder) : '');
      setSleeveVal(initialMeasurement.sleeve ? String(initialMeasurement.sleeve) : '');
      setNeckVal(initialMeasurement.neck ? String(initialMeasurement.neck) : '');
      setCuffVal(initialMeasurement.cuff ? String(initialMeasurement.cuff) : '');
      setThighVal(initialMeasurement.thigh ? String(initialMeasurement.thigh) : '');
      setBottomVal(initialMeasurement.bottom ? String(initialMeasurement.bottom) : '');
      setInseamVal(initialMeasurement.inseam ? String(initialMeasurement.inseam) : '');
      setFlareVal(initialMeasurement.flareBottom ? String(initialMeasurement.flareBottom) : '');
      setCollarVal(initialMeasurement.collar || '');
      setCustomFields(initialMeasurement.customFields ? [...initialMeasurement.customFields] : []);
      setDesignNotes(initialMeasurement.designNotes || '');
      setSpecialInstructions(initialMeasurement.specialInstructions || '');
      setFormError('');
    } else if (mode === 'duplicate' && initialMeasurement) {
      setCustomerName(initialMeasurement.customerName || '');
      setCustomerPhone(initialMeasurement.customerPhone || '');
      setCustomerAddress(initialMeasurement.customerAddress || '');
      setDressType(initialMeasurement.dressType || 'Panjabi');
      const baseName = initialMeasurement.profileName || initialMeasurement.dressType;
      setProfileName(`${baseName} (Copy)`);
      setIsDefault(false);
      setUnit(initialMeasurement.unit || 'inches');
      setLengthVal(initialMeasurement.length ? String(initialMeasurement.length) : '');
      setChestVal(initialMeasurement.bodyChest ? String(initialMeasurement.bodyChest) : '');
      setWaistVal(initialMeasurement.waist ? String(initialMeasurement.waist) : '');
      setHipVal(initialMeasurement.hip ? String(initialMeasurement.hip) : '');
      setShoulderVal(initialMeasurement.shoulder ? String(initialMeasurement.shoulder) : '');
      setSleeveVal(initialMeasurement.sleeve ? String(initialMeasurement.sleeve) : '');
      setNeckVal(initialMeasurement.neck ? String(initialMeasurement.neck) : '');
      setCuffVal(initialMeasurement.cuff ? String(initialMeasurement.cuff) : '');
      setThighVal(initialMeasurement.thigh ? String(initialMeasurement.thigh) : '');
      setBottomVal(initialMeasurement.bottom ? String(initialMeasurement.bottom) : '');
      setInseamVal(initialMeasurement.inseam ? String(initialMeasurement.inseam) : '');
      setFlareVal(initialMeasurement.flareBottom ? String(initialMeasurement.flareBottom) : '');
      setCollarVal(initialMeasurement.collar || '');
      setCustomFields(initialMeasurement.customFields ? [...initialMeasurement.customFields] : []);
      setDesignNotes(initialMeasurement.designNotes || '');
      setSpecialInstructions(initialMeasurement.specialInstructions || '');
      setFormError('');
    } else {
      // Add mode
      if (initialCustomer) {
        setCustomerName(initialCustomer.name || '');
        setCustomerPhone(initialCustomer.phone || '');
        setCustomerAddress(initialCustomer.address || '');
      } else {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
      }
      setDressType('Panjabi');
      setCustomDressTypeName('');
      setProfileName('Panjabi Regular');
      setIsDefault(false);
      setUnit('inches');
      setLengthVal('');
      setChestVal('');
      setWaistVal('');
      setHipVal('');
      setShoulderVal('');
      setSleeveVal('');
      setNeckVal('');
      setCuffVal('');
      setThighVal('');
      setBottomVal('');
      setInseamVal('');
      setFlareVal('');
      setCollarVal('');
      setCustomFields([]);
      setDesignNotes('');
      setSpecialInstructions('');
      setFormError('');
    }
  }, [isOpen, mode, initialMeasurement, initialCustomer]);

  if (!isOpen) return null;

  const effectiveDressType = dressType === 'Other' && customDressTypeName.trim()
    ? customDressTypeName.trim()
    : dressType;

  const relevantFieldKeys = showAllFields
    ? Object.keys(FIELD_DEFINITIONS)
    : getFieldsForDressType(effectiveDressType);

  const handleSelectExistingCustomer = (phone: string) => {
    const cust = existingCustomers.find((c) => c.phone === phone);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone);
      if (cust.address) setCustomerAddress(cust.address);
    }
  };

  const handleAddCustomField = () => {
    if (!newCustomFieldName.trim()) return;
    setCustomFields([
      ...customFields,
      {
        id: `cf-${Date.now()}`,
        name: newCustomFieldName.trim(),
        value: newCustomFieldValue.trim(),
      },
    ]);
    setNewCustomFieldName('');
    setNewCustomFieldValue('');
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter((cf) => cf.id !== id));
  };

  const handleDressTypeChange = (type: string) => {
    setDressType(type);
    // Auto-update profile name default if empty or matches standard pattern
    if (!profileName || profileName.includes('Regular') || profileName.includes('Profile')) {
      setProfileName(`${type} Regular`);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setFormError(isEn ? 'Please enter customer name.' : 'অনুগ্রহ করে কাস্টমারের নাম লিখুন।');
      return;
    }
    if (!customerPhone.trim()) {
      setFormError(isEn ? 'Please enter mobile number.' : 'অনুগ্রহ করে মোবাইল নম্বর লিখুন।');
      return;
    }

    const finalProfileName = profileName.trim() || `${effectiveDressType} Profile`;

    const measurement: Measurement = {
      id: mode === 'edit' && initialMeasurement ? initialMeasurement.id : `meas-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      invoiceId: mode === 'edit' && initialMeasurement ? initialMeasurement.invoiceId : undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      profileName: finalProfileName,
      dressType: effectiveDressType,
      isDefault,
      length: parseFloat(lengthVal) || 0,
      bodyChest: parseFloat(chestVal) || 0,
      waist: parseFloat(waistVal) || 0,
      hip: parseFloat(hipVal) || 0,
      shoulder: parseFloat(shoulderVal) || 0,
      sleeve: parseFloat(sleeveVal) || 0,
      neck: parseFloat(neckVal) || 0,
      cuff: parseFloat(cuffVal) || undefined,
      thigh: parseFloat(thighVal) || undefined,
      bottom: parseFloat(bottomVal) || undefined,
      inseam: parseFloat(inseamVal) || undefined,
      flareBottom: parseFloat(flareVal) || 0,
      collar: collarVal.trim() || undefined,
      customFields,
      unit,
      designNotes: designNotes.trim(),
      specialInstructions: specialInstructions.trim(),
      createdAt: mode === 'edit' && initialMeasurement?.createdAt ? initialMeasurement.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    onSave(measurement);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="border-b border-slate-200 bg-slate-900 text-white px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-amber-400 p-2 text-slate-950 font-black">
                <Ruler className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">
                  {mode === 'add' && (isEn ? 'Add Measurement Profile' : 'নতুন পরিমাপ প্রোফাইল যোগ করুন')}
                  {mode === 'edit' && (isEn ? 'Edit Measurement Profile' : 'পরিমাপ প্রোফাইল সম্পাদনা')}
                  {mode === 'duplicate' && (isEn ? 'Duplicate / Copy Measurement' : 'পরিমাপ কপি / ডুপ্লিকেট করুন')}
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  {isEn
                    ? 'Customer → Measurement Type → Measurement Values'
                    : 'কাস্টমার → পোশাকের ধরণ → পরিমাপের মাপসমূহ'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 3-Step Breadcrumb Bar */}
          <div className="mt-3.5 flex items-center justify-between rounded-xl bg-slate-800/90 p-2 border border-slate-700/80 text-[11px] font-bold">
            <div className="flex items-center gap-1.5 text-emerald-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                1
              </span>
              <span>{isEn ? 'Customer' : '১. কাস্টমার'}</span>
            </div>
            <span className="text-slate-500 font-black">→</span>
            <div className="flex items-center gap-1.5 text-blue-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-black">
                2
              </span>
              <span>{isEn ? 'Measurement Type' : '২. পোশাকের ধরণ'}</span>
            </div>
            <span className="text-slate-500 font-black">→</span>
            <div className="flex items-center gap-1.5 text-amber-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                3
              </span>
              <span>{isEn ? 'Measurement' : '৩. পরিমাপ'}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
              {formError}
            </div>
          )}

          {/* Step 1. Customer Selection / Entry */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-black">
                  1
                </span>
                <User className="h-4 w-4 text-emerald-700" />
                {isEn ? 'Customer Details' : 'কাস্টমারের তথ্য'}
              </label>
              {existingCustomers.length > 0 && !initialCustomer && mode === 'add' && (
                <div className="flex rounded-lg bg-slate-200 p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerMode('new')}
                    className={`px-2.5 py-1 rounded-md transition ${selectedCustomerMode === 'new' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600'}`}
                  >
                    {isEn ? 'New' : 'নতুন'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerMode('select')}
                    className={`px-2.5 py-1 rounded-md transition ${selectedCustomerMode === 'select' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600'}`}
                  >
                    {isEn ? 'Pick Existing' : 'তালিকা থেকে'}
                  </button>
                </div>
              )}
            </div>

            {selectedCustomerMode === 'select' && existingCustomers.length > 0 && (
              <div>
                <select
                  onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>
                    {isEn ? '-- Select an existing customer --' : '-- পরিচিত কাস্টমার নির্বাচন করুন --'}
                  </option>
                  {existingCustomers.map((c, i) => (
                    <option key={i} value={c.phone}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Customer Name *' : 'কাস্টমারের নাম *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={isEn ? 'e.g. Rahim Ahmed' : 'যেমন: রহিম আহমেদ'}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Mobile / WhatsApp Number *' : 'মোবাইল / WhatsApp নম্বর *'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={isEn ? 'e.g. 017XXXXXXXX' : 'যেমন: ০১৭১XXXXXXX'}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isEn ? 'Address / Location (Optional)' : 'ঠিকানা / এলাকা (ঐচ্ছিক)'}
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder={isEn ? 'e.g. Ruwi, Muscat' : 'যেমন: বাড়ি নং, রোড, এলাকা'}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Step 2. Measurement Type & Profile Name */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-black">
                2
              </span>
              <Tag className="h-4 w-4 text-blue-700" />
              {isEn ? 'Measurement Type & Profile' : 'পোশাকের ধরণ ও পরিমাপ প্রোফাইল'}
            </label>

            <div>
              <span className="block text-[11px] font-bold text-slate-600 mb-2">
                {isEn ? 'Select Measurement Type:' : 'পোশাকের ধরণ নির্বাচন করুন:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {STANDARD_MEASUREMENT_TYPES.map((type) => {
                  const isSelected = dressType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleDressTypeChange(type)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {dressType === 'Other' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Custom Garment / Type Name' : 'কাস্টম পোশাকের নাম'}
                </label>
                <input
                  type="text"
                  value={customDressTypeName}
                  onChange={(e) => setCustomDressTypeName(e.target.value)}
                  placeholder={isEn ? 'e.g. Safari Suit / Coat' : 'যেমন: শেরওয়ানি, সাফারি স্যুট'}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Profile Name (e.g. Panjabi Regular / Slim)' : 'প্রোফাইলের নাম (যেমন: পাঞ্জাবি রেগুলার / স্লিম)'}
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Panjabi Regular"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Regular', 'Slim Fit', 'Loose Fit', 'Eid Special', 'Wedding'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setProfileName(`${effectiveDressType} ${sug}`)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold hover:bg-slate-200"
                    >
                      +{sug}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Measurement Unit' : 'পরিমাপের একক'}
                </label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setUnit('inches')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
                      unit === 'inches'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isEn ? 'Inches (ইঞ্চি ")' : 'ইঞ্চি (")'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit('cm')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
                      unit === 'cm'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isEn ? 'CM (সেমি)' : 'সেমি (CM)'}
                  </button>
                </div>

                <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded-md border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Star className={`h-3.5 w-3.5 ${isDefault ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                    {isEn ? 'Set as Default Profile for this Customer' : 'এই কাস্টমারের প্রধান (ডিফল্ট) প্রোফাইল করুন'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Step 3. Garment Tailoring Fields */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                    3
                  </span>
                  <Ruler className="h-4 w-4 text-blue-600" />
                  {isEn ? `Measurements for ${effectiveDressType}` : `${effectiveDressType} এর পরিমাপ (${unit})`}
                </h4>
                <p className="text-[11px] text-blue-800 font-medium">
                  {isEn ? 'Enter tailoring dimensions in ' + unit : unit + ' অনুযায়ী মাপের সংখ্যা লিখুন'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllFields(!showAllFields)}
                className="text-[11px] font-bold text-blue-700 underline hover:text-blue-900"
              >
                {showAllFields
                  ? (isEn ? 'Show Garment Specific' : 'পোশাকের প্রয়োজনীয় ফিল্ড দেখুন')
                  : (isEn ? 'Show All Fields' : 'সব ফিল্ড দেখুন')}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {relevantFieldKeys.includes('length') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Length' : 'লম্বা (Length)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={lengthVal}
                    onChange={(e) => setLengthVal(e.target.value)}
                    placeholder="40"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-black text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              {relevantFieldKeys.includes('bodyChest') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Chest / Bust' : 'বডি/বুক (Chest)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={chestVal}
                    onChange={(e) => setChestVal(e.target.value)}
                    placeholder="38"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-black text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              {relevantFieldKeys.includes('waist') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Waist' : 'কোমর/পেট (Waist)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={waistVal}
                    onChange={(e) => setWaistVal(e.target.value)}
                    placeholder="34"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-black text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              {relevantFieldKeys.includes('hip') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Hip' : 'হিপ (Hip)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={hipVal}
                    onChange={(e) => setHipVal(e.target.value)}
                    placeholder="40"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-black text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              {relevantFieldKeys.includes('shoulder') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Shoulder' : 'পুট/কাঁধ (Shoulder)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={shoulderVal}
                    onChange={(e) => setShoulderVal(e.target.value)}
                    placeholder="17.5"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-black text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              {relevantFieldKeys.includes('sleeve') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Sleeve' : 'হাতা (Sleeve)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={sleeveVal}
                    onChange={(e) => setSleeveVal(e.target.value)}
                    placeholder="24"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-black text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              {relevantFieldKeys.includes('neck') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Neck' : 'গলা (Neck)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={neckVal}
                    onChange={(e) => setNeckVal(e.target.value)}
                    placeholder="15.5"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-black text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              {relevantFieldKeys.includes('cuff') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Cuff / Mohori' : 'কাফ/মোহরী (Cuff)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={cuffVal}
                    onChange={(e) => setCuffVal(e.target.value)}
                    placeholder="9.5"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-black text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              {relevantFieldKeys.includes('thigh') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Thigh' : 'রান/থাই (Thigh)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={thighVal}
                    onChange={(e) => setThighVal(e.target.value)}
                    placeholder="26"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-black text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              {relevantFieldKeys.includes('bottom') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Bottom Opening' : 'পায়ের মোহরী (Bottom)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={bottomVal}
                    onChange={(e) => setBottomVal(e.target.value)}
                    placeholder="14"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-black text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              {relevantFieldKeys.includes('inseam') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Inseam / High' : 'ইনসিম/হাই (Inseam)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={inseamVal}
                    onChange={(e) => setInseamVal(e.target.value)}
                    placeholder="30"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-black text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              {relevantFieldKeys.includes('flareBottom') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Flare / Gher' : 'ঘের (Bottom Flare)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={flareVal}
                    onChange={(e) => setFlareVal(e.target.value)}
                    placeholder="70"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-black text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              {relevantFieldKeys.includes('collar') && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-blue-900 mb-1">
                    {isEn ? 'Collar Type' : 'কলার ধরণ (Collar)'}
                  </label>
                  <input
                    type="text"
                    value={collarVal}
                    onChange={(e) => setCollarVal(e.target.value)}
                    placeholder="যেমন: গোল / ব্যান্ড"
                    className="w-full rounded-lg border border-slate-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-bold text-slate-900 text-center focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4. Custom Measurement Fields (User Defined) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-600" />
                {isEn ? 'Custom Measurement Fields' : 'কাস্টম পরিমাপ ফিল্ড'}
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {isEn ? 'Add any tailor-specific measurement' : 'যে কোনো অতিরিক্ত মাপ যোগ করুন'}
              </span>
            </div>

            {customFields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {customFields.map((cf) => (
                  <div
                    key={cf.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-700">{cf.name}: </span>
                      <span className="font-black text-slate-950">{cf.value}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(cf.id)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newCustomFieldName}
                onChange={(e) => setNewCustomFieldName(e.target.value)}
                placeholder={isEn ? 'Field Name (e.g. Armhole, Knee)' : 'ফিল্ডের নাম (যেমন: বগল/আর্মহোল, হাঁটু)'}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
              />
              <input
                type="text"
                value={newCustomFieldValue}
                onChange={(e) => setNewCustomFieldValue(e.target.value)}
                placeholder={isEn ? 'Value (e.g. 18")' : 'মান (যেমন: ১৮")'}
                className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
              />
              <button
                type="button"
                onClick={handleAddCustomField}
                disabled={!newCustomFieldName.trim()}
                className="rounded-xl bg-purple-700 text-white px-3 py-2 text-xs font-bold hover:bg-purple-800 disabled:opacity-40 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 5. Notes & Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isEn ? 'Design Notes' : 'ডিজাইন ও কাটিং নোট'}
              </label>
              <textarea
                rows={2}
                value={designNotes}
                onChange={(e) => setDesignNotes(e.target.value)}
                placeholder={isEn ? 'e.g. 2 front pockets, snap buttons' : 'যেমন: সামনে ২ পকেট, লুকানো বোতাম'}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isEn ? 'Special Instructions' : 'কারিগরকে বিশেষ নির্দেশ'}
              </label>
              <textarea
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder={isEn ? 'e.g. Extra 1 inch allowance on sides' : 'যেমন: দুই পাশে ১ ইঞ্চি কাপড় বাড়তি রাখতে হবে'}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              {isEn ? 'Cancel' : 'বাতিল'}
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-black shadow-md transition active:scale-95 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>
                {mode === 'add' && (isEn ? 'Save Profile' : 'প্রোফাইল সংরক্ষণ')}
                {mode === 'edit' && (isEn ? 'Update Profile' : 'আপডেট সংরক্ষণ')}
                {mode === 'duplicate' && (isEn ? 'Save as New Profile' : 'নতুন কপি সংরক্ষণ')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
