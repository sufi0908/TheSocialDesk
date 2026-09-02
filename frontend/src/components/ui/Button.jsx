import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs border border-transparent focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
  outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-2xs focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent focus-visible:ring-2 focus-visible:ring-indigo-600',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-2xs border border-transparent focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2',
  light: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-600',
  gradient: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-2xs border border-transparent focus-visible:ring-2 focus-visible:ring-indigo-600',
};

const sizes = {
  xs: 'px-2.5 py-1.5 text-[11px] font-extrabold rounded-lg gap-1.5',
  sm: 'px-3.5 py-2 text-xs font-extrabold rounded-xl gap-2',
  md: 'px-4.5 py-2.5 text-xs font-extrabold rounded-xl gap-2',
  lg: 'px-5.5 py-3 text-sm font-extrabold rounded-xl gap-2.5',
  icon: 'p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100',
};

export const Button = React.forwardRef(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      iconOnly = false,
      disabled = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      type = 'button',
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center justify-center font-sans tracking-tight transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus-visible:outline-none shrink-0',
          variants[variant] || variants.primary,
          sizes[size] || sizes.md,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : LeftIcon ? (
          <LeftIcon className="w-4 h-4 shrink-0" />
        ) : null}
        {children}
        {!isLoading && RightIcon ? <RightIcon className="w-4 h-4 shrink-0" /> : null}
      </button>
    );
  }
);

Button.displayName = 'Button';
