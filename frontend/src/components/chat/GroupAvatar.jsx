import React, { useState, useEffect } from 'react';
import { Pin, BellOff, Users } from 'lucide-react';
import { resolveMediaUrl, getInitials } from '../../utils/mediaUtils';

export const GroupAvatar = ({
  src,
  name = 'Group',
  size = 'md',
  isPinned = false,
  isMuted = false,
  className = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
  };

  const resolvedUrl = resolveMediaUrl(src);
  const sizeClass = sizes[size] || sizes.md;

  return (
    <div className={`relative inline-block shrink-0 select-none ${className}`} {...props}>
      {resolvedUrl && !hasError ? (
        <img
          src={resolvedUrl}
          alt={name}
          onError={() => setHasError(true)}
          className={`rounded-2xl object-cover shrink-0 aspect-square border border-slate-200/80 shadow-2xs ${sizeClass}`}
        />
      ) : (
        <div
          className={`rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-extrabold flex items-center justify-center shrink-0 aspect-square shadow-2xs border border-indigo-400/30 ${sizeClass}`}
        >
          {name ? getInitials(name) : <Users className="w-1/2 h-1/2 opacity-80" />}
        </div>
      )}

      {/* Pinned Indicator Badge */}
      {isPinned && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
          <Pin className="w-2 h-2 text-slate-900 fill-slate-900" />
        </div>
      )}

      {/* Muted Indicator Badge */}
      {isMuted && !isPinned && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
          <BellOff className="w-2.5 h-2.5 text-slate-600" />
        </div>
      )}
    </div>
  );
};
