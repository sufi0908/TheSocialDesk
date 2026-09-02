import React from 'react';
import { Share2, Bookmark } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Pixel-Perfect Brand SVG Icons
 */
const InstagramIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5.5" ry="5.5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2.5" />
  </svg>
);

const FacebookIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedinIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v7.6h2.79v-7.6H6.46M7.86 6.8a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9z" />
  </svg>
);

const TikTokIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const YoutubeIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const TwitterIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const PinterestIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0a12 12 0 0 0-4.37 23.18c-.07-.98-.13-2.49.03-3.56.14-.97.94-6.38.94-6.38s-.24-.48-.24-1.19c0-1.11.65-1.95 1.45-1.95.68 0 1.01.51 1.01 1.13 0 .69-.44 1.72-.67 2.67-.19.8.4 1.45 1.19 1.45 1.43 0 2.53-1.51 2.53-3.68 0-1.93-1.39-3.27-3.36-3.27-2.45 0-3.89 1.84-3.89 3.73 0 .74.28 1.54.64 1.97.07.08.08.16.06.24-.07.28-.22.88-.25 1-.04.16-.13.2-.3.12-1.13-.53-1.84-2.18-1.84-3.51 0-2.86 2.08-5.49 5.99-5.49 3.15 0 5.6 2.24 5.6 5.24 0 3.12-1.97 5.64-4.7 5.64-.92 0-1.78-.48-2.08-1.04l-.56 2.15c-.21.79-.76 1.78-1.13 2.38A12 12 0 1 0 12 0z" />
  </svg>
);

/**
 * Platform Configurations
 */
const PLATFORMS = {
  instagram: {
    label: 'Instagram',
    icon: InstagramIcon,
    badgeBg: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white',
    pillBg: 'bg-pink-50/90 text-pink-900 border-pink-200/80',
    flatColor: 'text-[#E1306C]',
  },
  facebook: {
    label: 'Facebook',
    icon: FacebookIcon,
    badgeBg: 'bg-[#1877F2] text-white',
    pillBg: 'bg-blue-50/90 text-blue-900 border-blue-200/80',
    flatColor: 'text-[#1877F2]',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: LinkedinIcon,
    badgeBg: 'bg-[#0A66C2] text-white',
    pillBg: 'bg-sky-50/90 text-sky-900 border-sky-200/80',
    flatColor: 'text-[#0A66C2]',
  },
  tiktok: {
    label: 'TikTok',
    icon: TikTokIcon,
    badgeBg: 'bg-slate-950 text-white',
    pillBg: 'bg-slate-100 text-slate-900 border-slate-300',
    flatColor: 'text-slate-950',
  },
  youtube: {
    label: 'YouTube',
    icon: YoutubeIcon,
    badgeBg: 'bg-[#FF0000] text-white',
    pillBg: 'bg-red-50/90 text-red-900 border-red-200/80',
    flatColor: 'text-[#FF0000]',
  },
  twitter: {
    label: 'X (Twitter)',
    icon: TwitterIcon,
    badgeBg: 'bg-slate-950 text-white',
    pillBg: 'bg-slate-100 text-slate-900 border-slate-300',
    flatColor: 'text-slate-950',
  },
  x: {
    label: 'X',
    icon: TwitterIcon,
    badgeBg: 'bg-slate-950 text-white',
    pillBg: 'bg-slate-100 text-slate-900 border-slate-300',
    flatColor: 'text-slate-950',
  },
  pinterest: {
    label: 'Pinterest',
    icon: PinterestIcon,
    badgeBg: 'bg-[#E60023] text-white',
    pillBg: 'bg-rose-50/90 text-rose-900 border-rose-200/80',
    flatColor: 'text-[#E60023]',
  },
};

/**
 * PlatformIcon
 * Redesigned, agency-grade social platform brand icon component.
 * Supports:
 * - Micro brand badge (crisp brand container with white icon)
 * - Labeled pill badge
 * - Flat unboxed icon
 */
export const PlatformIcon = ({
  platform,
  className,
  showLabel = false,
  showBox = true, // default to clean brand box
  size = 'sm', // 'xs' (16px) | 'sm' (18px) | 'md' (22px) | 'lg' (26px)
}) => {
  if (!platform) return null;
  const pKey = platform.toString().toLowerCase().trim();
  const config = PLATFORMS[pKey] || {
    label: platform,
    icon: Share2,
    badgeBg: 'bg-indigo-600 text-white',
    pillBg: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    flatColor: 'text-indigo-600',
  };

  const IconComp = config.icon;

  // Size mapping for badge box
  const sizeMap = {
    xs: { box: 'w-4 h-4 rounded-[4px] p-0.5', icon: 'w-2.5 h-2.5', text: 'text-[9px]' },
    sm: { box: 'w-4.5 h-4.5 rounded-[5px] p-0.5', icon: 'w-3 h-3', text: 'text-[10px]' },
    md: { box: 'w-5.5 h-5.5 rounded-md p-1', icon: 'w-3.5 h-3.5', text: 'text-xs' },
    lg: { box: 'w-7 h-7 rounded-lg p-1.5', icon: 'w-4 h-4', text: 'text-xs' },
  };

  const currentSize = sizeMap[size] || sizeMap.sm;

  // 1. LABELED PILL VARIANT
  if (showLabel) {
    return (
      <span
        title={config.label}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-bold shadow-2xs select-none transition-transform duration-100 hover:scale-102',
          config.pillBg,
          currentSize.text
        )}
      >
        <span className={cn('inline-flex items-center justify-center shrink-0 shadow-2xs', config.badgeBg, currentSize.box)}>
          <IconComp className={currentSize.icon} />
        </span>
        <span className="leading-none">{config.label}</span>
      </span>
    );
  }

  // 2. FLAT ICON (WITHOUT BOX)
  if (showBox === false) {
    return (
      <span title={config.label} className={cn('inline-flex items-center justify-center shrink-0', config.flatColor)}>
        <IconComp className={className || currentSize.icon} />
      </span>
    );
  }

  // 3. MICRO BRAND BADGE (DEFAULT: CRISP, PREMIUM, RECOGNIZABLE)
  return (
    <span
      title={config.label}
      className={cn(
        'inline-flex items-center justify-center shrink-0 shadow-2xs select-none transition-transform duration-100 hover:scale-108',
        config.badgeBg,
        className ? cn('rounded-[5px] p-0.5', className) : currentSize.box
      )}
    >
      <IconComp className={className ? 'w-full h-full' : currentSize.icon} />
    </span>
  );
};

export default PlatformIcon;
