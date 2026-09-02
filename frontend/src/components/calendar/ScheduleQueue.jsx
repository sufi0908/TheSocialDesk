import React from 'react';
import { GripVertical, X, CheckSquare, Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';
import { PlatformIcon } from '../common/PlatformIcon';
import { resolveMediaUrl } from '../../utils/mediaUtils';
import { cn } from '../../utils/cn';

/**
 * ScheduleQueue
 * Sidebar panel displaying approved, unscheduled content ready to be dragged onto the calendar.
 */
export const ScheduleQueue = ({
  posts = [],
  isOpen = true,
  onClose,
  onDragStart,
  onDragEnd,
  onScheduleClick,
  onCardClick,
  canManage = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-full lg:w-[280px] xl:w-[310px] shrink-0">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden sticky top-20">
        {/* HEADER */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Approved Queue</span>
              <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {posts.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Drag onto calendar or click Schedule
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Queue"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* QUEUE CARDS LIST */}
        <div className="p-3 space-y-2.5 max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-thin">
          {posts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium px-4">
              <CheckSquare className="w-10 h-10 text-emerald-400/60 mx-auto mb-2.5" />
              <p className="font-bold text-slate-700 text-sm">Queue is clear</p>
              <p className="mt-1 text-[11px] text-slate-400">All approved content has been scheduled.</p>
            </div>
          ) : (
            posts.map((post) => {
              const mediaSrc =
                post.mediaUrl ||
                post.media?.url ||
                post.media_url ||
                post.mediaAssets?.[0]?.file_url ||
                (Array.isArray(post.media) && post.media[0]?.url) ||
                null;
              const resolvedMediaSrc = resolveMediaUrl(mediaSrc);

              const platforms = Array.isArray(post.platforms)
                ? post.platforms
                : typeof post.platforms === 'string'
                ? [post.platforms]
                : ['instagram'];

              return (
                <div
                  key={post.id || post.contentId}
                  draggable={canManage}
                  onDragStart={(e) => {
                    if (onDragStart) onDragStart(e, post, 'QUEUE_ITEM');
                  }}
                  onDragEnd={onDragEnd}
                  onClick={() => onCardClick && onCardClick(post)}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 shadow-2xs hover:shadow-xs transition-all space-y-2 select-none cursor-grab active:cursor-grabbing group text-left"
                >
                  <div className="flex items-start gap-2.5">
                    {/* Thumbnail */}
                    {resolvedMediaSrc ? (
                      <img
                        src={resolvedMediaSrc}
                        alt={post.title}
                        className="w-13 h-13 rounded-lg object-cover border border-slate-200/80 bg-slate-100 shrink-0 pointer-events-none"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-13 h-13 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 pointer-events-none">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-indigo-700 truncate block uppercase tracking-wider">
                        {post.client || 'Client'}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2 mt-0.5 group-hover:text-indigo-600 transition-colors">
                        {post.title}
                      </h4>
                    </div>

                    {/* Grip Icon */}
                    <div className="text-slate-300 group-hover:text-slate-500 shrink-0 p-0.5">
                      <GripVertical className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card Footer: Platforms + Quick Schedule Button */}
                  <div
                    className="flex items-center justify-between pt-2 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      {platforms.map((p) => (
                        <PlatformIcon key={p} platform={p} size="xs" showBox={true} />
                      ))}
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => onScheduleClick && onScheduleClick(post)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Schedule
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleQueue;
