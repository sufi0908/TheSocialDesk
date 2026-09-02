import React from 'react';
import { Plus, ArrowDownToLine } from 'lucide-react';
import { CalendarContentCard } from './CalendarContentCard';
import { cn } from '../../utils/cn';

/**
 * CalendarDayCell
 * Represents a single day in the 7-column Month grid.
 * Handles drop target highlighting, content card list, overflow "+N more" trigger, and quick click-to-schedule.
 */
export const CalendarDayCell = ({
  dateObj, // { dateStr: 'YYYY-MM-DD', dayNumber: 15, isCurrentMonth: true, isToday: false, isWeekend: false }
  posts = [],
  maxVisible = 2,
  canManage = true,
  isDragging = false,
  isHoveredTarget = false,
  onCardClick,
  onCardDragStart,
  onCardDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpenMore,
  onCellClick,
}) => {
  const { dateStr, dayNumber, isCurrentMonth, isToday, isWeekend } = dateObj;
  const todayStr = new Date().toISOString().split('T')[0];
  const isPast = dateStr < todayStr;
  const hasContent = posts.length > 0;

  const visiblePosts = posts.slice(0, maxVisible);
  const hiddenCount = posts.length - maxVisible;

  return (
    <div
      onDragOver={(e) => {
        if (canManage && onDragOver) onDragOver(e, dateStr);
      }}
      onDragLeave={(e) => {
        if (canManage && onDragLeave) onDragLeave(e, dateStr);
      }}
      onDrop={(e) => {
        if (canManage && onDrop) onDrop(e, dateStr);
      }}
      onClick={() => {
        if (canManage && onCellClick) onCellClick(dateStr);
      }}
      className={cn(
        'group relative min-h-[175px] xl:min-h-[195px] border-b border-r border-slate-200/80 p-2 sm:p-2.5 flex flex-col justify-start transition-all duration-150 select-none overflow-hidden box-border',
        isCurrentMonth
          ? isWeekend
            ? 'bg-slate-50/30'
            : 'bg-white'
          : 'bg-slate-50/60',
        isToday && 'ring-1.5 ring-inset ring-[#4F39F6]/30',
        hasContent && isCurrentMonth && !isToday && 'bg-gradient-to-b from-purple-50/15 to-transparent',
        isHoveredTarget && 'bg-purple-50/80 border-[#4F39F6] ring-2 ring-[#4F39F6]/50 z-10',
        canManage && !isDragging && 'hover:bg-slate-50/60'
      )}
    >
      {/* 1. TOP HEADER: DATE NUMBER + TODAY INDICATOR (PADDING 10-12px) */}
      <div className="flex items-center justify-between gap-1 mb-2 shrink-0 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'text-xs font-semibold leading-none transition-colors',
              isToday
                ? 'w-6 h-6 rounded-full bg-[#4F39F6] text-white flex items-center justify-center font-bold text-xs shadow-xs'
                : isCurrentMonth
                ? isPast
                  ? 'text-slate-400 group-hover:text-slate-600 px-1 py-0.5'
                  : 'text-slate-800 font-bold group-hover:text-slate-900 px-1 py-0.5'
                : 'text-slate-300 px-1 py-0.5'
            )}
          >
            {dayNumber}
          </span>
          {isToday && (
            <span className="text-[10px] font-extrabold text-[#4F39F6] uppercase tracking-wider hidden sm:inline">
              Today
            </span>
          )}
          {hasContent && !isToday && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F39F6]/60 shrink-0" title={`${posts.length} posts scheduled`} />
          )}
        </div>

        {/* Quick Add icon visible on cell hover when empty */}
        {canManage && !isDragging && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onCellClick) onCellClick(dateStr);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-200/70 text-slate-400 hover:text-[#4F39F6] transition-opacity pointer-events-auto cursor-pointer"
            title={`Schedule content on ${dateStr}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. DRAG HOVER HINT OVERLAY */}
      {isHoveredTarget && (
        <div className="absolute inset-1 bg-purple-50/95 border-2 border-dashed border-[#4F39F6] rounded-xl z-20 flex flex-col items-center justify-center text-[#4F39F6] pointer-events-none animate-in fade-in duration-150 p-2 text-center shadow-xs">
          <ArrowDownToLine className="w-5 h-5 mb-1 text-[#4F39F6] animate-bounce" />
          <span className="text-xs font-extrabold tracking-wide">Drop content here</span>
          <span className="text-[10px] font-semibold text-[#4F39F6]/80 mt-0.5">{dateStr}</span>
        </div>
      )}

      {/* 3. SCHEDULED CONTENT CARDS (MARGIN-TOP 8px, GAP 6-8px) */}
      <div className="flex-1 flex flex-col gap-2 min-w-0 w-full overflow-hidden">
        {visiblePosts.map((post) => (
          <CalendarContentCard
            key={post.id || post.contentId}
            post={post}
            canManage={canManage}
            draggable={canManage}
            onClick={onCardClick}
            onDragStart={(e) => {
              if (onCardDragStart) onCardDragStart(e, post, 'CALENDAR_ITEM', dateStr);
            }}
            onDragEnd={onCardDragEnd}
          />
        ))}

        {/* 4. "+N MORE" BADGE TRIGGER */}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenMore) onOpenMore(dateStr, posts);
            }}
            className="w-full mt-auto py-1.5 px-2.5 text-xs font-bold text-[#4F39F6] bg-purple-50 hover:bg-purple-100 border border-purple-200/90 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs shrink-0"
          >
            <span>+{hiddenCount} more</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CalendarDayCell;
