import React from 'react';
import { cn } from '../../utils/cn';
import { STATUS_CONFIG } from '../../utils/constants';

export const Badge = ({ children, statusKey, className, variant = 'default', dot = false, ...props }) => {
  // If statusKey is passed, automatically pull exact status styling
  if (statusKey && STATUS_CONFIG[statusKey]) {
    const config = STATUS_CONFIG[statusKey];
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-extrabold border shadow-2xs transition-colors shrink-0',
          config.badgeStyle,
          className
        )}
        {...props}
      >
        {dot && <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />}
        {children || config.label}
      </span>
    );
  }

  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200/90',
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200/90',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/90',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/90',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/90',
    info: 'bg-blue-50 text-blue-700 border-blue-200/90',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/90',
  };

  const dotColors = {
    default: 'bg-slate-400',
    primary: 'bg-indigo-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-blue-500',
    purple: 'bg-purple-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-extrabold border shadow-2xs transition-colors shrink-0',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant] || dotColors.default)} />}
      {children}
    </span>
  );
};
