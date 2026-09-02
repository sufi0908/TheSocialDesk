import React from 'react';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';
import { LoadingState } from '../common/LoadingState';

/**
 * CalendarGrid
 * Dynamic calendar view router rendering Month, Week, Day, or Agenda view based on viewMode.
 */
export const CalendarGrid = ({
  viewMode = 'month', // 'month' | 'week' | 'day' | 'agenda'
  currentDate = new Date(),
  posts = [],
  loading = false,
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
  onReschedule,
  onUnschedule,
  onMarkPublished,
}) => {
  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Skeleton Weekday Headers */}
        <div className="grid grid-cols-7 bg-slate-50/90 border-b border-slate-200 text-center py-2.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {d}
            </div>
          ))}
        </div>
        {/* Skeleton Grid Cells */}
        <div className="grid grid-cols-7 bg-slate-200/40 gap-px">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[145px] xl:min-h-[165px] bg-white p-2 flex flex-col justify-between animate-pulse"
            >
              <div className="w-5 h-5 bg-slate-100 rounded-md" />
              {i % 4 === 1 && (
                <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl p-1.5 space-y-1">
                  <div className="h-2 bg-slate-200/70 rounded w-3/4" />
                  <div className="h-2 bg-slate-100 rounded w-1/2" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  switch (viewMode) {
    case 'week':
      return (
        <WeekView
          currentDate={currentDate}
          posts={posts}
          canManage={canManage}
          isDragging={isDragging}
          hoveredDate={hoveredDate}
          onCardClick={onCardClick}
          onCardDragStart={onCardDragStart}
          onCardDragEnd={onCardDragEnd}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onCellClick={onCellClick}
        />
      );

    case 'day':
      return (
        <DayView
          currentDate={currentDate}
          posts={posts}
          canManage={canManage}
          isDragging={isDragging}
          hoveredDate={hoveredDate}
          onCardClick={onCardClick}
          onCardDragStart={onCardDragStart}
          onCardDragEnd={onCardDragEnd}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onCellClick={onCellClick}
        />
      );

    case 'agenda':
      return (
        <AgendaView
          posts={posts}
          canManage={canManage}
          onCardClick={onCardClick}
          onReschedule={onReschedule}
          onUnschedule={onUnschedule}
          onMarkPublished={onMarkPublished}
        />
      );

    case 'month':
    default:
      return (
        <MonthView
          currentDate={currentDate}
          posts={posts}
          canManage={canManage}
          isDragging={isDragging}
          hoveredDate={hoveredDate}
          onCardClick={onCardClick}
          onCardDragStart={onCardDragStart}
          onCardDragEnd={onCardDragEnd}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onOpenMore={onOpenMore}
          onCellClick={onCellClick}
        />
      );
  }
};

export default CalendarGrid;
