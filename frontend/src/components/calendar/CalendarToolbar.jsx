import React from 'react';
import { Search, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';

/**
 * CalendarToolbar
 * Clean navigation and view switching bar.
 * Groups search input, period navigation (‹ Today › with title), and view switcher buttons.
 */
export const CalendarToolbar = ({
  search = '',
  onSearchChange,
  onPrev,
  onNext,
  onToday,
  periodTitle = '',
  viewMode = 'month', // 'month' | 'week' | 'day' | 'agenda'
  onViewChange,
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
      {/* 1. SEARCH INPUT */}
      <div className="relative w-full lg:w-80 shrink-0">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search content by title, client, or caption..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-9 pl-9.5 pr-8 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] font-medium text-slate-900 placeholder:text-slate-400"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. PROMINENT PERIOD HEADER & TIMELINE NAVIGATION */}
      <div className="flex flex-col items-center justify-center gap-1.5 order-first lg:order-none py-0.5">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight text-center select-none">
          {periodTitle || 'Schedule'}
        </h2>

        <div className="inline-flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
          <button
            type="button"
            onClick={onPrev}
            title="Previous period"
            className="h-7 w-7 rounded-lg bg-white text-slate-600 hover:text-[#4F39F6] hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60 shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToday}
            title="Today"
            className="h-7 px-3 rounded-lg bg-white text-xs font-bold text-slate-800 hover:text-[#4F39F6] hover:bg-slate-50 transition-colors cursor-pointer border border-slate-200/60 shadow-2xs"
          >
            Today
          </button>

          <button
            type="button"
            onClick={onNext}
            title="Next period"
            className="h-7 w-7 rounded-lg bg-white text-slate-600 hover:text-[#4F39F6] hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60 shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. VIEW SWITCHER: Month | Week | Day | Agenda */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0 self-center lg:self-auto">
        <button
          type="button"
          onClick={() => onViewChange('month')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            viewMode === 'month'
              ? 'bg-white text-[#4F39F6] shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Month
        </button>
        <button
          type="button"
          onClick={() => onViewChange('week')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            viewMode === 'week'
              ? 'bg-white text-[#4F39F6] shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Week
        </button>
        <button
          type="button"
          onClick={() => onViewChange('day')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            viewMode === 'day'
              ? 'bg-white text-[#4F39F6] shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Day
        </button>
        <button
          type="button"
          onClick={() => onViewChange('agenda')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            viewMode === 'agenda'
              ? 'bg-white text-[#4F39F6] shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Agenda
        </button>
      </div>
    </div>
  );
};

export default CalendarToolbar;
