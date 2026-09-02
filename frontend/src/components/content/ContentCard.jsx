import React from 'react';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { MediaPreview } from '../common/MediaPreview';
import { PLATFORMS } from '../../services/contentService';
import { formatDate } from '../../utils/formatters';
import { GripVertical, Clock } from 'lucide-react';

export const ContentCard = ({
  post,
  onClick,
  onPlayVideo,
  draggable = false,
  onDragStart,
  viewType = 'grid',
}) => {
  if (!post) return null;

  const mediaObject =
    post.media ||
    post.mediaAssets?.[0] ||
    post.media_assets?.[0] ||
    post.mediaUrl ||
    post.media_url ||
    null;

  const renderPlatformBadge = (pId) => {
    const p = PLATFORMS[pId.toUpperCase()] || { name: pId, id: pId };
    return (
      <span
        key={pId}
        className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9px] font-black border border-indigo-200/80 inline-block shadow-2xs"
      >
        {p.name.toUpperCase()}
      </span>
    );
  };

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={() => onClick && onClick(post)}
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between overflow-hidden relative ${
        viewType === 'kanban' ? 'w-full' : ''
      }`}
    >
      {/* 1. CREATIVE MEDIA THUMBNAIL (Constrained Aspect Ratio) */}
      <div className="relative w-full aspect-16/10 bg-slate-950 overflow-hidden shrink-0">
        <MediaPreview
          media={mediaObject}
          alt={post.title}
          aspectRatio="aspect-16/10"
          onPlayVideo={() => (onPlayVideo ? onPlayVideo(post) : onClick && onClick(post))}
        />

        {draggable && (
          <div className="absolute top-2.5 right-2.5 bg-slate-900/70 backdrop-blur-xs p-1 rounded-lg text-white z-10">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* 2. CARD CONTENT BODY & METADATA */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          {/* CLIENT BRAND BADGE & CONTENT TYPE */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200/80 truncate max-w-[140px]">
              {post.client}
            </span>
            {viewType === 'grid' && <Badge statusKey={post.statusKey} />}
            {viewType === 'kanban' && (
              <span className="text-[9px] font-semibold text-slate-400 shrink-0">{post.contentType}</span>
            )}
          </div>

          {/* POST TITLE */}
          <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {post.title}
          </h4>

          {/* TARGET PLATFORM BADGES */}
          {Array.isArray(post.platforms) && post.platforms.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {post.platforms.map((pId) => renderPlatformBadge(pId))}
            </div>
          )}
        </div>

        {/* CARD FOOTER: ASSIGNEE & DEADLINE */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-auto">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar src={post.assigneeAvatar} name={post.assigneeName || 'Unassigned'} size="xs" />
            <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[110px]">
              {post.assigneeName || 'Unassigned'}
            </span>
          </div>

          <span className="font-mono text-slate-400 text-[10px] flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 text-slate-400" />
            {post.scheduledAt
              ? formatDate(post.scheduledAt)
              : post.deadline
              ? formatDate(post.deadline)
              : 'No Deadline'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ContentCard;
