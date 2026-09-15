import React, { useState } from 'react';
import { Ruler, X, CheckCircle2, Sparkles } from 'lucide-react';
import { Language } from '../types';

interface VisualGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
}

type GuideCategory = 'all' | 'dress' | 'kameez' | 'gents' | 'pant';

export const VisualGuideModal: React.FC<VisualGuideModalProps> = ({ isOpen, onClose, lang = 'BN' }) => {
  const [activeCategory, setActiveCategory] = useState<GuideCategory>('all');
  if (!isOpen) return null;

  const isBn = lang === 'BN';

  const categories = [
    { id: 'all' as GuideCategory, label: isBn ? 'সকল মাপ (All)' : 'All Measurements' },
    { id: 'dress' as GuideCategory, label: isBn ? 'বোরকা ও গাউন (Abaya/Gown)' : 'Abaya & Gown' },
    { id: 'kameez' as GuideCategory, label: isBn ? 'সালোয়ার কামিজ (Kameez)' : 'Kameez & Kurti' },
    { id: 'gents' as GuideCategory, label: isBn ? 'পাঞ্জাবি ও শার্ট (Panjabi)' : 'Panjabi & Shirt' },
    { id: 'pant' as GuideCategory, label: isBn ? 'প্যান্ট ও পায়জামা (Pants)' : 'Pants & Trouser' },
  ];

  const steps = [
    {
      category: 'dress',
      titleEn: '1. Length',
      titleBn: '১. লম্বা / ঝুল (Length)',
      descEn: 'Measure vertically from highest shoulder point straight down to desired bottom hem.',
      descBn: 'কাঁধের উঁচু পয়েন্ট থেকে একদম নিচের কাঙ্ক্ষিত প্রান্ত পর্যন্ত ফিতা সোজা রেখে মাপুন।',
      tipEn: 'For Abaya/Gown, ensure customer stands upright.',
      tipBn: 'বোরকা বা গাউনের ক্ষেত্রে কাস্টমারকে সোজা হয়ে দাঁড়াতে বলুন।',
      range: 'Standard: 50" – 58"',
    },
    {
      category: 'dress',
      titleEn: '2. Chest / Bust',
      titleBn: '২. বডি / বুক (Chest/Bust)',
      descEn: 'Measure around the fullest part of bust horizontally.',
      descBn: 'বুকের সবচেয়ে চওড়া অংশের চারপাশে ফিতা ঘুরিয়ে মাপুন।',
      tipEn: 'Add 2–3 inches for fitted or 4–6 inches for loose abaya.',
      tipBn: 'ফিটিংয়ের জন্য ২-৩ ইঞ্চি লুজ এবং বোরকার জন্য ৪-৬ ইঞ্চি ছাড় দিন।',
      range: 'Standard: 32" – 48"',
    },
    {
      category: 'kameez',
      titleEn: '3. Waist',
      titleBn: '৩. কোমর (Waist)',
      descEn: 'Measure around natural waistline.',
      descBn: 'নাভির সামান্য উপরে স্বাভাবিক কোমরের পরিধি মাপুন।',
      tipEn: 'Keep 1 finger inside tape.',
      tipBn: 'ফিতার ভেতরে এক আঙুল জায়গা রাখুন।',
      range: 'Standard: 28" – 42"',
    },
    {
      category: 'kameez',
      titleEn: '4. Hip',
      titleBn: '৪. হিপ / নিতম্ব (Hip)',
      descEn: 'Measure around widest part of hips.',
      descBn: 'হিপের সবচেয়ে প্রশস্ত অংশে মাপুন। কামিজের ফাড়ার জন্য জরুরি।',
      tipEn: 'Essential for side-slit cuts.',
      tipBn: 'কামিজের সাইড ফাড়া সঠিকভাবে বসানোর জন্য দরকার।',
      range: 'Standard: 34" – 50"',
    },
    {
      category: 'dress',
      titleEn: '5. Shoulder / Cross Back',
      titleBn: '৫. পুঁট / তীর (Shoulder)',
      descEn: 'Measure across back from left shoulder bone to right.',
      descBn: 'পিঠের এক কাঁধের হাড় থেকে অন্য কাঁধের হাড় পর্যন্ত মাপুন।',
      tipEn: 'Women: 14"-16.5" | Gents: 16.5"-19.5"',
      tipBn: 'মহিলা: ১৪"-১৬.৫" | পুরুষ: ১৬.৫"-১৯.৫"',
      range: 'Standard: 14" – 19"',
    },
    {
      category: 'dress',
      titleEn: '6. Sleeve Length',
      titleBn: '৬. হাতা ও মোহরা (Sleeve & Armhole)',
      descEn: 'Measure from shoulder tip down to wrist.',
      descBn: 'কাঁধের শেষ প্রান্ত থেকে কব্জি পর্যন্ত হাতার দৈর্ঘ্য মাপুন।',
      tipEn: 'Add 0.5" for hem.',
      tipBn: 'হাতার মহুরী আলাদাভাবে লিখে রাখুন।',
      range: 'Standard: 18" – 24"',
    },
    {
      category: 'gents',
      titleEn: '7. Neck & Collar',
      titleBn: '৭. গলা ও কলার (Neck / Collar)',
      descEn: 'Measure around base of neck comfortably.',
      descBn: 'কলার যেখানে বসে সেই স্বাভাবিক পরিধি মাপুন।',
      tipEn: 'Band Collar: 14"-17.5"',
      tipBn: 'ব্যান্ড কলারের জন্য ১৪"-১৭.৫" সাধারণত ব্যবহৃত হয়।',
      range: 'Standard: 14" – 18"',
    },
    {
      category: 'dress',
      titleEn: '8. Flare / Bottom',
      titleBn: '৮. নিচের ঘের (Flare / Bottom)',
      descEn: 'Measure circumference of bottom hem.',
      descBn: 'পোশাকের নিচের মোট ছড়ানো গোল অংশের মাপ।',
      tipEn: 'Umbrella / Gown: 60"-90"+',
      tipBn: 'আম্ব্রেলা বা গাউনে ৬০"-৯০"+ ইঞ্চি ঘের রাখা হয়।',
      range: 'Standard: 24" – 90"+',
    },
    {
      category: 'pant',
      titleEn: '9. Pant Length',
      titleBn: '৯. প্যান্টের ঝুল (Pant Length)',
      descEn: 'Measure from waistline down to ankle.',
      descBn: 'কোমর থেকে পায়ের গোড়ালি পর্যন্ত সোজা মাপুন।',
      tipEn: 'Add 2" for waist fold.',
      tipBn: 'ইলাস্টিক ফোল্ডিংয়ের জন্য ২ ইঞ্চি বাড়তি রাখুন।',
      range: 'Standard: 36" – 42"',
    },
    {
      category: 'pant',
      titleEn: '10. Thigh & Ankle',
      titleBn: '১০. রান ও পায়ের মহুরী (Thigh & Ankle)',
      descEn: 'Measure upper thigh and ankle opening.',
      descBn: 'পায়ের রানের চওড়া অংশ এবং নিচের মোহরী মাপুন।',
      tipEn: 'Cigarette Pant: 11"-13" | Palazzo: 18"-28"+',
      tipBn: 'সিগারেট প্যান্ট: ১১"-১৩" | পালাজো: ১৮"-২৮"+',
      range: 'Standard: 11" – 28"',
    },
  ];

  const filteredSteps =
    activeCategory === 'all'
      ? steps
      : steps.filter((s) => s.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white text-slate-800 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-900/20 bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-500/20 p-2 border border-emerald-400/30">
              <Ruler className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-wide text-white">
                {isBn ? 'টেইলারিং মাপের সচিত্র নির্দেশিকা' : 'Visual Tailoring Measurement Guide'}
              </h3>
              <p className="text-xs text-emerald-200/80">
                {isBn ? 'নিখুঁত সেলাই ও ফিটিংয়ের আদর্শ পরিমাপ পদ্ধতি' : 'Professional Tailor measurement standards & allowances'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                activeCategory === c.id
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[calc(92vh-150px)]">
          {/* Master Rule */}
          <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-950 text-xs sm:text-sm flex gap-3 items-start shadow-sm">
            <div className="rounded-xl bg-emerald-600 p-2 text-white shrink-0 mt-0.5 shadow">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-900">
                {isBn ? 'মাস্টার টেইলার গোল্ডেন রুলস:' : 'Master Tailor Golden Rules:'}
              </p>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                {isBn
                  ? '১. সর্বদা স্ট্যান্ডার্ড ইঞ্চি ফিতা ব্যবহার করুন। ২. মাপ নেওয়ার সময় কাস্টমারকে সোজা রাখতে বলুন। ৩. কমফোর্টের জন্য ২-৩ ইঞ্চি এবং বোরকার জন্য ৪-৬ ইঞ্চি লুজ রাখুন।'
                  : '1. Always use standard inch tape. 2. Verify posture is upright. 3. Remember ease allowances.'}
              </p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredSteps.map((s, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      {isBn ? s.titleBn : s.titleEn}
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                      {s.range}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isBn ? s.descBn : s.descEn}
                  </p>
                </div>
                <div className="mt-3 rounded-xl bg-amber-50/90 p-2.5 text-[11px] font-medium text-amber-900 border border-amber-200/70">
                  <span className="font-bold">{isBn ? 'টিপস: ' : 'Tip: '}</span>
                  {isBn ? s.tipBn : s.tipEn}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3.5 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {isBn ? 'নির্ভুল মাপের রেফারেন্স গাইড' : 'Tailoring guide'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-emerald-700 px-6 py-2 text-xs sm:text-sm font-bold text-white shadow hover:bg-emerald-800 active:scale-95 transition"
          >
            {isBn ? 'বুঝেছি / বন্ধ করুন' : 'Got It / Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
