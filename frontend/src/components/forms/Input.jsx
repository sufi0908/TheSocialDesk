import React, { useId } from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(
  ({ label, error, helperText, leftIcon: LeftIcon, rightIcon: RightIcon, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {LeftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none">
              <LeftIcon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              'w-full bg-white text-slate-900 placeholder:text-slate-400 text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 shadow-2xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 disabled:bg-slate-50 disabled:text-slate-500',
              LeftIcon && 'pl-9',
              RightIcon && 'pr-9',
              error && 'border-rose-500 focus-visible:ring-rose-600',
              className
            )}
            {...props}
          />
          {RightIcon && (
            <div className="absolute right-3 text-slate-400">
              <RightIcon className="w-4 h-4" />
            </div>
          )}
        </div>
        {error ? (
          <p id={errorId} className="text-[11px] font-medium text-rose-600">{error}</p>
        ) : helperText ? (
          <p id={helperId} className="text-[11px] text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
