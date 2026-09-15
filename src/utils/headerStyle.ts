import React from 'react';
import { HeaderColorConfig } from '../types';

export interface ColorPreset {
  id: string;
  nameBn: string;
  nameEn: string;
  type: 'gradient' | 'solid';
  gradient?: string;
  solidColor?: string;
  previewBg: string;
  effectRecommended?: 'none' | 'soft-shadow' | 'glow' | '3d-emboss' | 'neon';
}

export const HEADER_COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'emerald-gold',
    nameBn: 'এমারেল্ড ও গোল্ডেন রয়্যাল (Emerald & Gold)',
    nameEn: 'Emerald & Gold Royal',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #047857 0%, #059669 35%, #d97706 70%, #b45309 100%)',
    previewBg: 'linear-gradient(135deg, #047857, #d97706)',
    effectRecommended: 'soft-shadow',
  },
  {
    id: 'sunset-crimson',
    nameBn: 'সানসেট ক্রিমসন ও অ্যাম্বার (Sunset Crimson)',
    nameEn: 'Sunset Crimson & Amber',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 40%, #f59e0b 80%, #d97706 100%)',
    previewBg: 'linear-gradient(135deg, #e11d48, #f59e0b)',
    effectRecommended: 'glow',
  },
  {
    id: 'ocean-cyan',
    nameBn: 'ওশেন ব্লু ও সায়ান (Ocean Blue & Cyan)',
    nameEn: 'Ocean Blue & Cyan',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 45%, #06b6d4 85%, #0891b2 100%)',
    previewBg: 'linear-gradient(135deg, #1d4ed8, #06b6d4)',
    effectRecommended: 'soft-shadow',
  },
  {
    id: 'royal-purple-pink',
    nameBn: 'রয়্যাল পার্পল ও পিংক (Royal Purple & Pink)',
    nameEn: 'Royal Purple & Pink Boutique',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 40%, #db2777 80%, #f43f5e 100%)',
    previewBg: 'linear-gradient(135deg, #6d28d9, #db2777)',
    effectRecommended: 'glow',
  },
  {
    id: 'golden-luxury',
    nameBn: 'গোল্ডেন শাইন লাক্সারি (Golden Luxury)',
    nameEn: 'Golden Shine Luxury',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #92400e 0%, #d97706 30%, #fbbf24 60%, #b45309 85%, #78350f 100%)',
    previewBg: 'linear-gradient(135deg, #92400e, #fbbf24, #78350f)',
    effectRecommended: '3d-emboss',
  },
  {
    id: 'cyber-neon',
    nameBn: 'সাইবার নিয়ন গ্রীন ও ইলেকট্রিক ব্লু (Cyber Neon)',
    nameEn: 'Cyber Neon & Electric Mint',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 40%, #06b6d4 80%, #3b82f6 100%)',
    previewBg: 'linear-gradient(135deg, #10b981, #06b6d4)',
    effectRecommended: 'neon',
  },
  {
    id: 'rainbow-vibrant',
    nameBn: 'রংধনু মাল্টিকালার (Rainbow Multi-Color)',
    nameEn: 'Rainbow Vibrant Spectrum',
    type: 'gradient',
    gradient: 'linear-gradient(90deg, #dc2626 0%, #ea580c 20%, #d97706 40%, #16a34a 60%, #2563eb 80%, #9333ea 100%)',
    previewBg: 'linear-gradient(90deg, #dc2626, #ea580c, #16a34a, #2563eb, #9333ea)',
    effectRecommended: 'soft-shadow',
  },
  {
    id: 'ruby-rose',
    nameBn: 'রুবি রেড ও রোজ গ্ল্যামার (Ruby Red Glamour)',
    nameEn: 'Ruby Red & Rose Glamour',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #9f1239 0%, #e11d48 45%, #fb7185 85%, #be123c 100%)',
    previewBg: 'linear-gradient(135deg, #9f1239, #fb7185)',
    effectRecommended: 'glow',
  },
  {
    id: 'classic-emerald',
    nameBn: 'ডিফল্ট ক্লাসিক এমারেল্ড গ্রীন (Classic Deep Emerald)',
    nameEn: 'Classic Deep Emerald (Default)',
    type: 'solid',
    solidColor: '#064e3b',
    previewBg: '#064e3b',
    effectRecommended: 'none',
  },
  {
    id: 'royal-navy',
    nameBn: 'রয়্যাল নেভি ব্লু (Royal Navy Blue)',
    nameEn: 'Royal Navy Blue',
    type: 'solid',
    solidColor: '#1e3a8a',
    previewBg: '#1e3a8a',
    effectRecommended: 'soft-shadow',
  },
  {
    id: 'crimson-deep',
    nameBn: 'ডিপ ক্রিমসন মেরুন (Deep Crimson Maroon)',
    nameEn: 'Deep Crimson Maroon',
    type: 'solid',
    solidColor: '#881337',
    previewBg: '#881337',
    effectRecommended: 'soft-shadow',
  },
  {
    id: 'charcoal-black',
    nameBn: 'প্রিমিয়াম চারকোল ব্ল্যাক (Charcoal Jet Black)',
    nameEn: 'Premium Charcoal Black',
    type: 'solid',
    solidColor: '#090d16',
    previewBg: '#090d16',
    effectRecommended: 'none',
  },
];

