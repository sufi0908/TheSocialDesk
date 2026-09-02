import React, { useState, useMemo } from 'react';
import { Play, Image as ImageIcon, Layers } from 'lucide-react';
import { PlatformIcon } from '../common/PlatformIcon';
import { resolveMediaUrl } from '../../utils/mediaUtils';
import { formatTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

/**
 * CalendarContentCard
 * Breathable, elegant, and modern social media content card for calendar cells.
 * Features an un-cluttered 4-row layout:
 * 1. Header: Platform icon + Client name (left) · Time (right)
 * 2. Media: Clean, unobstructed 16:10 visual thumbnail
 * 3. Title: Crisp, bold post title
 * 4. Footer: Subtle status indicator (● Scheduled / ● Published)
 */
export const CalendarContentCard = ({
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

  // 1. Resolve real uploaded media from any data model shape
  const rawAssets = Array.isArray(post.mediaAssets)
    ? post.mediaAssets
    : Array.isArray(post.media)
    ? post.media
    : [];

  const mediaSrc =
    post.mediaUrl ||
    post.media?.url ||
    post.media?.thumbnailUrl ||
    post.media_url ||
    post.thumbnailUrl ||
    post.assetUrl ||
    post.creativeUrl ||
    rawAssets[0]?.file_url ||
    rawAssets[0]?.url ||
    null;

  const resolvedMediaSrc = !imgFailed ? resolveMediaUrl(mediaSrc) : null;

  const isVideo =
    post.contentType?.toLowerCase() === 'video' ||
    post.content_type?.toLowerCase() === 'video' ||
    post.media?.type === 'video' ||
    rawAssets[0]?.file_type?.toLowerCase() === 'video' ||
    rawAssets[0]?.mime_type?.startsWith('video/') ||
    /\.(mp4|webm|mov|mkv)$/i.test(mediaSrc || '');

  const additionalMediaCount = rawAssets.length > 1 ? rawAssets.length - 1 : 0;

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

  // 4. Client Brand & Title handling
  const clientName = post.client || post.clientName || post.client_name || post.client_company_name || '';
  const postTitle = post.title || post.caption || 'Untitled Post';

  // If title has client prefix (e.g. "Rida Asad - Single Post"), cleanly extract the title
  const displayTitle = useMemo(() => {
    if (!postTitle) return 'Single Post';
    if (clientName && postTitle.toLowerCase().startsWith(clientName.toLowerCase())) {
      const trimmed = postTitle.slice(clientName.length).replace(/^[\s—\-:]+/, '').trim();
      if (trimmed.length > 0) return trimmed;
    }
    return postTitle;
  }, [postTitle, clientName]);

  const captionText = (post.caption || post.body_text || '').trim();

  // 5. Social Platforms
  const rawPlatforms = Array.isArray(post.platforms)
    ? post.platforms
    : typeof post.platforms === 'string'
    ? [post.platforms]
    : post.platform
    ? [post.platform]
    : [];

  const primaryPlatform = rawPlatforms[0] || 'instagram';

  // 6. Complete tooltip text on hover
  const tooltipLines = [
    postTitle,
    clientName ? `Client: ${clientName}` : '',
    captionText ? `Caption: ${captionText}` : '',
    rawPlatforms.length > 0 ? `Platforms: ${rawPlatforms.join(', ')}` : '',
    `Status: ${statusLabel}`,
    `Time: ${timeDisplay}`,
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
        'group relative w-full box-border rounded-xl bg-white border border-slate-200/90 p-2.5 flex flex-col gap-2 text-left select-none transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-[#4F39F6]/40 cursor-pointer',
        isDraggingSelf && 'opacity-50 ring-2 ring-[#4F39F6] shadow-sm',
        className
      )}
    >
      {/* 1. TOP HEADER ROW: PLATFORM + CLIENT (LEFT) · TIME (RIGHT) */}
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <PlatformIcon platform={primaryPlatform} size="xs" showLabel={false} />
          <span className="text-[11px] font-semibold text-slate-700 truncate tracking-tight">
            {clientName || 'Post'}
          </span>
        </div>
        <span className="text-[10.5px] font-mono text-slate-400 font-medium shrink-0 whitespace-nowrap">
          {timeDisplay}
        </span>
      </div>

      {/* 2. UNOBSTRUCTED MEDIA HERO */}
      <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden bg-slate-100 border border-slate-200/60">
        {resolvedMediaSrc ? (
          <img
            src={resolvedMediaSrc}
            alt={postTitle}
            className="w-full h-full object-cover pointer-events-none transition-transform duration-300 group-hover:scale-103"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : isVideo ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
            <Play className="w-6 h-6 text-slate-400 fill-slate-300" />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200/80 text-slate-300 gap-1">
            <ImageIcon className="w-5 h-5 text-slate-300" />
            <span className="text-[10px] text-slate-400 font-medium">No preview</span>
          </div>
        )}

        {/* Subtle Video Play Badge */}
        {isVideo && resolvedMediaSrc && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center text-white shadow-sm">
              <Play className="w-3 h-3 fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Multi-Media Badge (+N) */}
        {additionalMediaCount > 0 && (
          <span className="absolute bottom-1 right-1 bg-black/65 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 pointer-events-none shadow-xs">
            <Layers className="w-2.5 h-2.5" />
            <span>+{additionalMediaCount}</span>
          </span>
        )}
      </div>

      {/* 3. CONTENT DETAILS: TITLE + STATUS */}
      <div className="flex flex-col gap-1 min-w-0">
        {/* Post Title */}
        <h4 className="text-[12px] font-bold text-slate-900 truncate leading-snug group-hover:text-[#4F39F6] transition-colors">
          {displayTitle}
        </h4>

        {/* Bottom Row: Status Indicator + Secondary Platform Icons */}
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                isPublished
                  ? 'bg-emerald-500'
                  : isApproved
                  ? 'bg-amber-500'
                  : 'bg-[#4F39F6]'
              )}
            />
            <span
              className={cn(
                'text-[10.5px] font-semibold truncate',
                isPublished
                  ? 'text-emerald-600'
                  : isApproved
                  ? 'text-amber-600'
                  : 'text-[#4F39F6]'
              )}
            >
              {statusLabel}
            </span>
          </div>

          {/* Secondary platforms if post is multi-platform */}
          {rawPlatforms.length > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              {rawPlatforms.slice(1, 3).map((platform, idx) => (
                <PlatformIcon key={idx} platform={platform} size="xs" showLabel={false} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarContentCard;
