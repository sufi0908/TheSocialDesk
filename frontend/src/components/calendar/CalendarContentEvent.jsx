import React, { useState } from 'react';
import { Video, Image as ImageIcon } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUtils';
import { formatTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

const PLATFORM_SHORT = {
  instagram: 'IG',
  tiktok: 'TT',
  facebook: 'FB',
  youtube: 'YT',
  linkedin: 'LI',
  twitter: 'X',
  x: 'X',
  pinterest: 'PIN',
};

/**
 * CalendarContentEvent
 * Purpose-built, compact calendar event component designed specifically for calendar cells.
 * Replaces miniature dashboard cards with a clean 2-line layout:
 * [42px thumbnail]  Content title (13px, truncated)
 *                   ● 2:00 PM · IG (time + status dot + platform abbreviation)
 */
export const CalendarContentEvent = ({
  post,
  onClick,
  canManage = true,
  draggable = true,
  onDragStart,
  onDragEnd,
  className,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [isDraggingSelf, setIsDraggingSelf] = useState(false);

  if (!post) return null;

  // 1. Resolve real media from all possible data shapes
  const mediaSrc =
    post.mediaUrl ||
    post.media?.url ||
    post.media?.thumbnailUrl ||
    post.media_url ||
    post.thumbnailUrl ||
    post.assetUrl ||
    post.creativeUrl ||
    post.mediaAssets?.[0]?.file_url ||
    post.media_assets?.[0]?.file_url ||
    (Array.isArray(post.media) && post.media[0]?.url) ||
    null;

  const resolvedMediaSrc = !imgFailed ? resolveMediaUrl(mediaSrc) : null;

  const isVideo =
    post.contentType?.toLowerCase() === 'video' ||
    post.content_type?.toLowerCase() === 'video' ||
    post.media?.type === 'video' ||
    post.media?.mimeType?.startsWith('video/') ||
    (post.mediaAssets && post.mediaAssets[0]?.file_type?.toLowerCase() === 'video') ||
    /\.(mp4|webm|mov|mkv)$/i.test(mediaSrc || '');

  // 2. Format scheduled/published time cleanly (e.g. "2:00 PM")
  const getTimeDisplay = () => {
    if (post.time) {
      if (post.time.includes('AM') || post.time.includes('PM')) {
        return post.time;
      }
      const cleanTime = post.time.length === 5 ? `${post.time}:00` : post.time;
      const formatted = formatTime(`1970-01-01T${cleanTime}`);
      return formatted || post.time;
    }
    if (post.scheduledAt || post.scheduled_at) {
      return formatTime(post.scheduledAt || post.scheduled_at);
    }
    return '12:00 PM';
  };
  const timeDisplay = getTimeDisplay();

  // 3. Resolve status tokens & visual indicators
  const statusKey = (post.statusKey || post.status || 'scheduled').toLowerCase();
  const isPublished = statusKey === 'published';
  const isApproved = statusKey === 'approved';
  const isScheduled = statusKey === 'scheduled' || (!isPublished && !isApproved);

  const statusLabel = isPublished
    ? 'Published'
    : isApproved
    ? 'Approved'
    : isScheduled
    ? 'Scheduled'
    : statusKey.charAt(0).toUpperCase() + statusKey.slice(1);

  // 4. Resolve platform abbreviations (e.g. "IG", "IG · TT")
  const rawPlatforms = Array.isArray(post.platforms)
    ? post.platforms
    : typeof post.platforms === 'string'
    ? [post.platforms]
    : post.platform
    ? [post.platform]
    : [];

  const platformLabel = rawPlatforms
    .map((p) => PLATFORM_SHORT[p.toLowerCase()] || p)
    .filter(Boolean)
    .join(' · ');

  const postTitle = post.title || post.caption || 'Untitled Post';
  const clientName = post.client || post.clientName || post.client_name || post.client_company_name || '';

  // 5. Complete tooltip text on hover without cluttering cell
  const tooltipLines = [
    postTitle,
    clientName ? `Client: ${clientName}` : '',
    `Time: ${timeDisplay}`,
    `Status: ${statusLabel}`,
    rawPlatforms.length > 0 ? `Platform: ${rawPlatforms.join(', ')}` : '',
  ].filter(Boolean);
  const tooltipText = tooltipLines.join('\n');

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(post);
      }}
      draggable={canManage && draggable}
      onDragStart={(e) => {
        setIsDraggingSelf(true);
        if (onDragStart) onDragStart(e, post);
      }}
      onDragEnd={(e) => {
        setIsDraggingSelf(false);
        if (onDragEnd) onDragEnd(e, post);
      }}
      title={tooltipText}
      className={cn(
        'group relative w-full max-w-full box-border rounded-[10px] border border-slate-200/90 bg-white p-[7px] select-none text-left transition-all duration-150 overflow-hidden',
        isPublished
          ? 'border-l-[3.5px] border-l-emerald-500 hover:border-slate-300 hover:shadow-xs'
          : isApproved
          ? 'border-l-[3.5px] border-l-amber-500 hover:border-slate-300 hover:shadow-xs'
          : 'border-l-[3.5px] border-l-[#4F39F6] hover:border-slate-300 hover:shadow-xs',
        canManage && draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDraggingSelf && 'opacity-50 ring-1 ring-[#4F39F6]',
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 w-full">
        {/* 1. FIXED 42px THUMBNAIL */}
        <div className="relative w-10 h-10 sm:w-[42px] sm:h-[42px] rounded-lg overflow-hidden bg-slate-100 border border-slate-200/70 shrink-0 flex items-center justify-center">
          {resolvedMediaSrc ? (
            <img
              src={resolvedMediaSrc}
              alt={postTitle}
              className="w-full h-full object-cover pointer-events-none transition-transform duration-150 group-hover:scale-105"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          ) : isVideo ? (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500">
              <Video className="w-4 h-4 text-slate-500" />
            </div>
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
              <ImageIcon className="w-4 h-4 text-slate-400" />
            </div>
          )}
        </div>

        {/* 2. COMPACT 2-LINE METADATA */}
        <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
          {/* Line 1: Title (13px, semibold, single line with ellipsis) */}
          <h4 className="text-[13px] font-semibold text-slate-900 truncate leading-snug group-hover:text-[#4F39F6] transition-colors">
            {postTitle}
          </h4>

          {/* Line 2: Status Dot + Time · Platform */}
          <div className="flex items-center gap-1.5 min-w-0 text-[11px] text-slate-500 leading-none">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                isPublished ? 'bg-emerald-500' : isApproved ? 'bg-amber-500' : 'bg-[#4F39F6]'
              )}
            />
            <span className="whitespace-nowrap font-medium text-slate-600 shrink-0 font-mono">
              {timeDisplay}
            </span>
            {platformLabel && (
              <>
                <span className="text-slate-300 select-none shrink-0">·</span>
                <span className="truncate font-medium text-slate-500">
                  {platformLabel}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarContentEvent;