export const DEFAULT_HEADER_CONFIG: HeaderColorConfig = {
  colorMode: 'preset',
  presetId: 'classic-emerald',
  solidColor: '#064e3b',
  gradientFrom: '#047857',
  gradientTo: '#d97706',
  gradientAngle: '135deg',
  effect: 'none',
  fontSize: 'normal',
  letterSpacing: 'normal',
};

export const getHeaderTitleStyle = (config?: HeaderColorConfig): React.CSSProperties => {
  const cfg = config || DEFAULT_HEADER_CONFIG;

  let background = '';
  let color = '#064e3b';
  let isGradient = false;

  if (cfg.colorMode === 'preset') {
    const preset = HEADER_COLOR_PRESETS.find((p) => p.id === cfg.presetId) || HEADER_COLOR_PRESETS[0];
    if (preset.type === 'gradient' && preset.gradient) {
      background = preset.gradient;
      isGradient = true;
    } else {
      color = preset.solidColor || '#064e3b';
    }
  } else if (cfg.colorMode === 'solid') {
    color = cfg.solidColor || '#064e3b';
  } else if (cfg.colorMode === 'custom-gradient') {
    const from = cfg.gradientFrom || '#047857';
    const to = cfg.gradientTo || '#d97706';
    const angle = cfg.gradientAngle || '135deg';
    background = `linear-gradient(${angle}, ${from} 0%, ${to} 100%)`;
    isGradient = true;
  }

  // Shadow / Glow / Emboss effect styles
  let textShadow = '';
  let filter = '';

  switch (cfg.effect) {
    case 'soft-shadow':
      textShadow = '0 2px 4px rgba(0, 0, 0, 0.18)';
      filter = isGradient ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.18))' : '';
      break;
    case 'glow':
      textShadow = '0 0 10px rgba(16, 185, 129, 0.45), 0 0 20px rgba(245, 158, 11, 0.3)';
      filter = isGradient ? 'drop-shadow(0 0 6px rgba(16,185,129,0.35))' : '';
      break;
    case '3d-emboss':
      textShadow = '1px 1px 0px #ffffff, 2px 2px 2px rgba(0,0,0,0.25)';
      filter = isGradient ? 'drop-shadow(1px 1px 1px rgba(0,0,0,0.25))' : '';
      break;
    case 'neon':
      textShadow = '0 0 5px #10b981, 0 0 12px #06b6d4';
      filter = isGradient ? 'drop-shadow(0 0 8px rgba(6,182,212,0.5))' : '';
      break;
    case 'shimmer':
      textShadow = '0 1px 3px rgba(0,0,0,0.12)';
      break;
    default:
      textShadow = 'none';
      filter = 'none';
      break;
  }

  const baseStyle: React.CSSProperties = {
    transition: 'all 0.25s ease-in-out',
    display: 'inline-block',
  };

  if (cfg.letterSpacing === 'wide') {
    baseStyle.letterSpacing = '0.04em';
  } else if (cfg.letterSpacing === 'wider') {
    baseStyle.letterSpacing = '0.08em';
  }

  if (isGradient) {
    return {
      ...baseStyle,
      background,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      filter: filter || undefined,
    };
  }

  return {
    ...baseStyle,
    color,
    textShadow: textShadow !== 'none' ? textShadow : undefined,
  };
};
