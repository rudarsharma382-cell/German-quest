'use client';

import React from 'react';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'amber' | 'emerald' | 'ruby' | 'sky' | 'dark' | 'white';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export default function PixelButton({
  variant = 'amber',
  size = 'md',
  className = '',
  children,
  ...props
}: PixelButtonProps) {
  const variantStyles = {
    amber: 'bg-amber-400 text-black hover:bg-amber-300 active:bg-amber-500',
    emerald: 'bg-emerald-500 text-white hover:bg-emerald-400 active:bg-emerald-600',
    ruby: 'bg-rose-500 text-white hover:bg-rose-400 active:bg-rose-600',
    sky: 'bg-sky-500 text-white hover:bg-sky-400 active:bg-sky-600',
    dark: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-black',
    white: 'bg-white text-black hover:bg-slate-100 active:bg-slate-200',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-[10px]',
    md: 'px-4 py-2 text-xs',
    lg: 'px-6 py-3 text-sm',
  };

  return (
    <button
      {...props}
      className={`relative inline-flex items-center justify-center font-pixel font-bold border-4 border-black shadow-pixel transition-all duration-75 active:translate-x-1 active:translate-y-1 active:shadow-pixel-pressed disabled:opacity-50 disabled:pointer-events-none select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </button>
  );
}

