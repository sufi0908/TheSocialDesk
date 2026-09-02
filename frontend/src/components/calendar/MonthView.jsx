import React, { useMemo } from 'react';
import { CalendarDayCell } from './CalendarDayCell';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * MonthView
 * Pure React 7-column calendar month grid.
 * Calculates exact date cells with previous/next month filler days.
 */
export const MonthView = ({
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
  onOpenMore,
  onCellClick,
}) => {
  // 1. Group posts by date ('YYYY-MM-DD')
  const postsByDate = useMemo(() => {
    const map = {};
    for (const post of posts) {
      const d = post.date || (post.scheduled_at ? post.scheduled_at.split('T')[0] : null);
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(post);
      }
    }
    return map;
  }, [posts]);

  // 2. Generate Calendar Matrix
  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const todayStr = new Date().toISOString().split('T')[0];

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Prev month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayOfWeek = prevDate.getDay();

      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const m = String(month + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${year}-${m}-${d}`;
      const dayOfWeek = new Date(year, month, dayNum).getDay();

      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // Next month filler days (fill up to multiple of 7, min 35 or 42)
    const totalSlots = Math.ceil(cells.length / 7) * 7;
    const remaining = totalSlots - cells.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayOfWeek = nextDate.getDay();

      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    return cells;
  }, [currentDate]);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* 7-COLUMN WEEKDAY HEADERS */}
      <div className="grid grid-cols-7 bg-slate-50/90 border-b border-slate-200 text-center py-2.5">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            className={`text-xs font-bold uppercase tracking-wider ${
              idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 7-COLUMN DAYS GRID */}
      <div className="grid grid-cols-7 bg-slate-200/40">
        {calendarCells.map((cell) => (
          <CalendarDayCell
            key={cell.dateStr}
            dateObj={cell}
            posts={postsByDate[cell.dateStr] || []}
            maxVisible={2}
            canManage={canManage}
            isDragging={isDragging}
            isHoveredTarget={hoveredDate === cell.dateStr}
            onCardClick={onCardClick}
            onCardDragStart={onCardDragStart}
            onCardDragEnd={onCardDragEnd}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onOpenMore={onOpenMore}
            onCellClick={onCellClick}
          />
        ))}
      </div>
    </div>
  );
};

export default MonthView;
