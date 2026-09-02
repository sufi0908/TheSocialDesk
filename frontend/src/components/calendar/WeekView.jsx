import React, { useMemo } from 'react';
import { Plus, ArrowDownToLine, Calendar as CalendarIcon } from 'lucide-react';
import { ScheduledContentCard } from './ScheduledContentCard';
import { cn } from '../../utils/cn';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * WeekView
 * Multi-column 7-day view displaying detailed scheduled cards for each day of the week.
 */
export const WeekView = ({
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
  // 1. Calculate the 7 days of the active week (Sunday to Saturday)
  const weekDays = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 = Sun, 1 = Mon ...
    const startOfWeek = new Date(curr);
    startOfWeek.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dateNum}`;

      days.push({
        dateStr,
        dayNumber: d.getDate(),
        weekdayName: WEEKDAYS[i],
        isToday: dateStr === todayStr,
        isWeekend: i === 0 || i === 6,
      });
    }
    return days;
  }, [currentDate]);

  // 2. Group posts by date
  const postsByDate = useMemo(() => {
    const map = {};
    for (const post of posts) {
      const d = post.date || (post.scheduled_at ? post.scheduled_at.split('T')[0] : null);
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(post);
      }
    }
    // Sort posts by time within each day
    for (const d in map) {
      map[d].sort((a, b) => (a.time || '12:00').localeCompare(b.time || '12:00'));
    }
    return map;
  }, [posts]);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* 7-COLUMN WEEKDAYS HEADER */}
      <div className="grid grid-cols-7 bg-slate-50/90 border-b border-slate-200 text-center">
        {weekDays.map((day) => (
          <div
            key={day.dateStr}
            className={cn(
              'py-3 px-1 border-r border-slate-200/70 last:border-r-0 flex flex-col items-center gap-1',
              day.isToday && 'bg-purple-50/30'
            )}
          >
            <span
              className={cn(
                'text-[11px] font-bold uppercase tracking-wider',
                day.isToday ? 'text-[#4F39F6]' : 'text-slate-500'
              )}
            >
              {day.weekdayName}
            </span>
            <span
              className={cn(
                'text-sm font-extrabold w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                day.isToday
                  ? 'bg-[#4F39F6] text-white shadow-xs'
                  : 'text-slate-800 hover:bg-slate-200/60'
              )}
            >
              {day.dayNumber}
            </span>
          </div>
        ))}
      </div>

      {/* 7-COLUMN DAY LANES */}
      <div className="grid grid-cols-7 min-h-[500px] bg-slate-50/30 divide-x divide-slate-200/80">
        {weekDays.map((day) => {
          const dayPosts = postsByDate[day.dateStr] || [];
          const isHovered = hoveredDate === day.dateStr;

          return (
            <div
              key={day.dateStr}
              onDragOver={(e) => {
                if (canManage && onDragOver) onDragOver(e, day.dateStr);
              }}
              onDragLeave={(e) => {
                if (canManage && onDragLeave) onDragLeave(e, day.dateStr);
              }}
              onDrop={(e) => {
                if (canManage && onDrop) onDrop(e, day.dateStr);
              }}
              onClick={() => {
                if (canManage && onCellClick) onCellClick(day.dateStr);
              }}
              className={cn(
                'group relative p-2 flex flex-col gap-2 transition-colors duration-150 min-w-0 select-none',
                day.isToday && 'bg-purple-50/10',
                day.isWeekend && 'bg-slate-50/50',
                isHovered && 'bg-purple-50/80 ring-2 ring-[#4F39F6]/50 z-10',
                canManage && !isDragging && 'hover:bg-slate-50/80 cursor-pointer'
              )}
            >
              {/* Drop Target Hint Overlay */}
              {isHovered && (
                <div className="absolute inset-1 bg-purple-50/95 border-2 border-dashed border-[#4F39F6] rounded-xl z-20 flex flex-col items-center justify-center text-[#4F39F6] pointer-events-none animate-in fade-in duration-150 p-2 text-center shadow-xs">
                  <ArrowDownToLine className="w-5 h-5 mb-1 text-[#4F39F6] animate-bounce" />
                  <span className="text-xs font-extrabold tracking-wide">Drop content here</span>
                  <span className="text-[10px] font-semibold text-[#4F39F6]/80 mt-0.5">{day.dateStr}</span>
                </div>
              )}

              {/* Day Lane Content Cards */}
              <div className="flex-1 flex flex-col gap-2">
                {dayPosts.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-300 pointer-events-none">
                    <span className="text-[11px] font-medium text-slate-400">No posts</span>
                  </div>
                ) : (
                  dayPosts.map((post) => (
                    <ScheduledContentCard
                      key={post.id || post.contentId}
                      post={post}
                      canManage={canManage}
                      draggable={canManage}
                      onClick={onCardClick}
                      onDragStart={(e) => {
                        if (onCardDragStart) onCardDragStart(e, post, 'CALENDAR_ITEM', day.dateStr);
                      }}
                      onDragEnd={onCardDragEnd}
                      compact={false}
                    />
                  ))
                )}
              </div>

              {/* Quick Add Button at bottom of column */}
              {canManage && !isDragging && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCellClick) onCellClick(day.dateStr);
                  }}
                  className="w-full py-1.5 border border-dashed border-slate-200 hover:border-[#4F39F6] hover:bg-purple-50/60 rounded-xl text-[11px] font-bold text-slate-400 hover:text-[#4F39F6] flex items-center justify-center gap-1 transition-colors cursor-pointer mt-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Post</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;
