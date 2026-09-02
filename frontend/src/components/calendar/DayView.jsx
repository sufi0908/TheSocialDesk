import React, { useMemo } from 'react';
import { Clock, Plus, ArrowDownToLine, Calendar as CalendarIcon } from 'lucide-react';
import { ScheduledContentCard } from './ScheduledContentCard';
import { cn } from '../../utils/cn';
import { formatTime } from '../../utils/formatters';

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
];

/**
 * DayView
 * Vertical timeline view displaying scheduled posts for a single day broken down by hourly slots.
 */
export const DayView = ({
  currentDate = new Date(),
  posts = [],
  canManage = true,
  isDragging = false,
  hoveredDate = null,
  onCardClick,
  onCardDragStart,
  onCardDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onCellClick,
}) => {
  const dateStr = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [currentDate]);

  // Filter posts for this day
  const dayPosts = useMemo(() => {
    return posts.filter((post) => {
      const d = post.date || (post.scheduled_at ? post.scheduled_at.split('T')[0] : null);
      return d === dateStr;
    });
  }, [posts, dateStr]);

  // Group day posts by nearest hour slot (or 'unassigned')
  const postsByHour = useMemo(() => {
    const map = {};
    for (const h of HOURS) {
      map[h] = [];
    }
    map['other'] = [];

    for (const post of dayPosts) {
      const time = post.time || (post.scheduled_at ? post.scheduled_at.split('T')[1]?.slice(0, 5) : '12:00');
      const hourPrefix = time.split(':')[0] + ':00';

      if (map[hourPrefix]) {
        map[hourPrefix].push(post);
      } else {
        map['other'].push(post);
      }
    }
    return map;
  }, [dayPosts]);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* DAY HEADER BANNER */}
      <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#4F39F6]" />
          <span className="text-sm font-bold text-slate-900">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <span className="text-xs font-bold text-[#4F39F6] bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
          {dayPosts.length} {dayPosts.length === 1 ? 'post scheduled' : 'posts scheduled'}
        </span>
      </div>

      {/* HOURLY SCHEDULE TIMELINE */}
      <div className="divide-y divide-slate-100">
        {HOURS.map((hourStr) => {
          const slotKey = `${dateStr}T${hourStr}`;
          const isSlotHovered = hoveredDate === slotKey || hoveredDate === dateStr;
          const slotPosts = postsByHour[hourStr] || [];
          const displayLabel = formatTime(`1970-01-01T${hourStr}:00`);

          return (
            <div
              key={hourStr}
              onDragOver={(e) => {
                if (canManage && onDragOver) onDragOver(e, slotKey);
              }}
              onDragLeave={(e) => {
                if (canManage && onDragLeave) onDragLeave(e, slotKey);
              }}
              onDrop={(e) => {
                if (canManage && onDrop) onDrop(e, dateStr, hourStr);
              }}
              className={cn(
                'group relative flex items-start gap-4 p-3 min-h-[90px] transition-colors duration-150',
                isSlotHovered && 'bg-purple-50/80 ring-2 ring-[#4F39F6]/40 z-10',
                canManage && !isDragging && 'hover:bg-slate-50/70'
              )}
            >
              {/* Drop target hint */}
              {isSlotHovered && isDragging && (
                <div className="absolute inset-1 bg-purple-50/95 border-2 border-dashed border-[#4F39F6] rounded-xl m-1 z-20 flex items-center justify-center gap-2 text-[#4F39F6] pointer-events-none">
                  <ArrowDownToLine className="w-4 h-4 animate-bounce" />
                  <span className="text-xs font-extrabold">Schedule at {displayLabel}</span>
                </div>
              )}

              {/* Time Marker Column */}
              <div className="w-20 sm:w-24 shrink-0 flex items-center gap-1.5 text-slate-500 font-mono text-xs font-bold pt-1 select-none">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{displayLabel}</span>
              </div>

              {/* Cards Container for this time slot */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 min-w-0">
                {slotPosts.map((post) => (
                  <ScheduledContentCard
                    key={post.id || post.contentId}
                    post={post}
                    canManage={canManage}
                    draggable={canManage}
                    onClick={onCardClick}
                    onDragStart={(e) => {
                      if (onCardDragStart) onCardDragStart(e, post, 'CALENDAR_ITEM', dateStr);
                    }}
                    onDragEnd={onCardDragEnd}
                    compact={false}
                  />
                ))}

                {/* Quick Add Button in slot */}
                {slotPosts.length === 0 && canManage && !isDragging && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onCellClick) onCellClick(dateStr, hourStr);
                    }}
                    className="opacity-0 group-hover:opacity-100 border border-dashed border-slate-200 hover:border-[#4F39F6] hover:bg-white text-slate-400 hover:text-[#4F39F6] rounded-xl p-2 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer h-16"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Schedule at {displayLabel}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Other / Unmatched times */}
        {postsByHour['other']?.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Other Scheduled Times</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {postsByHour['other'].map((post) => (
                <ScheduledContentCard
                  key={post.id || post.contentId}
                  post={post}
                  canManage={canManage}
                  draggable={canManage}
                  onClick={onCardClick}
                  onDragStart={(e) => {
                    if (onCardDragStart) onCardDragStart(e, post, 'CALENDAR_ITEM', dateStr);
                  }}
                  onDragEnd={onCardDragEnd}
                  compact={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayView;
