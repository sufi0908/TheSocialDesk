import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { getMediaUrl, getInitials } from '../../utils/mediaUtils';

export const Avatar = ({ src, name, size = 'md', status, className, ...props }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg',
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  const sizeClass = sizes[size] || sizes.md;
  const statusSizeClass = statusSizes[size] || statusSizes.md;
  const resolvedUrl = getMediaUrl(src);

  return (
    <div className="relative inline-block shrink-0">
      {resolvedUrl && !hasError ? (
        <img
          src={resolvedUrl}
          alt={name || 'User avatar'}
          onError={() => setHasError(true)}
          className={cn('rounded-full object-cover shrink-0 aspect-square ring-2 ring-white shadow-2xs', sizeClass, className)}
          {...props}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center shrink-0 aspect-square ring-2 ring-white shadow-2xs border border-indigo-200 select-none',
            sizeClass,
            className
          )}
          {...props}
        >
          {getInitials(name)}
        </div>
      )}


      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
            statusSizeClass,
            status === 'online' ? 'bg-emerald-500' : status === 'busy' ? 'bg-rose-500' : 'bg-slate-400'
          )}
        />
      )}
    </div>
  );
};

export const AvatarGroup = ({ children, max = 3, size = 'sm', className }) => {
  const childrenArray = React.Children.toArray(children);
  const visible = childrenArray.slice(0, max);
  const remaining = childrenArray.length - max;

  return (
    <div className={cn('flex items-center -space-x-2 overflow-hidden', className)}>
      {visible.map((child, i) => (
        <div key={i} className="inline-block ring-2 ring-white rounded-full">
          {child}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] ring-2 ring-white',
            size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};
