import React from 'react';
import { Plus, Calendar as CalendarIcon, CheckCircle2, Layers } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * CalendarOverviewHeader
 * Top summary banner for the Content Calendar page.
 * Displays title, role badges, live statistics, and primary scheduling CTAs.
 */
export const CalendarOverviewHeader = ({
  isClient = false,
  canManage = true,
  stats = { totalScheduled: 0, awaitingSchedule: 0, published: 0 },
  isQueueOpen = false,
  onToggleQueue,
  onOpenScheduleModal,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-200/80">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Content Calendar
          </h1>
          {isClient && (
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Client Portal
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          {isClient
            ? 'View scheduled social media posts and publishing schedule for your brand.'
            : 'Plan, schedule and manage approved content across your clients.'}
        </p>
      </div>

      {/* Right side: Live Statistics + Actions */}
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2">
          {/* Scheduled count */}
          <div className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="text-slate-500">Scheduled:</span>
            <span className="text-slate-900 font-bold">{stats.totalScheduled}</span>
          </div>

          {/* Unscheduled Queue toggle button */}
          {canManage && (
            <button
              type="button"
              onClick={onToggleQueue}
              className={`px-3 py-1.5 rounded-xl border shadow-2xs flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isQueueOpen
                  ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-400/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title={isQueueOpen ? 'Hide Unscheduled Queue' : 'Show Unscheduled Queue'}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-amber-700 font-bold">Queue:</span>
              <span className="text-amber-800 font-extrabold">{stats.awaitingSchedule}</span>
              <span className="text-[10px] text-amber-600 ml-0.5">{isQueueOpen ? '✕' : '▾'}</span>
            </button>
          )}

          {/* Published count */}
          <div className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-emerald-700">Published:</span>
            <span className="text-emerald-800 font-bold">{stats.published}</span>
          </div>
        </div>

        {/* Schedule button */}
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={Plus}
            onClick={onOpenScheduleModal}
            className="h-9 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            Schedule Content
          </Button>
        )}
      </div>
    </div>
  );
};

export default CalendarOverviewHeader;
