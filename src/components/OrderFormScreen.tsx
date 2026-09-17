import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Invoice, InvoiceItem, Measurement, Shop, CatalogItem, Language, CustomMeasurementField } from '../types';
import { strings } from '../utils/strings';
import { calculateAiMeasurements, AI_DISCLAIMER_EN, AI_DISCLAIMER_BN } from '../utils/aiEstimate';
import { getStoredDressCategories, getStoredMeasurements, saveSingleMeasurementProfile } from '../utils/storage';
import {
  getCustomerMeasurementProfiles,
  cloneMeasurementSnapshot,
  getMeasurementProfileTitle,
  getFieldsForDressType,
  FIELD_DEFINITIONS,
} from '../utils/measurementProfiles';
import { CameraCaptureModal } from './CameraCaptureModal';
import { CatalogSelectModal } from './CatalogSelectModal';
import { VisualGuideModal } from './VisualGuideModal';
import {
  Save,
  Plus,
  Trash2,
  Camera,
  Ruler,
  Sparkles,
  ArrowLeft,
  Upload,
  ZoomIn,
  X,
  FileText,
  Star,
  Check,
  CheckCircle2,
  Mic,
  MicOff,
  Wand2,
  Bot,
} from 'lucide-react';
import { parseInvoiceWithAi, AiInvoiceDraft } from '../utils/aiInvoiceParser';
import { compressImageFile, compressDataUri } from '../utils/imageCompressor';

interface OrderFormScreenProps {
  shop: Shop;
  catalogItems?: CatalogItem[];
  lang: Language;
  editingInvoice?: Invoice | null;
  initialInvoice?: Invoice | null;
  initialCatalogItem?: CatalogItem | null;
  prefillCustomer?: { name: string; phone: string; address?: string } | null;
  prefillMeasurement?: Measurement | null;
  prefillCatalogItem?: CatalogItem | null;
  onSaveInvoice?: (invoice: Invoice) => void;
  onSave?: (invoice: Invoice) => void;
  onCancel: () => void;
}

