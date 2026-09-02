import React, { useId } from 'react';
import { cn } from '../../utils/cn';

export const Textarea = React.forwardRef(
  ({ label, error, helperText, rows = 3, className, maxLength, value, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between">
          {label && <label htmlFor={textareaId} className="block text-xs font-bold text-slate-700">{label}</label>}
          {maxLength && value !== undefined && (
            <span className="text-[10px] text-slate-400">
              {typeof value === 'string' ? value.length : 0}/{maxLength}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          maxLength={maxLength}
          value={value}
          aria-invalid={!!error}
          className={cn(
            'w-full bg-white text-slate-900 placeholder:text-slate-400 text-xs rounded-xl border border-slate-200 p-3 shadow-2xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 disabled:bg-slate-50',
            error && 'border-rose-500 focus-visible:ring-rose-600',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-[11px] font-medium text-rose-600">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
