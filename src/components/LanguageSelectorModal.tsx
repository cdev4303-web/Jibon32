import React from 'react';
import { Language } from '../types';
import { LANGUAGES } from '../utils/strings';
import { Globe, Check, X } from 'lucide-react';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onSelectLang: (lang: Language) => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  onSelectLang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-fadeIn">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {currentLang === 'BN'
                  ? 'ভাষা পরিবর্তন করুন'
                  : currentLang === 'HI'
                  ? 'भाषा का चयन करें'
                  : currentLang === 'AR'
                  ? 'اختر لغة التطبيق'
                  : 'Select Application Language'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Choose your preferred language / ভাষা / भाषा / اللغة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 4 Languages Grid / List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-5">
          {LANGUAGES.map((langItem) => {
            const isSelected = currentLang === langItem.code;
            return (
              <button
                key={langItem.code}
                onClick={() => {
                  onSelectLang(langItem.code);
                  onClose();
                }}
                className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                  isSelected
                    ? 'border-emerald-700 bg-emerald-50/80 ring-2 ring-emerald-700/20 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{langItem.flag}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-slate-900">
                        {langItem.nativeName}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {langItem.label}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="p-1 rounded-full bg-emerald-700 text-white">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Footer Note */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Bangla • English • Hindi • Arabic</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
          >
            {currentLang === 'BN'
              ? 'ঠিক আছে'
              : currentLang === 'HI'
              ? 'ठीक है'
              : currentLang === 'AR'
              ? 'إغلاق'
              : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
