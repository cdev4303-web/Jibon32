import React, { useState, useRef } from 'react';
import { CatalogItem, Shop, Language } from '../types';
import { strings } from '../utils/strings';
import { CameraCaptureModal } from './CameraCaptureModal';
import { ShareCatalogCardModal } from './ShareCatalogCardModal';
import { generateCatalogImageUriAsync } from '../utils/catalogImage';
import { shareCatalogPngToWhatsApp } from '../utils/whatsapp';
import { compressImageFile, compressDataUri } from '../utils/imageCompressor';
import {
  Plus,
  Search,
  ShoppingBag,
  Share2,
  Edit2,
  Trash2,
  Camera,
  Upload,
  X,
  Sparkles,
  Check,
  Send,
  Loader2,
} from 'lucide-react';

interface CatalogScreenProps {
  shop: Shop;
  catalogItems: CatalogItem[];
  lang: Language;
  onAddOrderFromCatalog: (item: CatalogItem) => void;
  onSaveCatalogItem: (item: CatalogItem) => void;
  onDeleteCatalogItem: (item: CatalogItem) => void;
}

export const CatalogScreen: React.FC<CatalogScreenProps> = ({
  shop,
  catalogItems,
  lang,
  onAddOrderFromCatalog,
  onSaveCatalogItem,
  onDeleteCatalogItem,
}) => {
  const t = strings[lang] || strings.BN;
  const isEn = lang === 'EN';
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [sharingItem, setSharingItem] = useState<CatalogItem | null>(null);
  const [sendingItemId, setSendingItemId] = useState<string | null>(null);

  // Form states inside Add/Edit modal
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Abaya');
  const [priceStr, setPriceStr] = useState('');
  const [modelSize, setModelSize] = useState('M (56")');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = [
    'All',
    'Abaya',
    'Gown',
    'Salwar Kameez',
    'Kurti',
    'Punjabi',
    'Blouse',
    'Shirt',
    'Pant',
    'Suit',
    'Other',
  ];

  const filteredItems = catalogItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.catalogCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const openAddDialog = () => {
    setEditingItem(null);
    setName('');
    setCode(`JT-C${Math.floor(100 + Math.random() * 900)}`);
    setCategory('Abaya');
    setPriceStr('');
    setModelSize('M (56")');
    setDescription('');
    setImageUri(undefined);
    setIsEditDialogOpen(true);
  };

  const openEditDialog = (item: CatalogItem) => {
    setEditingItem(item);
    setName(item.name);
    setCode(item.catalogCode);
    setCategory(item.category);
    setPriceStr(item.price.toString());
    setModelSize(item.modelSize);
    setDescription(item.description);
    setImageUri(item.imageUri);
    setIsEditDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const itemToSave: CatalogItem = {
      id: editingItem?.id || `cat-${Date.now()}`,
      shopId: shop.id,
      name: name.trim(),
      catalogCode: code.trim(),
      category: category.trim(),
      price: parseFloat(priceStr) || 0,
      modelSize: modelSize.trim(),
      description: description.trim(),
      imageUri,
      createdAt: editingItem?.createdAt || Date.now(),
    };

    onSaveCatalogItem(itemToSave);
    setIsEditDialogOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 1080, maxHeight: 1080, quality: 0.72 });
        setImageUri(compressed);
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const uri = event.target?.result as string;
          if (uri) setImageUri(uri);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleQuickWhatsAppShare = async (item: CatalogItem) => {
    setSendingItemId(item.id);
    try {
      const cardUri = await generateCatalogImageUriAsync(item, shop);
      if (cardUri) {
        await shareCatalogPngToWhatsApp(item, shop, cardUri, undefined, lang);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setSendingItemId(null);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{t.catalog}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEn
              ? 'Manage tailor dress designs, share photo cards directly on WhatsApp.'
              : 'পোশাকের আধুনিক ডিজাইন ক্যাটালগ পরিচালনা করুন ও ছবি সহ WhatsApp-এ শেয়ার করুন।'}
          </p>
        </div>
        <button
          onClick={openAddDialog}
          className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-800 transition active:scale-95"
        >
          <Plus className="h-4 w-4" />
          {t.addCatalogItem}
        </button>
      </div>

      {/* Search and Category Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isEn
                ? 'Search catalog designs (e.g. name, code AB-101)...'
                : 'ক্যাটালগ ডিজাইন খুঁজুন (নাম, কোড যেমন: AB-101)...'
            }
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                categoryFilter === cat
                  ? 'bg-emerald-900 text-white shadow-sm ring-2 ring-emerald-700'
                  : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              {cat === 'All' ? (isEn ? 'All Categories' : 'সকল ক্যাটাগরি') : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-600">
          <ShoppingBag className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <p className="font-black text-slate-950 text-base">
            {isEn ? 'No designs found' : 'কোনো ডিজাইন পাওয়া যায়নি'}
          </p>
          <p className="text-xs text-slate-600 font-semibold mt-1">
            {isEn
              ? 'Click "+ Add Design Item" button above to add.'
              : '+ নতুন ডিজাইন যোগ করুন বাটনে চাপ দিন।'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-xs transition hover:border-emerald-600 hover:shadow-md"
            >
              <div>
                {/* Photo Image / Pattern Placeholder */}
                <div className="relative h-52 w-full bg-slate-950 overflow-hidden">
                  {item.imageUri ? (
                    <img
                      src={item.imageUri}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-900 to-slate-950 text-white p-4 text-center">
                      <Sparkles className="h-8 w-8 text-amber-300 mb-2 opacity-90" />
                      <span className="text-base font-black tracking-wider uppercase">
                        {item.category}
                      </span>
                      <span className="text-xs text-emerald-100 font-bold mt-1">{item.name}</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="rounded-lg bg-amber-400 text-slate-950 px-2.5 py-1 text-xs font-black shadow-sm">
                      {item.catalogCode}
                    </span>
                    <span className="rounded-lg bg-slate-950/80 text-white px-2.5 py-1 text-xs font-bold backdrop-blur-sm border border-white/20">
                      {item.category}
                    </span>
                  </div>

                  {/* Top Right Quick Edit/Delete */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    <button
                      onClick={() => openEditDialog(item)}
                      className="rounded-full bg-white p-2 text-slate-900 shadow hover:bg-slate-100 hover:text-emerald-800 transition"
                      title={isEn ? 'Edit Design' : 'ডিজাইন সম্পাদনা'}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteCatalogItem(item)}
                      className="rounded-full bg-white p-2 text-rose-700 shadow hover:bg-rose-50 hover:text-rose-900 transition"
                      title={isEn ? 'Delete Design' : 'ডিজাইন মুছুন'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-black text-slate-950 leading-snug">{item.name}</h3>
                    <span className="shrink-0 text-base font-black text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {shop.currency} {item.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    {isEn ? 'Model Size: ' : 'মডেল সাইজ: '}
                    <span className="font-black text-slate-950">{item.modelSize}</span>
                  </p>
                  {item.description && (
                    <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              {/* 3 Unique Action Buttons: ADD ORDER (Emerald), WHATSAPP (Teal), SHARE CARD (Amber) */}
              <div className="p-4 pt-0 border-t border-slate-200 flex items-center gap-2 mt-2">
                <button
                  onClick={() => onAddOrderFromCatalog(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {t.addOrderFromCatalog}
                </button>

                <button
                  onClick={() => handleQuickWhatsAppShare(item)}
                  disabled={sendingItemId === item.id}
                  className="flex items-center justify-center gap-1 rounded-xl bg-teal-600 hover:bg-teal-700 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                  title={isEn ? 'Send photo card via WhatsApp' : 'WhatsApp এ ছবি সহ কার্ড পাঠান'}
                >
                  {sendingItemId === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>{isEn ? 'WhatsApp' : 'WhatsApp (ছবি সহ)'}</span>
                </button>

                <button
                  onClick={() => setSharingItem(item)}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 p-2.5 text-xs font-bold text-slate-950 shadow-sm transition active:scale-95"
                  title={isEn ? 'Card Preview & PNG Download' : 'কার্ড প্রিভিউ ও PNG ডাউনলোড'}
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-900 px-6 py-4 text-white">
              <h3 className="text-base font-bold">
                {editingItem
                  ? isEn
                    ? 'Edit Catalog Design'
                    : 'ক্যাটালগ ডিজাইন সম্পাদনা'
                  : isEn
                  ? 'Add New Catalog Design'
                  : 'নতুন ক্যাটালগ ডিজাইন যোগ করুন'}
              </h3>
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4">
              {/* Photo Area */}
              <div id="catalog-design-photo-upload-container">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Design Sample Photo' : 'পোশাকের ডিজাইনের ছবি (Design Photo)'}
                </label>
                {imageUri ? (
                  <div className="relative mb-2 h-44 w-full rounded-xl overflow-hidden border border-slate-200 bg-black">
                    <img src={imageUri} alt="Design" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUri(undefined)}
                      className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mb-2 flex h-36 w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 text-xs">
                    {isEn ? 'No photo selected' : 'কোনো ছবি নির্বাচন করা হয়নি'}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
                  >
                    <Camera className="h-4 w-4" />
                    {isEn ? 'Take Photo' : 'ছবি তুলুন'}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Upload className="h-4 w-4" />
                    {isEn ? 'Gallery' : 'গ্যালারি থেকে নিন'}
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Dress Name *' : 'পোশাকের নাম *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isEn ? 'e.g. Royal Butterfly Abaya' : 'যেমন: রয়্যাল বাটারফ্লাই আবায়া'}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Catalog Code *' : 'ক্যাটালগ কোড *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. AB-101"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600 font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Category' : 'ক্যাটাগরি'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600"
                  >
                    {categories
                      .filter((c) => c !== 'All')
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Model Size' : 'মডেল সাইজ'}
                  </label>
                  <input
                    type="text"
                    value={modelSize}
                    onChange={(e) => setModelSize(e.target.value)}
                    placeholder='e.g. M (56")'
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? `Price (${shop.currency}) *` : `মূল্য (${shop.currency}) *`}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600 font-bold text-emerald-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isEn ? 'Description & Fabric Details' : 'বিবরণ ও কাপড়ের বৈশিষ্ট্য'}
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Fabric quality, embroidery design and stitching details...'
                      : 'ফেব্রিক কোয়ালিটি, এমব্রয়ডারি ডিজাইন ও কাটিংয়ের বিবরণ...'
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {isEn ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-800 transition"
                >
                  <Check className="h-4 w-4" />
                  {isEn ? 'Save Design' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Camera Modal */}
      <CameraCaptureModal
        title={isEn ? 'Take Catalog Design Photo' : 'ক্যাটালগ ডিজাইন ছবি তুলুন'}
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(uri) => setImageUri(uri)}
      />

      {/* Share Design Card Modal */}
      <ShareCatalogCardModal
        isOpen={!!sharingItem}
        item={sharingItem}
        shop={shop}
        lang={lang}
        onClose={() => setSharingItem(null)}
      />
    </div>
  );
};
