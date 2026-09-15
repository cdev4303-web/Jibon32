import React from 'react';
import { Shop, Language } from '../types';
import { Logo } from './Logo';
import { getHeaderTitleStyle } from '../utils/headerStyle';
import { strings, LANGUAGES } from '../utils/strings';
import {
  LayoutDashboard,
  PlusCircle,
  ShoppingBag,
  Users,
  Ruler,
  DollarSign,
  Receipt,
  Scissors,
  BarChart3,
  Settings,
  X,
  Lock,
  Globe,
  Sparkles,
} from 'lucide-react';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  shop: Shop;
  lang?: Language;
  onChangeLang?: (lang: Language) => void;
  onLockAdmin?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  shop,
  lang = 'BN',
  onChangeLang,
  onLockAdmin,
}) => {
  if (!isOpen) return null;

  const t = strings[lang] || strings.BN;

  const menuItems = [
    {
      id: 'dashboard',
      label: t.dashboard,
      icon: LayoutDashboard,
      highlight: false,
    },
    {
      id: 'ai-business-manager',
      label: t.aiBusinessManager || 'AI Business Manager',
      icon: Sparkles,
      highlight: false,
      badge: 'AI ✨',
    },
    {
      id: 'new-order',
      label: t.newOrder,
      icon: PlusCircle,
      highlight: true,
    },
    {
      id: 'catalog',
      label: t.catalog,
      icon: ShoppingBag,
      highlight: false,
    },
    {
      id: 'customers',
      label: t.customers,
      icon: Users,
      highlight: false,
    },
    {
      id: 'measurements',
      label: t.measurements,
      icon: Ruler,
      highlight: false,
    },
    {
      id: 'daily-accounts',
      label: t.dailyAccounts,
      icon: DollarSign,
      highlight: false,
    },
    {
      id: 'expense',
      label: t.expenses,
      icon: Receipt,
      highlight: false,
    },
    {
      id: 'tailor',
      label: t.tailorRecords,
      icon: Scissors,
      highlight: false,
    },
    {
      id: 'reports',
      label: t.reports,
      icon: BarChart3,
      highlight: false,
    },
    {
      id: 'settings',
      label: t.settings,
      icon: Settings,
      highlight: false,
    },
  ];

  const handleItemClick = (tabId: string) => {
    onSelectTab(tabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
      />

      {/* Sidebar Content */}
      <aside className="relative z-10 flex h-full w-[290px] max-w-[85vw] flex-col bg-white shadow-2xl animate-slideRight">
        {/* Top Header matching the screenshot */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4.5">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" />
            <div>
              <h2 className="flex items-center gap-1 text-sm font-black tracking-tight">
                <span>👚</span>
                <span style={getHeaderTitleStyle(shop.headerStyle)}>
                  {shop.name ? shop.name.toUpperCase() : 'JIBON LADIES TAILOR'}
                </span>
                <span>👗</span>
              </h2>
              <p className="text-[11px] font-medium text-slate-400">
                Tailoring System
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation List matching exact screenshot items and active pill design */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3.5 text-sm font-semibold">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            if (isActive) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className="flex w-full items-center gap-3.5 rounded-2xl bg-[#064e3b] px-4 py-3 text-left font-bold text-white shadow-sm transition"
                >
                  <Icon className="h-5 w-5 text-white shrink-0" />
                  <span className="text-sm font-bold tracking-tight">{item.label}</span>
                </button>
              );
            }

            if (item.highlight) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className="flex w-full items-center gap-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 px-4 py-3 text-left font-bold text-amber-950 shadow-2xs hover:bg-amber-100 transition"
                >
                  <Icon className="h-5 w-5 text-amber-600 shrink-0" />
                  <span className="text-sm font-bold tracking-tight">{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`flex w-full items-center gap-3.5 rounded-2xl px-4 py-2.5 text-left font-semibold transition ${
                  item.id === 'ai-business-manager'
                    ? 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100/90 font-bold border border-emerald-200/70'
                    : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-950'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${item.id === 'ai-business-manager' ? 'text-emerald-700' : 'text-slate-500'}`} />
                <span className="text-sm tracking-tight flex-1">{item.label}</span>
                {item.id === 'ai-business-manager' && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                    AI ✨
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer with Language Switcher */}
        <div className="border-t border-slate-100 p-3.5 bg-slate-50/70 space-y-2.5">
          {onChangeLang && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                <Globe className="h-3 w-3 text-emerald-600" />
                <span>{lang === 'BN' ? 'ভাষা নির্বাচন' : lang === 'HI' ? 'भाषा चुनें' : lang === 'AR' ? 'اختر اللغة' : 'Select Language'}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => onChangeLang(item.code)}
                    className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-extrabold transition ${
                      lang === item.code
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs leading-none mb-0.5">{item.flag}</span>
                    <span className="leading-tight">{item.short}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {onLockAdmin && (
            <button
              onClick={() => {
                onClose();
                onLockAdmin();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-200/80 hover:bg-rose-50 hover:text-rose-700 py-2 text-xs font-bold text-slate-700 transition"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{lang === 'EN' ? 'Lock Admin Panel' : lang === 'HI' ? 'एडमिन पैनल लॉक करें' : lang === 'AR' ? 'قفل لوحة الإدارة' : 'এডমিন প্যানেল লক করুন'}</span>
            </button>
          )}
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-2">
            <span>v2.5 • PRO</span>
            <span className="font-bold text-emerald-800">Jibon Tailors</span>
          </div>
        </div>
      </aside>
    </div>
  );
};
