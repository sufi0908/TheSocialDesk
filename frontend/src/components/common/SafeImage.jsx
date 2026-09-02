import React, { useState, useEffect, useRef } from 'react';
import { getMediaUrl, getInitials } from '../../utils/mediaUtils';
import { ImageOff, Building2, User } from 'lucide-react';

/**
 * SafeImage Component
 * Handles image resolving via getMediaUrl, zero native broken image icons, designed fallback UX,
 * non-blocking async lazy loading, and timeouts against infinite loading spinners.
 */
export const SafeImage = ({
  src,
  alt = 'Media item',
  className = '',
  fallbackType = 'generic', // 'avatar' | 'logo' | 'creative' | 'generic'
  name = '', // Used for generating initials for avatar/logo fallback
  objectFit = 'cover', // 'cover' | 'contain'
  timeoutMs = 6000, // Maximum time before gracefully falling back to Preview Unavailable
  onClick,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef(null);
  const timerRef = useRef(null);

  const resolvedUrl = getMediaUrl(src);

  useEffect(() => {
    if (!resolvedUrl) {
      setIsLoading(false);
      return;
    }

    setHasError(false);
    setIsLoading(true);

    // If already loaded from cache
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoading(false);
      return;
    }

    // Set fallback timeout to guarantee NO infinite loading spinner
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsLoading((loading) => {
        if (loading) {
          setHasError(true);
          return false;
        }
        return loading;
      });
    }, timeoutMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resolvedUrl, timeoutMs]);

  const handleLoad = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsLoading(false);
    setHasError(true);
  };

  if (!resolvedUrl || hasError) {
    if (fallbackType === 'avatar') {
      return (
        <div
          className={`rounded-full bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center shrink-0 aspect-square border border-indigo-200 select-none ${className}`}
          onClick={onClick}
          {...props}
        >
          {getInitials(name)}
        </div>
      );
    }

    if (fallbackType === 'logo') {
      return (
        <div
          className={`rounded-xl bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center shrink-0 border border-slate-200 select-none ${className}`}
          onClick={onClick}
          {...props}
        >
          {name ? (
            <span className="text-xs tracking-wider">{getInitials(name)}</span>
          ) : (
            <Building2 className="w-4 h-4 text-slate-400" />
          )}
        </div>
      );
    }

    if (fallbackType === 'creative') {
      return (
        <div
          className={`w-full h-full bg-slate-50 border border-slate-200/80 rounded-lg flex flex-col items-center justify-center p-3 text-center text-slate-400 select-none ${className}`}
          onClick={onClick}
          {...props}
        >
          <ImageOff className="w-5 h-5 mb-1 text-slate-400 stroke-[1.5]" />
          <span className="text-[11px] font-semibold text-slate-500">
            {hasError ? 'Preview unavailable' : 'No Creative Uploaded'}
          </span>
        </div>
      );
    }

    // Generic fallback
    return (
      <div
        className={`bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center p-2 text-slate-400 ${className}`}
        onClick={onClick}
        {...props}
      >
        <ImageOff className="w-4 h-4 text-slate-400" />
      </div>
    );
  }

  const objectFitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100/90 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        ref={imgRef}
        src={resolvedUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full ${objectFitClass} transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onClick={onClick}
        {...props}
      />
    </div>
  );
};