export const OrderFormScreen: React.FC<OrderFormScreenProps> = ({
  shop,
  catalogItems = [],
  lang,
  editingInvoice,
  initialInvoice: propInitialInvoice,
  initialCatalogItem,
  prefillCustomer,
  prefillMeasurement,
  prefillCatalogItem,
  onSaveInvoice,
  onSave,
  onCancel,
}) => {
  const isEn = lang === 'EN';
  const t = strings[lang] || strings.BN;
  const initialInvoice = editingInvoice || propInitialInvoice;
  const effectiveCatalogItem = initialCatalogItem || prefillCatalogItem;

  // Helper date generators
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultDeliveryStr = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];

  // Form State
  const [invoiceId, setInvoiceId] = useState(
    initialInvoice ? initialInvoice.id : `JT-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [customerName, setCustomerName] = useState(
    initialInvoice?.customerName || prefillCustomer?.name || ''
  );
  const [customerPhone, setCustomerPhone] = useState(
    initialInvoice?.customerPhone || prefillCustomer?.phone || ''
  );
  const [customerAddress, setCustomerAddress] = useState(initialInvoice?.customerAddress || '');
  const [orderDate, setOrderDate] = useState(initialInvoice?.orderDate || todayStr);
  const [deliveryDate, setDeliveryDate] = useState(initialInvoice?.deliveryDate || defaultDeliveryStr);
  const [dressType, setDressType] = useState(
    initialInvoice?.dressType || effectiveCatalogItem?.category || 'Abaya'
  );
  const [orderStatus, setOrderStatus] = useState<Invoice['orderStatus']>(
    initialInvoice?.orderStatus || 'Pending'
  );

  // Items
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (initialInvoice?.items && initialInvoice.items.length > 0) {
      return initialInvoice.items;
    }
    if (effectiveCatalogItem) {
      return [
        {
          id: `item-${Date.now()}`,
          invoiceId: initialInvoice ? initialInvoice.id : '',
          description: `${effectiveCatalogItem.name} (${effectiveCatalogItem.catalogCode})`,
          quantity: 1,
          unitPrice: effectiveCatalogItem.price,
          totalPrice: effectiveCatalogItem.price,
          catalogCode: effectiveCatalogItem.catalogCode,
        },
      ];
    }
    return [
      {
        id: `item-${Date.now()}`,
        invoiceId: '',
        description: '',
        quantity: '' as any,
        unitPrice: 0,
        totalPrice: 0,
      },
    ];
  });

  // Financials
  const [discountStr, setDiscountStr] = useState(
    initialInvoice?.discount ? initialInvoice.discount.toString() : ''
  );
  const [advanceStr, setAdvanceStr] = useState(
    initialInvoice?.advanceDeposit ? initialInvoice.advanceDeposit.toString() : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>(
    initialInvoice?.paymentMethod || 'Cash'
  );
  const [bankReference, setBankReference] = useState(initialInvoice?.bankReference || '');
  const [notes, setNotes] = useState(initialInvoice?.notes || '');

  // Photos (4 slots)
  const [clothPhoto, setClothPhoto] = useState<string | undefined>(initialInvoice?.clothPhotoUri);
  const [dressDesignPhoto, setDressDesignPhoto] = useState<string | undefined>(
    initialInvoice?.dressDesignPhotoUri || effectiveCatalogItem?.imageUri
  );
  const [customerDesignPhoto, setCustomerDesignPhoto] = useState<string | undefined>(
    initialInvoice?.customerDesignPhotoUri
  );
  const [extraPhoto, setExtraPhoto] = useState<string | undefined>(
    initialInvoice?.extraPhotoUri
  );

  // Lightbox preview for photos
  const [previewPhoto, setPreviewPhoto] = useState<{ uri: string; label: string } | null>(null);

  // Measurements
  const initM = initialInvoice?.measurement || prefillMeasurement;
  const [mLength, setMLength] = useState(initM?.length ? initM.length.toString() : '');
  const [mChest, setMChest] = useState(initM?.bodyChest ? initM.bodyChest.toString() : '');
  const [mWaist, setMWaist] = useState(initM?.waist ? initM.waist.toString() : '');
  const [mHip, setMHip] = useState(initM?.hip ? initM.hip.toString() : '');
  const [mShoulder, setMShoulder] = useState(initM?.shoulder ? initM.shoulder.toString() : '');
  const [mSleeve, setMSleeve] = useState(initM?.sleeve ? initM.sleeve.toString() : '');
  const [mNeck, setMNeck] = useState(initM?.neck ? initM.neck.toString() : '');
  const [mFlare, setMFlare] = useState(initM?.flareBottom ? initM.flareBottom.toString() : '');
  const [mCuff, setMCuff] = useState(initM?.cuff ? initM.cuff.toString() : '');
  const [mThigh, setMThigh] = useState(initM?.thigh ? initM.thigh.toString() : '');
  const [mBottom, setMBottom] = useState(initM?.bottom ? initM.bottom.toString() : '');
  const [mInseam, setMInseam] = useState(initM?.inseam ? initM.inseam.toString() : '');
  const [mCollar, setMCollar] = useState(initM?.collar || '');
  const [mProfileName, setMProfileName] = useState(initM?.profileName || '');
  const [mCustomFields, setMCustomFields] = useState<CustomMeasurementField[]>(initM?.customFields ? [...initM.customFields] : []);
  const [mDesignNotes, setMDesignNotes] = useState(initM?.designNotes || '');
  const [mSpecialInstructions, setMSpecialInstructions] = useState(
    initM?.specialInstructions || ''
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(initM?.id || null);
  const [saveAsNewProfile, setSaveAsNewProfile] = useState(false);
  const [newProfileSaveName, setNewProfileSaveName] = useState('');

  // Customer Profiles
  const availableCustomerProfiles = useMemo(() => {
    if (!customerPhone.trim() && !customerName.trim()) return [];
    const all = getStoredMeasurements();
    return getCustomerMeasurementProfiles(all, customerPhone, customerName);
  }, [customerPhone, customerName]);

  // Handler to apply a selected profile to the order's measurement form
  const handleSelectProfile = (profile: Measurement) => {
    setSelectedProfileId(profile.id);
    setMProfileName(profile.profileName || profile.dressType);
    setMLength(profile.length ? profile.length.toString() : '');
    setMChest(profile.bodyChest ? profile.bodyChest.toString() : '');
    setMWaist(profile.waist ? profile.waist.toString() : '');
    setMHip(profile.hip ? profile.hip.toString() : '');
    setMShoulder(profile.shoulder ? profile.shoulder.toString() : '');
    setMSleeve(profile.sleeve ? profile.sleeve.toString() : '');
    setMNeck(profile.neck ? profile.neck.toString() : '');
    setMFlare(profile.flareBottom ? profile.flareBottom.toString() : '');
    setMCuff(profile.cuff ? profile.cuff.toString() : '');
    setMThigh(profile.thigh ? profile.thigh.toString() : '');
    setMBottom(profile.bottom ? profile.bottom.toString() : '');
    setMInseam(profile.inseam ? profile.inseam.toString() : '');
    setMCollar(profile.collar || '');
    setMCustomFields(profile.customFields ? [...profile.customFields] : []);
    if (profile.designNotes && !mDesignNotes) setMDesignNotes(profile.designNotes);
    if (profile.specialInstructions && !mSpecialInstructions) setMSpecialInstructions(profile.specialInstructions);
  };

  // Auto-suggest default or matching profile when customer phone is typed
  useEffect(() => {
    if (!initialInvoice && !selectedProfileId && availableCustomerProfiles.length > 0) {
      const defProf = availableCustomerProfiles.find((p) => p.isDefault) ||
        availableCustomerProfiles.find((p) => (p.dressType || '').toLowerCase() === (dressType || '').toLowerCase()) ||
        availableCustomerProfiles[0];
      if (defProf && !mLength && !mChest) {
        handleSelectProfile(defProf);
      }
    }
  }, [availableCustomerProfiles, initialInvoice]);

  // AI Voice & Text Invoice Assistant States
  const [aiInvoicePrompt, setAiInvoicePrompt] = useState('');
  const [isGeneratingAiInvoice, setIsGeneratingAiInvoice] = useState(false);
  const [isAiListening, setIsAiListening] = useState(false);
  const [aiVoiceError, setAiVoiceError] = useState<string | null>(null);
  const [aiSuccessToast, setAiSuccessToast] = useState<{
    summaryBn: string;
    summaryEn: string;
    customerName: string;
    itemsCount: number;
    totalAmount: number;
    currency: string;
  } | null>(null);

  // Web Speech API recognition for voice input
  const handleToggleAiVoice = () => {
    if (isAiListening) {
      setIsAiListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAiVoiceError(
        isEn
          ? 'Voice recognition is not supported in this browser. Please type your prompt.'
          : 'এই ব্রাউজারে ভয়েস সাপোর্ট নেই। অনুগ্রহ করে লিখে দিন।'
      );
      setTimeout(() => setAiVoiceError(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = isEn ? 'en-US' : 'bn-BD';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsAiListening(true);
        setAiVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setAiInvoicePrompt(transcript);
          handleApplyAiInvoice(transcript);
        }
        setIsAiListening(false);
      };

      recognition.onerror = () => {
        setIsAiListening(false);
        setAiVoiceError(isEn ? 'Could not hear voice clearly. Please try typing.' : 'ভয়েস পরিষ্কার শোনা যায়নি। অনুগ্রহ করে লিখে দিন।');
        setTimeout(() => setAiVoiceError(null), 4000);
      };

      recognition.onend = () => {
        setIsAiListening(false);
      };

      recognition.start();
    } catch {
      setIsAiListening(false);
      setAiVoiceError(isEn ? 'Microphone access failed.' : 'মাইক্রোফোন চালু করা যায়নি।');
      setTimeout(() => setAiVoiceError(null), 4000);
    }
  };

  // AI Invoice Generation Handler
  const handleApplyAiInvoice = async (customPrompt?: string) => {
    const textToProcess = (customPrompt !== undefined ? customPrompt : aiInvoicePrompt).trim();
    if (!textToProcess || isGeneratingAiInvoice) return;

    setIsGeneratingAiInvoice(true);
    setAiVoiceError(null);

    try {
      const draft = await parseInvoiceWithAi(textToProcess, shop.currency || 'OMR');

      // Populate Form Fields
      if (draft.customerNameBn || draft.customerName) {
        setCustomerName(draft.customerNameBn || draft.customerName);
      }
      if (draft.customerPhone) {
        setCustomerPhone(draft.customerPhone);
      }
      if (draft.customerAddress) {
        setCustomerAddress(draft.customerAddress);
      }
      if (draft.dressType) {
        setDressType(draft.dressType);
      }
      if (draft.deliveryDate) {
        setDeliveryDate(draft.deliveryDate);
      }
      if (draft.advanceDeposit > 0) {
        setAdvanceStr(draft.advanceDeposit.toString());
      }
      if (draft.discount > 0) {
        setDiscountStr(draft.discount.toString());
      }

      // Populate line items
      if (draft.items && draft.items.length > 0) {
        setItems(
          draft.items.map((it, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            invoiceId,
            description: it.descriptionBn ? `${it.descriptionBn} (${it.descriptionEn || it.description})` : it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
          }))
        );
      }

      // Populate notes
      const notesParts = [notes.trim(), draft.specialNotesBn, draft.specialNotesEn].filter(Boolean);
      setNotes(notesParts.join('\n'));

      // Show success feedback
      setAiSuccessToast({
        summaryBn: draft.summaryBn,
        summaryEn: draft.summaryEn,
        customerName: draft.customerNameBn || draft.customerName,
        itemsCount: draft.items.reduce((sum, it) => sum + (it.quantity || 1), 0),
        totalAmount: draft.netTotal,
        currency: draft.currency || shop.currency || 'OMR',
      });
    } catch {
      setAiVoiceError(
        isEn
          ? 'Failed to process AI invoice command. Please try again.'
          : 'AI ইনভয়েস তৈরি ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'
      );
      setTimeout(() => setAiVoiceError(null), 4000);
    } finally {
      setIsGeneratingAiInvoice(false);
    }
  };

  // Sync Form State
  useEffect(() => {
    if (initialInvoice) {
      setInvoiceId(initialInvoice.id);
      setCustomerName(initialInvoice.customerName || '');
      setCustomerPhone(initialInvoice.customerPhone || '');
      setCustomerAddress(initialInvoice.customerAddress || '');
      setOrderDate(initialInvoice.orderDate || todayStr);
      setDeliveryDate(initialInvoice.deliveryDate || defaultDeliveryStr);
      setDressType(initialInvoice.dressType || 'Panjabi');
      setOrderStatus(initialInvoice.orderStatus || 'Pending');
      if (initialInvoice.items && initialInvoice.items.length > 0) {
        setItems(initialInvoice.items);
      } else {
        setItems([
          {
            id: `item-${Date.now()}`,
            invoiceId: initialInvoice.id,
            description: `Custom Tailoring (${initialInvoice.dressType})`,
            quantity: 1,
            unitPrice: initialInvoice.subtotal || 0,
            totalPrice: initialInvoice.subtotal || 0,
          },
        ]);
      }
      setDiscountStr(initialInvoice.discount ? initialInvoice.discount.toString() : '');
      setAdvanceStr(initialInvoice.advanceDeposit ? initialInvoice.advanceDeposit.toString() : '');
      setPaymentMethod(initialInvoice.paymentMethod || 'Cash');
      setBankReference(initialInvoice.bankReference || '');
      setNotes(initialInvoice.notes || '');
      setClothPhoto(initialInvoice.clothPhotoUri);
      setDressDesignPhoto(initialInvoice.dressDesignPhotoUri);
      setCustomerDesignPhoto(initialInvoice.customerDesignPhotoUri);
      setExtraPhoto(initialInvoice.extraPhotoUri);

      const m = initialInvoice.measurement;
      setMLength(m?.length ? m.length.toString() : '');
      setMChest(m?.bodyChest ? m.bodyChest.toString() : '');
      setMWaist(m?.waist ? m.waist.toString() : '');
      setMHip(m?.hip ? m.hip.toString() : '');
      setMShoulder(m?.shoulder ? m.shoulder.toString() : '');
      setMSleeve(m?.sleeve ? m.sleeve.toString() : '');
      setMNeck(m?.neck ? m.neck.toString() : '');
      setMFlare(m?.flareBottom ? m.flareBottom.toString() : '');
      setMCuff(m?.cuff ? m.cuff.toString() : '');
      setMThigh(m?.thigh ? m.thigh.toString() : '');
      setMBottom(m?.bottom ? m.bottom.toString() : '');
      setMInseam(m?.inseam ? m.inseam.toString() : '');
      setMCollar(m?.collar || '');
      setMProfileName(m?.profileName || '');
      setMCustomFields(m?.customFields ? [...m.customFields] : []);
      setMDesignNotes(m?.designNotes || '');
      setMSpecialInstructions(m?.specialInstructions || '');
    } else if (prefillCustomer) {
      setCustomerName(prefillCustomer.name);
      setCustomerPhone(prefillCustomer.phone);
      if (prefillCustomer.address) setCustomerAddress(prefillCustomer.address);
    } else if (prefillMeasurement) {
      handleSelectProfile(prefillMeasurement);
    } else if (effectiveCatalogItem) {
      setDressType(effectiveCatalogItem.category);
      setDressDesignPhoto(effectiveCatalogItem.imageUri);
      setItems([
        {
          id: `item-${Date.now()}`,
          invoiceId: '',
          description: `${effectiveCatalogItem.name} (${effectiveCatalogItem.catalogCode})`,
          quantity: 1,
          unitPrice: effectiveCatalogItem.price,
          totalPrice: effectiveCatalogItem.price,
          catalogCode: effectiveCatalogItem.catalogCode,
        },
      ]);
    }
  }, [initialInvoice, prefillCustomer, prefillMeasurement, effectiveCatalogItem]);

  // Modals
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activePhotoSlot, setActivePhotoSlot] = useState<1 | 2 | 3 | 4>(1);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isVisualGuideOpen, setIsVisualGuideOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSizeCategory, setAiSizeCategory] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL'>('M');

  // File Inputs
  const clothFileInputRef = useRef<HTMLInputElement | null>(null);
  const dressFileInputRef = useRef<HTMLInputElement | null>(null);
  const sketchFileInputRef = useRef<HTMLInputElement | null>(null);
  const extraFileInputRef = useRef<HTMLInputElement | null>(null);

  // Financial Calculations
  const subtotal = items.reduce((acc, it) => acc + (it.totalPrice || 0), 0);
  const discount = parseFloat(discountStr) || 0;
  const netTotal = Math.max(0, subtotal - discount);
  const advance = parseFloat(advanceStr) || 0;
  const remainingDue = Math.max(0, netTotal - advance);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        invoiceId,
        description: '',
        quantity: '' as any,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const handleUpdateItem = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };
      if (field === 'quantity') {
        const valStr = value.toString().trim();
        const qty = valStr === '' ? ('' as any) : parseInt(valStr, 10);
        current.quantity = qty;
        const effectiveQty = typeof qty === 'number' && !isNaN(qty) && qty > 0 ? qty : 1;
        current.totalPrice = effectiveQty * (current.unitPrice || 0);
      } else if (field === 'unitPrice') {
        const valStr = value.toString().trim();
        const price = valStr === '' ? 0 : parseFloat(valStr) || 0;
        current.unitPrice = price;
        const effectiveQty = Number(current.quantity) > 0 ? Number(current.quantity) : 1;
        current.totalPrice = effectiveQty * price;
      } else if (field === 'description') {
        current.description = value as string;
      }
      updated[index] = current;
      return updated;
    });
  };

  const handleDeleteItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleCatalogSelect = (catItem: CatalogItem) => {
    setDressType(catItem.category);
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        invoiceId,
        description: `${catItem.name} (${catItem.catalogCode})`,
        quantity: 1,
        unitPrice: catItem.price,
        totalPrice: catItem.price,
        catalogCode: catItem.catalogCode,
      },
    ]);
    if (catItem.imageUri && !dressDesignPhoto) {
      setDressDesignPhoto(catItem.imageUri);
    }
  };

  const openCameraForSlot = (slot: 1 | 2 | 3 | 4) => {
    setActivePhotoSlot(slot);
    setIsCameraOpen(true);
  };

  const handleCameraCapture = async (dataUri: string) => {
    try {
      const optimizedUri = await compressDataUri(dataUri, { maxWidth: 1080, maxHeight: 1080, quality: 0.72 });
      if (activePhotoSlot === 1) setClothPhoto(optimizedUri);
      if (activePhotoSlot === 2) setDressDesignPhoto(optimizedUri);
      if (activePhotoSlot === 3) setCustomerDesignPhoto(optimizedUri);
      if (activePhotoSlot === 4) setExtraPhoto(optimizedUri);
    } catch {
      if (activePhotoSlot === 1) setClothPhoto(dataUri);
      if (activePhotoSlot === 2) setDressDesignPhoto(dataUri);
      if (activePhotoSlot === 3) setCustomerDesignPhoto(dataUri);
      if (activePhotoSlot === 4) setExtraPhoto(dataUri);
    }
    setIsCameraOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2 | 3 | 4) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedUri = await compressImageFile(file, { maxWidth: 1080, maxHeight: 1080, quality: 0.72 });
      if (slot === 1) setClothPhoto(compressedUri);
      if (slot === 2) setDressDesignPhoto(compressedUri);
      if (slot === 3) setCustomerDesignPhoto(compressedUri);
      if (slot === 4) setExtraPhoto(compressedUri);
    } catch (err) {
      console.warn('Failed to compress gallery image:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result as string;
        if (slot === 1) setClothPhoto(dataUri);
        if (slot === 2) setDressDesignPhoto(dataUri);
        if (slot === 3) setCustomerDesignPhoto(dataUri);
        if (slot === 4) setExtraPhoto(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyAiEstimate = () => {
    const est = calculateAiMeasurements({ dressType, sizeCategory: aiSizeCategory, customerName, customerPhone });
    if (est.length) setMLength(est.length.toString());
    if (est.bodyChest) setMChest(est.bodyChest.toString());
    if (est.waist) setMWaist(est.waist.toString());
    if (est.hip) setMHip(est.hip.toString());
    if (est.shoulder) setMShoulder(est.shoulder.toString());
    if (est.sleeve) setMSleeve(est.sleeve.toString());
    if (est.neck) setMNeck(est.neck.toString());
    if (est.flareBottom) setMFlare(est.flareBottom.toString());
    setShowAiModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const activeMeasurementData: Partial<Measurement> = {
      profileName: mProfileName.trim() || `${dressType} Profile`,
      customerPhone: customerPhone.trim(),
      customerName: customerName.trim(),
      customerAddress: customerAddress.trim(),
      dressType,
      unit: 'inches',
      length: parseFloat(mLength) || 0,
      bodyChest: parseFloat(mChest) || 0,
      waist: parseFloat(mWaist) || 0,
      hip: parseFloat(mHip) || 0,
      shoulder: parseFloat(mShoulder) || 0,
      sleeve: parseFloat(mSleeve) || 0,
      neck: parseFloat(mNeck) || 0,
      flareBottom: parseFloat(mFlare) || 0,
      cuff: parseFloat(mCuff) || 0,
      thigh: parseFloat(mThigh) || 0,
      bottom: parseFloat(mBottom) || 0,
      inseam: parseFloat(mInseam) || 0,
      collar: mCollar.trim() || undefined,
      customFields: mCustomFields.length > 0 ? mCustomFields : undefined,
      designNotes: mDesignNotes || '',
      specialInstructions: mSpecialInstructions || '',
      updatedAt: Date.now(),
    };

    // Store immutable snapshot on the invoice
    const measurementSnapshot = cloneMeasurementSnapshot(activeMeasurementData, invoiceId);

    // If tailor chose to also save this as a new standalone profile for the customer:
    if (saveAsNewProfile && customerPhone.trim()) {
      const newProfile: Measurement = {
        id: `MP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        profileName: newProfileSaveName.trim() || `${dressType} Profile`,
        customerPhone: customerPhone.trim(),
        customerName: customerName.trim(),
        customerAddress: customerAddress.trim(),
        dressType,
        unit: 'inches',
        length: parseFloat(mLength) || 0,
        bodyChest: parseFloat(mChest) || 0,
        waist: parseFloat(mWaist) || 0,
        hip: parseFloat(mHip) || 0,
        shoulder: parseFloat(mShoulder) || 0,
        sleeve: parseFloat(mSleeve) || 0,
        neck: parseFloat(mNeck) || 0,
        flareBottom: parseFloat(mFlare) || 0,
        cuff: parseFloat(mCuff) || 0,
        thigh: parseFloat(mThigh) || 0,
        bottom: parseFloat(mBottom) || 0,
        inseam: parseFloat(mInseam) || 0,
        collar: mCollar.trim() || undefined,
        customFields: mCustomFields.length > 0 ? mCustomFields : undefined,
        designNotes: mDesignNotes || '',
        specialInstructions: mSpecialInstructions || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveSingleMeasurementProfile(newProfile);
    }

    const finalInvoice: Invoice = {
      id: invoiceId,
      shopId: shop.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      orderDate,
      deliveryDate,
      dressType,
      items: items.map((it) => ({
        ...it,
        quantity: typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1,
      })),
      subtotal,
      discount,
      netTotal,
      advanceDeposit: advance,
      remainingDue,
      paymentMethod,
      bankReference: paymentMethod === 'Bank' ? bankReference : undefined,
      orderStatus,
      clothPhotoUri: clothPhoto,
      dressDesignPhotoUri: dressDesignPhoto,
      customerDesignPhotoUri: customerDesignPhoto,
      extraPhotoUri: extraPhoto,
      measurement: measurementSnapshot,
      notes: notes.trim() || undefined,
      payments: initialInvoice?.payments || [
        ...(advance > 0
          ? [
              {
                id: `P-${Date.now()}`,
                invoiceId,
                customerPhone: customerPhone.trim(),
                amount: advance,
                paymentMethod,
                bankReference: paymentMethod === 'Bank' ? bankReference : undefined,
                paymentDate: orderDate,
                notes: 'Advance at order booking',
                createdAt: Date.now(),
              },
            ]
          : []),
      ],
      createdAt: initialInvoice?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    if (onSaveInvoice) {
      onSaveInvoice(finalInvoice);
    } else if (onSave) {
      onSave(finalInvoice);
    }
  };

  const dressTypes = getStoredDressCategories();

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {initialInvoice ? t.editInvoice : t.newOrder}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isEn ? 'Invoice #' : 'ইনভয়েস #'}: <span className="font-bold text-emerald-800">{invoiceId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-800 px-5 py-2 text-xs font-black text-white shadow-md hover:bg-emerald-900 active:scale-95 transition"
          >
            <Save className="h-4 w-4" />
            {t.saveInvoice}
          </button>
        </div>
      </div>

      {/* ✨ AI SMART INVOICE ASSISTANT (Voice & Text Autofill) */}
      <div className="rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-white p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-emerald-950">
                  {isEn ? 'AI Smart Invoice Assistant' : '✨ শক্তিশালী AI দিয়ে নিমেষেই ইনভয়েস সাজান'}
                </h3>
                <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-300/60">
                  {isEn ? 'Gemini 3.8 Flash • বাংলা ও EN' : 'Gemini AI • বাংলা ও ইংলিশ'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 font-medium">
                {isEn
                  ? 'Speak or type: e.g. "2 shirts for Jibon 8 OMR" or "জীবনের ২টি জামা ৮ OMR" — AI auto-formats customer, items, prices, and totals.'
                  : 'মুখে বলুন বা লিখুন: যেমন « তুমি জীবনের 2টি জামা 8 omr » — নিমেষেই কাস্টমার নাম, আইটেম, দর ও হিসাব স্বয়ংক্রিয়ভাবে বসে যাবে!'}
              </p>
            </div>
          </div>
        </div>

        {/* Voice and Text Input Bar */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={aiInvoicePrompt}
              onChange={(e) => setAiInvoicePrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyAiInvoice();
                }
              }}
              placeholder={isEn ? 'e.g. 2 dresses for Jibon 8 omr / জীবনের ২টি জামা ৮ OMR...' : 'যেমন: তুমি জীবনের 2টি জামা 8 omr...'}
              className="w-full rounded-xl border border-emerald-300 bg-white px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
            />
            {aiInvoicePrompt && (
              <button
                type="button"
                onClick={() => setAiInvoicePrompt('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Mic Button */}
            <button
              type="button"
              onClick={handleToggleAiVoice}
              title={isEn ? 'Voice Input' : 'ভয়েস ইনপুট'}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer ${
                isAiListening
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                  : 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              {isAiListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-emerald-700" />}
              <span>{isAiListening ? (isEn ? 'Listening...' : 'শুনছি...') : (isEn ? 'Voice' : 'ভয়েস')}</span>
            </button>

            {/* AI Generate Button */}
            <button
              type="button"
              disabled={isGeneratingAiInvoice || !aiInvoicePrompt.trim()}
              onClick={() => handleApplyAiInvoice()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 px-4 py-2.5 text-xs font-black text-white hover:from-emerald-800 hover:to-teal-800 active:scale-95 transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingAiInvoice ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin text-emerald-200" />
                  <span>{isEn ? 'Formatting...' : 'AI সাজাচ্ছে...'}</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 text-emerald-200" />
                  <span>{isEn ? 'Generate with AI' : 'AI দিয়ে সাজান'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error notification if any */}
        {aiVoiceError && (
          <p className="text-[11px] text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 font-semibold">
            {aiVoiceError}
          </p>
        )}

        {/* Quick Clickable Suggestions */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            {isEn ? 'Quick prompts:' : 'দ্রুত ট্রাই করুন:'}
          </span>
          {[
            { labelBn: '✨ জীবনের ২টি জামা ৮ OMR', labelEn: '✨ Jibon 2 Dresses 8 OMR', text: 'তুমি জীবনের 2টি জামা 8 omr' },
            { labelBn: 'ফাতিমার ৩টি আবায়া ২৪ OMR, ১০ অগ্রিম', labelEn: 'Fatima 3 Abayas 24 OMR, 10 Adv', text: 'ফাতিমার ৩টি আবায়া ২৪ OMR, ১০ ওএমআর অগ্রিম' },
            { labelBn: 'রাহুলের ১টি পাঞ্জাবি ৫ OMR', labelEn: 'Rahul 1 Punjabi 5 OMR', text: 'রাহুলের ১টি পাঞ্জাবি ৫ OMR' },
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setAiInvoicePrompt(chip.text);
                handleApplyAiInvoice(chip.text);
              }}
              className="rounded-lg border border-emerald-200 bg-white/90 px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100 hover:border-emerald-300 transition shadow-2xs active:scale-95 cursor-pointer"
            >
              {isEn ? chip.labelEn : chip.labelBn}
            </button>
          ))}
        </div>

        {/* Live AI Success Toast / Confirmation Card */}
        {aiSuccessToast && (
          <div className="rounded-xl border border-emerald-400 bg-emerald-100/70 p-3 shadow-xs animate-fadeIn space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-black text-emerald-950">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>{isEn ? 'AI Invoice Successfully Formatted!' : '✨ AI সফলভাবে ইনভয়েস সাজিয়েছে!'}</span>
              </div>
              <button
                type="button"
                onClick={() => setAiSuccessToast(null)}
                className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-emerald-900 font-medium">
              {isEn ? aiSuccessToast.summaryEn : aiSuccessToast.summaryBn}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-bold text-emerald-950">
              <span className="bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                {isEn ? 'Customer:' : 'কাস্টমার:'} {aiSuccessToast.customerName}
              </span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                {isEn ? 'Total Items:' : 'মোট আইটেম:'} {aiSuccessToast.itemsCount}টি
              </span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                {isEn ? 'Net Bill:' : 'সর্বমোট দর:'} {aiSuccessToast.currency} {aiSuccessToast.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 1. Customer & Order Info Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-emerald-950 border-b border-slate-100 pb-2">
          {t.customerInfo}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {t.customerName}
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={isEn ? 'e.g. Fatima Al-Balushi / Sarah Ahmed' : 'যেমন: ফাতেমা আক্তার / Fatima Al-Balushi'}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-950 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 placeholder-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {t.mobileNumber} (WhatsApp)
            </label>
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder={isEn ? 'e.g. +968 91234567 or +88017...' : 'যেমন: +88017... বা +968 9123...'}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-950 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 placeholder-slate-400"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {t.addressLocation}
            </label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder={isEn ? 'e.g. Villa 14, Al-Khuwair, Muscat' : 'যেমন: বাড়ি #১২, রোড #৪, ঢাকা / Ruwi, Muscat'}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-emerald-700 placeholder-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {t.orderDate}
            </label>
            <input
              type="date"
              required
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-950 outline-none focus:border-emerald-700"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {t.deliveryDate}
            </label>
            <input
              type="date"
              required
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-black text-emerald-950 outline-none focus:border-emerald-700"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {t.dressType}
            </label>
            <select
              value={dressType}
              onChange={(e) => setDressType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-950 outline-none focus:border-emerald-700"
            >
              {dressTypes.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {t.orderStatus}
            </label>
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value as Invoice['orderStatus'])}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-950 outline-none focus:border-emerald-700"
            >
              <option value="Pending">{isEn ? 'Pending' : 'পেন্ডিং (Pending)'}</option>
              <option value="In Progress">{isEn ? 'In Progress' : 'কাজ চলছে (In Progress)'}</option>
              <option value="Ready for Pickup">{isEn ? 'Ready for Pickup' : 'কাপড় রেডি (Ready for Pickup)'}</option>
              <option value="Delivered">{isEn ? 'Delivered' : 'ডেলিভারি সম্পন্ন (Delivered)'}</option>
              <option value="Cancelled">{isEn ? 'Cancelled' : 'বাতিল (Cancelled)'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Order Items & Billing Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-base font-bold text-emerald-950">{t.orderItems}</h2>
          <button
            type="button"
            onClick={() => setIsCatalogOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-violet-600 bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-800 hover:bg-violet-100 transition shadow-2xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-600" />
            {t.selectFromCatalog}
          </button>
        </div>

        {/* Dynamic Items list */}
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id || index}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {isEn ? `Item #${index + 1}` : `আইটেম #${index + 1}`}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(index)}
                    className="text-rose-600 hover:text-rose-800 p-1 transition"
                    title={isEn ? 'Remove item' : 'আইটেম মুছুন'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div>
                <input
                  type="text"
                  required
                  placeholder={
                    isEn
                      ? 'Work description (e.g. Royal Butterfly Abaya stitching & stonework)'
                      : 'কাজের বিবরণ (যেমন: রয়্যাল বাটারফ্লাই আবায়া কাটিং ও স্টোন সেলাই)'
                  }
                  value={item.description}
                  onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                    {t.quantity}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity === 0 || (item.quantity as any) === '' || isNaN(item.quantity as any) ? '' : item.quantity}
                    onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                    placeholder="1"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-emerald-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                    {t.unitPrice} ({shop.currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={item.unitPrice || ''}
                    onChange={(e) => handleUpdateItem(index, 'unitPrice', e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-emerald-600 font-semibold"
                  />
                </div>
                <div className="text-right">
                  <span className="block text-[11px] font-medium text-slate-500">
                    {t.totalPrice}
                  </span>
                  <span className="text-sm font-black text-emerald-800">
                    {shop.currency} {item.totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-600/70 bg-emerald-50/60 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            {t.addItem}
          </button>
        </div>

        {/* Calculation Summary */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2.5 text-sm">
          <div className="flex justify-between items-center text-slate-700">
            <span>{t.subtotal}:</span>
            <span className="font-semibold">{shop.currency} {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-700">{t.discount} ({shop.currency}):</span>
            <input
              type="number"
              step="any"
              value={discountStr}
              onChange={(e) => setDiscountStr(e.target.value)}
              placeholder="0.00"
              className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
            />
          </div>
          <div className="flex justify-between items-center border-t border-slate-200 pt-2 font-bold text-emerald-950">
            <span>{t.netTotal}:</span>
            <span className="text-base text-emerald-900">{shop.currency} {netTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-700 font-medium">{t.advanceDeposit} ({shop.currency}):</span>
            <input
              type="number"
              step="any"
              value={advanceStr}
              onChange={(e) => setAdvanceStr(e.target.value)}
              placeholder="0.00"
              className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
            />
          </div>
          <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-2 font-black">
            <span className="text-slate-800">{t.remainingDue}:</span>
            <span className={`text-base ${remainingDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {shop.currency} {remainingDue.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-bold text-slate-700">{t.paymentMethod}</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="radio"
                name="payMethod"
                checked={paymentMethod === 'Cash'}
                onChange={() => setPaymentMethod('Cash')}
                className="accent-emerald-700"
              />
              💵 {t.cash}
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="radio"
                name="payMethod"
                checked={paymentMethod === 'Bank'}
                onChange={() => setPaymentMethod('Bank')}
                className="accent-emerald-700"
              />
              🏦 {t.bank}
            </label>
          </div>
          {paymentMethod === 'Bank' && (
            <div className="mt-2">
              <input
                type="text"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                placeholder={isEn ? 'Bank Transfer Reference # / Trx ID' : 'ব্যাংক রেফারেন্স / ট্রানজেকশন নম্বর'}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Cloth & Design Photos Card */}
      <div
        id="order-photos-management-section"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
              <Camera className="h-5 w-5 text-emerald-700" />
              {t.attachPhotos}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn
                ? 'Capture or upload clear photos of fabric sample, dress design, customer sketch, or accessories.'
                : 'ক্যামেরা দিয়ে সরাসরি কাপড়ের স্যাম্পল, ড্রেস মডেল বা কাস্টমারের স্কেচের পরিষ্কার ছবি তুলুন।'}
            </p>
          </div>
          <span className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 font-bold px-3 py-1 rounded-full">
            {[(clothPhoto ? 1 : 0), (dressDesignPhoto ? 1 : 0), (customerDesignPhoto ? 1 : 0), (extraPhoto ? 1 : 0)].reduce((a, b) => a + b, 0)}/4 {isEn ? 'Photos Attached' : 'ছবি যুক্ত'}
          </span>
        </div>

        {/* 4 Photo Upload Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Photo Slot 1: Cloth Fabric */}
          <div
            id="cloth-photo-upload-box"
            className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-3.5 flex flex-col justify-between transition hover:border-emerald-400"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">{t.clothPhoto}</span>
                {clothPhoto && (
                  <button
                    type="button"
                    onClick={() => setClothPhoto(undefined)}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    {isEn ? 'Remove' : 'মুছুন'}
                  </button>
                )}
              </div>

              {clothPhoto ? (
                <div
                  onClick={() => setPreviewPhoto({ uri: clothPhoto, label: t.clothPhoto })}
                  className="group relative mb-3 h-44 w-full cursor-pointer overflow-hidden rounded-xl border border-slate-300 bg-black shadow-inner"
                >
                  <img src={clothPhoto} alt="Cloth Fabric" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                    <ZoomIn className="h-4 w-4" /> {isEn ? 'View Large' : 'বড় দেখুন'}
                  </div>
                </div>
              ) : (
                <div className="mb-3 flex h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 text-xs p-3 text-center">
                  <Camera className="h-8 w-8 text-slate-300 mb-1.5" />
                  <span className="font-semibold text-slate-600">{isEn ? 'No Fabric Photo' : 'কাপড়ের ছবি নেই'}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{isEn ? 'Add using buttons below' : 'নিচের বাটন দিয়ে যুক্ত করুন'}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                id="cloth-photo-camera-btn"
                onClick={() => openCameraForSlot(1)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 shadow-xs transition active:scale-95"
              >
                <Camera className="h-3.5 w-3.5" />
                {t.camera}
              </button>
              <button
                type="button"
                id="cloth-photo-gallery-btn"
                onClick={() => clothFileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 py-2.5 text-xs font-bold text-sky-800 hover:bg-sky-100 shadow-xs transition active:scale-95"
              >
                <Upload className="h-3.5 w-3.5" />
                {t.gallery}
              </button>
            </div>
            <input
              type="file"
              id="cloth-photo-file-input"
              ref={clothFileInputRef}
              onChange={(e) => handleFileChange(e, 1)}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Photo Slot 2: Dress Design */}
          <div
            id="dress-design-upload-box"
            className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-3.5 flex flex-col justify-between transition hover:border-emerald-400"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">{t.dressDesignPhoto}</span>
                {dressDesignPhoto && (
                  <button
                    type="button"
                    onClick={() => setDressDesignPhoto(undefined)}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    {isEn ? 'Remove' : 'মুছুন'}
                  </button>
                )}
              </div>

              {dressDesignPhoto ? (
                <div
                  onClick={() => setPreviewPhoto({ uri: dressDesignPhoto, label: t.dressDesignPhoto })}
                  className="group relative mb-3 h-44 w-full cursor-pointer overflow-hidden rounded-xl border border-slate-300 bg-black shadow-inner"
                >
                  <img src={dressDesignPhoto} alt="Dress Design" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                    <ZoomIn className="h-4 w-4" /> {isEn ? 'View Large' : 'বড় দেখুন'}
                  </div>
                </div>
              ) : (
                <div className="mb-3 flex h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 text-xs p-3 text-center">
                  <Camera className="h-8 w-8 text-slate-300 mb-1.5" />
                  <span className="font-semibold text-slate-600">{isEn ? 'No Design Photo' : 'ডিজাইনের ছবি নেই'}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{isEn ? 'Model or catalog photo' : 'মডেল বা ক্যাটালগ ছবি'}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                id="dress-design-camera-btn"
                onClick={() => openCameraForSlot(2)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white hover:bg-teal-800 shadow-xs transition active:scale-95"
              >
                <Camera className="h-3.5 w-3.5" />
                {t.camera}
              </button>
              <button
                type="button"
                id="dress-design-gallery-btn"
                onClick={() => dressFileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 py-2.5 text-xs font-bold text-sky-800 hover:bg-sky-100 shadow-xs transition active:scale-95"
              >
                <Upload className="h-3.5 w-3.5" />
                {t.gallery}
              </button>
            </div>
            <input
              type="file"
              id="dress-design-file-input"
              ref={dressFileInputRef}
              onChange={(e) => handleFileChange(e, 2)}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Photo Slot 3: Customer Reference Sketch */}
          <div
            id="customer-sketch-upload-box"
            className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-3.5 flex flex-col justify-between transition hover:border-emerald-400"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">{t.customerDesignPhoto}</span>
                {customerDesignPhoto && (
                  <button
                    type="button"
                    onClick={() => setCustomerDesignPhoto(undefined)}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    {isEn ? 'Remove' : 'মুছুন'}
                  </button>
                )}
              </div>

              {customerDesignPhoto ? (
                <div
                  onClick={() => setPreviewPhoto({ uri: customerDesignPhoto, label: t.customerDesignPhoto })}
                  className="group relative mb-3 h-44 w-full cursor-pointer overflow-hidden rounded-xl border border-slate-300 bg-black shadow-inner"
                >
                  <img src={customerDesignPhoto} alt="Customer Sketch" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                    <ZoomIn className="h-4 w-4" /> {isEn ? 'View Large' : 'বড় দেখুন'}
                  </div>
                </div>
              ) : (
                <div className="mb-3 flex h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 text-xs p-3 text-center">
                  <Camera className="h-8 w-8 text-slate-300 mb-1.5" />
                  <span className="font-semibold text-slate-600">{isEn ? 'No Sketch Photo' : 'কাস্টমার স্কেচ নেই'}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{isEn ? 'Hand-drawn pattern or design' : 'হাতে আঁকা ডিজাইন বা ড্রয়িং'}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                id="customer-sketch-camera-btn"
                onClick={() => openCameraForSlot(3)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-700 py-2.5 text-xs font-bold text-white hover:bg-indigo-800 shadow-xs transition active:scale-95"
              >
                <Camera className="h-3.5 w-3.5" />
                {t.camera}
              </button>
              <button
                type="button"
                id="customer-sketch-gallery-btn"
                onClick={() => sketchFileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 py-2.5 text-xs font-bold text-sky-800 hover:bg-sky-100 shadow-xs transition active:scale-95"
              >
                <Upload className="h-3.5 w-3.5" />
                {t.gallery}
              </button>
            </div>
            <input
              type="file"
              id="customer-sketch-file-input"
              ref={sketchFileInputRef}
              onChange={(e) => handleFileChange(e, 3)}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Photo Slot 4: Extra Sample / Accessories */}
          <div
            id="extra-sample-upload-box"
            className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-3.5 flex flex-col justify-between transition hover:border-emerald-400"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">{t.extraPhoto}</span>
                {extraPhoto && (
                  <button
                    type="button"
                    onClick={() => setExtraPhoto(undefined)}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    {isEn ? 'Remove' : 'মুছুন'}
                  </button>
                )}
              </div>

              {extraPhoto ? (
                <div
                  onClick={() => setPreviewPhoto({ uri: extraPhoto, label: t.extraPhoto })}
                  className="group relative mb-3 h-44 w-full cursor-pointer overflow-hidden rounded-xl border border-slate-300 bg-black shadow-inner"
                >
                  <img src={extraPhoto} alt="Extra Sample" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                    <ZoomIn className="h-4 w-4" /> {isEn ? 'View Large' : 'বড় দেখুন'}
                  </div>
                </div>
              ) : (
                <div className="mb-3 flex h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 text-xs p-3 text-center">
                  <Camera className="h-8 w-8 text-slate-300 mb-1.5" />
                  <span className="font-semibold text-slate-600">{isEn ? 'No Extra Sample' : 'অতিরিক্ত ছবি'}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{isEn ? 'Lace, buttons or trims' : 'লেস, বোতাম বা এক্সট্রা স্যাম্পল'}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                id="extra-sample-camera-btn"
                onClick={() => openCameraForSlot(4)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-purple-700 py-2.5 text-xs font-bold text-white hover:bg-purple-800 shadow-xs transition active:scale-95"
              >
                <Camera className="h-3.5 w-3.5" />
                {t.camera}
              </button>
              <button
                type="button"
                id="extra-sample-gallery-btn"
                onClick={() => extraFileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 py-2.5 text-xs font-bold text-sky-800 hover:bg-sky-100 shadow-xs transition active:scale-95"
              >
                <Upload className="h-3.5 w-3.5" />
                {t.gallery}
              </button>
            </div>
            <input
              type="file"
              id="extra-sample-file-input"
              ref={extraFileInputRef}
              onChange={(e) => handleFileChange(e, 4)}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* 4. Measurement Book (Blue-styled Section) */}
      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/25 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-blue-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-blue-700" />
            <div>
              <h2 className="text-base font-black text-blue-950">{t.measurementsBook}</h2>
              {mProfileName && (
                <span className="text-xs font-bold text-blue-700">
                  {isEn ? 'Active Profile: ' : 'সক্রিয় প্রোফাইল: '}
                  <strong className="text-blue-950">{mProfileName}</strong>
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsVisualGuideOpen(true)}
            className="flex items-center gap-1 text-xs font-black text-blue-800 hover:underline bg-blue-100/80 px-3 py-1 rounded-lg border border-blue-200"
          >
            <Ruler className="h-3.5 w-3.5 text-blue-700" />
            {isEn ? 'View Measurement Guide' : 'মাপের নির্দেশিকা দেখুন'}
          </button>
        </div>

        {/* Customer Measurement Profiles Selector */}
        {availableCustomerProfiles.length > 0 ? (
          <div className="rounded-2xl border-2 border-blue-300 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
                  {isEn
                    ? `Saved Measurement Profiles for ${customerName || 'Customer'}:`
                    : `${customerName || 'কাস্টমার'}-এর সংরক্ষিত পরিমাপ প্রোফাইল:`}
                </span>
                <p className="text-[11px] text-blue-700 font-medium">
                  {isEn
                    ? 'Click any profile to load its values. Each order keeps an independent copy (snapshot).'
                    : 'প্রোফাইলে ক্লিক করে মাপ লোড করুন। প্রতিটি অর্ডারে এর একটি স্বাধীন কপি সংরক্ষিত থাকবে।'}
                </p>
              </div>
              <span className="rounded-md bg-blue-100 text-blue-900 px-2 py-0.5 text-xs font-bold">
                {availableCustomerProfiles.length} {isEn ? 'Profiles' : 'টি মাপ'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {availableCustomerProfiles.map((prof) => {
                const isSelected = selectedProfileId === prof.id || (mProfileName === prof.profileName && prof.profileName !== undefined);
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => handleSelectProfile(prof)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                      isSelected
                        ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-400'
                        : 'bg-blue-50 text-blue-950 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {prof.isDefault && (
                      <Star className={`h-3 w-3 ${isSelected ? 'fill-amber-300 text-amber-300' : 'fill-amber-400 text-amber-500'}`} />
                    )}
                    <span>{getMeasurementProfileTitle(prof)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-blue-800 text-blue-200' : 'bg-white text-blue-800'}`}>
                      {prof.dressType}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 ml-0.5" />}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setSelectedProfileId(null);
                  setMProfileName('Custom Order Measurement');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                  selectedProfileId === null
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isEn ? '+ Custom / Reset' : '+ নতুন মাপ / কাস্টম'}
              </button>
            </div>

            {selectedProfileId && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] font-bold text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {isEn
                    ? `Snapshot active from: "${mProfileName}". Modifying values below will NOT alter the customer's saved profile.`
                    : `স্ন্যাপশট লোড হয়েছে: "${mProfileName}"। নিচের মান পরিবর্তন করলে মূল কাস্টমার প্রোফাইল সম্পূর্ণ অক্ষত থাকবে।`}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {isEn ? 'Snapshot Safe' : 'স্বাধীন স্ন্যাপশট'}
                </span>
              </div>
            )}
          </div>
        ) : (
          customerPhone.trim() && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex items-center justify-between">
              <span>
                {isEn
                  ? 'No saved measurement profiles for this customer yet. Enter measurements below, and check "Save as new profile" to save for future orders.'
                  : 'এই কাস্টমারের পূর্বের কোনো পরিমাপ প্রোফাইল নেই। নিচে মাপ লিখুন এবং ভবিষ্যতে ব্যবহারের জন্য প্রোফাইল হিসেবে সংরক্ষণ করতে পারেন।'}
              </span>
            </div>
          )
        )}

        {/* AI Measurement Estimation Button */}
        <button
          type="button"
          onClick={() => setShowAiModal(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-4 text-xs shadow-xs transition active:scale-95"
        >
          <Sparkles className="h-4 w-4 text-slate-950" />
          {isEn ? 'AI Auto Sizing & Estimates' : `${t.aiEstimate} (AI Auto Sizing)`}
        </button>

        {/* Measurement Input Fields - Blue themed text and borders */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-blue-900 mb-0.5">
              {t.length}
            </label>
            <input
              type="number"
              step="any"
              value={mLength}
              onChange={(e) => setMLength(e.target.value)}
              placeholder="56.0"
              className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold placeholder-blue-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-blue-900 mb-0.5">
              {t.bodyChest}
            </label>
            <input
              type="number"
              step="any"
              value={mChest}
              onChange={(e) => setMChest(e.target.value)}
              placeholder="38.0"
              className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold placeholder-blue-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-blue-900 mb-0.5">
              {t.waist}
            </label>
            <input
              type="number"
              step="any"
              value={mWaist}
              onChange={(e) => setMWaist(e.target.value)}
              placeholder="34.0"
              className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold placeholder-blue-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-blue-900 mb-0.5">
              {t.hip}
            </label>
            <input
              type="number"
              step="any"
              value={mHip}
              onChange={(e) => setMHip(e.target.value)}
              placeholder="42.0"
              className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold placeholder-blue-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-blue-900 mb-0.5">
              {t.shoulder}
            </label>
            <input
              type="number"
              step="any"
              value={mShoulder}
              onChange={(e) => setMShoulder(e.target.value)}
              placeholder="15.0"
              className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold placeholder-blue-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-blue-900 mb-0.5">
              {t.sleeve}
            </label>
            <input
              type="number"
              step="any"
              value={mSleeve}
              onChange={(e) => setMSleeve(e.target.value)}
              placeholder="22.5"
              className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold placeholder-blue-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-blue-900 mb-0.5">
              {t.neck}
            </label>
            <input
              type="number"
              step="any"
              value={mNeck}
              onChange={(e) => setMNeck(e.target.value)}
              placeholder="7.0"
              className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold placeholder-blue-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-blue-900 mb-0.5">
              {t.flareBottom}
            </label>
            <input
              type="number"
              step="any"
              value={mFlare}
              onChange={(e) => setMFlare(e.target.value)}
              placeholder="48.0"
              className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold placeholder-blue-300"
            />
          </div>

          {/* Garment Specific Fields: Cuff, Thigh, Bottom, Inseam */}
          <div>
            <label className="block text-[11px] font-bold text-blue-900 mb-0.5">
              {isEn ? 'Cuff / Mohori' : 'কাফ / মোহরী'}
            </label>
            <input
              type="number"
              step="any"
              value={mCuff}
              onChange={(e) => setMCuff(e.target.value)}
              placeholder="9.5"
              className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold placeholder-blue-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-blue-900 mb-0.5">
              {isEn ? 'Thigh / Ran' : 'রান / থাই'}
            </label>
            <input
              type="number"
              step="any"
              value={mThigh}
              onChange={(e) => setMThigh(e.target.value)}
              placeholder="26.0"
              className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold placeholder-blue-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-blue-900 mb-0.5">
              {isEn ? 'Bottom Opening' : 'পায়ের মোহরী'}
            </label>
            <input
              type="number"
              step="any"
              value={mBottom}
              onChange={(e) => setMBottom(e.target.value)}
              placeholder="15.0"
              className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold placeholder-blue-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-blue-900 mb-0.5">
              {isEn ? 'Inseam / High' : 'ইনসিম / হাই'}
            </label>
            <input
              type="number"
              step="any"
              value={mInseam}
              onChange={(e) => setMInseam(e.target.value)}
              placeholder="28.0"
              className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 font-bold placeholder-blue-300"
            />
          </div>
        </div>

        {/* Collar Style field */}
        <div>
          <label className="block text-xs font-bold text-blue-900 mb-1">
            {isEn ? 'Collar Style (e.g. Mandarin, Regular, Ban)' : 'কলার ধরণ (যেমন: চাইনিজ কলার, রেগুলার, ব্যান)'}
          </label>
          <input
            type="text"
            value={mCollar}
            onChange={(e) => setMCollar(e.target.value)}
            placeholder={isEn ? 'e.g. 1.5" Mandarin Band' : 'যেমন: ১.৫" চাইনিজ ব্যান'}
            className="w-full rounded-xl border border-blue-300 bg-white px-3.5 py-2 text-sm font-semibold text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 placeholder-blue-300"
          />
        </div>

        {/* Save as New Profile Option for Customer */}
        <div className="rounded-xl bg-white border border-blue-300 p-3.5 space-y-2.5">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-blue-950 select-none">
            <input
              type="checkbox"
              checked={saveAsNewProfile}
              onChange={(e) => {
                setSaveAsNewProfile(e.target.checked);
                if (e.target.checked && !newProfileSaveName) {
                  setNewProfileSaveName(`${dressType} Profile`);
                }
              }}
              className="h-4 w-4 rounded-md border-blue-400 text-blue-700 focus:ring-blue-500"
            />
            <span>
              {isEn
                ? 'Also save these measurements as a new customer profile'
                : 'এই মাপগুলো কাস্টমারের নতুন প্রোফাইল হিসেবেও সংরক্ষণ করুন'}
            </span>
          </label>

          {saveAsNewProfile && (
            <div className="pl-6 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="text-[11px] font-bold text-blue-800">
                {isEn ? 'Profile Name:' : 'প্রোফাইলের নাম:'}
              </span>
              <input
                type="text"
                value={newProfileSaveName}
                onChange={(e) => setNewProfileSaveName(e.target.value)}
                placeholder={isEn ? 'e.g. Panjabi Slim Fit' : 'যেমন: পাঞ্জাবি স্লিম ফিট'}
                className="flex-1 rounded-lg border border-blue-300 bg-blue-50/50 px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-600"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-blue-900 mb-1">
            {t.designNotes}
          </label>
          <input
            type="text"
            value={mDesignNotes}
            onChange={(e) => setMDesignNotes(e.target.value)}
            placeholder={
              isEn
                ? 'e.g. Double pleat on sleeves, Mandarin collar, 2 side pockets...'
                : 'যেমন: হাতায় ডাবল কুচি, গলায় চায়নিজ কলার, ২টা সাইড পকেট...'
            }
            className="w-full rounded-xl border border-blue-300 bg-white px-3.5 py-2 text-sm font-semibold text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 placeholder-blue-300"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-blue-900 mb-1">
            {t.specialInstructions}
          </label>
          <input
            type="text"
            value={mSpecialInstructions}
            onChange={(e) => setMSpecialInstructions(e.target.value)}
            placeholder={
              isEn
                ? 'e.g. Double overlock stitching, soft cotton lining inside...'
                : 'যেমন: ডাবল ওভারলক সেলাই, ভিতরে নরম সুতি ফলস দিতে হবে...'
            }
            className="w-full rounded-xl border border-blue-300 bg-white px-3.5 py-2 text-sm font-semibold text-blue-950 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 placeholder-blue-300"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            {isEn ? 'General Order Notes' : 'সাধারণ অর্ডার নোট (General Order Notes)'}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isEn
                ? 'Any additional specific customer requests or notes...'
                : 'কাস্টমারের অতিরিক্ত কোনো বিশেষ নির্দেশনা থাকলে লিখুন...'
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-emerald-700 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
        >
          {t.cancel}
        </button>
        <button
          type="submit"
          className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-emerald-800 py-3 text-sm font-black text-white shadow-lg hover:bg-emerald-900 active:scale-95 transition"
        >
          <Save className="h-5 w-5" />
          {t.saveInvoice}
        </button>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        title={
          isEn
            ? `Camera Photo Capture (Slot ${activePhotoSlot})`
            : `ক্যামেরা ছবি গ্রহণ (Photo Slot ${activePhotoSlot})`
        }
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Catalog Select Modal */}
      <CatalogSelectModal
        isOpen={isCatalogOpen}
        catalogItems={catalogItems}
        currency={shop.currency}
        lang={lang}
        onClose={() => setIsCatalogOpen(false)}
        onSelect={handleCatalogSelect}
      />

      {/* Measurement Guide Modal */}
      <VisualGuideModal
        isOpen={isVisualGuideOpen}
        onClose={() => setIsVisualGuideOpen(false)}
        lang={lang}
      />

      {/* AI Sizing Dialog */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-2 text-amber-700">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-base font-bold">
                {isEn ? 'AI Automatic Measurement Estimator' : 'AI অটো মাপ নির্ধারণ ইঞ্জিন'}
              </h3>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
              {isEn ? AI_DISCLAIMER_EN : AI_DISCLAIMER_BN}
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">
                {isEn ? 'Selected Dress Type:' : 'নির্বাচিত পোশাক:'} <span className="font-bold text-slate-900">{dressType}</span>
              </p>
              <p className="text-xs font-bold text-slate-700 mt-2 mb-1.5">
                {isEn ? 'Select Standard Size Category:' : 'স্ট্যান্ডার্ড সাইজ নির্বাচন করুন:'}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setAiSizeCategory(sz)}
                    className={`rounded-xl py-2 text-xs font-bold transition ${
                      aiSizeCategory === sz
                        ? 'bg-emerald-800 text-white shadow'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                {isEn ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="button"
                onClick={handleApplyAiEstimate}
                className="flex-1 rounded-xl bg-emerald-800 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-900"
              >
                {isEn ? 'Apply Sizes' : 'মাপ বসান'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-white">
              <span className="text-sm font-bold text-emerald-400">{previewPhoto.label}</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/60 overflow-auto">
              <img
                src={previewPhoto.uri}
                alt={previewPhoto.label}
                className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
