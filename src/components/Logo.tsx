import React from 'react';
import logoImg from '../assets/images/jibon_tailor_logo_1787810674637.jpg';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
}) => {
  const sizeMap = {
    sm: 'h-9 w-9 min-w-9 rounded-xl',
    md: 'h-11 w-11 min-w-11 rounded-2xl',
    lg: 'h-16 w-16 min-w-16 rounded-2xl',
    xl: 'h-24 w-24 min-w-24 rounded-3xl',
    '2xl': 'h-32 w-32 min-w-32 rounded-3xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`relative flex items-center justify-center overflow-hidden border-2 border-amber-400 shadow-md bg-emerald-950 shrink-0 transition-transform hover:scale-105 ${sizeMap[size]}`}
      >
        <img
          src={logoImg}
          alt="Jibon Tailor Logo"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center"
        />
      </div>
      {showText && (
        <div className="leading-tight">
          <div className="font-black text-slate-950 tracking-tight text-sm sm:text-base flex items-center gap-1">
            <span>JIBON TAILOR</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-bold text-emerald-800 tracking-wider uppercase">
            Tailoring Management System
          </p>
        </div>
      )}
    </div>
  );
};

