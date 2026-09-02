import React from 'react';
import { cn } from '../../utils/cn';

export const Card = ({ children, className, ...props }) => (
  <div
    className={cn(
      'bg-white rounded-2xl border border-slate-200/90 shadow-2xs transition-all duration-200 overflow-hidden',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className, ...props }) => (
  <div className={cn('px-6 py-4.5 border-b border-slate-100/90 flex items-center justify-between gap-3', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className, ...props }) => (
  <h3 className={cn('text-base font-extrabold text-slate-900 tracking-tight leading-snug', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className, ...props }) => (
  <p className={cn('text-xs font-medium text-slate-500 mt-1 leading-relaxed', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className, ...props }) => (
  <div className={cn('p-6', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className, ...props }) => (
  <div className={cn('px-6 py-4 bg-slate-50/80 border-t border-slate-100/90 flex items-center justify-between gap-3', className)} {...props}>
    {children}
  </div>
);
