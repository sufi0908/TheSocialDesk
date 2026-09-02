import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export const LoadingState = ({ type = 'spinner', label = 'Loading SocialDesk data...', className }) => {
  if (type === 'skeleton-cards') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse', className)}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="h-3 bg-slate-200 rounded-md w-1/2" />
            <div className="h-6 bg-slate-200 rounded-md w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'skeleton-table') {
    return (
      <div className={cn('bg-white border border-slate-200/80 rounded-xl overflow-hidden animate-pulse', className)}>
        <div className="h-10 bg-slate-100 border-b border-slate-200" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 border-b border-slate-100 p-4 flex items-center gap-4">
            <div className="h-4 bg-slate-200 rounded-md w-1/4" />
            <div className="h-4 bg-slate-200 rounded-md w-1/2" />
            <div className="h-4 bg-slate-200 rounded-md w-1/6" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('py-12 flex flex-col items-center justify-center text-slate-400', className)}>
      <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
};
