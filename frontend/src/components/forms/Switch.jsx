import React from 'react';
import { cn } from '../../utils/cn';

export const Switch = ({ checked, onChange, label, description, className }) => {
  return (
    <label className={cn('flex items-center justify-between cursor-pointer py-1 select-none', className)}>
      {(label || description) && (
        <div className="mr-3">
          {label && <span className="text-xs font-medium text-slate-900 block">{label}</span>}
          {description && <span className="text-[11px] text-slate-500 block">{description}</span>}
        </div>
      )}
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden',
          checked ? 'bg-indigo-600' : 'bg-slate-200'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </div>
    </label>
  );
};
