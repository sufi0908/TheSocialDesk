import React, { useId } from 'react';
import { cn } from '../../utils/cn';
import { Check } from 'lucide-react';

export const Checkbox = React.forwardRef(
  ({ label, description, checked, onChange, disabled, className, id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    return (
      <label htmlFor={checkboxId} className={cn('flex items-start gap-2.5 cursor-pointer select-none', disabled && 'cursor-not-allowed opacity-60', className)}>
        <div className="relative flex items-center mt-0.5">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange && onChange(e.target.checked)}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'w-4 h-4 rounded-md border flex items-center justify-center transition-all shadow-2xs peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-600 peer-focus-visible:ring-offset-1',
              checked
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-slate-300 hover:border-slate-400'
            )}
          >
            {checked && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        </div>

        {(label || description) && (
          <div>
            {label && <span className="text-xs font-bold text-slate-800 block">{label}</span>}
            {description && <span className="text-[11px] text-slate-500 block leading-tight">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
